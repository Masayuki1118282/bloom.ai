// チャット履歴サイドバーコンポーネント
// セッション一覧と新規チャットボタンを表示

import { useState } from "react";
import {
  Box,
  BlockStack,
  Text,
  Button,
  Divider,
  InlineStack,
} from "@shopify/polaris";
import type { ChatSession } from "../types/bloom";

interface ConversationSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function ConversationSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ConversationSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 最新順にソート
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "昨日";
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    }
  };

  return (
    <div
      style={{
        width: "220px",
        minWidth: "220px",
        height: "100%",
        borderRight: "1px solid #e1e3e5",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f6f6f7",
      }}
    >
      {/* ヘッダー */}
      <Box padding="300">
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" tone="subdued">
            チャット履歴
          </Text>
          <Button variant="primary" onClick={onNewChat} size="slim" fullWidth>
            ＋ 新規チャット
          </Button>
        </BlockStack>
      </Box>

      <Divider />

      {/* セッション一覧 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <BlockStack gap="0">
          {sorted.length === 0 && (
            <Box padding="400">
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                チャット履歴はありません
              </Text>
            </Box>
          )}
          {sorted.map((session) => {
            const isActive = session.id === currentSessionId;
            const isHovered = hoveredId === session.id;
            return (
              <div
                key={session.id}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={() => onSelectSession(session.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 36px 10px 12px",
                    border: "none",
                    borderBottom: "1px solid #e1e3e5",
                    backgroundColor: isActive ? "#e3f1df" : isHovered ? "#f0f0f0" : "transparent",
                    cursor: "pointer",
                    transition: "background-color 0.1s",
                  }}
                >
                  <BlockStack gap="100">
                    <Text
                      as="p"
                      variant="bodySm"
                      fontWeight={isActive ? "bold" : "regular"}
                      truncate
                    >
                      {session.title || "新規チャット"}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {formatDate(session.updatedAt)}
                    </Text>
                  </BlockStack>
                </button>

                {/* ホバー時に表示する削除ボタン */}
                {isHovered && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="このチャットを削除"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "8px",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#6d7175",
                      fontSize: "16px",
                      lineHeight: 1,
                      padding: "2px 4px",
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#d72c0d";
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fef3f1";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#6d7175";
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </BlockStack>
      </div>
    </div>
  );
}
