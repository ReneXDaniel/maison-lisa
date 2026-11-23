import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { routeUser, noStore } from "@/lib/route-auth";

/** Order status for the return page (owner only). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await routeUser(req, "user");
  if (user instanceof NextResponse) return user;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const [o] = await db.select({ status: orders.status, userId: orders.userId, number: orders.number }).from(orders).where(eq(orders.id, id));
  if (!o || (o.userId !== user.id && !user.isAdmin)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ status: o.status, number: o.number }, { headers: noStore });
}
