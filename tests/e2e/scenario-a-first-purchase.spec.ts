import { BASE, cents, confirmEmailAndVerifyAge, expect, expectProtectedDownload, fillRegistration, payAtCheckout, test, unique } from "./support";

/**
 * Scenario A — First-time customer: explores, fills a cart as a guest,
 * registers at checkout, verifies e-mail and age, keeps the cart, receives
 * the first-order discount, pays once for everything and downloads.
 */
test("Scenario A — first-time customer buys several products in one payment", async ({ browser }) => {
  // A brand-new visitor: no cookies at all, so the 18+ notice is shown.
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${BASE}/en`);
  await page.click("[data-testid=age-enter]");
  await expect(page.getByTestId("hero")).toBeVisible();

  // Browse permitted collections.
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Collections" }).click();
  await page.waitForURL(/\/en\/collections$/);
  await page.getByRole("link", { name: "Discover the collection" }).first().click();
  await page.waitForURL(/\/en\/collections\/[a-z-]+$/);

  // Add several products as a guest.
  await page.goto(`${BASE}/en/shop`);
  for (const slug of ["ivory-morning", "quiet-hours"]) {
    await page.locator(`[data-testid=product-card][data-slug="${slug}"] [data-testid=add-to-cart]`).click();
  }
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  // Checkout requires an account.
  await page.goto(`${BASE}/en/cart`);
  await expect(page.getByTestId("cart-line")).toHaveCount(2);
  await page.click("[data-testid=to-checkout]");
  await page.waitForURL(/\/auth\/login/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.waitForURL(/\/auth\/register/);

  const who = unique("Amelie");
  await fillRegistration(page, who);
  await confirmEmailAndVerifyAge(page, who.email);
  await page.click("[data-testid=verification-continue]");
  await page.waitForURL(/\/en\/checkout$/);

  // Cart preserved, first-order discount applied, totals reviewed.
  await expect(page.getByTestId("checkout-line")).toHaveCount(2);
  await expect(page.locator("[data-testid=discount-line][data-kind=welcome]")).toBeVisible();
  const subtotal = 2900 + 2400;
  expect(cents(await page.getByTestId("checkout-total").textContent())).toBe(subtotal - Math.round(subtotal * 0.1));

  // One payment for all products.
  await payAtCheckout(page);
  await page.click("[data-testid=view-purchases]");
  await expect(page.getByTestId("purchase")).toHaveCount(2);
  await expect(page.getByTestId("purchase-file").first()).toBeVisible();

  // Purchased files are delivered through personal, signed links only.
  const href = await page.getByTestId("download-link").first().getAttribute("href");
  expect(href).toMatch(/^\/api\/files\//);
  await expectProtectedDownload(page, browser, href!);

  // The order is listed in the dashboard.
  await page.goto(`${BASE}/en/account/orders`);
  await expect(page.getByText("Paid").first()).toBeVisible();

  expect(errors).toEqual([]);
  await context.close();
});
