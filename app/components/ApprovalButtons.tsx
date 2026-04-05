// 承認・却下・ロールバックボタンコンポーネント

import { Button, ButtonGroup, InlineStack, Text, Banner } from "@shopify/polaris";

interface ApprovalButtonsProps {
  onApprove: () => void;
  onModify: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// 承認フローのアクションボタン
export function ApprovalButtons({
  onApprove,
  onModify,
  onCancel,
  isLoading = false,
}: ApprovalButtonsProps) {
  return (
    <Banner tone="info">
      <InlineStack gap="300" align="center">
        <Text as="p" variant="bodyMd">
          この変更プランを実行しますか？
        </Text>
        <ButtonGroup>
          <Button
            variant="primary"
            onClick={onApprove}
            loading={isLoading}
            disabled={isLoading}
          >
            ✅ OK・実行する
          </Button>
          <Button
            onClick={onModify}
            disabled={isLoading}
          >
            ✏️ 修正して
          </Button>
          <Button
            tone="critical"
            onClick={onCancel}
            disabled={isLoading}
          >
            ❌ やめる
          </Button>
        </ButtonGroup>
      </InlineStack>
    </Banner>
  );
}
