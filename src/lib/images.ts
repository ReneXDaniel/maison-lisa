import "server-only";
import net from "node:net";
import sharp from "sharp";
import { env } from "./env";

export type SniffedType = "image/jpeg" | "image/png" | "image/webp";

/** Identify the file by its magic bytes — never trust the browser-supplied MIME type or extension. */
export function sniffImage(buf: Buffer): SniffedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

const MAX_PIXELS = 60_000_000;

export class UploadError extends Error {}

/**
 * Re-encodes an uploaded image. Re-encoding strips EXIF/GPS metadata (privacy
 * for both Lisa and customers) and neutralises polyglot files that hide
 * non-image payloads inside image containers.
 */
export async function reencodeImage(buf: Buffer, opts: { maxWidth?: number; quality?: number; format?: "jpeg" | "webp" } = {}) {
  const type = sniffImage(buf);
  if (!type) throw new UploadError("unsupported_type");
  const img = sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new UploadError("corrupt_image");
  const pipeline = opts.maxWidth && meta.width > opts.maxWidth ? img.resize({ width: opts.maxWidth, withoutEnlargement: true }) : img;
  const format = opts.format ?? (type === "image/png" ? "webp" : "jpeg");
  const out =
    format === "jpeg"
      ? await pipeline.keepIccProfile().jpeg({ quality: opts.quality ?? 92, mozjpeg: true }).toBuffer({ resolveWithObject: true })
      : await pipeline.keepIccProfile().webp({ quality: opts.quality ?? 88 }).toBuffer({ resolveWithObject: true });
  return {
    buffer: out.data,
    width: out.info.width,
    height: out.info.height,
    mimeType: format === "jpeg" ? "image/jpeg" : "image/webp",
    ext: format === "jpeg" ? "jpg" : "webp",
  };
}

const VARIANT_WIDTHS = [480, 960, 1600, 2400];

/** Responsive WebP variants for display; optionally watermarked (for public previews). */
export async function buildVariants(buf: Buffer, opts: { watermark?: string; blur?: boolean } = {}) {
  const base = sharp(buf, { limitInputPixels: MAX_PIXELS }).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const widths = VARIANT_WIDTHS.filter((w) => w <= Math.max(width, VARIANT_WIDTHS[0]!));
  const out: { width: number; buffer: Buffer }[] = [];
  for (const w of widths) {
    let p = sharp(buf, { limitInputPixels: MAX_PIXELS }).rotate().resize({ width: Math.min(w, width || w), withoutEnlargement: true });
    if (opts.blur) p = p.blur(Math.max(8, w / 40));
    let b: Buffer = await p.webp({ quality: 82 }).toBuffer();
    if (opts.watermark) b = await watermark(b, opts.watermark);
    out.push({ width: Math.min(w, width || w), buffer: b });
  }
  return { width, height, variants: out };
}

export async function watermark(buf: Buffer, text: string): Promise<Buffer> {
  const img = sharp(buf);
  const { width = 1000, height = 1000 } = await img.metadata();
  const size = Math.max(12, Math.round(width / 48));
  const safe = text.replace(/[<>&"']/g, "");
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width - size}" y="${height - size}" text-anchor="end" font-family="Georgia, serif" font-size="${size}"
        letter-spacing="${size / 4}" fill="rgba(246,241,234,0.55)" stroke="rgba(44,31,24,0.25)" stroke-width="0.6">${safe}</text>
    </svg>`,
  );
  return img.composite([{ input: svg, top: 0, left: 0 }]).toFormat(sniffImage(buf) === "image/jpeg" ? "jpeg" : "webp").toBuffer();
}

/**
 * Optional ClamAV scan (clamd INSTREAM protocol). Returns "unavailable" when
 * no scanner is configured — callers decide whether that is acceptable.
 */
export async function scanBuffer(buf: Buffer): Promise<"clean" | "infected" | "unavailable"> {
  const host = env().CLAMAV_HOST;
  if (!host) return "unavailable";
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: env().CLAMAV_PORT });
    let response = "";
    socket.setTimeout(15_000, () => {
      socket.destroy();
      resolve("unavailable");
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let i = 0; i < buf.length; i += 64 * 1024) {
        const chunk = buf.subarray(i, i + 64 * 1024);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(chunk.length);
        socket.write(len);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (d) => (response += d.toString()));
    socket.on("end", () => resolve(/FOUND/.test(response) ? "infected" : /OK/.test(response) ? "clean" : "unavailable"));
    socket.on("error", () => resolve("unavailable"));
  });
}
