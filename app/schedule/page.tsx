"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import {
  ALLOWED_CATEGORIES,
  getSchedule,
  putSchedule,
  type ScheduleEntry,
} from "@/lib/api";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_JP: Record<string, string> = {
  mon: "げつ", tue: "か", wed: "すい", thu: "もく",
  fri: "きん", sat: "ど", sun: "にち",
};

function emptyEntry(day: string): ScheduleEntry {
  return {
    day,
    weekday: DAY_JP[day] ?? null,
    date_label: null,
    title: null,
    time: null,
    category: null,
    emoji: null,
    note: null,
  };
}

export default function SchedulePage() {
  const [entries, setEntries] = useState<ScheduleEntry[]>(
    DAYS.map((d) => emptyEntry(d)),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { entries: rows } = await getSchedule();
      const byDay = new Map(rows.map((r) => [r.day, r]));
      setEntries(DAYS.map((d) => byDay.get(d) ?? emptyEntry(d)));
    } catch (err) {
      setMessage(`読み込み失敗: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = <K extends keyof ScheduleEntry>(
    idx: number,
    key: K,
    value: ScheduleEntry[K],
  ) => {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await putSchedule(entries);
      setMessage(
        result.dispatch.dispatched
          ? "保存しました。サイトへの反映 (~2分) を開始しました。"
          : `保存しました。ただしサイト再ビルドのトリガーに失敗: ${result.dispatch.reason ?? "unknown"}`,
      );
    } catch (err) {
      setMessage(`保存失敗: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>週次スケジュール</h1>
        <button
          onClick={save}
          disabled={saving || loading}
          style={{
            padding: "10px 18px",
            background: saving ? "#999" : "#0066cc",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {saving ? "保存中…" : "保存して公開"}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: 12,
            background: message.includes("失敗") ? "#fff0f0" : "#f0f9ff",
            border: `1px solid ${message.includes("失敗") ? "#ffcccc" : "#cce5ff"}`,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      {loading ? (
        <p>読み込み中…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((e, idx) => (
            <div
              key={e.day}
              style={{
                background: "#fff",
                border: "1px solid #e5e5e7",
                borderRadius: 10,
                padding: 16,
                display: "grid",
                gridTemplateColumns: "60px 1fr 1fr 140px 80px",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {e.day.toUpperCase()}
                <div style={{ fontSize: 11, color: "#666" }}>
                  {DAY_JP[e.day] ?? ""}曜
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  placeholder="タイトル"
                  value={e.title ?? ""}
                  onChange={(ev) => updateField(idx, "title", ev.target.value)}
                />
                <textarea
                  placeholder="ノート"
                  value={e.note ?? ""}
                  onChange={(ev) => updateField(idx, "note", ev.target.value)}
                  rows={2}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  placeholder="日付ラベル (例: 4.21)"
                  value={e.date_label ?? ""}
                  onChange={(ev) => updateField(idx, "date_label", ev.target.value)}
                />
                <input
                  placeholder="時刻 (例: よる 21:00 〜)"
                  value={e.time ?? ""}
                  onChange={(ev) => updateField(idx, "time", ev.target.value)}
                />
              </div>

              <select
                value={e.category ?? ""}
                onChange={(ev) =>
                  updateField(idx, "category", ev.target.value || null)
                }
              >
                <option value="">(カテゴリ未設定)</option>
                {ALLOWED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input
                placeholder="絵文字"
                maxLength={4}
                value={e.emoji ?? ""}
                onChange={(ev) => updateField(idx, "emoji", ev.target.value)}
                style={{ textAlign: "center", fontSize: 18 }}
              />
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
