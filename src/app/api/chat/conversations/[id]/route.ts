import { NextResponse } from "next/server";
import { routeUser, errorResponse, noStore } from "@/lib/route-auth";
import { authorizeConversation, conversationMeta, listMessages } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await routeUser(req, "adult");
  if (user instanceof NextResponse) return user;
  try {
    const c = await authorizeConversation(user, (await ctx.params).id);
    const url = new URL(req.url);
    const after = url.searchParams.get("after") ?? undefined;
    const before = url.searchParams.get("before") ?? undefined;
    const [meta, items] = await Promise.all([conversationMeta(user, c), listMessages(user, c, { after, before })]);
    return NextResponse.json({ meta, items, hasMore: !after && items.length >= 50 }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
