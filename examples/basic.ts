/**
 * Minimal Playwright + ProxyHat example.
 *
 *   PROXYHAT_API_KEY=ph_xxx npx tsx examples/basic.ts
 *
 * The context is pinned to a single US residential IP for its lifetime.
 */
import { chromium } from "playwright";
import { newProxyHatContext } from "playwright-proxyhat";

const browser = await chromium.launch();

// An API key auto-selects an active residential sub-user:
const context = await newProxyHatContext(browser, {
  apiKey: process.env.PROXYHAT_API_KEY,
  targeting: { country: "us" },
});

const page = await context.newPage();
await page.goto("https://httpbin.org/ip");
console.log(await page.textContent("body"));

await browser.close();
