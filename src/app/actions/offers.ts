"use server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customOffers, customRequests, users, profiles } from "@/db/schema";
import { requireAction, run, ActionError } from "@/lib/auth/guards";
import { authorizeConversation, postMessage } from "@/lib/chat";
import { addOfferToCart, getCartCount } from "@/lib/cart";
import { notify, notifyAdmins } from "@/lib/notifications";
import { publish } from "@/lib/realtime/bus";
import { sendMail, absoluteUrl } from "@/lib/mail";
import { audit } from "@/lib/audit";

async function ownOffer(userId: string, offerId: string) {
  const [o] = await db.select().from(customOffers).where(eq(customOffers.id, offerId));
  if (!o || o.customerId !== userId) throw new ActionError("not_found");
  return o;
}

async function broadcast(o: typeof customOffers.$inferSelect) {
  await publish({ type: "offer", to: { users: [o.customerId], admins: true }, data: { conversationId: o.conversationId, offerId: o.id } });
}

/** Accepting places the offer in the cart. It never charges the customer — payment happens at checkout. */
export async function acceptOfferAction(offerId: string) {
  return run(async () => {
    const user = await requireAction("adult");
    const o = await ownOffer(user.id, z.uuid().parse(offerId));
    if (o.status !== "open" && o.status !== "accepted") throw new ActionError("offer_unavailable");
    if (o.deadline && o.deadline.getTime() < Date.now()) throw new ActionError("offer_expired");
    if (o.status === "open") {
      await db.update(customOffers).set({ status: "accepted", respondedAt: new Date(), updatedAt: new Date() }).where(and(eq(customOffers.id, o.id), eq(customOffers.status, "open")));
      if (o.requestId) await db.update(customRequests).set({ status: "accepted", updatedAt: new Date() }).where(eq(customRequests.id, o.requestId));
      await notifyAdmins("admin_offer_response", { conversationId: o.conversationId });
    }
    const cartCount = await addOfferToCart(user, o.id);
    await broadcast({ ...o, status: "accepted" });
    return { cartCount };
  });
}

export async function declineOfferAction(offerId: string) {
  return run(async () => {
    const user = await requireAction("adult");
    const o = await ownOffer(user.id, z.uuid().parse(offerId));
    if (o.status !== "open" && o.status !== "accepted") throw new ActionError("offer_unavailable");
    await db.update(customOffers).set({ status: "declined", respondedAt: new Date(), updatedAt: new Date() }).where(eq(customOffers.id, o.id));
    await notifyAdmins("admin_offer_response", { conversationId: o.conversationId });
    await broadcast(o);
    return { ok: true };
  });
}

export async function addOfferToCartAction(offerId: string) {
  return run(async () => {
    const user = await requireAction("adult");
    await addOfferToCart(user, z.uuid().parse(offerId));
    return { cartCount: await getCartCount(user) };
  });
}

/* ───────────── Admin: create / withdraw offers ───────────── */

const offerSchema = z.object({
  conversationId: z.uuid(),
  requestId: z.uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""),
  price: z.coerce.number().positive().max(100000),
  deliveryDetails: z.string().trim().max(500).default(""),
  deadline: z.string().optional().or(z.literal("")),
});

export async function createOfferAction(input: z.input<typeof offerSchema>) {
  return run(async () => {
    const admin = await requireAction("admin");
    const parsed = offerSchema.safeParse(input);
    if (!parsed.success) throw new ActionError("invalid");
    const v = parsed.data;
    const c = await authorizeConversation(admin, v.conversationId);
    const requestId = v.requestId || null;
    if (requestId) {
      const [r] = await db.select().from(customRequests).where(eq(customRequests.id, requestId));
      if (!r || r.customerId !== c.customerId) throw new ActionError("invalid");
    }
    const deadline = v.deadline ? new Date(v.deadline) : null;
    if (deadline && Number.isNaN(deadline.getTime())) throw new ActionError("invalid");
    const [offer] = await db
      .insert(customOffers)
      .values({
        conversationId: c.id,
        customerId: c.customerId,
        requestId,
        title: v.title,
        description: v.description,
        priceCents: Math.round(v.price * 100),
        deliveryDetails: v.deliveryDetails,
        deadline,
        createdById: admin.id,
      })
      .returning();
    if (requestId) await db.update(customRequests).set({ status: "offer_sent", updatedAt: new Date() }).where(eq(customRequests.id, requestId));
    await postMessage(admin, c, { body: "", kind: "offer", offerId: offer!.id, skipRateLimit: true });
    await notify(c.customerId, "offer_received", { conversationId: c.id, title: offer!.title });
    const [cust] = await db.select({ email: users.email, locale: profiles.locale }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, c.customerId));
    if (cust) await sendMail(cust.email, "offerReceived", cust.locale ?? "de", { title: offer!.title }, absoluteUrl(`/${cust.locale ?? "de"}/messages/${c.id}`));
    await audit(admin.id, "offer.create", { type: "offer", id: offer!.id }, { priceCents: offer!.priceCents });
    return { id: offer!.id };
  });
}

export async function withdrawOfferAction(offerId: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const id = z.uuid().parse(offerId);
    const [current] = await db.select().from(customOffers).where(eq(customOffers.id, id));
    if (!current) throw new ActionError("not_found");
    if (current.status === "paid") throw new ActionError("conflict");
    const [o] = await db
      .update(customOffers)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(and(eq(customOffers.id, id), ne(customOffers.status, "paid")))
      .returning();
    if (!o) throw new ActionError("conflict");
    await broadcast(o);
    await audit(admin.id, "offer.withdraw", { type: "offer", id: o.id });
    return { ok: true };
  });
}
