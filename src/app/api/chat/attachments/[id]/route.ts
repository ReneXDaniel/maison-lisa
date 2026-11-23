import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messageAttachments } from "@/db/schema";
import { routeUser } from "@/lib/route-auth";
import { authorizeConversation } from "@/lib/chat";
import { storage } from "@/lib/storage";

/** Streams a chat attachment to a participant of its conversation only. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await routeUser(req, "adult");
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const [a] = await db.select().from(messageAttachments).where(eq(messageAttachments.id, id));
  if (!a) return new NextResponse("Not found", { status: 404 });
  try {
    await authorizeConversation(user, a.conversationId);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const s = storage();
  if (s.presignedGet) return NextResponse.redirect(await s.presignedGet(a.storageKey, 60, a.fileName, true));
  const buf = await s.get(a.storageKey);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Disposition": `inline; filename="${a.fileName}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
