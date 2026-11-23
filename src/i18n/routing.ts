import { defineRouting } from "next-intl/routing";

export const locales = ["de", "en", "fr", "es", "it", "nl", "pl", "pt"] as const;
export type Locale = (typeof locales)[number];

/** Native language names for the language selector. */
export const localeNames: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
};

/** BCP-47 tags used for hreflang, Intl formatting and <html lang>. */
export const localeTags: Record<Locale, string> = {
  de: "de-DE",
  en: "en",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  nl: "nl-NL",
  pl: "pl-PL",
  pt: "pt-PT",
};

const envDefault = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
export const defaultLocale: Locale = (locales as readonly string[]).includes(envDefault ?? "")
  ? (envDefault as Locale)
  : "de";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeCookie: { name: "ML_LOCALE", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
  alternateLinks: false, // we emit hreflang ourselves in metadata (with canonical URLs)
});
