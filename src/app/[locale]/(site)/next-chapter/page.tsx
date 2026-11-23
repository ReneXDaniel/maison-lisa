import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { MediaImage } from "@/components/shop/media-image";
import { Countdown } from "@/components/home/countdown";
import { Reveal } from "@/components/motion/reveal";
import { SubscribeForm } from "@/components/about/subscribe-form";
import { listReleases } from "@/lib/releases";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nextChapter" });
  return pageMetadata({ locale, path: "/next-chapter", title: t("title"), description: t("intro") });
}

export default async function NextChapterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ subscription?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nextChapter");
  const releases = await listReleases(locale);
  const sub = (await searchParams).subscription;
  return (
    <div>
      <Container wide className="pb-24">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
        {sub && <Notice tone={sub === "invalid" ? "error" : "success"} className="mx-auto mb-10 max-w-xl">{t(sub === "confirmed" ? "confirmed" : sub === "unsubscribed" ? "unsubscribed" : "invalidLink")}</Notice>}
        {releases.length === 0 && <EmptyState title={t("empty")} />}
        <div className="space-y-24">
          {releases.map((r, i) => (
            <Reveal key={r.id}>
              <article className="grid items-center gap-10 lg:grid-cols-12">
                <div className={`dark-surface relative lg:col-span-7 ${i % 2 ? "lg:order-2" : ""}`}>
                  <MediaImage media={r.cover} alt={r.title} className="aspect-[4/3]" sizes="(min-width:1024px) 58vw, 100vw" />
                </div>
                <div className={`lg:col-span-5 ${i % 2 ? "lg:order-1" : ""}`}>
                  <p className="eyebrow text-taupe-700">{r.releaseAt ? formatDate(r.releaseAt, locale, { dateStyle: "long" }) : t("noDate")}</p>
                  <h2 className="mt-4 text-5xl text-espresso sm:text-6xl">{r.title}</h2>
                  <p className="mt-5 text-[15px] leading-relaxed text-taupe-700">{r.description}</p>
                  {r.releaseAt && <div className="mt-6 text-espresso"><Countdown to={r.releaseAt.toISOString()} /></div>}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
      <section className="dark-surface bg-espresso py-24 text-ivory-50">
        <Container className="max-w-2xl text-center">
          <h2 className="text-5xl">{t("subscribeTitle")}</h2>
          <p className="mx-auto mt-4 max-w-lg text-champagne-200">{t("subscribeBody")}</p>
          <div className="mt-10 text-left"><SubscribeForm /></div>
        </Container>
      </section>
    </div>
  );
}
