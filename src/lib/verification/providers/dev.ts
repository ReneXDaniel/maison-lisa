import "server-only";
import { randomUUID } from "node:crypto";
import { devSimulatorsEnabled, env } from "@/lib/env";
import { hmacHex, safeEqual, signToken } from "@/lib/crypto";
import { WebhookSignatureError, type VerificationDecision, type VerificationProvider } from "../types";

/**
 * DEVELOPMENT SIMULATOR — not identity verification.
 *
 * Mirrors the shape of a provider-hosted flow so the rest of the system
 * (session records, signed webhook, idempotency, age computation, access
 * gating) is exercised exactly as in production. It refuses to run unless
 * NODE_ENV !== "production" and ALLOW_DEV_SIMULATORS=true.
 */
export class DevVerificationProvider implements VerificationProvider {
  readonly id = "dev" as const;

  private guard() {
    if (!devSimulatorsEnabled()) throw new Error("Development verification simulator is disabled");
  }

  async createSession(input: { recordId: string; userId: string; locale: string; returnUrl: string }) {
    this.guard();
    const providerSessionId = `devv_${randomUUID()}`;
    const token = signToken({ s: providerSessionId, r: input.recordId, u: input.userId, ret: input.returnUrl }, 3600);
    return { providerSessionId, redirectUrl: `/${input.locale}/dev/verification?token=${encodeURIComponent(token)}` };
  }

  async parseWebhook(req: Request, rawBody: string): Promise<VerificationDecision | null> {
    this.guard();
    const sig = req.headers.get("x-dev-signature") ?? "";
    if (!sig || !safeEqual(sig, hmacHex(rawBody, env().DEV_WEBHOOK_SECRET))) throw new WebhookSignatureError("Invalid dev signature");
    const body = JSON.parse(rawBody) as { sessionId: string; eventId: string; outcome: VerificationDecision["outcome"]; dateOfBirth?: string; name?: string };
    return {
      providerSessionId: body.sessionId,
      eventKey: body.eventId,
      outcome: body.outcome,
      dateOfBirth: body.dateOfBirth ?? null,
      identityParts: body.name && body.dateOfBirth ? [body.name, body.dateOfBirth] : undefined,
      reasonCode: `dev_${body.outcome}`,
    };
  }
}

/** Builds and signs a simulated provider callback (used by the dev simulator page). */
export function signDevPayload(payload: object) {
  const raw = JSON.stringify(payload);
  return { raw, signature: hmacHex(raw, env().DEV_WEBHOOK_SECRET) };
}
