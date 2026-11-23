"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { isLocale } from "@/i18n/routing";

/** Persists the preferred language for signed-in users (restored after login). */
export async function savePreferredLocale(locale: string) {
  if (!isLocale(locale)) return { ok: false };
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db.update(profiles).set({ locale, updatedAt: new Date() }).where(eq(profiles.userId, user.id));
  return { ok: true };
}
