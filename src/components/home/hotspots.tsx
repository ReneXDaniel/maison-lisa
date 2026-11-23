"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { IconClose } from "@/components/ui/icons";

export type Hotspot = { key: string; x: number; y: number; title: string; body: string };

/**
 * Editorial photograph with discoverable details. Hover (desktop) or tap
 * (touch) a glowing point to open a close-up crop of that spot with a short
 * note. Fully keyboard accessible.
 */
export function Hotspots({ imageUrl, alt, spots, hint, closeLabel }: { imageUrl: string; alt: string; spots: Hotspot[]; hint: string; closeLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const current = spots.find((s) => s.key === active);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setActive(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden shadow-soft" data-testid="hotspots">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} className="block h-auto w-full" draggable={false} loading="lazy" />
      <p className="eyebrow pointer-events-none absolute left-5 top-5 bg-ivory-50/80 px-3 py-2 text-espresso backdrop-blur">{hint}</p>
      {spots.map((s) => (
        <button
          key={s.key}
          type="button"
          className="group absolute -translate-x-1/2 -translate-y-1/2 p-3"
          style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
          onMouseEnter={() => window.matchMedia("(hover: hover)").matches && setActive(s.key)}
          onFocus={() => setActive(s.key)}
          onClick={() => setActive(active === s.key ? null : s.key)}
          aria-expanded={active === s.key}
          aria-label={s.title}
          data-testid={`hotspot-${s.key}`}
        >
          <span className="relative flex size-6 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-ivory-50/60 [animation-duration:2.4s]" />
            <span className={clsx("relative size-3.5 rounded-full border-2 border-ivory-50 shadow transition-all duration-300", active === s.key ? "scale-125 bg-espresso" : "bg-champagne group-hover:bg-espresso")} />
          </span>
        </button>
      ))}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
            role="dialog"
            aria-label={current.title}
            className="absolute z-10 flex w-[min(22rem,calc(100%-2rem))] gap-4 border border-champagne/70 bg-ivory-50/95 p-4 shadow-lift backdrop-blur"
            style={{
              ...(current.y > 0.5 ? { bottom: `calc(${(1 - current.y) * 100}% + 28px)` } : { top: `calc(${current.y * 100}% + 28px)` }),
              ...(current.x > 0.5 ? { right: `max(1rem, calc(${(1 - current.x) * 100}% - 3rem))` } : { left: `max(1rem, calc(${current.x * 100}% - 3rem))` }),
            }}
          >
            <div
              className="size-24 shrink-0 bg-no-repeat"
              style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "420%", backgroundPosition: `${current.x * 100}% ${current.y * 100}%` }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 pr-4">
              <p className="font-display text-xl text-espresso">{current.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-taupe-700">{current.body}</p>
            </div>
            <button onClick={() => setActive(null)} className="absolute right-2 top-2 text-taupe-700 hover:text-espresso" aria-label={closeLabel}>
              <IconClose size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
