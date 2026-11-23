import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { routeUser, errorResponse } from "@/lib/route-auth";
import { authorizeConversation, postMessage } from "@/lib/chat";
import { ActionError } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { reencodeImage, scanBuffer, UploadError } from "@/lib/images";
import { storage } from "@/lib/storage";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX_FILES = 4;

/**
 * Sends a message (multipart: `body` + optional `files`). Attachments are
 * size-limited, identified by magic bytes, re-encoded (strips metadata and
 * neutralises hidden payloads), optionally virus-scanned, and stored in
 * private storage readable only through an authorising route.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await routeUser(req, "adult", { mutating: true });
  if (user instanceof NextResponse) return user;
  try {
    const c = await authorizeConversation(user, (await ctx.params).id);
    const form = await req.formData();
    const body = String(form.get("body") ?? "");
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const attachments = [];
    if (files.length) {
      const settings = await getSettings();
      if (!settings.chatAttachmentsEnabled) throw new ActionError("attachments_disabled");
      if (files.length > MAX_FILES) throw new ActionError("invalid");
      if (!(await rateLimit(`upload:${user.id}`, LIMITS.upload.limit, LIMITS.upload.window))) throw new ActionError("rate_limited");
      for (const f of files) {
        if (f.size > settings.maxAttachmentMb * 1024 * 1024) throw new ActionError("upload_too_large");
        const raw = Buffer.from(await f.arrayBuffer());
        if ((await scanBuffer(raw)) === "infected") throw new ActionError("infected");
        let img;
        try {
          img = await reencodeImage(raw, { maxWidth: 2400, quality: 86 });
        } catch (e) {
          if (e instanceof UploadError) throw new ActionError(e.message);
          throw new ActionError("corrupt_image");
        }
        const key = `attachments/${c.id}/${randomUUID()}.${img.ext}`;
        await storage().put(key, img.buffer, img.mimeType);
        const safeName = (f.name || "image").replace(/[^\w.\- ]/g, "_").slice(0, 80);
        attachments.push({ storageKey: key, fileName: safeName.replace(/\.[^.]+$/, "") + "." + img.ext, mimeType: img.mimeType, sizeBytes: img.buffer.length, width: img.width, height: img.height, scanStatus: "reencoded" as const });
      }
    }
    const m = await postMessage(user, c, { body, attachments });
    return NextResponse.json({ id: m.id, createdAt: m.createdAt });
  } catch (e) {
    return errorResponse(e);
  }
}
