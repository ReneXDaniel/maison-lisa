import "server-only";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { customOffers, customRequests, discountRedemptions, entitlements, orderItems, orders, paymentTransactions, profiles, users, webhookEvents } from "@/db/schema";
import { clearPurchasedFromCart } from "@/lib/cart";
import { notify, notifyAdmins } from "@/lib/notifications";
import { publish } from "@/lib/realtime/bus";
import { sendMail, absoluteUrl } from "@/lib/mail";
import { formatMoney } from "@/lib/format";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { serverTranslator } from "@/lib/i18n-server";
import type { PaymentEvent } from "./types";

type Outcome =
  | "duplicate"
  | "unknown_order"
  | "provider_mismatch"
  | "amount_mismatch"
  | "paid"
  | "already_paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "chargeback"
  | "ignored";

const PAYABLE = ["pending", "failed", "cancelled", "expired"] as const;

/**
 * Applies an authenticated payment event. The idempotency ledger row is
 * written in the same transaction as the order change, so a crash rolls both
 * back and the provider's retry is processed normally.
 */
export async function handlePaymentEvent(providerId: string, ev: PaymentEvent): Promise<Outcome> {
  const res = await db.transaction(async (tx) => {
    const ledger = await tx.insert(webhookEvents).values({ provider: providerId, kind: "payment", eventKey: ev.eventKey }).onConflictDoNothing().returning({ id: webhookEvents.id });
    if (!ledger.length) return { outcome: "duplicate" as Outcome };
    const done = async (outcome: Outcome) => {
      await tx.update(webhookEvents).set({ processedAt: new Date(), outcome }).where(eq(webhookEvents.id, ledger[0]!.id));
      return outcome;
    };

    const [order] = await tx.select().from(orders).where(eq(orders.number, ev.orderNumber)).for("update");
    if (!order) return { outcome: await done("unknown_order") };
    if (order.paymentProvider !== providerId) return { outcome: await done("provider_mismatch") };
    const now = new Date();

    if (ev.type === "paid") {
      if ((ev.amountCents != null && ev.amountCents !== order.totalCents) || (ev.currency && ev.currency !== order.currency)) {
        await tx.insert(paymentTransactions).values({ orderId: order.id, provider: providerId, providerRef: ev.providerRef, type: "payment", status: "failed", amountCents: ev.amountCents ?? 0, currency: ev.currency ?? order.currency, meta: { reason: "amount_mismatch", expected: order.totalCents } });
        return { outcome: await done("amount_mismatch"), order };
      }
      const updated = await tx
        .update(orders)
        .set({ status: "paid", paidAt: now, paymentRef: ev.providerRef ?? order.paymentRef, updatedAt: now })
        .where(and(eq(orders.id, order.id), inArray(orders.status, [...PAYABLE])))
        .returning();
      if (!updated.length) return { outcome: await done("already_paid") };
      await tx.insert(paymentTransactions).values({ orderId: order.id, provider: providerId, providerRef: ev.providerRef, type: "payment", status: "succeeded", amountCents: order.totalCents, currency: order.currency });
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const it of items) {
        if (!order.userId) continue;
        await tx.insert(entitlements).values({ userId: order.userId, orderId: order.id, productId: it.productId, offerId: it.offerId }).onConflictDoNothing();
      }
      await tx.update(discountRedemptions).set({ status: "redeemed", updatedAt: now }).where(eq(discountRedemptions.orderId, order.id));
      const offerIds = items.map((i) => i.offerId).filter(Boolean) as string[];
      if (offerIds.length) {
        const offs = await tx.update(customOffers).set({ status: "paid", updatedAt: now }).where(inArray(customOffers.id, offerIds)).returning();
        const reqIds = offs.map((o) => o.requestId).filter(Boolean) as string[];
        if (reqIds.length) await tx.update(customRequests).set({ status: "paid", updatedAt: now }).where(inArray(customRequests.id, reqIds));
      }
      return { outcome: await done("paid"), order, productIds: items.map((i) => i.productId).filter(Boolean) as string[], offerIds };
    }

    if (ev.type === "failed" || ev.type === "cancelled") {
      const updated = await tx
        .update(orders)
        .set({ status: ev.type, updatedAt: now })
        .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
        .returning();
      if (updated.length) {
        // A failed payment must not consume a promotion.
        await tx.update(discountRedemptions).set({ status: "released", updatedAt: now }).where(and(eq(discountRedemptions.orderId, order.id), eq(discountRedemptions.status, "reserved")));
        await tx.insert(paymentTransactions).values({ orderId: order.id, provider: providerId, providerRef: ev.providerRef, type: "payment", status: "failed", amountCents: order.totalCents, currency: order.currency, meta: { event: ev.type } });
      }
      return { outcome: await done(updated.length ? ev.type : "ignored"), order };
    }

    // refunded / chargeback
    const updated = await tx
      .update(orders)
      .set({ status: ev.type, refundedAt: now, updatedAt: now })
      .where(and(eq(orders.id, order.id), eq(orders.status, "paid")))
      .returning();
    if (!updated.length) return { outcome: await done("ignored") };
    await tx
      .update(entitlements)
      .set({ revokedAt: now, revokeReason: ev.type })
      .where(and(eq(entitlements.orderId, order.id)));
    if (ev.type === "refunded") await tx.update(discountRedemptions).set({ status: "released", updatedAt: now }).where(eq(discountRedemptions.orderId, order.id));
    await tx.insert(paymentTransactions).values({ orderId: order.id, provider: providerId, providerRef: ev.providerRef, type: ev.type === "refunded" ? "refund" : "chargeback", status: "succeeded", amountCents: ev.amountCents ?? order.totalCents, currency: order.currency });
    return { outcome: await done(ev.type), order };
  });

  // Side effects after commit.
  const order = "order" in res ? res.order : undefined;
  if (!order) return res.outcome;
  await audit(null, `payment.${res.outcome}`, { type: "order", id: order.id }, { provider: providerId, eventKey: ev.eventKey });
  const customer = order.userId
    ? (await db.select({ email: users.email, locale: profiles.locale, notify: profiles.notifyEmailOrders }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, order.userId)))[0]
    : undefined;
  const locale = order.locale;

  if (res.outcome === "paid" && order.userId && "productIds" in res) {
    await clearPurchasedFromCart(order.userId, res.productIds ?? [], res.offerIds ?? []);
    await notify(order.userId, "order_paid", { number: order.number, orderId: order.id });
    await notify(order.userId, "product_available", { orderId: order.id });
    await notifyAdmins("admin_new_order", { number: order.number, orderId: order.id });
    await publish({ type: "order", to: { users: [order.userId], admins: true }, data: { orderId: order.id } });
    if (customer) await sendMail(customer.email, "orderConfirmation", locale, { number: order.number, total: formatMoney(order.totalCents, locale) }, absoluteUrl(`/${locale}/account/purchases`));
    const adminTo = env().ADMIN_NOTIFY_EMAIL;
    if (adminTo) await sendMail(adminTo, "adminNewOrder", "de", { number: order.number, total: formatMoney(order.totalCents, "de") }, absoluteUrl(`/de/admin/orders/${order.id}`));
  } else if (res.outcome === "amount_mismatch") {
    await notifyAdmins("admin_payment_issue", { number: order.number, orderId: order.id });
  } else if ((res.outcome === "refunded" || res.outcome === "chargeback") && order.userId) {
    await notify(order.userId, "refund_update", { number: order.number, orderId: order.id });
    await publish({ type: "order", to: { users: [order.userId], admins: true }, data: { orderId: order.id } });
    if (customer) {
      const t = await serverTranslator(locale, "account.orderStatus");
      await sendMail(customer.email, "refundUpdate", locale, { number: order.number, status: t(res.outcome) }, absoluteUrl(`/${locale}/account/orders/${order.id}`));
    }
  } else if (res.outcome === "failed") {
    await notifyAdmins("admin_payment_issue", { number: order.number, orderId: order.id });
  }
  return res.outcome;
}

/** Expires abandoned checkouts and releases their discount reservations. */
export async function expireStaleOrders() {
  const now = new Date();
  const stale = await db
    .update(orders)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(orders.status, "pending"), isNotNull(orders.checkoutExpiresAt), lt(orders.checkoutExpiresAt, now)))
    .returning({ id: orders.id });
  const ids = stale.map((s) => s.id);
  if (ids.length) await db.update(discountRedemptions).set({ status: "released", updatedAt: now }).where(and(inArray(discountRedemptions.orderId, ids), eq(discountRedemptions.status, "reserved")));
  return ids.length;
}
