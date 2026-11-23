import { describe, expect, it } from "vitest";
import { analyseMask, tintNails } from "@/lib/nail-tint";

function img(w: number, h: number, fill: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fill(x, y);
    d.set([r, g, b, 255], (y * w + x) * 4);
  }
  return d;
}

describe("tintNails", () => {
  const W = 10, H = 10;
  const base = img(W, H, () => [230, 200, 190]); // skin / natural nail
  const mask = img(W, H, (x, y) => (x >= 3 && x <= 6 && y >= 3 && y <= 6 ? [255, 255, 255] : [0, 0, 0]));
  const info = analyseMask(base, mask, W, H);

  it("finds the nail bounding box", () => {
    expect([info.x0, info.y0, info.x1, info.y1]).toEqual([3, 3, 6, 6]);
  });

  it("changes only masked pixels", () => {
    const out = new Uint8ClampedArray(base);
    tintNails(base, out, W, info, "#9E1B2A", "glossy");
    const at = (x: number, y: number) => Array.from(out.slice((y * W + x) * 4, (y * W + x) * 4 + 3));
    expect(at(0, 0)).toEqual([230, 200, 190]); // skin untouched
    const nail = at(4, 4);
    expect(nail[0]!).toBeGreaterThan(nail[1]! + 50); // clearly red
  });

  it("produces different results per finish", () => {
    const a = new Uint8ClampedArray(base), b = new Uint8ClampedArray(base);
    tintNails(base, a, W, info, "#17120F", "glossy");
    tintNails(base, b, W, info, "#17120F", "matte");
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});
