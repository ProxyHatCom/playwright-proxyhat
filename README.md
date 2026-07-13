# playwright-proxyhat

Route [Playwright](https://playwright.dev) browsers through [ProxyHat](https://proxyhat.com?utm_source=github&utm_medium=readme&utm_campaign=playwright) residential proxies — a pinned sticky IP per browser context, geo-targeting, and rotating IPs.

[![CI](https://github.com/ProxyHatCom/playwright-proxyhat/actions/workflows/ci.yml/badge.svg)](https://github.com/ProxyHatCom/playwright-proxyhat/actions/workflows/ci.yml)
[![Compatible with Playwright latest](https://github.com/ProxyHatCom/playwright-proxyhat/actions/workflows/compat.yml/badge.svg)](https://github.com/ProxyHatCom/playwright-proxyhat/actions/workflows/compat.yml)
[![npm](https://img.shields.io/npm/v/playwright-proxyhat)](https://www.npmjs.com/package/playwright-proxyhat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Why

Driving a browser from datacenter IPs gets you blocked, CAPTCHA'd, and rate-limited. This package plugs ProxyHat's residential IPs (50M+ across 148+ countries) into Playwright through its first-class proxy option — set at launch, or **per browser context**, which is the real hook: Playwright isolates each context (its own cookies, storage, and IP), so this package maps **each context to one pinned residential IP**, mimicking a real user. No boilerplate; works with Chromium, Firefox, and WebKit.

## Install

```bash
npm install playwright-proxyhat
```

`playwright` is a peer dependency — bring your own version (`>=1.30`).

## Quick start

```ts
import { chromium } from "playwright";
import { newProxyHatContext } from "playwright-proxyhat";

const browser = await chromium.launch();

// An API key auto-selects an active residential sub-user:
const context = await newProxyHatContext(browser, {
  apiKey: process.env.PROXYHAT_API_KEY,
  targeting: { country: "us" },
});

const page = await context.newPage();
await page.goto("https://httpbin.org/ip"); // exits from a US residential IP
```

Get an API key at [proxyhat.com](https://proxyhat.com?utm_source=github&utm_medium=readme&utm_campaign=playwright).

## Credentials

Pass them explicitly or via environment variables — options win over env:

| Option | Env var | Notes |
|---|---|---|
| `apiKey` | `PROXYHAT_API_KEY` | Auto-selects an active sub-user with remaining traffic |
| `subUser` | `PROXYHAT_SUBUSER` | Pick a specific sub-user by uuid or name (with an API key) |
| `username` | `PROXYHAT_USERNAME` | Explicit gateway `proxy_username` (skips the API) |
| `password` | `PROXYHAT_PASSWORD` | Explicit gateway `proxy_password` |

## Targeting

```ts
const context = await newProxyHatContext(browser, {
  apiKey: process.env.PROXYHAT_API_KEY,
  protocol: "http", // or "socks5"
  targeting: {
    country: "us",      // ISO code or "any" (default)
    region: "california",
    city: "new_york",
    filter: "high",     // AI IP-quality tier
  },
  stickyTtl: "30m",     // sticky-session lifetime (default "30m")
});
```

### Sticky IP per browser context

By default this package maps **each context to one pinned ProxyHat residential IP**: a fresh sticky id is minted per context, so concurrent contexts get distinct exit IPs — and every request inside a context keeps that same IP for the context's lifetime, like a real user. Close the context and the IP is dropped.

Want a fresh IP on **every** request instead? Turn stickiness off — the gateway rotates the exit IP per connection:

```ts
await newProxyHatContext(browser, { apiKey, sticky: false });
```

### One IP for the whole browser

Prefer a single IP shared by every context? Set the proxy at launch instead:

```ts
import { chromium } from "playwright";
import { proxyhatProxy } from "playwright-proxyhat";

const proxy = await proxyhatProxy({ apiKey: process.env.PROXYHAT_API_KEY, targeting: { country: "us" } });
const browser = await chromium.launch({ proxy });
```

### @playwright/test fixture

Give every test its own context on a fresh sticky residential IP by overriding the `context` fixture:

```ts
import { test as base } from "@playwright/test";
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
});
```

A runnable version lives in [`examples/fixture.ts`](examples/fixture.ts).

## Advanced: build the proxy object yourself

Need to combine ProxyHat with your own context logic? Use the lower-level helpers. `proxyhatProxy` returns a plain Playwright proxy object; `proxyhatContextOptions` wraps it as `{ proxy }` to spread into `newContext`:

```ts
import { chromium } from "playwright";
import { proxyhatContextOptions } from "playwright-proxyhat";

const browser = await chromium.launch();
const context = await browser.newContext({
  ...(await proxyhatContextOptions({ apiKey: process.env.PROXYHAT_API_KEY })),
  locale: "en-US",
  viewport: { width: 1280, height: 800 },
});
```

Fully offline and synchronous once you have credentials:

```ts
import { buildPlaywrightProxy, resolveCredentials } from "playwright-proxyhat";

const credentials = await resolveCredentials({ apiKey: process.env.PROXYHAT_API_KEY });
const proxy = buildPlaywrightProxy(credentials, { targeting: { country: "us" } });
// -> { server: "http://gate.proxyhat.com:8080", username: "…-country-us-sid-…-ttl-30m", password: "…" }
```

## How it works

`proxyhatProxy` (and `newProxyHatContext`) resolves your gateway credentials once (via the official [`proxyhat`](https://www.npmjs.com/package/proxyhat) SDK), then builds a Playwright proxy object: `server` points at the ProxyHat gateway (`gate.proxyhat.com:8080` for HTTP, `:1080` for SOCKS5) and `username` carries the targeting grammar. With stickiness on it mints a `sid`/`ttl` so the context keeps one pinned IP; with `sticky: false` it omits the `sid` so the gateway hands out a fresh residential IP per connection.

## License

MIT © [ProxyHat](https://proxyhat.com)
