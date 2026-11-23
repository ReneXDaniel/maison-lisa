import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { MediaImage } from "@/components/shop/media-image";
import { Reveal } from "@/components/motion/reveal";
import { AboutCards } from "@/components/about/about-cards";
import { IconChat } from "@/components/ui/icons";
import { getContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { mediaByIds } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/config/brand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return pageMetadata({ locale, path: "/about", title: t("metaTitle"), description: t("intro.body") });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [c, t, { siteMedia }] = await Promise.all([getContent(locale), getTranslations("about"), getSettings()]);
  const ids = [siteMedia.aboutPortrait, ...(siteMedia.behindScenes ?? [])].filter(Boolean) as string[];
  const media = await mediaByIds(ids);
  const portrait = siteMedia.aboutPortrait ? (media.get(siteMedia.aboutPortrait) ?? null) : null;
  const bts = (siteMedia.behindScenes ?? []).map((id) => media.get(id)).filter(Boolean);
  const cards = (["c1", "c2", "c3", "c4", "c5"] as const).map((k) => ({ key: k, title: c(`about.cards.${k}.title`), body: c(`about.cards.${k}.body`, { creator: brand.creatorName }) }));
  const btsKeys = ["b1", "b2", "b3", "b4", "b5", "b6"] as const;

  return (
    <div className="pb-0">
      <section className="pt-32 sm:pt-40">
        <Container wide className="grid items-end gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow text-taupe-700">{t("eyebrow")}</p>
            <h1 className="mt-5 text-7xl leading-[0.95] text-espresso sm:text-8xl lg:text-9xl">{c("about.intro.title", { creator: brand.creatorName })}</h1>
            <p className="font-display mt-6 text-3xl italic text-taupe-700">{t("subtitle")}</p>
            <p className="mt-8 max-w-lg whitespace-pre-line text-lg leading-relaxed text-charcoal">{c("about.intro.body", { creator: brand.creatorName })}</p>
          </Reveal>
          <Reveal delay={0.15} className="lg:col-span-5 lg:col-start-8">
            <MediaImage media={portrait} alt={t("portraitAlt", { creator: brand.creatorName })} className="aspect-[4/5]" priority sizes="(min-width:1024px) 40vw, 100vw" />
            {portrait?.isDemo && <p className="mt-2 text-xs text-taupe-700">{t("portraitPlaceholder")}</p>}
          </Reveal>
        </Container>
      </section>

      <section className="py-24 sm:py-32">
        <Container wide>
          <AboutCards cards={cards} />
        </Container>
      </section>

      {bts.length > 0 && (
        <section className="dark-surface bg-espresso py-24 text-ivory-50 sm:py-32">
          <Container wide>
            <Reveal className="mb-14 max-w-2xl">
              <p className="eyebrow text-champagne">{t("bts.eyebrow")}</p>
              <h2 className="mt-4 text-5xl sm:text-6xl">{t("bts.title")}</h2>
              <p className="mt-4 text-champagne-200">{t("bts.body")}</p>
            </Reveal>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {bts.map((m, i) => (
                <Reveal key={m!.id} delay={(i % 3) * 0.1} className={i % 4 === 0 ? "row-span-2" : ""}>
                  <figure className="group h-full">
                    <MediaImage media={m!} alt={t(`bts.items.${btsKeys[i] ?? "b1"}`)} className={i % 4 === 0 ? "aspect-[3/5] h-full" : "aspect-[4/5]"} sizes="33vw" />
                    <figcaption className="mt-3 text-xs uppercase tracking-[0.16em] text-champagne-200">{t(`bts.items.${btsKeys[i] ?? "b1"}`)}</figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="paper-grain bg-ivory py-32 text-center">
        <Container className="max-w-2xl">
          <Reveal>
            <h2 className="text-5xl leading-tight text-espresso sm:text-6xl">{c("about.final.title")}</h2>
            <p className="font-display mt-6 text-3xl italic text-taupe-700">{c("about.final.body", { creator: brand.creatorName })}</p>
            <ButtonLink href="/messages/new" size="lg" className="mt-12" data-testid="about-message">
              <IconChat size={16} />
              {t("cta", { creator: brand.creatorName })}
            </ButtonLink>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
