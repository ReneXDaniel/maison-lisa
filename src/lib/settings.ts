import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type SiteMediaSlots = {
  hero?: string;
  aboutPortrait?: string;
  silkReveal?: string;
  hotspotImage?: string;
  nailBase?: string;
  nailMask?: string;
  lookStudio?: string;
  behindScenes?: string[];
};

export type AppSettings = {
  allowDiscountStacking: boolean;
  /** One welcome discount per verified identity (prevents multi-account abuse). */
  welcomeOncePerIdentity: boolean;
  downloadLinkTtlMinutes: number;
  checkoutSessionMinutes: number;
  chatAttachmentsEnabled: boolean;
  maxAttachmentMb: number;
  /** Optional frame-sequence manifest URL for the "Behind the Silk" animation. */
  stockingSequenceManifest: string;
  siteMedia: SiteMediaSlots;
};

export const DEFAULT_SETTINGS: AppSettings = {
  allowDiscountStacking: false,
  welcomeOncePerIdentity: true,
  downloadLinkTtlMinutes: 15,
  checkoutSessionMinutes: 45,
  chatAttachmentsEnabled: true,
  maxAttachmentMb: 10,
  stockingSequenceManifest: "",
  siteMedia: {},
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value;
  return out as AppSettings;
}

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return (row?.value as AppSettings[K]) ?? DEFAULT_SETTINGS[key];
}

export async function setSettings(patch: Partial<AppSettings>) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await db
      .insert(settings)
      .values({ key, value: value as object })
      .onConflictDoUpdate({ target: settings.key, set: { value: value as object, updatedAt: new Date() } });
  }
}

export async function deleteSettings(keys: string[]) {
  if (keys.length) await db.delete(settings).where(inArray(settings.key, keys));
}
