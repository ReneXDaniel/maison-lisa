import { NextResponse } from "next/server";
import { paymentProvider } from "@/lib/payments";
import { PaymentSignatureError } from "@/lib/payments/types";
import { handlePaymentEvent } from "@/lib/payments/fulfillment";
import { env } from "@/lib/env";

/**
 * Payment provider notifications — the ONLY way an order becomes paid.
 * The browser's return to /checkout/return never unlocks anything.
 */
async function handle(req: Request, providerId: string) {
  if (providerId !== env().PAYMENT_PROVIDER) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const raw = req.method === "GET" ? "" : await req.text();
  if (raw.length > 256_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  try {
    const provider = paymentProvider(providerId);
    const ev = await provider.parseWebhook(req, raw);
    if (ev) await handlePaymentEvent(provider.id, ev);
    return provider.ackResponse();
  } catch (e) {
    if (e instanceof PaymentSignatureError) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    console.error("[webhook:payment]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  return handle(req, (await ctx.params).provider);
}

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  return handle(req, (await ctx.params).provider);
}
