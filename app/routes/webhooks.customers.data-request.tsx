// GDPR必須Webhook: 顧客データ開示要求
// Shopify App Store審査の必須要件

import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[Bloom AI] ${topic} webhook受信 - ストア: ${shop}`);

  // Bloom AIは顧客の個人情報を保存しません
  // 商品情報・テーマ変更履歴のみを扱います
  // 顧客データ開示要求に対して「保持データなし」と応答
  console.log(`[Bloom AI] 顧客データ開示要求: ${JSON.stringify(payload)}`);
  console.log(`[Bloom AI] Bloom AIは顧客個人情報を保存していません`);

  return new Response(null, { status: 200 });
};
