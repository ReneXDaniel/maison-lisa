"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { IconArrowLeft, IconArrowRight, IconClose, IconLock } from "@/components/ui/icons";
import type { MediaRef } from "@/lib/catalog";

const src = (m: MediaRef, w: number) => `/api/media/${m.id}?w=${w}`;

/** Editorial preview gallery with an accessible, keyboard- and swipe-friendly lightbox. */
export function LightboxGallery({ items, title, lockedCount = 0, lockedLabel }: { items: MediaRef[]; title: string; lockedCount?: number; lockedLabel?: string }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, close, step]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {items.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setOpen(i)}
            className={clsx("group relative overflow-hidden bg-ivory-200", i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-[4/5]")}
            aria-label={`${title} — ${i + 1}/${items.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src(m, i === 0 ? 1600 : 960)} alt={m.alt || title} loading={i < 2 ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-luxe)] group-hover:scale-[1.04]" draggable={false} />
          </button>
        ))}
        {Array.from({ length: lockedCount }).map((_, i) => (
          <div key={`l${i}`} className="flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-gradient-to-br from-champagne-200 via-ivory-300 to-taupe/50 p-6 text-center text-espresso">
            <IconLock size={22} />
            <span className="eyebrow leading-relaxed">{lockedLabel}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open !== null && items[open] && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="dark-surface fixed inset-0 z-[90] flex items-center justify-center bg-espresso-900/96"
            onClick={close}
            onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touchX.current;
              const end = e.changedTouches[0]?.clientX;
              if (start != null && end != null && Math.abs(end - start) > 50) step(end < start ? 1 : -1);
            }}
          >
            <motion.img
              key={items[open].id}
              src={src(items[open], 2400)}
              alt={items[open].alt || title}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              className="max-h-[88vh] max-w-[92vw] object-contain shadow-lift"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
            <button className="absolute right-4 top-4 flex size-12 items-center justify-center text-ivory-50" onClick={close} aria-label={t("close")}>
              <IconClose size={24} />
            </button>
            {items.length > 1 && (
              <>
                <button className="absolute left-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center text-ivory-50 sm:left-6" onClick={(e) => (e.stopPropagation(), step(-1))} aria-label={t("previous")}>
                  <IconArrowLeft size={26} />
                </button>
                <button className="absolute right-2 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center text-ivory-50 sm:right-6" onClick={(e) => (e.stopPropagation(), step(1))} aria-label={t("next")}>
                  <IconArrowRight size={26} />
                </button>
              </>
            )}
            <p className="eyebrow absolute bottom-6 left-1/2 -translate-x-1/2 text-champagne">
              {open + 1} / {items.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
