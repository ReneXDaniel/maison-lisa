import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationRecords, webhookEvents } from "@/db/schema";
import { assertProductionSafety, env } from "@/lib/env";
import { identityFingerprint } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { absoluteUrl } from "@/lib/mail";
import { ActionError } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { DevVerificationProvider } from "./providers/dev";
import { VeriffProvider } from "./providers/veriff";
import type { VerificationDecision, VerificationProvider } from "./types";

export function verificationProvider(id?: string): VerificationProvider {
  assertProductionSafety();
  const which = id ?? env().VERIFICATION_PROVIDER;
  if (which === "veriff") return new VeriffProvider();
  if (which === "dev") return new DevVerificationProvider();
  throw new Error(`Unknown verification provider: ${which}`);
}

export { ageInYears } from "./age";
import { ageInYears } from "./age";

export async function latestVerification(userId: string) {
  const [r] = await db.select().from(verificationRecords).where(eq(verificationRecords.userId, userId)).orderBy(desc(verificationRecords.createdAt)).limit(1);
  return r ?? null;
}

/** Starts a provider-hosted verification and returns the redirect URL. */
export async function startVerification(user: CurrentUser, locale: string, next: string) {
  if (!user.emailVerified) throw new ActionError("email_unverified");
  if (user.isAdultVerified) return `/${locale}${next}`;
  const provider = verificationProvider();
  const [record] = await db
    .insert(verificationRecords)
    .values({ userId: user.id, provider: provider.id, providerSessionId: `pending_${crypto.randomUUID()}`, status: "pending" })
    .returning();
  const returnUrl = absoluteUrl(`/${locale}/verify/return?next=${encodeURIComponent(next)}`);
  let session;
  try {
    session = await provider.createSession({ recordId: record!.id, userId: user.id, locale, returnUrl });
  } catch (e) {
    console.error("[verification] session creation failed", e);
    await db.delete(verificationRecords).where(eq(verificationRecords.id, record!.id));
    throw new ActionError("verification_unavailable");
  }
  await db.update(verificationRecords).set({ providerSessionId: session.providerSessionId }).where(eq(verificationRecords.id, record!.id));
  await db.update(users).set({ ageStatus: "pending", updatedAt: new Date() }).where(eq(users.id, user.id));
  await audit(user.id, "verification.started", { type: "verification", id: record!.id }, { provider: provider.id });
  return session.redirectUrl;
}

/**
 * Applies an authenticated provider decision exactly once. The age decision
 * is made here, on the server: "approved" only counts when the verified date
 * of birth shows the person is at least 18 today.
 */
export async function applyDecision(providerId: string, d: VerificationDecision): Promise<"applied" | "duplicate" | "unknown_session"> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(webhookEvents)
      .values({ provider: providerId, kind: "verification", eventKey: d.eventKey })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    if (!inserted.length) return "duplicate";

    const [record] = await tx
      .select()
      .from(verificationRecords)
      .where(and(eq(verificationRecords.provider, providerId), eq(verificationRecords.providerSessionId, d.providerSessionId)))
      .for("update");
    if (!record) {
      await tx.update(webhookEvents).set({ processedAt: new Date(), outcome: "unknown_session" }).where(eq(webhookEvents.id, inserted[0]!.id));
      return "unknown_session";
    }

    let status: (typeof verificationRecords.$inferSelect)["status"];
    let reason = d.reasonCode ?? null;
    if (d.outcome === "verified") {
      const age = d.dateOfBirth ? ageInYears(d.dateOfBirth) : null;
      if (age === null) {
        status = "manual_review";
        reason = "dob_missing";
      } else if (age < 18) {
        status = "failed";
        reason = "underage";
      } else status = "verified";
    } else if (d.outcome === "manual_review") status = "manual_review";
    else if (d.outcome === "pending" || d.outcome === "resubmission") status = "pending";
    else status = "failed";

    const now = new Date();
    const validUntil = status === "verified" ? new Date(now.getTime() + env().VERIFICATION_VALIDITY_DAYS * 864e5) : null;
    await tx.update(verificationRecords).set({ status, reasonCode: reason, decisionAt: now, validUntil, updatedAt: now }).where(eq(verificationRecords.id, record.id));

    const userPatch: Partial<typeof users.$inferInsert> = { ageStatus: status, updatedAt: now };
    if (status === "verified") {
      userPatch.ageVerifiedAt = now;
      userPatch.ageVerifiedUntil = validUntil;
      if (d.identityParts?.length) userPatch.identityFingerprint = identityFingerprint(d.identityParts);
    }
    await tx.update(users).set(userPatch).where(eq(users.id, record.userId));
    await tx.update(webhookEvents).set({ processedAt: now, outcome: status }).where(eq(webhookEvents.id, inserted[0]!.id));
    await audit(null, "verification.decision", { type: "user", id: record.userId }, { provider: providerId, status, reason });
    return "applied";
  });
}
