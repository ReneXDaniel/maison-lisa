import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/guards";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; reset?: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return pageMetadata({ locale, path: "/auth/login", title: t("metaTitle"), noindex: true });
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const next = safeNext(sp.next, "/account");
  if (await getCurrentUser()) redirect(`/${locale}${next}`);
  const t = await getTranslations("auth.login");
  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")}>
      <LoginForm next={next} notice={sp.reset ? t("resetDone") : undefined} />
    </AuthShell>
  );
}
