import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  conversations,
  customOffers,
  customRequests,
  messageAttachments,
  messages,
  profiles,
  users,
} from "@/db/schema";
import { ActionError } from "./auth/guards";
import type { CurrentUser } from "./auth/session";
import { publish } from "./realtime/bus";
import { notify, notifyAdmins } from "./notifications";
import { rateLimit, LIMITS } from "./rate-limit";
import { sendMail, absoluteUrl } from "./mail";
import { env } from "./env";
import { brand } from "@/config/brand";

export const MAX_MESSAGE_LENGTH = 4000;
type Conversation = typeof conversations.$inferSelect;

/* ───────────── Authorization ───────────── */

/** Loads a conversation only if the user is a participant (its customer) or an administrator. */
export async function authorizeConversation(user: CurrentUser, id: string): Promise<Conversation> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ActionError("not_found");
  const [c] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!c) throw new ActionError("not_found");
  if (!user.isAdmin && c.customerId !== user.id) throw new ActionError("not_found"); // do not reveal existence
  return c;
}

/* ───────────── Listing ───────────── */

export type ConversationSummary = {
  id: string;
  subject: string | null;
  status: Conversation["status"];
  flagged: boolean;
  lastMessageAt: string;
  preview: string | null;
  lastSenderRole: string | null;
  unread: number;
  counterpart: string;
  customerId: string;
};

function unreadExpr(isAdmin: boolean) {
  const readCol = isAdmin ? conversations.adminLastReadAt : conversations.customerLastReadAt;
  const otherRole = isAdmin ? "customer" : "admin";
  return sql<number>`(select count(*)::int from ${messages} m where m.conversation_id = ${conversations.id}
    and m.sender_role = ${otherRole} and (${readCol} is null or m.created_at > ${readCol}))`;
}

export async function listConversations(
  user: CurrentUser,
  opts: { q?: string; filter?: "all" | "unread" | "flagged" | "archived" | "awaiting_lisa" | "awaiting_customer" } = {},
): Promise<ConversationSummary[]> {
  const where: (SQL | undefined)[] = [];
  if (!user.isAdmin) where.push(eq(conversations.customerId, user.id));
  const q = opts.q?.trim().slice(0, 100);
  if (q) {
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
    const matchMsg = sql`exists (select 1 from ${messages} m where m.conversation_id = ${conversations.id} and m.body ilike ${like})`;
    where.push(user.isAdmin ? or(ilike(conversations.subject, like), matchMsg, ilike(profiles.displayName, like), ilike(users.email, like)) : or(ilike(conversations.subject, like), matchMsg));
  }
  if (user.isAdmin) {
    switch (opts.filter) {
      case "archived":
        where.push(eq(conversations.status, "archived"));
        break;
      case "flagged":
        where.push(eq(conversations.flagged, true));
        break;
      case "unread":
        where.push(sql`${unreadExpr(true)} > 0`, ne(conversations.status, "archived"));
        break;
      case "awaiting_lisa":
      case "awaiting_customer":
        where.push(eq(conversations.status, opts.filter));
        break;
      default:
        where.push(ne(conversations.status, "archived"));
    }
  }
  const rows = await db
    .select({ c: conversations, name: profiles.displayName, unread: unreadExpr(user.isAdmin) })
    .from(conversations)
    .innerJoin(users, eq(users.id, conversations.customerId))
    .leftJoin(profiles, eq(profiles.userId, conversations.customerId))
    .where(and(...where.filter(Boolean)))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);
  return rows.map(({ c, name, unread }) => ({
    id: c.id,
    subject: c.subject,
    status: c.status,
    flagged: c.flagged,
    lastMessageAt: c.lastMessageAt.toISOString(),
    preview: c.lastMessagePreview,
    lastSenderRole: c.lastSenderRole,
    unread: Number(unread),
    counterpart: user.isAdmin ? (name ?? "—") : brand.creatorName,
    customerId: c.customerId,
  }));
}

/* ───────────── Messages ───────────── */

export type ChatMessage = {
  id: string;
  kind: "text" | "request" | "offer" | "system";
  body: string;
  mine: boolean;
  senderRole: string | null;
  createdAt: string;
  attachments: { id: string; width: number | null; height: number | null; fileName: string }[];
  request?: { id: string; number: number; status: string; selections: Record<string, string>; notes: string | null };
  offer?: { id: string; title: string; description: string; priceCents: number; currency: string; deliveryDetails: string; deadline: string | null; status: string };
};

export type ConversationMeta = {
  id: string;
  subject: string | null;
  status: Conversation["status"];
  flagged: boolean;
  counterpart: string;
  customerId: string;
  /** Present only when the other participant allows read receipts. */
  otherReadAt: string | null;
  otherDeliveredAt: string | null;
};

async function readReceiptsAllowed(userId: string) {
  const [p] = await db.select({ r: profiles.readReceipts }).from(profiles).where(eq(profiles.userId, userId));
  return p?.r ?? true;
}

export async function conversationMeta(user: CurrentUser, c: Conversation): Promise<ConversationMeta> {
  const [p] = await db.select({ name: profiles.displayName }).from(profiles).where(eq(profiles.userId, c.customerId));
  // The other side's read receipts are shown only if *they* allow them.
  let otherAllows = true;
  if (user.isAdmin) otherAllows = await readReceiptsAllowed(c.customerId);
  else {
    const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    otherAllows = admin ? await readReceiptsAllowed(admin.id) : true;
  }
  const otherRead = user.isAdmin ? c.customerLastReadAt : c.adminLastReadAt;
  const otherDelivered = user.isAdmin ? c.customerLastDeliveredAt : c.adminLastDeliveredAt;
  return {
    id: c.id,
    subject: c.subject,
    status: c.status,
    flagged: c.flagged,
    counterpart: user.isAdmin ? (p?.name ?? "—") : brand.creatorName,
    customerId: c.customerId,
    otherReadAt: otherAllows && otherRead ? otherRead.toISOString() : null,
    otherDeliveredAt: otherDelivered ? otherDelivered.toISOString() : null,
  };
}

export async function listMessages(user: CurrentUser, c: Conversation, opts: { after?: string; before?: string; limit?: number } = {}): Promise<ChatMessage[]> {
  const limit = Math.min(opts.limit ?? 50, 100);
  const conds: SQL[] = [eq(messages.conversationId, c.id)];
  if (opts.after) conds.push(gt(messages.createdAt, new Date(opts.after)));
  if (opts.before) conds.push(lt(messages.createdAt, new Date(opts.before)));
  // newest page first, then reverse into chronological order
  const rows = await db
    .select()
    .from(messages)
    .where(and(...conds))
    .orderBy(opts.after ? asc(messages.createdAt) : desc(messages.createdAt))
    .limit(limit);
  const list = opts.after ? rows : rows.reverse();
  if (!list.length) return [];
  const ids = list.map((m) => m.id);
  const reqIds = list.map((m) => m.requestId).filter(Boolean) as string[];
  const offerIds = list.map((m) => m.offerId).filter(Boolean) as string[];
  const [atts, reqs, offs] = await Promise.all([
    db.select().from(messageAttachments).where(inArray(messageAttachments.messageId, ids)),
    reqIds.length ? db.select().from(customRequests).where(inArray(customRequests.id, reqIds)) : Promise.resolve([]),
    offerIds.length ? db.select().from(customOffers).where(inArray(customOffers.id, offerIds)) : Promise.resolve([]),
  ]);
  const myRole = user.isAdmin ? "admin" : "customer";
  return list.map((m) => {
    const r = m.requestId ? reqs.find((x) => x.id === m.requestId) : undefined;
    const o = m.offerId ? offs.find((x) => x.id === m.offerId) : undefined;
    return {
      id: m.id,
      kind: m.kind,
      body: m.body,
      mine: m.senderRole === myRole,
      senderRole: m.senderRole,
      createdAt: m.createdAt.toISOString(),
      attachments: atts.filter((a) => a.messageId === m.id).map((a) => ({ id: a.id, width: a.width, height: a.height, fileName: a.fileName })),
      request: r ? { id: r.id, number: r.number, status: r.status, selections: r.selections as Record<string, string>, notes: r.notes } : undefined,
      offer: o
        ? { id: o.id, title: o.title, description: o.description, priceCents: o.priceCents, currency: o.currency, deliveryDetails: o.deliveryDetails, deadline: o.deadline?.toISOString() ?? null, status: o.status }
        : undefined,
    };
  });
}

/* ───────────── Writing ───────────── */

export async function createConversation(user: CurrentUser, subject?: string | null) {
  if (user.isAdmin) throw new ActionError("forbidden");
  const [c] = await db
    .insert(conversations)
    .values({ customerId: user.id, subject: subject?.trim().slice(0, 120) || null, status: "new" })
    .returning();
  return c!;
}

/** Most recent non-archived conversation or a new one. Used by "Message Lisa" and request submission. */
export async function latestOrNewConversation(user: CurrentUser, subject?: string) {
  const [c] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.customerId, user.id), ne(conversations.status, "archived"), ne(conversations.status, "completed")))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1);
  return c ?? createConversation(user, subject);
}

const preview = (kind: string, body: string) => (kind === "text" ? body.replace(/\s+/g, " ").slice(0, 140) : `[${kind}]`);

/**
 * Persists a message and fans it out. `attachments` must already be stored
 * and validated (see /api/chat/.../messages).
 */
export async function postMessage(
  user: CurrentUser,
  c: Conversation,
  input: {
    body: string;
    kind?: "text" | "request" | "offer" | "system";
    requestId?: string;
    offerId?: string;
    attachments?: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number; width: number; height: number; scanStatus: "clean" | "reencoded" }[];
    skipRateLimit?: boolean;
  },
) {
  const body = input.body.trim();
  const kind = input.kind ?? "text";
  if (kind === "text" && !body && !input.attachments?.length) throw new ActionError("message_empty");
  if (body.length > MAX_MESSAGE_LENGTH) throw new ActionError("message_too_long");
  if (user.blocked) throw new ActionError("blocked");
  if (!input.skipRateLimit) {
    const okMin = await rateLimit(`msg:${user.id}`, LIMITS.message.limit, LIMITS.message.window);
    const okDay = await rateLimit(`msgday:${user.id}`, LIMITS.messageDaily.limit, LIMITS.messageDaily.window);
    if (!okMin || !okDay) throw new ActionError("rate_limited");
  }

  const role = user.isAdmin ? "admin" : "customer";
  const now = new Date();
  const msg = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(messages)
      .values({ conversationId: c.id, senderId: user.id, senderRole: role, kind, body, requestId: input.requestId, offerId: input.offerId, createdAt: now })
      .returning();
    if (input.attachments?.length) {
      await tx.insert(messageAttachments).values(input.attachments.map((a) => ({ ...a, messageId: m!.id, conversationId: c.id, uploaderId: user.id })));
    }
    await tx
      .update(conversations)
      .set({
        lastMessageAt: now,
        lastMessagePreview: preview(kind, body || "📎"),
        lastSenderRole: role,
        status: role === "admin" ? "awaiting_customer" : "awaiting_lisa",
        ...(role === "admin" ? { adminLastReadAt: now, adminLastDeliveredAt: now } : { customerLastReadAt: now, customerLastDeliveredAt: now }),
        updatedAt: now,
      })
      .where(eq(conversations.id, c.id));
    return m!;
  });

  // Fan-out: realtime to the other side, plus a persistent notification.
  if (role === "admin") {
    await publish({ type: "message", to: { users: [c.customerId], admins: true }, data: { conversationId: c.id, messageId: msg.id } });
    if (kind !== "offer") await notify(c.customerId, "message_from_lisa", { conversationId: c.id });
    await maybeEmailCustomer(c);
  } else {
    await publish({ type: "message", to: { users: [c.customerId], admins: true }, data: { conversationId: c.id, messageId: msg.id } });
    if (kind === "text") await notifyAdmins("admin_new_message", { conversationId: c.id });
    await maybeEmailAdmin(c, user.displayName);
  }
  return msg;
}

/** Email the customer about a reply — at most every 30 minutes per conversation, and never with content. */
async function maybeEmailCustomer(c: Conversation) {
  if (c.lastCustomerEmailAt && Date.now() - c.lastCustomerEmailAt.getTime() < 30 * 60_000) return;
  const [row] = await db.select({ email: users.email, p: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, c.customerId));
  if (!row || !row.p?.notifyEmailMessages) return;
  await db.update(conversations).set({ lastCustomerEmailAt: new Date() }).where(eq(conversations.id, c.id));
  await sendMail(row.email, "newMessage", row.p.locale, {}, absoluteUrl(`/${row.p.locale}/messages/${c.id}`));
}

async function maybeEmailAdmin(c: Conversation, customer: string) {
  const to = env().ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  if (c.lastAdminEmailAt && Date.now() - c.lastAdminEmailAt.getTime() < 30 * 60_000) return;
  await db.update(conversations).set({ lastAdminEmailAt: new Date() }).where(eq(conversations.id, c.id));
  await sendMail(to, "adminNewMessage", "de", { customer }, absoluteUrl(`/de/admin/messages/${c.id}`));
}

export async function markRead(user: CurrentUser, c: Conversation) {
  const now = new Date();
  const patch = user.isAdmin ? { adminLastReadAt: now, adminLastDeliveredAt: now } : { customerLastReadAt: now, customerLastDeliveredAt: now };
  await db.update(conversations).set(patch).where(eq(conversations.id, c.id));
  await publish({ type: "receipt", to: { users: [c.customerId], admins: true }, data: { conversationId: c.id } });
}

export async function markDelivered(user: CurrentUser, conversationIds: string[]) {
  if (!conversationIds.length) return;
  const now = new Date();
  const col = user.isAdmin ? conversations.adminLastDeliveredAt : conversations.customerLastDeliveredAt;
  const scope = user.isAdmin ? inArray(conversations.id, conversationIds) : and(inArray(conversations.id, conversationIds), eq(conversations.customerId, user.id));
  const updated = await db
    .update(conversations)
    .set(user.isAdmin ? { adminLastDeliveredAt: now } : { customerLastDeliveredAt: now })
    .where(and(scope, or(isNull(col), lt(col, conversations.lastMessageAt))))
    .returning({ id: conversations.id, customerId: conversations.customerId });
  for (const u of updated) await publish({ type: "receipt", to: { users: [u.customerId], admins: true }, data: { conversationId: u.id } });
}

export async function setConversationState(admin: CurrentUser, id: string, patch: Partial<Pick<Conversation, "status" | "flagged">>) {
  if (!admin.isAdmin) throw new ActionError("forbidden");
  const [c] = await db.update(conversations).set({ ...patch, updatedAt: new Date() }).where(eq(conversations.id, id)).returning();
  if (c) await publish({ type: "conversation", to: { users: [c.customerId], admins: true }, data: { conversationId: c.id } });
  return c;
}
