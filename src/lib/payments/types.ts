export type PaymentEventType = "paid" | "failed" | "cancelled" | "refunded" | "chargeback";

/** Normalised, authenticated payment notification. */
export type PaymentEvent = {
  eventKey: string;
  orderNumber: string;
  type: PaymentEventType;
  amountCents?: number;
  currency?: string;
  providerRef?: string;
};

export type CheckoutInput = {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  currency: string;
  description: string;
  customerEmail: string;
  locale: string;
  successUrl: string;
  cancelUrl: string;
  notifyUrl: string;
};

export interface PaymentProvider {
  readonly id: "dev" | "verotel";
  readonly displayName: string;
  createCheckout(input: CheckoutInput): Promise<{ redirectUrl: string; providerRef?: string }>;
  /** Authenticates and parses a notification. MUST throw PaymentSignatureError on a bad signature. */
  parseWebhook(req: Request, rawBody: string): Promise<PaymentEvent | null>;
  /** Response body/status the provider expects after successful processing. */
  ackResponse(): Response;
}

export class PaymentSignatureError extends Error {}
