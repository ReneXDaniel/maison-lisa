import { NextResponse } from "next/server";
import { confirmEmailChange } from "@/app/actions/account";
import { isLocale, defaultLocale } from "@/i18n/routing";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = isLocale(url.searchParams.get("locale")) ? url.searchParams.get("locale")! : defaultLocale;
  const ok = await confirmEmailChange(url.searchParams.get("token") ?? "");
  return NextResponse.redirect(new URL(`/${locale}/account/profile?emailChange=${ok ? "ok" : "invalid"}`, process.env.APP_URL ?? url.origin), 303);
}
