import { getTranslations } from "next-intl/server";
import { devSimulatorsEnabled, env, previewMode } from "@/lib/env";
import { Link } from "@/i18n/navigation";

/**
 * Visible on every page while simulated integrations are active: in local
 * development, or on a password-protected preview deployment. Never shown
 * (or possible) in a real production configuration.
 */
export async function DevBanner() {
  if (!devSimulatorsEnabled()) return null;
  const t = await getTranslations("dev");
  const e = env();
  const label = e.NODE_ENV === "production" && previewMode() ? t("previewBanner") : t("banner");
  return (
    <div className="fixed bottom-0 left-0 z-[70] m-2 flex max-w-[calc(100vw-1rem)] items-center gap-3 border border-dashed border-[#6b5a8a] bg-[#efeaf5]/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#352a4a] sm:m-3">
      <span>{label}</span>
      <span className="hidden opacity-70 md:inline">
        {t("providers", { verification: e.VERIFICATION_PROVIDER, payment: e.PAYMENT_PROVIDER, mail: e.MAIL_TRANSPORT })}
      </span>
      <Link href="/dev/mailbox" className="underline">
        {t("mailbox")}
      </Link>
    </div>
  );
}
