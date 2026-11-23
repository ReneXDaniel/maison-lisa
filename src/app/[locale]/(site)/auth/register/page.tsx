import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/guards";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.register" });
  return pageMetadata({ locale, path: "/auth/register", title: t("metaTitle"), noindex: true });
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const next = safeNext((await searchParams).next, "/account");
  if (await getCurrentUser()) redirect(`/${locale}${next}`);
  const t = await getTranslations("auth.register");
  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")} aside="benefits">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
