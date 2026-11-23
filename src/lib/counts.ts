import "server-only";
import { and, count, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, notifications } from "@/db/schema";
import type { CurrentUser } from "./auth/session";

/** Number of conversations with messages the user has not read yet. */
export async function unreadConversations(user: CurrentUser): Promise<number> {
  const where = user.isAdmin
    ? and(
        eq(conversations.lastSenderRole, "customer"),
        ne(conversations.status, "archived"),
        or(isNull(conversations.adminLastReadAt), gt(conversations.lastMessageAt, conversations.adminLastReadAt)),
      )
    : and(
        eq(conversations.customerId, user.id),
        eq(conversations.lastSenderRole, "admin"),
        or(isNull(conversations.customerLastReadAt), gt(conversations.lastMessageAt, conversations.customerLastReadAt)),
      );
  const [r] = await db.select({ n: count() }).from(conversations).where(where);
  return Number(r?.n ?? 0);
}

export async function unreadNotifications(userId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), gt(notifications.createdAt, sql`now() - interval '60 days'`)));
  return Number(r?.n ?? 0);
}
