import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { Notice } from "@/components/ui/misc";
import { ProfileForm, EmailChangeForm, PasswordForm } from "@/components/account/account-forms";
import { requirePage } from "@/lib/auth/guards";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ emailChange?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "user", "/account/profile");
  const t = await getTranslations("account.profile");
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  const ec = (await searchParams).emailChange;
  return (
    <div className="max-w-2xl space-y-14">
      {ec === "ok" && <Notice tone="success">{t("emailChanged")}</Notice>}
      {ec === "invalid" && <Notice tone="error">{t("emailChangeInvalid")}</Notice>}
      <section>
        <h2 className="font-display mb-6 text-3xl text-espresso">{t("title")}</h2>
        <ProfileForm initial={{ displayName: p?.displayName ?? user.displayName, locale: p?.locale ?? locale, notifyEmailMessages: p?.notifyEmailMessages ?? true, notifyEmailOrders: p?.notifyEmailOrders ?? true, readReceipts: p?.readReceipts ?? true }} />
      </section>
      <section className="border-t border-champagne/50 pt-10">
        <h2 className="font-display mb-2 text-3xl text-espresso">{t("emailTitle")}</h2>
        <p className="mb-6 text-sm text-taupe-700">{t("currentEmail", { email: user.email })}</p>
        <EmailChangeForm />
      </section>
      <section className="border-t border-champagne/50 pt-10">
        <h2 className="font-display mb-6 text-3xl text-espresso">{t("passwordTitle")}</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
