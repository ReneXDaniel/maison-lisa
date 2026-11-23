/**
 * Pure pricing engine (no I/O) — the single source of truth for totals.
 * All amounts are integer cents. Prices are gross (VAT-inclusive), as required
 * for consumer pricing in the EU.
 */

export type PricingLine = {
  key: string;
  kind: "product" | "offer";
  productId: string | null;
  collectionId: string | null;
  priceCents: number;
};

export type DiscountRule = {
  id: string;
  code: string | null;
  name: string;
  kind: "percent" | "fixed";
  value: number;
  scope: "order" | "products" | "collections";
  productIds: string[];
  collectionIds: string[];
  excludedProductIds: string[];
  minOrderCents: number;
  stackable: boolean;
  isWelcome: boolean;
};

export type PricedLine = PricingLine & { discountCents: number; totalCents: number };
export type AppliedDiscount = { id: string; code: string | null; name: string; isWelcome: boolean; amountCents: number };
export type PricingResult = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  applied: AppliedDiscount[];
};

/** Lines a rule can discount. Private offers are only covered by order-wide rules. */
export function eligibleLines<T extends PricingLine>(lines: T[], rule: DiscountRule): T[] {
  return lines.filter((l) => {
    if (l.productId && rule.excludedProductIds.includes(l.productId)) return false;
    if (rule.scope === "order") return true;
    if (l.kind !== "product" || !l.productId) return false;
    if (rule.scope === "products") return rule.productIds.includes(l.productId);
    return !!l.collectionId && rule.collectionIds.includes(l.collectionId);
  });
}

/** Distributes `amount` across weights proportionally (largest remainder), never exceeding each weight. */
export function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || amount <= 0) return weights.map(() => 0);
  const capped = Math.min(amount, total);
  const raw = weights.map((w) => (capped * w) / total);
  const base = raw.map((r) => Math.floor(r));
  let rest = capped - base.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    if (base[i]! < weights[i]!) {
      base[i]! += 1;
      rest -= 1;
    }
  }
  return base;
}

/** Discount amount a rule yields on the given (already discounted) line totals. */
export function ruleAmount(lines: PricedLine[], rule: DiscountRule, subtotalCents: number): number {
  if (subtotalCents < rule.minOrderCents) return 0;
  const eligible = eligibleLines(lines, rule);
  const base = eligible.reduce((s, l) => s + l.totalCents, 0);
  if (base <= 0) return 0;
  const amount = rule.kind === "percent" ? Math.floor((base * Math.min(Math.max(rule.value, 0), 100)) / 100) : Math.max(rule.value, 0);
  return Math.min(amount, base);
}

/**
 * Applies rules in order. Without stacking only the first applicable rule is
 * used. Each rule works on the remaining line totals, so totals never go
 * below zero.
 */
export function priceLines(lines: PricingLine[], rules: DiscountRule[], opts: { allowStacking: boolean } = { allowStacking: false }): PricingResult {
  const priced: PricedLine[] = lines.map((l) => ({ ...l, discountCents: 0, totalCents: Math.max(0, l.priceCents) }));
  const subtotalCents = priced.reduce((s, l) => s + l.totalCents, 0);
  const applied: AppliedDiscount[] = [];

  for (const rule of rules) {
    if (applied.length && !(opts.allowStacking && rule.stackable && applied.every((a) => rules.find((r) => r.id === a.id)?.stackable))) break;
    const amount = ruleAmount(priced, rule, subtotalCents);
    if (amount <= 0) continue;
    const targets = eligibleLines(priced, rule);
    const shares = allocate(amount, targets.map((l) => l.totalCents));
    targets.forEach((l, i) => {
      l.discountCents += shares[i]!;
      l.totalCents -= shares[i]!;
    });
    applied.push({ id: rule.id, code: rule.code, name: rule.name, isWelcome: rule.isWelcome, amountCents: amount });
  }

  const totalCents = priced.reduce((s, l) => s + l.totalCents, 0);
  return { lines: priced, subtotalCents, discountCents: subtotalCents - totalCents, totalCents, applied };
}

/** VAT contained in a gross amount. `rateBp` in basis points (1900 = 19 %). */
export function includedVat(grossCents: number, rateBp: number): number {
  if (rateBp <= 0) return 0;
  return Math.round((grossCents * rateBp) / (10000 + rateBp));
}
