import { NextResponse } from "next/server";
import { z } from "zod";
import { routeUser } from "@/lib/route-auth";
import { markDelivered } from "@/lib/chat";

/** Called by the recipient's browser when a realtime message event arrives. */
export async function POST(req: Request) {
  const user = await routeUser(req, "adult", { mutating: true });
  if (user instanceof NextResponse) return user;
  const parsed = z.object({ ids: z.array(z.uuid()).max(50) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await markDelivered(user, parsed.data.ids);
  return NextResponse.json({ ok: true });
}
