"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { CATEGORY_COLOR, CATEGORY_OPTIONS, PALETTE, RADIUS, type Category } from "@/lib/design";
import { getSchedule, putSchedule, type ScheduleEntry } from "@/lib/api";

// 14 days today through today+13. Bumping this constant is the only change
// needed to extend the admin to a monthly view; the backend already accepts
// any range up to 90 days.
const RANGE_DAYS = 14;

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
    category: null,
    emoji: "",
    note: "",
  };
}

function entryHasContent(e: ScheduleEntry): boolean {
  return !!(e.title?.trim() || e.time?.trim() || e.note?.trim() || e.category || e.emoji?.trim());
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
        if (iso === todayIso) label = "きょう";
        else if (iso === tomorrowIso) label = "あした";
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
          category: d.entry.category,
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

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, color: PALETTE.ink }}>すけじゅーる</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: PALETTE.inkDim }}>
            きょうから {RANGE_DAYS} にちぶん
          </p>
        </div>
        <button onClick={save} disabled={saving || loading} style={primaryBtn(saving)}>
          {saving ? "保存中…" : "ほぞんして公開"}
        </button>
      </div>

      {message && (
        <div style={messageBox(message.kind)}>{message.text}</div>
      )}

      {loading ? (
        <p style={{ color: PALETTE.inkDim }}>読み込み中…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {days.map((d, idx) => (
            <DayCard
              key={d.date}
              dayState={d}
              onChange={(k, v) => update(idx, k, v)}
              onClear={() => clear(idx)}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

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
  const cat = (entry.category as Category | null) ?? null;
  const catStyle = cat ? CATEGORY_COLOR[cat] : null;

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
          {label === "きょう" || label === "あした" ? label : monthDay}
        </div>
        <div style={{ fontSize: 12, color: wkColor, marginTop: 2, fontWeight: 600 }}>
          {WEEKDAY_JP[weekday]}よう
        </div>
        {label !== "きょう" && label !== "あした" && (
          <div style={{ fontSize: 10, color: PALETTE.inkDim, marginTop: 2 }}>{monthDay}</div>
        )}
      </div>

      <div className="sc-main">
        <input
          placeholder="タイトル (例: ポンコツダイバー #22)"
          value={entry.title ?? ""}
          onChange={(e) => onChange("title", e.target.value)}
        />
        <textarea
          placeholder="ノート (例: アリンお姉様とコラボ)"
          value={entry.note ?? ""}
          onChange={(e) => onChange("note", e.target.value)}
          rows={2}
          style={{ resize: "vertical" }}
        />
      </div>

      <div className="sc-aux">
        <input
          placeholder="じこく (例: よる 21:00 〜)"
          value={entry.time ?? ""}
          onChange={(e) => onChange("time", e.target.value)}
        />
        {catStyle && (
          <span style={{
            alignSelf: "flex-start",
            padding: "3px 10px",
            background: catStyle.bg,
            color: catStyle.color,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}>{cat}</span>
        )}
      </div>

      <select
        className="sc-cat"
        value={entry.category ?? ""}
        onChange={(e) => onChange("category", e.target.value || null)}
      >
        <option value="">カテゴリを選ぶ</option>
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <input
        className="sc-emoji"
        placeholder="絵文字"
        maxLength={4}
        value={entry.emoji ?? ""}
        onChange={(e) => onChange("emoji", e.target.value)}
        style={{ textAlign: "center", fontSize: 20 }}
      />

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
        }}
        disabled={!hasContent}
      >×</button>
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
