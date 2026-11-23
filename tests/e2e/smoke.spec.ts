import { BASE, expect, fillRegistration, mailLink, registerVerified, test, unique } from "./support";

const LOCALES = ["de", "en", "fr", "es", "it", "nl", "pl", "pt"] as const;
const LANG: Record<string, string> = { de: "de-DE", en: "en", fr: "fr-FR", es: "es-ES", it: "it-IT", nl: "nl-NL", pl: "pl-PL", pt: "pt-PT" };
const PUBLIC = ["", "/collections", "/shop", "/nail-studio", "/look-studio", "/quiz", "/custom-requests", "/about", "/next-chapter", "/legal/privacy", "/auth/login", "/auth/register"];

test.describe("Localisation", () => {
  test("every public page renders in all eight languages with hreflang alternates", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    for (const l of LOCALES) {
      for (const path of PUBLIC) {
        const res = await page.goto(`${BASE}/${l}${path}`);
        expect(res?.status(), `${l}${path}`).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", LANG[l]!);
        await expect(page.locator("h1").first()).toBeVisible();
      }
      await expect(page.locator('link[rel=alternate][hreflang="x-default"]')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test("root redirects to the default language and the choice persists", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page).toHaveURL(/\/(de|en)$/);
    await page.goto(`${BASE}/it/shop`);
    await page.goto(`${BASE}/`);
    await expect(page).toHaveURL(/\/it$/);
  });
});

test.describe("Permissions", () => {
  test("protected areas require sign-in, verification and the admin role", async ({ page, browser }) => {
    for (const path of ["/account", "/messages", "/checkout", "/account/purchases"]) {
      await page.goto(`${BASE}/en${path}`);
      await expect(page, path).toHaveURL(/\/auth\/login\?next=/);
    }
    expect((await page.goto(`${BASE}/en/admin`))?.status()).toBe(404);
    expect((await page.request.get(`${BASE}/api/notifications`)).status()).toBe(401);
    expect((await page.request.get(`${BASE}/api/realtime`)).status()).toBe(401);

    // Registered but not yet age-verified: messaging and checkout are blocked.
    const who = unique("Pending");
    await page.goto(`${BASE}/en/auth/register`);
    await fillRegistration(page, who);
    await page.goto(`${BASE}/en/messages`);
    await expect(page).not.toHaveURL(/\/en\/messages/);

    // A verified customer is still not an admin.
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await ctx.addCookies([{ name: "ml_age_notice", value: "1", url: BASE }]);
    await registerVerified(p, "Customer");
    expect((await p.goto(`${BASE}/en/admin`))?.status()).toBe(404);
    expect((await p.request.get(`${BASE}/api/admin/media`)).status()).toBeGreaterThanOrEqual(400);
    await ctx.close();
  });

  test("payment and verification webhooks reject unsigned calls", async ({ request }) => {
    const pay = await request.post(`${BASE}/api/webhooks/payment/dev`, { data: { orderId: "x", status: "paid" } });
    expect(pay.status()).toBeGreaterThanOrEqual(400);
    const ver = await request.post(`${BASE}/api/webhooks/verification/dev`, { data: { sessionId: "x", decision: "approved" } });
    expect(ver.status()).toBeGreaterThanOrEqual(400);
  });

  test("development minor simulation is refused", async ({ page }) => {
    const who = unique("Minor");
    await page.goto(`${BASE}/en/auth/register`);
    await fillRegistration(page, who);
    await page.goto(await mailLink(page, who.email, /https?:\/\/\S+confirm-email\S+/));
    await page.click("[data-testid=continue-verification]");
    await page.click("[data-testid=start-verification]");
    await page.click("[data-testid=sim-minor]");
    await expect(page.locator("[data-status=failed]")).toBeVisible({ timeout: 20_000 });
    await page.goto(`${BASE}/en/messages`);
    await expect(page).not.toHaveURL(/\/en\/messages/);
  });
});
