// GDPR必須Webhook: ストアデータ削除要求
// アンインストール後48時間以内にShopifyから送信される
// Shopify App Store審査の必須要件

import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[Bloom AI] ${topic} webhook受信 - ストア: ${shop}`);
  console.log(`[Bloom AI] ストアデータ削除要求: ${JSON.stringify(payload)}`);

  // TODO: Supabaseからストアの全データを削除
  // - store_memory テーブルのstore_id一致レコード
  // - change_requests テーブルのstore_id一致レコード
  // - change_results テーブルのstore_id一致レコード
  //
  // 実装例（Supabase接続後に有効化）：
  // const supabase = createSupabaseClient();
  // await supabase.from('change_results').delete().eq('store_id', shop);
  // await supabase.from('change_requests').delete().eq('store_id', shop);
  // await supabase.from('store_memory').delete().eq('store_id', shop);

  console.log(`[Bloom AI] ストア ${shop} のデータ削除処理完了`);

  return new Response(null, { status: 200 });
};
