/**
 * A @playwright/test fixture that gives every test its own browser context
 * pinned to a fresh sticky ProxyHat residential IP.
 *
 *   PROXYHAT_API_KEY=ph_xxx npx playwright test examples/fixture.ts
 *
 * Because each test gets its own context, each one exits from a distinct IP —
 * and every request inside a test keeps that same IP (sticky), like a real user.
 */
import { test as base, expect } from "@playwright/test";
import { newProxyHatContext } from "playwright-proxyhat";

export const test = base.extend({
  context: async ({ browser }, use) => {
    const context = await newProxyHatContext(browser, {
      apiKey: process.env.PROXYHAT_API_KEY,
      targeting: { country: "us" },
    });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    await use(await context.newPage());
  },
});

test("browses from a US residential IP", async ({ page }) => {
  await page.goto("https://httpbin.org/ip");
  const body = await page.textContent("body");
  console.log("Exit IP:", body);
  expect(body).toBeTruthy();
});
