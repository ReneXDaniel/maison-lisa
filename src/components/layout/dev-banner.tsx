import { getTranslations } from "next-intl/server";
import { devSimulatorsEnabled, env } from "@/lib/env";
import { Link } from "@/i18n/navigation";

/** Visible on every page while simulated integrations are active — never shown (or possible) in production. */
export async function DevBanner() {
  if (!devSimulatorsEnabled()) return null;
  const t = await getTranslations("dev");
  const e = env();
  return (
    <div className="fixed bottom-0 left-0 z-[70] hidden max-w-[calc(100vw-2rem)] items-center gap-3 border border-dashed border-[#6b5a8a] bg-[#efeaf5]/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#352a4a] sm:m-3 sm:flex">
      <span>{t("banner")}</span>
      <span className="opacity-70">
        {t("providers", { verification: e.VERIFICATION_PROVIDER, payment: e.PAYMENT_PROVIDER, mail: e.MAIL_TRANSPORT })}
      </span>
      <Link href="/dev/mailbox" className="underline">
        {t("mailbox")}
      </Link>
    </div>
  );
}
