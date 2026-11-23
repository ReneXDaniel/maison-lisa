import "server-only";
import { createTranslator } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import { isLocale, defaultLocale, type Locale } from "@/i18n/routing";

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Translator usable outside React (emails, notifications, webhooks). */
export async function serverTranslator(locale: string, namespace?: string): Promise<Translate> {
  const l: Locale = isLocale(locale) ? locale : defaultLocale;
  const messages = await loadMessages(l);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createTranslator({ locale: l, messages: messages as any, namespace: namespace as any }) as unknown as Translate;
}
