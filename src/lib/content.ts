import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { contentBlocks } from "@/db/schema";

/**
 * Website copy Lisa can edit in the admin dashboard, per language. Defaults
 * come from the translation files; a saved value for a language overrides
 * the default for that language only.
 */
export const EDITABLE_CONTENT: { key: string; multiline?: boolean; group: "home" | "about" | "details" }[] = [
  { key: "home.hero.eyebrow", group: "home" },
  { key: "home.hero.subtitle", group: "home" },
  { key: "home.hero.support", group: "home", multiline: true },
  { key: "home.intro.title", group: "home" },
  { key: "home.intro.body", group: "home", multiline: true },
  { key: "home.silk.title", group: "home" },
  { key: "home.details.title", group: "home" },
  { key: "home.details.body", group: "home", multiline: true },
  { key: "home.final.title", group: "home" },
  { key: "home.final.body", group: "home", multiline: true },
  { key: "home.announcement", group: "home", multiline: true },
  { key: "home.details.hotspots.polish.body", group: "details", multiline: true },
  { key: "home.details.hotspots.jewelry.body", group: "details", multiline: true },
  { key: "home.details.hotspots.stockings.body", group: "details", multiline: true },
  { key: "home.details.hotspots.silk.body", group: "details", multiline: true },
  { key: "home.details.hotspots.styling.body", group: "details", multiline: true },
  { key: "about.intro.title", group: "about" },
  { key: "about.intro.body", group: "about", multiline: true },
  ...(["c1", "c2", "c3", "c4", "c5"] as const).flatMap((c) => [
    { key: `about.cards.${c}.title`, group: "about" as const },
    { key: `about.cards.${c}.body`, group: "about" as const, multiline: true },
  ]),
  { key: "about.final.title", group: "about" },
  { key: "about.final.body", group: "about", multiline: true },
];

export async function contentOverrides(locale: string, keys?: string[]) {
  const rows = await db
    .select()
    .from(contentBlocks)
    .where(and(eq(contentBlocks.locale, locale), keys?.length ? inArray(contentBlocks.key, keys) : undefined));
  return new Map(rows.map((r) => [r.key, r.value]));
}

/** Returns a translator-like function honouring Lisa's saved overrides. */
export async function getContent(locale: string) {
  const [t, overrides] = await Promise.all([getTranslations({ locale }), contentOverrides(locale)]);
  return (key: string, values?: Record<string, string | number>) => {
    const o = overrides.get(key);
    if (o !== undefined) return o;
    return t.has(key) ? t(key, values) : "";
  };
}
