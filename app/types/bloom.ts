// Bloom AI 型定義

// ========================================
// 会話状態
// ========================================
export type ConversationState =
  | 'idle'
  | 'planning'
  | 'awaiting_approval' // ← ここで必ず止まる
  | 'executing'
  | 'completed'
  | 'rolling_back';

// ========================================
// リスクレベル
// ========================================
export type RiskLevel = 'low' | 'medium' | 'high';

// ========================================
// 変更リクエストのステータス
// ========================================
export type ChangeRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'rolled_back';

// ========================================
// 変更結果のアウトカム
// ========================================
export type OutcomeLabel = 'improved' | 'neutral' | 'degraded' | 'unknown';

// ========================================
// 店舗メモリ
// ========================================
export interface StoreMemory {
  id: string;
  store_id: string;
  brand_tone: string | null;
  color_palette: Record<string, string>;
  approved_patterns: string[];
  rejected_patterns: string[];
  target_customer: string | null;
  industry: string | null;
  updated_at: string;
}

// ========================================
// 変更リクエスト
// ========================================
export interface ChangeRequest {
  id: string;
  store_id: string;
  user_prompt: string;
  image_urls: string[];
  ai_plan: AIPlan | null;
  target_page: string | null;
  risk_level: RiskLevel;
  status: ChangeRequestStatus;
  created_at: string;
}

// ========================================
// AIが作成する変更プラン
// ========================================
export interface AIPlan {
  summary: string;
  before: string;
  after: string;
  target_files: string[];
  changes: CodeChange[];
  expected_effect: string;
  risk_description: string;
  steps: string[];
}

export interface CodeChange {
  file: string;
  location: string;
  diff: string;
}

// ========================================
// 変更結果
// ========================================
export interface ChangeResult {
  id: string;
  request_id: string;
  store_id: string;
  diff_summary: string | null;
  duplicate_theme_id: string | null;
  rollback_data: RollbackData;
  outcome_label: OutcomeLabel;
  created_at: string;
}

export interface RollbackData {
  theme_id: string;                  // 変更を適用したライブテーマのID
  original_settings_json: string;    // 変更前の settings_data.json（文字列）
  changed_assets: string[];
}

// ========================================
// チャットメッセージ
// ========================================
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  image_urls?: string[];
  plan?: AIPlan;
  state?: ConversationState;
  created_at: string;
}

// ========================================
// チャットセッション（履歴管理用）
// ========================================
export interface ChatSession {
  id: string;
  title: string;          // 最初のユーザーメッセージ（30文字以内）
  messages: ChatMessage[];
  state: ConversationState;
  requestId: string | null;
  hasChanges: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// ロールバックキーワード
// ========================================
export const ROLLBACK_KEYWORDS = [
  '前に戻して',
  'ロールバック',
  '元に戻して',
  'やっぱりやめて',
  '一個前に戻って',
  '取り消して',
  'リバート',
  '戻して',
  'undo',
] as const;

// ========================================
// 承認キーワード
// ========================================
export const APPROVAL_KEYWORDS = [
  'ok',
  'OK',
  'やって',
  '進めて',
  '実行して',
  '承認',
  'はい',
  'yes',
] as const;
