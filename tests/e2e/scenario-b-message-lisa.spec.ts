import { BASE, confirmEmailAndVerifyAge, expect, fillRegistration, newContext, registerVerified, test, unique } from "./support";

/**
 * Scenario B — A customer contacts Lisa: sign-up and verification are
 * required, the private chat opens, Lisa answers from her inbox in
 * real time, the customer is notified, and the history persists.
 */
test("Scenario B — customer messages Lisa and both continue the conversation", async ({ page, adminPage, browser }) => {
  // "Message Lisa" from the About page requires an account.
  await page.goto(`${BASE}/en/about`);
  await page.getByRole("link", { name: /^Message Lisa$/ }).first().click();
  await page.waitForURL(/\/auth\/login\?next=/);
  await page.getByRole("link", { name: "Create an account" }).click();
  const who = unique("Julien");
  await fillRegistration(page, who);
  await confirmEmailAndVerifyAge(page, who.email);
  await page.click("[data-testid=verification-continue]");
  await page.waitForURL(/\/en\/messages/);

  // The private chat opens; the customer sends a message.
  if (!/\/messages\/new/.test(page.url())) await page.goto(`${BASE}/en/messages/new`);
  const first = `Hello Lisa — is a personal set in the Silk Collection possible? (${who.name})`;
  await page.fill("[data-testid=chat-input]", first);
  await page.click("[data-testid=chat-send]");
  await page.waitForURL(/\/messages\/[0-9a-f-]{36}$/);
  const conversationUrl = page.url();
  const conversationId = conversationUrl.split("/").pop()!;

  // Lisa receives it in her admin inbox and replies.
  await adminPage.goto(`${BASE}/en/admin/messages`);
  await adminPage.getByTestId("conversation-item").filter({ hasText: who.name }).click();
  await expect(adminPage.locator('[data-testid=message][data-mine="0"]').filter({ hasText: first })).toBeVisible();
  const reply = `Thank you, ${who.name} — yes, I would love to create something for you.`;
  await adminPage.fill("[data-testid=chat-input]", reply);
  await adminPage.click("[data-testid=chat-send]");

  // The reply arrives in real time (no reload) and a notification is created.
  await expect(page.locator('[data-testid=message][data-mine="0"]').filter({ hasText: reply })).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => {
      const res = await page.request.get(`${BASE}/api/notifications`);
      const body = (await res.json()) as { items: { type: string }[] };
      return body.items.some((n) => n.type === "message_from_lisa");
    })
    .toBe(true);

  // Lisa sees that the customer has read her reply.
  await expect(adminPage.locator('[data-testid=message][data-mine="1"]').filter({ hasText: reply }).locator('[aria-label="Read"]')).toBeVisible({ timeout: 15_000 });

  // Later: the history is stored and both continue.
  await page.goto(`${BASE}/en/messages`);
  await page.getByTestId("conversation-item").first().click();
  await page.waitForURL(conversationUrl);
  await expect(page.getByTestId("message")).toHaveCount(2);
  const followUp = "Wonderful — champagne satin, please.";
  await page.fill("[data-testid=chat-input]", followUp);
  await page.click("[data-testid=chat-send]");
  await expect(adminPage.locator('[data-testid=message][data-mine="0"]').filter({ hasText: followUp })).toBeVisible({ timeout: 15_000 });
  await adminPage.reload();
  await expect(adminPage.getByTestId("message")).toHaveCount(3);

  // Conversation authorisation: nobody else can read it.
  const anon = await browser.newContext();
  expect((await anon.request.get(`${BASE}/api/chat/conversations/${conversationId}`)).status()).toBe(401);
  await anon.close();
  const otherCtx = await newContext(browser);
  const other = await otherCtx.newPage();
  await registerVerified(other, "Intruder");
  expect((await other.request.get(`${BASE}/api/chat/conversations/${conversationId}`)).status()).toBe(404);
  const res = await other.goto(conversationUrl);
  expect(res?.status()).toBe(404);
  await otherCtx.close();
});
