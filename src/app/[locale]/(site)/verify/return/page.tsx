import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerificationReturn } from "@/components/verification/verification-panel";
import { requirePage, safeNext } from "@/lib/auth/guards";

export default async function VerifyReturnPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const next = safeNext((await searchParams).next, "/account");
  const user = await requirePage(locale, "email", `/verify/return?next=${encodeURIComponent(next)}`);
  const t = await getTranslations("verify");
  return (
    <AuthShell title={t("returnTitle")} aside="verification">
      <VerificationReturn next={next} initial={user.ageStatus} />
    </AuthShell>
  );
}
