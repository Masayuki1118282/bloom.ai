// 変更プランプレビューコンポーネント
// AIが提案した変更プランを構造化して表示する

import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Divider,
  Box,
} from "@shopify/polaris";
import type { AIPlan } from "../types/bloom";

interface PlanPreviewProps {
  plan: AIPlan;
}

export function PlanPreview({ plan }: PlanPreviewProps) {
  return (
    <Card>
      <BlockStack gap="400">
        {/* ヘッダー */}
        <InlineStack align="space-between">
          <Text as="h3" variant="headingMd">
            🌸 Bloom AI 変更プラン
          </Text>
          <Badge tone="warning">承認待ち</Badge>
        </InlineStack>

        <Divider />

        {/* 概要 */}
        <BlockStack gap="100">
          <Text as="p" variant="bodyMd" fontWeight="bold">
            📋 概要
          </Text>
          <Text as="p" variant="bodyMd">
            {plan.summary}
          </Text>
        </BlockStack>

        {/* Before / After */}
        <Box background="bg-fill-secondary" padding="300" borderRadius="200">
          <BlockStack gap="300">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="bold" tone="subdued">
                🔍 Before（現在の状態）
              </Text>
              <Text as="p" variant="bodySm">
                {plan.before}
              </Text>
            </BlockStack>
            <Divider />
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" fontWeight="bold">
                ✨ After（変更後の状態）
              </Text>
              <Text as="p" variant="bodySm">
                {plan.after}
              </Text>
            </BlockStack>
          </BlockStack>
        </Box>

        {/* 変更対象ファイル */}
        {plan.target_files.length > 0 && (
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="bold">
              📦 変更対象
            </Text>
            {plan.target_files.map((file, i) => (
              <Text key={i} as="p" variant="bodySm" tone="subdued">
                • {file}
              </Text>
            ))}
          </BlockStack>
        )}

        {/* 変更差分 */}
        {plan.changes.length > 0 && (
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="bold">
              💻 変更差分
            </Text>
            {plan.changes.map((change, i) => (
              <Box
                key={i}
                background="bg-fill-secondary"
                padding="300"
                borderRadius="100"
              >
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued" fontWeight="bold">
                    {change.file}
                    {change.location ? ` — ${change.location}` : ""}
                  </Text>
                  <pre
                    style={{
                      fontSize: "12px",
                      whiteSpace: "pre-wrap",
                      margin: 0,
                      fontFamily: "monospace",
                      lineHeight: 1.6,
                    }}
                  >
                    {change.diff}
                  </pre>
                </BlockStack>
              </Box>
            ))}
          </BlockStack>
        )}

        {/* 期待効果 */}
        <BlockStack gap="100">
          <Text as="p" variant="bodyMd" fontWeight="bold">
            🎯 期待効果
          </Text>
          <Text as="p" variant="bodySm">
            {plan.expected_effect}
          </Text>
        </BlockStack>

        {/* リスク */}
        {plan.risk_description && (
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="bold" tone="caution">
              ⚠️ リスク
            </Text>
            <Text as="p" variant="bodySm">
              {plan.risk_description}
            </Text>
          </BlockStack>
        )}

        {/* 実行手順 */}
        {plan.steps.length > 0 && (
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="bold">
              🔧 実行手順
            </Text>
            {plan.steps.map((step, i) => (
              <Text key={i} as="p" variant="bodySm">
                {i + 1}. {step}
              </Text>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
