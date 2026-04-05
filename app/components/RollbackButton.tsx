// ロールバックボタンコンポーネント（常時表示）

import { Button, Tooltip } from "@shopify/polaris";

interface RollbackButtonProps {
  onRollback: () => void;
  hasChanges: boolean;
  isLoading?: boolean;
}

// ロールバックボタン（UI上に常設）
export function RollbackButton({
  onRollback,
  hasChanges,
  isLoading = false,
}: RollbackButtonProps) {
  if (!hasChanges) return null;

  return (
    <Tooltip content="直前の変更を元に戻します。「前に戻して」と入力しても同じ効果があります。">
      <Button
        tone="critical"
        variant="plain"
        onClick={onRollback}
        loading={isLoading}
        disabled={isLoading}
        icon="↩️"
      >
        前に戻す
      </Button>
    </Tooltip>
  );
}
