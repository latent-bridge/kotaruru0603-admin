"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>チャットモデレーション</h1>
        <span style={{ fontSize: 12, color: "#666" }}>
          SSE: {streamStatus === "connected" ? "🟢" : streamStatus === "error" ? "🔴" : "⏳"}
        </span>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div
        ref={messagesRef}
        style={{
          background: "#fff",
          border: "1px solid #e5e5e7",
          borderRadius: 10,
          height: 600,
          overflowY: "auto",
          padding: 8,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center", padding: 40 }}>
            (まだメッセージがありません)
          </p>
        ) : (
          messages.map((m) => {
            const action = hidden.get(m.id);
            const isHidden = action === "hide" || action === "delete";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 10px",
                  borderBottom: "1px solid #f5f5f7",
                  background: isHidden ? "#fafafa" : "transparent",
                  opacity: isHidden ? 0.55 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>
                    <strong style={{ color: "#1d1d1f" }}>{m.author}</strong>
                    {" · "}
                    {new Date(m.timestamp).toLocaleTimeString("ja-JP")}
                    {action && (
                      <span style={{ marginLeft: 6, color: action === "delete" ? "#cc0000" : "#cc6600" }}>
                        [{action === "delete" ? "削除済" : "非表示"}]
                      </span>
                    )}
                  </div>
                  <div style={{ wordBreak: "break-word" }}>{m.content}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {!isHidden && (
                    <>
                      <button
                        onClick={() => withBusy(m.id, () => hideMessage(m.id))}
                        disabled={busy.has(m.id)}
                        style={btnStyle("#cc6600")}
                      >
                        非表示
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`このメッセージを Discord からも削除します。よろしいですか？\n\n${m.content}`)) return;
                          withBusy(m.id, () => deleteMessage(m.id));
                        }}
                        disabled={busy.has(m.id)}
                        style={btnStyle("#cc0000")}
                      >
                        削除
                      </button>
                    </>
                  )}
                  {action === "hide" && (
                    <button
                      onClick={() => withBusy(m.id, () => unhideMessage(m.id))}
                      disabled={busy.has(m.id)}
                      style={btnStyle("#0066cc")}
                    >
                      非表示解除
                    </button>
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

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontSize: 12,
    background: "#fff",
    color,
    border: `1px solid ${color}`,
    borderRadius: 4,
  };
}
