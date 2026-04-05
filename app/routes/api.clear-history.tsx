// 会話履歴クリアAPIルート
// DBのpending状態の変更リクエストを削除する

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { deletePendingChangeRequests } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const storeId = session.shop;

  try {
    await deletePendingChangeRequests(storeId);
    return json({ success: true });
  } catch (e) {
    // Supabase未設定の場合も正常扱いにする
    console.warn('[Bloom AI] DB履歴削除スキップ:', e);
    return json({ success: true });
  }
};
