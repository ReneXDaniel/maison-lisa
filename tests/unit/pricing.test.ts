import { describe, expect, it } from "vitest";
import { allocate, includedVat, priceLines, eligibleLines, type DiscountRule, type PricingLine } from "@/lib/pricing";

const line = (key: string, priceCents: number, extra: Partial<PricingLine> = {}): PricingLine => ({ key, kind: "product", productId: key, collectionId: "c1", priceCents, ...extra });
const rule = (over: Partial<DiscountRule> = {}): DiscountRule => ({
  id: "r1", code: "CODE", name: "Code", kind: "percent", value: 10, scope: "order",
  productIds: [], collectionIds: [], excludedProductIds: [], minOrderCents: 0, stackable: false, isWelcome: false, ...over,
});

describe("priceLines", () => {
  it("sums a cart with no discounts", () => {
    const r = priceLines([line("a", 2900), line("b", 4500)], []);
    expect(r).toMatchObject({ subtotalCents: 7400, discountCents: 0, totalCents: 7400 });
  });

  it("applies a percentage discount and allocates it across lines exactly", () => {
    const r = priceLines([line("a", 2900), line("b", 4500)], [rule({ value: 10 })]);
    expect(r.discountCents).toBe(740);
    expect(r.totalCents).toBe(6660);
    expect(r.lines.reduce((s, l) => s + l.discountCents, 0)).toBe(740);
  });

  it("never produces a negative total with a large fixed discount", () => {
    const r = priceLines([line("a", 1000)], [rule({ kind: "fixed", value: 5000 })]);
    expect(r.totalCents).toBe(0);
    expect(r.discountCents).toBe(1000);
  });

  it("respects minimum order values", () => {
    const r = priceLines([line("a", 1000)], [rule({ minOrderCents: 2000 })]);
    expect(r.discountCents).toBe(0);
  });

  it("applies only one promotion when stacking is disabled", () => {
    const welcome = rule({ id: "w", code: null, isWelcome: true, value: 10 });
    const code = rule({ id: "c", value: 20 });
    const r = priceLines([line("a", 10000)], [welcome, code], { allowStacking: false });
    expect(r.applied.map((a) => a.id)).toEqual(["w"]);
    expect(r.totalCents).toBe(9000);
  });

  it("stacks sequentially when allowed and both rules are stackable", () => {
    const welcome = rule({ id: "w", code: null, isWelcome: true, value: 10, stackable: true });
    const code = rule({ id: "c", value: 20, stackable: true });
    const r = priceLines([line("a", 10000)], [welcome, code], { allowStacking: true });
    expect(r.totalCents).toBe(7200); // 10000 → 9000 → 7200
  });

  it("scopes product and collection discounts and excludes private offers", () => {
    const lines = [line("a", 3000, { collectionId: "silk" }), line("b", 3000, { collectionId: "other" }), { key: "o", kind: "offer" as const, productId: null, collectionId: null, priceCents: 3500 }];
    expect(eligibleLines(lines, rule({ scope: "collections", collectionIds: ["silk"] })).map((l) => l.key)).toEqual(["a"]);
    expect(eligibleLines(lines, rule({ scope: "products", productIds: ["b"] })).map((l) => l.key)).toEqual(["b"]);
    expect(eligibleLines(lines, rule({ scope: "order", excludedProductIds: ["a"] })).map((l) => l.key)).toEqual(["b", "o"]);
  });

  it("caps percentages at 100", () => {
    expect(priceLines([line("a", 999)], [rule({ value: 250 })]).totalCents).toBe(0);
  });
});

describe("allocate", () => {
  it("distributes remainders deterministically and never exceeds weights", () => {
    const shares = allocate(100, [333, 333, 334]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
    shares.forEach((s, i) => expect(s).toBeLessThanOrEqual([333, 333, 334][i]!));
  });
  it("returns zeros for empty weights", () => {
    expect(allocate(50, [0, 0])).toEqual([0, 0]);
  });
});

describe("includedVat", () => {
  it("extracts German VAT from a gross price", () => {
    expect(includedVat(11900, 1900)).toBe(1900);
    expect(includedVat(3500, 1900)).toBe(559);
  });
  it("is zero for a zero rate", () => {
    expect(includedVat(5000, 0)).toBe(0);
  });
});
