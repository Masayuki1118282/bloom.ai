// チャットUIコンポーネント
// モダンなチャットデザイン（ユーザー右寄せ / AI左寄せ）

import { useState, useRef, useEffect, useCallback } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Button,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  Modal,
} from "@shopify/polaris";
import { ApprovalButtons } from "./ApprovalButtons";
import { RollbackButton } from "./RollbackButton";
import type { ChatMessage, ConversationState } from "../types/bloom";

interface ChatPanelProps {
  storeId: string;
  initialMessages?: ChatMessage[];
  initialState?: ConversationState;
  initialRequestId?: string | null;
  onUpdate?: (messages: ChatMessage[], state: ConversationState, requestId: string | null) => void;
}

// AIメッセージバブル（左寄せ）
function AiBubble({ message }: { message: ChatMessage }) {
  const lines = message.content.split("\n");
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", maxWidth: "82%" }}>
      {/* アバター */}
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #008060 0%, #00a47c 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        🌸
      </div>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "4px 16px 16px 16px",
          padding: "10px 14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          flex: 1,
        }}
      >
        <Text as="p" variant="bodyMd">
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </Text>
      </div>
    </div>
  );
}

// ユーザーメッセージバブル（右寄せ）
function UserBubble({ message }: { message: ChatMessage }) {
  const lines = message.content.split("\n");
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: "78%" }}>
        {/* 画像プレビュー */}
        {message.image_urls && message.image_urls.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end", marginBottom: "6px" }}>
            {message.image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`添付画像 ${i + 1}`}
                style={{
                  maxWidth: "180px",
                  maxHeight: "180px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}
        {message.content && (
          <div
            style={{
              background: "#1a1a1a",
              color: "#ffffff",
              borderRadius: "16px 16px 4px 16px",
              padding: "10px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <Text as="p" variant="bodyMd" tone="text-inverse">
              {lines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < lines.length - 1 && <br />}
                </span>
              ))}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}

// タイピングインジケーター
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #008060 0%, #00a47c 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        🌸
      </div>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "4px 16px 16px 16px",
          padding: "12px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#9ca3af",
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "こんにちは！Bloom AIです🌸\n\n商品写真を送ってくれれば、商品説明文・タグ・メタデータを自動生成してShopifyに登録します。\n\n「商品写真を登録したい」「このデザインをかっこよくして」など、お気軽にどうぞ！\n\n修正したい場合は「戻して」と一言言えば、すぐに元の状態に戻せます。",
  created_at: new Date().toISOString(),
};

export function ChatPanel({
  storeId,
  initialMessages,
  initialState = "idle",
  initialRequestId = null,
  onUpdate,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages && initialMessages.length > 0 ? initialMessages : [WELCOME_MESSAGE]
  );
  const [inputText, setInputText] = useState("");
  const [currentState, setCurrentState] = useState<ConversationState>(initialState);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(initialRequestId);
  const [hasChanges, setHasChanges] = useState(!!initialRequestId);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clearFetcher = useFetcher();
  const fetcher = useFetcher<{
    message?: string;
    state?: ConversationState;
    requestId?: string;
    error?: string;
  }>();

  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    onUpdate?.(messages, currentState, currentRequestId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentState, currentRequestId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `⚠️ ${fetcher.data!.error}`,
            created_at: new Date().toISOString(),
          },
        ]);
      } else if (fetcher.data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: fetcher.data!.message!,
            state: fetcher.data!.state,
            created_at: new Date().toISOString(),
          },
        ]);
        if (fetcher.data.state) setCurrentState(fetcher.data.state);
        if (fetcher.data.requestId) {
          setCurrentRequestId(fetcher.data.requestId);
          setHasChanges(true);
        }
      }
    }
  }, [fetcher.data, fetcher.state]);

  const sendMessage = useCallback(
    (messageText: string, urls: string[] = []) => {
      if (!messageText.trim() && urls.length === 0) return;
      if (isLoading) return;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: messageText,
          image_urls: urls.length > 0 ? urls : undefined,
          created_at: new Date().toISOString(),
        },
      ]);

      const formData = new FormData();
      formData.append("message", messageText);
      formData.append("conversationHistory", JSON.stringify(messages));
      formData.append("currentState", currentState);
      formData.append("imageUrls", JSON.stringify(urls));
      if (currentRequestId) formData.append("currentRequestId", currentRequestId);

      setInputText("");
      setImageUrls([]);
      fetcher.submit(formData, { method: "POST", action: "/api/chat" });
    },
    [messages, currentState, currentRequestId, isLoading, fetcher]
  );

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImageUrls((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
  };

  const handleClearHistory = () => {
    setMessages([WELCOME_MESSAGE]);
    setCurrentState("idle");
    setCurrentRequestId(null);
    setHasChanges(false);
    setShowClearModal(false);
    clearFetcher.submit(new FormData(), { method: "POST", action: "/api/clear-history" });
  };

  const handleApprove = () => sendMessage("OK");
  const handleModify = () => sendMessage("修正して");
  const handleCancel = () => sendMessage("やめる");
  const handleRollback = () => sendMessage("前に戻して");

  const STATE_BADGE: Record<ConversationState, { label: string; tone: "info" | "warning" | "success" | "critical" | "attention" }> = {
    idle: { label: "待機中", tone: "info" },
    planning: { label: "考え中", tone: "attention" },
    awaiting_approval: { label: "確認待ち", tone: "warning" },
    executing: { label: "実行中", tone: "info" },
    completed: { label: "完了", tone: "success" },
    rolling_back: { label: "ロールバック中", tone: "critical" },
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fafafa",
        }}
      >
        <InlineStack gap="200" align="center">
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #008060 0%, #00a47c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            🌸
          </div>
          <BlockStack gap="0">
            <Text as="p" variant="bodyMd" fontWeight="semibold">Bloom AI</Text>
          </BlockStack>
          <Badge tone={STATE_BADGE[currentState].tone}>{STATE_BADGE[currentState].label}</Badge>
        </InlineStack>

        <InlineStack gap="100" align="center">
          <button
            onClick={() => setShowClearModal(true)}
            disabled={isLoading}
            style={{
              background: "none",
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              color: "#9ca3af",
              fontSize: "12px",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            履歴を消去
          </button>
          <RollbackButton onRollback={handleRollback} hasChanges={hasChanges} isLoading={isLoading} />
        </InlineStack>
      </div>

      {/* 履歴クリア確認Modal */}
      <Modal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="会話履歴を削除しますか？"
        primaryAction={{ content: "削除する", destructive: true, onAction: handleClearHistory }}
        secondaryActions={[{ content: "キャンセル", onAction: () => setShowClearModal(false) }]}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">現在の会話履歴がすべて削除されます。この操作は元に戻せません。</Text>
        </Modal.Section>
      </Modal>

      {/* メッセージエリア */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); }}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: isDragging ? "#f0faf7" : "#f9fafb",
          outline: isDragging ? "2px dashed #008060" : "none",
          outlineOffset: "-8px",
          position: "relative",
        }}
      >
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserBubble key={msg.id} message={msg} />
          ) : (
            <AiBubble key={msg.id} message={msg} />
          )
        )}

        {isLoading && <TypingIndicator />}

        {isDragging && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Text as="p" variant="bodyLg" tone="subdued">📸 ここにドロップして商品写真を追加</Text>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 承認ボタン */}
      {currentState === "awaiting_approval" && !isLoading && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fffbf5" }}>
          <ApprovalButtons
            onApprove={handleApprove}
            onModify={handleModify}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 入力エリア */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#ffffff" }}>
        {/* 選択済み画像プレビュー */}
        {imageUrls.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            {imageUrls.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={url}
                  alt={`選択画像 ${i + 1}`}
                  style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <button
                  onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#374151",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* テキスト入力 + ボタン群 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "8px",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "8px 8px 8px 12px",
          }}
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                e.preventDefault();
                sendMessage(inputText, imageUrls);
              }
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="メッセージを入力…（Shift+Enterで改行）"
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              resize: "none",
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#111827",
              padding: "4px 0",
              maxHeight: "120px",
              overflowY: "auto",
              fontFamily: "inherit",
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />

          {/* 画像添付ボタン */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="画像を添付"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#6b7280",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = "#e5e7eb"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            📎
          </button>

          {/* 送信ボタン */}
          <button
            onClick={() => sendMessage(inputText, imageUrls)}
            disabled={isLoading || (!inputText.trim() && imageUrls.length === 0)}
            title="送信"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              border: "none",
              background: (isLoading || (!inputText.trim() && imageUrls.length === 0)) ? "#e5e7eb" : "#008060",
              cursor: (isLoading || (!inputText.trim() && imageUrls.length === 0)) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            {isLoading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </div>
  );
}
