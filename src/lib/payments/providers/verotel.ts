import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { PaymentSignatureError, type CheckoutInput, type PaymentEvent, type PaymentProvider } from "../types";

/**
 * Verotel FlexPay adapter (hosted payment page; Verotel accepts adult-content
 * merchants and can act as merchant of record).
 *
 * Signature scheme as documented for FlexPay: SHA-256 (lowercase hex) of
 *   signatureKey + ":" + "k1=v1" + ":" + "k2=v2" …  (parameters sorted by name)
 * The same scheme authenticates postbacks; Verotel expects the plain-text
 * response "OK".
 *
 * ⚠ UNVERIFIED AGAINST A LIVE ACCOUNT. Before production: confirm parameter
 * names, the event values sent in postbacks (sale/credit/chargeback), the
 * signature scheme and IP allowlisting against Verotel's current FlexPay
 * documentation and your merchant test account; configure the postback URL
 * (/api/webhooks/payment/verotel) in the Verotel Control Center.
 */
function sign(params: Record<string, string>, key: string) {
  const parts = Object.keys(params)
    .filter((k) => k !== "signature" && params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`);
  return createHash("sha256").update([key, ...parts].join(":")).digest("hex");
}

export class VerotelProvider implements PaymentProvider {
  readonly id = "verotel" as const;
  readonly displayName = "Verotel";

  private creds() {
    const e = env();
    if (!e.VEROTEL_SHOP_ID || !e.VEROTEL_SIGNATURE_KEY) throw new Error("Verotel is not configured (VEROTEL_SHOP_ID / VEROTEL_SIGNATURE_KEY)");
    return { shopID: e.VEROTEL_SHOP_ID, key: e.VEROTEL_SIGNATURE_KEY, url: e.VEROTEL_FLEXPAY_URL };
  }

  async createCheckout(input: CheckoutInput) {
    const { shopID, key, url } = this.creds();
    const params: Record<string, string> = {
      version: "4",
      shopID,
      type: "purchase",
      priceAmount: (input.totalCents / 100).toFixed(2),
      priceCurrency: input.currency,
      description: input.description.slice(0, 100),
      referenceID: input.orderNumber,
      email: input.customerEmail,
      successURL: input.successUrl,
      declineURL: input.cancelUrl,
    };
    params.signature = sign(params, key);
    return { redirectUrl: `${url}?${new URLSearchParams(params)}`, providerRef: undefined };
  }

  async parseWebhook(req: Request, raw: string): Promise<PaymentEvent | null> {
    const { key } = this.creds();
    const source = req.method === "GET" ? new URL(req.url).searchParams : new URLSearchParams(raw);
    const params = Object.fromEntries(source.entries());
    if (!params.signature || !safeEqual(params.signature.toLowerCase(), sign(params, key))) throw new PaymentSignatureError("Invalid Verotel signature");
    if (!params.referenceID) return null;
    const event = (params.event ?? params.type ?? "").toLowerCase();
    const type: PaymentEvent["type"] | null =
      event === "credit" ? "refunded" : event === "chargeback" ? "chargeback" : ["initial", "purchase", "sale"].includes(event) ? "paid" : null;
    if (!type) return null;
    return {
      eventKey: `${params.saleID ?? params.transactionID ?? params.referenceID}:${event}`,
      orderNumber: params.referenceID,
      type,
      amountCents: params.priceAmount ? Math.round(Number(params.priceAmount) * 100) : undefined,
      currency: params.priceCurrency,
      providerRef: params.saleID ?? params.transactionID,
    };
  }

  ackResponse() {
    return new Response("OK", { headers: { "Content-Type": "text/plain" } });
  }
}
