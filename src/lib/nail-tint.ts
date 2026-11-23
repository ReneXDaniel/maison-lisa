/**
 * Recolours nails in an image using a mask (white = nail). Pure function so
 * it can run in the browser on a canvas and be unit-tested. Works the same
 * for the demo illustration and for a real photograph + hand-painted mask.
 *
 * The base image's own luminance provides shading, so lighting, curvature
 * and highlights of the real nail are preserved under the new colour.
 */
export type Finish = "glossy" | "matte" | "shimmer";

export type MaskInfo = { x0: number; y0: number; x1: number; y1: number; meanLum: number; alpha: Float32Array };

const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export function analyseMask(base: Uint8ClampedArray, mask: Uint8ClampedArray, width: number, height: number): MaskInfo {
  const alpha = new Float32Array(width * height);
  let x0 = width, y0 = height, x1 = 0, y1 = 0, sum = 0, weight = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a = mask[i * 4]! / 255;
      alpha[i] = a;
      if (a > 0.02) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
        sum += lum(base[i * 4]!, base[i * 4 + 1]!, base[i * 4 + 2]!) * a;
        weight += a;
      }
    }
  }
  return { x0, y0, x1, y1, meanLum: weight ? sum / weight : 0.8, alpha };
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Writes the tinted result into `out` (same size as base). Only the mask bounding box is processed. */
export function tintNails(base: Uint8ClampedArray, out: Uint8ClampedArray, width: number, info: MaskInfo, colorHex: string, finish: Finish) {
  const [tr, tg, tb] = hexToRgb(colorHex);
  const hlStart = Math.min(0.97, info.meanLum * 1.1);
  for (let y = info.y0; y <= info.y1; y++) {
    for (let x = info.x0; x <= info.x1; x++) {
      const i = y * width + x;
      const a = info.alpha[i]!;
      const p = i * 4;
      if (a <= 0.01) {
        out[p] = base[p]!;
        out[p + 1] = base[p + 1]!;
        out[p + 2] = base[p + 2]!;
        continue;
      }
      const L = lum(base[p]!, base[p + 1]!, base[p + 2]!);
      const rel = L / info.meanLum;
      let r: number, g: number, b: number;
      if (finish === "matte") {
        const shade = 1 + (rel - 1) * 0.45;
        r = tr * shade; g = tg * shade; b = tb * shade;
        const grey = (r + g + b) / 3;
        r = r * 0.9 + grey * 0.1 + 0.015; g = g * 0.9 + grey * 0.1 + 0.015; b = b * 0.9 + grey * 0.1 + 0.015;
      } else {
        const shade = Math.min(1.25, Math.max(0.55, rel));
        r = tr * shade; g = tg * shade; b = tb * shade;
        const hl = Math.max(0, (L - hlStart) / (1 - hlStart));
        r += (1 - r) * hl * 0.95; g += (1 - g) * hl * 0.95; b += (1 - b) * hl * 0.95;
        if (finish === "shimmer") {
          const n = hash(x, y);
          const grain = 0.94 + hash(x * 0.5, y * 0.5) * 0.12;
          r *= grain; g *= grain; b *= grain;
          if (n > 0.965) {
            const k = ((n - 0.965) / 0.035) * 0.7;
            r += (0.97 - r) * k; g += (0.92 - g) * k; b += (0.84 - b) * k;
          }
        }
      }
      out[p] = base[p]! * (1 - a) + Math.min(1, Math.max(0, r)) * 255 * a;
      out[p + 1] = base[p + 1]! * (1 - a) + Math.min(1, Math.max(0, g)) * 255 * a;
      out[p + 2] = base[p + 2]! * (1 - a) + Math.min(1, Math.max(0, b)) * 255 * a;
    }
  }
}
