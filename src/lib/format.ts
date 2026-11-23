import { localeTags, isLocale } from "@/i18n/routing";

const tag = (locale: string) => (isLocale(locale) ? localeTags[locale] : "de-DE");

/** Locale-aware currency formatting from integer cents. */
export function formatMoney(cents: number, locale: string, currency = "EUR") {
  return new Intl.NumberFormat(tag(locale), { style: "currency", currency }).format(cents / 100);
}

export function formatDate(d: Date | string, locale: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(tag(locale), { timeZone: "Europe/Berlin", ...opts }).format(new Date(d));
}

export function formatDateTime(d: Date | string, locale: string) {
  return formatDate(d, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(d: Date | string, locale: string) {
  return formatDate(d, locale, { timeStyle: "short" });
}
