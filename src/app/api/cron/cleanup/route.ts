import { NextResponse } from "next/server";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits, sessions, authTokens } from "@/db/schema";
import { expireStaleOrders } from "@/lib/payments/fulfillment";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

/** Housekeeping — call every ~15 minutes with `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  const secret = env().CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const expiredOrders = await expireStaleOrders();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(authTokens).where(lt(authTokens.expiresAt, sql`now() - interval '7 days'`));
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, sql`now() - interval '2 days'`));
  return NextResponse.json({ ok: true, expiredOrders });
}
