import "server-only";
import { NextResponse } from "next/server";
import { getUserFromRequest, type CurrentUser } from "./auth/session";
import { checkLevel, ActionError, type AccessLevel } from "./auth/guards";
import { isSameOrigin } from "./request-info";

/**
 * Route-handler guard. Customers need the given level; administrators pass
 * any level (they are Lisa). Mutating requests must come from our origin.
 */
export async function routeUser(req: Request, level: AccessLevel, opts: { mutating?: boolean } = {}): Promise<CurrentUser | NextResponse> {
  if (opts.mutating && !isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getUserFromRequest(req);
  const problem = user?.isAdmin && level !== "admin" ? null : checkLevel(user, level);
  if (problem) return NextResponse.json({ error: problem }, { status: problem === "auth_required" ? 401 : 403 });
  return user!;
}

export function errorResponse(e: unknown) {
  if (e instanceof ActionError) {
    const status = e.code === "not_found" ? 404 : e.code === "rate_limited" ? 429 : e.code === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: e.code, detail: e.detail }, { status });
  }
  console.error("[route]", e);
  return NextResponse.json({ error: "server" }, { status: 500 });
}

export const noStore = { "Cache-Control": "no-store" };
