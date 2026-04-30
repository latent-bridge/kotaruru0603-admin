"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { PALETTE, PRESET_TAGS, RADIUS, tagColor } from "@/lib/design";
import { IconPicker } from "@/components/IconPicker";
import { getSchedule, putSchedule, type ScheduleEntry } from "@/lib/api";

// 14 days today through today+13, split into 2 tabs of 7 days each. Adding
// "再来週" later is just adding another tab entry below; the backend already
// accepts any range up to 90 days.
const TAB_DAYS = 7;
const TABS = [
  { key: "this", label: "今週", offset: 0, sub: "今日から1週間" },
  { key: "next", label: "翌週", offset: TAB_DAYS, sub: "1週間後から" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const RANGE_DAYS = TABS.length * TAB_DAYS;

const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

function jstYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

type DayState = {
  date: string;
  weekday: number; // 0=Sun..6=Sat in JST
  monthDay: string; // "4/28"
  label: string; // 今日 / 明日 / 4/29 etc.
  entry: ScheduleEntry;
  // Empty entries (no fields filled) aren't sent to the API — they remain
  // "no plan" and the public site renders 「未定」.
  hasContent: boolean;
};

function buildEmptyEntry(date: string): ScheduleEntry {
  return {
    date,
    title: "",
    time: "",
    tags: [],
    emoji: "",
    note: "",
  };
}

function entryHasContent(e: ScheduleEntry): boolean {
  return !!(
    e.title?.trim() ||
    e.time?.trim() ||
    e.note?.trim() ||
    e.tags.length > 0 ||
    e.emoji?.trim()
  );
}

function buildRange(today: Date): { start: string; end: string; days: string[] } {
  const todayIso = jstYmd(today);
  const baseMs = Date.parse(todayIso + "T00:00:00Z");
  const days: string[] = [];
  for (let i = 0; i < RANGE_DAYS; i += 1) {
    const d = new Date(baseMs + i * 86400_000);
    days.push(d.toISOString().slice(0, 10));
  }
  return { start: days[0]!, end: days[days.length - 1]!, days };
}

export default function SchedulePage() {
  const today = useMemo(() => new Date(), []);
  const range = useMemo(() => buildRange(today), [today]);
  const [days, setDays] = useState<DayState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("this");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSchedule(RANGE_DAYS);
      const byDate = new Map(res.entries.map((e) => [e.date, e]));
      const todayIso = range.start;
      const tomorrowIso = range.days[1];
      const next: DayState[] = range.days.map((iso) => {
        const date = new Date(iso + "T00:00:00Z");
        const weekday = date.getUTCDay();
        const m = Number.parseInt(iso.slice(5, 7), 10);
        const d = Number.parseInt(iso.slice(8, 10), 10);
        const monthDay = `${m}/${d}`;
        let label: string;
        if (iso === todayIso) label = "今日";
        else if (iso === tomorrowIso) label = "明日";
        else label = monthDay;
        const stored = byDate.get(iso);
        const entry: ScheduleEntry = stored ?? buildEmptyEntry(iso);
        return {
          date: iso,
          weekday,
          monthDay,
          label,
          entry,
          hasContent: entryHasContent(entry),
        };
      });
      setDays(next);
    } catch (err) {
      setMessage({ kind: "err", text: `読み込み失敗: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const update = <K extends keyof ScheduleEntry>(idx: number, key: K, value: ScheduleEntry[K]) => {
    setDays((prev) => {
      const next = [...prev];
      const entry = { ...next[idx]!.entry, [key]: value };
      next[idx] = { ...next[idx]!, entry, hasContent: entryHasContent(entry) };
      return next;
    });
  };

  const clear = (idx: number) => {
    setDays((prev) => {
      const next = [...prev];
      const entry = buildEmptyEntry(next[idx]!.date);
      next[idx] = { ...next[idx]!, entry, hasContent: false };
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Only send dates that actually have content. Empty days disappear from
      // the DB (and from the public site as 未定 placeholders).
      const entries = days
        .filter((d) => d.hasContent)
        .map((d) => ({
          date: d.entry.date,
          title: d.entry.title?.trim() || null,
          time: d.entry.time?.trim() || null,
          tags: d.entry.tags,
          emoji: d.entry.emoji?.trim() || null,
          note: d.entry.note?.trim() || null,
        }));
      const result = await putSchedule(range.start, range.end, entries);
      setMessage({
        kind: "ok",
        text: result.dispatch.dispatched
          ? `保存しました (${result.count} 件)。サイトへの反映 (~2分) を開始しました。`
          : `保存しました (${result.count} 件)。サイト再ビルドのトリガーに失敗: ${result.dispatch.reason ?? "unknown"} — GitHub Actions の workflow_dispatch から手動実行してください。`,
      });
    } catch (err) {
      setMessage({ kind: "err", text: `保存失敗: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  // Per-tab content count (number of days with at least one filled field) so
  // ruru can see at a glance which week needs attention.
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { this: 0, next: 0 };
    TABS.forEach((t) => {
      counts[t.key] = days
        .slice(t.offset, t.offset + TAB_DAYS)
        .filter((d) => d.hasContent).length;
    });
    return counts;
  }, [days]);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const visibleDays = days.slice(activeTab.offset, activeTab.offset + TAB_DAYS);
  const visibleStartIdx = activeTab.offset;

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, color: PALETTE.ink }}>スケジュール</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: PALETTE.inkDim }}>
            今日から {RANGE_DAYS} 日間の予定を編集できます
          </p>
        </div>
        <button onClick={save} disabled={saving || loading} style={primaryBtn(saving)}>
          {saving ? "保存中…" : "保存して公開"}
        </button>
      </div>

      <div role="tablist" style={tabBarStyle}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={tabButtonStyle(active)}
            >
              <span style={{ fontWeight: 700 }}>{t.label}</span>
              {tabCounts[t.key] > 0 && (
                <span style={tabBadge(active)}>{tabCounts[t.key]}</span>
              )}
              <span style={tabSubLabel}>{t.sub}</span>
            </button>
          );
        })}
      </div>

      {message && (
        <div style={messageBox(message.kind)}>{message.text}</div>
      )}

      {loading ? (
        <p style={{ color: PALETTE.inkDim }}>読み込み中…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {visibleDays.map((d, i) => (
            <DayCard
              key={d.date}
              dayState={d}
              onChange={(k, v) => update(visibleStartIdx + i, k, v)}
              onClear={() => clear(visibleStartIdx + i)}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 4,
  flexWrap: "wrap",
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: "1 1 180px",
    padding: "10px 16px",
    background: active ? PALETTE.paper : "transparent",
    color: active ? PALETTE.ink : PALETTE.inkDim,
    border: `1.5px solid ${active ? PALETTE.coral : PALETTE.inkSoft}`,
    borderRadius: RADIUS.md,
    display: "flex",
    alignItems: "center",
    gap: 8,
    textAlign: "left",
    fontSize: 14,
  };
}

function tabBadge(active: boolean): React.CSSProperties {
  return {
    padding: "1px 8px",
    background: active ? PALETTE.coral : PALETTE.inkSoft,
    color: active ? "#fff" : PALETTE.inkDim,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  };
}

const tabSubLabel: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 11,
  color: PALETTE.inkDim,
  fontWeight: 400,
};

function DayCard({
  dayState,
  onChange,
  onClear,
}: {
  dayState: DayState;
  onChange: <K extends keyof ScheduleEntry>(key: K, value: ScheduleEntry[K]) => void;
  onClear: () => void;
}) {
  const { entry, weekday, label, monthDay, hasContent } = dayState;
  const wkColor = weekday === 0 ? "#c25470" : weekday === 6 ? "#5a7ab4" : PALETTE.inkDim;

  const toggleTag = (tag: string) => {
    const has = entry.tags.includes(tag);
    onChange("tags", has ? entry.tags.filter((t) => t !== tag) : [...entry.tags, tag]);
  };

  return (
    <div
      className="schedule-card"
      style={{
        background: PALETTE.paper,
        border: `1.5px solid ${hasContent ? PALETTE.coral : PALETTE.inkSoft}`,
        borderRadius: RADIUS.lg,
        padding: 16,
      }}
    >
      <div className="sc-date">
        <div style={{ fontSize: 22, fontWeight: 700, color: PALETTE.ink }}>
          {label === "今日" || label === "明日" ? label : monthDay}
        </div>
        <div style={{ fontSize: 12, color: wkColor, marginTop: 2, fontWeight: 600 }}>
          {WEEKDAY_JP[weekday]}曜日
        </div>
        {label !== "今日" && label !== "明日" && (
          <div style={{ fontSize: 10, color: PALETTE.inkDim, marginTop: 2 }}>{monthDay}</div>
        )}
      </div>

      <div className="sc-content">
        <div className="sc-row">
          <input
            placeholder="タイトル (例: ポンコツダイバー #22)"
            value={entry.title ?? ""}
            onChange={(e) => onChange("title", e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          />
          <input
            placeholder="時刻 (例: 21:00 〜)"
            value={entry.time ?? ""}
            onChange={(e) => onChange("time", e.target.value)}
            style={{ width: 160 }}
          />
        </div>
        <textarea
          placeholder="ノート (例: アリンお姉様とコラボ)"
          value={entry.note ?? ""}
          onChange={(e) => onChange("note", e.target.value)}
          rows={2}
          style={{ resize: "vertical" }}
        />

        <TagPicker tags={entry.tags} onToggle={toggleTag}
          onAdd={(t) => !entry.tags.includes(t) && onChange("tags", [...entry.tags, t])} />

        <IconPicker value={entry.emoji ?? ""} onChange={(v) => onChange("emoji", v)} />
      </div>

      <button
        className="sc-clear"
        onClick={onClear}
        title="この日をクリア"
        style={{
          background: "transparent",
          border: "none",
          color: PALETTE.inkDim,
          fontSize: 22,
          cursor: hasContent ? "pointer" : "default",
          opacity: hasContent ? 1 : 0.25,
          padding: "0 4px",
          alignSelf: "start",
        }}
        disabled={!hasContent}
      >×</button>
    </div>
  );
}

function TagPicker({
  tags,
  onToggle,
  onAdd,
}: {
  tags: string[];
  onToggle: (tag: string) => void;
  onAdd: (tag: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const submit = () => {
    const t = custom.trim();
    if (t) onAdd(t);
    setCustom("");
  };
  // Tags currently selected but NOT in the preset list — render alongside
  // presets so the user can toggle them off without retyping.
  const customSelected = tags.filter((t) => !PRESET_TAGS.includes(t as never));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PRESET_TAGS.map((t) => {
          const on = tags.includes(t);
          const c = tagColor(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                background: on ? c.bg : "transparent",
                color: on ? c.color : PALETTE.inkDim,
                border: `1.5px solid ${on ? c.color : PALETTE.inkSoft}`,
                borderRadius: 999,
              }}
            >#{t}</button>
          );
        })}
        {customSelected.map((t) => {
          const c = tagColor(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                background: c.bg,
                color: c.color,
                border: `1.5px solid ${c.color}`,
                borderRadius: 999,
              }}
            >#{t} ×</button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          placeholder="自由タグを追加 (例: メンバー)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={30}
          style={{ flex: 1, fontSize: 12, padding: "4px 10px" }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!custom.trim() || tags.length >= 5}
          style={{
            padding: "4px 12px",
            fontSize: 12,
            background: PALETTE.paper,
            border: `1.5px solid ${PALETTE.inkBorder}`,
            borderRadius: 999,
            color: PALETTE.ink,
          }}
        >追加</button>
      </div>
    </div>
  );
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: "12px 22px",
    background: busy ? PALETTE.inkDim : PALETTE.accent,
    color: "#fff",
    border: "none",
    borderRadius: RADIUS.md,
    fontWeight: 700,
    fontSize: 14,
  };
}

function messageBox(kind: "ok" | "err"): React.CSSProperties {
  const isErr = kind === "err";
  return {
    marginTop: 12,
    padding: 12,
    background: isErr ? "#fbe0e4" : "#d6e6d8",
    border: `1.5px solid ${isErr ? "#c25470" : "#5a8870"}`,
    color: isErr ? "#9a3a52" : "#3a5a4a",
    borderRadius: RADIUS.md,
    fontSize: 13,
  };
}
