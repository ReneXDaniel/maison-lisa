"use server";
import { revalidatePath } from "next/cache";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  collections,
  collectionTranslations,
  contentBlocks,
  customOffers,
  customRequests,
  deliveryFiles,
  discounts,
  lookPollOptions,
  lookPolls,
  media,
  orderItems,
  orders,
  products,
  productTranslations,
  profiles,
  releases,
  releaseTranslations,
  users,
} from "@/db/schema";
import { requireAction, run, ActionError } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { setSettings, getSettings, type SiteMediaSlots } from "@/lib/settings";
import { normalizeCode } from "@/lib/discounts";
import { handlePaymentEvent } from "@/lib/payments/fulfillment";
import { notify } from "@/lib/notifications";
import { publish } from "@/lib/realtime/bus";
import { sendMail, absoluteUrl } from "@/lib/mail";
import { EDITABLE_CONTENT } from "@/lib/content";
import { locales } from "@/i18n/routing";
import { ACCESSORIES, BACKGROUNDS, FOOTWEAR, STOCKINGS } from "@/lib/catalog-options";

const refresh = () => revalidatePath("/[locale]", "layout");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const cents = (v: string) => {
  const n = Number(v.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100000) throw new ActionError("invalid", { price: "invalid" });
  return Math.round(n * 100);
};
const dateOrNull = (v: string) => (v ? new Date(v) : null);

type Tr = { locale: string; title: string; description: string; details: string };
function translationsFrom(fd: FormData, _fields: string[]): Tr[] {
  return locales
    .map((l) => ({ locale: l, title: str(fd, `tr.${l}.title`), description: str(fd, `tr.${l}.description`), details: str(fd, `tr.${l}.details`) }))
    .filter((t) => t.title);
}

/* ───────────── Products ───────────── */

export async function saveProductAction(fd: FormData) {
  return run(async () => {
    const admin = await requireAction("admin");
    const id = str(fd, "id") || null;
    const tr = translationsFrom(fd, ["title", "description", "details"]);
    if (!tr.length) throw new ActionError("invalid", { title: "required" });
    const slug = slugify(str(fd, "slug") || tr[0]!.title);
    if (!slug) throw new ActionError("invalid", { slug: "invalid" });
    const values = {
      slug,
      collectionId: str(fd, "collectionId") || null,
      priceCents: cents(str(fd, "price")),
      format: str(fd, "format").slice(0, 120) || "JPEG · high resolution",
      status: z.enum(["draft", "published", "archived"]).parse(str(fd, "status") || "draft"),
      featured: bool(fd, "featured"),
      verifiedPreviewOnly: bool(fd, "verifiedPreviewOnly"),
      sortOrder: Number(str(fd, "sortOrder") || 0) || 0,
      updatedAt: new Date(),
    };
    let productId = id;
    try {
      if (id) await db.update(products).set(values).where(eq(products.id, id));
      else productId = (await db.insert(products).values(values).returning({ id: products.id }))[0]!.id;
    } catch {
      throw new ActionError("conflict", { slug: "taken" });
    }
    await db.delete(productTranslations).where(eq(productTranslations.productId, productId!));
    await db.insert(productTranslations).values(tr.map((t) => ({ productId: productId!, locale: t.locale, title: t.title, description: t.description ?? "", details: t.details ?? "" })));
    await audit(admin.id, id ? "product.update" : "product.create", { type: "product", id: productId! }, { priceCents: values.priceCents, status: values.status });
    refresh();
    return { id: productId! };
  });
}

/** Products that were ever ordered are archived instead of deleted (order history must stay intact). */
export async function deleteProductAction(id: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.productId, id));
    if (Number(n) > 0) {
      await db.update(products).set({ status: "archived", updatedAt: new Date() }).where(eq(products.id, id));
      await audit(admin.id, "product.archive", { type: "product", id });
    } else {
      const files = await db.select().from(media).where(eq(media.productId, id));
      for (const f of files) await removeStored(f);
      await db.delete(products).where(eq(products.id, id));
      await audit(admin.id, "product.delete", { type: "product", id });
    }
    refresh();
  });
}

async function removeStored(m: typeof media.$inferSelect) {
  const s = storage();
  if (m.variants.length) for (const v of m.variants) await s.delete(v.key).catch(() => {});
  else await s.delete(m.storageKey).catch(() => {});
}

export async function setProductCoverAction(productId: string, mediaId: string) {
  return run(async () => {
    await requireAction("admin");
    await db.update(products).set({ coverMediaId: mediaId }).where(eq(products.id, productId));
    refresh();
  });
}

export async function updateMediaAction(mediaId: string, patch: { visibility?: "public" | "verified"; sortOrder?: number; alt?: string }) {
  return run(async () => {
    await requireAction("admin");
    const [m] = await db.select().from(media).where(eq(media.id, mediaId));
    if (!m) throw new ActionError("not_found");
    if (patch.visibility && m.kind !== "product_preview") throw new ActionError("invalid");
    await db
      .update(media)
      .set({ ...(patch.visibility ? { visibility: patch.visibility } : {}), ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}), ...(patch.alt !== undefined ? { alt: patch.alt.slice(0, 200) } : {}) })
      .where(eq(media.id, mediaId));
    refresh();
  });
}

export async function deleteMediaAction(mediaId: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const [m] = await db.select().from(media).where(eq(media.id, mediaId));
    if (!m) throw new ActionError("not_found");
    if (m.kind === "product_original") {
      const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.productId, m.productId!));
      if (Number(n) > 0) throw new ActionError("conflict"); // buyers rely on these files
    }
    await removeStored(m);
    await db.delete(media).where(eq(media.id, mediaId));
    if (m.productId) {
      const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(media).where(and(eq(media.productId, m.productId), eq(media.kind, "product_original")));
      await db.update(products).set({ imageCount: Number(n) }).where(eq(products.id, m.productId));
      await db.update(products).set({ coverMediaId: null }).where(and(eq(products.id, m.productId), eq(products.coverMediaId, mediaId)));
    }
    await audit(admin.id, "media.delete", { type: "media", id: mediaId });
    refresh();
  });
}

/* ───────────── Collections ───────────── */

export async function saveCollectionAction(fd: FormData) {
  return run(async () => {
    const admin = await requireAction("admin");
    const id = str(fd, "id") || null;
    const tr = translationsFrom(fd, ["title", "description"]);
    if (!tr.length) throw new ActionError("invalid");
    const values = { slug: slugify(str(fd, "slug") || tr[0]!.title), sortOrder: Number(str(fd, "sortOrder") || 0) || 0, published: bool(fd, "published"), coverMediaId: str(fd, "coverMediaId") || null };
    let cid = id;
    try {
      if (id) await db.update(collections).set(values).where(eq(collections.id, id));
      else cid = (await db.insert(collections).values(values).returning({ id: collections.id }))[0]!.id;
    } catch {
      throw new ActionError("conflict");
    }
    await db.delete(collectionTranslations).where(eq(collectionTranslations.collectionId, cid!));
    await db.insert(collectionTranslations).values(tr.map((t) => ({ collectionId: cid!, locale: t.locale, title: t.title, description: t.description ?? "" })));
    await audit(admin.id, id ? "collection.update" : "collection.create", { type: "collection", id: cid! });
    refresh();
    return { id: cid! };
  });
}

export async function deleteCollectionAction(id: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    await db.delete(collections).where(eq(collections.id, id)); // products keep existing (collection set null)
    await audit(admin.id, "collection.delete", { type: "collection", id });
    refresh();
  });
}

/* ───────────── Discounts ───────────── */

export async function saveDiscountAction(fd: FormData) {
  return run(async () => {
    const admin = await requireAction("admin");
    const id = str(fd, "id") || null;
    const kind = z.enum(["percent", "fixed"]).parse(str(fd, "kind"));
    const rawValue = Number(str(fd, "value").replace(",", "."));
    if (!Number.isFinite(rawValue) || rawValue <= 0) throw new ActionError("invalid", { value: "invalid" });
    if (kind === "percent" && rawValue > 100) throw new ActionError("invalid", { value: "invalid" });
    const isWelcome = bool(fd, "isWelcome");
    const code = isWelcome ? null : normalizeCode(str(fd, "code"));
    if (!isWelcome && (!code || code.length < 3)) throw new ActionError("invalid", { code: "invalid" });
    const ids = (k: string) => str(fd, k).split(/[\s,]+/).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
    const values = {
      code,
      name: str(fd, "name").slice(0, 120) || code || "Welcome",
      kind,
      value: kind === "percent" ? Math.round(rawValue) : Math.round(rawValue * 100),
      scope: z.enum(["order", "products", "collections"]).parse(str(fd, "scope") || "order"),
      productIds: ids("productIds"),
      collectionIds: ids("collectionIds"),
      excludedProductIds: ids("excludedProductIds"),
      minOrderCents: str(fd, "minOrder") ? cents(str(fd, "minOrder")) : 0,
      startsAt: dateOrNull(str(fd, "startsAt")),
      endsAt: dateOrNull(str(fd, "endsAt")),
      maxRedemptions: str(fd, "maxRedemptions") ? Math.max(1, Number(str(fd, "maxRedemptions"))) : null,
      perCustomerLimit: Math.max(1, Number(str(fd, "perCustomerLimit") || 1)),
      firstOrderOnly: isWelcome || bool(fd, "firstOrderOnly"),
      customerId: str(fd, "customerId") || null,
      stackable: bool(fd, "stackable"),
      active: bool(fd, "active"),
      isWelcome,
      updatedAt: new Date(),
    };
    let did = id;
    try {
      if (id) await db.update(discounts).set(values).where(eq(discounts.id, id));
      else did = (await db.insert(discounts).values(values).returning({ id: discounts.id }))[0]!.id;
    } catch {
      throw new ActionError("conflict", { code: "taken" });
    }
    await audit(admin.id, id ? "discount.update" : "discount.create", { type: "discount", id: did! }, { code, value: values.value, active: values.active });
    refresh();
    return { id: did! };
  });
}

export async function toggleDiscountAction(id: string, active: boolean) {
  return run(async () => {
    const admin = await requireAction("admin");
    await db.update(discounts).set({ active, updatedAt: new Date() }).where(eq(discounts.id, id));
    await audit(admin.id, "discount.toggle", { type: "discount", id }, { active });
    refresh();
  });
}

/* ───────────── Settings & content ───────────── */

export async function saveSettingsAction(fd: FormData) {
  return run(async () => {
    const admin = await requireAction("admin");
    const num = (k: string, min: number, max: number) => Math.min(max, Math.max(min, Number(str(fd, k)) || min));
    const manifest = str(fd, "stockingSequenceManifest");
    if (manifest && !/^(https:\/\/|\/)/.test(manifest)) throw new ActionError("invalid");
    await setSettings({
      allowDiscountStacking: bool(fd, "allowDiscountStacking"),
      welcomeOncePerIdentity: bool(fd, "welcomeOncePerIdentity"),
      downloadLinkTtlMinutes: num("downloadLinkTtlMinutes", 2, 1440),
      checkoutSessionMinutes: num("checkoutSessionMinutes", 10, 1440),
      chatAttachmentsEnabled: bool(fd, "chatAttachmentsEnabled"),
      maxAttachmentMb: num("maxAttachmentMb", 1, 25),
      stockingSequenceManifest: manifest,
    });
    await audit(admin.id, "settings.update");
    refresh();
  });
}

const SLOTS = ["hero", "silkReveal", "hotspotImage", "aboutPortrait", "nailBase", "nailMask", "lookStudio"] as const;

export async function assignMediaSlotAction(slot: string, mediaId: string | null) {
  return run(async () => {
    const admin = await requireAction("admin");
    const { siteMedia } = await getSettings();
    const next: SiteMediaSlots = { ...siteMedia };
    if (slot === "behindScenes") {
      const list = new Set(next.behindScenes ?? []);
      if (mediaId) list.has(mediaId) ? list.delete(mediaId) : list.add(mediaId);
      next.behindScenes = [...list];
    } else {
      const s = z.enum(SLOTS).parse(slot);
      next[s] = mediaId ?? undefined;
    }
    await setSettings({ siteMedia: next });
    await audit(admin.id, "media.assign_slot", { type: "media", id: mediaId ?? "-" }, { slot });
    refresh();
  });
}

export async function saveContentAction(locale: string, entries: Record<string, string>) {
  return run(async () => {
    const admin = await requireAction("admin");
    const l = z.enum(locales).parse(locale);
    const allowed = new Set(EDITABLE_CONTENT.map((c) => c.key));
    for (const [key, value] of Object.entries(entries)) {
      if (!allowed.has(key)) continue;
      const v = value.trim().slice(0, 5000);
      if (!v) await db.delete(contentBlocks).where(and(eq(contentBlocks.key, key), eq(contentBlocks.locale, l)));
      else
        await db
          .insert(contentBlocks)
          .values({ key, locale: l, value: v, updatedById: admin.id })
          .onConflictDoUpdate({ target: [contentBlocks.key, contentBlocks.locale], set: { value: v, updatedById: admin.id, updatedAt: new Date() } });
    }
    await audit(admin.id, "content.update", { type: "content", id: l });
    refresh();
  });
}

/* ───────────── Releases & polls ───────────── */

export async function saveReleaseAction(fd: FormData) {
  return run(async () => {
    const admin = await requireAction("admin");
    const id = str(fd, "id") || null;
    const tr = translationsFrom(fd, ["title", "description"]);
    if (!tr.length) throw new ActionError("invalid");
    const values = { slug: slugify(str(fd, "slug") || tr[0]!.title), releaseAt: dateOrNull(str(fd, "releaseAt")), published: bool(fd, "published"), coverMediaId: str(fd, "coverMediaId") || null, sortOrder: Number(str(fd, "sortOrder") || 0) || 0 };
    let rid = id;
    try {
      if (id) await db.update(releases).set(values).where(eq(releases.id, id));
      else rid = (await db.insert(releases).values(values).returning({ id: releases.id }))[0]!.id;
    } catch {
      throw new ActionError("conflict");
    }
    await db.delete(releaseTranslations).where(eq(releaseTranslations.releaseId, rid!));
    await db.insert(releaseTranslations).values(tr.map((t) => ({ releaseId: rid!, locale: t.locale, title: t.title, description: t.description ?? "" })));
    await audit(admin.id, "release.save", { type: "release", id: rid! });
    refresh();
    return { id: rid! };
  });
}

export async function deleteReleaseAction(id: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    await db.delete(releases).where(eq(releases.id, id));
    await audit(admin.id, "release.delete", { type: "release", id });
    refresh();
  });
}

const optionSchema = z.object({ stockings: z.enum(STOCKINGS), footwear: z.enum(FOOTWEAR), accessory: z.enum(ACCESSORIES), background: z.enum(BACKGROUNDS) });

export async function createPollAction(options: z.input<typeof optionSchema>[]) {
  return run(async () => {
    const admin = await requireAction("admin");
    const opts = z.array(optionSchema).min(2).max(8).parse(options);
    await db.update(lookPolls).set({ active: false }).where(eq(lookPolls.active, true));
    const [poll] = await db.insert(lookPolls).values({ active: true }).returning();
    await db.insert(lookPollOptions).values(opts.map((o, i) => ({ pollId: poll!.id, ...o, sortOrder: i })));
    await audit(admin.id, "poll.create", { type: "poll", id: poll!.id });
    refresh();
  });
}

export async function closePollAction(id: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    await db.update(lookPolls).set({ active: false }).where(eq(lookPolls.id, id));
    await audit(admin.id, "poll.close", { type: "poll", id });
    refresh();
  });
}

/* ───────────── Customers, orders, deliveries ───────────── */

export async function revokeVerificationAction(userId: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    await db.update(users).set({ ageStatus: "revoked", ageVerifiedUntil: null, updatedAt: new Date() }).where(eq(users.id, z.uuid().parse(userId)));
    await audit(admin.id, "customer.verification_revoked", { type: "user", id: userId });
    refresh();
  });
}

/**
 * Records a refund that was issued in the payment provider's dashboard.
 * Uses the same fulfilment path as provider notifications (revokes access,
 * notifies the customer). A later provider notification is a no-op.
 */
export async function recordRefundAction(orderId: string, type: "refunded" | "chargeback") {
  return run(async () => {
    const admin = await requireAction("admin");
    const [o] = await db.select().from(orders).where(eq(orders.id, z.uuid().parse(orderId)));
    if (!o || o.status !== "paid") throw new ActionError("conflict");
    const outcome = await handlePaymentEvent(o.paymentProvider, { eventKey: `manual-${type}:${o.id}`, orderNumber: o.number, type, amountCents: o.totalCents, currency: o.currency });
    await audit(admin.id, `order.manual_${type}`, { type: "order", id: o.id }, { outcome });
    refresh();
    return { outcome };
  });
}

/** Marks a personal collection as delivered once its files are uploaded. */
export async function markDeliveredAction(offerId: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const [o] = await db.select().from(customOffers).where(eq(customOffers.id, z.uuid().parse(offerId)));
    if (!o || o.status !== "paid") throw new ActionError("conflict");
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(deliveryFiles).where(eq(deliveryFiles.offerId, o.id));
    if (!Number(n)) throw new ActionError("invalid");
    await db.update(customOffers).set({ deliveredAt: new Date(), updatedAt: new Date() }).where(eq(customOffers.id, o.id));
    if (o.requestId) await db.update(customRequests).set({ status: "delivered", updatedAt: new Date() }).where(eq(customRequests.id, o.requestId));
    await notify(o.customerId, "product_available", { conversationId: o.conversationId });
    await publish({ type: "request", to: { users: [o.customerId], admins: true }, data: { conversationId: o.conversationId } });
    const [c] = await db.select({ email: users.email, locale: profiles.locale }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, o.customerId));
    if (c) await sendMail(c.email, "deliveryReady", c.locale ?? "de", {}, absoluteUrl(`/${c.locale ?? "de"}/account/purchases`));
    await audit(admin.id, "offer.delivered", { type: "offer", id: o.id });
    refresh();
  });
}

export async function deleteDeliveryFileAction(id: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const [f] = await db.select().from(deliveryFiles).where(eq(deliveryFiles.id, id));
    if (!f) throw new ActionError("not_found");
    await storage().delete(f.storageKey).catch(() => {});
    await db.delete(deliveryFiles).where(eq(deliveryFiles.id, id));
    await audit(admin.id, "delivery.delete", { type: "delivery", id });
    refresh();
  });
}

export async function deleteSiteMediaAction(id: string) {
  return run(async () => {
    const admin = await requireAction("admin");
    const { siteMedia } = await getSettings();
    const used = Object.entries(siteMedia).some(([, v]) => (Array.isArray(v) ? v.includes(id) : v === id));
    const [inUse] = await db.select({ id: collections.id }).from(collections).where(eq(collections.coverMediaId, id));
    const [inRelease] = await db.select({ id: releases.id }).from(releases).where(eq(releases.coverMediaId, id));
    if (used || inUse || inRelease) throw new ActionError("conflict");
    const [m] = await db.select().from(media).where(and(eq(media.id, id), inArray(media.kind, ["site"])));
    if (!m) throw new ActionError("not_found");
    await removeStored(m);
    await db.delete(media).where(eq(media.id, id));
    await audit(admin.id, "media.delete", { type: "media", id });
    refresh();
  });
}
