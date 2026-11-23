import { NextResponse } from "next/server";
import { routeUser } from "@/lib/route-auth";
import { authorizeFile, readFileToken } from "@/lib/purchases";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Protected original files. Requires: valid, unexpired signed token; the
 * same signed-in, age-verified customer it was issued to; and a current
 * (non-revoked) entitlement from a paid order.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const user = await routeUser(req, "adult");
  if (user instanceof NextResponse) return user;
  const data = readFileToken((await ctx.params).token);
  if (!data || data.u !== user.id) return new NextResponse("Link expired", { status: 410 });
  const file = await authorizeFile(user, data.k, data.f);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const s = storage();
  if (s.presignedGet) return NextResponse.redirect(await s.presignedGet(file.storageKey, 60, file.fileName, inline));
  const buf = await s.get(file.storageKey);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${file.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
