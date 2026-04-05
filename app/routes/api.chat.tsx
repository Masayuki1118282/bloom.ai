// Claude API呼び出しルート（サーバーサイドのみ）
// tool_useフローでShopify Admin APIを実際に呼び出す

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  sendMessageWithTools,
  sendToolResultToGetFinalResponse,
  PRODUCT_CREATE_TOOL,
  THEME_APPLY_CHANGES_TOOL,
} from "../lib/claude.server";
import { fetchStoreMemory, processMemoryUpdate } from "../lib/store-memory.server";
import {
  createChangeRequest,
  saveChangeResult,
  updateChangeRequestStatus,
  getLatestChangeResult,
} from "../lib/supabase.server";
import { createProduct } from "../lib/shopify-products.server";
import {
  getLiveTheme,
  getThemeSettings,
  extractKeyThemeSettings,
  applyThemeSettingsChanges,
  rollbackThemeSettings,
} from "../lib/shopify-theme.server";
import { ROLLBACK_KEYWORDS } from "../types/bloom";
import type { ChatMessage, ConversationState, RollbackData } from "../types/bloom";

// 承認と判定するキーワード
const APPROVAL_KEYWORDS = ['ok', 'OK', 'やって', '進めて', '実行して', '承認', 'はい', 'yes'];

// テーマデザイン変更に関連するキーワード
const THEME_KEYWORDS = [
  'テーマ', 'デザイン', 'カラー', '色', 'フォント', 'レイアウト',
  'かっこよく', 'おしゃれ', 'トップページ', 'ヘッダー', 'フッター',
  '見た目', 'スタイル', '配色', '背景', 'アクセント', 'テキスト色',
  '変えて', '変更', 'リニューアル', '改善', 'おしゃれに', 'かっこいい',
  'サイト', 'ストア', 'ショップ', 'ページ', '雰囲気', '印象',
];

export const action = async ({ request }: ActionFunctionArgs) => {
  // Shopify認証（adminはGraphQL読み取りに、sessionはREST API書き込みとstoreId取得に使う）
  const { session, admin } = await authenticate.admin(request);
  const storeId = session.shop;
  const restSession = { shop: session.shop, accessToken: session.accessToken ?? '' };

  const formData = await request.formData();
  const userMessage = formData.get("message") as string;
  const conversationHistoryRaw = formData.get("conversationHistory") as string;
  const currentStateRaw = formData.get("currentState") as string;
  const imageUrlsRaw = formData.get("imageUrls") as string;
  const currentRequestIdRaw = formData.get("currentRequestId") as string;

  if (!userMessage) {
    return json({ error: "メッセージが空です" }, { status: 400 });
  }

  let conversationHistory: ChatMessage[] = [];
  try {
    conversationHistory = conversationHistoryRaw ? JSON.parse(conversationHistoryRaw) : [];
  } catch {
    conversationHistory = [];
  }

  const currentState: ConversationState = (currentStateRaw as ConversationState) || 'idle';
  const imageUrls: string[] = imageUrlsRaw ? JSON.parse(imageUrlsRaw) : [];

  // ロールバックキーワードを検知
  const isRollbackRequest = ROLLBACK_KEYWORDS.some((kw) => userMessage.includes(kw));

  // 承認キーワードを検知
  const isApproval = APPROVAL_KEYWORDS.some(
    (kw) => userMessage.toLowerCase() === kw.toLowerCase() || userMessage.includes(kw)
  );

  try {
    const storeMemory = await fetchStoreMemory(storeId);

    // ====================================================
    // ロールバック処理
    // ====================================================
    if (isRollbackRequest) {
      try {
        const latestResult = await getLatestChangeResult(storeId);

        if (latestResult?.rollback_data) {
          const rollbackData = latestResult.rollback_data as RollbackData;

          // 元の settings_data.json をライブテーマに書き戻す（REST API）
          await rollbackThemeSettings(restSession, rollbackData.theme_id, rollbackData.original_settings_json);

          // ステータスを更新
          await updateChangeRequestStatus(latestResult.request_id, storeId, 'rolled_back');

          return json({
            message: '✅ ロールバック完了。変更前のデザインに戻しました。\n\nまた何か変更したいときはお気軽にどうぞ！',
            state: 'idle' as ConversationState,
            requestId: null,
          });
        }

        return json({
          message: 'ロールバックできる変更履歴がありません。新しい変更を加えてからご利用ください。',
          state: 'idle' as ConversationState,
          requestId: currentRequestIdRaw || null,
        });
      } catch (e) {
        console.error('[Bloom AI] ロールバックエラー:', e);
        return json({
          message: `ロールバック中にエラーが発生しました: ${e instanceof Error ? e.message : '不明なエラー'}`,
          state: 'idle' as ConversationState,
          requestId: currentRequestIdRaw || null,
        });
      }
    }

    // ====================================================
    // テーマ設定を取得してClaudeのコンテキストに注入
    // 条件：テーマ関連キーワードを含む場合、または承認待ち状態（テーマ変更を承認中の可能性）
    // ====================================================
    let themeSettingsContext: string | undefined;

    const isThemeRelated = THEME_KEYWORDS.some((kw) => userMessage.includes(kw));
    const shouldFetchTheme = isThemeRelated || currentState === 'awaiting_approval';

    if (shouldFetchTheme) {
      try {
        const liveTheme = await getLiveTheme(admin);
        if (liveTheme) {
          const settings = await getThemeSettings(admin, liveTheme.id);
          const keySettings = extractKeyThemeSettings(settings);

          themeSettingsContext = `---

【現在のテーマ設定 (settings_data.json の主要設定)】
テーマID: ${liveTheme.id}
テーマ名: ${liveTheme.name}

設定値:
${JSON.stringify(keySettings, null, 2)}

---
上記の設定値を参考に、ユーザーの要望に合わせた具体的な変更プランを提示してください。
設定キー名は上記のJSON内のキーをそのまま使用してください。`;

          console.log('[Bloom AI] テーマ設定を取得しました:', liveTheme.name, Object.keys(keySettings).length, '件の設定キー');
        } else {
          console.warn('[Bloom AI] ライブテーマが見つかりませんでした');
        }
      } catch (e) {
        console.error('[Bloom AI] テーマ設定取得エラー:', e);
        // エラーでも続行するが、Claudeにその旨を伝える
        themeSettingsContext = `---
【注意】現在のテーマ設定の取得に失敗しました。
テーマの変更を行う前に、ユーザーに現在のテーマ名や設定を確認してください。
---`;
      }
    }

    // 変更リクエストをDBに保存（新規の場合）
    let requestId = currentRequestIdRaw || null;
    if (!requestId && (imageUrls.length > 0 || currentState === 'idle')) {
      try {
        const changeRequest = await createChangeRequest({
          storeId,
          userPrompt: userMessage,
          imageUrls,
          targetPage: isThemeRelated ? 'theme' : undefined,
        });
        requestId = changeRequest.id;
      } catch (e) {
        // DB保存エラーは無視して続行（Supabase未設定の場合を考慮）
        console.warn('[Bloom AI] DB保存スキップ:', e);
      }
    }

    // ====================================================
    // Claudeにメッセージ送信（全ツール付き）
    // ====================================================
    const tools = [PRODUCT_CREATE_TOOL, THEME_APPLY_CHANGES_TOOL];

    const claudeResult = await sendMessageWithTools({
      storeMemory,
      conversationHistory,
      userMessage,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      tools,
      extraSystemContext: themeSettingsContext,
    });

    // ====================================================
    // tool_use が返ってきた場合：実際にShopify APIを呼ぶ
    // ====================================================
    if (claudeResult.type === 'tool_use') {

      // --------------------------------------------------
      // product_create：商品登録
      // --------------------------------------------------
      if (claudeResult.toolName === 'product_create') {
        console.log('[Bloom AI] product_create tool_use 検出。Shopify APIを呼び出します。');

        const productInput = claudeResult.input as {
          name: string;
          description: string;
          tags: string[];
          metaTitle?: string;
          metaDescription?: string;
          price?: string;
          productType?: string;
        };

        // 会話履歴全体から画像URLを収集（複数ターンにわたる添付も含む）
        const allImageUrls = [
          ...conversationHistory.flatMap((msg) => msg.image_urls ?? []),
          ...imageUrls,
        ];

        const createdProduct = await createProduct(
          admin,
          {
            name: productInput.name,
            description: productInput.description,
            tags: productInput.tags,
            metaTitle: productInput.metaTitle ?? '',
            metaDescription: productInput.metaDescription ?? '',
            variantSuggestions: [],
            price: productInput.price,
            productType: productInput.productType,
          },
          allImageUrls.length > 0 ? allImageUrls : undefined
        );

        console.log('[Bloom AI] Shopify登録完了:', createdProduct.id, createdProduct.title);

        const toolResultJson = JSON.stringify({
          success: true,
          productId: createdProduct.id,
          title: createdProduct.title,
          handle: createdProduct.handle,
          adminUrl: createdProduct.adminUrl,
          status: 'DRAFT',
        });

        const finalMessage = await sendToolResultToGetFinalResponse({
          storeMemory,
          conversationHistory,
          userMessage,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          assistantContent: claudeResult.assistantContent,
          toolUseId: claudeResult.toolUseId,
          toolResult: toolResultJson,
          tools,
          extraSystemContext: themeSettingsContext,
        });

        return json({
          message: finalMessage,
          state: 'completed' as ConversationState,
          requestId,
        });
      }

      // --------------------------------------------------
      // theme_apply_changes：テーマデザイン変更
      // --------------------------------------------------
      if (claudeResult.toolName === 'theme_apply_changes') {
        console.log('[Bloom AI] theme_apply_changes tool_use 検出。Shopify Theme APIを呼び出します。');

        const themeInput = claudeResult.input as {
          settings_changes: Record<string, unknown>;
          summary: string;
        };

        // テーマ変更フロー：元の設定をバックアップ → ライブテーマに直接書き込み（REST API）
        const result = await applyThemeSettingsChanges(
          admin,
          restSession,
          themeInput.settings_changes
        );

        console.log('[Bloom AI] テーマ変更完了。テーマID:', result.themeId);

        // ロールバック情報をDBに保存（元の設定JSONを保持）
        const rollbackData: RollbackData = {
          theme_id: result.themeId,
          original_settings_json: result.originalSettingsJson,
          changed_assets: ['config/settings_data.json'],
        };

        if (requestId) {
          try {
            await saveChangeResult({
              requestId,
              storeId,
              diffSummary: themeInput.summary,
              duplicateThemeId: result.themeId,
              rollbackData,
            });
            await updateChangeRequestStatus(requestId, storeId, 'executed');
          } catch (e) {
            console.warn('[Bloom AI] DB保存スキップ:', e);
          }
        }

        const toolResultJson = JSON.stringify({
          success: true,
          backupThemeId: result.backupThemeId,
          newLiveThemeId: result.newLiveThemeId,
          appliedChanges: Object.keys(themeInput.settings_changes),
        });

        const finalMessage = await sendToolResultToGetFinalResponse({
          storeMemory,
          conversationHistory,
          userMessage,
          assistantContent: claudeResult.assistantContent,
          toolUseId: claudeResult.toolUseId,
          toolResult: toolResultJson,
          tools,
          extraSystemContext: themeSettingsContext,
        });

        return json({
          message: finalMessage,
          state: 'completed' as ConversationState,
          requestId,
        });
      }

      // 未知のツール（将来拡張用）
      console.warn('[Bloom AI] 未知のツール:', claudeResult.toolName);
      return json({
        message: claudeResult.precedingText ?? '処理中にエラーが発生しました。',
        state: currentState,
        requestId,
      });
    }

    // ====================================================
    // テキスト応答：状態を更新して返す
    // ====================================================
    const assistantText = claudeResult.text;

    // 「承認しますか？」が含まれていれば承認待ち状態へ
    let nextState: ConversationState = currentState;
    if (assistantText.includes('承認しますか')) {
      nextState = 'awaiting_approval';
    } else if (currentState === 'idle' || currentState === 'completed') {
      nextState = 'planning';
    }

    // 店舗メモリの自動更新チェック
    await processMemoryUpdate(storeId, assistantText, storeMemory);

    return json({
      message: assistantText,
      state: nextState,
      requestId,
    });

  } catch (error) {
    console.error('[Bloom AI] チャットエラー:', error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "申し訳ありません。エラーが発生しました。もう一度お試しください。",
      },
      { status: 500 }
    );
  }
};
