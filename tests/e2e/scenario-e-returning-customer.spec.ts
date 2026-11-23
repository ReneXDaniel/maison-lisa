import { BASE, addProduct, expect, expectProtectedDownload, login, newContext, payAtCheckout, registerVerified, test } from "./support";

/**
 * Scenario E — Returning customer: language restored, verification still
 * recognised, conversations, purchases and saved cart available, and they
 * can carry on shopping and messaging — on the same browser and on a new one.
 */
test("Scenario E — returning customer finds language, chats, purchases and cart", async ({ page, browser }) => {
  // First visit, in French.
  const who = await registerVerified(page, "Camille", { locale: "fr", next: "/messages/new" });
  await page.click("[data-testid=verification-continue]");
  await page.waitForURL(/\/fr\/messages\/new/);
  await page.fill("[data-testid=chat-input]", "Bonjour Lisa, une question sur la collection Soie.");
  await page.click("[data-testid=chat-send]");
  await page.waitForURL(/\/fr\/messages\/[0-9a-f-]{36}$/);

  await addProduct(page, "champagne-charmeuse", "fr");
  await page.goto(`${BASE}/fr/checkout`);
  await payAtCheckout(page);
  await addProduct(page, "after-hours", "fr"); // left in the cart for later

  // Sign out.
  await page.goto(`${BASE}/fr/account`);
  await page.click("[data-testid=logout]");
  await page.waitForURL(/\/fr$/);

  // Same browser, later: the language preference is restored.
  await page.goto(`${BASE}/`);
  await expect(page).toHaveURL(/\/fr$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-FR");

  // New device, English browser: logging in restores the account language.
  const ctx = await newContext(browser, { locale: "en-GB" });
  const p = await ctx.newPage();
  await login(p, who.email);
  await expect(p).toHaveURL(/\/fr\/account/);

  // Verification recognised: protected areas open without re-verifying.
  await p.goto(`${BASE}/fr/messages`);
  await expect(p).toHaveURL(/\/fr\/messages/);
  await expect(p.getByTestId("conversation-item")).toHaveCount(1);
  await p.getByTestId("conversation-item").click();
  await expect(p.getByTestId("message")).toHaveCount(1);

  // Purchases remain accessible.
  await p.goto(`${BASE}/fr/account/purchases`);
  await expect(p.getByTestId("purchase")).toHaveCount(1);
  const href = await p.getByTestId("download-link").first().getAttribute("href");
  await expectProtectedDownload(p, browser, href!);

  // Saved cart restored on the new device.
  await expect(p.getByTestId("cart-count")).toHaveText("1");
  await p.goto(`${BASE}/fr/cart`);
  await expect(p.getByTestId("cart-line")).toHaveCount(1);

  // Continue shopping and messaging.
  await addProduct(p, "signature-edition", "fr");
  await expect(p.getByTestId("cart-count")).toHaveText("2");
  await p.goto(`${BASE}/fr/messages`);
  await p.getByTestId("conversation-item").click();
  await p.fill("[data-testid=chat-input]", "Me revoilà !");
  await p.click("[data-testid=chat-send]");
  await expect(p.getByTestId("message")).toHaveCount(2);
  await ctx.close();
});
