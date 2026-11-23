import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { customOffers, deliveryFiles, entitlements, media, orders } from "@/db/schema";
import { listProducts, type ProductCard } from "./catalog";
import { signToken, verifyToken } from "./crypto";
import { getSetting } from "./settings";
import type { CurrentUser } from "./auth/session";

export type PurchaseFile = { id: string; kind: "original" | "delivery"; fileName: string; width: number | null; height: number | null; sizeBytes: number };
export type Purchase = {
  entitlementId: string;
  orderId: string;
  orderNumber: string;
  grantedAt: Date;
  product?: ProductCard;
  offer?: { id: string; title: string; description: string; deliveredAt: Date | null };
  files: PurchaseFile[];
};

/** Everything the customer currently owns (refunded/charged-back items are excluded). */
export async function listPurchases(user: CurrentUser, locale: string): Promise<Purchase[]> {
  const rows = await db
    .select({ e: entitlements, number: orders.number })
    .from(entitlements)
    .innerJoin(orders, eq(orders.id, entitlements.orderId))
    .where(and(eq(entitlements.userId, user.id), isNull(entitlements.revokedAt), eq(orders.status, "paid")))
    .orderBy(desc(entitlements.grantedAt));
  const productIds = rows.map((r) => r.e.productId).filter(Boolean) as string[];
  const offerIds = rows.map((r) => r.e.offerId).filter(Boolean) as string[];
  const [cards, originals, offers, deliveries] = await Promise.all([
    productIds.length ? listProducts(locale, { ids: productIds, includeDrafts: true }) : [],
    productIds.length ? db.select().from(media).where(and(inArray(media.productId, productIds), eq(media.kind, "product_original"))).orderBy(asc(media.sortOrder)) : [],
    offerIds.length ? db.select().from(customOffers).where(inArray(customOffers.id, offerIds)) : [],
    offerIds.length ? db.select().from(deliveryFiles).where(inArray(deliveryFiles.offerId, offerIds)).orderBy(asc(deliveryFiles.createdAt)) : [],
  ]);
  return rows.map(({ e, number }) => {
    const base = { entitlementId: e.id, orderId: e.orderId, orderNumber: number, grantedAt: e.grantedAt };
    if (e.productId) {
      return {
        ...base,
        product: cards.find((c) => c.id === e.productId),
        files: originals.filter((m) => m.productId === e.productId).map((m) => ({ id: m.id, kind: "original" as const, fileName: m.fileName, width: m.width, height: m.height, sizeBytes: m.sizeBytes })),
      };
    }
    const o = offers.find((x) => x.id === e.offerId);
    return {
      ...base,
      offer: o ? { id: o.id, title: o.title, description: o.description, deliveredAt: o.deliveredAt } : undefined,
      files: deliveries.filter((d) => d.offerId === e.offerId).map((d) => ({ id: d.id, kind: "delivery" as const, fileName: d.fileName, width: null, height: null, sizeBytes: d.sizeBytes })),
    };
  });
}

type FileToken = { u: string; k: "original" | "delivery"; f: string };

/** Short-lived download link bound to the customer and the file. */
export async function fileUrl(user: CurrentUser, kind: FileToken["k"], fileId: string, inline = false) {
  const ttl = (await getSetting("downloadLinkTtlMinutes")) * 60;
  return `/api/files/${signToken<FileToken>({ u: user.id, k: kind, f: fileId }, ttl)}${inline ? "?inline=1" : ""}`;
}

export function readFileToken(token: string) {
  return verifyToken<FileToken>(token);
}

/** Re-checks ownership at access time — a refund revokes access even for links already issued. */
export async function authorizeFile(user: CurrentUser, kind: FileToken["k"], fileId: string) {
  if (kind === "original") {
    const [m] = await db.select().from(media).where(and(eq(media.id, fileId), eq(media.kind, "product_original")));
    if (!m?.productId) return null;
    if (user.isAdmin) return { storageKey: m.storageKey, fileName: m.fileName, mimeType: m.mimeType };
    const [ent] = await db
      .select({ id: entitlements.id })
      .from(entitlements)
      .innerJoin(orders, eq(orders.id, entitlements.orderId))
      .where(and(eq(entitlements.userId, user.id), eq(entitlements.productId, m.productId), isNull(entitlements.revokedAt), eq(orders.status, "paid")))
      .limit(1);
    return ent ? { storageKey: m.storageKey, fileName: m.fileName, mimeType: m.mimeType } : null;
  }
  const [d] = await db.select().from(deliveryFiles).where(eq(deliveryFiles.id, fileId));
  if (!d) return null;
  if (user.isAdmin) return { storageKey: d.storageKey, fileName: d.fileName, mimeType: d.mimeType };
  const [ent] = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .innerJoin(orders, eq(orders.id, entitlements.orderId))
    .where(and(eq(entitlements.userId, user.id), eq(entitlements.offerId, d.offerId), isNull(entitlements.revokedAt), eq(orders.status, "paid")))
    .limit(1);
  return ent ? { storageKey: d.storageKey, fileName: d.fileName, mimeType: d.mimeType } : null;
}
