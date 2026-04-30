// Emoji → SVG icon helper.
// Usage: <Emo e="🎙" size={20} /> for inline replacement.
// Maps both pictographic emoji (🎙 📼 🤝) and decorative symbols (☁ ☀ ♡ ★ ✦)
// to icons from ./icons-full.

import { PALETTE } from "@/lib/design";
import {
  IconMic,
  IconVHS,
  IconTV,
  IconController,
  IconArcade,
  IconHeadphone,
  IconBubble,
  IconLetter,
  IconPin,
  IconCamera,
  IconBell,
  IconHouse,
  IconMug,
  IconBook,
  IconPencil,
  IconCalendar,
  IconClock,
  IconKey,
  IconGift,
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
  IconHeart,
  IconStar,
  IconCrown,
  IconRibbon,
  IconBalloon,
  IconHandshake,
  IconFish,
  IconBow,
  IconKatana,
  IconCastle,
  IconLive,
  IconSearch,
} from "./icons-full";

type IconComp = React.ComponentType<{ size?: number; accent?: string }>;

const EMOJI_MAP: Record<string, IconComp> = {
  // streaming / games
  "🎙": IconMic,
  "🎤": IconMic,
  "📼": IconVHS,
  "📺": IconTV,
  "🎮": IconController,
  "🕹": IconArcade,
  "🎧": IconHeadphone,

  // communication / decoration
  "💬": IconBubble,
  "💌": IconLetter,
  "📌": IconPin,
  "📷": IconCamera,
  "🔔": IconBell,

  // house / daily
  "🏠": IconHouse,
  "☕": IconMug,
  "📖": IconBook,
  "✏": IconPencil,
  "✏️": IconPencil,
  "📅": IconCalendar,
  "🕐": IconClock,
  "🔑": IconKey,
  "🎁": IconGift,

  // food
  "🍙": IconOnigiri,
  "🎂": IconCake,
  "🍜": IconRamen,
  "🍬": IconCandy,
  "🍦": IconIcecream,

  // weather / nature
  "☁": IconCloud,
  "☁️": IconCloud,
  "☀": IconSun,
  "☀️": IconSun,
  "🌙": IconMoon,
  "💤": IconMoon,
  "🌧": IconRain,
  "🌸": IconFlower,
  "🍃": IconLeaf,
  "✨": IconSparkle,
  "✦": IconSparkle,

  // ui / decorative
  "♡": IconHeart,
  "💕": IconHeart,
  "💝": IconHeart,
  "★": IconStar,
  "☆": IconStar,
  "👑": IconCrown,
  "🎀": IconRibbon,
  "🎈": IconBalloon,

  // people / gestures
  "🤝": IconHandshake,
  "🐟": IconFish,
  "🙇": IconBow,
  "👻": IconMoon,

  // samurai
  "⚔": IconKatana,
  "⚔️": IconKatana,
  "🏯": IconCastle,

  // status / ui glyphs (true picture-emoji only — typographic glyphs like ✎,
  // ★, ♡ are intentionally left as raw text since they read fine inline)
  "🔴": IconLive,
  "🔍": IconSearch,
};

export function Emo({
  e,
  size = 18,
  accent,
  inline = true,
  style,
}: {
  e: string;
  size?: number;
  accent?: string;
  inline?: boolean;
  style?: React.CSSProperties;
}) {
  const Comp = EMOJI_MAP[e];
  if (!Comp) return <span style={style}>{e}</span>;
  const wrap: React.CSSProperties = inline
    ? { display: "inline-flex", verticalAlign: "middle", lineHeight: 0, ...style }
    : { display: "inline-flex", lineHeight: 0, ...style };
  return (
    <span style={wrap}>
      <Comp size={size} accent={accent || PALETTE.coral} />
    </span>
  );
}

// Replace all known emojis inside a string with <Emo /> elements.
export function emojify(
  text: string,
  { size = 18, accent }: { size?: number; accent?: string } = {},
): React.ReactNode[] {
  if (!text) return [text];
  const keys = Object.keys(EMOJI_MAP).sort((a, b) => b.length - a.length);
  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp("(" + escaped.join("|") + ")", "g");
  const parts = text.split(re);
  return parts.map((p, i) => {
    if (EMOJI_MAP[p]) {
      return <Emo key={i} e={p} size={size} accent={accent} />;
    }
    return p;
  });
}
