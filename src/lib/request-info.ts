import "server-only";
import { headers } from "next/headers";
import { env } from "./env";

/**
 * Client IP for rate limiting and audit logs. X-Forwarded-For is only trusted
 * when TRUST_PROXY=true (i.e. behind a reverse proxy that overwrites it).
 */
export function ipFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    const ip = env().TRUST_PROXY === "true" ? parts[0] : parts[parts.length - 1];
    if (ip) return ip;
  }
  return h.get("x-real-ip") ?? "unknown";
}

export async function clientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}

/** Same-origin check for state-changing route handlers (server actions do this natively). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return o.host === host || o.origin === new URL(env().APP_URL).origin;
  } catch {
    return false;
  }
}
