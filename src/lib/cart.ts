import "server-only";
import { cookies } from "next/headers";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts, customOffers, entitlements, products } from "@/db/schema";
import { randomToken, sha256Hex } from "./crypto";
import { listProducts, type ProductCard } from "./catalog";
import { ActionError } from "./auth/guards";
import type { CurrentUser } from "./auth/session";

/**
 * Carts are always server-side. Guests are identified by a random token in an
 * httpOnly cookie (only its SHA-256 is stored); signed-in customers have one
 * persistent cart tied to their account, which therefore follows them across
 * devices. On sign-in the guest cart is merged into the account cart.
 *
 * Digital items are unique per cart (quantity is always 1). Prices are never
 * stored in the cart — they are read from the catalogue at calculation time.
 */
export const CART_COOKIE = "ml_cart";
const COOKIE_DAYS = 60;

type Cart = typeof carts.$inferSelect;

async function guestHash(): Promise<string | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token && token.length < 100 ? sha256Hex(`cart:${token}`) : null;
}

export async function findCart(user: Pick<CurrentUser, "id"> | null): Promise<Cart | null> {
  if (user) {
    const [c] = await db.select().from(carts).where(eq(carts.userId, user.id));
    return c ?? null;
  }
  const h = await guestHash();
  if (!h) return null;
  const [c] = await db.select().from(carts).where(and(eq(carts.guestTokenHash, h), isNull(carts.userId)));
  return c ?? null;
}

/** Action/route-handler context only (may set a cookie). */
export async function getOrCreateCart(user: Pick<CurrentUser, "id"> | null): Promise<Cart> {
  const existing = await findCart(user);
  if (existing) return existing;
  if (user) {
    const [c] = await db.insert(carts).values({ userId: user.id }).onConflictDoNothing().returning();
    return c ?? (await findCart(user))!;
  }
  const token = randomToken(24);
  (await cookies()).set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_DAYS * 86400,
  });
  const [c] = await db.insert(carts).values({ guestTokenHash: sha256Hex(`cart:${token}`) }).returning();
  return c!;
}

export async function getCartCount(user: Pick<CurrentUser, "id"> | null): Promise<number> {
  const cart = await findCart(user);
  if (!cart) return 0;
  const [r] = await db.select({ n: count() }).from(cartItems).where(eq(cartItems.cartId, cart.id));
  return Number(r?.n ?? 0);
}

export async function ownedProductIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ productId: entitlements.productId })
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), isNull(entitlements.revokedAt)));
  return new Set(rows.map((r) => r.productId).filter(Boolean) as string[]);
}

export async function addProductToCart(user: CurrentUser | null, productId: string) {
  const [p] = await db.select().from(products).where(eq(products.id, productId));
  if (!p || p.status !== "published") throw new ActionError("not_found");
  if (user && (await ownedProductIds(user.id)).has(productId)) throw new ActionError("already_owned");
  const cart = await getOrCreateCart(user);
  await db.insert(cartItems).values({ cartId: cart.id, productId }).onConflictDoNothing();
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  return getCartCount(user);
}

/** Only the intended customer may place their private offer in their cart. */
export async function addOfferToCart(user: CurrentUser, offerId: string) {
  const [o] = await db.select().from(customOffers).where(eq(customOffers.id, offerId));
  if (!o || o.customerId !== user.id) throw new ActionError("not_found");
  if (o.status !== "accepted" && o.status !== "open") throw new ActionError("offer_unavailable");
  if (o.deadline && o.deadline.getTime() < Date.now()) throw new ActionError("offer_expired");
  const cart = await getOrCreateCart(user);
  await db.insert(cartItems).values({ cartId: cart.id, offerId }).onConflictDoNothing();
  return getCartCount(user);
}

export async function removeCartItem(user: CurrentUser | null, itemId: string) {
  const cart = await findCart(user);
  if (!cart) return 0;
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  return getCartCount(user);
}

export async function setCartDiscountCode(user: CurrentUser | null, code: string | null) {
  const cart = await getOrCreateCart(user);
  await db.update(carts).set({ discountCode: code, updatedAt: new Date() }).where(eq(carts.id, cart.id));
}

/** Moves the guest cart into the account cart after login/registration. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const h = await guestHash();
  if (!h) return;
  const [guest] = await db.select().from(carts).where(and(eq(carts.guestTokenHash, h), isNull(carts.userId)));
  jar.delete(CART_COOKIE);
  if (!guest) return;
  const [userCart] = await db.insert(carts).values({ userId }).onConflictDoNothing().returning();
  const target = userCart ?? (await findCart({ id: userId }))!;
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, guest.id));
  const owned = await ownedProductIds(userId);
  for (const it of items) {
    if (it.productId && owned.has(it.productId)) continue;
    await db.insert(cartItems).values({ cartId: target.id, productId: it.productId, offerId: it.offerId }).onConflictDoNothing();
  }
  if (guest.discountCode && !target.discountCode) await db.update(carts).set({ discountCode: guest.discountCode }).where(eq(carts.id, target.id));
  await db.delete(carts).where(eq(carts.id, guest.id));
}

export type CartLine =
  | { kind: "product"; itemId: string; productId: string; collectionId: string | null; title: string; priceCents: number; product: ProductCard; unavailable: boolean; owned: boolean }
  | {
      kind: "offer";
      itemId: string;
      offerId: string;
      collectionId: null;
      productId: null;
      title: string;
      description: string;
      priceCents: number;
      unavailable: boolean;
      owned: false;
    };

/** Cart contents with authoritative prices from the database. */
export async function getCartLines(user: CurrentUser | null, locale: string): Promise<{ cart: Cart | null; lines: CartLine[] }> {
  const cart = await findCart(user);
  if (!cart) return { cart: null, lines: [] };
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id)).orderBy(cartItems.addedAt);
  const productIds = items.map((i) => i.productId).filter(Boolean) as string[];
  const offerIds = items.map((i) => i.offerId).filter(Boolean) as string[];
  const [cards, offers, owned] = await Promise.all([
    productIds.length ? listProducts(locale, { ids: productIds, includeDrafts: true }) : Promise.resolve([]),
    offerIds.length ? db.select().from(customOffers).where(inArray(customOffers.id, offerIds)) : Promise.resolve([]),
    user ? ownedProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);
  const lines: CartLine[] = [];
  for (const it of items) {
    if (it.productId) {
      const p = cards.find((c) => c.id === it.productId);
      if (!p) continue;
      const isOwned = owned.has(p.id);
      lines.push({ kind: "product", itemId: it.id, productId: p.id, collectionId: p.collection?.id ?? null, title: p.title, priceCents: p.priceCents, product: p, unavailable: p.status !== "published" || isOwned, owned: isOwned });
    } else if (it.offerId) {
      const o = offers.find((x) => x.id === it.offerId);
      if (!o) continue;
      const ok = (o.status === "accepted" || o.status === "open") && (!o.deadline || o.deadline.getTime() > Date.now()) && o.customerId === user?.id;
      lines.push({ kind: "offer", itemId: it.id, offerId: o.id, productId: null, collectionId: null, title: o.title, description: o.description, priceCents: o.priceCents, unavailable: !ok, owned: false });
    }
  }
  return { cart, lines };
}

export async function clearPurchasedFromCart(userId: string, productIds: string[], offerIds: string[]) {
  const cart = await findCart({ id: userId });
  if (!cart) return;
  if (productIds.length) await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), inArray(cartItems.productId, productIds)));
  if (offerIds.length) await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), inArray(cartItems.offerId, offerIds)));
  await db.update(carts).set({ discountCode: null }).where(eq(carts.id, cart.id));
}
