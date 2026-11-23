"use client";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useUI } from "@/stores/ui";
import { IconClose } from "@/components/ui/icons";

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  const t = useTranslations("common");
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.25 } }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-4 border border-champagne/60 bg-espresso px-5 py-4 text-ivory-50 shadow-lift"
            role="status"
          >
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${toast.tone === "error" ? "bg-[#d98b7a]" : "bg-champagne"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-snug">{toast.title}</p>
              {toast.body && <p className="mt-0.5 text-xs leading-relaxed text-champagne-200">{toast.body}</p>}
              {toast.href && (
                <Link href={toast.href} className="eyebrow mt-2 inline-block text-champagne link-underline" onClick={() => dismiss(toast.id)}>
                  {t("view")}
                </Link>
              )}
            </div>
            <button onClick={() => dismiss(toast.id)} aria-label={t("close")} className="text-champagne-200 hover:text-ivory-50">
              <IconClose size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
