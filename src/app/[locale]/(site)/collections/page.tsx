import { getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Container, PageHeader } from "@/components/ui/misc";
import { MediaImage } from "@/components/shop/media-image";
import { Reveal } from "@/components/motion/reveal";
import { listCollections, listProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "collections" });
  return pageMetadata({ locale, path: "/collections", title: t("title"), description: t("intro") });
}

/** Editorial index — asymmetric layout alternating image and text weight. */
export default async function CollectionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("collections");
  const [collections, products] = await Promise.all([listCollections(locale), listProducts(locale)]);
  return (
    <div className="pb-24">
      <Container>
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      </Container>
      <div className="space-y-28 sm:space-y-40">
        {collections.map((c, i) => {
          const count = products.filter((p) => p.collection?.id === c.id).length;
          const flip = i % 2 === 1;
          return (
            <section key={c.id} className={clsx(i % 3 === 2 && "dark-surface bg-espresso py-24 text-ivory-50")} data-testid="collection-block">
              <Container wide className={clsx("grid items-center gap-10 lg:grid-cols-12 lg:gap-16")}>
                <Reveal className={clsx("lg:col-span-7", flip && "lg:order-2")}>
                  <Link href={`/collections/${c.slug}`} className="group block overflow-hidden">
                    <MediaImage media={c.cover} alt={c.title} className="aspect-[5/4] transition-transform duration-[1600ms] ease-[var(--ease-luxe)] group-hover:scale-[1.03]" sizes="(min-width:1024px) 58vw, 100vw" />
                  </Link>
                </Reveal>
                <Reveal delay={0.15} className={clsx("lg:col-span-5", flip ? "lg:order-1 lg:pr-8" : "lg:pl-4")}>
                  <p className={clsx("eyebrow", i % 3 === 2 ? "text-champagne" : "text-taupe-700")}>
                    {String(i + 1).padStart(2, "0")} · {t("count", { count })}
                  </p>
                  <h2 className={clsx("mt-5 text-5xl leading-[1.02] sm:text-6xl", i % 3 === 2 ? "text-ivory-50" : "text-espresso")}>{c.title}</h2>
                  <p className={clsx("mt-6 max-w-md text-[15px] leading-relaxed", i % 3 === 2 ? "text-champagne-200" : "text-taupe-700")}>{c.description}</p>
                  <Link href={`/collections/${c.slug}`} className={clsx("eyebrow mt-8 inline-block link-underline", i % 3 === 2 ? "text-champagne" : "text-espresso")}>
                    {t("discover")}
                  </Link>
                </Reveal>
              </Container>
            </section>
          );
        })}
      </div>
    </div>
  );
}
