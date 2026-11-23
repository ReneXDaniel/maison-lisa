import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customOffers, deliveryFiles, media, products } from "@/db/schema";
import { routeUser, errorResponse } from "@/lib/route-auth";
import { ActionError } from "@/lib/auth/guards";
import { buildVariants, reencodeImage, scanBuffer, sniffImage, UploadError } from "@/lib/images";
import { storage } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
const MAX_BYTES = 40 * 1024 * 1024;

const schema = z.object({
  kind: z.enum(["site", "product_preview", "product_original", "delivery"]),
  productId: z.uuid().optional(),
  offerId: z.uuid().optional(),
  visibility: z.enum(["public", "verified"]).optional(),
  watermark: z.enum(["1", "0"]).optional(),
  alt: z.string().max(200).optional(),
});

/**
 * Admin uploads. Every image is identified by magic bytes, virus-scanned when
 * a scanner is configured, and re-encoded (removing EXIF/GPS metadata).
 *  - site / product_preview → public (or verified-only) responsive WebP variants
 *  - product_original        → private high-quality JPEG, delivered only to buyers
 *  - delivery                → private file attached to a personal offer
 */
export async function POST(req: Request) {
  const admin = await routeUser(req, "admin", { mutating: true });
  if (admin instanceof NextResponse) return admin;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new ActionError("invalid");
    if (file.size > MAX_BYTES) throw new ActionError("upload_too_large");
    const meta = schema.parse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "file")));
    const raw = Buffer.from(await file.arrayBuffer());
    if (!sniffImage(raw)) throw new ActionError("unsupported_type");
    if ((await scanBuffer(raw)) === "infected") throw new ActionError("infected");
    const s = storage();
    const id = randomUUID();
    const baseName = (file.name || "image").replace(/[^\w.\- ]/g, "_").replace(/\.[^.]+$/, "").slice(0, 80);

    if (meta.kind === "product_original" || meta.kind === "delivery") {
      const img = await reencodeImage(raw, { quality: 94, format: "jpeg" });
      if (meta.kind === "delivery") {
        if (!meta.offerId) throw new ActionError("invalid");
        const [offer] = await db.select().from(customOffers).where(eq(customOffers.id, meta.offerId));
        if (!offer) throw new ActionError("not_found");
        const key = `deliveries/${offer.id}/${id}.jpg`;
        await s.put(key, img.buffer, img.mimeType);
        await db.insert(deliveryFiles).values({ id, offerId: offer.id, storageKey: key, fileName: `${baseName}.jpg`, mimeType: img.mimeType, sizeBytes: img.buffer.length });
      } else {
        if (!meta.productId) throw new ActionError("invalid");
        const key = `products/${meta.productId}/original/${id}.jpg`;
        await s.put(key, img.buffer, img.mimeType);
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(media).where(eq(media.productId, meta.productId));
        await db.insert(media).values({ id, kind: "product_original", visibility: "private", productId: meta.productId, storageKey: key, fileName: `${baseName}.jpg`, mimeType: img.mimeType, width: img.width, height: img.height, sizeBytes: img.buffer.length, sortOrder: Number(n), uploadedById: admin.id });
        const [{ originals } = { originals: 0 }] = await db.select({ originals: count() }).from(media).where(and(eq(media.productId, meta.productId), eq(media.kind, "product_original")));
        await db.update(products).set({ imageCount: Number(originals), updatedAt: new Date() }).where(eq(products.id, meta.productId));
      }
      await audit(admin.id, `media.upload.${meta.kind}`, { type: "media", id });
      return NextResponse.json({ id });
    }

    // Display images: responsive WebP variants
    const clean = await reencodeImage(raw, { quality: 92, format: "jpeg" });
    const watermark = meta.kind === "product_preview" && meta.watermark !== "0" ? "MAISON LISA · PREVIEW" : undefined;
    const v = await buildVariants(clean.buffer, { watermark });
    const prefix = meta.kind === "site" ? `site/${id}` : `products/${meta.productId}/preview/${id}`;
    const variants = [];
    for (const variant of v.variants) {
      const key = `${prefix}/w${variant.width}.webp`;
      await s.put(key, variant.buffer, "image/webp");
      variants.push({ width: variant.width, key, bytes: variant.buffer.length });
    }
    if (meta.kind === "product_preview" && !meta.productId) throw new ActionError("invalid");
    await db.insert(media).values({
      id,
      kind: meta.kind,
      visibility: meta.kind === "site" ? "public" : (meta.visibility ?? "public"),
      productId: meta.kind === "product_preview" ? meta.productId : null,
      storageKey: prefix,
      variants,
      fileName: `${baseName}.webp`,
      mimeType: "image/webp",
      width: v.width,
      height: v.height,
      sizeBytes: variants.reduce((a, b) => a + b.bytes, 0),
      alt: meta.alt ?? "",
      uploadedById: admin.id,
    });
    await audit(admin.id, `media.upload.${meta.kind}`, { type: "media", id });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid" }, { status: 400 });
    return errorResponse(e);
  }
}
