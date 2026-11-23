import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * Shared helpers for the end-to-end scenarios.
 *
 * The suite runs against a development server with the explicit, labelled
 * simulators (dev mailbox, dev identity verification, dev payment) — it
 * exercises the real routes, server actions, webhooks and database, only
 * the external provider is simulated. It never runs against production:
 * the simulators are disabled there by `assertProductionSafety()`.
 */

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const PASSWORD = "correct-horse-battery-staple";
export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "lisa@maison-lisa.test",
  password: process.env.SEED_ADMIN_PASSWORD ?? "Maison-Lisa-Dev-2026!",
};
const AGE_NOTICE_COOKIE = "ml_age_notice";

export function unique(tag: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { name: `${tag} ${id}`, email: `${tag.toLowerCase()}-${id}@example.test` };
}

/** Parses a formatted amount ("€47.70", "47,70 €") into integer cents. */
export function cents(text: string | null): number {
  return parseInt((text ?? "").replace(/\D/g, ""), 10);
}

export async function acceptAgeNotice(context: BrowserContext) {
  await context.addCookies([{ name: AGE_NOTICE_COOKIE, value: "1", url: BASE }]);
}

export async function newContext(browser: Browser, opts: Parameters<Browser["newContext"]>[0] = {}) {
  const ctx = await browser.newContext(opts);
  await acceptAgeNotice(ctx);
  return ctx;
}

/** Reads the newest link matching `pattern` from the development mailbox. */
export async function mailLink(page: Page, email: string, pattern: RegExp): Promise<string> {
  const mailbox = await page.context().newPage();
  try {
    await mailbox.goto(`${BASE}/en/dev/mailbox`);
    const text = await mailbox.locator(`[data-to="${email}"] [data-testid=dev-mail-text]`).first().textContent();
    const match = text?.match(pattern);
    if (!match) throw new Error(`no mail matching ${pattern} for ${email}`);
    return match[0];
  } finally {
    await mailbox.close();
  }
}

/** Fills and submits the registration form on the current page. */
export async function fillRegistration(page: Page, who: { name: string; email: string }) {
  await page.fill("input[name=displayName]", who.name);
  await page.fill("input[name=email]", who.email);
  await page.fill("input[name=password]", PASSWORD);
  await page.fill("input[name=confirm]", PASSWORD);
  await page.check("input[name=terms]");
  await page.check("input[name=adult]");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/auth\/verify-email/);
}

/** Confirms the e-mail address and completes the (simulated) ID-based age verification. */
export async function confirmEmailAndVerifyAge(page: Page, email: string) {
  await page.goto(await mailLink(page, email, /https?:\/\/\S+confirm-email\S+/));
  await page.click("[data-testid=continue-verification]");
  await page.click("[data-testid=start-verification]");
  await page.waitForURL(/\/dev\/verification/);
  await page.click("[data-testid=sim-adult]");
  await expect(page.locator("[data-status=verified]")).toBeVisible({ timeout: 20_000 });
}

/** Registers a fresh customer, confirms the e-mail and verifies age. Ends on the verification result page. */
export async function registerVerified(page: Page, tag: string, opts: { next?: string; locale?: string } = {}) {
  const who = unique(tag);
  const locale = opts.locale ?? "en";
  await page.goto(`${BASE}/${locale}/auth/register?next=${encodeURIComponent(opts.next ?? "/account")}`);
  await fillRegistration(page, who);
  await confirmEmailAndVerifyAge(page, who.email);
  return who;
}

export async function login(page: Page, email: string, password = PASSWORD, locale = "en") {
  await page.goto(`${BASE}/${locale}/auth/login`);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"));
}

export async function loginAdmin(page: Page) {
  await login(page, ADMIN.email, ADMIN.password);
  await page.waitForURL(/\/admin/);
}

export async function addProduct(page: Page, slug: string, locale = "en") {
  await page.goto(`${BASE}/${locale}/shop`);
  const before = await cartCount(page);
  await page.locator(`[data-testid=product-card][data-slug="${slug}"] [data-testid=add-to-cart]`).click();
  await expect.poll(() => cartCount(page)).toBe(before + 1);
}

export async function cartCount(page: Page): Promise<number> {
  const badge = page.locator("[data-testid=cart-count]");
  return (await badge.count()) ? Number(await badge.first().textContent()) : 0;
}

/** From the checkout page: accept terms, place the order and pay with the dev simulator. */
export async function payAtCheckout(page: Page) {
  await page.check("[data-testid=accept-terms]");
  await page.check("[data-testid=accept-waiver]");
  await page.click("[data-testid=place-order]");
  await page.waitForURL(/\/dev\/payment/);
  await page.click("[data-testid=pay-success]");
  await expect(page.locator("[data-testid=order-return][data-status=paid]")).toBeVisible({ timeout: 30_000 });
}

/** Checks a purchase download works for its owner and is refused for anyone else. */
export async function expectProtectedDownload(page: Page, browser: Browser, href: string) {
  const own = await page.request.get(`${BASE}${href}`);
  expect(own.status()).toBe(200);
  expect(own.headers()["content-type"]).toMatch(/^image\//);
  const stranger = await browser.newContext();
  const res = await stranger.request.get(`${BASE}${href}`);
  expect(res.status()).toBeGreaterThanOrEqual(400);
  await stranger.close();
}

/** Base test whose default context has passed the 18+ notice; plus a signed-in admin page on demand. */
export const test = base.extend<{ adminPage: Page }>({
  context: async ({ context }, use) => {
    await acceptAgeNotice(context);
    await use(context);
  },
  adminPage: async ({ browser }, use) => {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await loginAdmin(page);
    await use(page);
    await ctx.close();
  },
});

export { expect };
