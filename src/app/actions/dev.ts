"use server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { devSimulatorsEnabled, env } from "@/lib/env";
import { hmacHex, verifyToken } from "@/lib/crypto";

/**
 * DEV ONLY: plays the payment provider — sends an HMAC-signed notification to
 * our real webhook endpoint, then returns the customer like a hosted page would.
 */
export async function simulatePaymentAction(fd: FormData) {
  if (!devSimulatorsEnabled()) throw new Error("Simulator disabled");
  const data = verifyToken<{ o: string; n: string; a: number; c: string; ok: string; no: string }>(String(fd.get("token") ?? ""));
  if (!data) throw new Error("Invalid simulator session");
  const outcome = String(fd.get("outcome"));
  if (outcome === "cancel") redirect(data.no);
  const event = { eventKey: randomUUID(), orderNumber: data.n, type: outcome === "success" ? "paid" : "failed", amountCents: data.a, currency: data.c, providerRef: `devpay_${data.n}` };
  const raw = JSON.stringify(event);
  const res = await fetch(new URL("/api/webhooks/payment/dev", env().APP_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Dev-Signature": hmacHex(raw, env().DEV_WEBHOOK_SECRET) },
    body: raw,
  });
  if (!res.ok) throw new Error(`Webhook rejected: ${res.status}`);
  redirect(outcome === "success" ? data.ok : data.no);
}

/** DEV ONLY: simulate a refund notification for an order (used from the admin order page). */
export async function simulateRefund(orderNumber: string, amountCents: number, type: "refunded" | "chargeback") {
  if (!devSimulatorsEnabled()) throw new Error("Simulator disabled");
  const raw = JSON.stringify({ eventKey: randomUUID(), orderNumber, type, amountCents, currency: "EUR" });
  const res = await fetch(new URL("/api/webhooks/payment/dev", env().APP_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Dev-Signature": hmacHex(raw, env().DEV_WEBHOOK_SECRET) },
    body: raw,
  });
  return res.ok;
}
