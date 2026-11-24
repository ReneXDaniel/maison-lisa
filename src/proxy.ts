import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

/**
 * Proxy handles locale negotiation and redirects ("/" → "/de").
 * Authentication and authorization are NEVER decided here — every protected
 * page, server action and route handler performs its own server-side check
 * (see src/lib/auth/guards.ts).
 *
 * The one addition is the preview gate: on a preview deployment
 * (PREVIEW_MODE=true) every page sits behind one shared password (HTTP Basic
 * auth), so the labelled simulators are never reachable by the public. API
 * routes keep their own checks (sessions, signed webhooks, signed links).
 */
const intl = createMiddleware(routing);

function sameSecret(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function previewGate(req: NextRequest): NextResponse | null {
  if (process.env.PREVIEW_MODE !== "true") return null;
  const secret = process.env.PREVIEW_PASSWORD ?? "";
  if (secret.length < 8) return new NextResponse("Preview password is not configured.", { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      const password = decoded.slice(decoded.indexOf(":") + 1);
      if (sameSecret(password, secret)) return null;
    } catch {
      // malformed header → ask again
    }
  }
  return new NextResponse("Passwort erforderlich · Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="MAISON LISA Vorschau", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export default function proxy(req: NextRequest) {
  const denied = previewGate(req);
  if (denied) return denied;
  const res = intl(req);
  if (process.env.PREVIEW_MODE === "true") res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|favicon.ico|robots.txt|sitemap.xml|demo|fonts|.*\\..*).*)"],
};
