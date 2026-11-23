import sharp from "sharp";
import { BASE, addProduct, expect, expectProtectedDownload, payAtCheckout, registerVerified, test } from "./support";

/**
 * Scenario C — Personalised request: Nail Studio + Look Studio selections
 * flow into a request, which lands in the private conversation; Lisa sends
 * an offer, the customer accepts (cart only, no charge), adds another
 * collection, pays both at once; Lisa moves the request into production,
 * uploads the photographs and delivers them to the protected account area.
 */
test("Scenario C — personalised request through offer, payment and delivery", async ({ page, adminPage, browser }) => {
  const who = await registerVerified(page, "Elena", { next: "/nail-studio" });

  // Nail Studio: colour + finish, persisted for the request.
  await page.goto(`${BASE}/en/nail-studio`);
  await page.click("[data-testid=bottle-cherry_red]");
  await expect(page.getByTestId("nail-canvas")).toHaveAttribute("data-color", "cherry_red");
  await page.click("[data-testid=opt-polishFinish-matte]");

  // Look Studio: customise the look.
  await page.goto(`${BASE}/en/look-studio`);
  await page.click("[data-testid=opt-stockings-elegant_lace]");
  await page.click("[data-testid=opt-footwear-sandals]");
  await page.click("[data-testid=opt-accessories-anklet]");
  await page.click("[data-testid=look-to-request]");

  // The request builder starts from those selections.
  await page.waitForURL(/\/en\/custom-requests$/);
  await expect(page.getByText("Taken from your Nail Studio selection")).toBeVisible();
  await page.click("[data-testid=opt-style-elegant_editorial]");
  await page.fill("[data-testid=wishes]", "Soft morning light, please.");
  await page.click("[data-testid=prepare-request]");
  await page.click("[data-testid=gift-box]");
  await page.click("[data-testid=send-request]");

  // It appears inside the private conversation with Lisa.
  await page.waitForURL(/\/messages\/[0-9a-f-]{36}$/);
  const card = page.getByTestId("request-card");
  for (const part of ["Cherry red", "Matte", "Elegant lace", "Sandals", "Anklet", "Champagne satin", "Elegant editorial", "Soft morning light"]) {
    await expect(card).toContainText(part, { ignoreCase: true });
  }
  const number = (await card.textContent())!.match(/No\.\s*(\d+)/)![1]!;

  // Lisa reviews it and sends a personal offer linked to the request.
  await adminPage.goto(`${BASE}/en/admin/messages`);
  await adminPage.getByTestId("conversation-item").filter({ hasText: who.name }).click();
  await expect(adminPage.getByTestId("request-card")).toBeVisible();
  const form = adminPage.getByTestId("offer-form");
  await form.locator("input[name=title]").fill(`Personal collection for ${who.name}`);
  await form.locator("input[name=price]").fill("45");
  await adminPage.click("[data-testid=offer-submit]");

  // The customer accepts: the offer goes to the cart — nothing is charged.
  const offer = page.getByTestId("offer-card");
  await expect(offer).toBeVisible({ timeout: 15_000 });
  await expect(offer).toContainText("€45.00");
  await offer.getByTestId("offer-accept").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  // Another collection, then one payment for both.
  await addProduct(page, "lacquer-study");
  await page.goto(`${BASE}/en/cart`);
  await expect(page.getByTestId("cart-line")).toHaveCount(2);
  await page.click("[data-testid=to-checkout]");
  await page.waitForURL(/\/en\/checkout$/);
  await payAtCheckout(page);

  // Lisa moves the paid request into production …
  await adminPage.goto(`${BASE}/en/admin/requests`);
  await adminPage.getByRole("link", { name: number, exact: true }).click();
  await adminPage.waitForURL(/\/admin\/requests\/[0-9a-f-]{36}$/);
  await adminPage.getByTestId("request-status").selectOption("in_production");
  await expect(adminPage.getByTestId("request-status")).toHaveValue("in_production");

  // … uploads the photographs and delivers them.
  const photo = await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#C9B299" } }).jpeg().toBuffer();
  await adminPage.getByTestId("upload-delivery").setInputFiles({ name: "delivery-01.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(adminPage.getByText("delivery-01.jpg")).toBeVisible({ timeout: 30_000 });
  adminPage.once("dialog", (d) => d.accept());
  await adminPage.getByRole("button", { name: "Mark as delivered" }).click();
  await expect(adminPage.getByText(/^Delivered on /)).toBeVisible();
  await expect(adminPage.getByTestId("request-status")).toHaveValue("delivered");

  // The customer finds the personal collection in the protected account area.
  await page.goto(`${BASE}/en/account/purchases`);
  const personal = page.getByTestId("purchase").filter({ hasText: `Personal collection for ${who.name}` });
  await expect(personal.getByTestId("purchase-file")).toHaveCount(1);
  const href = await personal.getByTestId("download-link").first().getAttribute("href");
  await expectProtectedDownload(page, browser, href!);
  await page.goto(`${BASE}/en/account/requests`);
  await expect(page.getByText("Delivered").first()).toBeVisible();
});
