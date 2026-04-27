"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { PALETTE, RADIUS } from "@/lib/design";
import {
  forceOffline,
  getLiveState,
  type LiveState,
  startLive,
  stopLive,
} from "@/lib/api";

const POLL_STATE_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "見守り中", color: "#5a8870" },
  stopped_ended: { label: "正常終了", color: PALETTE.inkDim },
  stopped_manual: { label: "手動停止", color: PALETTE.inkDim },
  stopped_timeout: { label: "見守り上限 (12h超)", color: "#c26a50" },
  stopped_errors: { label: "エラー連続で停止", color: "#9a3a52" },
};

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}m`;
}

function formatRelative(ts: number | null | undefined) {
  if (!ts) return "—";
  const ago = Date.now() - ts;
  if (ago < 60_000) return `${Math.floor(ago / 1000)}秒前`;
  if (ago < 3600_000) return `${Math.floor(ago / 60_000)}分前`;
  return `${Math.floor(ago / 3600_000)}時間前`;
}

export default function LivePage() {
  const [state, setState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [manualVideoId, setManualVideoId] = useState("");

  const refresh = useCallback(async () => {
    try {
      const s = await getLiveState();
      setState(s);
    } catch (err) {
      setMessage(`状態取得失敗: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const onStart = async () => {
    setBusy("start");
    setMessage(null);
    try {
      const r = await startLive(manualVideoId.trim() || undefined);
      setMessage(`配信開始 (videoId: ${r.video_id})`);
      setManualVideoId("");
      await refresh();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("404") && msg.includes("no_active_live")) {
        setMessage("YouTube でライブ配信が見つかりません。配信開始後にもう一度押してください。");
      } else if (msg.includes("502") && msg.includes("youtube_search_failed")) {
        setMessage("YouTube API エラー。手動で動画 ID を入力して再試行してください。");
      } else {
        setMessage(`開始失敗: ${msg}`);
      }
    } finally {
      setBusy(null);
    }
  };

  const onStop = async () => {
    if (!confirm("ライブ配信を終了状態にします。よろしいですか？")) return;
    setBusy("stop");
    setMessage(null);
    try {
      await stopLive();
      setMessage("配信を終了しました。");
      await refresh();
    } catch (err) {
      setMessage(`終了失敗: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const onForceOffline = async () => {
    if (!confirm("強制 OFFLINE にします (ポーリングが暴走している場合の最終手段)")) return;
    setBusy("force");
    setMessage(null);
    try {
      await forceOffline();
      setMessage("強制 OFFLINE に切り替えました。");
      await refresh();
    } catch (err) {
      setMessage(`失敗: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <Shell>
        <p>読み込み中…</p>
      </Shell>
    );
  }

  const isLive = state?.status === "live";
  const pollMeta = state?.poll_state ? POLL_STATE_LABEL[state.poll_state] : null;

  const isErr = message?.includes("失敗") || message?.includes("エラー") || message?.includes("見つかり");

  return (
    <Shell>
      <h1 style={{ fontSize: 24, margin: "0 0 4px", color: PALETTE.ink }}>らいぶ配信</h1>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: PALETTE.inkDim }}>
        YouTube の配信を サイトの「LIVE NOW」へ切り替え
      </p>

      {message && (
        <div style={{
          padding: 12,
          background: isErr ? "#fbe0e4" : "#d6e6d8",
          border: `1.5px solid ${isErr ? "#c25470" : "#5a8870"}`,
          color: isErr ? "#9a3a52" : "#3a5a4a",
          borderRadius: RADIUS.md,
          marginBottom: 16,
          fontSize: 13,
        }}>{message}</div>
      )}

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: isLive ? "#c25470" : PALETTE.inkSoft,
            boxShadow: isLive ? "0 0 0 5px rgba(194,84,112,0.18)" : undefined,
          }} />
          <strong style={{ fontSize: 18, color: PALETTE.ink }}>
            {isLive ? "LIVE NOW" : "OFFLINE"}
          </strong>
          {state?.video_id && (
            <a href={`https://www.youtube.com/watch?v=${state.video_id}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, marginLeft: 8 }}>{state.video_id} ↗</a>
          )}
        </div>

        <dl className="live-meta" style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "10px 16px", margin: 0, fontSize: 13 }}>
          <dt style={{ color: PALETTE.inkDim }}>開始</dt>
          <dd style={{ margin: 0, color: PALETTE.ink }}>
            {state?.started_at ? new Date(state.started_at).toLocaleString("ja-JP") : "—"}
            {state?.started_at && isLive && (
              <span style={{ marginLeft: 8, color: PALETTE.inkDim }}>
                (経過 {formatDuration(Date.now() - state.started_at)})
              </span>
            )}
          </dd>
          <dt style={{ color: PALETTE.inkDim }}>終了</dt>
          <dd style={{ margin: 0, color: PALETTE.ink }}>
            {state?.ended_at ? new Date(state.ended_at).toLocaleString("ja-JP") : "—"}
            {state?.end_reason && (
              <span style={{ marginLeft: 8, color: PALETTE.inkDim }}>(理由: {state.end_reason})</span>
            )}
          </dd>
          <dt style={{ color: PALETTE.inkDim }}>見守り</dt>
          <dd style={{ margin: 0 }}>
            {pollMeta ? (
              <span style={{ color: pollMeta.color, fontWeight: 600 }}>{pollMeta.label}</span>
            ) : <span style={{ color: PALETTE.inkDim }}>—</span>}
            {state?.last_polled_at && (
              <span style={{ marginLeft: 8, color: PALETTE.inkDim }}>
                最終 {formatRelative(state.last_polled_at)}
              </span>
            )}
          </dd>
        </dl>
      </div>

      {!isLive ? (
        <div style={card}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px", color: PALETTE.ink }}>配信を始める</h2>
          <p style={{ fontSize: 13, color: PALETTE.inkDim, margin: "0 0 14px" }}>
            YouTube Studio で配信を始めてから下のボタンを押してね。動画 ID は自動で取ってきます。
          </p>
          <details style={{ marginBottom: 14, fontSize: 12, color: PALETTE.inkDim }}>
            <summary style={{ cursor: "pointer" }}>動画 ID を手で指定する (上手くいかないとき)</summary>
            <input
              placeholder="例: dQw4w9WgXcQ"
              value={manualVideoId}
              onChange={(e) => setManualVideoId(e.target.value)}
              style={{ marginTop: 8, width: "100%", fontFamily: "ui-monospace, monospace" }}
            />
          </details>
          <button onClick={onStart} disabled={busy !== null} style={{
            padding: "14px 28px",
            background: busy === "start" ? PALETTE.inkDim : PALETTE.accent,
            color: "#fff",
            border: "none",
            borderRadius: RADIUS.md,
            fontWeight: 700,
            fontSize: 15,
          }}>
            {busy === "start" ? "起動中…" : "🔴 ライブ配信を始める"}
          </button>
        </div>
      ) : (
        <div style={card}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px", color: PALETTE.ink }}>配信中の操作</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onStop} disabled={busy !== null} style={{
              padding: "12px 22px",
              background: PALETTE.paper,
              color: PALETTE.ink,
              border: `1.5px solid ${PALETTE.inkBorder}`,
              borderRadius: RADIUS.md,
              fontWeight: 700,
            }}>
              {busy === "stop" ? "終了中…" : "終了する"}
            </button>
            <button onClick={onForceOffline} disabled={busy !== null} style={{
              padding: "12px 22px",
              background: PALETTE.paper,
              color: "#9a3a52",
              border: `1.5px solid #c25470`,
              borderRadius: RADIUS.md,
              fontWeight: 700,
            }}>
              {busy === "force" ? "実行中…" : "強制 OFFLINE"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: PALETTE.inkDim, marginTop: 14, marginBottom: 0 }}>
            通常は [終了する] を押してね。YouTube が配信終了を返した時点で自動で OFFLINE になります (最大 2 分の遅延)。
          </p>
        </div>
      )}
    </Shell>
  );
}

const card: React.CSSProperties = {
  background: PALETTE.paper,
  border: `1.5px solid ${PALETTE.inkSoft}`,
  borderRadius: RADIUS.lg,
  padding: 22,
  marginBottom: 16,
};
