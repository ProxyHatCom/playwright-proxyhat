import type { Browser, BrowserContext, BrowserContextOptions } from "playwright";
import { buildPlaywrightProxy, type PlaywrightProxy, type ProxyHatProxyOptions } from "./proxy.js";
import { resolveCredentials, type CredentialOptions } from "./resolve.js";

export type { PlaywrightProxy, ProxyHatProxyOptions, ResolvedCredentials } from "./proxy.js";
export type { CredentialOptions } from "./resolve.js";
export { buildPlaywrightProxy } from "./proxy.js";
export { resolveCredentials } from "./resolve.js";

/** Credentials + targeting for the ProxyHat gateway. */
export interface ProxyHatOptions extends CredentialOptions, ProxyHatProxyOptions {}

/** Options for {@link newProxyHatContext}: {@link ProxyHatOptions} plus any extra Playwright context options. */
export interface NewProxyHatContextOptions extends ProxyHatOptions {
  /** Extra options passed to `browser.newContext` (merged; our `proxy` wins). */
  contextOptions?: BrowserContextOptions;
}

/**
 * Resolve credentials and build a Playwright proxy object routed through
 * ProxyHat residential proxies.
 *
 * ```ts
 * import { chromium } from "playwright";
 * import { proxyhatProxy } from "playwright-proxyhat";
 *
 * const proxy = await proxyhatProxy({
 *   apiKey: process.env.PROXYHAT_API_KEY,
 *   targeting: { country: "us" },
 * });
 * const browser = await chromium.launch({ proxy });
 * ```
 *
 * By default the proxy is a pinned **sticky** residential IP; pass
 * `sticky: false` for a fresh rotating IP per connection.
 */
export async function proxyhatProxy(options: ProxyHatOptions = {}): Promise<PlaywrightProxy> {
  const credentials = await resolveCredentials(options);
  return buildPlaywrightProxy(credentials, options);
}

/**
 * Same as {@link proxyhatProxy}, wrapped as `{ proxy }` so it spreads straight
 * into `browser.newContext`:
 *
 * ```ts
 * const context = await browser.newContext(await proxyhatContextOptions({ apiKey }));
 * ```
 */
export async function proxyhatContextOptions(
  options: ProxyHatOptions = {},
): Promise<{ proxy: PlaywrightProxy }> {
  return { proxy: await proxyhatProxy(options) };
}

/**
 * Create a browser context whose proxy is a ProxyHat residential IP.
 *
 * Each context maps to **one pinned sticky IP by default** (a fresh sticky id is
 * minted per call, so concurrent contexts get distinct exit IPs that persist for
 * the context's lifetime). Pass `sticky: false` for a rotating IP per request.
 *
 * ```ts
 * const context = await newProxyHatContext(browser, {
 *   apiKey: process.env.PROXYHAT_API_KEY,
 *   targeting: { country: "us" },
 * });
 * const page = await context.newPage();
 * ```
 */
export async function newProxyHatContext(
  browser: Browser,
  options: NewProxyHatContextOptions = {},
): Promise<BrowserContext> {
  const proxy = await proxyhatProxy(options);
  return browser.newContext({ ...options.contextOptions, proxy });
}
