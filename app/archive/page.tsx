"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { PALETTE, RADIUS, tagColor } from "@/lib/design";
import {
  type ArchiveCuratedVideo,
  type ArchiveOverride,
  type ArchivePatch,
  type ArchiveRawVideo,
  clearArchiveOverride,
  fetchArchiveCurated,
  fetchArchiveOverrides,
  fetchArchiveRaw,
  putArchiveOverride,
  quickHide,
  quickPin,
  refreshArchiveFromYouTube,
} from "@/lib/api";

const ARCHIVE_CATEGORIES = ["ポンコツだいぶ", "ポンコツさむらい", "ゆるげーむ", "こらぼ"] as const;
const TONES = ["coral", "lilac", "mint", "cream"] as const;

type FilterKey = "all" | "pinned" | "hidden";

type Effective = {
  category: string | null;
  game: string | null;
  collabWith: string[];
  episode: number | null;
  tags: string[];
  kind: "stream" | "clip";
  hidden: boolean;
  pinned: boolean;
  tone: string | null;
  memo: string | null;
};

type ArchiveItem = {
  raw: ArchiveRawVideo;
  curated: ArchiveCuratedVideo | undefined;
  override: ArchiveOverride | undefined;
  effective: Effective;
};

const CLIP_MAX_SECONDS = 180;

function deriveKind(raw: ArchiveRawVideo, k: string | null | undefined): "stream" | "clip" {
  if (k === "stream" || k === "clip") return k;
  if (raw.durationSeconds < CLIP_MAX_SECONDS && raw.liveBroadcast === "none") return "clip";
  return "stream";
}

function buildEffective(
  raw: ArchiveRawVideo,
  curated: ArchiveCuratedVideo | undefined,
  override: ArchiveOverride | undefined,
): Effective {
  const inferred = curated?._inferred ?? {};
  return {
    category: override?.category ?? curated?.category ?? inferred.category ?? null,
    game: override?.game ?? curated?.game ?? inferred.game ?? null,
    collabWith: override?.collab_with ?? curated?.collabWith ?? inferred.collabWith ?? [],
    episode: override?.episode ?? curated?.episode ?? inferred.episode ?? null,
    tags: override?.tags ?? curated?.tags ?? inferred.tags ?? [],
    kind: deriveKind(raw, override?.kind ?? curated?.kind ?? null),
    hidden: override?.hidden ?? curated?.hidden ?? false,
    pinned: override?.pinned ?? curated?.pinned ?? false,
    tone: override?.tone ?? curated?.tone ?? null,
    memo: override?.memo ?? curated?.memo ?? null,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.floor(n / 1000)}K`;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ArchiveItem | null>(null);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [raw, curated, ovRes] = await Promise.all([
        fetchArchiveRaw(),
        fetchArchiveCurated(),
        fetchArchiveOverrides(),
      ]);
      const overrideByVid = new Map<string, ArchiveOverride>(
        ovRes.overrides.map((o) => [o.video_id, o]),
      );
      const next: ArchiveItem[] = raw.map((r) => {
        const c = curated[r.videoId];
        const o = overrideByVid.get(r.videoId);
        return { raw: r, curated: c, override: o, effective: buildEffective(r, c, o) };
      });
      setItems(next);
    } catch (e) {
      setError(`読み込み失敗: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter === "pinned" && !it.effective.pinned) return false;
      if (filter === "hidden" && !it.effective.hidden) return false;
      if (categoryFilter && it.effective.category !== categoryFilter) return false;
      if (search && !it.raw.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, categoryFilter, search]);

  const togglePin = async (item: ArchiveItem) => {
    setBusyVideoId(item.raw.videoId);
    try {
      const next = !item.effective.pinned;
      await quickPin(item.raw.videoId, next);
      await reload();
    } catch (e) {
      setError(`ピン操作失敗: ${(e as Error).message}`);
    } finally {
      setBusyVideoId(null);
    }
  };

  const toggleHide = async (item: ArchiveItem) => {
    setBusyVideoId(item.raw.videoId);
    try {
      const next = !item.effective.hidden;
      await quickHide(item.raw.videoId, next);
      await reload();
    } catch (e) {
      setError(`非表示操作失敗: ${(e as Error).message}`);
    } finally {
      setBusyVideoId(null);
    }
  };

  const refresh = async () => {
    if (!confirm("YouTube から動画一覧を再取得します。新しい配信があれば追加・既存の視聴数なども更新されます。\n(GitHub Actions で 1〜2 分かかります)")) return;
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      await refreshArchiveFromYouTube();
      setRefreshMessage("再取得を開始しました。GitHub Actions の完了 (~2分) 後にこの画面を再読込してください。");
    } catch (e) {
      setRefreshMessage(`再取得失敗: ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Shell>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, color: PALETTE.ink }}>アーカイブ</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: PALETTE.inkDim }}>
            ピン留め・非表示・カテゴリ・タグの編集 (タイトル / サムネは YouTube で管理)
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          style={{
            padding: "8px 16px",
            background: refreshing ? PALETTE.inkDim : PALETTE.paper,
            color: refreshing ? "#fff" : PALETTE.ink,
            border: `1.5px solid ${PALETTE.coral}`,
            borderRadius: RADIUS.md,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {refreshing ? "送信中…" : "🔄 YouTube から再取得"}
        </button>
      </div>

      {refreshMessage && (
        <div style={{
          padding: 10,
          background: refreshMessage.includes("失敗") ? "#fbe0e4" : "#d6e6d8",
          border: `1.5px solid ${refreshMessage.includes("失敗") ? "#c25470" : "#5a8870"}`,
          color: refreshMessage.includes("失敗") ? "#9a3a52" : "#3a5a4a",
          borderRadius: RADIUS.md,
          marginBottom: 12,
          fontSize: 12,
        }}>{refreshMessage}</div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {(["all", "pinned", "hidden"] as FilterKey[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={pillButton(filter === f)}>
            {f === "all" ? "全て" : f === "pinned" ? "📌 ピン留め" : "🙈 非表示"}
          </button>
        ))}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: "6px 10px" }}
        >
          <option value="">カテゴリで絞る</option>
          {ARCHIVE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          placeholder="タイトル検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0 }}
        />
      </div>

      {error && (
        <div style={{
          padding: 12,
          background: "#fbe0e4",
          border: "1.5px solid #c25470",
          color: "#9a3a52",
          borderRadius: RADIUS.md,
          marginBottom: 12,
          fontSize: 13,
        }}>{error}</div>
      )}

      {loading ? (
        <p style={{ color: PALETTE.inkDim }}>読み込み中…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: PALETTE.inkDim, textAlign: "center", padding: 40 }}>
          該当する動画がありません
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: PALETTE.inkDim }}>
            {filtered.length} 件 / 全 {items.length} 件
          </div>
          {filtered.map((it) => (
            <ArchiveRow
              key={it.raw.videoId}
              item={it}
              busy={busyVideoId === it.raw.videoId}
              onPin={() => togglePin(it)}
              onHide={() => toggleHide(it)}
              onEdit={() => setEditing(it)}
            />
          ))}
        </div>
      )}

      {editing && (
        <DetailModal
          key={editing.raw.videoId}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
          onError={(m) => setError(m)}
        />
      )}
    </Shell>
  );
}

function ArchiveRow({
  item,
  busy,
  onPin,
  onHide,
  onEdit,
}: {
  item: ArchiveItem;
  busy: boolean;
  onPin: () => void;
  onHide: () => void;
  onEdit: () => void;
}) {
  const { raw, effective: eff } = item;
  const thumb = raw.thumbnails.medium || raw.thumbnails.default;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr auto",
        gap: 12,
        background: PALETTE.paper,
        border: `1.5px solid ${eff.pinned ? PALETTE.coral : PALETTE.inkSoft}`,
        borderRadius: RADIUS.md,
        padding: 10,
        opacity: eff.hidden ? 0.55 : 1,
      }}
    >
      <a href={`https://www.youtube.com/watch?v=${raw.videoId}`} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" style={{ width: 100, height: 56, objectFit: "cover", borderRadius: 6 }} />
      </a>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          color: PALETTE.ink,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>{raw.title}</div>
        <div style={{ fontSize: 11, color: PALETTE.inkDim, marginTop: 2 }}>
          {formatDate(raw.publishedAt)} · {formatDuration(raw.durationSeconds)} · {formatViews(raw.viewCount)} views · {eff.kind}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {eff.category && <Chip label={eff.category} preset />}
          {eff.tags.map((t) => <Chip key={t} label={t} />)}
          {eff.collabWith.length > 0 && (
            <span style={{ fontSize: 10, color: PALETTE.inkDim, alignSelf: "center" }}>
              with {eff.collabWith.join(", ")}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
        <button onClick={onPin} disabled={busy} title={eff.pinned ? "ピン解除" : "ピン留め"} style={iconBtn(eff.pinned, "#c25470")}>
          📌
        </button>
        <button onClick={onHide} disabled={busy} title={eff.hidden ? "再表示" : "非表示"} style={iconBtn(eff.hidden, "#857670")}>
          🙈
        </button>
        <button onClick={onEdit} title="詳細編集" style={iconBtn(false, PALETTE.inkDim)}>
          ✎
        </button>
      </div>
    </div>
  );
}

function Chip({ label, preset }: { label: string; preset?: boolean }) {
  const c = tagColor(label);
  return (
    <span style={{
      padding: "1px 8px",
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.color}`,
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
    }}>{preset ? label : `#${label}`}</span>
  );
}

function iconBtn(active: boolean, activeColor: string): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    fontSize: 14,
    background: active ? `${activeColor}33` : PALETTE.paper,
    border: `1.5px solid ${active ? activeColor : PALETTE.inkSoft}`,
    borderRadius: 8,
    cursor: "pointer",
  };
}

function pillButton(active: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    background: active ? PALETTE.paper : "transparent",
    color: active ? PALETTE.ink : PALETTE.inkDim,
    border: `1.5px solid ${active ? PALETTE.coral : PALETTE.inkSoft}`,
    borderRadius: 999,
    fontWeight: active ? 700 : 500,
    fontSize: 12,
  };
}

// ─── Detail edit modal ──────────────────────────────────────────────────

function DetailModal({
  item,
  onClose,
  onSaved,
  onError,
}: {
  item: ArchiveItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  // Edit state initialized from CURRENT effective values. Saving sends only
  // explicit overrides; passing null leaves a field auto.
  const [category, setCategory] = useState<string>(item.effective.category ?? "");
  const [game, setGame] = useState<string>(item.effective.game ?? "");
  const [collabRaw, setCollabRaw] = useState<string>(item.effective.collabWith.join(", "));
  const [episode, setEpisode] = useState<string>(
    item.effective.episode == null ? "" : String(item.effective.episode),
  );
  const [tagsRaw, setTagsRaw] = useState<string>(item.effective.tags.join(", "));
  const [kind, setKind] = useState<string>(item.override?.kind ?? "");
  const [tone, setTone] = useState<string>(item.override?.tone ?? "");
  const [memo, setMemo] = useState<string>(item.effective.memo ?? "");

  const save = async () => {
    setBusy(true);
    try {
      const collab_with = collabRaw.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
      const tags = tagsRaw.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
      const ep = episode.trim();
      const patch: ArchivePatch = {
        category: category || null,
        game: game.trim() || null,
        collab_with: collab_with.length > 0 ? collab_with : null,
        episode: ep ? Number.parseInt(ep, 10) : null,
        tags: tags.length > 0 ? tags : null,
        kind: kind === "stream" || kind === "clip" ? kind : null,
        tone: ["coral", "lilac", "mint", "cream"].includes(tone) ? tone as ArchivePatch["tone"] : null,
        memo: memo.trim() || null,
        // hidden / pinned are managed via the quick toggles to avoid clobbering
        // each other when both the modal and the row are in flight; we read
        // them from item state only.
        hidden: item.override?.hidden ?? null,
        pinned: item.override?.pinned ?? null,
      };
      await putArchiveOverride(item.raw.videoId, patch);
      await onSaved();
    } catch (e) {
      onError(`保存失敗: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!confirm("このアーカイブの上書きを全てクリアし、自動推論に戻します")) return;
    setBusy(true);
    try {
      await clearArchiveOverride(item.raw.videoId);
      await onSaved();
    } catch (e) {
      onError(`クリア失敗: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const thumb = item.raw.thumbnails.medium || item.raw.thumbnails.default;
  const ytUrl = `https://www.youtube.com/watch?v=${item.raw.videoId}`;

  return (
    <div onClick={onClose} style={modalBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={modalCard}>
        <header style={{ marginBottom: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 6 }} />
          </a>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: 15,
              margin: 0,
              color: PALETTE.ink,
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}>
              {item.raw.title}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: PALETTE.inkDim }}>
              {formatDate(item.raw.publishedAt)} · {formatDuration(item.raw.durationSeconds)} · {formatViews(item.raw.viewCount)} views
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: PALETTE.inkDim, fontFamily: "ui-monospace, monospace" }}>
              {item.raw.videoId} · <a href={ytUrl} target="_blank" rel="noopener noreferrer">YouTube ↗</a>
            </p>
          </div>
        </header>

        {item.raw.description && (
          <details style={{ marginBottom: 14, fontSize: 12, color: PALETTE.inkDim }}>
            <summary style={{ cursor: "pointer", color: PALETTE.ink }}>動画説明を表示</summary>
            <div style={{
              marginTop: 8,
              padding: 10,
              background: PALETTE.bg,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflowY: "auto",
              fontSize: 12,
              color: PALETTE.ink,
            }}>{item.raw.description}</div>
          </details>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="カテゴリ" hint="未選択 = 自動推論">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%" }}>
              <option value="">(自動)</option>
              {ARCHIVE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="ゲーム" hint="未入力 = 自動推論">
            <input value={game} onChange={(e) => setGame(e.target.value)} placeholder="(自動)" style={{ width: "100%" }} />
          </Field>

          <Field label="エピソード番号">
            <input value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="(自動)" type="number" min={0} style={{ width: "100%" }} />
          </Field>

          <Field label="コラボ相手" hint="カンマ区切り">
            <input value={collabRaw} onChange={(e) => setCollabRaw(e.target.value)} placeholder="例: アリンお姉様, るるい" style={{ width: "100%" }} />
          </Field>

          <Field label="タグ" hint="カンマ区切り、自由入力">
            <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="例: 神回, 初見プレイ" style={{ width: "100%" }} />
          </Field>

          <Field label="種別">
            <div style={{ display: "flex", gap: 6 }}>
              {[["", "(自動)"], ["stream", "stream"], ["clip", "clip"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setKind(v)} style={miniPill(kind === v)}>{l}</button>
              ))}
            </div>
          </Field>

          <Field label="カード配色">
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setTone("")} style={miniPill(tone === "")}>(自動)</button>
              {TONES.map((t) => (
                <button key={t} type="button" onClick={() => setTone(t)} style={miniPill(tone === t)}>{t}</button>
              ))}
            </div>
          </Field>

          <Field label="メモ" hint="管理者のみ表示">
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} style={{ width: "100%", resize: "vertical" }} />
          </Field>
        </div>

        <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 8, flexWrap: "wrap" }}>
          <button onClick={clearAll} disabled={busy} style={{
            padding: "8px 14px",
            background: PALETTE.paper,
            color: "#9a3a52",
            border: "1.5px solid #c25470",
            borderRadius: RADIUS.md,
            fontSize: 12,
          }}>上書きを全クリア</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} disabled={busy} style={{
              padding: "8px 14px",
              background: PALETTE.paper,
              border: `1.5px solid ${PALETTE.inkBorder}`,
              borderRadius: RADIUS.md,
              color: PALETTE.ink,
              fontSize: 12,
            }}>キャンセル</button>
            <button onClick={save} disabled={busy} style={{
              padding: "8px 18px",
              background: busy ? PALETTE.inkDim : PALETTE.accent,
              color: "#fff",
              border: "none",
              borderRadius: RADIUS.md,
              fontWeight: 700,
              fontSize: 13,
            }}>{busy ? "保存中…" : "保存"}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: PALETTE.inkDim }}>
        {label}{hint && <span style={{ marginLeft: 6, opacity: 0.7 }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function miniPill(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    background: active ? PALETTE.coral : PALETTE.paper,
    color: active ? "#fff" : PALETTE.inkDim,
    border: `1.5px solid ${active ? PALETTE.coral : PALETTE.inkSoft}`,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
  };
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(58,46,42,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 100,
};

const modalCard: React.CSSProperties = {
  background: PALETTE.paper,
  borderRadius: RADIUS.lg,
  border: `1.5px solid ${PALETTE.inkSoft}`,
  padding: 20,
  width: "100%",
  maxWidth: 480,
  maxHeight: "90vh",
  overflowY: "auto",
};
