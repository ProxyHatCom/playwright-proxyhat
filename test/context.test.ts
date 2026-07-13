import { afterEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();

// Mock the SDK sub-user lookup so the API-key path never hits the network.
vi.mock("proxyhat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("proxyhat")>();
  return {
    ...actual,
    ProxyHat: class {
      sub_users = { list: listMock };
    },
  };
});

// Imported after the mock is registered.
const { newProxyHatContext, proxyhatProxy, proxyhatContextOptions } = await import("../src/index.js");

/** A fake Playwright Browser that records every newContext call. */
function fakeBrowser() {
  const calls: Array<Record<string, unknown>> = [];
  const browser = {
    calls,
    async newContext(options: Record<string, unknown> = {}) {
      calls.push(options);
      return { options, newPage: async () => ({}) };
    },
  } as unknown as Parameters<typeof newProxyHatContext>[0] & { calls: Array<Record<string, unknown>> };
  return browser;
}

afterEach(() => {
  listMock.mockReset();
});

describe("newProxyHatContext", () => {
  it("creates a context whose proxy uses SDK-resolved credentials", async () => {
    listMock.mockResolvedValue([
      { uuid: "2", name: "live", suspended_at: null, traffic_limit: 0, used_traffic: 5, proxy_username: "gwu", proxy_password: "gwp" },
    ]);
    const browser = fakeBrowser();

    await newProxyHatContext(browser, { apiKey: "ph_key", targeting: { country: "us" } });

    expect(browser.calls).toHaveLength(1);
    const proxy = browser.calls[0].proxy as { server: string; username: string; password: string };
    expect(proxy.server).toBe("http://gate.proxyhat.com:8080");
    expect(proxy.username).toContain("gwu-country-us");
    expect(proxy.password).toBe("gwp");
  });

  it("pins a distinct sticky IP per context by default", async () => {
    const browser = fakeBrowser();
    const opts = { username: "u", password: "p", targeting: { country: "us" } };

    await newProxyHatContext(browser, opts);
    await newProxyHatContext(browser, opts);

    const u1 = (browser.calls[0].proxy as { username: string }).username;
    const u2 = (browser.calls[1].proxy as { username: string }).username;
    expect(u1).toContain("-sid-");
    expect(u2).toContain("-sid-");
    expect(u1).not.toBe(u2); // each context -> its own pinned exit IP
  });

  it("rotates (no sid) when sticky is false", async () => {
    const browser = fakeBrowser();
    await newProxyHatContext(browser, { username: "u", password: "p", sticky: false });
    expect((browser.calls[0].proxy as { username: string }).username).not.toContain("-sid-");
  });

  it("merges extra contextOptions and lets our proxy win", async () => {
    const browser = fakeBrowser();
    await newProxyHatContext(browser, {
      username: "u",
      password: "p",
      contextOptions: { locale: "en-US", proxy: { server: "http://ignored:1" } },
    });
    const call = browser.calls[0];
    expect(call.locale).toBe("en-US");
    expect((call.proxy as { server: string }).server).toBe("http://gate.proxyhat.com:8080");
  });
});

describe("proxyhatProxy / proxyhatContextOptions", () => {
  it("proxyhatProxy resolves and returns a proxy object", async () => {
    const proxy = await proxyhatProxy({ username: "u", password: "p", protocol: "socks5" });
    expect(proxy.server).toBe("socks5://gate.proxyhat.com:1080");
    expect(proxy.password).toBe("p");
  });

  it("proxyhatContextOptions wraps the proxy under { proxy }", async () => {
    const opts = await proxyhatContextOptions({ username: "u", password: "p" });
    expect(opts).toHaveProperty("proxy");
    expect(opts.proxy.server).toBe("http://gate.proxyhat.com:8080");
  });
});
