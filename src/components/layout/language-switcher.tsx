"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { IconCheck, IconGlobe } from "@/components/ui/icons";
import { savePreferredLocale } from "@/app/actions/preferences";
import { useSessionUser } from "@/components/providers/session-provider";

/**
 * Elegant language selector. Switching keeps the current page and query
 * string; cart, drafts and studio selections live in storage/the server and
 * therefore survive the switch. Signed-in users get the choice saved to
 * their profile so it is restored on their next visit.
 */
export function LanguageSwitcher({ tone = "dark", align = "right" }: { tone?: "dark" | "light"; align?: "left" | "right" }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const user = useSessionUser();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    const qs = search.toString();
    start(() => {
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: next, scroll: false });
    });
    if (user) void savePreferredLocale(next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("language")}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex h-10 items-center gap-1.5 px-2 text-[11px] font-semibold tracking-[0.2em] transition-colors",
          tone === "light" ? "text-ivory-50 hover:text-champagne" : "text-espresso hover:text-taupe-700",
          pending && "opacity-60",
        )}
      >
        <IconGlobe size={17} />
        <span>{locale.toUpperCase()}</span>
      </button>
      <div
        id={listId}
        role="listbox"
        aria-label={t("language")}
        className={clsx(
          "absolute top-full z-50 mt-2 w-56 origin-top border border-champagne/60 bg-ivory-50 py-2 shadow-lift transition-all duration-300",
          align === "right" ? "right-0" : "left-0",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <p className="eyebrow px-5 pb-2 pt-1 text-taupe-700">{t("language")}</p>
        {locales.map((l) => (
          <button
            key={l}
            role="option"
            aria-selected={l === locale}
            lang={l}
            onClick={() => choose(l)}
            className="flex w-full items-center justify-between px-5 py-2.5 text-left text-sm text-charcoal transition-colors hover:bg-ivory-200"
          >
            <span>
              <span className="mr-3 inline-block w-6 text-[11px] font-semibold tracking-[0.15em] text-taupe-700">{l.toUpperCase()}</span>
              {localeNames[l]}
            </span>
            {l === locale && <IconCheck size={16} className="text-espresso" />}
          </button>
        ))}
      </div>
    </div>
  );
}
