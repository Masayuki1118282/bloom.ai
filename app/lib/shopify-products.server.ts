// Shopify Products API操作（サーバーサイドのみ）
// 商品の登録・更新を担当する
// Shopify API 2024-07以降の新形式（ProductCreateInput）に対応

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import type { GeneratedProductInfo } from "./claude.server";

export interface CreatedProduct {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  adminUrl: string;
}

// ========================================
// 商品をShopifyに登録（画像紐付けも含む）
// ========================================
export async function createProduct(
  admin: AdminApiContext,
  productInfo: GeneratedProductInfo,
  imageDataUrls?: string[]
): Promise<CreatedProduct> {
  const response = await admin.graphql(
    `#graphql
    mutation productCreate($product: ProductCreateInput!) {
      productCreate(product: $product) {
        product {
          id
          title
          handle
          descriptionHtml
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        product: {
          title: productInfo.name,
          descriptionHtml: productInfo.description,
          tags: productInfo.tags,
          status: "DRAFT",
          productType: productInfo.productType ?? "",
          // SEOはmetafields経由で設定（API 2024-07以降）
          metafields: [
            ...(productInfo.metaTitle
              ? [{
                  namespace: "global",
                  key: "title_tag",
                  value: productInfo.metaTitle,
                  type: "single_line_text_field",
                }]
              : []),
            ...(productInfo.metaDescription
              ? [{
                  namespace: "global",
                  key: "description_tag",
                  value: productInfo.metaDescription,
                  type: "multi_line_text_field",
                }]
              : []),
          ],
        },
      },
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = await response.json() as any;

  if (json.errors && json.errors.length > 0) {
    const errMsg = json.errors.map((e: { message: string }) => e.message).join(', ');
    console.error("[Bloom AI] productCreate GraphQLエラー:", JSON.stringify(json.errors));
    throw new Error(`Shopify APIエラー: ${errMsg}`);
  }

  if (!json.data?.productCreate) {
    console.error("[Bloom AI] productCreate レスポンス異常:", JSON.stringify(json));
    throw new Error("Shopify APIからの応答が不正です。もう一度お試しください。");
  }

  const { product, userErrors } = json.data.productCreate;
  if (userErrors && userErrors.length > 0) {
    const errMsg = userErrors.map((e: { message: string }) => e.message).join(', ');
    console.error("[Bloom AI] productCreate userErrors:", JSON.stringify(userErrors));
    throw new Error(`商品の登録に失敗しました: ${errMsg}`);
  }

  if (!product) {
    throw new Error("商品の作成に失敗しました。もう一度お試しください。");
  }

  const numericId = product.id.replace('gid://shopify/Product/', '');
  const adminUrl = `/products/${numericId}`;

  const created: CreatedProduct = {
    id: product.id,
    title: product.title,
    handle: product.handle,
    descriptionHtml: product.descriptionHtml,
    adminUrl,
  };

  // デフォルトバリアントに価格・在庫管理を設定（productVariantsBulkCreate）
  // API 2024-01以降、variantsはproductCreateではなく別途設定が必要
  if (productInfo.price) {
    try {
      await setDefaultVariantPrice(admin, product.id, productInfo.price);
    } catch (e) {
      console.error("[Bloom AI] バリアント価格設定に失敗しました:", e);
    }
  }

  // 画像URLが渡された場合は商品に紐付ける
  if (imageDataUrls && imageDataUrls.length > 0) {
    try {
      await attachImagesToProduct(admin, product.id, imageDataUrls);
    } catch (e) {
      // 画像登録失敗でも商品自体は返す（エラーはログのみ）
      console.error("[Bloom AI] 画像の紐付けに失敗しました（商品は登録済み）:", e);
    }
  }

  return created;
}

// ========================================
// デフォルトバリアントの価格・在庫管理を設定
// API 2024-01以降はproductVariantsBulkUpdateを使う
// ========================================
async function setDefaultVariantPrice(
  admin: AdminApiContext,
  productId: string,
  price: string
): Promise<void> {
  // まずデフォルトバリアントのIDを取得
  const variantResponse = await admin.graphql(
    `#graphql
    query getDefaultVariant($id: ID!) {
      product(id: $id) {
        variants(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    }`,
    { variables: { id: productId } }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variantJson = await variantResponse.json() as any;
  const variantId = variantJson.data?.product?.variants?.edges?.[0]?.node?.id;
  if (!variantId) {
    console.warn("[Bloom AI] デフォルトバリアントが見つかりません");
    return;
  }

  // productVariantsBulkUpdateで価格・在庫管理を設定
  const updateResponse = await admin.graphql(
    `#graphql
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          inventoryPolicy
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        productId,
        variants: [
          {
            id: variantId,
            price,
            inventoryPolicy: "DENY",
          },
        ],
      },
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateJson = await updateResponse.json() as any;
  if (updateJson.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
    const errMsg = updateJson.data.productVariantsBulkUpdate.userErrors
      .map((e: { message: string }) => e.message).join(', ');
    throw new Error(`バリアント更新エラー: ${errMsg}`);
  }

  console.log(`[Bloom AI] バリアント価格設定完了: ¥${price}`);
}

// ========================================
// 画像をShopify商品に紐付ける
// base64 data URLをStagedUploads経由でproductCreateMediaで登録
//
// フロー：
//   1. stagedUploadsCreate → presigned URLを取得
//   2. presigned URLに画像をPOST
//   3. productCreateMedia → 商品に紐付け
// ========================================
async function attachImagesToProduct(
  admin: AdminApiContext,
  productId: string,
  imageDataUrls: string[]
): Promise<void> {
  if (imageDataUrls.length === 0) return;

  // data: URLからMIMEタイプと拡張子を取得するヘルパー
  const getMimeAndExt = (url: string): { mimeType: string; ext: string } => {
    if (url.startsWith('data:')) {
      const mimeType = (url.match(/^data:([^;]+);/) ?? [])[1] ?? 'image/jpeg';
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      return { mimeType, ext };
    }
    // HTTPSのURLはimage/jpegをデフォルトとして扱う
    return { mimeType: 'image/jpeg', ext: 'jpg' };
  };

  // Step 1: stagedUploadsCreate でアップロード先を確保
  const stagedInput = imageDataUrls.map((url, i) => {
    const { mimeType, ext } = getMimeAndExt(url);
    return {
      filename: `product-image-${i + 1}.${ext}`,
      mimeType,
      resource: "IMAGE",
      httpMethod: "POST",
    };
  });

  const stagedResponse = await admin.graphql(
    `#graphql
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { input: stagedInput } }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stagedJson = await stagedResponse.json() as any;

  if (stagedJson.errors?.length > 0) {
    throw new Error(
      `stagedUploadsCreate GraphQLエラー: ${stagedJson.errors.map((e: { message: string }) => e.message).join(', ')}`
    );
  }

  const { stagedTargets, userErrors: stagedUserErrors } = stagedJson.data.stagedUploadsCreate;
  if (stagedUserErrors?.length > 0) {
    throw new Error(
      `stagedUploadsCreate userErrors: ${stagedUserErrors.map((e: { message: string }) => e.message).join(', ')}`
    );
  }

  // Step 2: 各画像を presigned URL にアップロード
  const resourceUrls: string[] = [];

  for (let i = 0; i < imageDataUrls.length; i++) {
    const dataUrl = imageDataUrls[i];
    const target = stagedTargets[i];
    const { mimeType, ext } = getMimeAndExt(dataUrl);

    // base64 data URLをBufferに変換
    const base64Data = dataUrl.startsWith('data:') ? dataUrl.split(',')[1] : null;
    if (!base64Data) {
      console.warn(`[Bloom AI] 画像 ${i + 1} はbase64形式ではないためスキップ`);
      continue;
    }
    const buffer = Buffer.from(base64Data, 'base64');

    // multipart/form-data でアップロード（Shopify GCSのフォーム形式）
    const form = new FormData();
    for (const param of target.parameters) {
      form.append(param.name, param.value);
    }
    form.append(
      'file',
      new Blob([buffer], { type: mimeType }),
      `product-image-${i + 1}.${ext}`
    );

    const uploadRes = await fetch(target.url, { method: 'POST', body: form });
    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error(`[Bloom AI] 画像 ${i + 1} アップロード失敗:`, uploadRes.status, text);
      throw new Error(`画像のアップロードに失敗しました (HTTP ${uploadRes.status})`);
    }

    resourceUrls.push(target.resourceUrl);
    console.log(`[Bloom AI] 画像 ${i + 1} アップロード完了`);
  }

  if (resourceUrls.length === 0) return;

  // Step 3: productCreateMedia で商品に画像を紐付け
  const mediaInput = resourceUrls.map((url) => ({
    originalSource: url,
    mediaContentType: "IMAGE",
  }));

  const mediaResponse = await admin.graphql(
    `#graphql
    mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          ... on MediaImage {
            id
          }
        }
        mediaUserErrors {
          field
          message
        }
      }
    }`,
    { variables: { productId, media: mediaInput } }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaJson = await mediaResponse.json() as any;

  if (mediaJson.errors?.length > 0) {
    console.error("[Bloom AI] productCreateMedia GraphQLエラー:", mediaJson.errors);
    throw new Error(
      `画像の登録に失敗しました: ${mediaJson.errors.map((e: { message: string }) => e.message).join(', ')}`
    );
  }

  const { mediaUserErrors } = mediaJson.data.productCreateMedia;
  if (mediaUserErrors?.length > 0) {
    console.error("[Bloom AI] productCreateMedia userErrors:", mediaUserErrors);
    throw new Error(
      `画像の登録に失敗しました: ${mediaUserErrors.map((e: { message: string }) => e.message).join(', ')}`
    );
  }

  console.log(`[Bloom AI] 商品画像 ${resourceUrls.length} 枚を登録しました`);
}
