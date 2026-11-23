import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/session";

/** Lets the return page poll for the provider decision. Exposes the status only. */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });
  return NextResponse.json({ status: user.ageStatus }, { headers: { "Cache-Control": "no-store" } });
}
