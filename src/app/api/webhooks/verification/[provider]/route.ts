import { NextResponse } from "next/server";
import { verificationProvider, applyDecision } from "@/lib/verification/service";
import { WebhookSignatureError } from "@/lib/verification/types";
import { env } from "@/lib/env";

/**
 * Provider → server verification callbacks. The ONLY path through which a
 * user's age status can become "verified". Signature is checked against the
 * raw body before anything is parsed or trusted.
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await ctx.params;
  if (providerId !== env().VERIFICATION_PROVIDER) return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  const raw = await req.text();
  if (raw.length > 256_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  try {
    const provider = verificationProvider(providerId);
    const decision = await provider.parseWebhook(req, raw);
    if (!decision) return NextResponse.json({ ok: true, ignored: true });
    const result = await applyDecision(provider.id, decision);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    if (e instanceof WebhookSignatureError) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    console.error("[webhook:verification]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
