"use client";

import { useEffect, useState } from "react";
import { PALETTE, RADIUS } from "@/lib/design";
import {
  IconController,
  IconArcade,
  IconDisc,
  IconVHS,
  IconTV,
  IconMic,
  IconHeadphone,
  IconPlay,
  IconLive,
  IconTrophy,
  IconBubble,
  IconLetter,
  IconHeart,
  IconStar,
  IconBell,
  IconPin,
  IconTag,
  IconCamera,
  IconLink,
  IconShare,
  IconHouse,
  IconMug,
  IconBook,
  IconPencil,
  IconCalendar,
  IconClock,
  IconKey,
  IconGift,
  IconBag,
  IconOnigiri,
  IconCake,
  IconRamen,
  IconCandy,
  IconIcecream,
  IconCloud,
  IconSun,
  IconMoon,
  IconRain,
  IconFlower,
  IconLeaf,
  IconSparkle,
  IconCrown,
  IconRibbon,
  IconBalloon,
  IconHandshake,
  IconFish,
  IconBow,
  IconKatana,
  IconCastle,
  IconKabuto,
  IconShuriken,
  IconSensu,
  IconMon,
  IconYumi,
  IconHinawa,
  IconTaiko,
  IconNobori,
  IconTank,
  IconJet,
  IconMissile,
  IconHelmet,
  IconGasmask,
  IconGrenade,
  IconBoom,
  IconBarbed,
  IconRadio,
  IconMG,
  IconSearch,
  IconSettings,
  IconCheck,
  IconArrow,
  IconUser,
} from "@/components/icons-full";

// Icon catalogue used by the picker. Keys MUST match the fan-site ICON_MAP
// exactly — admin saves the *name* into entry.emoji, the fan-site looks it up
// by name when rendering. (See apps/sites/kotaruru0603/components/Icon.tsx.)
type IconComp = React.ComponentType<{ size?: number; accent?: string }>;

const ICONS: Record<string, IconComp> = {
  controller: IconController,
  arcade: IconArcade,
  disc: IconDisc,
  vhs: IconVHS,
  tv: IconTV,
  mic: IconMic,
  headphone: IconHeadphone,
  play: IconPlay,
  live: IconLive,
  trophy: IconTrophy,
  bubble: IconBubble,
  letter: IconLetter,
  heart: IconHeart,
  star: IconStar,
  bell: IconBell,
  pin: IconPin,
  tag: IconTag,
  camera: IconCamera,
  link: IconLink,
  share: IconShare,
  house: IconHouse,
  mug: IconMug,
  book: IconBook,
  pencil: IconPencil,
  calendar: IconCalendar,
  clock: IconClock,
  key: IconKey,
  gift: IconGift,
  bag: IconBag,
  onigiri: IconOnigiri,
  cake: IconCake,
  ramen: IconRamen,
  candy: IconCandy,
  icecream: IconIcecream,
  cloud: IconCloud,
  sun: IconSun,
  moon: IconMoon,
  rain: IconRain,
  flower: IconFlower,
  leaf: IconLeaf,
  sparkle: IconSparkle,
  crown: IconCrown,
  ribbon: IconRibbon,
  balloon: IconBalloon,
  handshake: IconHandshake,
  fish: IconFish,
  bow: IconBow,
  katana: IconKatana,
  castle: IconCastle,
  kabuto: IconKabuto,
  shuriken: IconShuriken,
  sensu: IconSensu,
  mon: IconMon,
  yumi: IconYumi,
  hinawa: IconHinawa,
  taiko: IconTaiko,
  nobori: IconNobori,
  tank: IconTank,
  jet: IconJet,
  missile: IconMissile,
  helmet: IconHelmet,
  gasmask: IconGasmask,
  grenade: IconGrenade,
  boom: IconBoom,
  barbed: IconBarbed,
  radio: IconRadio,
  mg: IconMG,
  search: IconSearch,
  settings: IconSettings,
  check: IconCheck,
  arrow: IconArrow,
  user: IconUser,
};

const PRESET: string[] = [
  "controller",
  "mic",
  "headphone",
  "handshake",
  "moon",
  "mug",
  "sparkle",
  "katana",
];

const CATEGORIES: { label: string; items: string[] }[] = [
  {
    label: "はいしん / げーむ",
    items: ["controller", "arcade", "mic", "headphone", "vhs", "tv", "disc", "play", "live", "trophy"],
  },
  {
    label: "やりとり",
    items: ["bubble", "letter", "pin", "camera", "bell", "link", "share", "tag"],
  },
  {
    label: "おうち / にちじょう",
    items: ["house", "mug", "book", "pencil", "calendar", "clock", "key", "gift", "bag"],
  },
  { label: "たべもの", items: ["onigiri", "cake", "ramen", "candy", "icecream"] },
  {
    label: "てんき / しぜん",
    items: ["cloud", "sun", "moon", "rain", "flower", "leaf", "sparkle"],
  },
  { label: "かざり", items: ["heart", "star", "crown", "ribbon", "balloon"] },
  { label: "ひと / いきもの", items: ["handshake", "bow", "fish"] },
  {
    label: "さむらい",
    items: ["katana", "castle", "kabuto", "shuriken", "sensu", "mon", "yumi", "hinawa", "taiko", "nobori"],
  },
  {
    label: "ぐんじ",
    items: ["tank", "jet", "missile", "helmet", "gasmask", "grenade", "boom", "barbed", "radio", "mg"],
  },
  { label: "UI", items: ["search", "settings", "check", "arrow", "user"] },
];

function PreviewIcon({ name, size, accent }: { name: string; size: number; accent?: string }) {
  const Comp = ICONS[name];
  if (!Comp) return null;
  return <Comp size={size} accent={accent ?? PALETTE.ink} />;
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const valid = value && ICONS[value];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: PALETTE.inkDim, minWidth: 36 }}>アイコン</span>
        <div
          style={{
            width: 40,
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: PALETTE.paper,
            border: `1.5px solid ${PALETTE.inkSoft}`,
            borderRadius: 8,
          }}
        >
          {valid ? (
            <PreviewIcon name={value} size={20} />
          ) : (
            <span style={{ fontSize: 10, color: PALETTE.inkDim }}>未設定</span>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            style={{
              padding: "2px 8px",
              background: "transparent",
              border: `1px solid ${PALETTE.inkSoft}`,
              borderRadius: 6,
              fontSize: 10,
              color: PALETTE.inkDim,
              cursor: "pointer",
            }}
          >
            クリア
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {PRESET.map((name) => (
          <PresetButton
            key={name}
            name={name}
            selected={value === name}
            onClick={() => onChange(value === name ? "" : name)}
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
        <IconPickerModal
          value={value}
          onPick={(name) => {
            onChange(name);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function PresetButton({
  name,
  selected,
  onClick,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
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
      <PreviewIcon name={name} size={20} accent={selected ? "#fff" : PALETTE.ink} />
    </button>
  );
}

function IconPickerModal({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (name: string) => void;
  onClose: () => void;
}) {
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
      aria-label="アイコンを選ぶ"
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
            アイコンを選ぶ
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
        {CATEGORIES.map((cat) => (
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
              {cat.items.map((name) => {
                const selected = value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onPick(name)}
                    title={name}
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
                    <PreviewIcon name={name} size={22} accent={selected ? "#fff" : PALETTE.ink} />
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
