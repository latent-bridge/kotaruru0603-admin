"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { PALETTE, RADIUS } from "@/lib/design";
import {
  API_BASE,
  SITE_ID,
  type ChatMessage,
  deleteMessage,
  getChatMessages,
  getHidden,
  hideMessage,
  unhideMessage,
} from "@/lib/api";

type HiddenMap = Map<string, "hide" | "delete">;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hidden, setHidden] = useState<HiddenMap>(new Map());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Initial load: hidden first so the messages render with correct flags.
  // /chat/:siteId/messages already filters server-side, so we also fetch the
  // raw history via SSE replay (which also filters); the explicit GET below is
  // the seed for messages we WON'T see again because they're already hidden.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [msgRes, hiddenRes] = await Promise.all([
          getChatMessages(),
          getHidden(),
        ]);
        if (cancelled) return;
        setMessages(msgRes.messages);
        const map: HiddenMap = new Map();
        for (const h of hiddenRes.hidden) map.set(h.message_id, h.action);
        setHidden(map);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // SSE: new messages, plus named events for hide/delete/unhide so multiple
  // admin tabs stay in sync (and so a viewer hiding via one device sees it on
  // the other).
  useEffect(() => {
    const url = `${API_BASE}/chat/${SITE_ID}/stream`;
    const es = new EventSource(url, { withCredentials: true });
    es.onopen = () => setStreamStatus("connected");
    es.onerror = () => setStreamStatus("error");
    es.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data) as ChatMessage;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id) ? prev : [...prev, m],
        );
      } catch { /* malformed */ }
    };
    es.addEventListener("hide", (ev: MessageEvent) => {
      try {
        const { messageId } = JSON.parse(ev.data) as { messageId: string };
        setHidden((p) => new Map(p).set(messageId, "hide"));
      } catch { /* malformed */ }
    });
    es.addEventListener("delete", (ev: MessageEvent) => {
      try {
        const { messageId } = JSON.parse(ev.data) as { messageId: string };
        setHidden((p) => new Map(p).set(messageId, "delete"));
      } catch { /* malformed */ }
    });
    es.addEventListener("unhide", (ev: MessageEvent) => {
      try {
        const { messageId } = JSON.parse(ev.data) as { messageId: string };
        setHidden((p) => {
          const next = new Map(p);
          next.delete(messageId);
          return next;
        });
      } catch { /* malformed */ }
    });
    return () => es.close();
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const withBusy = useCallback(
    async (id: string, fn: () => Promise<unknown>) => {
      setBusy((p) => new Set(p).add(id));
      setError(null);
      try {
        await fn();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy((p) => {
          const next = new Set(p);
          next.delete(id);
          return next;
        });
      }
    },
    [],
  );

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, color: PALETTE.ink }}>チャット</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: PALETTE.inkDim }}>
            ファンサイトに表示中のメッセージを管理
          </p>
        </div>
        <span style={{ fontSize: 12, color: PALETTE.inkDim }}>
          {streamStatus === "connected" ? "🟢 接続中" : streamStatus === "error" ? "🔴 切断" : "⏳ 接続中…"}
        </span>
      </div>

      {error && (
        <div style={{
          padding: 12,
          background: "#fbe0e4",
          border: `1.5px solid #c25470`,
          color: "#9a3a52",
          borderRadius: RADIUS.md,
          marginBottom: 16,
          fontSize: 13,
        }}>{error}</div>
      )}

      <div
        ref={messagesRef}
        style={{
          background: PALETTE.paper,
          border: `1.5px solid ${PALETTE.inkSoft}`,
          borderRadius: RADIUS.lg,
          height: 600,
          overflowY: "auto",
          padding: 12,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: PALETTE.inkDim, textAlign: "center", padding: 60 }}>
            (まだメッセージがありません)
          </p>
        ) : (
          messages.map((m) => {
            const action = hidden.get(m.id);
            const isHidden = action === "hide" || action === "delete";
            return (
              <div
                key={m.id}
                className="chat-message"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  borderBottom: `1px solid ${PALETTE.inkSoft}`,
                  background: isHidden ? "rgba(58,46,42,0.04)" : "transparent",
                  opacity: isHidden ? 0.55 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: PALETTE.inkDim, marginBottom: 3 }}>
                    <strong style={{ color: PALETTE.ink }}>{m.author}</strong>
                    {" · "}
                    {new Date(m.timestamp).toLocaleTimeString("ja-JP")}
                    {action && (
                      <span style={{
                        marginLeft: 8,
                        padding: "1px 8px",
                        borderRadius: 999,
                        background: action === "delete" ? "#fbe0e4" : "#fad8c8",
                        color: action === "delete" ? "#9a3a52" : "#c26a50",
                        fontSize: 10,
                        fontWeight: 700,
                      }}>{action === "delete" ? "削除済" : "非表示"}</span>
                    )}
                  </div>
                  <div style={{ wordBreak: "break-word", color: PALETTE.ink }}>{m.content}</div>
                </div>
                <div className="chat-message-actions" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {action !== "delete" && (
                    <button
                      onClick={() => {
                        if (!confirm(`このメッセージを Discord からも削除します。よろしいですか？\n\n${m.content}`)) return;
                        withBusy(m.id, () => deleteMessage(m.id));
                      }}
                      disabled={busy.has(m.id)}
                      style={btnStyle("#9a3a52", "#fbe0e4")}
                    >削除</button>
                  )}
                  {!isHidden && (
                    <button
                      onClick={() => withBusy(m.id, () => hideMessage(m.id))}
                      disabled={busy.has(m.id)}
                      style={btnStyle("#c26a50", "#fad8c8")}
                    >非表示</button>
                  )}
                  {action === "hide" && (
                    <button
                      onClick={() => withBusy(m.id, () => unhideMessage(m.id))}
                      disabled={busy.has(m.id)}
                      style={btnStyle(PALETTE.accent, PALETTE.paper)}
                    >元に戻す</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Shell>
  );
}

function btnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: "5px 12px",
    fontSize: 12,
    background: bg,
    color,
    border: `1.5px solid ${color}`,
    borderRadius: 999,
    fontWeight: 700,
  };
}
