import { describe, expect, it } from "vitest";
import { buildPlaywrightProxy } from "../src/proxy.js";

const creds = { username: "user", password: "pass" };

describe("buildPlaywrightProxy", () => {
  it("returns a Playwright proxy object with server/username/password", () => {
    const proxy = buildPlaywrightProxy(creds, { targeting: { country: "us" } });
    expect(proxy.server).toBe("http://gate.proxyhat.com:8080");
    expect(proxy.username).toContain("user-country-us");
    expect(proxy.password).toBe("pass");
  });

  it("pins a fresh sticky IP by default (distinct sid per context)", () => {
    const a = buildPlaywrightProxy(creds, { targeting: { country: "us" } });
    const b = buildPlaywrightProxy(creds, { targeting: { country: "us" } });
    expect(a.username).toContain("-sid-");
    expect(a.username).toContain("-ttl-30m");
    // Each context gets its own pinned IP.
    expect(a.username).not.toBe(b.username);
  });

  it("respects a custom stickyTtl", () => {
    const proxy = buildPlaywrightProxy(creds, { targeting: { country: "de" }, stickyTtl: "12h" });
    expect(proxy.username).toContain("-ttl-12h");
  });

  it("never pins an IP when sticky is false (rotating)", () => {
    const proxy = buildPlaywrightProxy(creds, { sticky: false, targeting: { country: "us" } });
    expect(proxy.username).not.toContain("-sid-");
    expect(proxy.username).toContain("country-us");
  });

  it("reflects geo targeting in the username", () => {
    const proxy = buildPlaywrightProxy(creds, {
      sticky: false,
      targeting: { country: "us", region: "california", city: "new york", filter: "high" },
    });
    expect(proxy.username).toContain("country-us");
    expect(proxy.username).toContain("region-california");
    expect(proxy.username).toContain("city-new_york");
    expect(proxy.username).toContain("filter-high");
  });

  it("supports the socks5 protocol and port", () => {
    const proxy = buildPlaywrightProxy(creds, { protocol: "socks5", targeting: { country: "us" } });
    expect(proxy.server).toBe("socks5://gate.proxyhat.com:1080");
  });

  it("passes bypass through when set", () => {
    const proxy = buildPlaywrightProxy(creds, { bypass: "*.internal.example.com" });
    expect(proxy.bypass).toBe("*.internal.example.com");
  });

  it("omits bypass when not set", () => {
    const proxy = buildPlaywrightProxy(creds, {});
    expect(proxy.bypass).toBeUndefined();
  });
});
