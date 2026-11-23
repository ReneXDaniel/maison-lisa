"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { conversationNotes, customRequests, users, profiles, sessions } from "@/db/schema";
import { requireAction, run, ActionError } from "@/lib/auth/guards";
import { setConversationState } from "@/lib/chat";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { publish } from "@/lib/realtime/bus";
import { sendMail, absoluteUrl } from "@/lib/mail";
import { serverTranslator } from "@/lib/i18n-server";
import { CONVERSATION_STATUSES, REQUEST_STATUSES } from "@/lib/constants";


export async function setConversationStatusAction(id: string, status: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const s = z.enum(CONVERSATION_STATUSES).parse(status);
    await setConversationState(admin, z.uuid().parse(id), { status: s });
    await audit(admin.id, "conversation.status", { type: "conversation", id }, { status: s });
    revalidatePath("/[locale]/admin/messages", "layout");
  });
}

export async function toggleFlagAction(id: string, flagged: boolean) {
  return run(async () => {
    const admin = await requireAction("admin");
    await setConversationState(admin, z.uuid().parse(id), { flagged });
    revalidatePath("/[locale]/admin/messages", "layout");
  });
}

export async function addNoteAction(conversationId: string, body: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const text = z.string().trim().min(1).max(2000).parse(body);
    await db.insert(conversationNotes).values({ conversationId: z.uuid().parse(conversationId), authorId: admin.id, body: text });
    revalidatePath("/[locale]/admin/messages", "layout");
  });
}

/** Lisa decides which requests she accepts; customers are notified of each change. */
export async function setRequestStatusAction(requestId: string, status: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const s = z.enum(REQUEST_STATUSES).parse(status);
    const [r] = await db.update(customRequests).set({ status: s, updatedAt: new Date() }).where(eq(customRequests.id, z.uuid().parse(requestId))).returning();
    if (!r) throw new ActionError("not_found");
    await notify(r.customerId, "request_update", { number: r.number, requestId: r.id, conversationId: r.conversationId });
    await publish({ type: "request", to: { users: [r.customerId], admins: true }, data: { conversationId: r.conversationId, requestId: r.id } });
    const [c] = await db.select({ email: users.email, locale: profiles.locale }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, r.customerId));
    if (c) {
      const t = await serverTranslator(c.locale ?? "de", "requests.status");
      await sendMail(c.email, "requestUpdate", c.locale ?? "de", { number: r.number, status: t(s) }, absoluteUrl(`/${c.locale ?? "de"}/account/requests`));
    }
    await audit(admin.id, "request.status", { type: "request", id: r.id }, { status: s });
    revalidatePath("/[locale]/admin", "layout");
  });
}

/** Restricts an abusive account: sessions are ended, messaging and purchasing are blocked. */
export async function setBlockedAction(userId: string, blocked: boolean, reason?: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const id = z.uuid().parse(userId);
    if (id === admin.id) throw new ActionError("forbidden");
    await db
      .update(users)
      .set(blocked ? { blockedAt: new Date(), blockedReason: (reason ?? "").slice(0, 300) || null } : { blockedAt: null, blockedReason: null })
      .where(eq(users.id, id));
    if (blocked) await db.delete(sessions).where(eq(sessions.userId, id));
    await audit(admin.id, blocked ? "customer.block" : "customer.unblock", { type: "user", id }, { reason });
    revalidatePath("/[locale]/admin", "layout");
  });
}
