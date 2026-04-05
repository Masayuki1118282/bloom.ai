// Supabase接続（サーバーサイドのみ）
// 注意：このファイルはサーバーサイドでのみimportすること

import { createClient } from '@supabase/supabase-js';
import type { StoreMemory, ChangeRequest, ChangeResult, AIPlan, RollbackData } from '../types/bloom';

// 環境変数の検証
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
  return value;
}

// Supabaseクライアント（service_roleキーを使用）
function createSupabaseClient() {
  return createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ストアIDをRLSコンテキストに設定してクエリを実行
async function withStoreContext<T>(
  storeId: string,
  fn: (client: ReturnType<typeof createSupabaseClient>) => Promise<T>
): Promise<T> {
  const client = createSupabaseClient();
  // RLSポリシーのためにストアIDをセッション変数として設定
  await client.rpc('set_config', {
    setting: 'app.store_id',
    value: storeId,
    is_local: true,
  });
  return fn(client);
}

// ========================================
// 店舗メモリ操作
// ========================================

// 店舗メモリを取得（なければ作成）
export async function getStoreMemory(storeId: string): Promise<StoreMemory> {
  const client = createSupabaseClient();
  const { data, error } = await client
    .from('store_memory')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (error && error.code === 'PGRST116') {
    // レコードが存在しない場合は作成
    const { data: newData, error: insertError } = await client
      .from('store_memory')
      .insert({ store_id: storeId })
      .select()
      .single();

    if (insertError) {
      throw new Error(`店舗メモリの作成に失敗しました: ${insertError.message}`);
    }
    return newData as StoreMemory;
  }

  if (error) {
    throw new Error(`店舗メモリの取得に失敗しました: ${error.message}`);
  }

  return data as StoreMemory;
}

// 店舗メモリを更新
export async function updateStoreMemory(
  storeId: string,
  updates: Partial<Omit<StoreMemory, 'id' | 'store_id' | 'updated_at'>>
): Promise<StoreMemory> {
  const client = createSupabaseClient();
  const { data, error } = await client
    .from('store_memory')
    .update(updates)
    .eq('store_id', storeId)
    .select()
    .single();

  if (error) {
    throw new Error(`店舗メモリの更新に失敗しました: ${error.message}`);
  }

  return data as StoreMemory;
}

// ========================================
// 変更リクエスト操作
// ========================================

// 変更リクエストを作成
export async function createChangeRequest(params: {
  storeId: string;
  userPrompt: string;
  imageUrls?: string[];
  targetPage?: string;
}): Promise<ChangeRequest> {
  const client = createSupabaseClient();
  const { data, error } = await client
    .from('change_requests')
    .insert({
      store_id: params.storeId,
      user_prompt: params.userPrompt,
      image_urls: params.imageUrls ?? [],
      target_page: params.targetPage ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`変更リクエストの作成に失敗しました: ${error.message}`);
  }

  return data as ChangeRequest;
}

// 変更リクエストにAIプランを保存
export async function updateChangeRequestWithPlan(
  requestId: string,
  storeId: string,
  plan: AIPlan,
  riskLevel: 'low' | 'medium' | 'high'
): Promise<ChangeRequest> {
  const client = createSupabaseClient();
  const { data, error } = await client
    .from('change_requests')
    .update({
      ai_plan: plan,
      risk_level: riskLevel,
      status: 'pending',
    })
    .eq('id', requestId)
    .eq('store_id', storeId)
    .select()
    .single();

  if (error) {
    throw new Error(`変更プランの保存に失敗しました: ${error.message}`);
  }

  return data as ChangeRequest;
}

// 変更リクエストのステータスを更新
export async function updateChangeRequestStatus(
  requestId: string,
  storeId: string,
  status: ChangeRequest['status']
): Promise<void> {
  const client = createSupabaseClient();
  const { error } = await client
    .from('change_requests')
    .update({ status })
    .eq('id', requestId)
    .eq('store_id', storeId);

  if (error) {
    throw new Error(`ステータスの更新に失敗しました: ${error.message}`);
  }
}

// ========================================
// 変更結果操作
// ========================================

// 変更結果を保存（ロールバック情報を含む）
export async function saveChangeResult(params: {
  requestId: string;
  storeId: string;
  diffSummary: string;
  duplicateThemeId: string;
  rollbackData: RollbackData;
}): Promise<ChangeResult> {
  const client = createSupabaseClient();
  const { data, error } = await client
    .from('change_results')
    .insert({
      request_id: params.requestId,
      store_id: params.storeId,
      diff_summary: params.diffSummary,
      duplicate_theme_id: params.duplicateThemeId,
      rollback_data: params.rollbackData,
      outcome_label: 'unknown',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`変更結果の保存に失敗しました: ${error.message}`);
  }

  return data as ChangeResult;
}

// 最新の変更結果を取得（ロールバック用）
export async function getLatestChangeResult(storeId: string): Promise<ChangeResult | null> {
  const client = createSupabaseClient();
  const { data, error } = await client
    .from('change_results')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === 'PGRST116') {
    return null;
  }

  if (error) {
    throw new Error(`変更結果の取得に失敗しました: ${error.message}`);
  }

  return data as ChangeResult;
}

// 指定ストアのpending状態の変更リクエストを削除（会話履歴クリア時に使用）
export async function deletePendingChangeRequests(storeId: string): Promise<void> {
  const client = createSupabaseClient();
  const { error } = await client
    .from('change_requests')
    .delete()
    .eq('store_id', storeId)
    .eq('status', 'pending');

  if (error) {
    throw new Error(`変更リクエストの削除に失敗しました: ${error.message}`);
  }
}

export { withStoreContext };
