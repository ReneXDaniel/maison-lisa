"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { announcementSubscribers, carts, conversations, customRequests, messageAttachments, profiles, sessions, users } from "@/db/schema";
import { requireAction, run, ActionError } from "@/lib/auth/guards";
import { destroyAllSessions, destroyCurrentSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueToken, consumeToken } from "@/lib/auth/tokens";
import { newTotpSecret, totpQr, verifyTotp } from "@/lib/auth/mfa";
import { encryptSecret, decryptSecret, randomToken } from "@/lib/crypto";
import { sendMail, absoluteUrl } from "@/lib/mail";
import { storage } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { isLocale, locales } from "@/i18n/routing";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  locale: z.enum(locales),
  notifyEmailMessages: z.boolean(),
  notifyEmailOrders: z.boolean(),
  readReceipts: z.boolean(),
});

export async function updateProfileAction(input: z.input<typeof profileSchema>) {
  return run(async () => {
    const user = await requireAction("user");
    const v = profileSchema.safeParse(input);
    if (!v.success) throw new ActionError("invalid");
    await db.update(profiles).set({ ...v.data, updatedAt: new Date() }).where(eq(profiles.userId, user.id));
    revalidatePath("/[locale]/account", "layout");
  });
}

export async function changePasswordAction(current: string, next: string) {
  return run(async () => {
    const user = await requireAction("user");
    if (!(await rateLimit(`pw:${user.id}`, 5, 900))) throw new ActionError("rate_limited");
    if (next.length < 10 || next.length > 128) throw new ActionError("weak_password");
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    if (!u || !(await verifyPassword(u.passwordHash, current))) throw new ActionError("invalid_credentials");
    await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, user.id));
    await destroyAllSessions(user.id, user.sessionId);
    await audit(user.id, "account.password_changed", { type: "user", id: user.id });
  });
}

/** Sends a confirmation link to the new address; the change only happens after it is confirmed. */
export async function requestEmailChangeAction(newEmail: string, password: string) {
  return run(async () => {
    const user = await requireAction("user");
    const locale = await getLocale();
    const email = newEmail.trim().toLowerCase();
    if (!z.email().safeParse(email).success) throw new ActionError("invalid");
    if (!(await rateLimit(`emailchange:${user.id}`, 5, 3600))) throw new ActionError("rate_limited");
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    if (!u || !(await verifyPassword(u.passwordHash, password))) throw new ActionError("invalid_credentials");
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (taken) throw new ActionError("email_taken");
    const token = await issueToken(user.id, "change_email", email);
    await sendMail(email, "changeEmail", locale, {}, absoluteUrl(`/api/auth/confirm-email-change?token=${encodeURIComponent(token)}&locale=${locale}`));
  });
}

export async function confirmEmailChange(token: string) {
  const row = await consumeToken(token, "change_email");
  if (!row?.newEmail) return false;
  const [u] = await db.select().from(users).where(eq(users.id, row.userId));
  if (!u) return false;
  try {
    await db.update(users).set({ email: row.newEmail, emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, row.userId));
  } catch {
    return false; // address taken in the meantime
  }
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id));
  await sendMail(u.email, "emailChanged", p?.locale ?? "de", { newEmail: row.newEmail });
  await audit(u.id, "account.email_changed", { type: "user", id: u.id });
  return true;
}

/* ── MFA (TOTP) ── */

export async function beginMfaSetupAction() {
  return run(async () => {
    const user = await requireAction("user");
    const secret = newTotpSecret();
    const { dataUrl, uri } = await totpQr(secret, user.email);
    // The pending secret travels encrypted to the client and back; it is only stored once confirmed.
    return { qr: dataUrl, uri, pending: encryptSecret(secret) };
  });
}

export async function confirmMfaSetupAction(pending: string, code: string) {
  return run(async () => {
    const user = await requireAction("user");
    let secret: string;
    try {
      secret = decryptSecret(pending);
    } catch {
      throw new ActionError("invalid");
    }
    if (!verifyTotp(secret, code)) throw new ActionError("mfa_invalid");
    await db.update(users).set({ mfaEnabled: true, mfaSecretEnc: encryptSecret(secret), updatedAt: new Date() }).where(eq(users.id, user.id));
    await audit(user.id, "account.mfa_enabled", { type: "user", id: user.id });
    revalidatePath("/[locale]/account/security", "page");
  });
}

export async function disableMfaAction(password: string) {
  return run(async () => {
    const user = await requireAction("user");
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    if (!u || !(await verifyPassword(u.passwordHash, password))) throw new ActionError("invalid_credentials");
    await db.update(users).set({ mfaEnabled: false, mfaSecretEnc: null, updatedAt: new Date() }).where(eq(users.id, user.id));
    await audit(user.id, "account.mfa_disabled", { type: "user", id: user.id });
    revalidatePath("/[locale]/account/security", "page");
  });
}

export async function signOutOtherSessionsAction() {
  return run(async () => {
    const user = await requireAction("user");
    await destroyAllSessions(user.id, user.sessionId);
    revalidatePath("/[locale]/account/security", "page");
  });
}

/**
 * GDPR erasure. Personal data, conversations, attachments and requests are
 * deleted; orders are kept (anonymised, detached from the person) because
 * of statutory bookkeeping retention obligations.
 */
export async function deleteAccountAction(password: string) {
  const locale = await getLocale();
  const result = await run(async () => {
    const user = await requireAction("user");
    if (user.isAdmin) throw new ActionError("forbidden");
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    if (!u || !(await verifyPassword(u.passwordHash, password))) throw new ActionError("invalid_credentials");
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id));
    const convIds = (await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.customerId, u.id))).map((c) => c.id);
    if (convIds.length) {
      const atts = await db.select({ key: messageAttachments.storageKey }).from(messageAttachments).where(inArray(messageAttachments.conversationId, convIds));
      for (const a of atts) await storage().delete(a.key).catch(() => {});
    }
    const originalEmail = u.email;
    await db.transaction(async (tx) => {
      await tx.delete(conversations).where(eq(conversations.customerId, u.id));
      await tx.delete(customRequests).where(eq(customRequests.customerId, u.id));
      await tx.delete(carts).where(eq(carts.userId, u.id));
      await tx.delete(announcementSubscribers).where(and(eq(announcementSubscribers.userId, u.id)));
      await tx.delete(sessions).where(eq(sessions.userId, u.id));
      await tx.update(profiles).set({ displayName: "Deleted client", notifyEmailMessages: false, notifyEmailOrders: false }).where(eq(profiles.userId, u.id));
      await tx
        .update(users)
        .set({
          email: `deleted-${u.id}@invalid.local`,
          passwordHash: `deleted:${randomToken(16)}`,
          mfaEnabled: false,
          mfaSecretEnc: null,
          identityFingerprint: u.identityFingerprint, // kept pseudonymous to prevent welcome-offer abuse via re-registration
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, u.id));
    });
    await audit(u.id, "account.deleted", { type: "user", id: u.id });
    await sendMail(originalEmail, "accountDeleted", p?.locale && isLocale(p.locale) ? p.locale : locale);
  });
  if (!result.ok) return result;
  await destroyCurrentSession();
  redirect(`/${locale}?deleted=1`);
}
