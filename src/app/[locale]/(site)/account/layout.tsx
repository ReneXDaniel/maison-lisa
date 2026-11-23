import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { AccountNav } from "@/components/account/account-nav";
import { getCurrentUser } from "@/lib/auth/session";

/** Visual frame only — every account page performs its own server-side access check. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("account");
  const user = await getCurrentUser();
  return (
    <Container wide className="pb-28 pt-28 sm:pt-32">
      <p className="eyebrow text-taupe-700">{t("eyebrow")}</p>
      <h1 className="mt-3 text-5xl text-espresso sm:text-6xl">{user ? t("hello", { name: user.displayName }) : t("title")}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
