import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { getUserFromRequest } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Display images (site imagery and product previews) in responsive widths.
 *  - public:   anyone
 *  - verified: age-verified customers and admins only
 *  - private:  never served here (protected originals go through /api/files)
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const [m] = await db.select().from(media).where(eq(media.id, id));
  if (!m || m.visibility === "private" || m.kind === "product_original") return new NextResponse("Not found", { status: 404 });
  if (m.visibility === "verified") {
    const user = await getUserFromRequest(req);
    if (!user || !(user.isAdultVerified || user.isAdmin)) return new NextResponse("Forbidden", { status: 403 });
  }
  const w = Number(new URL(req.url).searchParams.get("w") ?? 960);
  const variants = [...m.variants].sort((a, b) => a.width - b.width);
  const variant = variants.find((v) => v.width >= w) ?? variants[variants.length - 1];
  if (!variant) return new NextResponse("Not found", { status: 404 });
  const buf = await storage().get(variant.key);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": m.visibility === "public" ? "public, max-age=31536000, immutable" : "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
