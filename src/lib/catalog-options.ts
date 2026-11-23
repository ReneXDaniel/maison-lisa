/**
 * Shared option vocabularies for the Nail Studio, Look Studio and Custom
 * Request Builder. Keys are stable identifiers stored in the database; labels
 * come from translations (`options.<group>.<key>`), so the same request reads
 * correctly in every language.
 */
export const POLISH_COLORS = [
  { key: "classic_white", hex: "#F4F1EA" },
  { key: "cherry_red", hex: "#9E1B2A" },
  { key: "bordeaux", hex: "#5C1A24" },
  { key: "midnight_black", hex: "#17120F" },
  { key: "soft_nude", hex: "#D9B8A0" },
  { key: "rose_gold", hex: "#C08A78" },
  { key: "baby_pink", hex: "#EBC2C6" },
  { key: "french_white", hex: "#FBF6EF" },
  { key: "deep_plum", hex: "#4A2238" },
  { key: "champagne", hex: "#D9C3A1" },
] as const;

export const POLISH_FINISHES = ["glossy", "matte", "shimmer"] as const;
export const PHOTO_STYLES = ["elegant_editorial", "soft_natural", "mysterious_noir", "minimal_studio", "romantic_detail"] as const;
export const STOCKINGS = ["black_sheer", "soft_nude", "elegant_lace", "barefoot"] as const;
export const FOOTWEAR = ["high_heels", "sandals", "minimalist", "barefoot"] as const;
export const ACCESSORIES = ["anklet", "toe_ring", "silk_ribbon", "none"] as const;
export const BACKGROUNDS = ["ivory_studio", "champagne_satin", "soft_taupe", "dark_espresso", "natural_light"] as const;

export type PolishColorKey = (typeof POLISH_COLORS)[number]["key"];

export type RequestSelections = {
  polishColor?: PolishColorKey;
  polishFinish?: (typeof POLISH_FINISHES)[number];
  style?: (typeof PHOTO_STYLES)[number];
  stockings?: (typeof STOCKINGS)[number];
  footwear?: (typeof FOOTWEAR)[number];
  accessories?: (typeof ACCESSORIES)[number];
  background?: (typeof BACKGROUNDS)[number];
};

export const SELECTION_GROUPS = {
  polishColor: POLISH_COLORS.map((c) => c.key),
  polishFinish: POLISH_FINISHES,
  style: PHOTO_STYLES,
  stockings: STOCKINGS,
  footwear: FOOTWEAR,
  accessories: ACCESSORIES,
  background: BACKGROUNDS,
} as const satisfies Record<keyof RequestSelections, readonly string[]>;

export const BACKGROUND_SWATCH: Record<(typeof BACKGROUNDS)[number], string> = {
  ivory_studio: "linear-gradient(160deg,#f7f2eb,#e2d5c3)",
  champagne_satin: "linear-gradient(135deg,#e3d4c1 0%,#c9b299 45%,#e8dccb 60%,#b99f83 100%)",
  soft_taupe: "linear-gradient(160deg,#b4a292,#978171)",
  dark_espresso: "linear-gradient(160deg,#3e2e25,#1d140f)",
  natural_light: "linear-gradient(120deg,#fbf7f1 0%,#efe4d3 55%,#d9c7ae 100%)",
};

/** Validates arbitrary input into a clean selections object (unknown keys/values dropped). */
export function sanitizeSelections(input: unknown): RequestSelections {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return {};
  for (const [group, allowed] of Object.entries(SELECTION_GROUPS)) {
    const v = (input as Record<string, unknown>)[group];
    if (typeof v === "string" && (allowed as readonly string[]).includes(v)) out[group] = v;
  }
  return out as RequestSelections;
}
