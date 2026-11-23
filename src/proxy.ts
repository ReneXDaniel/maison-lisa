import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Proxy only handles locale negotiation and redirects ("/" → "/de").
 * Authentication and authorization are NEVER decided here — every protected
 * page, server action and route handler performs its own server-side check
 * (see src/lib/auth/guards.ts).
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|favicon.ico|robots.txt|sitemap.xml|demo|fonts|.*\\..*).*)"],
};
