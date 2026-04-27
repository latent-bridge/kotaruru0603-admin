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

export const CATEGORY_COLOR: Record<Category, { color: string; bg: string }> = {
  おしゃべり: { color: "#c25470", bg: "#fbe0e4" },
  げーむ:    { color: "#7a6bb4", bg: "#e2dff2" },
  おえかき:  { color: "#5a8870", bg: "#d6e6d8" },
  うた:      { color: "#a68248", bg: "#f6e8b0" },
  おはなし:  { color: "#c26a50", bg: "#fad8c8" },
  めんばー:  { color: "#8060a8", bg: "#e6d8ee" },
  おやすみ:  { color: "rgba(58,46,42,0.55)", bg: "#f0e8df" },
};

export const RADIUS = { sm: 8, md: 12, lg: 18, xl: 22 } as const;

export const SHADOW = {
  card: `0 1px 0 ${PALETTE.inkSoft}`,
  hover: `0 2px 6px ${PALETTE.inkSoft}`,
} as const;
