import { BASE, expect, test } from "./support";

/** Mobile usability: no horizontal overflow, menu works, primary flows reachable. */
const PAGES = ["", "/shop", "/collections", "/nail-studio", "/look-studio", "/custom-requests", "/about", "/cart", "/auth/register"];

test("mobile pages fit the viewport in every language", async ({ page }) => {
  for (const l of ["de", "en", "pl", "pt"]) {
    for (const path of PAGES) {
      await page.goto(`${BASE}/${l}${path}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${l}${path}`).toBeLessThanOrEqual(1);
      await expect(page.getByTestId("header-cart")).toBeInViewport();
    }
  }
});

test("mobile menu opens, navigates and closes", async ({ page }) => {
  await page.goto(`${BASE}/en`);
  const menu = page.getByRole("dialog");
  // Retry until hydrated: a click on the server-rendered button before React attaches is a no-op.
  await expect(async () => {
    await page.getByRole("button", { name: "Open menu" }).click({ timeout: 2_000 });
    await expect(menu).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await menu.getByRole("link", { name: "Nail Studio" }).click();
  await expect(page).toHaveURL(/\/en\/nail-studio$/);
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(0);
});
