import "server-only";
import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { discountRedemptions, discounts, orders, users } from "@/db/schema";
import { getSettings } from "./settings";
import { priceLines, eligibleLines, type DiscountRule, type PricingLine, type PricingResult } from "./pricing";
import { formatMoney } from "./format";

type Discount = typeof discounts.$inferSelect;
type Exec = typeof db | Tx;

export const toRule = (d: Discount): DiscountRule => ({
  id: d.id,
  code: d.code,
  name: d.name,
  kind: d.kind,
  value: d.value,
  scope: d.scope,
  productIds: d.productIds,
  collectionIds: d.collectionIds,
  excludedProductIds: d.excludedProductIds,
  minOrderCents: d.minOrderCents,
  stackable: d.stackable,
  isWelcome: d.isWelcome,
});

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);

export class DiscountError extends Error {
  constructor(
    public code: string,
    public values: Record<string, string> = {},
  ) {
    super(code);
  }
}

const LIVE = ["reserved", "redeemed"] as const;

async function hasPaidOrder(x: Exec, userId: string) {
  const [r] = await x
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.userId, userId), inArray(orders.status, ["paid", "refunded", "chargeback"])));
  return Number(r?.n ?? 0) > 0;
}

export async function getWelcomeDiscount(x: Exec = db): Promise<Discount | null> {
  const [d] = await x.select().from(discounts).where(and(eq(discounts.isWelcome, true), eq(discounts.active, true))).limit(1);
  return d ?? null;
}

/** Welcome discount: first order only, one per account and (optionally) one per verified identity. */
export async function welcomeEligible(x: Exec, userId: string, excludeOrderId?: string): Promise<boolean> {
  const welcome = await getWelcomeDiscount(x);
  if (!welcome) return false;
  if (await hasPaidOrder(x, userId)) return false;
  const [mine] = await x
    .select({ n: count() })
    .from(discountRedemptions)
    .where(and(eq(discountRedemptions.discountId, welcome.id), eq(discountRedemptions.userId, userId), eq(discountRedemptions.status, "redeemed")));
  if (Number(mine?.n ?? 0) > 0) return false;
  const settings = await getSettings();
  if (settings.welcomeOncePerIdentity) {
    const [u] = await x.select({ fp: users.identityFingerprint }).from(users).where(eq(users.id, userId));
    if (u?.fp) {
      const [other] = await x
        .select({ n: count() })
        .from(discountRedemptions)
        .where(
          and(
            eq(discountRedemptions.discountId, welcome.id),
            eq(discountRedemptions.identityFingerprint, u.fp),
            eq(discountRedemptions.status, "redeemed"),
            excludeOrderId ? ne(discountRedemptions.orderId, excludeOrderId) : undefined,
          ),
        );
      if (Number(other?.n ?? 0) > 0) return false;
    }
  }
  return true;
}

/** Validates a promotional code for a (possibly anonymous) customer and cart. Throws DiscountError. */
export async function validateCode(x: Exec, rawCode: string, userId: string | null, lines: PricingLine[], locale = "de"): Promise<Discount> {
  const code = normalizeCode(rawCode);
  if (!code) throw new DiscountError("discount_invalid");
  const [d] = await x.select().from(discounts).where(eq(discounts.code, code));
  if (!d || !d.active || d.isWelcome) throw new DiscountError("discount_invalid");
  const now = Date.now();
  if (d.startsAt && d.startsAt.getTime() > now) throw new DiscountError("discount_not_started");
  if (d.endsAt && d.endsAt.getTime() < now) throw new DiscountError("discount_expired");
  if (d.customerId && d.customerId !== userId) throw new DiscountError(userId ? "discount_customer" : "discount_invalid");
  if (d.maxRedemptions != null) {
    const [r] = await x
      .select({ n: count() })
      .from(discountRedemptions)
      .where(and(eq(discountRedemptions.discountId, d.id), inArray(discountRedemptions.status, [...LIVE])));
    if (Number(r?.n ?? 0) >= d.maxRedemptions) throw new DiscountError("discount_exhausted");
  }
  if (userId) {
    const [r] = await x
      .select({ n: count() })
      .from(discountRedemptions)
      .where(and(eq(discountRedemptions.discountId, d.id), eq(discountRedemptions.userId, userId), eq(discountRedemptions.status, "redeemed")));
    if (Number(r?.n ?? 0) >= Math.max(1, d.perCustomerLimit)) throw new DiscountError("discount_used");
    if (d.firstOrderOnly && (await hasPaidOrder(x, userId))) throw new DiscountError("discount_first_order");
  }
  const subtotal = lines.reduce((s, l) => s + l.priceCents, 0);
  if (subtotal < d.minOrderCents) throw new DiscountError("discount_min_order", { amount: formatMoney(d.minOrderCents, locale) });
  if (!eligibleLines(lines, toRule(d)).length) throw new DiscountError("discount_not_applicable");
  return d;
}

export type CartPricing = PricingResult & {
  codeError: { code: string; values: Record<string, string> } | null;
  codeApplied: string | null;
  welcomeApplied: boolean;
  /** Guests: a welcome discount exists and will be checked after sign-in. */
  welcomeHintPercent: number | null;
};

/**
 * Prices a cart for display or checkout. The welcome discount is applied
 * automatically for eligible customers; a code is validated and, unless
 * stacking is enabled, cannot be combined with the welcome discount.
 */
export async function priceCart(x: Exec, userId: string | null, lines: PricingLine[], code: string | null, locale = "de", opts: { excludeOrderId?: string } = {}): Promise<CartPricing> {
  const settings = await getSettings();
  const rules: DiscountRule[] = [];
  let welcomeHintPercent: number | null = null;
  let welcomeApplies = false;

  const welcome = await getWelcomeDiscount(x);
  if (welcome && lines.length) {
    if (userId) {
      welcomeApplies = (await welcomeEligible(x, userId, opts.excludeOrderId)) && lines.reduce((s, l) => s + l.priceCents, 0) >= welcome.minOrderCents;
      if (welcomeApplies) rules.push(toRule(welcome));
    } else if (welcome.kind === "percent") welcomeHintPercent = welcome.value;
  }

  let codeError: CartPricing["codeError"] = null;
  let codeApplied: string | null = null;
  if (code) {
    try {
      const d = await validateCode(x, code, userId, lines, locale);
      if (welcomeApplies && !(settings.allowDiscountStacking && d.stackable && welcome?.stackable)) {
        codeError = { code: "discount_conflict_welcome", values: {} };
      } else {
        rules.push(toRule(d));
        codeApplied = d.code;
      }
    } catch (e) {
      if (e instanceof DiscountError) codeError = { code: e.code, values: e.values };
      else throw e;
    }
  }

  const result = priceLines(lines, rules, { allowStacking: settings.allowDiscountStacking });
  return {
    ...result,
    codeError,
    codeApplied: result.applied.some((a) => a.code === codeApplied) ? codeApplied : null,
    welcomeApplied: result.applied.some((a) => a.isWelcome),
    welcomeHintPercent,
  };
}

/** Locks discount rows for the duration of a checkout transaction (prevents over-redemption races). */
export async function lockDiscounts(tx: Tx, ids: string[]) {
  if (ids.length) await tx.execute(sql`select id from ${discounts} where ${inArray(discounts.id, ids)} for update`);
}
