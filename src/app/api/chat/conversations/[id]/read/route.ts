import { NextResponse } from "next/server";
import { routeUser, errorResponse } from "@/lib/route-auth";
import { authorizeConversation, markRead } from "@/lib/chat";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await routeUser(req, "adult", { mutating: true });
  if (user instanceof NextResponse) return user;
  try {
    await markRead(user, await authorizeConversation(user, (await ctx.params).id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
