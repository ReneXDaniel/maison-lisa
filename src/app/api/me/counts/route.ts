import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart";
import { unreadConversations, unreadNotifications } from "@/lib/counts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ cartCount: await getCartCount(null), unreadMessages: 0, unreadNotifications: 0 });
  const [cartCount, unreadMessages, unreadNotifs] = await Promise.all([getCartCount(user), unreadConversations(user), unreadNotifications(user.id)]);
  return NextResponse.json({ cartCount, unreadMessages, unreadNotifications: unreadNotifs }, { headers: { "Cache-Control": "no-store" } });
}
