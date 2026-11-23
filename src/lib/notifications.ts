import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { publish } from "./realtime/bus";

/**
 * In-app notification types. Text is rendered client-side from the
 * `notifications.<type>` translation keys, in the reader's current language.
 */
export type NotificationType =
  | "message_from_lisa"
  | "offer_received"
  | "request_update"
  | "order_paid"
  | "product_available"
  | "refund_update"
  | "admin_new_message"
  | "admin_new_request"
  | "admin_offer_response"
  | "admin_new_order"
  | "admin_payment_issue";

export async function notify(userId: string, type: NotificationType, data: Record<string, string | number | null> = {}) {
  const [row] = await db.insert(notifications).values({ userId, type, data }).returning({ id: notifications.id });
  await publish({ type: "notification", to: { users: [userId] }, data: { id: row!.id, kind: type } });
}

export async function adminIds(): Promise<string[]> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  return rows.map((r) => r.id);
}

export async function notifyAdmins(type: NotificationType, data: Record<string, string | number | null> = {}) {
  for (const id of await adminIds()) await notify(id, type, data);
}
