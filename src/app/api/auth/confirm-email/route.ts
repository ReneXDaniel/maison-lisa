import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/app/actions/auth";
import { safeNext } from "@/lib/auth/guards";
import { isLocale, defaultLocale } from "@/i18n/routing";

/** Email confirmation link target. Single-use token; harmless if a mail scanner pre-fetches it. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = isLocale(url.searchParams.get("locale")) ? url.searchParams.get("locale")! : defaultLocale;
  const next = safeNext(url.searchParams.get("next"), "/account");
  const ok = await confirmEmailToken(url.searchParams.get("token") ?? "");
  const target = ok ? `/${locale}/auth/verify-email?confirmed=1&next=${encodeURIComponent(next)}` : `/${locale}/auth/verify-email?invalid=1`;
  return NextResponse.redirect(new URL(target, process.env.APP_URL ?? url.origin), 303);
}
