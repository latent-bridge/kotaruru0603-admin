"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import {
  forceOffline,
  getLiveState,
  type LiveState,
  startLive,
  stopLive,
} from "@/lib/api";

const POLL_STATE_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "ポーリング中", color: "#22aa55" },
  stopped_ended: { label: "正常終了 (検知)", color: "#888" },
  stopped_manual: { label: "手動停止", color: "#888" },
  stopped_timeout: { label: "ポーリング上限到達 (12h超)", color: "#cc6600" },
  stopped_errors: { label: "ポーリング停止 (連続エラー)", color: "#cc0000" },
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

  return (
    <Shell>
      <h1 style={{ fontSize: 22, margin: "0 0 16px" }}>ライブ配信</h1>

      {message && (
        <div
          style={{
            padding: 12,
            background: message.includes("失敗") || message.includes("エラー") ? "#fff0f0" : "#f0f9ff",
            border: `1px solid ${message.includes("失敗") || message.includes("エラー") ? "#ffcccc" : "#cce5ff"}`,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e5e7",
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: isLive ? "#cc0000" : "#999",
              boxShadow: isLive ? "0 0 0 4px #cc000020" : undefined,
            }}
          />
          <strong style={{ fontSize: 18 }}>
            {isLive ? "LIVE NOW" : "OFFLINE"}
          </strong>
          {state?.video_id && (
            <a
              href={`https://www.youtube.com/watch?v=${state.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, marginLeft: 8 }}
            >
              {state.video_id} ↗
            </a>
          )}
        </div>

        <dl style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "8px 16px", margin: 0, fontSize: 13 }}>
          <dt style={{ color: "#666" }}>開始時刻</dt>
          <dd style={{ margin: 0 }}>
            {state?.started_at ? new Date(state.started_at).toLocaleString("ja-JP") : "—"}
            {state?.started_at && isLive && (
              <span style={{ marginLeft: 8, color: "#666" }}>
                (経過 {formatDuration(Date.now() - state.started_at)})
              </span>
            )}
          </dd>
          <dt style={{ color: "#666" }}>終了時刻</dt>
          <dd style={{ margin: 0 }}>
            {state?.ended_at ? new Date(state.ended_at).toLocaleString("ja-JP") : "—"}
            {state?.end_reason && (
              <span style={{ marginLeft: 8, color: "#666" }}>(理由: {state.end_reason})</span>
            )}
          </dd>
          <dt style={{ color: "#666" }}>ポーリング</dt>
          <dd style={{ margin: 0 }}>
            {pollMeta ? (
              <span style={{ color: pollMeta.color }}>{pollMeta.label}</span>
            ) : (
              "—"
            )}
            {state?.last_polled_at && (
              <span style={{ marginLeft: 8, color: "#666" }}>
                最終 {formatRelative(state.last_polled_at)}
              </span>
            )}
          </dd>
        </dl>
      </div>

      {!isLive ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e7",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>配信を開始</h2>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
            YouTube Studio で配信を開始してから [ライブ配信開始] を押してください。動画 ID は YouTube API から自動取得します。
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              placeholder="(任意) 動画 ID を手動指定"
              value={manualVideoId}
              onChange={(e) => setManualVideoId(e.target.value)}
              style={{ flex: 1, fontFamily: "ui-monospace, monospace" }}
            />
          </div>
          <button
            onClick={onStart}
            disabled={busy !== null}
            style={{
              padding: "12px 24px",
              background: busy === "start" ? "#999" : "#cc0000",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {busy === "start" ? "起動中…" : "🔴 ライブ配信開始"}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e5e7",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>配信中の操作</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onStop}
              disabled={busy !== null}
              style={{
                padding: "10px 20px",
                background: "#fff",
                color: "#1d1d1f",
                border: "1px solid #d2d2d7",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              {busy === "stop" ? "終了処理中…" : "終了"}
            </button>
            <button
              onClick={onForceOffline}
              disabled={busy !== null}
              style={{
                padding: "10px 20px",
                background: "#fff",
                color: "#cc0000",
                border: "1px solid #cc0000",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              {busy === "force" ? "実行中…" : "強制 OFFLINE"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#666", marginTop: 12, marginBottom: 0 }}>
            通常は [終了] を使ってください。配信終了は YouTube が `actualEndTime` を返した時点で自動で OFFLINE になります (最大 2 分遅延)。
          </p>
        </div>
      )}
    </Shell>
  );
}
