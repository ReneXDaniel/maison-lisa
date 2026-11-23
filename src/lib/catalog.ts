import "server-only";
import { and, asc, eq, inArray, desc } from "drizzle-orm";
import { db } from "@/db";
import { collections, collectionTranslations, media, products, productTranslations, type MediaVariant } from "@/db/schema";
import { defaultLocale } from "@/i18n/routing";

/** Translation fallback chain: requested locale → default locale → English → anything. */
export function pickTranslation<T extends { locale: string }>(rows: T[], locale: string): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === defaultLocale) ?? rows.find((r) => r.locale === "en") ?? rows[0];
}

export type MediaRef = { id: string; width: number | null; height: number | null; variants: MediaVariant[]; alt: string; visibility: string; isDemo: boolean };

export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  details: string;
  priceCents: number;
  currency: string;
  imageCount: number;
  format: string;
  status: string;
  featured: boolean;
  verifiedPreviewOnly: boolean;
  collection: { id: string; slug: string; title: string } | null;
  cover: MediaRef | null;
};

const mediaRef = (m: typeof media.$inferSelect): MediaRef => ({
  id: m.id,
  width: m.width,
  height: m.height,
  variants: m.variants,
  alt: m.alt,
  visibility: m.visibility,
  isDemo: m.isDemo,
});

export async function listCollections(locale: string, opts: { includeUnpublished?: boolean } = {}) {
  const rows = await db
    .select()
    .from(collections)
    .where(opts.includeUnpublished ? undefined : eq(collections.published, true))
    .orderBy(asc(collections.sortOrder));
  if (!rows.length) return [];
  const tr = await db.select().from(collectionTranslations).where(inArray(collectionTranslations.collectionId, rows.map((r) => r.id)));
  const covers = await mediaByIds(rows.map((r) => r.coverMediaId).filter(Boolean) as string[]);
  return rows.map((c) => {
    const t = pickTranslation(tr.filter((x) => x.collectionId === c.id), locale);
    return { id: c.id, slug: c.slug, sortOrder: c.sortOrder, published: c.published, title: t?.title ?? c.slug, description: t?.description ?? "", cover: c.coverMediaId ? (covers.get(c.coverMediaId) ?? null) : null };
  });
}

export async function mediaByIds(ids: string[]): Promise<Map<string, MediaRef>> {
  if (!ids.length) return new Map();
  const rows = await db.select().from(media).where(inArray(media.id, ids));
  return new Map(rows.map((m) => [m.id, mediaRef(m)]));
}

async function hydrate(rows: (typeof products.$inferSelect)[], locale: string): Promise<ProductCard[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [tr, cols, colTr, covers] = await Promise.all([
    db.select().from(productTranslations).where(inArray(productTranslations.productId, ids)),
    db.select().from(collections),
    db.select().from(collectionTranslations),
    mediaByIds(rows.map((r) => r.coverMediaId).filter(Boolean) as string[]),
  ]);
  return rows.map((p) => {
    const t = pickTranslation(tr.filter((x) => x.productId === p.id), locale);
    const c = cols.find((x) => x.id === p.collectionId);
    const ct = c ? pickTranslation(colTr.filter((x) => x.collectionId === c.id), locale) : undefined;
    return {
      id: p.id,
      slug: p.slug,
      title: t?.title ?? p.slug,
      description: t?.description ?? "",
      details: t?.details ?? "",
      priceCents: p.priceCents,
      currency: p.currency,
      imageCount: p.imageCount,
      format: p.format,
      status: p.status,
      featured: p.featured,
      verifiedPreviewOnly: p.verifiedPreviewOnly,
      collection: c ? { id: c.id, slug: c.slug, title: ct?.title ?? c.slug } : null,
      cover: p.coverMediaId ? (covers.get(p.coverMediaId) ?? null) : null,
    };
  });
}

export async function listProducts(locale: string, opts: { collectionId?: string; featured?: boolean; includeDrafts?: boolean; ids?: string[] } = {}) {
  const where = [
    opts.includeDrafts ? undefined : eq(products.status, "published"),
    opts.collectionId ? eq(products.collectionId, opts.collectionId) : undefined,
    opts.featured ? eq(products.featured, true) : undefined,
    opts.ids ? inArray(products.id, opts.ids.length ? opts.ids : ["00000000-0000-0000-0000-000000000000"]) : undefined,
  ].filter(Boolean);
  const rows = await db
    .select()
    .from(products)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(products.sortOrder), desc(products.createdAt));
  return hydrate(rows, locale);
}

export async function getProductBySlug(slug: string, locale: string, opts: { includeDrafts?: boolean } = {}) {
  const [row] = await db.select().from(products).where(eq(products.slug, slug));
  if (!row || (!opts.includeDrafts && row.status !== "published")) return null;
  const [card] = await hydrate([row], locale);
  const previews = await db
    .select()
    .from(media)
    .where(and(eq(media.productId, row.id), eq(media.kind, "product_preview")))
    .orderBy(asc(media.sortOrder));
  return { ...card!, previews: previews.map(mediaRef) };
}

export async function getProductById(id: string) {
  const [row] = await db.select().from(products).where(eq(products.id, id));
  return row ?? null;
}
