// Shopify Theme API操作（サーバーサイドのみ）
// 書き込みはREST Asset API（PUT /admin/api/{version}/themes/{id}/assets.json）を使用
// GraphQL mutations（themeFilesUpsert, themeDuplicate）は特別申請が必要なため不使用

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

// REST APIのバージョン（shopify.server.tsのapiVersionと合わせる）
const SHOPIFY_API_VERSION = '2026-04';

// REST APIコール用セッション情報
export interface ShopifyRestSession {
  shop: string;
  accessToken: string;
}

// ========================================
// テーマ取得（GraphQL：読み取りのみなので申請不要）
// ========================================

// Shopify Admin GraphQL は role を大文字で返す（MAIN / UNPUBLISHED / DEMO）
export interface ShopifyTheme {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// 全テーマ一覧を取得
export async function getThemes(admin: AdminApiContext): Promise<ShopifyTheme[]> {
  const response = await admin.graphql(`
    query getThemes {
      themes(first: 20) {
        nodes {
          id
          name
          role
          createdAt
          updatedAt
        }
      }
    }
  `);

  const data = await response.json();

  const nodes = data?.data?.themes?.nodes;
  if (!nodes) {
    console.error('[Bloom AI] テーマ一覧取得エラー。レスポンス:', JSON.stringify(data));
    return [];
  }

  return nodes as ShopifyTheme[];
}

// ライブテーマを取得
// Shopify GraphQL は role="MAIN" を大文字で返すため大文字小文字どちらにも対応する
export async function getLiveTheme(admin: AdminApiContext): Promise<ShopifyTheme | null> {
  const themes = await getThemes(admin);
  const live = themes.find((t) => t.role?.toUpperCase() === 'MAIN') ?? null;

  console.log('[Bloom AI] getLiveTheme 結果:', live ? `${live.name} (${live.role})` : 'null');
  return live;
}

// ========================================
// テーマアセット操作
// ========================================

export interface ThemeAsset {
  key: string;
  value: string;
  contentType: string;
  updatedAt: string;
}

// GID から数値IDを抽出
// 例: "gid://shopify/OnlineStoreTheme/123456789" → "123456789"
function extractNumericId(themeId: string): string {
  if (themeId.includes('/')) {
    return themeId.split('/').pop() ?? themeId;
  }
  return themeId;
}

// アセットを取得（GraphQL：読み取りなので申請不要）
// Shopify Admin API: theme.files(filenames: [...]) が正しいクエリ
export async function getThemeAsset(
  admin: AdminApiContext,
  themeId: string,
  assetKey: string
): Promise<ThemeAsset | null> {
  const response = await admin.graphql(`
    query getThemeAsset($id: ID!, $filenames: [String!]!) {
      theme(id: $id) {
        files(filenames: $filenames) {
          nodes {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
            contentType
            updatedAt
          }
        }
      }
    }
  `, {
    variables: {
      id: themeId,
      filenames: [assetKey],
    },
  });

  const data = await response.json();

  const nodes = data.data?.theme?.files?.nodes;

  if (!nodes || nodes.length === 0) return null;

  const file = nodes[0];

  return {
    key: file.filename,
    value: file.body?.content ?? '',
    contentType: file.contentType,
    updatedAt: file.updatedAt,
  };
}

// settings_data.jsonを取得してパース
export async function getThemeSettings(
  admin: AdminApiContext,
  themeId: string
): Promise<Record<string, unknown>> {
  const asset = await getThemeAsset(admin, themeId, 'config/settings_data.json');
  if (!asset) {
    throw new Error('settings_data.jsonが見つかりません。Shopify 2.0テーマのみ対応しています。');
  }

  // Shopifyが settings_data.json の先頭に /* ... */ コメントブロックを挿入する場合があるため除去する
  const jsonStart = asset.value.indexOf('{');
  if (jsonStart === -1) {
    throw new Error('settings_data.jsonにJSONが見つかりません');
  }
  const jsonText = asset.value.slice(jsonStart);

  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`settings_data.jsonの解析に失敗しました: ${e instanceof Error ? e.message : e}`);
  }
}

// settings_data.json からアクティブな設定オブジェクトを取得する
// Shopifyテーマには2つの構造がある：
//   新形式: current がオブジェクト（設定値を直接保持）
//   旧形式: current がプリセット名（文字列）で、実際の設定は presets[current] に格納
export function resolveCurrentSettings(
  settings: Record<string, unknown>
): Record<string, unknown> {
  if (typeof settings.current === 'string') {
    // 旧形式：current = "Default" のようなプリセット名
    const presetName = settings.current;
    const presets = settings.presets as Record<string, Record<string, unknown>> | undefined;
    return presets?.[presetName] ?? {};
  }
  // 新形式：current がそのまま設定オブジェクト
  return (settings.current as Record<string, unknown>) ?? {};
}

// Claudeへのコンテキスト用：主要テーマ設定を抽出（サイズ削減）
export function extractKeyThemeSettings(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const current = resolveCurrentSettings(settings);
  const extracted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(current)) {
    if (
      key.startsWith('colors_') ||
      key.startsWith('type_') ||
      key.startsWith('layout_') ||
      key.startsWith('buttons_') ||
      key.startsWith('header_') ||
      key.startsWith('footer_') ||
      key.startsWith('cart_') ||
      key.startsWith('product_') ||
      key.startsWith('collection_') ||
      key.startsWith('blog_')
    ) {
      extracted[key] = value;
    }
  }

  return extracted;
}

// アセットを更新（REST Asset API を使用）
// PUT /admin/api/{version}/themes/{id}/assets.json
export async function updateThemeAsset(
  session: ShopifyRestSession,
  themeId: string,
  assetKey: string,
  assetValue: string
): Promise<void> {
  const numericId = extractNumericId(themeId);
  const url = `https://${session.shop}/admin/api/${SHOPIFY_API_VERSION}/themes/${numericId}/assets.json`;

  console.log('[Bloom AI] REST Asset API PUT:', url, 'key:', assetKey);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': session.accessToken,
    },
    body: JSON.stringify({
      asset: {
        key: assetKey,
        value: assetValue,
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('[Bloom AI] REST API エラー:', response.status, responseText);
    throw new Error(`テーマファイルの更新に失敗しました (HTTP ${response.status}): ${responseText}`);
  }

  console.log('[Bloom AI] REST Asset API PUT 成功:', response.status);
}

// ========================================
// settings_data.json 変更フロー
//
// 設計：
//   1. ライブテーマの現在の settings_data.json を取得（バックアップ用）
//   2. 変更後の設定を生成してライブテーマに直接書き込む（REST API）
//   3. 元の JSON 文字列を DB に保存
//
// ロールバック：
//   元の JSON 文字列をライブテーマに書き戻すだけでOK
// ========================================
export async function applyThemeSettingsChanges(
  admin: AdminApiContext,
  session: ShopifyRestSession,
  settingsChanges: Record<string, unknown>
): Promise<{
  themeId: string;              // 変更を適用したライブテーマのID
  originalSettingsJson: string; // 変更前の settings_data.json（ロールバック用）
}> {
  // 現在のライブテーマを取得
  const liveTheme = await getLiveTheme(admin);
  if (!liveTheme) {
    throw new Error('ライブテーマが見つかりません');
  }

  // 現在の settings_data.json を取得（バックアップ用に生文字列も保持）
  const originalAsset = await getThemeAsset(admin, liveTheme.id, 'config/settings_data.json');
  if (!originalAsset) {
    throw new Error('settings_data.jsonが見つかりません。Shopify 2.0テーマのみ対応しています。');
  }

  // Shopifyが挿入するコメントブロックを除去してからパース
  const jsonStart = originalAsset.value.indexOf('{');
  if (jsonStart === -1) {
    throw new Error('settings_data.jsonにJSONが見つかりません');
  }
  const originalJson = originalAsset.value.slice(jsonStart);
  let currentSettings: Record<string, unknown>;
  try {
    currentSettings = JSON.parse(originalJson) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`settings_data.jsonの解析に失敗しました: ${e instanceof Error ? e.message : e}`);
  }

  // 変更を適用した設定を作成
  // 旧形式（current = プリセット名）と新形式（current = 設定オブジェクト）の両方に対応
  let updatedSettings: Record<string, unknown>;
  if (typeof currentSettings.current === 'string') {
    // 旧形式：presets[currentName] に変更をマージ
    const presetName = currentSettings.current;
    const presets = (currentSettings.presets as Record<string, Record<string, unknown>>) ?? {};
    const currentPreset = presets[presetName] ?? {};
    updatedSettings = {
      ...currentSettings,
      presets: {
        ...presets,
        [presetName]: { ...currentPreset, ...settingsChanges },
      },
    };
  } else {
    // 新形式：current オブジェクトに変更をマージ
    const current = (currentSettings.current as Record<string, unknown>) ?? {};
    updatedSettings = {
      ...currentSettings,
      current: { ...current, ...settingsChanges },
    };
  }

  // ライブテーマに変更後の設定を直接書き込む（REST API）
  await updateThemeAsset(
    session,
    liveTheme.id,
    'config/settings_data.json',
    JSON.stringify(updatedSettings, null, 2)
  );

  console.log('[Bloom AI] テーマ設定を更新しました。テーマID:', liveTheme.id);

  return {
    themeId: liveTheme.id,
    originalSettingsJson: originalJson, // ロールバック用に変更前の内容を返す
  };
}

// ========================================
// ロールバック：元の settings_data.json を書き戻す（REST API）
// ========================================
export async function rollbackThemeSettings(
  session: ShopifyRestSession,
  themeId: string,
  originalSettingsJson: string
): Promise<void> {
  await updateThemeAsset(
    session,
    themeId,
    'config/settings_data.json',
    originalSettingsJson
  );
  console.log('[Bloom AI] ロールバック完了。テーマID:', themeId);
}
