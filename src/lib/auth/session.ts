import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles, sessions, users } from "@/db/schema";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { clientIp, userAgent } from "@/lib/request-info";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-ml_session" : "ml_session";
const SESSION_DAYS = 30;
const RENEW_THRESHOLD_DAYS = 15;

export type AgeStatus = (typeof users.$inferSelect)["ageStatus"];

export type CurrentUser = {
  id: string;
  sessionId: string;
  email: string;
  role: "customer" | "admin";
  displayName: string;
  locale: string;
  emailVerified: boolean;
  /** Effective status — "verified" decays to "expired" after ageVerifiedUntil. */
  ageStatus: AgeStatus;
  isAdultVerified: boolean;
  isAdmin: boolean;
  blocked: boolean;
  mfaEnabled: boolean;
  mfaPending: boolean;
  readReceipts: boolean;
  notifyEmailMessages: boolean;
  notifyEmailOrders: boolean;
};

export function effectiveAgeStatus(status: AgeStatus, until: Date | null): AgeStatus {
  if (status === "verified" && until && until.getTime() < Date.now()) return "expired";
  return status;
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Creates a session row and sets the cookie. Only callable from server actions / route handlers. */
export async function createSession(userId: string, opts: { mfaPending?: boolean } = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({
    id: sha256Hex(token),
    userId,
    expiresAt,
    mfaPending: opts.mfaPending ?? false,
    ip: await clientIp(),
    userAgent: await userAgent(),
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  return token;
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256Hex(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string, exceptSessionId?: string) {
  await db
    .delete(sessions)
    .where(exceptSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)) : eq(sessions.userId, userId));
}

export async function completeMfaForSession(sessionId: string) {
  await db.update(sessions).set({ mfaPending: false }).where(eq(sessions.id, sessionId));
}

async function lookup(token: string | undefined): Promise<CurrentUser | null> {
  if (!token || token.length > 200) return null;
  const id = sha256Hex(token);
  const [row] = await db
    .select({ s: sessions, u: users, p: profiles })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())));
  if (!row || row.u.deletedAt) return null;
  const age = effectiveAgeStatus(row.u.ageStatus, row.u.ageVerifiedUntil);
  return {
    id: row.u.id,
    sessionId: row.s.id,
    email: row.u.email,
    role: row.u.role,
    displayName: row.p?.displayName ?? row.u.email.split("@")[0]!,
    locale: row.p?.locale ?? "de",
    emailVerified: !!row.u.emailVerifiedAt,
    ageStatus: age,
    isAdultVerified: age === "verified",
    isAdmin: row.u.role === "admin",
    blocked: !!row.u.blockedAt,
    mfaEnabled: row.u.mfaEnabled,
    mfaPending: row.s.mfaPending,
    readReceipts: row.p?.readReceipts ?? true,
    notifyEmailMessages: row.p?.notifyEmailMessages ?? true,
    notifyEmailOrders: row.p?.notifyEmailOrders ?? true,
  };
}

/** Session including MFA-pending state (only the MFA page should use this directly). */
export const getRawSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return lookup(token);
});

/** The authenticated user, or null. MFA-pending sessions count as signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const u = await getRawSessionUser();
  return u && !u.mfaPending ? u : null;
});

/** For route handlers that receive a Request (SSE, downloads). */
export async function getUserFromRequest(req: Request): Promise<CurrentUser | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const u = await lookup(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : undefined);
  return u && !u.mfaPending ? u : null;
}

/** Sliding expiry: extends long-lived sessions. Call from server actions only. */
export async function maybeRenewSession(user: CurrentUser) {
  const [s] = await db.select().from(sessions).where(eq(sessions.id, user.sessionId));
  if (!s) return;
  if (s.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_DAYS * 864e5) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
    await db.update(sessions).set({ expiresAt, lastSeenAt: new Date() }).where(eq(sessions.id, s.id));
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  }
}
