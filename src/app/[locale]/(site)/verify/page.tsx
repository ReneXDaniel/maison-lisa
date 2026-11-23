import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { StartVerificationForm } from "@/components/verification/verification-panel";
import { ButtonLink } from "@/components/ui/button";
import { Notice, DevLabel } from "@/components/ui/misc";
import { requirePage, safeNext } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verify" });
  return pageMetadata({ locale, path: "/verify", title: t("title"), noindex: true });
}

export default async function VerifyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const next = safeNext((await searchParams).next, "/account");
  const user = await requirePage(locale, "email", `/verify?next=${encodeURIComponent(next)}`);
  const t = await getTranslations("verify");
  const status = user.isAdmin ? "verified" : user.ageStatus;

  return (
    <AuthShell title={t("title")} subtitle={t("intro")} aside="verification">
      <div className="space-y-8">
        {status !== "not_verified" && (
          <Notice tone={status === "verified" ? "success" : status === "failed" || status === "revoked" ? "error" : "info"} title={t(`status.${status}.title`)}>
            {t(`status.${status}.body`)}
          </Notice>
        )}
        {status === "verified" ? (
          <ButtonLink href={next} size="lg">{t("continue")}</ButtonLink>
        ) : status === "manual_review" || status === "revoked" ? null : (
          <>
            <ol className="space-y-5">
              {(["s1", "s2", "s3"] as const).map((k, i) => (
                <li key={k} className="flex gap-5">
                  <span className="font-display flex size-9 shrink-0 items-center justify-center border border-champagne text-lg text-espresso">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-espresso">{t(`steps.${k}.title`)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-taupe-700">{t(`steps.${k}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <StartVerificationForm next={next} label={status === "pending" ? t("restart") : t("start")} />
            {env().VERIFICATION_PROVIDER === "dev" && <DevLabel>{t("devNote")}</DevLabel>}
          </>
        )}
        <p className="border-t border-champagne/50 pt-6 text-xs leading-relaxed text-taupe-700">{t("privacy")}</p>
      </div>
    </AuthShell>
  );
}
