"use server";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { announcementSubscribers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-info";
import { sendMail, absoluteUrl } from "@/lib/mail";

/** Double opt-in: the address only receives announcements after confirming the emailed link. */
export async function subscribeAction(_: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string } | null> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success || fd.get("consent") !== "on") return { error: "subscribe_invalid" };
  if (!(await rateLimit(`subscribe:${await clientIp()}`, LIMITS.subscribe.limit, LIMITS.subscribe.window))) return { error: "rate_limited" };
  const locale = await getLocale();
  const user = await getCurrentUser();
  const token = randomToken(24);
  await db
    .insert(announcementSubscribers)
    .values({ email, userId: user?.id, locale, tokenHash: sha256Hex(token), consentAt: new Date() })
    .onConflictDoUpdate({ target: announcementSubscribers.email, set: { tokenHash: sha256Hex(token), consentAt: new Date(), locale, unsubscribedAt: null } });
  await sendMail(email, "subscribeConfirm", locale, {}, absoluteUrl(`/api/subscribe?action=confirm&token=${token}&locale=${locale}`));
  return { ok: true };
}
