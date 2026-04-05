// 店舗メモリ管理（サーバーサイドのみ）

import { getStoreMemory, updateStoreMemory } from './supabase.server';
import type { StoreMemory } from '../types/bloom';

// 店舗メモリを取得
export async function fetchStoreMemory(storeId: string): Promise<StoreMemory> {
  return getStoreMemory(storeId);
}

// AIの応答から店舗メモリを更新すべき情報を抽出して保存
export async function processMemoryUpdate(
  storeId: string,
  aiResponse: string,
  storeMemory: StoreMemory
): Promise<StoreMemory | null> {
  // 「💾 店舗メモリを更新しました」のパターンを検知
  if (!aiResponse.includes('💾 店舗メモリを更新しました')) {
    return null;
  }

  // ブランドトーンの更新を検知
  const brandToneMatch = aiResponse.match(/ブランドトーン[：:]\s*(.+)/);
  if (brandToneMatch) {
    return updateStoreMemory(storeId, {
      brand_tone: brandToneMatch[1].trim(),
    });
  }

  return null;
}

// 承認されたパターンを追加
export async function addApprovedPattern(
  storeId: string,
  pattern: string,
  storeMemory: StoreMemory
): Promise<StoreMemory> {
  const newPatterns = [...storeMemory.approved_patterns, pattern];
  return updateStoreMemory(storeId, {
    approved_patterns: newPatterns,
  });
}

// NGパターンを追加
export async function addRejectedPattern(
  storeId: string,
  pattern: string,
  storeMemory: StoreMemory
): Promise<StoreMemory> {
  const newPatterns = [...storeMemory.rejected_patterns, pattern];
  return updateStoreMemory(storeId, {
    rejected_patterns: newPatterns,
  });
}
