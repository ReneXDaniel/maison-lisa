import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPage, Panel } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { Badge } from "@/components/ui/misc";
import { Link } from "@/i18n/navigation";
import { requirePage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { env, devSimulatorsEnabled } from "@/lib/env";

export default async function AdminSettings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requirePage(locale, "admin", "/admin/settings");
  const t = await getTranslations("admin.settings");
  const s = await getSettings();
  const e = env();
  const integrations = [
    [t("verification"), e.VERIFICATION_PROVIDER, e.VERIFICATION_PROVIDER === "dev" ? "dev" : e.VERIFF_API_KEY && e.VERIFF_SHARED_SECRET ? "ok" : "missing"],
    [t("payments"), e.PAYMENT_PROVIDER, e.PAYMENT_PROVIDER === "dev" ? "dev" : e.VEROTEL_SHOP_ID && e.VEROTEL_SIGNATURE_KEY ? "ok" : "missing"],
    [t("mail"), e.MAIL_TRANSPORT, e.MAIL_TRANSPORT === "outbox" ? "dev" : e.SMTP_HOST ? "ok" : "missing"],
    [t("storage"), e.STORAGE_DRIVER, e.STORAGE_DRIVER === "local" ? "local" : e.S3_BUCKET ? "ok" : "missing"],
    [t("scanner"), e.CLAMAV_HOST ? "clamav" : "—", e.CLAMAV_HOST ? "ok" : "optional"],
  ] as const;
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t("shop")}>
          <SettingsForm settings={{ allowDiscountStacking: s.allowDiscountStacking, welcomeOncePerIdentity: s.welcomeOncePerIdentity, downloadLinkTtlMinutes: s.downloadLinkTtlMinutes, checkoutSessionMinutes: s.checkoutSessionMinutes, chatAttachmentsEnabled: s.chatAttachmentsEnabled, maxAttachmentMb: s.maxAttachmentMb, stockingSequenceManifest: s.stockingSequenceManifest }} />
        </Panel>
        <div className="space-y-6">
          <Panel title={t("integrations")}>
            <ul className="space-y-3 text-sm">
              {integrations.map(([label, value, state]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span>{label} <span className="text-xs text-taupe-700">({value})</span></span>
                  <Badge tone={state === "ok" ? "success" : state === "missing" ? "danger" : "warning"}>{t(`state.${state}`)}</Badge>
                </li>
              ))}
            </ul>
            {devSimulatorsEnabled() && <p className="mt-4 text-xs leading-relaxed text-taupe-700">{t("devNote")}</p>}
          </Panel>
          <Panel title={t("security")}>
            <p className="text-sm">{admin.mfaEnabled ? t("mfaOn") : t("mfaOff")}</p>
            <Link href="/account/security" className="eyebrow mt-3 inline-block text-espresso link-underline">{t("manageSecurity")}</Link>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
