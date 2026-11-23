import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  return (
    <section className="flex min-h-dvh items-center justify-center bg-espresso text-ivory-50">
      <div className="text-center">
        <h1 className="text-7xl tracking-[0.3em]">{t("hero.title")}</h1>
        <p className="font-display mt-4 text-3xl italic text-champagne">{t("hero.subtitle")}</p>
      </div>
    </section>
  );
}
