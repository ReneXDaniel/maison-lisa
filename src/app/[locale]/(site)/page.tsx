import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { Hero } from "@/components/home/hero";
import { BehindTheSilk } from "@/components/home/behind-the-silk";
import { SilkReveal } from "@/components/home/silk-reveal";
import { Hotspots } from "@/components/home/hotspots";
import { Countdown } from "@/components/home/countdown";
import { Reveal } from "@/components/motion/reveal";
import { MediaImage } from "@/components/shop/media-image";
import { Bottle } from "@/components/studio/bottle";
import { IconChat } from "@/components/ui/icons";
import { getContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { listCollections, mediaByIds } from "@/lib/catalog";
import { listReleases } from "@/lib/releases";
import { getCurrentUser } from "@/lib/auth/session";
import { getWelcomeDiscount, welcomeEligible } from "@/lib/discounts";
import { mediaSrc } from "@/lib/media-url";
import { POLISH_COLORS } from "@/lib/catalog-options";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/config/brand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return pageMetadata({ locale, path: "/", description: t("hero.support") });
}

const HOTSPOTS = [
  { key: "polish", x: 0.385, y: 0.42 },
  { key: "styling", x: 0.585, y: 0.47 },
  { key: "jewelry", x: 0.26, y: 0.81 },
  { key: "silk", x: 0.09, y: 0.71 },
  { key: "stockings", x: 0.875, y: 0.26 },
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [c, t, settings, collections, releases, user, welcome] = await Promise.all([
    getContent(locale),
    getTranslations("home"),
    getSettings(),
    listCollections(locale),
    listReleases(locale),
    getCurrentUser(),
    getWelcomeDiscount(),
  ]);
  const sm = settings.siteMedia;
  const media = await mediaByIds([sm.hero, sm.silkReveal, sm.hotspotImage, sm.aboutPortrait].filter(Boolean) as string[]);
  const hero = mediaSrc(sm.hero ? media.get(sm.hero) : null, 2400);
  const silk = mediaSrc(sm.silkReveal ? media.get(sm.silkReveal) : null, 1600);
  const spots = mediaSrc(sm.hotspotImage ? media.get(sm.hotspotImage) : null, 1600);
  const portrait = sm.aboutPortrait ? media.get(sm.aboutPortrait) : null;
  const showWelcome = !!welcome && welcome.kind === "percent" && (!user || (!user.isAdmin && (await welcomeEligible(db, user.id))));
  const announcement = c("home.announcement");

  return (
    <>
      <Hero
        src={hero.src}
        srcSet={hero.srcSet}
        eyebrow={c("home.hero.eyebrow")}
        title={brand.name}
        subtitle={c("home.hero.subtitle")}
        support={c("home.hero.support")}
        ctaCollection={t("hero.ctaCollection")}
        ctaExperience={t("hero.ctaExperience")}
        scroll={t("hero.scroll")}
      />

      {announcement && (
        <div className="bg-champagne px-5 py-3 text-center text-sm text-espresso" role="note">
          {announcement}
        </div>
      )}

      {showWelcome && (
        <section className="dark-surface border-t border-champagne/20 bg-espresso text-ivory-50" data-testid="welcome-banner">
          <Container wide className="flex flex-col items-center justify-between gap-6 py-10 text-center md:flex-row md:text-left">
            <div>
              <p className="eyebrow text-champagne">{t("welcome.eyebrow")}</p>
              <p className="font-display mt-2 text-3xl sm:text-4xl">{t("welcome.title")}</p>
              <p className="mt-1 text-champagne-200">
                {t("welcome.body", { percent: welcome!.value })} <span className="text-xs opacity-75">· {t("welcome.note")}</span>
              </p>
            </div>
            <ButtonLink href="/collections" variant="champagne" size="lg">
              {t("welcome.cta")}
            </ButtonLink>
          </Container>
        </section>
      )}

      <section className="paper-grain bg-ivory py-28 sm:py-40">
        <Container className="max-w-4xl text-center">
          <Reveal>
            <p className="eyebrow text-taupe-700">{t("intro.eyebrow")}</p>
            <h2 className="mt-6 text-5xl leading-[1.05] text-espresso sm:text-7xl">{c("home.intro.title")}</h2>
            <div className="hairline mx-auto my-10 w-32" />
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-charcoal">{c("home.intro.body", { creator: brand.creatorName })}</p>
          </Reveal>
        </Container>
      </section>

      <BehindTheSilk eyebrow={t("silk.eyebrow")} title={c("home.silk.title")} caption={t("silk.caption")} manifestUrl={settings.stockingSequenceManifest || undefined} />

      {collections.length > 0 && (
        <section className="py-28 sm:py-36">
          <Container wide>
            <Reveal className="mb-16 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow text-taupe-700">{t("collections.eyebrow")}</p>
                <h2 className="mt-4 text-5xl text-espresso sm:text-6xl">{t("collections.title")}</h2>
              </div>
              <Link href="/collections" className="eyebrow text-espresso link-underline">
                {t("collections.all")}
              </Link>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-12">
              {collections.slice(0, 3).map((col, i) => (
                <Reveal key={col.id} delay={i * 0.12} className={i === 0 ? "md:col-span-7 md:row-span-2" : "md:col-span-5"}>
                  <Link href={`/collections/${col.slug}`} className="group relative block overflow-hidden">
                    <MediaImage media={col.cover} alt={col.title} className={`${i === 0 ? "aspect-[4/5] md:aspect-auto md:h-full" : "aspect-[16/10]"} transition-transform duration-[1600ms] ease-[var(--ease-luxe)] group-hover:scale-[1.04]`} sizes="(min-width: 768px) 50vw, 100vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 p-7 text-ivory-50">
                      <p className="eyebrow text-champagne">{String(i + 1).padStart(2, "0")}</p>
                      <p className="font-display mt-2 text-3xl sm:text-4xl">{col.title}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      <SilkReveal imageUrl={silk.src} alt={t("details.title")} eyebrow={t("details.eyebrow")} title={c("home.details.title")} body={c("home.details.body")} />

      {spots.src && (
        <section className="bg-ivory-100 pb-28 sm:pb-36">
          <Container wide>
            <Reveal>
              <Hotspots
                imageUrl={spots.src}
                alt={t("details.title")}
                hint={t("details.hint")}
                closeLabel="×"
                spots={HOTSPOTS.map((h) => ({ ...h, title: t(`details.hotspots.${h.key}.title`), body: c(`home.details.hotspots.${h.key}.body`) }))}
              />
            </Reveal>
          </Container>
        </section>
      )}

      <section className="dark-surface overflow-hidden bg-espresso py-28 text-ivory-50 sm:py-36">
        <Container wide className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow text-champagne">{t("nail.eyebrow")}</p>
            <h2 className="mt-5 text-5xl leading-[1.02] sm:text-7xl">{t("nail.title")}</h2>
            <p className="font-display mt-5 text-2xl italic text-champagne-200">{t("nail.body")}</p>
            <ButtonLink href="/nail-studio" variant="champagne" size="lg" className="mt-10">
              {t("nail.cta")}
            </ButtonLink>
          </Reveal>
          <Reveal delay={0.2} className="no-scrollbar -mx-5 flex items-end gap-4 overflow-x-auto px-5 pb-4 lg:justify-end">
            {POLISH_COLORS.slice(0, 6).map((p, i) => (
              <Link key={p.key} href="/nail-studio" className="shrink-0 transition-transform duration-700 hover:-translate-y-3" style={{ transitionDelay: `${i * 30}ms` }} aria-label={p.key}>
                <Bottle color={p.hex} size={i % 2 ? 62 : 74} />
              </Link>
            ))}
          </Reveal>
        </Container>
      </section>

      <section className="py-28 sm:py-36">
        <Container wide className="grid items-center gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <MediaImage media={portrait ?? null} alt={t("about.title")} className="aspect-[4/5]" sizes="(min-width: 1024px) 40vw, 100vw" />
          </Reveal>
          <Reveal delay={0.15} className="lg:col-span-6 lg:col-start-7">
            <p className="eyebrow text-taupe-700">{t("about.eyebrow")}</p>
            <h2 className="mt-5 text-6xl text-espresso sm:text-7xl">{t("about.title")}</h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-charcoal">{t("about.body")}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/about" size="lg">
                {t("about.cta")}
              </ButtonLink>
              <ButtonLink href="/quiz" variant="secondary" size="lg">
                {t("quiz.cta")}
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      {releases.length > 0 && (
        <section className="paper-grain bg-ivory py-28 sm:py-36">
          <Container wide>
            <Reveal className="mb-14 text-center">
              <p className="eyebrow text-taupe-700">{t("next.eyebrow")}</p>
              <h2 className="mt-4 text-5xl text-espresso sm:text-7xl">{t("next.title")}</h2>
            </Reveal>
            <div className="grid gap-8 md:grid-cols-3">
              {releases.slice(0, 3).map((r, i) => (
                <Reveal key={r.id} delay={i * 0.12}>
                  <article className="group">
                    <div className="dark-surface relative overflow-hidden">
                      <MediaImage media={r.cover} alt={r.title} className="aspect-[4/3] transition-transform duration-[1400ms] group-hover:scale-[1.04]" sizes="33vw" />
                      {r.releaseAt && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/85 to-transparent p-5 text-ivory-50">
                          <Countdown to={r.releaseAt.toISOString()} />
                        </div>
                      )}
                    </div>
                    <h3 className="font-display mt-5 text-3xl text-espresso">{r.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-taupe-700">{r.description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
            <div className="mt-14 text-center">
              <ButtonLink href="/next-chapter" variant="secondary">
                {t("next.cta")}
              </ButtonLink>
            </div>
          </Container>
        </section>
      )}

      <section className="dark-surface bg-espresso-900 py-32 text-center text-ivory-50 sm:py-44">
        <Container className="max-w-3xl">
          <Reveal>
            <p className="font-display text-3xl tracking-[0.4em] text-champagne">{brand.monogram}</p>
            <h2 className="mt-8 text-5xl leading-[1.05] sm:text-7xl">{c("home.final.title", { creator: brand.creatorName })}</h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-champagne-200">{c("home.final.body", { creator: brand.creatorName })}</p>
            <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/custom-requests" variant="champagne" size="lg">
                {t("final.cta")}
              </ButtonLink>
              <ButtonLink href="/messages/new" variant="light" size="lg">
                <IconChat size={16} />
                {t("final.secondary", { creator: brand.creatorName })}
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
