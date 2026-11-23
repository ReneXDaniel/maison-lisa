import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { announcementSubscribers } from "@/db/schema";
import { sha256Hex } from "@/lib/crypto";
import { isLocale, defaultLocale } from "@/i18n/routing";

/** Confirm / unsubscribe links from announcement emails. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = isLocale(url.searchParams.get("locale")) ? url.searchParams.get("locale")! : defaultLocale;
  const token = url.searchParams.get("token") ?? "";
  const action = url.searchParams.get("action");
  let result = "invalid";
  if (token.length > 10 && token.length < 100) {
    const patch = action === "unsubscribe" ? { unsubscribedAt: new Date() } : { confirmedAt: new Date(), unsubscribedAt: null };
    const rows = await db.update(announcementSubscribers).set(patch).where(eq(announcementSubscribers.tokenHash, sha256Hex(token))).returning({ id: announcementSubscribers.id });
    if (rows.length) result = action === "unsubscribe" ? "unsubscribed" : "confirmed";
  }
  return NextResponse.redirect(new URL(`/${locale}/next-chapter?subscription=${result}`, process.env.APP_URL ?? url.origin), 303);
}
