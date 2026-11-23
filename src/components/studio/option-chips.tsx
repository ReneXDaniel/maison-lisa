"use client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { BACKGROUND_SWATCH, POLISH_COLORS } from "@/lib/catalog-options";

/** Accessible single-choice chips (radio semantics) for an option group. */
export function OptionChips<T extends string>({ group, options, value, onChange, dark }: { group: string; options: readonly T[]; value?: T; onChange: (v: T | undefined) => void; dark?: boolean }) {
  const t = useTranslations("options");
  return (
    <div role="radiogroup" aria-label={t(`${group}.label`)} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? undefined : o)}
            className={clsx(
              "min-h-11 border px-4 text-[12px] font-semibold uppercase tracking-[0.14em] transition-all duration-300",
              active
                ? dark
                  ? "border-champagne bg-champagne text-espresso"
                  : "border-espresso bg-espresso text-ivory-50"
                : dark
                  ? "border-champagne/40 text-champagne-200 hover:border-champagne"
                  : "border-taupe/50 text-charcoal hover:border-espresso",
            )}
            data-testid={`opt-${group}-${o}`}
          >
            {t(`${group}.${o}` as string)}
          </button>
        );
      })}
    </div>
  );
}

export function ColorSwatches({ value, onChange, onPreview }: { value?: string; onChange: (v: string | undefined) => void; onPreview?: (v: string | null) => void }) {
  const t = useTranslations("options.polishColor");
  return (
    <div role="radiogroup" aria-label={t("label")} className="flex flex-wrap gap-3">
      {POLISH_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          role="radio"
          aria-checked={value === c.key}
          aria-label={t(c.key)}
          title={t(c.key)}
          onClick={() => onChange(value === c.key ? undefined : c.key)}
          onMouseEnter={() => onPreview?.(c.key)}
          onMouseLeave={() => onPreview?.(null)}
          onFocus={() => onPreview?.(c.key)}
          onBlur={() => onPreview?.(null)}
          className={clsx("size-11 rounded-full border transition-transform duration-300 hover:scale-110", value === c.key ? "scale-110 ring-2 ring-espresso ring-offset-2 ring-offset-ivory-50" : "border-taupe/40")}
          style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 45%), ${c.hex}` }}
          data-testid={`swatch-${c.key}`}
        />
      ))}
    </div>
  );
}

export function BackgroundSwatches({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const t = useTranslations("options.background");
  return (
    <div role="radiogroup" aria-label={t("label")} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {(Object.keys(BACKGROUND_SWATCH) as (keyof typeof BACKGROUND_SWATCH)[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(value === k ? undefined : k)}
          className={clsx("group flex flex-col gap-2 text-left", value === k && "")}
          data-testid={`bg-${k}`}
        >
          <span className={clsx("block h-16 w-full border transition", value === k ? "border-espresso ring-1 ring-espresso" : "border-taupe/30 group-hover:border-espresso")} style={{ background: BACKGROUND_SWATCH[k] }} />
          <span className={clsx("text-[11px] uppercase tracking-[0.12em]", value === k ? "font-semibold text-espresso" : "text-taupe-700")}>{t(k)}</span>
        </button>
      ))}
    </div>
  );
}
