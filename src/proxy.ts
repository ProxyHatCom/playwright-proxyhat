import {
  buildProxyUsername,
  PROXYHAT_GATEWAY,
  PROXYHAT_PORT_HTTP,
  PROXYHAT_PORT_SOCKS5,
  type ConnectionTargeting,
  type ProxyProtocol,
} from "proxyhat";

export interface ResolvedCredentials {
  /** Sub-user gateway login (`proxy_username`). */
  username: string;
  /** Sub-user gateway password (`proxy_password`). */
  password: string;
}

/**
 * A Playwright proxy settings object. Structurally identical to the `proxy`
 * field of `LaunchOptions` and `BrowserContextOptions`, so it can be spread
 * straight into `chromium.launch({ proxy })` or `browser.newContext({ proxy })`.
 */
export interface PlaywrightProxy {
  /** Gateway URL, e.g. `http://gate.proxyhat.com:8080` or `socks5://gate.proxyhat.com:1080`. */
  server: string;
  /** Gateway username carrying ProxyHat's targeting grammar. */
  username: string;
  /** Sub-user gateway password. */
  password: string;
  /** Optional comma-separated hosts that skip the proxy (Playwright `bypass`). */
  bypass?: string;
}

export interface ProxyHatProxyOptions {
  /** `http` (port 8080, default) or `socks5` (port 1080). */
  protocol?: ProxyProtocol;
  /** Targeting applied to the proxy (country / region / city / filter / sticky). */
  targeting?: ConnectionTargeting;
  /**
   * Pin one residential IP for the lifetime of the browser context (a ProxyHat
   * sticky session). Default `true`: a fresh sticky id is minted per call, so
   * every context created with these options gets its own distinct exit IP that
   * stays put until the context is closed — mirroring real user behaviour. Set
   * `false` for a rotating IP: the gateway hands out a fresh IP per connection.
   */
  sticky?: boolean;
  /** Sticky TTL used when {@link sticky} is on and no explicit `sticky` is set in `targeting`. Default `"30m"`. */
  stickyTtl?: string;
  /** Comma-separated hosts to bypass the proxy for (passed through as Playwright `bypass`). */
  bypass?: string;
}

/**
 * Build a Playwright proxy object from resolved gateway credentials plus
 * targeting. Pure and offline — no network, no browser.
 *
 * - **Sticky (default):** the username carries a fresh `sid`/`ttl`, so the
 *   context this proxy is attached to keeps one pinned residential IP. Call it
 *   again to get a distinct pinned IP for the next context.
 * - **Rotating (`sticky: false`):** no `sid`, so the gateway rotates the exit IP
 *   on every connection the context makes.
 */
export function buildPlaywrightProxy(
  credentials: ResolvedCredentials,
  options: ProxyHatProxyOptions = {},
): PlaywrightProxy {
  const sticky = options.sticky !== false;
  const base: ConnectionTargeting = { ...options.targeting };

  let targeting: ConnectionTargeting;
  if (sticky) {
    targeting = { ...base, sticky: base.sticky ?? options.stickyTtl ?? "30m" };
  } else {
    // Rotating: drop any inherited `sticky` so we never pin an IP here.
    const { sticky: _sticky, ...rotating } = base;
    targeting = rotating;
  }

  const protocol = options.protocol ?? "http";
  const port = protocol === "socks5" ? PROXYHAT_PORT_SOCKS5 : PROXYHAT_PORT_HTTP;

  const proxy: PlaywrightProxy = {
    server: `${protocol}://${PROXYHAT_GATEWAY}:${port}`,
    username: buildProxyUsername(credentials.username, targeting),
    password: credentials.password,
  };
  if (options.bypass) proxy.bypass = options.bypass;
  return proxy;
}
