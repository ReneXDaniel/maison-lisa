import { NextResponse } from "next/server";
import { z } from "zod";
import { routeUser, errorResponse, noStore } from "@/lib/route-auth";
import { createConversation, listConversations, markDelivered, postMessage } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await routeUser(req, "adult");
  if (user instanceof NextResponse) return user;
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") as NonNullable<Parameters<typeof listConversations>[1]>["filter"];
  const items = await listConversations(user, { q: url.searchParams.get("q") ?? undefined, filter: filter ?? "all" });
  // Opening the inbox counts as delivery of everything listed.
  await markDelivered(user, items.filter((i) => i.unread > 0).map((i) => i.id));
  return NextResponse.json({ items }, { headers: noStore });
}

const createSchema = z.object({ subject: z.string().max(120).optional(), body: z.string().max(4000).optional() });

/** Customers start a new private conversation (optionally with a first message). */
export async function POST(req: Request) {
  const user = await routeUser(req, "adult", { mutating: true });
  if (user instanceof NextResponse) return user;
  try {
    const input = createSchema.parse(await req.json());
    const c = await createConversation(user, input.subject);
    if (input.body?.trim()) await postMessage(user, c, { body: input.body });
    return NextResponse.json({ id: c.id });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return errorResponse(e);
  }
}
