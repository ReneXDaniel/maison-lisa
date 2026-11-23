import "server-only";
import { devSimulatorsEnabled, env } from "@/lib/env";
import { hmacHex, safeEqual, signToken } from "@/lib/crypto";
import { PaymentSignatureError, type CheckoutInput, type PaymentEvent, type PaymentProvider } from "../types";

/**
 * DEVELOPMENT SIMULATOR — no money moves. Mimics a hosted checkout and sends
 * HMAC-signed notifications to the real webhook endpoint, so order
 * fulfilment runs exactly as it would in production. Refuses to run in production.
 */
export class DevPaymentProvider implements PaymentProvider {
  readonly id = "dev" as const;
  readonly displayName = "Development simulator";

  private guard() {
    if (!devSimulatorsEnabled()) throw new Error("Development payment simulator is disabled");
  }

  async createCheckout(input: CheckoutInput) {
    this.guard();
    const token = signToken({ o: input.orderId, n: input.orderNumber, a: input.totalCents, c: input.currency, ok: input.successUrl, no: input.cancelUrl }, 3600);
    return { redirectUrl: `/${input.locale}/dev/payment?token=${encodeURIComponent(token)}`, providerRef: `devpay_${input.orderNumber}` };
  }

  async parseWebhook(req: Request, raw: string): Promise<PaymentEvent | null> {
    this.guard();
    const sig = req.headers.get("x-dev-signature") ?? "";
    if (!sig || !safeEqual(sig, hmacHex(raw, env().DEV_WEBHOOK_SECRET))) throw new PaymentSignatureError("Invalid dev signature");
    return JSON.parse(raw) as PaymentEvent;
  }

  ackResponse() {
    return Response.json({ ok: true });
  }
}
