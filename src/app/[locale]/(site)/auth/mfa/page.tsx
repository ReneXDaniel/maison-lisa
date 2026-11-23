import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { MfaForm } from "@/components/auth/forms";
import { getRawSessionUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/guards";

export default async function MfaPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getRawSessionUser();
  if (!user?.mfaPending) redirect(`/${locale}/auth/login`);
  const t = await getTranslations("auth.mfa");
  return (
    <AuthShell title={t("title")} subtitle={t("body")}>
      <MfaForm next={safeNext((await searchParams).next, "/account")} />
    </AuthShell>
  );
}
