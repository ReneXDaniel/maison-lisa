import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
import { DEMO_COLLECTIONS, DEMO_PRODUCTS, DEMO_RELEASES } from "./demo/content";

type DB = NodePgDatabase<typeof schema>;
const ASSETS = path.resolve("assets/demo");
const STORAGE = path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
const WIDTHS = [480, 960, 1600, 2400];

function put(key: string, buf: Buffer) {
  const full = path.join(STORAGE, key);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, buf, { mode: 0o600 });
}

async function watermark(buf: Buffer, text: string) {
  const { width = 1000, height = 1000 } = await sharp(buf).metadata();
  const size = Math.max(12, Math.round(width / 48));
  const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width - size}" y="${height - size}" text-anchor="end" font-family="Georgia, serif" font-size="${size}" letter-spacing="${size / 4}" fill="rgba(246,241,234,0.6)" stroke="rgba(44,31,24,0.25)" stroke-width="0.6">${text}</text></svg>`);
  return sharp(buf).composite([{ input: svg }]).webp({ quality: 82 }).toBuffer();
}

async function variants(file: string, prefix: string, opts: { watermark?: boolean; lossless?: boolean } = {}) {
  const src = readFileSync(file);
  const meta = await sharp(src).metadata();
  const out: schema.MediaVariant[] = [];
  for (const w of WIDTHS.filter((x) => x <= (meta.width ?? 0) || x === WIDTHS[0])) {
    let b = await sharp(src).resize({ width: Math.min(w, meta.width ?? w) }).webp(opts.lossless ? { lossless: true } : { quality: 82 }).toBuffer();
    if (opts.watermark) b = await watermark(b, "MAISON LISA · PREVIEW");
    const key = `${prefix}/w${w}.webp`;
    put(key, b);
    out.push({ width: Math.min(w, meta.width ?? w), key, bytes: b.length });
  }
  return { variants: out, width: meta.width ?? null, height: meta.height ?? null };
}

async function siteMedia(db: DB, name: string, alt: string, opts: { lossless?: boolean } = {}) {
  const file = [".jpg", ".png"].map((e) => path.join(ASSETS, name + e)).find(existsSync)!;
  const id = randomUUID();
  const v = await variants(file, `site/${id}`, opts);
  await db.insert(schema.media).values({ id, kind: "site", visibility: "public", storageKey: `site/${id}`, variants: v.variants, fileName: path.basename(file), mimeType: "image/webp", width: v.width, height: v.height, alt, isDemo: true });
  return id;
}

export async function seedDemoContent(db: DB) {
  if (!existsSync(ASSETS)) {
    console.log("• demo assets missing — run `npm run assets:demo` first");
    return;
  }
  const [already] = await db.select().from(schema.products).limit(1);
  if (already) {
    console.log("• demo catalogue already present");
    return;
  }

  // Site imagery → settings.siteMedia slots
  const slots: Record<string, unknown> = {
    hero: await siteMedia(db, "hero", "Demo artwork — editorial hero"),
    silkReveal: await siteMedia(db, "silk-reveal", "Demo artwork — silk reveal"),
    hotspotImage: await siteMedia(db, "hotspots", "Demo artwork — still life with details"),
    aboutPortrait: await siteMedia(db, "about-portrait", "Portrait placeholder"),
    nailBase: await siteMedia(db, "nail-base", "Demo illustration — foot for the Nail Studio"),
    nailMask: await siteMedia(db, "nail-mask", "Nail mask", { lossless: true }),
    behindScenes: [] as string[],
  };
  for (let i = 1; i <= 6; i++) (slots.behindScenes as string[]).push(await siteMedia(db, `bts-${i}`, "Behind the scenes — demo artwork"));
  await db.insert(schema.settings).values({ key: "siteMedia", value: slots }).onConflictDoUpdate({ target: schema.settings.key, set: { value: slots } });

  // Collections
  const colIds = new Map<string, string>();
  for (const [i, c] of DEMO_COLLECTIONS.entries()) {
    const cover = await siteMedia(db, `collection-${c.slug}`, c.tr.en[0]);
    const [row] = await db.insert(schema.collections).values({ slug: c.slug, sortOrder: i, published: true, coverMediaId: cover }).returning();
    colIds.set(c.slug, row!.id);
    await db.insert(schema.collectionTranslations).values(Object.entries(c.tr).map(([locale, [title, description]]) => ({ collectionId: row!.id, locale, title, description })));
  }

  // Products: originals are private; previews are watermarked (and verified-only for the Private Edit beyond the cover)
  for (const [i, p] of DEMO_PRODUCTS.entries()) {
    const [prod] = await db
      .insert(schema.products)
      .values({ slug: p.slug, collectionId: colIds.get(p.collection), priceCents: p.priceCents, imageCount: p.shots.length, format: "JPEG · 1600 × 2000", status: "published", featured: !!p.featured, verifiedPreviewOnly: !!p.verifiedPreviewOnly, sortOrder: i })
      .returning();
    await db.insert(schema.productTranslations).values(Object.entries(p.tr).map(([locale, [title, description]]) => ({ productId: prod!.id, locale, title, description })));
    let coverId: string | null = null;
    for (let s = 0; s < p.shots.length; s++) {
      const file = path.join(ASSETS, "products", `${p.slug}-${s + 1}.jpg`);
      const original = readFileSync(file);
      const okey = `products/${prod!.id}/original/${randomUUID()}.jpg`;
      put(okey, original);
      const meta = await sharp(original).metadata();
      await db.insert(schema.media).values({ kind: "product_original", visibility: "private", productId: prod!.id, storageKey: okey, variants: [], fileName: `${p.slug}-${String(s + 1).padStart(2, "0")}.jpg`, mimeType: "image/jpeg", width: meta.width, height: meta.height, sizeBytes: original.length, isDemo: true, sortOrder: s });
      if (s < 3) {
        const id = randomUUID();
        const v = await variants(file, `products/${prod!.id}/preview/${id}`, { watermark: true });
        const visibility = p.verifiedPreviewOnly && s > 0 ? "verified" : "public";
        await db.insert(schema.media).values({ id, kind: "product_preview", visibility, productId: prod!.id, storageKey: `products/${prod!.id}/preview/${id}`, variants: v.variants, fileName: path.basename(file), mimeType: "image/webp", width: v.width, height: v.height, alt: p.tr.en[0], isDemo: true, sortOrder: s });
        if (s === 0) coverId = id;
      }
    }
    await db.update(schema.products).set({ coverMediaId: coverId }).where(eq(schema.products.id, prod!.id));
  }

  // The Next Chapter
  for (const [i, r] of DEMO_RELEASES.entries()) {
    const cover = await siteMedia(db, r.image, r.tr.en[0]);
    const [row] = await db.insert(schema.releases).values({ slug: r.slug, sortOrder: i, coverMediaId: cover, releaseAt: r.days ? new Date(Date.now() + r.days * 864e5) : null }).returning();
    await db.insert(schema.releaseTranslations).values(Object.entries(r.tr).map(([locale, [title, description]]) => ({ releaseId: row!.id, locale, title, description })));
  }

  // "Choose Lisa's Next Look" poll
  const [poll] = await db.insert(schema.lookPolls).values({ active: true }).returning();
  await db.insert(schema.lookPollOptions).values([
    { pollId: poll!.id, stockings: "black_sheer", footwear: "high_heels", accessory: "anklet", background: "dark_espresso", sortOrder: 0 },
    { pollId: poll!.id, stockings: "soft_nude", footwear: "sandals", accessory: "silk_ribbon", background: "champagne_satin", sortOrder: 1 },
    { pollId: poll!.id, stockings: "elegant_lace", footwear: "minimalist", accessory: "toe_ring", background: "ivory_studio", sortOrder: 2 },
    { pollId: poll!.id, stockings: "barefoot", footwear: "barefoot", accessory: "none", background: "natural_light", sortOrder: 3 },
  ]);

  // Example promotional codes (development only — LISA15 active for testing)
  await db
    .insert(schema.discounts)
    .values([
      { code: "LISA15", name: "Example: 15 % from €30", kind: "percent", value: 15, minOrderCents: 3000, perCustomerLimit: 1, active: true },
      { code: "MAISON20", name: "Example: 20 % (inactive)", kind: "percent", value: 20, active: false },
      { code: "WELCOME10", name: "Example: 10 % first order (inactive)", kind: "percent", value: 10, firstOrderOnly: true, active: false },
    ])
    .onConflictDoNothing();

  console.log(`✓ demo catalogue: ${DEMO_COLLECTIONS.length} collections, ${DEMO_PRODUCTS.length} products, ${DEMO_RELEASES.length} releases, look poll, example codes`);
}
