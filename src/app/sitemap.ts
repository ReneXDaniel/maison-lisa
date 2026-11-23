import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { locales, localeTags, defaultLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** All public pages in all eight languages, each with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [prods, cols] = await Promise.all([
    db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.status, "published")),
    db.select({ slug: collections.slug }).from(collections).where(eq(collections.published, true)),
  ]);
  const paths = ["", "/collections", "/shop", "/nail-studio", "/look-studio", "/quiz", "/custom-requests", "/about", "/next-chapter", ...["imprint", "privacy", "terms", "withdrawal", "youth-protection"].map((d) => `/legal/${d}`), ...cols.map((c) => `/collections/${c.slug}`), ...prods.map((p) => `/shop/${p.slug}`)];
  return paths.map((path) => ({
    url: `${base}/${defaultLocale}${path}`,
    alternates: { languages: Object.fromEntries(locales.map((l) => [localeTags[l], `${base}/${l}${path}`])) },
    changeFrequency: "weekly" as const,
  }));
}
