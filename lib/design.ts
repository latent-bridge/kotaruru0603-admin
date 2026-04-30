// Color tokens lifted from the public site's lib/mochi.ts so admin and fan
// site share the same warm-pastel "mochi house" palette. Keep this in sync if
// the public PALETTE moves.

export const PALETTE = {
  bg: "#fdf3ea",
  paper: "#fffaf3",
  coral: "#f0a0ae",
  lilac: "#b4aedc",
  mint: "#a6d4bf",
  cream: "#f0d88a",
  sky: "#9fc2dc",
  accent: "#d06a7e",
  ink: "#3a2e2a",
  inkDim: "#857670",
  inkSoft: "rgba(58,46,42,0.14)",
  inkBorder: "rgba(58,46,42,0.22)",
} as const;

export type Category =
  | "おしゃべり"
  | "げーむ"
  | "おえかき"
  | "うた"
  | "おはなし"
  | "めんばー"
  | "おやすみ";

export const CATEGORY_OPTIONS: readonly Category[] = [
  "おしゃべり", "げーむ", "おえかき", "うた", "おはなし", "めんばー", "おやすみ",
];

// Suggested tags presented as chips in the admin. Decoupled from the archive's
// Category enum since schedule tags are free-form (the user can add anything
// beyond this set via the "+追加" input).
export const PRESET_TAGS = [
  "おしゃべり", "げーむ", "おえかき", "うた", "おはなし", "コラボ", "おやすみ",
] as const;

// One-row emoji palette for the most common stream types. Free input handles
// everything else.
export const EMOJI_PRESETS = ["🎮", "🎙", "🎤", "🎨", "🤝", "💤", "☕", "✨"] as const;

export const CATEGORY_COLOR: Record<Category, { color: string; bg: string }> = {
  おしゃべり: { color: "#c25470", bg: "#fbe0e4" },
  げーむ:    { color: "#7a6bb4", bg: "#e2dff2" },
  おえかき:  { color: "#5a8870", bg: "#d6e6d8" },
  うた:      { color: "#a68248", bg: "#f6e8b0" },
  おはなし:  { color: "#c26a50", bg: "#fad8c8" },
  めんばー:  { color: "#8060a8", bg: "#e6d8ee" },
  おやすみ:  { color: "rgba(58,46,42,0.55)", bg: "#f0e8df" },
};

// Schedule-tag color map. Includes the archive Category palette so shared
// labels stay consistent, plus schedule-only labels like コラボ.
const TAG_COLOR_OVERRIDES: Record<string, { color: string; bg: string }> = {
  ...CATEGORY_COLOR,
  コラボ: { color: "#c26a50", bg: "#fad8c8" },
};

const DEFAULT_TAG_COLOR = { color: "#857670", bg: "#f0e8df" };
export function tagColor(tag: string): { color: string; bg: string } {
  return TAG_COLOR_OVERRIDES[tag] ?? DEFAULT_TAG_COLOR;
}

export const RADIUS = { sm: 8, md: 12, lg: 18, xl: 22 } as const;

export const SHADOW = {
  card: `0 1px 0 ${PALETTE.inkSoft}`,
  hover: `0 2px 6px ${PALETTE.inkSoft}`,
} as const;
