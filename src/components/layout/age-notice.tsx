"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { AGE_NOTICE_COOKIE } from "@/lib/constants";

/**
 * One-time 18+ entry notice. This is an information gate, NOT age
 * verification: restricted features (chat, requests, checkout, downloads)
 * still require identity-based verification enforced on the server.
 */
export function AgeNotice({ acknowledged }: { acknowledged: boolean }) {
  const t = useTranslations("ageNotice");
  const [open, setOpen] = useState(!acknowledged);
  const enterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = "hidden";
      enterRef.current?.focus();
    } else document.documentElement.style.overflow = "";
  }, [open]);

  const accept = () => {
    document.cookie = `${AGE_NOTICE_COOKIE}=1; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax`;
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-title"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          className="dark-surface fixed inset-0 z-[100] flex items-center justify-center bg-espresso/96 px-6 text-center text-ivory-50 backdrop-blur-sm"
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }} className="max-w-lg">
            <p className="font-display text-3xl tracking-[0.42em] sm:text-4xl">{brand.name}</p>
            <div className="hairline mx-auto my-8 w-32" />
            <h2 id="age-title" className="font-display text-3xl italic text-champagne sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-champagne-200">{t("body")}</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button ref={enterRef} variant="champagne" size="lg" onClick={accept} data-testid="age-enter">
                {t("enter")}
              </Button>
              <a href="https://www.google.com" className="eyebrow px-6 py-4 text-champagne-200 hover:text-ivory-50">
                {t("leave")}
              </a>
            </div>
            <p className="mx-auto mt-10 max-w-sm text-[11px] leading-relaxed text-champagne-200/70">{t("note")}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
