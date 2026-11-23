import { loaders, NAMESPACES, type Namespace } from "../../messages";
import { deepMerge } from "@/lib/deep-merge";
import { isLocale, defaultLocale } from "./routing";

type Messages = Record<string, unknown>;

/** Namespaces sent to the browser for public pages (email/legal/admin stay server-side). */
export const CLIENT_NAMESPACES: readonly Namespace[] = NAMESPACES.filter((n) => !["email", "legal", "admin"].includes(n));

const cache = new Map<string, Messages>();

async function loadLocale(locale: string): Promise<Messages> {
  const set = loaders[locale];
  if (!set) return {};
  const entries = await Promise.all(NAMESPACES.map(async (ns) => [ns, await set[ns]()] as const));
  return Object.fromEntries(entries);
}

/** English base layer + requested locale on top (missing keys fall back to English). */
export async function loadMessages(locale: string): Promise<Messages> {
  const l = isLocale(locale) ? locale : defaultLocale;
  const hit = process.env.NODE_ENV === "production" ? cache.get(l) : undefined;
  if (hit) return hit;
  const base = await loadLocale("en");
  const msgs = l === "en" ? base : deepMerge(base, await loadLocale(l));
  cache.set(l, msgs);
  return msgs;
}
