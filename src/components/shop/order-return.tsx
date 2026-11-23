"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ButtonLink } from "@/components/ui/button";
import { useUI } from "@/stores/ui";

/**
 * The return from the payment page never unlocks anything by itself — it
 * waits for the server to receive the provider's authenticated notification.
 */
export function OrderReturn({ orderId, cancelled }: { orderId: string; cancelled: boolean }) {
  const t = useTranslations("checkout.return");
  const setCounts = useUI((s) => s.setCounts);
  const [status, setStatus] = useState<string>("pending");
  const [number, setNumber] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!orderId || (status !== "pending" && tries > 0) || tries > 45) return;
    const id = setTimeout(
      async () => {
        const r = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (r.ok) {
          const d = (await r.json()) as { status: string; number: string };
          setStatus(d.status);
          setNumber(d.number);
          if (d.status === "paid") void fetch("/api/me/counts").then((x) => x.json()).then(setCounts);
        } else setStatus("unknown");
        setTries((n) => n + 1);
      },
      tries === 0 ? 0 : 1500,
    );
    return () => clearTimeout(id);
  }, [orderId, status, tries, setCounts]);

  const view = status === "paid" ? "paid" : cancelled && status === "pending" ? "cancelled" : ["failed", "cancelled", "expired"].includes(status) ? "failed" : status === "unknown" ? "unknown" : tries > 45 ? "slow" : "pending";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="text-center" data-testid="order-return" data-status={view}>
      {view === "paid" && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }} className="mx-auto mb-10 flex size-20 items-center justify-center rounded-full border border-champagne">
          <motion.svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2C1F18" strokeWidth="1.2">
            <motion.path d="m5 12.5 4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.4 }} />
          </motion.svg>
        </motion.div>
      )}
      <p className="eyebrow text-taupe-700">{number}</p>
      <h1 className="mt-4 text-5xl leading-tight text-espresso">{t(`${view}.title`)}</h1>
      <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-taupe-700">{t(`${view}.body`)}</p>
      {view === "pending" && <div className="mx-auto mt-8 size-6 animate-spin rounded-full border border-espresso border-t-transparent" />}
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        {view === "paid" && (
          <>
            <ButtonLink href="/account/purchases" size="lg" data-testid="view-purchases">
              {t("viewPurchases")}
            </ButtonLink>
            <ButtonLink href={`/account/orders/${orderId}`} variant="secondary" size="lg">
              {t("viewOrder")}
            </ButtonLink>
          </>
        )}
        {(view === "failed" || view === "cancelled") && (
          <ButtonLink href="/cart" size="lg">
            {t("backToCart")}
          </ButtonLink>
        )}
      </div>
    </motion.div>
  );
}
