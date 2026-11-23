"use server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { randomUUID } from "node:crypto";
import { requireAction, safeNext, ActionError } from "@/lib/auth/guards";
import { startVerification } from "@/lib/verification/service";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { devSimulatorsEnabled, env } from "@/lib/env";
import { verifyToken } from "@/lib/crypto";
import { signDevPayload } from "@/lib/verification/providers/dev";

export async function startVerificationAction(_: unknown, fd: FormData): Promise<{ error?: string } | null> {
  const locale = await getLocale();
  const next = safeNext(String(fd.get("next") ?? ""), "/account");
  let url: string;
  try {
    const user = await requireAction("email");
    if (!(await rateLimit(`verify:${user.id}`, LIMITS.verificationStart.limit, LIMITS.verificationStart.window))) return { error: "rate_limited" };
    url = await startVerification(user, locale, next);
  } catch (e) {
    if (e instanceof ActionError) {
      if (e.code === "auth_required") redirect(`/${locale}/auth/login?next=${encodeURIComponent(`/verify?next=${next}`)}`);
      return { error: e.code };
    }
    throw e;
  }
  redirect(url);
}

/**
 * DEV ONLY: plays the role of the identity provider by sending a signed
 * callback to our real webhook endpoint, then returning the customer.
 */
export async function simulateVerificationAction(fd: FormData) {
  if (!devSimulatorsEnabled()) throw new Error("Simulator disabled");
  const data = verifyToken<{ s: string; r: string; u: string; ret: string }>(String(fd.get("token") ?? ""));
  if (!data) throw new Error("Invalid simulator session");
  const outcome = String(fd.get("outcome"));
  const now = new Date();
  const dob =
    outcome === "minor"
      ? `${now.getUTCFullYear() - 16}-06-15`
      : `${now.getUTCFullYear() - 29}-03-21`;
  const payload = {
    sessionId: data.s,
    eventId: randomUUID(),
    outcome: outcome === "adult" || outcome === "minor" ? "verified" : outcome === "review" ? "manual_review" : "failed",
    dateOfBirth: outcome === "adult" || outcome === "minor" ? dob : undefined,
    name: `dev user ${data.u}`,
  };
  const { raw, signature } = signDevPayload(payload);
  const res = await fetch(new URL("/api/webhooks/verification/dev", env().APP_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Dev-Signature": signature },
    body: raw,
  });
  if (!res.ok) throw new Error(`Webhook rejected: ${res.status}`);
  redirect(data.ret);
}
