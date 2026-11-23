"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { ButtonLink } from "@/components/ui/button";
import { DevLabel } from "@/components/ui/misc";
import { useStudio } from "@/stores/studio";
import { POLISH_COLORS, POLISH_FINISHES, type PolishColorKey } from "@/lib/catalog-options";
import { analyseMask, tintNails, type Finish, type MaskInfo } from "@/lib/nail-tint";
import { Bottle } from "./bottle";
import { OptionChips } from "./option-chips";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/**
 * Interactive nail colour preview. Hovering a bottle previews the colour,
 * clicking selects it (persisted, and carried into the Custom Request
 * Builder). Only pixels inside the nail mask change.
 */
export function NailStudio({ baseUrl, maskUrl, isDemo }: { baseUrl: string | null; maskUrl: string | null; isDemo: boolean }) {
  const t = useTranslations("studio.nail");
  const o = useTranslations("options");
  const { selections, set } = useStudio();
  const [hydrated, setHydrated] = useState(false);
  const [hover, setHover] = useState<PolishColorKey | null>(null);
  const [ready, setReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const data = useRef<{ base: ImageData; out: ImageData; info: MaskInfo; ctx: CanvasRenderingContext2D } | null>(null);
  const raf = useRef(0);

  useEffect(() => setHydrated(true), []);
  const selected = hydrated ? selections.polishColor : undefined;
  const finish: Finish = (hydrated ? selections.polishFinish : undefined) ?? "glossy";
  const shown = hover ?? selected ?? null;

  useEffect(() => {
    if (!baseUrl || !maskUrl) return;
    let cancelled = false;
    Promise.all([loadImage(baseUrl), loadImage(maskUrl)]).then(([b, m]) => {
      if (cancelled || !canvas.current) return;
      const cv = canvas.current;
      cv.width = b.naturalWidth;
      cv.height = b.naturalHeight;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(m, 0, 0, cv.width, cv.height);
      const maskData = ctx.getImageData(0, 0, cv.width, cv.height);
      ctx.drawImage(b, 0, 0);
      const base = ctx.getImageData(0, 0, cv.width, cv.height);
      const out = ctx.createImageData(cv.width, cv.height);
      out.data.set(base.data);
      data.current = { base, out, ctx, info: analyseMask(base.data, maskData.data, cv.width, cv.height) };
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, maskUrl]);

  useEffect(() => {
    const d = data.current;
    if (!d || !ready) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const hex = POLISH_COLORS.find((c) => c.key === shown)?.hex;
      if (hex) tintNails(d.base.data, d.out.data, d.base.width, d.info, hex, finish);
      else d.out.data.set(d.base.data);
      d.ctx.putImageData(d.out, 0, 0);
    });
  }, [shown, finish, ready]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative overflow-hidden border border-champagne/60 bg-ivory-200 shadow-soft">
          <canvas ref={canvas} className={clsx("block h-auto w-full transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")} aria-label={t("previewLabel", { color: shown ? o(`polishColor.${shown}`) : t("natural") })} role="img" data-testid="nail-canvas" data-color={shown ?? ""} />
          {!ready && <div className="skeleton absolute inset-0" />}
          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 bg-ivory-50/90 px-4 py-2 backdrop-blur">
            <span className="size-4 rounded-full border border-taupe/40" style={{ background: POLISH_COLORS.find((c) => c.key === shown)?.hex ?? "#e1c3b6" }} />
            <span className="text-sm text-espresso">
              {shown ? o(`polishColor.${shown}`) : t("natural")} · {o(`polishFinish.${finish}`)}
              {hover && hover !== selected && <span className="ml-2 text-xs text-taupe-700">({t("preview")})</span>}
            </span>
          </div>
        </div>
        {isDemo && (
          <div className="mt-3">
            <DevLabel>{t("demoNote")}</DevLabel>
          </div>
        )}
      </div>

      <div>
        <p className="eyebrow mb-5 text-taupe-700">{t("chooseColor")}</p>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-x-2 lg:gap-y-6 lg:overflow-visible lg:px-0" role="radiogroup" aria-label={o("polishColor.label")}>
          {POLISH_COLORS.map((c) => {
            const active = selected === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={active}
                onMouseEnter={() => setHover(c.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(c.key)}
                onBlur={() => setHover(null)}
                onClick={() => set({ polishColor: c.key })}
                className="group flex w-20 shrink-0 flex-col items-center gap-2 pt-2 lg:w-full lg:min-w-0"
                data-testid={`bottle-${c.key}`}
              >
                <span className={clsx("block transition-transform duration-500 ease-[var(--ease-luxe)] [transform-style:preserve-3d] group-hover:[transform:perspective(600px)_rotateY(-16deg)_translateY(-8px)]", active && "-translate-y-2")}>
                  <Bottle color={c.hex} size={44} />
                </span>
                <span className={clsx("w-full text-center text-[10px] uppercase leading-tight tracking-[0.12em] hyphens-auto [overflow-wrap:anywhere]", active ? "font-semibold text-espresso" : "text-taupe-700")}>{o(`polishColor.${c.key}`)}</span>
                <span className={clsx("h-px w-6 bg-espresso transition-opacity", active ? "opacity-100" : "opacity-0")} />
              </button>
            );
          })}
        </div>
        <div className="mt-10">
          <p className="eyebrow mb-4 text-taupe-700">{o("polishFinish.label")}</p>
          <OptionChips group="polishFinish" options={POLISH_FINISHES} value={finish} onChange={(v) => set({ polishFinish: v ?? "glossy" })} />
        </div>
        <div className="mt-12 border-t border-champagne/60 pt-8">
          <p className="text-sm leading-relaxed text-taupe-700">{t("saved")}</p>
          <ButtonLink href="/custom-requests" size="lg" className="mt-6 w-full sm:w-auto" data-testid="nail-to-request">
            {t("cta")}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
