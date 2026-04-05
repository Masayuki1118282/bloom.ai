// GDPR必須Webhook: 顧客データ削除要求
// Shopify App Store審査の必須要件

import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[Bloom AI] ${topic} webhook受信 - ストア: ${shop}`);

  // Bloom AIは顧客の個人情報を保存していないため、削除対象データなし
  // ただしログとしてリクエストを記録
  console.log(`[Bloom AI] 顧客データ削除要求: ${JSON.stringify(payload)}`);
  console.log(`[Bloom AI] Bloom AIは顧客個人情報を保存していません。削除対象データなし。`);

  return new Response(null, { status: 200 });
};
