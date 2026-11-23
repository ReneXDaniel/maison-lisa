import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { defaultLocale, locales, localeTags, type Locale } from "@/i18n/routing";

const base = () => process.env.APP_URL ?? "http://localhost:3000";

/**
 * Localised metadata with canonical URL + hreflang alternates for all eight
 * languages (and x-default → the default locale).
 */
export function pageMetadata(opts: {
  locale: string;
  path: string;
  /** Page title, suffixed with the brand name. */
  title?: string;
  /** Localised tagline for pages titled "Brand — tagline" (the home page). */
  tagline?: string;
  description?: string;
  noindex?: boolean;
}): Metadata {
  const path = opts.path === "/" ? "" : opts.path;
  const languages: Record<string, string> = {};
  for (const l of locales) languages[localeTags[l]] = `${base()}/${l}${path}`;
  languages["x-default"] = `${base()}/${defaultLocale}${path}`;
  const title = opts.title
    ? `${opts.title} · ${brand.name}`
    : opts.tagline
      ? `${brand.name} — ${opts.tagline}`
      : brand.name;
  return {
    title,
    description: opts.description,
    alternates: { canonical: `${base()}/${opts.locale}${path}`, languages },
    openGraph: {
      title,
      description: opts.description,
      siteName: brand.name,
      locale: localeTags[opts.locale as Locale] ?? opts.locale,
      url: `${base()}/${opts.locale}${path}`,
      type: "website",
      images: [{ url: `${base()}/demo/og.jpg`, width: 1200, height: 630, alt: brand.name }],
    },
    twitter: { card: "summary_large_image", title, description: opts.description },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
  };
}
