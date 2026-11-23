"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { IconPlus } from "@/components/ui/icons";

/** Personality cards that unfold gently. Content is fully editable by Lisa in the admin. */
export function AboutCards({ cards }: { cards: { key: string; title: string; body: string }[] }) {
  const [open, setOpen] = useState<string | null>(cards[0]?.key ?? null);
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => {
        const isOpen = open === c.key;
        return (
          <motion.article layout key={c.key} className={clsx("overflow-hidden border transition-colors duration-500", isOpen ? "dark-surface border-espresso bg-espresso text-ivory-50" : "border-champagne/60 bg-ivory-50 text-espresso", i === 0 && "lg:row-span-2")}>
            <button className="flex w-full items-start justify-between gap-4 p-7 text-left" onClick={() => setOpen(isOpen ? null : c.key)} aria-expanded={isOpen} data-testid="about-card">
              <span>
                <span className={clsx("eyebrow block", isOpen ? "text-champagne" : "text-taupe-700")}>{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display mt-3 block text-3xl leading-tight">{c.title}</span>
              </span>
              <IconPlus size={20} className={clsx("mt-1 shrink-0 transition-transform duration-500", isOpen && "rotate-45")} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}>
                  <p className="whitespace-pre-line px-7 pb-8 text-[15px] leading-relaxed text-champagne-200">{c.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.article>
        );
      })}
    </div>
  );
}
