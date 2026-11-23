import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/forms";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { peekToken } from "@/lib/auth/tokens";

export default async function ResetPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const token = (await searchParams).token ?? "";
  const valid = await peekToken(token, "reset_password");
  const t = await getTranslations("auth.reset");
  const e = await getTranslations("errors");
  return (
    <AuthShell title={t("title")} subtitle={valid ? t("body") : undefined}>
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="space-y-6">
          <Notice tone="error">{e("token_invalid")}</Notice>
          <ButtonLink href="/auth/forgot" variant="secondary">{t("requestNew")}</ButtonLink>
        </div>
      )}
    </AuthShell>
  );
}
