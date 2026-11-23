export type VerificationOutcome = "verified" | "failed" | "manual_review" | "pending" | "resubmission";

/** Normalised result of a provider callback. Contains only what is needed to decide — no document images. */
export type VerificationDecision = {
  providerSessionId: string;
  /** Unique per callback, used for idempotency. */
  eventKey: string;
  outcome: VerificationOutcome;
  /** YYYY-MM-DD as reported by the provider. Used transiently to compute age; never persisted. */
  dateOfBirth?: string | null;
  /** Normalised identity attributes for the pseudonymous fingerprint (HMAC'd, never stored raw). */
  identityParts?: string[];
  reasonCode?: string | null;
};

export interface VerificationProvider {
  readonly id: "dev" | "veriff";
  /** Creates a provider-hosted verification session and returns the URL to send the customer to. */
  createSession(input: { recordId: string; userId: string; locale: string; returnUrl: string }): Promise<{ providerSessionId: string; redirectUrl: string }>;
  /** Authenticates and parses a callback. MUST throw if the signature is missing or invalid. */
  parseWebhook(req: Request, rawBody: string): Promise<VerificationDecision | null>;
}

export class WebhookSignatureError extends Error {}
