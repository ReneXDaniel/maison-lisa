"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LEG_PATH, legSpanAt } from "@/lib/art/leg";

gsap.registerPlugin(ScrollTrigger);

type Manifest = { frames: number; pattern: string };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * Procedural rendering of a sheer stocking being drawn down the leg. The
 * fabric that leaves the thigh accumulates as folds below the welt, so the
 * gathered band grows with the distance travelled; in the last phase the
 * gathered stocking slides over the foot and off.
 */
function drawProcedural(ctx: CanvasRenderingContext2D, W: number, H: number, p: number, leg: Path2D) {
  const bg = ctx.createRadialGradient(W * 0.58, H * 0.3, 0, W * 0.5, H * 0.55, Math.max(W, H) * 0.85);
  bg.addColorStop(0, "#4a382d");
  bg.addColorStop(0.6, "#2c1f18");
  bg.addColorStop(1, "#140d09");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const s = (H * 0.94) / 1600;
  const ox = (W > 900 ? W * 0.64 : W * 0.5) - 300 * s;
  ctx.save();
  ctx.translate(ox, H * 0.03);
  ctx.scale(s, s);

  ctx.save();
  ctx.translate(34, 24);
  ctx.globalAlpha = 0.45;
  ctx.filter = "blur(28px)";
  ctx.fillStyle = "#000";
  ctx.fill(leg);
  ctx.restore();

  const skin = ctx.createLinearGradient(170, 0, 420, 0);
  skin.addColorStop(0, "#a88c73");
  skin.addColorStop(0.42, "#dcc5ad");
  skin.addColorStop(0.78, "#f2e3d1");
  skin.addColorStop(1, "#cdb398");
  ctx.fillStyle = skin;
  ctx.fill(leg);

  const a = ease(clamp(p / 0.72));
  const b = ease(clamp((p - 0.72) / 0.28));
  const welt = 300 + a * 940 + b * 430;
  const travelled = Math.min(welt, 1240) - 300;
  const bunch = 22 + travelled * 0.12;
  const fade = 1 - b * 0.9;

  ctx.save();
  ctx.clip(leg);
  ctx.globalAlpha = fade;
  // smooth sheer section below the gathered band
  const sheer = ctx.createLinearGradient(170, 0, 420, 0);
  sheer.addColorStop(0, "rgba(18,12,8,0.78)");
  sheer.addColorStop(0.55, "rgba(29,20,15,0.5)");
  sheer.addColorStop(0.82, "rgba(60,44,34,0.34)");
  sheer.addColorStop(1, "rgba(18,12,8,0.6)");
  ctx.fillStyle = sheer;
  ctx.fillRect(0, welt + bunch, 640, 1800);
  // fine mesh
  ctx.strokeStyle = "rgba(0,0,0,0.07)";
  ctx.lineWidth = 1;
  for (let y = welt + bunch; y < 1620; y += 6) {
    ctx.beginPath();
    ctx.moveTo(150, y);
    ctx.lineTo(560, y + 18);
    ctx.stroke();
  }
  // back seam
  ctx.strokeStyle = "rgba(10,6,4,0.55)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let y = welt + bunch; y < 1300; y += 10) {
    const [x0] = legSpanAt(y);
    if (y === welt + bunch) ctx.moveTo(x0 + 12, y);
    else ctx.lineTo(x0 + 12, y);
  }
  ctx.stroke();
  // gathered folds (accordion)
  const n = Math.max(4, Math.round(bunch / 11));
  ctx.fillStyle = "rgba(16,10,7,0.62)";
  ctx.fillRect(0, welt, 640, bunch);
  for (let i = 0; i < n; i++) {
    const y = welt + (bunch * (i + 0.5)) / n;
    const [x0, x1] = legSpanAt(Math.min(y, 1590));
    const sag = 6 + Math.sin(i * 1.7) * 3;
    const lw = (bunch / n) * 0.85;
    ctx.lineWidth = lw;
    ctx.strokeStyle = "rgba(8,5,3,0.55)";
    ctx.beginPath();
    ctx.moveTo(x0 - 6, y - 2);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + sag, x1 + 6, y - 4);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.2, lw * 0.22);
    ctx.strokeStyle = "rgba(201,178,153,0.32)";
    ctx.beginPath();
    ctx.moveTo(x0 - 6, y - lw * 0.35);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + sag - lw * 0.35, x1 + 6, y - 4 - lw * 0.35);
    ctx.stroke();
  }
  // lace welt
  const [w0, w1] = legSpanAt(Math.min(welt, 1590));
  ctx.fillStyle = "rgba(12,8,5,0.85)";
  ctx.fillRect(0, welt - 16, 640, 18);
  ctx.strokeStyle = "rgba(201,178,153,0.55)";
  ctx.lineWidth = 1.4;
  for (let x = w0 - 10; x < w1 + 10; x += 12) {
    ctx.beginPath();
    ctx.arc(x, welt - 16, 6, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(243,230,210,0.35)";
  ctx.lineWidth = 2.5;
  ctx.stroke(leg);
  ctx.restore();

  // floor reflection line
  const fl = ctx.createLinearGradient(0, 0, W, 0);
  fl.addColorStop(0, "rgba(201,178,153,0)");
  fl.addColorStop(0.5, "rgba(201,178,153,0.25)");
  fl.addColorStop(1, "rgba(201,178,153,0)");
  ctx.fillStyle = fl;
  ctx.fillRect(0, H - 2, W, 1);
}

export function BehindTheSilk({ eyebrow, title, caption, manifestUrl }: { eyebrow: string; title: string; caption: string; manifestUrl?: string }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const state = useRef({ p: 0, frames: [] as HTMLImageElement[], manifest: null as Manifest | null, raf: 0 });

  useEffect(() => {
    const cv = canvas.current;
    const sec = section.current;
    if (!cv || !sec) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const leg = new Path2D(LEG_PATH);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;

    const render = () => {
      state.current.raf = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { manifest, frames, p } = state.current;
      if (manifest && frames.length) {
        const idx = Math.round(p * (manifest.frames - 1));
        const img = frames[idx]?.complete ? frames[idx] : frames.slice(0, idx + 1).reverse().find((f) => f.complete);
        if (img) {
          const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight);
          ctx.drawImage(img, (W - img.naturalWidth * sc) / 2, (H - img.naturalHeight * sc) / 2, img.naturalWidth * sc, img.naturalHeight * sc);
          return;
        }
      }
      drawProcedural(ctx, W, H, p, leg);
    };
    const schedule = () => {
      if (!state.current.raf) state.current.raf = requestAnimationFrame(render);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      schedule();
    };
    resize();
    window.addEventListener("resize", resize);

    // Optional real frame sequence (e.g. /media/sequences/stocking/manifest.json)
    if (manifestUrl) {
      fetch(manifestUrl)
        .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
        .then((m) => {
          if (!m?.frames || !m.pattern) return;
          state.current.manifest = m;
          state.current.frames = Array.from({ length: m.frames }, (_, i) => {
            const img = new Image();
            img.decoding = "async";
            img.src = m.pattern.replace(/\{(0+)\}/, (_s, z: string) => String(i + 1).padStart(z.length, "0"));
            img.onload = schedule;
            return img;
          });
        })
        .catch(() => {});
    }

    let st: ScrollTrigger | null = null;
    if (reduce) {
      state.current.p = 0.55;
      setProgress(1);
      schedule();
    } else {
      st = ScrollTrigger.create({
        trigger: sec,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          state.current.p = self.progress;
          setProgress(self.progress);
          schedule();
        },
      });
    }
    return () => {
      st?.kill();
      window.removeEventListener("resize", resize);
      if (state.current.raf) cancelAnimationFrame(state.current.raf);
      state.current.raf = 0;
    };
  }, [manifestUrl]);

  const textIn = clamp((progress - 0.55) / 0.3);
  return (
    <section ref={section} className="dark-surface relative h-[320vh] bg-espresso-900" aria-label={title}>
      <div className="sticky top-0 h-dvh overflow-hidden">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-espresso-900/80 via-espresso-900/20 to-transparent lg:via-transparent" />
        <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-end px-6 pb-16 sm:px-10 lg:justify-center lg:pb-0">
          <div className="max-w-md">
            <p className="eyebrow text-champagne" style={{ opacity: 0.4 + textIn * 0.6 }}>
              {eyebrow}
            </p>
            <h2 className="font-display mt-5 text-5xl leading-[1.02] text-ivory-50 sm:text-6xl lg:text-7xl" style={{ opacity: textIn, transform: `translateY(${(1 - textIn) * 30}px)` }}>
              {title}
            </h2>
          </div>
          <p className="eyebrow absolute bottom-8 left-1/2 -translate-x-1/2 text-champagne-200" style={{ opacity: 1 - clamp(progress * 4) }}>
            {caption}
          </p>
        </div>
      </div>
    </section>
  );
}
