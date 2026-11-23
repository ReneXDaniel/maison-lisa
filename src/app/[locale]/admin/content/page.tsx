import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPage } from "@/components/admin/ui";
import { ContentEditor } from "@/components/admin/content-editor";
import { requirePage } from "@/lib/auth/guards";
import { contentOverrides, EDITABLE_CONTENT } from "@/lib/content";
import { isLocale, locales } from "@/i18n/routing";

export default async function AdminContent({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/content");
  const t = await getTranslations("admin.content");
  const lang = isLocale((await searchParams).lang) ? (await searchParams).lang! : locale;
  const [defaults, overrides] = await Promise.all([getTranslations({ locale: lang }), contentOverrides(lang)]);
  const entries = EDITABLE_CONTENT.map((c) => ({ ...c, default: defaults.has(c.key) ? defaults.raw(c.key) as string : "", value: overrides.get(c.key) ?? "" }));
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <p className="mb-6 max-w-2xl text-sm text-taupe-700">{t("help")}</p>
      <ContentEditor lang={lang} locales={[...locales]} entries={entries} />
    </AdminPage>
  );
}
