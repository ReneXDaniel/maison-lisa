import { BASE, addProduct, cents, expect, payAtCheckout, registerVerified, test } from "./support";

/**
 * Scenario D — Discount code: validated by the backend, shown in cart and
 * checkout, paid, and redeemed exactly once.
 * The welcome discount covers a first order and does not stack with codes
 * by default, so the customer places a first order before using LISA15
 * (15 % from €30, once per customer — seeded demo code).
 */
test("Scenario D — promotional code is validated, applied and redeemed once", async ({ page, adminPage }) => {
  await registerVerified(page, "Sofia");
  await page.click("[data-testid=verification-continue]");

  // First order (welcome discount).
  await addProduct(page, "a-single-pearl");
  await page.goto(`${BASE}/en/checkout`);
  await payAtCheckout(page);

  // Redemptions of LISA15 before this customer's order.
  const lisa15Row = () => adminPage.getByRole("row").filter({ hasText: "LISA15" });
  await adminPage.goto(`${BASE}/en/admin/discounts`);
  const redemptionsBefore = Number((await lisa15Row().getByTestId("discount-redemptions").textContent())?.trim());

  // Cart with two products.
  await addProduct(page, "veil-of-light");
  await addProduct(page, "quiet-hours");
  await page.goto(`${BASE}/en/cart`);

  // Unknown and inactive codes are refused by the backend.
  for (const code of ["NOPE-123", "MAISON20"]) {
    await page.fill("[data-testid=code-input]", code);
    await page.click("[data-testid=code-apply]");
    await expect(page.getByTestId("code-error")).toBeVisible();
  }

  // A valid code (case-insensitive) applies; the total updates.
  await page.fill("[data-testid=code-input]", "lisa15");
  await page.click("[data-testid=code-apply]");
  await expect(page.getByTestId("code-applied")).toBeVisible();
  await expect(page.getByTestId("discount-line")).toHaveCount(1);
  const subtotal = 3500 + 2400;
  const expected = subtotal - Math.round(subtotal * 0.15);
  expect(cents(await page.getByTestId("total").textContent())).toBe(expected);

  // Checkout recomputes server-side and shows the same discount.
  await page.click("[data-testid=to-checkout]");
  await page.waitForURL(/\/en\/checkout$/);
  await expect(page.locator("[data-testid=discount-line][data-kind=code]")).toContainText("LISA15");
  expect(cents(await page.getByTestId("checkout-total").textContent())).toBe(expected);
  await payAtCheckout(page);

  // Redemption recorded exactly once …
  await adminPage.reload();
  await expect(lisa15Row().getByTestId("discount-redemptions")).toHaveText(String(redemptionsBefore + 1));

  // … and the per-customer limit is enforced afterwards.
  await addProduct(page, "silk-and-shadow");
  await page.goto(`${BASE}/en/cart`);
  await page.fill("[data-testid=code-input]", "LISA15");
  await page.click("[data-testid=code-apply]");
  await expect(page.getByTestId("code-error")).toContainText("already used");
});
