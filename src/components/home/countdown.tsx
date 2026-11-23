"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Shown only when Lisa configured a real release date. */
export function Countdown({ to }: { to: string }) {
  const t = useTranslations("nextChapter");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const ms = Math.max(0, new Date(to).getTime() - now);
  if (ms === 0) return <p className="eyebrow text-champagne">{t("available")}</p>;
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return (
    <p className="flex gap-4" aria-label={t("countdownLabel", { d, h, m })}>
      {[
        [d, t("days")],
        [h, t("hours")],
        [m, t("minutes")],
      ].map(([v, l]) => (
        <span key={String(l)} className="flex flex-col items-center">
          <span className="font-display text-3xl">{String(v).padStart(2, "0")}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-75">{l}</span>
        </span>
      ))}
    </p>
  );
}
