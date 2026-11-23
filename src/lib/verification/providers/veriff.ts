import "server-only";
import { env } from "@/lib/env";
import { hmacHex, safeEqual } from "@/lib/crypto";
import { WebhookSignatureError, type VerificationDecision, type VerificationProvider } from "../types";

/**
 * Veriff adapter (provider-hosted flow: document + liveness on Veriff's pages).
 *
 * Implemented against Veriff's public API v1:
 *  - POST {base}/v1/sessions  (X-AUTH-CLIENT: API key) → verification.url
 *  - Decision webhook: JSON body signed with HMAC-SHA256 of the raw body
 *    using the shared secret, sent in the X-HMAC-SIGNATURE header.
 *
 * ⚠ Before production: confirm field names and status values against the
 * current Veriff documentation and your integration's sandbox, configure the
 * decision webhook URL (/api/webhooks/verification/veriff) in the Veriff
 * dashboard, and confirm that your contract covers age verification for this
 * business category and the jurisdictions you serve (e.g. KJM recognition
 * for Germany).
 */
type VeriffDecision = {
  status?: string;
  verification?: {
    id?: string;
    status?: "approved" | "declined" | "resubmission_requested" | "review" | "expired" | "abandoned" | string;
    code?: number;
    reasonCode?: number | null;
    decisionTime?: string | null;
    vendorData?: string | null;
    person?: { firstName?: string | null; lastName?: string | null; dateOfBirth?: string | null } | null;
  };
};

export class VeriffProvider implements VerificationProvider {
  readonly id = "veriff" as const;

  private creds() {
    const e = env();
    if (!e.VERIFF_API_KEY || !e.VERIFF_SHARED_SECRET) throw new Error("Veriff is not configured (VERIFF_API_KEY / VERIFF_SHARED_SECRET)");
    return { apiKey: e.VERIFF_API_KEY, secret: e.VERIFF_SHARED_SECRET, base: e.VERIFF_BASE_URL };
  }

  async createSession(input: { recordId: string; locale: string; returnUrl: string }) {
    const { apiKey, base } = this.creds();
    const res = await fetch(`${base}/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AUTH-CLIENT": apiKey },
      body: JSON.stringify({ verification: { callback: input.returnUrl, vendorData: input.recordId } }),
    });
    if (!res.ok) throw new Error(`Veriff session creation failed: ${res.status}`);
    const data = (await res.json()) as { verification?: { id?: string; url?: string } };
    if (!data.verification?.id || !data.verification.url) throw new Error("Veriff response missing verification id/url");
    return { providerSessionId: data.verification.id, redirectUrl: data.verification.url };
  }

  async parseWebhook(req: Request, rawBody: string): Promise<VerificationDecision | null> {
    const { apiKey, secret } = this.creds();
    const sig = (req.headers.get("x-hmac-signature") ?? "").toLowerCase();
    const client = req.headers.get("x-auth-client") ?? "";
    if (!sig || !safeEqual(sig, hmacHex(rawBody, secret)) || (client && client !== apiKey)) throw new WebhookSignatureError("Invalid Veriff signature");

    const body = JSON.parse(rawBody) as VeriffDecision;
    const v = body.verification;
    if (!v?.id || !v.status) return null; // e.g. event webhooks (started/submitted) — nothing to decide
    const outcome =
      v.status === "approved"
        ? "verified"
        : v.status === "review"
          ? "manual_review"
          : v.status === "resubmission_requested"
            ? "resubmission"
            : "failed";
    return {
      providerSessionId: v.id,
      eventKey: `${v.id}:${v.status}:${v.decisionTime ?? v.code ?? ""}`,
      outcome,
      dateOfBirth: v.person?.dateOfBirth ?? null,
      identityParts: v.person?.firstName && v.person?.lastName && v.person?.dateOfBirth ? [v.person.firstName, v.person.lastName, v.person.dateOfBirth] : undefined,
      reasonCode: v.reasonCode != null ? String(v.reasonCode) : v.status,
    };
  }
}
