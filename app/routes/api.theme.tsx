// Theme API操作ルート（サーバーサイドのみ）
// テーマ変更・ロールバックを処理する（REST Asset API使用）

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  applyThemeSettingsChanges,
  rollbackThemeSettings,
} from "../lib/shopify-theme.server";
import {
  saveChangeResult,
  updateChangeRequestStatus,
  getLatestChangeResult,
} from "../lib/supabase.server";
import type { RollbackData } from "../types/bloom";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const storeId = session.shop;
  const restSession = { shop: session.shop, accessToken: session.accessToken ?? '' };

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    switch (actionType) {
      case "apply": {
        const settingsChangesRaw = formData.get("settingsChanges") as string;
        const requestId = formData.get("requestId") as string;
        const diffSummary = (formData.get("diffSummary") as string) || "テーマ変更";

        if (!settingsChangesRaw || !requestId) {
          return json({ error: "必要なパラメータが不足しています" }, { status: 400 });
        }

        const settingsChanges = JSON.parse(settingsChangesRaw) as Record<string, unknown>;
        const result = await applyThemeSettingsChanges(admin, restSession, settingsChanges);

        const rollbackData: RollbackData = {
          theme_id: result.themeId,
          original_settings_json: result.originalSettingsJson,
          changed_assets: ['config/settings_data.json'],
        };

        await saveChangeResult({
          requestId,
          storeId,
          diffSummary,
          duplicateThemeId: result.themeId,
          rollbackData,
        });

        await updateChangeRequestStatus(requestId, storeId, "executed");

        return json({
          success: true,
          themeId: result.themeId,
          message: `✅ 変更を適用しました。「戻して」でいつでも元に戻せます。`,
        });
      }

      case "rollback": {
        const requestId = formData.get("requestId") as string | null;
        const latestResult = await getLatestChangeResult(storeId);

        if (!latestResult?.rollback_data) {
          return json(
            { error: "ロールバックできる変更履歴がありません" },
            { status: 400 }
          );
        }

        const rollbackData = latestResult.rollback_data as RollbackData;

        await rollbackThemeSettings(
          restSession,
          rollbackData.theme_id,
          rollbackData.original_settings_json
        );

        if (requestId) {
          await updateChangeRequestStatus(requestId, storeId, "rolled_back");
        }

        return json({
          success: true,
          message: "✅ ロールバック完了。変更前の状態に戻しました。",
        });
      }

      default:
        return json({ error: `不明なアクションタイプ: ${actionType}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[Bloom AI] Theme APIエラー:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "テーマ操作中にエラーが発生しました。もう一度お試しください。",
      },
      { status: 500 }
    );
  }
};
