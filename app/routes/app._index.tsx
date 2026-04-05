// Bloom AI メインチャット画面
// チャット履歴サイドバー + チャットパネルの2カラムレイアウト

import { useState, useCallback, useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ChatPanel } from "../components/ChatPanel";
import { ConversationSidebar } from "../components/ConversationSidebar";
import type { ChatMessage, ChatSession, ConversationState } from "../types/bloom";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return json({ storeId: session.shop });
};

// セッションのlocalStorageキー
const sessionsKey = (storeId: string) => `bloom-ai-sessions-${storeId}`;

// 新規セッションを作成
function createNewSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "新規チャット",
    messages: [],
    state: "idle",
    requestId: null,
    hasChanges: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// セッション一覧をlocalStorageから読み込む
function loadSessions(storeId: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(sessionsKey(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// セッション一覧をlocalStorageに保存
function saveSessions(storeId: string, sessions: ChatSession[]) {
  try {
    localStorage.setItem(sessionsKey(storeId), JSON.stringify(sessions));
  } catch {}
}

export default function Index() {
  const { storeId } = useLoaderData<typeof loader>();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  // 初回マウント時にlocalStorageからセッションを復元
  useEffect(() => {
    const saved = loadSessions(storeId);
    if (saved.length > 0) {
      // 最新セッションを選択
      const sorted = [...saved].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setSessions(saved);
      setCurrentSessionId(sorted[0].id);
    } else {
      // セッションがなければ新規作成
      const newSession = createNewSession();
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
    setInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // セッション一覧が変わったらlocalStorageに保存
  useEffect(() => {
    if (initialized) {
      saveSessions(storeId, sessions);
    }
  }, [sessions, storeId, initialized]);

  // 現在のセッションを取得
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // チャットパネルからの状態更新を受け取る
  const handleChatUpdate = useCallback(
    (messages: ChatMessage[], state: ConversationState, requestId: string | null) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== currentSessionId) return s;

          // タイトルを最初のユーザーメッセージから生成
          const firstUserMsg = messages.find((m) => m.role === "user");
          const title = firstUserMsg
            ? firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "")
            : "新規チャット";

          return {
            ...s,
            title,
            messages,
            state,
            requestId,
            hasChanges: !!requestId,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [currentSessionId]
  );

  // 新規チャット作成
  const handleNewChat = useCallback(() => {
    const newSession = createNewSession();
    setSessions((prev) => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
  }, []);

  // セッション切り替え
  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // セッション削除
  const handleDeleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      // 削除したセッションが現在選択中だった場合、別セッションに切り替える
      if (sessionId === currentSessionId) {
        if (remaining.length > 0) {
          const sorted = [...remaining].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          setCurrentSessionId(sorted[0].id);
        } else {
          // セッションが0になったら新規作成
          const newSession = createNewSession();
          setCurrentSessionId(newSession.id);
          return [newSession];
        }
      }
      return remaining;
    });
  }, [currentSessionId]);

  if (!initialized || !currentSession) {
    return null;
  }

  return (
    <Page fullWidth>
      <TitleBar title="Bloom AI" />
      <div
        style={{
          display: "flex",
          gap: 0,
          height: "calc(100vh - 120px)",
          minHeight: "600px",
        }}
      >
        {/* 左サイドバー：チャット履歴 */}
        <ConversationSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />

        {/* 右：チャットパネル */}
        <div style={{ flex: 1, padding: "0 0 0 16px", overflow: "auto" }}>
          <ChatPanel
            key={currentSessionId}
            storeId={storeId}
            initialMessages={currentSession.messages.length > 0 ? currentSession.messages : undefined}
            initialState={currentSession.state}
            initialRequestId={currentSession.requestId}
            onUpdate={handleChatUpdate}
          />
        </div>
      </div>
    </Page>
  );
}
