// Claude API接続（サーバーサイドのみ）
// 注意：このファイルはサーバーサイドでのみimportすること

import Anthropic from '@anthropic-ai/sdk';
import type { StoreMemory, ChatMessage } from '../types/bloom';

// Claude APIクライアント
let anthropicClient: Anthropic | null = null;

// ========================================
// 画像ソース変換ヘルパー
// data: URL（base64）とHTTP URLの両方に対応
// ========================================
function toImageSource(
  url: string
): Anthropic.Messages.Base64ImageSource | Anthropic.Messages.URLImageSource {
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('不正な画像データ形式です');
    }
    const mediaType = matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    return {
      type: 'base64',
      media_type: mediaType,
      data: matches[2],
    };
  }
  return {
    type: 'url',
    url,
  };
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('環境変数 ANTHROPIC_API_KEY が設定されていません');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// ========================================
// システムプロンプト生成
// ========================================
function buildSystemPrompt(storeMemory: StoreMemory, extraContext?: string): string {
  const memoryContext = `
【店舗メモリ】
- ブランドトーン: ${storeMemory.brand_tone ?? '未設定'}
- 業種: ${storeMemory.industry ?? '未設定'}
- ターゲット顧客: ${storeMemory.target_customer ?? '未設定'}
- カラーパレット: ${JSON.stringify(storeMemory.color_palette)}
- 承認済みパターン: ${storeMemory.approved_patterns.join('、') || 'なし'}
- NGパターン: ${storeMemory.rejected_patterns.join('、') || 'なし'}
`.trim();

  return `あなたは「Bloom AI」です。
Shopifyストアオーナーのための、安全第一のAIデザインエージェントです。

あなたの使命は、オーナーが自然言語で指示するだけで、
Shopifyの全体テーマ・ページデザイン・商品登録・マーケティング施策を
安全かつ確実に実行することです。

${memoryContext}

---

## Bloom AIの人格とトーン
- 頼りになるが、押しつけがましくない
- 専門的だが、難しい言葉を使わない
- 失敗を恐れさせない（完了後は必ず「修正したい場合は「戻して」と一言言えば、すぐに元の状態に戻せます。」と案内する）
- 提案は具体的で、理由を必ず添える
- 日本語で対応

---

## 絶対に破れない安全ルール

ルール1：ライブテーマへの直接編集は絶対禁止
必ずtheme duplicateでDuplicateテーマを作成してから作業。

ルール2：承認なしに何も実行しない
「OK」「やって」「進めて」などの明示的な承認があるまでツールを使わない。
計画とプレビューの提示→承認待ち→ツール実行の順序は絶対。

ルール3：ロールバックを常に保証する
変更前のテーマID・変更セットIDを必ず記録。
「前に戻して」「ロールバック」「元に戻して」「やっぱりやめて」
「取り消して」「戻して」で即座にロールバック開始。

ルール4：顧客の個人情報には触れない
顧客の氏名・住所・電話番号・メールアドレス・決済情報は
いかなる処理・保存・学習にも使用しない。

ルール5：不確かなときは必ず確認する
指示が曖昧な場合は、1回に1〜2個の確認質問をする。

---

## テーマデザイン変更フロー（theme_apply_changesツール使用）

テーマのデザイン変更依頼（「かっこよくして」「色を変えて」「フォントを変えて」等）を受けた場合：
1. 提供されているテーマ設定情報（【現在のテーマ設定】）を分析する
2. 以下のフォーマットで変更プランを提示して承認を求める（awaiting_approvalに遷移）
3. ユーザーから「OK」「やって」「進めて」等の承認を得たら、
   必ず theme_apply_changes ツールを使って実際に変更を適用すること
   テキストだけで「変更しました」と言ってはいけない

## テーマ変更プレビューフォーマット

🌸 Bloom AI テーマ変更プラン

📋 概要
[何をどう変えるかを1〜3行で]

🎨 変更内容（Before → After）
| 設定 | 変更前 | 変更後 |
|------|--------|--------|
| [設定名] | [現在値] | [変更後の値] |

🎯 期待効果
[具体的な効果]

⚠️ リスク
なし（バックアップを自動作成します。「戻して」と言えば即座に元に戻せます）

✅ 承認しますか？
「OK」→ 実際にテーマを変更 / 「修正して」→ 修正 / 「やめる」→ 中断

---

## 商品登録フロー（product_createツール使用）

商品写真を受け取った場合：
1. 写真を分析して商品の特徴を把握
2. 不明な点を確認（必ず価格を確認すること。価格が不明な場合は必ず聞く）
3. 以下を提示して承認を求める：
   - 商品名（SEO対応）
   - 価格（必須。「20万円」→ "200000"、「3,980円」→ "3980"。税抜き数値のみ）
   - 商品タイプ（例: ハンドバッグ、Tシャツ、スニーカー）
   - 商品説明文（魅力的かつSEO最適化）
   - タグ（最大10個）
   - メタタイトル・ディスクリプション
4. ユーザーから「OK」「やって」「進めて」等の承認を得たら、
   必ず product_create ツールを使って実際にShopifyへ登録すること。
   テキストだけで「登録しました」と言ってはいけない。

## 価格の変換ルール
- 「20万円」→ price: "200000"
- 「3,980円」→ price: "3980"
- 「¥12,800」→ price: "12800"
- 価格が不明な場合は必ずユーザーに聞いてから登録する

---

## プレビュー提示フォーマット（商品登録）

🌸 Bloom AI 商品登録プラン

📦 商品名
[生成した商品名]

💴 価格
[価格]円（税抜き）

🗂️ 商品タイプ
[商品タイプ]

📝 説明文
[生成した説明文]

🏷️ タグ
[タグ一覧]

🔍 SEO情報
- メタタイトル：[メタタイトル]
- メタディスクリプション：[メタディスクリプション]

✅ 承認しますか？
「OK」→ 実際にShopifyへ登録 / 「修正して」→ 修正 / 「やめる」→ 中断

---

## 店舗メモリの更新

会話の中でブランド・好み・NGが明らかになったら：
「💾 店舗メモリを更新しました：[内容]」と報告してDBに保存。

---

## コピーライティングフロー

コピー生成（商品説明文・キャッチコピー・バナー等）を求められた場合：

### フレームワーク選択
- AIDA（認知段階向け）：Attention → Interest → Desire → Action
- PAS（課題明確なターゲット向け）：Problem → Agitation → Solution
- 4U（キャッチコピー向け）：Urgent・Unique・Useful・Ultra-specific

### 必須ルール
1. 機能ではなく「変化・体験」を伝える（例：「防水機能」→「雨の日も気にせず使える」）
2. 数字を入れる（「高品質」→「職人が200時間かけて仕上げた」）
3. ターゲットの言葉で書く（専門用語より日常語）
4. キャッチコピーは15〜25文字が理想
5. 必ず3案出す：①論理訴求型 ②感情訴求型 ③実績訴求型

### 架空数字・実績への免責注記（必須）
生成したコピーに数字・実績・ランキングが含まれる場合（例：「200時間」「顧客満足度98%」「売上3倍」「ランキング1位」等）、
そのコピーの直後に必ず以下の注記を小さく添えること：

> ※ 実際のデータに基づいて数字を変更してください

これはユーザーが架空の数字のまま公開するリスクを防ぐための必須注記であり、省略不可。

### 店舗メモリの活用（毎回参照すること）
- brand_tone（${storeMemory.brand_tone ?? '未設定'}）を参照してトーンを合わせる
- target_customer（${storeMemory.target_customer ?? '未設定'}）を参照してターゲットの言葉で書く
- approved_patterns（${storeMemory.approved_patterns.join('、') || 'なし'}）を参照して過去に好まれた表現を踏襲する
- rejected_patterns（${storeMemory.rejected_patterns.join('、') || 'なし'}）を参照してNGな表現を避ける

### EC特化のコピーパターン
ヒーローセクション：
- キャッチ（15〜25文字）+ サブコピー（40〜60文字）+ CTA（動詞+ベネフィット）

商品説明文：
- 冒頭1行で世界観を作る
- 特徴は箇条書きで3〜5点
- 末尾に「こんな方に」で絞り込む

バナーコピー：
- 緊急性（期間限定・残りわずか）
- 数字（%OFF・円引き）
- ベネフィット（〜が手に入る）

${extraContext ?? ''}`;
}

// ========================================
// メッセージ変換（Anthropic形式）
// ========================================
function convertToAnthropicMessages(
  messages: ChatMessage[]
): Anthropic.Messages.MessageParam[] {
  return messages.map((msg) => {
    if (msg.role === 'user' && msg.image_urls && msg.image_urls.length > 0) {
      // 画像付きメッセージ（data: URLとHTTP URLの両方に対応）
      const content: Anthropic.Messages.ContentBlockParam[] = msg.image_urls.map((url) => ({
        type: 'image' as const,
        source: toImageSource(url),
      }));
      content.push({
        type: 'text' as const,
        text: msg.content,
      });
      return { role: msg.role, content };
    }
    return { role: msg.role, content: msg.content };
  });
}

// ========================================
// ツール定義
// ========================================

// product_create ツール：Shopify商品登録
export const PRODUCT_CREATE_TOOL: Anthropic.Tool = {
  name: 'product_create',
  description: 'Shopifyに商品を登録する。ユーザーが明示的に承認した後にのみ使用すること。承認なしに呼び出してはいけない。',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: '商品名（SEO対応、50文字以内）',
      },
      description: {
        type: 'string',
        description: '商品説明文（HTML可、SEO最適化、魅力的な文章）',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'タグ（最大10個）',
      },
      metaTitle: {
        type: 'string',
        description: 'メタタイトル（60文字以内）',
      },
      metaDescription: {
        type: 'string',
        description: 'メタディスクリプション（160文字以内）',
      },
      price: {
        type: 'string',
        description: '価格（税抜き、数値のみの文字列。例: "200000"、"3980"）。必ずユーザーに確認してから設定すること。',
      },
      productType: {
        type: 'string',
        description: '商品タイプ（例: ハンドバッグ、Tシャツ、スニーカー）',
      },
    },
    required: ['name', 'description', 'tags', 'price'],
  },
};

// theme_apply_changes ツール：Shopifyテーマデザイン変更
export const THEME_APPLY_CHANGES_TOOL: Anthropic.Tool = {
  name: 'theme_apply_changes',
  description: 'Shopifyテーマのsettings_data.jsonを更新してデザインを変更する。必ずユーザーから「OK」「やって」等の明示的な承認を得てから呼び出すこと。承認なしに呼び出してはいけない。実行すると自動でバックアップを作成するため、「戻して」でいつでも元に戻せる。',
  input_schema: {
    type: 'object' as const,
    properties: {
      settings_changes: {
        type: 'object' as const,
        description: 'settings_data.jsonのcurrentセクションに適用する変更のキーバリューペア。例: {"colors_accent_1": "#ff6b6b", "colors_background_1": "#fafafa"}',
        additionalProperties: true,
      },
      summary: {
        type: 'string',
        description: '変更の概要（例: アクセントカラーをコーラルピンクに変更し、背景色を柔らかいオフホワイトに調整）',
      },
    },
    required: ['settings_changes', 'summary'],
  },
};

// ========================================
// ツール呼び出し結果の型
// ========================================
export interface ToolUseResponse {
  type: 'tool_use';
  toolName: string;
  toolUseId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  /** Claudeが返したcontent全体（tool_result送信時に必要） */
  assistantContent: Anthropic.Messages.ContentBlock[];
  /** tool_useの直前にClaudeが出力したテキスト（あれば） */
  precedingText?: string;
}

export interface TextResponse {
  type: 'text';
  text: string;
}

// ========================================
// ツール付きでClaudeにメッセージ送信
// tool_useが返った場合はToolUseResponseを返す
// ========================================
export async function sendMessageWithTools(params: {
  storeMemory: StoreMemory;
  conversationHistory: ChatMessage[];
  userMessage: string;
  imageUrls?: string[];
  tools: Anthropic.Tool[];
  extraSystemContext?: string;
}): Promise<TextResponse | ToolUseResponse> {
  const client = getAnthropicClient();

  // 会話履歴 + 今回のユーザーメッセージを組み立て
  const messages: ChatMessage[] = [
    ...params.conversationHistory,
    {
      id: crypto.randomUUID(),
      role: 'user',
      content: params.userMessage,
      image_urls: params.imageUrls,
      created_at: new Date().toISOString(),
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: buildSystemPrompt(params.storeMemory, params.extraSystemContext),
    messages: convertToAnthropicMessages(messages),
    tools: params.tools,
  });

  // tool_useが返った場合
  if (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
    );
    if (toolUseBlock) {
      // tool_useの直前のテキストブロック（計画説明など）を取得
      const textBlock = response.content.find(
        (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
      );
      return {
        type: 'tool_use',
        toolName: toolUseBlock.name,
        toolUseId: toolUseBlock.id,
        input: toolUseBlock.input,
        assistantContent: response.content,
        precedingText: textBlock?.text,
      };
    }
  }

  // テキスト応答
  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
  );
  return {
    type: 'text',
    text: textBlock?.text ?? '',
  };
}

// ========================================
// ツール実行結果をClaudeに返して最終応答を取得
// ========================================
export async function sendToolResultToGetFinalResponse(params: {
  storeMemory: StoreMemory;
  conversationHistory: ChatMessage[];
  userMessage: string;
  imageUrls?: string[];
  /** sendMessageWithToolsで得たassistantContent */
  assistantContent: Anthropic.Messages.ContentBlock[];
  toolUseId: string;
  /** ツール実行結果（JSON文字列） */
  toolResult: string;
  tools: Anthropic.Tool[];
  extraSystemContext?: string;
}): Promise<string> {
  const client = getAnthropicClient();

  // 会話履歴を構築
  const baseMessages = convertToAnthropicMessages([
    ...params.conversationHistory,
    {
      id: crypto.randomUUID(),
      role: 'user',
      content: params.userMessage,
      image_urls: params.imageUrls,
      created_at: new Date().toISOString(),
    },
  ]);

  const messages: Anthropic.Messages.MessageParam[] = [
    ...baseMessages,
    // Claudeのtool_use応答
    {
      role: 'assistant',
      content: params.assistantContent,
    },
    // ツール実行結果をuserロールで返す（Anthropic APIの仕様）
    {
      role: 'user',
      content: [
        {
          type: 'tool_result' as const,
          tool_use_id: params.toolUseId,
          content: params.toolResult,
        },
      ],
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: buildSystemPrompt(params.storeMemory, params.extraSystemContext),
    messages,
    tools: params.tools,
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
  );
  return textBlock?.text ?? '';
}

// ========================================
// Claude APIへのメッセージ送信（ツールなし・テキストのみ）
// ========================================
export async function sendMessageToClaude(params: {
  storeMemory: StoreMemory;
  conversationHistory: ChatMessage[];
  userMessage: string;
  imageUrls?: string[];
}): Promise<string> {
  const result = await sendMessageWithTools({
    ...params,
    tools: [PRODUCT_CREATE_TOOL],
  });
  // tool_useが返ってきた場合はprecedingTextを返す（fallback）
  if (result.type === 'tool_use') {
    return result.precedingText ?? '';
  }
  return result.text;
}

// ========================================
// 商品情報生成（商品登録AI）
// 画像からJSON形式の商品情報を生成する
// ========================================
export interface GeneratedProductInfo {
  name: string;
  description: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  variantSuggestions: string[];
  price?: string;
  productType?: string;
}

export async function generateProductInfo(params: {
  storeMemory: StoreMemory;
  imageUrls: string[];
  additionalContext?: string;
}): Promise<GeneratedProductInfo> {
  const client = getAnthropicClient();

  // 画像ソース変換（data: URLとHTTP URLの両方に対応）
  const content: Anthropic.Messages.ContentBlockParam[] = params.imageUrls.map((url) => ({
    type: 'image' as const,
    source: toImageSource(url),
  }));

  content.push({
    type: 'text' as const,
    text: `この商品画像を分析して、Shopify商品登録に必要な情報をJSON形式で生成してください。

${params.additionalContext ? `追加情報：${params.additionalContext}` : ''}

店舗情報：
- ブランドトーン: ${params.storeMemory.brand_tone ?? '未設定'}
- 業種: ${params.storeMemory.industry ?? '未設定'}
- ターゲット顧客: ${params.storeMemory.target_customer ?? '未設定'}

以下のJSONフォーマットで返してください：
{
  "name": "商品名（SEO対応、50文字以内）",
  "description": "商品説明文（HTML可、SEO最適化、魅力的な文章）",
  "tags": ["タグ1", "タグ2", ...（最大10個）],
  "metaTitle": "メタタイトル（60文字以内）",
  "metaDescription": "メタディスクリプション（160文字以内）",
  "variantSuggestions": ["バリアント案1", "バリアント案2", ...]
}

JSONのみを返してください。説明文は不要です。`,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content }],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('商品情報の生成に失敗しました');
  }

  try {
    // JSONを抽出（マークダウンコードブロックに囲まれている場合も対応）
    const jsonText = textContent.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonText) as GeneratedProductInfo;
  } catch {
    throw new Error('生成された商品情報の解析に失敗しました。再度お試しください。');
  }
}
