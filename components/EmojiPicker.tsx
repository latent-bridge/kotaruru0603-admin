"use client";

import { useEffect, useState } from "react";
import { EMOJI_PRESETS, PALETTE, RADIUS } from "@/lib/design";
import { Emo } from "@/components/emoji";

// All choosable emoji on the public site, grouped for the modal picker.
// Same vocabulary as the fan-site's EMOJI_MAP — keep in sync if new icons
// land there. Only one variant per icon (no "☁️" alongside "☁").
const EMOJI_CATEGORIES: { label: string; items: string[] }[] = [
  { label: "はいしん / げーむ", items: ["🎮", "🕹", "🎙", "🎤", "📼", "📺", "🎧"] },
  { label: "やりとり", items: ["💬", "💌", "📌", "📷", "🔔"] },
  { label: "おうち / にちじょう", items: ["🏠", "☕", "📖", "✏", "📅", "🕐", "🔑", "🎁"] },
  { label: "たべもの", items: ["🍙", "🎂", "🍜", "🍬", "🍦"] },
  { label: "てんき / しぜん", items: ["☁", "☀", "🌙", "💤", "🌧", "🌸", "🍃", "✨", "✦"] },
  { label: "かざり", items: ["♡", "💕", "💝", "★", "☆", "👑", "🎀", "🎈"] },
  { label: "ひと / しぐさ", items: ["🤝", "🐟", "🙇", "👻"] },
  { label: "さむらい", items: ["⚔", "🏯"] },
  { label: "じょうたい", items: ["🔴", "🔍"] },
];

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: PALETTE.inkDim, minWidth: 36 }}>絵文字</span>
        <input
          placeholder="🎮"
          maxLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 80, textAlign: "center", fontSize: 20, padding: "2px 6px" }}
        />
        <span style={{ fontSize: 11, color: PALETTE.inkDim }}>または下から選択</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {EMOJI_PRESETS.map((e) => (
          <PresetButton
            key={e}
            emoji={e}
            selected={value === e}
            onClick={() => onChange(value === e ? "" : e)}
          />
        ))}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            padding: "0 10px",
            height: 34,
            background: PALETTE.paper,
            border: `1.5px dashed ${PALETTE.inkBorder}`,
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            color: PALETTE.ink,
          }}
        >
          ぜんぶから選ぶ…
        </button>
      </div>
      {modalOpen && (
        <EmojiPickerModal
          value={value}
          onPick={(e) => {
            onChange(e);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function PresetButton({
  emoji,
  selected,
  onClick,
}: {
  emoji: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={emoji}
      style={{
        width: 34,
        height: 34,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: selected ? PALETTE.coral : PALETTE.paper,
        border: `1.5px solid ${selected ? PALETTE.accent : PALETTE.inkSoft}`,
        borderRadius: 8,
        cursor: "pointer",
        padding: 0,
      }}
    >
      <Emo e={emoji} size={20} accent={selected ? "#fff" : PALETTE.ink} />
    </button>
  );
}

function EmojiPickerModal({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  // Esc closes; backdrop click closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="絵文字を選ぶ"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(58,46,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: PALETTE.paper,
          borderRadius: RADIUS.lg,
          border: `1.5px solid ${PALETTE.inkSoft}`,
          padding: 20,
          width: "100%",
          maxWidth: 560,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, margin: 0 }}>
            絵文字を選ぶ
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: `1px solid ${PALETTE.inkSoft}`,
              borderRadius: 6,
              fontSize: 11,
              color: PALETTE.inkDim,
              cursor: "pointer",
            }}
          >
            とじる
          </button>
        </div>
        {EMOJI_CATEGORIES.map((cat) => (
          <section key={cat.label} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: PALETTE.inkDim,
                letterSpacing: 1,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              {cat.label}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {cat.items.map((emoji) => {
                const selected = value === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onPick(emoji)}
                    title={emoji}
                    style={{
                      width: 38,
                      height: 38,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: selected ? PALETTE.coral : "#fff",
                      border: `1.5px solid ${
                        selected ? PALETTE.accent : PALETTE.inkSoft
                      }`,
                      borderRadius: 8,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <Emo e={emoji} size={22} accent={selected ? "#fff" : PALETTE.ink} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
