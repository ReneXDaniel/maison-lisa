import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, EmptyState } from "@/components/ui/misc";
import { ProductCard } from "@/components/shop/product-card";
import { MediaImage } from "@/components/shop/media-image";
import { listCollections, listProducts } from "@/lib/catalog";
import { visitorState } from "@/lib/visitor";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const c = (await listCollections(locale)).find((x) => x.slug === slug);
  return c ? pageMetadata({ locale, path: `/collections/${slug}`, title: c.title, description: c.description }) : {};
}

export default async function CollectionPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const collection = (await listCollections(locale)).find((x) => x.slug === slug);
  if (!collection) notFound();
  const t = await getTranslations("collections");
  const [products, visitor] = await Promise.all([listProducts(locale, { collectionId: collection.id }), visitorState(locale)]);
  return (
    <div className="pb-28">
      <section className="dark-surface relative flex min-h-[72vh] items-end overflow-hidden bg-espresso text-ivory-50">
        <MediaImage media={collection.cover} alt={collection.title} className="absolute inset-0 h-full w-full opacity-70" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/40 to-transparent" />
        <Container wide className="relative pb-16 pt-40">
          <p className="eyebrow text-champagne">{t("eyebrow")}</p>
          <h1 className="mt-4 max-w-3xl text-6xl leading-[0.98] sm:text-7xl md:text-8xl">{collection.title}</h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-champagne-200">{collection.description}</p>
        </Container>
      </section>
      <Container wide className="pt-20">
        {products.length === 0 ? (
          <EmptyState title={t("emptyCollection")} />
        ) : (
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} inCart={visitor.inCart.has(p.id)} owned={visitor.owned.has(p.id)} canViewVerified={visitor.canViewVerified} aspect={i % 4 === 0 ? "aspect-[4/5]" : i % 4 === 3 ? "aspect-square" : "aspect-[3/4]"} className={i % 3 === 1 ? "xl:mt-20" : undefined} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
