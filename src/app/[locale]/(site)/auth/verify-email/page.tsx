import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResendForm } from "@/components/auth/forms";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/guards";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; confirmed?: string; invalid?: string }> };

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = safeNext(sp.next, "/account");
  const user = await getCurrentUser();
  const t = await getTranslations("auth.verifyEmail");

  if (user?.emailVerified || sp.confirmed) {
    const needsAge = user && !user.isAdmin && !user.isAdultVerified;
    return (
      <AuthShell title={t("confirmedTitle")} subtitle={needsAge ? t("confirmedNextAge") : t("confirmedBody")} aside="verification">
        <div className="flex flex-col gap-3 sm:flex-row">
          {user ? (
            needsAge ? (
              <ButtonLink href={{ pathname: "/verify", query: { next } }} size="lg" data-testid="continue-verification">
                {t("continueVerification")}
              </ButtonLink>
            ) : (
              <ButtonLink href={next} size="lg">{t("continue")}</ButtonLink>
            )
          ) : (
            <ButtonLink href={{ pathname: "/auth/login", query: { next } }} size="lg">{t("signIn")}</ButtonLink>
          )}
        </div>
      </AuthShell>
    );
  }
  if (!user) redirect(`/${locale}/auth/login?next=${encodeURIComponent(next)}`);
  return (
    <AuthShell title={t("title")} subtitle={t("body", { email: user.email })} aside="verification">
      {sp.invalid && <Notice tone="error" className="mb-6">{t("invalid")}</Notice>}
      <p className="mb-6 text-sm leading-relaxed text-taupe-700">{t("hint")}</p>
      <ResendForm next={next} />
    </AuthShell>
  );
}
