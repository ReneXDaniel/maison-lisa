/**
 * Renders the clearly-labelled DEMO ARTWORK used by the development seed
 * (vector illustration rendered with Chromium — no photographs of people).
 * Output: assets/demo/** (git-ignored) and public/demo/og.jpg.
 *
 *   npm run assets:demo
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { compose, nailStudio, type Kind } from "./demo/compositions";
import { DEMO_PRODUCTS, DEMO_COLLECTIONS, DEMO_SITE } from "./demo/content";

const OUT = path.resolve("assets/demo");
mkdirSync(path.join(OUT, "products"), { recursive: true });
mkdirSync(path.resolve("public/demo"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(svg: string, file: string, w: number, h: number, type: "jpeg" | "png" = "jpeg") {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;overflow:hidden">${svg}</body></html>`);
  const buf = await page.screenshot({ type, quality: type === "jpeg" ? 86 : undefined, clip: { x: 0, y: 0, width: w, height: h } });
  writeFileSync(file, buf);
}

let n = 0;
for (const s of DEMO_SITE) {
  await render(compose(s.kind as Kind, s.palette, s.w, s.h, s.seed), path.join(OUT, `${s.key}.jpg`), s.w, s.h);
  n++;
}
const nail = nailStudio(1400, 1000);
await render(nail.baseSvg, path.join(OUT, "nail-base.png"), 1400, 1000, "png");
await render(nail.maskSvg, path.join(OUT, "nail-mask.png"), 1400, 1000, "png");
for (const c of DEMO_COLLECTIONS) {
  await render(compose(c.cover.kind as Kind, c.cover.palette, 1800, 1440, c.cover.seed), path.join(OUT, `collection-${c.slug}.jpg`), 1800, 1440);
  n++;
}
for (const p of DEMO_PRODUCTS) {
  for (const [i, shot] of p.shots.entries()) {
    await render(compose(shot.kind as Kind, shot.palette, 1600, 2000, shot.seed), path.join(OUT, "products", `${p.slug}-${i + 1}.jpg`), 1600, 2000);
    n++;
  }
}
await render(compose("pair", "noir", 1200, 630, 4), path.resolve("public/demo/og.jpg"), 1200, 630);
await browser.close();
console.log(`✓ ${n + 3} demo images rendered to assets/demo`);
