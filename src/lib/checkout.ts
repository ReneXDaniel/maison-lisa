import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { discountRedemptions, discounts, orderItems, orders, users } from "@/db/schema";
import { ActionError } from "./auth/guards";
import type { CurrentUser } from "./auth/session";
import { getCartLines, type CartLine } from "./cart";
import { lockDiscounts, normalizeCode, priceCart, getWelcomeDiscount } from "./discounts";
import { includedVat, type PricingLine } from "./pricing";
import { vatRateFor, CHECKOUT_COUNTRIES } from "./tax";
import { getSettings } from "./settings";
import { paymentProvider } from "./payments";
import { handlePaymentEvent } from "./payments/fulfillment";
import { absoluteUrl } from "./mail";
import { audit } from "./audit";
import { brand } from "@/config/brand";

export const toPricingLines = (lines: CartLine[]): PricingLine[] =>
  lines.map((l) => ({ key: l.itemId, kind: l.kind, productId: l.productId, collectionId: l.collectionId, priceCents: l.priceCents }));

/**
 * Creates a pending order from the customer's cart and returns the payment
 * redirect. Everything that matters (prices, eligibility, discounts, VAT) is
 * recomputed here on the server — nothing from the browser is trusted beyond
 * the country selection and the two legal confirmations.
 */
export async function startCheckout(user: CurrentUser, input: { country: string; locale: string; termsAccepted: boolean; waiverAccepted: boolean }) {
  if (!input.termsAccepted) throw new ActionError("terms_required");
  if (!input.waiverAccepted) throw new ActionError("waiver_required");
  if (!CHECKOUT_COUNTRIES.includes(input.country)) throw new ActionError("country_required");

  const { cart, lines } = await getCartLines(user, input.locale);
  if (!cart || !lines.length) throw new ActionError("cart_empty");
  if (lines.some((l) => l.unavailable)) throw new ActionError("cart_changed");
  const pricingLines = toPricingLines(lines);
  const settings = await getSettings();
  const provider = paymentProvider();

  const order = await db.transaction(async (tx) => {
    // Abandon earlier unpaid checkouts of this customer (and free their reservations).
    const stale = await tx
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(orders.userId, user.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });
    if (stale.length) {
      await tx
        .update(discountRedemptions)
        .set({ status: "released", updatedAt: new Date() })
        .where(and(inArray(discountRedemptions.orderId, stale.map((s) => s.id)), eq(discountRedemptions.status, "reserved")));
    }

    const welcome = await getWelcomeDiscount(tx);
    const code = cart.discountCode ? normalizeCode(cart.discountCode) : null;
    const [codeRow] = code ? await tx.select({ id: discounts.id }).from(discounts).where(eq(discounts.code, code)) : [];
    await lockDiscounts(tx, [welcome?.id, codeRow?.id].filter(Boolean) as string[]);

    const pricing = await priceCart(tx, user.id, pricingLines, code, input.locale);
    if (pricing.codeError && pricing.codeError.code !== "discount_conflict_welcome") throw new ActionError(pricing.codeError.code, pricing.codeError.values);

    const vatRateBp = vatRateFor(input.country);
    const seq = await tx.execute<{ n: string }>(sql`select nextval('order_number_seq') as n`);
    const number = `ML-${new Date().getFullYear()}-${String(seq.rows[0]!.n).padStart(6, "0")}`;
    const now = new Date();
    const [o] = await tx
      .insert(orders)
      .values({
        number,
        userId: user.id,
        status: "pending",
        currency: "EUR",
        subtotalCents: pricing.subtotalCents,
        discountCents: pricing.discountCents,
        totalCents: pricing.totalCents,
        vatRateBp,
        vatCents: includedVat(pricing.totalCents, vatRateBp),
        country: input.country,
        locale: input.locale,
        discountSummary: pricing.applied.map((a) => ({ id: a.id, code: a.code, name: a.name, amountCents: a.amountCents })),
        paymentProvider: pricing.totalCents === 0 ? "none" : provider.id,
        checkoutExpiresAt: new Date(now.getTime() + settings.checkoutSessionMinutes * 60_000),
        termsAcceptedAt: now,
        waiverAcceptedAt: now,
        customerEmailSnapshot: user.email,
      })
      .returning();
    await tx.insert(orderItems).values(
      pricing.lines.map((l) => {
        const src = lines.find((x) => x.itemId === l.key)!;
        return { orderId: o!.id, productId: l.productId, offerId: src.kind === "offer" ? src.offerId : null, title: src.title, unitPriceCents: l.priceCents, discountCents: l.discountCents, lineTotalCents: l.totalCents };
      }),
    );
    if (pricing.applied.length) {
      const [u] = await tx.select({ fp: users.identityFingerprint }).from(users).where(eq(users.id, user.id));
      await tx.insert(discountRedemptions).values(pricing.applied.map((a) => ({ discountId: a.id, orderId: o!.id, userId: user.id, identityFingerprint: u?.fp ?? null, status: "reserved" as const, amountCents: a.amountCents })));
    }
    return o!;
  });

  await audit(user.id, "checkout.start", { type: "order", id: order.id }, { totalCents: order.totalCents });
  const returnUrl = absoluteUrl(`/${input.locale}/checkout/return?order=${order.id}`);

  // Fully discounted orders need no payment provider.
  if (order.totalCents === 0) {
    await handlePaymentEvent("none", { eventKey: `free:${order.id}`, orderNumber: order.number, type: "paid", amountCents: 0, currency: order.currency });
    return `/${input.locale}/checkout/return?order=${order.id}`;
  }

  try {
    const session = await provider.createCheckout({
      orderId: order.id,
      orderNumber: order.number,
      totalCents: order.totalCents,
      currency: order.currency,
      description: `${brand.name} — ${order.number}`,
      customerEmail: user.email,
      locale: input.locale,
      successUrl: returnUrl,
      cancelUrl: absoluteUrl(`/${input.locale}/checkout/return?order=${order.id}&cancelled=1`),
      notifyUrl: absoluteUrl(`/api/webhooks/payment/${provider.id}`),
    });
    if (session.providerRef) await db.update(orders).set({ paymentRef: session.providerRef }).where(eq(orders.id, order.id));
    return session.redirectUrl;
  } catch (e) {
    console.error("[checkout] provider error", e);
    await handlePaymentEvent(provider.id, { eventKey: `init-failed:${order.id}`, orderNumber: order.number, type: "cancelled" });
    throw new ActionError("payment_failed");
  }
}
