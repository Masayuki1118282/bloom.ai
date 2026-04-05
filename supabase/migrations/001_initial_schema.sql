-- Bloom AI 初期スキーマ
-- 4テーブル設計 + RLSポリシー

-- ========================================
-- 1. store_memory（店舗専用メモリ）
-- ========================================
CREATE TABLE IF NOT EXISTS store_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL UNIQUE,
  brand_tone TEXT,
  color_palette JSONB DEFAULT '{}',
  approved_patterns JSONB DEFAULT '[]',
  rejected_patterns JSONB DEFAULT '[]',
  target_customer TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE store_memory ENABLE ROW LEVEL SECURITY;

-- 各ストアは自分のデータのみアクセス可能
CREATE POLICY "store_memory_isolation" ON store_memory
  USING (store_id = current_setting('app.store_id', true));

-- ========================================
-- 2. change_requests（変更リクエスト）
-- ========================================
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  ai_plan JSONB DEFAULT '{}',
  target_page TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'rolled_back')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_requests_isolation" ON change_requests
  USING (store_id = current_setting('app.store_id', true));

-- ========================================
-- 3. change_results（変更結果・ロールバック情報）
-- ========================================
CREATE TABLE IF NOT EXISTS change_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES change_requests(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  diff_summary TEXT,
  duplicate_theme_id TEXT,
  rollback_data JSONB DEFAULT '{}',
  outcome_label TEXT CHECK (outcome_label IN ('improved', 'neutral', 'degraded', 'unknown')) DEFAULT 'unknown',
  ab_test_result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE change_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_results_isolation" ON change_results
  USING (store_id = current_setting('app.store_id', true));

-- ========================================
-- 4. global_patterns（匿名集計パターン）
-- ========================================
CREATE TABLE IF NOT EXISTS global_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB DEFAULT '{}',
  approval_rate FLOAT DEFAULT 0.0,
  sample_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- global_patternsは全ストアから読み取り可能（匿名集計データ）
ALTER TABLE global_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_patterns_read" ON global_patterns
  FOR SELECT USING (true);

-- ========================================
-- updated_at自動更新トリガー
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_memory_updated_at
  BEFORE UPDATE ON store_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER change_requests_updated_at
  BEFORE UPDATE ON change_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
