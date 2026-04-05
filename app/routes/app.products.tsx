// 商品登録AI ページ
// 商品写真 → Claude分析 → 内容確認・編集 → Shopify登録 の完全フロー

import { useState, useRef, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  Tag,
  Badge,
  Spinner,
  Banner,
  Divider,
  Box,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { generateProductInfo } from "../lib/claude.server";
import { createProduct } from "../lib/shopify-products.server";
import { fetchStoreMemory } from "../lib/store-memory.server";
import type { GeneratedProductInfo } from "../lib/claude.server";

// ========================================
// サーバーサイド処理
// ========================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return json({ storeId: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const storeId = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    if (actionType === "analyze") {
      // 画像を分析して商品情報を生成
      const imageDataUrlsRaw = formData.get("imageDataUrls") as string;
      const additionalContext = (formData.get("additionalContext") as string) || "";

      if (!imageDataUrlsRaw) {
        return json({ error: "画像が選択されていません" }, { status: 400 });
      }

      const imageUrls: string[] = JSON.parse(imageDataUrlsRaw);
      if (imageUrls.length === 0) {
        return json({ error: "画像が選択されていません" }, { status: 400 });
      }

      const storeMemory = await fetchStoreMemory(storeId);
      const productInfo = await generateProductInfo({
        storeMemory,
        imageUrls,
        additionalContext: additionalContext || undefined,
      });

      return json({ productInfo });
    }

    if (actionType === "register") {
      // Shopifyに商品を登録
      const productInfoRaw = formData.get("productInfo") as string;
      if (!productInfoRaw) {
        return json({ error: "商品情報が不正です" }, { status: 400 });
      }

      const productInfo = JSON.parse(productInfoRaw) as GeneratedProductInfo;
      const product = await createProduct(admin, productInfo);

      return json({ product });
    }

    return json({ error: "不明なアクションです" }, { status: 400 });
  } catch (error) {
    console.error("[Bloom AI] 商品登録エラー:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "エラーが発生しました。もう一度お試しください。",
      },
      { status: 500 }
    );
  }
};

// ========================================
// フロントエンド
// ========================================

type Step = "upload" | "preview" | "success";

export default function ProductsPage() {
  const { storeId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{
    productInfo?: GeneratedProductInfo;
    product?: { id: string; title: string; handle: string; adminUrl: string };
    error?: string;
  }>();

  const [step, setStep] = useState<Step>("upload");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editedInfo, setEditedInfo] = useState<GeneratedProductInfo | null>(null);
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = fetcher.state !== "idle";

  // APIレスポンス処理
  const prevDataRef = useRef<typeof fetcher.data>(undefined);
  if (fetcher.data !== prevDataRef.current && fetcher.state === "idle") {
    prevDataRef.current = fetcher.data;
    if (fetcher.data?.productInfo && step === "upload") {
      setEditedInfo(fetcher.data.productInfo);
      setStep("preview");
    } else if (fetcher.data?.product && step === "preview") {
      setStep("success");
    }
  }

  // 画像選択
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrls((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // ドラッグ&ドロップ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // AI分析送信
  const handleAnalyze = () => {
    const formData = new FormData();
    formData.append("actionType", "analyze");
    formData.append("imageDataUrls", JSON.stringify(imageUrls));
    formData.append("additionalContext", additionalContext);
    fetcher.submit(formData, { method: "POST" });
  };

  // Shopify登録送信
  const handleRegister = () => {
    if (!editedInfo) return;
    const formData = new FormData();
    formData.append("actionType", "register");
    formData.append("productInfo", JSON.stringify(editedInfo));
    fetcher.submit(formData, { method: "POST" });
  };

  // リセット
  const handleReset = () => {
    setStep("upload");
    setImageUrls([]);
    setAdditionalContext("");
    setEditedInfo(null);
    setNewTag("");
    prevDataRef.current = undefined;
  };

  // タグ追加
  const handleAddTag = () => {
    if (!newTag.trim() || !editedInfo) return;
    setEditedInfo({ ...editedInfo, tags: [...editedInfo.tags, newTag.trim()] });
    setNewTag("");
  };

  // タグ削除
  const handleRemoveTag = (tagToRemove: string) => {
    if (!editedInfo) return;
    setEditedInfo({ ...editedInfo, tags: editedInfo.tags.filter((t) => t !== tagToRemove) });
  };

  return (
    <Page>
      <TitleBar title="商品登録AI" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">

            {/* ステップインジケーター */}
            <Card>
              <InlineStack gap="400" align="center">
                <InlineStack gap="200">
                  <Badge tone={step === "upload" ? "info" : "success"}>1</Badge>
                  <Text as="p" variant="bodyMd" fontWeight={step === "upload" ? "bold" : undefined}>
                    写真をアップロード
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">→</Text>
                <InlineStack gap="200">
                  <Badge tone={step === "preview" ? "info" : step === "success" ? "success" : undefined}>2</Badge>
                  <Text as="p" variant="bodyMd" fontWeight={step === "preview" ? "bold" : undefined}>
                    内容を確認・編集
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">→</Text>
                <InlineStack gap="200">
                  <Badge tone={step === "success" ? "success" : undefined}>3</Badge>
                  <Text as="p" variant="bodyMd" fontWeight={step === "success" ? "bold" : undefined}>
                    Shopifyに登録
                  </Text>
                </InlineStack>
              </InlineStack>
            </Card>

            {/* エラー表示 */}
            {fetcher.data?.error && (
              <Banner tone="critical">
                <Text as="p" variant="bodyMd">⚠️ {fetcher.data.error}</Text>
              </Banner>
            )}

            {/* STEP 1: 画像アップロード */}
            {step === "upload" && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">📸 商品写真をアップロード</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    商品写真を1枚以上アップロードしてください。AIが自動で商品情報を生成します。
                  </Text>

                  {/* ドラッグ&ドロップエリア */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? "#008060" : "#c9cccf"}`,
                      borderRadius: "8px",
                      padding: "40px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: isDragging ? "#f0faf7" : "#fafbfb",
                      transition: "all 0.2s",
                    }}
                  >
                    <BlockStack gap="200">
                      <Text as="p" variant="headingMd" tone="subdued">
                        📎 ここをクリック、または写真をドロップ
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        JPG・PNG・WEBP対応 / 複数枚OK
                      </Text>
                    </BlockStack>
                  </div>

                  {/* 選択済み画像プレビュー */}
                  {imageUrls.length > 0 && (
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        選択中の写真（{imageUrls.length}枚）
                      </Text>
                      <InlineStack gap="300" wrap>
                        {imageUrls.map((url, i) => (
                          <Box key={i} position="relative">
                            <Thumbnail
                              source={url}
                              alt={`商品写真 ${i + 1}`}
                              size="large"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageUrls((prev) => prev.filter((_, idx) => idx !== i));
                              }}
                              style={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                background: "#d72c0d",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "22px",
                                height: "22px",
                                cursor: "pointer",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              ×
                            </button>
                          </Box>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  )}

                  <Divider />

                  {/* 追加情報入力 */}
                  <TextField
                    label="補足情報（任意）"
                    value={additionalContext}
                    onChange={setAdditionalContext}
                    placeholder="例：カラーはネイビーとホワイトの2色。価格は3,980円。サイズはS・M・L。"
                    multiline={3}
                    autoComplete="off"
                    helpText="価格・バリアント・ターゲットなど、AIに伝えたい情報があれば入力してください"
                  />

                  <Button
                    variant="primary"
                    size="large"
                    onClick={handleAnalyze}
                    loading={isLoading}
                    disabled={imageUrls.length === 0 || isLoading}
                  >
                    {isLoading ? "AIが分析中..." : "🤖 AIで商品情報を生成する"}
                  </Button>

                  {isLoading && (
                    <InlineStack gap="200" align="center">
                      <Spinner size="small" />
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Bloom AIが商品写真を分析しています...（数秒かかります）
                      </Text>
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>
            )}

            {/* STEP 2: 内容確認・編集 */}
            {step === "preview" && editedInfo && (
              <BlockStack gap="400">
                <Banner tone="info">
                  <Text as="p" variant="bodyMd">
                    🌸 商品情報を生成しました。内容を確認・編集してからShopifyに登録してください。
                  </Text>
                </Banner>

                {/* 商品名 */}
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">商品情報</Text>
                    <TextField
                      label="商品名"
                      value={editedInfo.name}
                      onChange={(v) => setEditedInfo({ ...editedInfo, name: v })}
                      autoComplete="off"
                    />
                    <TextField
                      label="商品説明文"
                      value={editedInfo.description}
                      onChange={(v) => setEditedInfo({ ...editedInfo, description: v })}
                      multiline={6}
                      autoComplete="off"
                      helpText="HTMLタグも使用できます"
                    />
                  </BlockStack>
                </Card>

                {/* タグ */}
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">タグ</Text>
                    <InlineStack gap="200" wrap>
                      {editedInfo.tags.map((tag) => (
                        <Tag key={tag} onRemove={() => handleRemoveTag(tag)}>
                          {tag}
                        </Tag>
                      ))}
                    </InlineStack>
                    <InlineStack gap="200">
                      <div
                        style={{ flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTag();
                        }}
                      >
                        <TextField
                          label=""
                          labelHidden
                          value={newTag}
                          onChange={setNewTag}
                          placeholder="タグを追加..."
                          autoComplete="off"
                        />
                      </div>
                      <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                        追加
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>

                {/* SEO設定 */}
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">SEO設定</Text>
                    <TextField
                      label="メタタイトル"
                      value={editedInfo.metaTitle}
                      onChange={(v) => setEditedInfo({ ...editedInfo, metaTitle: v })}
                      autoComplete="off"
                      helpText={`${editedInfo.metaTitle.length}/60文字`}
                    />
                    <TextField
                      label="メタディスクリプション"
                      value={editedInfo.metaDescription}
                      onChange={(v) => setEditedInfo({ ...editedInfo, metaDescription: v })}
                      multiline={3}
                      autoComplete="off"
                      helpText={`${editedInfo.metaDescription.length}/160文字`}
                    />
                  </BlockStack>
                </Card>

                {/* バリアント提案 */}
                {editedInfo.variantSuggestions.length > 0 && (
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingMd">バリアント提案</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        ※ バリアントはShopify管理画面から追加できます
                      </Text>
                      {editedInfo.variantSuggestions.map((s, i) => (
                        <Text key={i} as="p" variant="bodyMd">• {s}</Text>
                      ))}
                    </BlockStack>
                  </Card>
                )}

                {/* アクションボタン */}
                <Card>
                  <InlineStack gap="300" align="end">
                    <Button onClick={handleReset} disabled={isLoading}>
                      ← やり直す
                    </Button>
                    <Button
                      variant="primary"
                      size="large"
                      onClick={handleRegister}
                      loading={isLoading}
                      disabled={isLoading}
                    >
                      {isLoading ? "登録中..." : "✅ Shopifyに登録する"}
                    </Button>
                  </InlineStack>
                </Card>
              </BlockStack>
            )}

            {/* STEP 3: 登録完了 */}
            {step === "success" && fetcher.data?.product && (
              <Card>
                <BlockStack gap="400">
                  <Banner tone="success">
                    <Text as="p" variant="headingMd">
                      🎉 商品を登録しました！
                    </Text>
                  </Banner>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      <strong>商品名：</strong>{fetcher.data.product.title}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      <strong>商品ID：</strong>{fetcher.data.product.id}
                    </Text>
                  </BlockStack>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Shopify管理画面の商品一覧から確認・編集できます。
                    バリアント・価格・在庫は管理画面から追加してください。
                  </Text>
                  <InlineStack gap="300">
                    <Button variant="primary" onClick={handleReset}>
                      続けて商品を登録する
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            )}

          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </Page>
  );
}
