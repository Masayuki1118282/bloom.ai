# BLOOM AI — 完全マスタードキュメント
# Claude Codeへの完全指示書 + 事業設計書
# Version 2.0 | 2026年3月 | 株式会社ソウゾウ

---

# PART 1: プロダクト定義

## ミッション
> 「Shopifyオーナー全員に、世界最高のAI参謀を。」

## プロダクト一言定義
Shopify管理画面の中で動く、自然言語で全操作できるAIエージェント。
使うたびに店舗に最適化されていく学習型。失敗しても一言で戻せる。

## ブランド
- **名前：** Bloom AI
- **読み：** ブルーム エーアイ
- **意味：** 開花。ストアが咲き誇るイメージ。
- **キャッチコピー：** 「一言で動く。一言で戻せる。使うほど賢くなる。」
- **サブコピー：** 「デザイナーもエンジニアも必要ない。あなたのShopifyに、専属AI参謀を。」
- **ブランドトーン：** 頼りになるが押しつけがましくない。専門的だが難しくない。失敗を恐れさせない。

---

# PART 2: 機能仕様

## コア機能（MVP / Phase 1）

### 1. AIチャットUI（管理画面埋め込み）
- Shopify管理画面の右サイドバーにチャットパネルとして表示
- テキスト入力 + 画像/スクショアップロード（ドラッグ&ドロップ対応）
- 会話履歴の保持（セッション内 + DB永続化）
- モバイル管理画面にも対応

### 2. テーマデザイン変更
- カラーパレット変更
- フォント変更
- ヒーローセクション変更
- セクション追加・削除・並び替え
- settings_data.jsonの設定値変更（Shopify 2.0限定）
- カスタムCSS注入
- Liquidテンプレート編集

### 3. 商品登録AI
- 商品写真を渡すと質問しながら登録完了まで
- 商品名・説明文・タグ・メタデータ自動生成
- SEO最適化されたメタタイトル・ディスクリプション生成
- バリアント（カラー・サイズ等）の整理提案

### 4. コピーライティング
- 商品説明文（SEO対応）
- キャッチコピー複数案
- ヒーローバナーのコピー
- 季節キャンペーン文

### 5. 承認フロー（安全設計の核心）
- 全操作：計画提示 → 承認待ち → 実行の順序を厳守
- Before/After説明、変更差分コード、期待効果、リスクを提示
- 「OK」「やって」「進めて」で実行
- 承認なしに何も実行しない

### 6. ロールバック
- 全変更でDuplicateテーマを作成してから作業
- 変更前テーマID・変更セットIDをDBに記録
- 「前に戻して」「ロールバック」「元に戻して」「やっぱりやめて」「取り消して」「戻して」で即時復元
- 専用ロールバックボタンもUI上に常設

## Phase 2機能（〜6ヶ月）
- 売上データ分析・改善提案（Analytics API連携）
- メルマガ生成 + Klaviyo API連携配信
- 競合URL分析（構成・訴求・デザイン）
- Meta/Google広告コピー自動生成
- A/Bテスト提案 + 結果分析
- SEO一括最適化（メタタグ・商品タグ）

## Phase 3機能（〜12ヶ月）
- 売上予測（季節・在庫・トレンド考慮）
- 自動週次レポート（LINE/メール通知）
- 他ECプラットフォーム対応（WooCommerce等）
- 代理店向けマルチストア管理

## 学習機能（差別化の核心）

### 層1：店舗専用メモリ（Phase 1から実装）
各ストアの以下を蓄積してパーソナライズ：
- ブランドトーン・口調
- 承認されたデザインパターン
- 却下されたパターン（NG集）
- よく使うセクション構成
- カラーパレット・フォント設定
- ターゲット顧客の特徴
- 過去の成功パターン

→ **解約したら全部消える。これが最大のロックイン。**

### 層2：匿名化パターン学習（Phase 2）
個人情報を除いた集計データで全体最適化：
- 業種別の高承認率デザイン構成
- 採用されやすいCTA・コピーパターン
- 却下されやすい変更パターン
- CVR改善につながったUI変更の傾向

### 層3：オプトイン学習（Phase 3）
明示的に同意した店舗のみ：
- 変更ログ・承認結果・成果ラベルを活用
- 協力店舗には割引特典（$10/月引き）
- 顧客個人情報は絶対に使わない

---

# PART 3: 技術スタック

## フロントエンド
```
Shopify Admin UI Extensions（管理画面埋め込み）
  - Polaris（ShopifyのUIコンポーネントライブラリ）
  - React 18
  - TypeScript
  - チャットUI（サイドパネル形式）
```

## バックエンド
```
Remix（Shopifyの標準フルスタックフレームワーク）
  - TypeScript
  - Shopify App Bridge（管理画面との通信）
  - セッション管理
```

## AI
```
Claude API（claude-sonnet-4-20250514）
  - システムプロンプト：Bloom AIの人格・ルール定義
  - 店舗メモリをコンテキストとして毎回注入
  - 画像入力（Vision）：商品写真・スクショ解析
  - Multi-Agent構成（将来）
```

## Shopify API
```
Admin API（GraphQL）
  - Products API：商品登録・編集
  - Theme API（REST）：テーマ操作
  - Analytics API：売上データ取得
  - Asset API：テーマファイル編集
  - Metafields API：カスタムデータ

Shopify CLI
  - theme duplicate：テーマ複製
  - theme push：テーマ適用（テスト環境優先）
  - Rollouts：段階的本番適用
```

## データベース（Supabase）
```
4テーブル設計：

1. store_memory
   - store_id（FK: Shopify店舗ID）
   - brand_tone（text）
   - color_palette（jsonb）
   - approved_patterns（jsonb）
   - rejected_patterns（jsonb）
   - target_customer（text）
   - industry（text）
   - updated_at

2. change_requests
   - id（uuid）
   - store_id
   - user_prompt（text）
   - image_urls（text[]）
   - ai_plan（jsonb）
   - target_page（text）
   - risk_level（enum: low/medium/high）
   - status（enum: pending/approved/rejected/executed/rolled_back）
   - created_at

3. change_results
   - id（uuid）
   - request_id（FK）
   - store_id
   - diff_summary（text）
   - duplicate_theme_id（text）
   - rollback_data（jsonb）
   - outcome_label（enum: improved/neutral/degraded/unknown）
   - ab_test_result（jsonb）
   - created_at

4. global_patterns（匿名集計）
   - id（uuid）
   - industry（text）
   - pattern_type（text）
   - pattern_data（jsonb）
   - approval_rate（float）
   - sample_count（int）
   - updated_at
```

## インフラ
```
Vercel（デプロイ）
  - Edge Functions
  - 環境変数管理

Supabase
  - PostgreSQL
  - Row Level Security（RLS）必須
  - Realtime（チャット更新に使用）

Shopify App Store
  - 公開アプリ
  - Partner Dashboard
```

## 外部API連携（Phase 2）
```
Klaviyo API：メール配信
Meta Marketing API：広告コピー連携
Google Ads API：広告コピー連携
```

---

# PART 4: 必要なアカウント・API・資格

## 即時取得が必要なもの

### Shopifyアカウント
| 項目 | URL | 用途 |
|------|-----|------|
| Shopify Partner Account | partners.shopify.com | アプリ開発・審査・公開 |
| Shopify Development Store | 同上から作成 | テスト環境 |
| Shopify App（登録） | 同上 | API認証情報取得 |

取得後に必要な情報：
- Client ID（API Key）
- Client Secret
- Webhook Secret

### Anthropic
| 項目 | URL | 用途 |
|------|-----|------|
| Anthropic API Key | console.anthropic.com | Claude API呼び出し |

### Supabase
| 項目 | URL | 用途 |
|------|-----|------|
| Supabaseプロジェクト | supabase.com | DB・認証 |

取得後に必要な情報：
- Project URL
- anon public key
- service_role key（バックエンドのみ）

### Vercel
| 項目 | URL | 用途 |
|------|-----|------|
| Vercelアカウント | vercel.com | デプロイ |

### Shopify CLI
```bash
npm install -g @shopify/cli @shopify/theme
shopify auth login
```

## Phase 2で追加取得

| サービス | 用途 |
|---------|------|
| Klaviyo API Key | メール配信連携 |
| Meta Business API | 広告コピー連携 |

## Shopify App Store公開に必要な要件

### 技術要件
- [ ] HTTPS必須（Vercelで自動対応）
- [ ] OAuth 2.0認証の実装
- [ ] Webhook必須実装（必須4種類）：
  - `customers/data_request`
  - `customers/redact`
  - `shop/redact`
  - `app/uninstalled`
- [ ] GDPR Compliance Webhooks
- [ ] セッション管理（Shopify Session Storage）
- [ ] CSP（Content Security Policy）設定

### ビジネス要件
- [ ] プライバシーポリシーページ（URL必須）
- [ ] サポートページ（URL必須）
- [ ] アプリアイコン（1024×1024px）
- [ ] スクリーンショット（最低3枚）
- [ ] アプリ説明文（英語必須・日本語推奨）

### 審査通過のための実装要件（最重要）
- [ ] ライブテーマへの直接編集ゼロ（コードレビュー対象）
- [ ] 全操作に承認フロー実装
- [ ] データ収集の最小化
- [ ] 保護顧客データを学習・横断利用しない
- [ ] プライバシーポリシーに3本柱を明記

---

# PART 5: セキュリティ設計

## 認証・認可
```
- Shopify OAuth 2.0（必須）
- JWTセッション管理
- Supabase RLS（Row Level Security）
  → 各ストアは自分のデータしか読み書きできない
- APIキーは全てサーバーサイドのみ（クライアントに露出させない）
- 環境変数はVercel/Supabaseの安全なストレージに保存
```

## データ保護
```
- ライブテーマへの直接書き込み禁止
- 全変更前にDuplicate作成（ロールバック保証）
- 顧客個人情報（名前・住所・電話・メール・決済情報）は保存・処理しない
- 画像アップロードは処理後に自動削除（永続保存しない）
- Supabase RLSで店舗間のデータ分離を保証
```

## 必須Webhookとレート制限対応
```typescript
// 必須GDPR Webhooks
const REQUIRED_WEBHOOKS = [
  'customers/data_request',   // 顧客データ開示要求
  'customers/redact',         // 顧客データ削除要求
  'shop/redact',             // ストアデータ削除要求
  'app/uninstalled',         // アンインストール時のクリーンアップ
];

// Shopify APIレート制限対応
// REST: 2リクエスト/秒
// GraphQL: コスト計算方式（1秒あたり50コスト）
// → キューイング実装必須
```

## 環境変数（.envに入れる変数）
```
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=write_themes,write_products,read_analytics
SHOPIFY_APP_URL=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```

---

# PART 6: システムプロンプト（本番用）

```
あなたは「Bloom AI」です。
Shopifyストアオーナーのための、安全第一のAIデザインエージェントです。

あなたの使命は、オーナーが自然言語で指示するだけで、
Shopifyの全体テーマ・ページデザイン・商品登録・マーケティング施策を
安全かつ確実に実行することです。

【店舗メモリ】
{{STORE_MEMORY}}

【会話履歴】
{{CONVERSATION_HISTORY}}

---

## Bloom AIの人格とトーン
- 頼りになるが、押しつけがましくない
- 専門的だが、難しい言葉を使わない
- 失敗を恐れさせない（「大丈夫です、すぐ戻せます」が口癖）
- 提案は具体的で、理由を必ず添える
- 日本語で対応

---

## 絶対に破れない安全ルール

ルール1：ライブテーマへの直接編集は絶対禁止
必ずtheme duplicateでDuplicateテーマを作成してから作業。

ルール2：承認なしに何も実行しない
「OK」「やって」「進めて」などの明示的な承認があるまで実行しない。
計画とプレビューの提示→承認待ち→実行の順序は絶対。

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

## 標準処理フロー

STEP 1：指示受付と解釈
STEP 2：現状把握（承認を得てから）
STEP 3：計画立案とプレビュー提示（下記フォーマットで）
STEP 4：承認待機
STEP 5：安全な実行（Duplicate → 変更 → 確認）
STEP 6：完了報告とロールバック案内

---

## プレビュー提示フォーマット

🌸 Bloom AI 変更プラン

📋 概要
[何をどう変えるかを1〜3行で]

🔍 Before（現在の状態）
[現在の状態を説明]

✨ After（変更後の状態）
[変更後を説明]

📦 変更対象
- ファイル：[ファイル名]
- 箇所：[変更箇所]
- 影響：[影響ページ]

💻 変更差分
```diff
- [削除される行]
+ [追加される行]
```

🎯 期待効果
[具体的な効果]

⚠️ リスク
[リスクと対処法]

🔧 実行手順
1. Duplicateテーマ作成
2. 変更適用
3. プレビュー確認
4. 本番反映（Rollouts）

✅ 承認しますか？
「OK」→ 実行 / 「修正して」→ 修正 / 「やめる」→ 中断

---

## ロールバック対応

以下の言葉を検知したら即ロールバック処理へ：
前に戻して / ロールバック / 元に戻して / やっぱりやめて /
一個前に戻って / 取り消して / リバート / 戻して

---

## 店舗メモリの更新

会話の中でブランド・好み・NGが明らかになったら：
「💾 店舗メモリを更新しました：[内容]」と報告してDBに保存。
```

---

# PART 7: マネタイズ設計

## 価格設計（機能で差をつける、回数制限なし）

| プラン | 価格 | 機能 |
|--------|------|------|
| **Starter** | **$19/月** | 商品登録AI・コピー生成・基本デザイン変更・ロールバック |
| **Growth** | **$49/月** | 全機能（分析・広告コピー・A/Bテスト・Klaviyo連携） |
| **Enterprise** | **$99/月** | Growth全機能 + 優先サポート・カスタムAgent・マルチストア |

**回数制限は設けない。機能で差をつける。**
→ 使いすぎ不安をなくし、ヘビーユーザーほど価値を感じる設計。

## 追加収益
- 業種別テンプレートパック：$29〜$49（買い切り）
- 代理店向けリセラープログラム：30%レベニューシェア
- 企業向けカスタム開発：応相談

## 収益シミュレーション

| フェーズ | 店舗数 | 平均単価 | 月次収益 |
|---------|--------|---------|---------|
| Phase 1（日本） | 100店舗 | $30 | $3,000（約45万円） |
| Phase 2（日本） | 1,000店舗 | $35 | $35,000（約520万円） |
| Phase 3（グローバル） | 10,000店舗 | $40 | $400,000（約6,000万円） |

日本31,000店舗の1%課金 = 310店舗 × $35 = 月約$10,850（約160万円）

---

# PART 8: マーケティング戦略

## ターゲット

**Primary：** 日本のShopify中小規模オーナー（月商100万〜1,000万円）
- デザイナー・エンジニアを雇えない
- でも本格的なストアを運営したい
- 変更が怖い（壊れそう）

**Secondary：** Shopify制作代理店
- クライアント向けの付加価値ツールとして
- 代理店自身の作業効率化

## メッセージ

```
メインコピー：
「デザイナーいらない。エンジニアいらない。
『かっこよくして』の一言でいい。」

恐怖除去コピー：
「壊しても大丈夫。一言で元に戻せます。」

学習訴求コピー：
「使うほどあなたの店を覚えていく。
3ヶ月後には、あなた専用のAIになっている。」
```

## 獲得チャネル（優先順）

1. **Shopify App Store自然流入**（最重要）
   - 「AI」「デザイン」「自動化」カテゴリで上位
   - レビュー獲得を最優先（初期100店舗に直接アプローチ）

2. **YouTubeデモ動画**
   - 「Shopify AIで5分でサイトをリニューアルしてみた」
   - ビフォーアフター系は拡散しやすい

3. **X・Threads**
   - ビフォーアフターのスクショ投稿
   - 「一言でロールバック」のGIFが刺さる

4. **Shopify代理店へのB2B営業**
   - レベニューシェア30%を餌にパートナー化
   - 1代理店が10クライアントに導入すれば一気に広がる

5. **日本Shopifyコミュニティへの投稿**
   - Shopify Japan公式コミュニティ
   - ECに関するFacebookグループ

## 審査通過がブランドになる

「Shopify App Store公式掲載」のバッジを全マーケティング材料に使う。
これが最大の信頼担保。競合が審査を諦める中、通過したことを前面に出す。

---

# PART 9: スケール戦略

## フェーズ別ロードマップ

```
Phase 1（0〜3ヶ月）：日本語版MVP
  ✓ 商品登録AI
  ✓ コピー生成
  ✓ 基本デザイン変更
  ✓ 承認フロー・ロールバック
  ✓ 店舗メモリ（層1）
  ✓ Shopify App Store公開（日本語）
  目標：100店舗、月45万円

Phase 2（3〜6ヶ月）：機能拡充 + 英語展開
  ✓ 売上分析・改善提案
  ✓ Klaviyo連携
  ✓ 広告コピー生成
  ✓ A/Bテスト
  ✓ 匿名パターン学習（層2）
  ✓ 英語対応・グローバル展開
  目標：1,000店舗、月520万円

Phase 3（6〜12ヶ月）：データ優位性確立
  ✓ 売上予測
  ✓ 代理店パートナープログラム
  ✓ オプトイン学習（層3）
  ✓ 他ECプラットフォーム展開
  目標：10,000店舗、月6,000万円
```

## 競合優位性が時間とともに拡大する構造

```
店舗が増える
  → global_patternsが育つ
    → 提案精度が上がる
      → 新規ユーザーへの価値も上がる
        → さらに店舗が増える（複利成長）
```

先行者が圧倒的に有利なビジネスモデル。

---

# PART 10: CLAUDE CODEへの完全指示

## これを読んでいるのはClaude Codeエージェントです。
## 以下の指示に従って、Bloom AIを構築してください。

---

## あなたの役割

あなたはBloom AIの主任エンジニアです。
このドキュメントに書かれた仕様を忠実に実装してください。
不明点は実装前に必ず確認してください。
勝手に仕様を変えないでください。

---

## 開発ルール

1. **TypeScript必須**（JavaScriptは使わない）
2. **コメントは日本語**
3. **エラーメッセージはユーザーフレンドリーな日本語**
4. **環境変数は絶対にクライアントサイドに露出させない**
5. **.envファイルは作成しない（.env.exampleのみ作成）**
6. **ライブテーマへの直接編集コードは絶対に書かない**
7. **Shopify APIのレート制限に対応したキューイング実装**

---

## 開発順序（この順番で実装してください）

### STEP 1：プロジェクト初期化
```bash
# Shopify Remixアプリの作成
npm init @shopify/app@latest -- --template=remix

# 必要なパッケージのインストール
npm install @anthropic-ai/sdk @supabase/supabase-js
npm install @shopify/polaris @shopify/app-bridge-react
```

### STEP 2：環境変数設定
.env.exampleを作成（PART 4のリストを参照）

### STEP 3：Supabaseセットアップ
PART 3のDB設計（4テーブル）をマイグレーションファイルとして作成。
RLSポリシーも必ず設定。

### STEP 4：Shopify認証
OAuth 2.0フローの実装。
必須スコープ：write_themes, write_products, read_analytics

### STEP 5：必須Webhookの実装
PART 5に記載の4種類のGDPR Webhookを実装。

### STEP 6：Claude API接続
PART 6のシステムプロンプトを使ったAPI呼び出しの実装。
店舗メモリをコンテキストとして毎回注入する仕組みを作ること。

### STEP 7：Shopify Theme API連携
- theme duplicate（テーマ複製）
- theme asset読み書き
- settings_data.json操作
- ロールバック用IDの記録

### STEP 8：チャットUIの実装
Polarisコンポーネントを使ったサイドパネル形式のチャットUI。
画像アップロード対応。

### STEP 9：承認フローの実装
```typescript
type ConversationState = 
  | 'idle'
  | 'planning'
  | 'awaiting_approval'  // ← ここで必ず止まる
  | 'executing'
  | 'completed'
  | 'rolling_back'

const ROLLBACK_KEYWORDS = [
  '前に戻して', 'ロールバック', '元に戻して', 'やっぱりやめて',
  '一個前に戻って', '取り消して', 'リバート', '戻して', 'undo'
];
```

### STEP 10：商品登録AI（Phase 1のメイン機能）
画像 → Claude Vision → 商品情報生成 → Shopify Product API登録

### STEP 11：App Store申請準備
- プライバシーポリシーページの作成
- サポートページの作成
- アプリアイコン・スクリーンショットの準備指示

---

## ディレクトリ構成（推奨）

```
bloom-ai/
├── CLAUDE.md                    ← このファイルを配置
├── app/
│   ├── routes/
│   │   ├── app._index.tsx       ← メインチャット画面
│   │   ├── app.products.tsx     ← 商品登録AI
│   │   ├── api.chat.tsx         ← Claude API呼び出し
│   │   ├── api.theme.tsx        ← Theme API操作
│   │   ├── webhooks.tsx         ← 必須Webhook
│   │   └── privacy.tsx          ← プライバシーポリシー
│   ├── components/
│   │   ├── ChatPanel.tsx        ← チャットUI
│   │   ├── PlanPreview.tsx      ← 変更プランのプレビュー
│   │   ├── ApprovalButtons.tsx  ← 承認・却下ボタン
│   │   └── RollbackButton.tsx   ← ロールバックボタン
│   ├── lib/
│   │   ├── claude.server.ts     ← Claude API（サーバーのみ）
│   │   ├── shopify-theme.server.ts  ← Theme API操作
│   │   ├── store-memory.server.ts   ← 店舗メモリ管理
│   │   └── supabase.server.ts   ← DB接続
│   └── types/
│       └── bloom.ts             ← 型定義
├── supabase/
│   └── migrations/              ← DBマイグレーション
├── extensions/
│   └── bloom-ai-panel/          ← Admin UI Extension
├── .env.example
└── package.json
```

---

## 最初に作るべきMVPの絞り込み

Phase 1の中でも、**最初の1機能**はこれだけに絞ること：

> **「商品写真を渡すと、質問しながら商品説明文・タグ・メタデータを生成し、
> Shopifyに登録するまで完了する」**

これだけで$19/月の課金理由として十分。
デザイン変更は安定してから追加する。

---

## 実装完了後の確認チェックリスト

- [ ] ライブテーマへの直接編集コードが存在しないこと
- [ ] 全変更にDuplicate作成が実装されていること
- [ ] 承認なしに実行するコードパスが存在しないこと
- [ ] ロールバックキーワードが正しく検知されること
- [ ] 4つのGDPR Webhookが実装されていること
- [ ] RLSで店舗間のデータ分離が保証されていること
- [ ] APIキーがクライアントサイドに露出していないこと
- [ ] TypeScriptのエラーが0件であること
- [ ] プライバシーポリシーページが存在すること

---

*Bloom AI Master Document v2.0*
*2026年3月 | 株式会社ソウゾウ | Masayuki*
*「Shopifyオーナー全員に、世界最高のAI参謀を。」*

---

# PART 11: コピーライティング専門プロンプト

## コピーライティング専門プロンプト

コピー生成時は以下のフレームワークを必ず使用すること：

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

### 店舗メモリの活用
- brand_toneを参照してトーンを合わせる
- target_customerを参照してターゲットの言葉で書く
- approved_patternsを参照して過去に好まれた表現を踏襲する
- rejected_patternsを参照してNGな表現を避ける

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
