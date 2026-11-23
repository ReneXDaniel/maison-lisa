import { getTranslations, setRequestLocale } from "next-intl/server";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Container, EmptyState, PageHeader } from "@/components/ui/misc";
import { ProductCard } from "@/components/shop/product-card";
import { listCollections, listProducts } from "@/lib/catalog";
import { visitorState } from "@/lib/visitor";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ collection?: string; sort?: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });
  return pageMetadata({ locale, path: "/shop", title: t("title"), description: t("intro") });
}

const SORTS = ["featured", "newest", "price_asc", "price_desc"] as const;

export default async function ShopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("shop");
  const [collections, visitor] = await Promise.all([listCollections(locale), visitorState(locale)]);
  const active = collections.find((c) => c.slug === sp.collection);
  const sort = SORTS.includes(sp.sort as (typeof SORTS)[number]) ? (sp.sort as (typeof SORTS)[number]) : "featured";
  let products = await listProducts(locale, { collectionId: active?.id });
  products = [...products].sort((a, b) =>
    sort === "price_asc" ? a.priceCents - b.priceCents : sort === "price_desc" ? b.priceCents - a.priceCents : sort === "featured" ? Number(b.featured) - Number(a.featured) : 0,
  );
  const q = (o: Record<string, string | undefined>) => ({ pathname: "/shop" as const, query: Object.fromEntries(Object.entries({ collection: active?.slug, sort: sort === "featured" ? undefined : sort, ...o }).filter(([, v]) => v)) });

  return (
    <Container wide className="pb-28">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="sticky top-16 z-20 -mx-5 mb-12 flex flex-col gap-4 border-y border-champagne/50 bg-ivory-100/92 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t("filterLabel")} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
          <Link href={q({ collection: undefined })} aria-current={!active ? "page" : undefined} className={clsx("whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition", !active ? "bg-espresso text-ivory-50" : "text-charcoal hover:bg-ivory-200")}>
            {t("all")}
          </Link>
          {collections.map((c) => (
            <Link key={c.id} href={q({ collection: c.slug })} aria-current={active?.id === c.id ? "page" : undefined} className={clsx("whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition", active?.id === c.id ? "bg-espresso text-ivory-50" : "text-charcoal hover:bg-ivory-200")}>
              {c.title}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-taupe-700">
          <span className="eyebrow">{t("sortLabel")}</span>
          {SORTS.map((s) => (
            <Link key={s} href={q({ sort: s === "featured" ? undefined : s })} aria-current={sort === s ? "true" : undefined} className={clsx("whitespace-nowrap", sort === s ? "font-semibold text-espresso underline underline-offset-4" : "hover:text-espresso")}>
              {t(`sort.${s}`)}
            </Link>
          ))}
        </div>
      </div>
      {products.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} inCart={visitor.inCart.has(p.id)} owned={visitor.owned.has(p.id)} canViewVerified={visitor.canViewVerified} className={i % 3 === 1 ? "xl:mt-16" : undefined} />
          ))}
        </div>
      )}
    </Container>
  );
}
