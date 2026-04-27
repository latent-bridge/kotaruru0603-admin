"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { PALETTE, RADIUS } from "@/lib/design";
import { fetchStampSummary, type StampSummary } from "@/lib/api";

export default function StampsPage() {
  const [data, setData] = useState<StampSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStampSummary()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Shell>
      <h1 style={{ fontSize: 24, margin: 0, color: PALETTE.ink }}>スタンプ</h1>
      <p style={{ margin: "4px 0 16px", fontSize: 12, color: PALETTE.inkDim }}>
        ファンの参加状況・連続獲得・人気度
      </p>

      {error && (
        <div style={{
          padding: 12,
          background: "#fbe0e4",
          border: "1.5px solid #c25470",
          color: "#9a3a52",
          borderRadius: RADIUS.md,
          marginBottom: 16,
          fontSize: 13,
        }}>{error}</div>
      )}

      {loading || !data ? (
        <p style={{ color: PALETTE.inkDim }}>読み込み中…</p>
      ) : (
        <>
          <Summary data={data} />
          <Section title="DAU 過去 30 日" sub={`${data.today} まで`}>
            <DauChart dau={data.dau} />
          </Section>
          <Section title={`上位ファン ${data.top.length} 名`}>
            <TopTable top={data.top} cardSize={data.card_size} />
          </Section>
          <Section title="完成カード分布">
            <Histogram histogram={data.histogram} totalUsers={data.stamp_users} />
          </Section>
        </>
      )}
    </Shell>
  );
}

function Summary({ data }: { data: StampSummary }) {
  return (
    <div className="stamps-summary">
      <Card label="参加者" value={data.stamp_users} hint={`登録 ${data.registered_users} 名のうち`} />
      <Card label="今日アクティブ" value={data.active_today} hint={`7 日以内 ${data.active_7d} 名`} accent />
      <Card label="累計スタンプ" value={data.total_stamps} hint={`1 枚 = ${data.card_size} 個`} />
      <Card label="完成カード" value={data.completed_cards} hint="累計" />
    </div>
  );
}

function Card({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div style={{
      flex: "1 1 160px",
      background: PALETTE.paper,
      border: `1.5px solid ${accent ? PALETTE.coral : PALETTE.inkSoft}`,
      borderRadius: RADIUS.md,
      padding: 16,
    }}>
      <div style={{ fontSize: 11, color: PALETTE.inkDim, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ? PALETTE.accent : PALETTE.ink, lineHeight: 1 }}>
        {value.toLocaleString()}
      </div>
      {hint && <div style={{ fontSize: 11, color: PALETTE.inkDim, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 14, margin: "0 0 8px", color: PALETTE.ink, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span>{title}</span>
        {sub && <span style={{ fontSize: 11, color: PALETTE.inkDim, fontWeight: 400 }}>{sub}</span>}
      </h2>
      {children}
    </section>
  );
}

function DauChart({ dau }: { dau: StampSummary["dau"] }) {
  const max = useMemo(() => Math.max(1, ...dau.map((d) => d.users)), [dau]);
  return (
    <div style={{
      background: PALETTE.paper,
      border: `1.5px solid ${PALETTE.inkSoft}`,
      borderRadius: RADIUS.md,
      padding: 16,
    }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
        {dau.map((d) => {
          const h = Math.round((d.users / max) * 100);
          // Highlight today (last bucket) in coral, others in muted ink.
          const isLast = d === dau[dau.length - 1];
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.users} 名`}
              style={{
                flex: 1,
                height: `${h}%`,
                minHeight: d.users > 0 ? 2 : 1,
                background: isLast ? PALETTE.coral : PALETTE.inkSoft,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: PALETTE.inkDim }}>
        <span>{dau[0]?.date}</span>
        <span>最大 {max} 名 / 今日 {dau[dau.length - 1]?.users ?? 0} 名</span>
        <span>{dau[dau.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function TopTable({ top, cardSize }: { top: StampSummary["top"]; cardSize: number }) {
  if (top.length === 0) {
    return <p style={{ color: PALETTE.inkDim, fontSize: 13 }}>(まだ参加者がいません)</p>;
  }
  return (
    <div style={{
      background: PALETTE.paper,
      border: `1.5px solid ${PALETTE.inkSoft}`,
      borderRadius: RADIUS.md,
      overflowX: "auto",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: PALETTE.bg, color: PALETTE.inkDim }}>
            <th style={th}>#</th>
            <th style={{ ...th, textAlign: "left" }}>ファン</th>
            <th style={th}>累計</th>
            <th style={th}>完成</th>
            <th style={th}>連続</th>
            <th style={th}>最長</th>
            <th style={th}>最終</th>
          </tr>
        </thead>
        <tbody>
          {top.map((t, i) => {
            const remainder = t.total_stamps % cardSize;
            return (
              <tr key={t.user_id} style={{ borderTop: `1px solid ${PALETTE.inkSoft}` }}>
                <td style={td}>{i + 1}</td>
                <td style={{ ...td, textAlign: "left" }}>
                  <span style={{ fontWeight: 700, color: PALETTE.ink }}>
                    {t.display_name || "(未設定)"}
                  </span>
                  <span style={{ marginLeft: 4, fontFamily: "ui-monospace, monospace", fontSize: 10, color: PALETTE.inkDim }}>
                    #{t.tag}
                  </span>
                  {t.claimed_today && (
                    <span style={{
                      marginLeft: 6,
                      padding: "1px 6px",
                      background: PALETTE.coral,
                      color: "#fff",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                    }}>今日</span>
                  )}
                </td>
                <td style={td}>{t.total_stamps}</td>
                <td style={td}>{t.completed_cards}枚 +{remainder}</td>
                <td style={{ ...td, color: t.current_streak > 0 ? PALETTE.accent : PALETTE.inkDim, fontWeight: 700 }}>
                  {t.current_streak} 日
                </td>
                <td style={td}>{t.longest_streak} 日</td>
                <td style={{ ...td, fontSize: 11, color: PALETTE.inkDim }}>{t.last_stamp_date ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  fontWeight: 600,
  textAlign: "right",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "right",
  color: PALETTE.ink,
  whiteSpace: "nowrap",
};

function Histogram({ histogram, totalUsers }: { histogram: StampSummary["histogram"]; totalUsers: number }) {
  const max = useMemo(() => Math.max(1, ...histogram.map((h) => h.count)), [histogram]);
  return (
    <div style={{
      background: PALETTE.paper,
      border: `1.5px solid ${PALETTE.inkSoft}`,
      borderRadius: RADIUS.md,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {histogram.map((h) => {
        const pct = totalUsers > 0 ? Math.round((h.count / totalUsers) * 100) : 0;
        const w = Math.round((h.count / max) * 100);
        return (
          <div key={h.label} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px", gap: 8, alignItems: "center", fontSize: 12 }}>
            <span style={{ color: PALETTE.inkDim }}>{h.label}</span>
            <div style={{ background: PALETTE.bg, borderRadius: 4, height: 14, overflow: "hidden" }}>
              <div style={{ width: `${w}%`, height: "100%", background: PALETTE.coral }} />
            </div>
            <span style={{ color: PALETTE.ink, fontWeight: 600, fontSize: 11 }}>
              {h.count} 名 ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
