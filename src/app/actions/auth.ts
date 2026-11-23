"use server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { hashPassword, verifyPassword, dummyVerify } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroyCurrentSession, getRawSessionUser, completeMfaForSession, getCurrentUser } from "@/lib/auth/session";
import { issueToken, consumeToken } from "@/lib/auth/tokens";
import { safeNext } from "@/lib/auth/guards";
import { verifyTotp } from "@/lib/auth/mfa";
import { decryptSecret } from "@/lib/crypto";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-info";
import { sendMail, absoluteUrl } from "@/lib/mail";
import { mergeGuestCart } from "@/lib/cart";
import { audit } from "@/lib/audit";
import { isLocale, defaultLocale } from "@/i18n/routing";

export type FormState = { error?: string; fields?: Record<string, string>; notice?: string; values?: Record<string, string> } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const normEmail = (e: string) => e.trim().toLowerCase();

const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "invalid").max(40, "invalid"),
    email: z.email("invalid").max(254),
    password: z.string().min(10, "weak_password").max(128, "weak_password"),
    confirm: z.string(),
    terms: z.literal("on", { error: "terms_required" }),
    adult: z.literal("on", { error: "adult_required" }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "password_mismatch" });

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

async function sendVerification(userId: string, email: string, locale: string, next: string) {
  const token = await issueToken(userId, "verify_email");
  const link = absoluteUrl(`/api/auth/confirm-email?token=${encodeURIComponent(token)}&locale=${locale}&next=${encodeURIComponent(next)}`);
  await sendMail(email, "verifyEmail", locale, {}, link);
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const locale = await getLocale();
  const next = safeNext(str(fd, "next"), "/account");
  const values = { displayName: str(fd, "displayName"), email: str(fd, "email") };
  const parsed = registerSchema.safeParse({
    displayName: values.displayName,
    email: normEmail(values.email),
    password: String(fd.get("password") ?? ""),
    confirm: String(fd.get("confirm") ?? ""),
    terms: fd.get("terms") ?? undefined,
    adult: fd.get("adult") ?? undefined,
  });
  if (!parsed.success) return { error: "invalid", fields: fieldErrors(parsed.error), values };
  if (!(await rateLimit(`register:${await clientIp()}`, LIMITS.register.limit, LIMITS.register.window))) return { error: "rate_limited", values };

  const { email, password, displayName } = parsed.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (exists) return { error: "email_taken", fields: { email: "email_taken" }, values };

  const prefLocale = isLocale(str(fd, "preferredLocale")) ? str(fd, "preferredLocale") : locale;
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash }).onConflictDoNothing().returning();
  if (!user) return { error: "email_taken", fields: { email: "email_taken" }, values };
  await db.insert(profiles).values({
    userId: user.id,
    displayName,
    locale: prefLocale,
    notifyEmailMessages: fd.get("notifyMessages") === "on",
    notifyEmailOrders: true,
  });
  await sendVerification(user.id, email, prefLocale, next);
  await createSession(user.id);
  await mergeGuestCart(user.id);
  await audit(user.id, "auth.register", { type: "user", id: user.id });
  redirect(`/${prefLocale}/auth/verify-email?next=${encodeURIComponent(next)}`);
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = normEmail(str(fd, "email"));
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"), "/account");
  const values = { email };
  if (!email || !password) return { error: "invalid_credentials", values };
  const ip = await clientIp();
  const okIp = await rateLimit(`login:ip:${ip}`, LIMITS.login.limit * 3, LIMITS.login.window);
  const okAcct = await rateLimit(`login:acct:${email}`, LIMITS.login.limit, LIMITS.login.window);
  if (!okIp || !okAcct) return { error: "rate_limited", values };

  const [row] = await db.select({ u: users, p: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.email, email));
  if (!row || row.u.deletedAt) {
    await dummyVerify(password);
    return { error: "invalid_credentials", values };
  }
  if (!(await verifyPassword(row.u.passwordHash, password))) {
    await audit(row.u.id, "auth.login_failed", { type: "user", id: row.u.id });
    return { error: "invalid_credentials", values };
  }
  if (row.u.blockedAt) return { error: "blocked", values };

  const locale = row.p?.locale && isLocale(row.p.locale) ? row.p.locale : await getLocale();
  if (row.u.mfaEnabled) {
    await createSession(row.u.id, { mfaPending: true });
    redirect(`/${locale}/auth/mfa?next=${encodeURIComponent(next)}`);
  }
  await createSession(row.u.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, row.u.id));
  await mergeGuestCart(row.u.id);
  await audit(row.u.id, "auth.login", { type: "user", id: row.u.id });
  // Restore the customer's preferred language and return them to where they were heading.
  redirect(`/${locale}${row.u.role === "admin" && next === "/account" ? "/admin" : next}`);
}

export async function mfaAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getRawSessionUser();
  const locale = await getLocale();
  if (!user || !user.mfaPending) redirect(`/${locale}/auth/login`);
  if (!(await rateLimit(`mfa:${user.id}`, 8, 15 * 60))) return { error: "rate_limited" };
  const [u] = await db.select().from(users).where(eq(users.id, user.id));
  if (!u?.mfaSecretEnc || !verifyTotp(decryptSecret(u.mfaSecretEnc), str(fd, "code"))) return { error: "mfa_invalid" };
  await completeMfaForSession(user.sessionId);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await mergeGuestCart(user.id);
  await audit(user.id, "auth.login_mfa", { type: "user", id: user.id });
  const next = safeNext(str(fd, "next"), user.isAdmin ? "/admin" : "/account");
  redirect(`/${isLocale(user.locale) ? user.locale : locale}${next}`);
}

export async function logoutAction() {
  const locale = await getLocale();
  await destroyCurrentSession();
  redirect(`/${locale}`);
}

export async function resendVerificationAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect(`/${locale}/auth/login`);
  if (user.emailVerified) return { notice: "already_verified" };
  if (!(await rateLimit(`resend:${user.id}`, LIMITS.emailResend.limit, LIMITS.emailResend.window))) return { error: "rate_limited" };
  await sendVerification(user.id, user.email, locale, safeNext(str(fd, "next"), "/account"));
  return { notice: "sent" };
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const locale = await getLocale();
  const email = normEmail(str(fd, "email"));
  if (!z.email().safeParse(email).success) return { error: "invalid", fields: { email: "invalid" } };
  if (!(await rateLimit(`reset:${await clientIp()}`, LIMITS.passwordReset.limit, LIMITS.passwordReset.window))) return { error: "rate_limited" };
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (u && !u.deletedAt) {
    const token = await issueToken(u.id, "reset_password");
    await sendMail(email, "resetPassword", locale, {}, absoluteUrl(`/${locale}/auth/reset?token=${encodeURIComponent(token)}`));
  }
  // Same response whether or not the account exists (prevents account enumeration).
  return { notice: "sent" };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const locale = await getLocale();
  const password = String(fd.get("password") ?? "");
  if (password.length < 10 || password.length > 128) return { error: "weak_password", fields: { password: "weak_password" } };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "password_mismatch", fields: { confirm: "password_mismatch" } };
  const row = await consumeToken(str(fd, "token"), "reset_password");
  if (!row) return { error: "token_invalid" };
  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, row.userId));
  await destroyAllSessions(row.userId);
  await audit(row.userId, "auth.password_reset", { type: "user", id: row.userId });
  redirect(`/${locale}/auth/login?reset=1`);
}

/** Used by the email confirmation route handler. */
export async function confirmEmailToken(token: string) {
  const row = await consumeToken(token, "verify_email");
  if (!row) return false;
  await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, row.userId));
  await audit(row.userId, "auth.email_verified", { type: "user", id: row.userId });
  return true;
}

export async function localeOrDefault(l: string | null) {
  return l && isLocale(l) ? l : defaultLocale;
}
