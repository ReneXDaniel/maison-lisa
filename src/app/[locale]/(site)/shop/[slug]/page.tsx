import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, Container, Notice } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { AddToCartButton } from "@/components/shop/add-to-cart";
import { LightboxGallery } from "@/components/shop/lightbox-gallery";
import { ProductCard } from "@/components/shop/product-card";
import { IconChat, IconShield } from "@/components/ui/icons";
import { getProductBySlug, listProducts } from "@/lib/catalog";
import { visitorState } from "@/lib/visitor";
import { formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/config/brand";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug, locale);
  if (!p) return {};
  return pageMetadata({ locale, path: `/shop/${slug}`, title: p.title, description: p.description.slice(0, 160) });
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug, locale);
  if (!product) notFound();
  const t = await getTranslations("shop");
  const c = await getTranslations("common");
  const visitor = await visitorState(locale);
  const visible = product.previews.filter((m) => m.visibility === "public" || visitor.canViewVerified);
  const locked = product.previews.length - visible.length;
  const related = product.collection ? (await listProducts(locale, { collectionId: product.collection.id })).filter((p) => p.id !== product.id).slice(0, 3) : [];

  return (
    <div className="pb-28 pt-28 sm:pt-32">
      <Container wide>
        <nav aria-label={t("breadcrumb")} className="mb-8 text-xs text-taupe-700">
          <Link href="/shop" className="link-underline">{t("title")}</Link>
          {product.collection && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/collections/${product.collection.slug}`} className="link-underline">{product.collection.title}</Link>
            </>
          )}
        </nav>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
          <div>
            {visible.length ? (
              <LightboxGallery items={visible} title={product.title} lockedCount={locked} lockedLabel={t("lockedPreview")} />
            ) : (
              <Notice>{t("noPreviews")}</Notice>
            )}
            {locked > 0 && !visitor.canViewVerified && (
              <Notice className="mt-6" title={t("lockedTitle")}>
                {t("lockedBody")}{" "}
                <Link href={{ pathname: visitor.user ? "/verify" : "/auth/register", query: { next: `/shop/${slug}` } }} className="font-semibold underline">
                  {visitor.user ? t("verifyNow") : t("createAccount")}
                </Link>
              </Notice>
            )}
          </div>
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="flex flex-wrap gap-2">
              {product.collection && <Badge tone="champagne">{product.collection.title}</Badge>}
              {product.verifiedPreviewOnly && <Badge tone="dark">{t("privateEdit")}</Badge>}
            </div>
            <h1 className="mt-5 text-5xl leading-[1.02] text-espresso sm:text-6xl">{product.title}</h1>
            <p className="font-display mt-6 text-4xl text-espresso">{formatMoney(product.priceCents, locale, product.currency)}</p>
            <p className="mt-1 text-xs text-taupe-700">{t("vatIncluded")}</p>
            <p className="mt-8 whitespace-pre-line text-[15px] leading-relaxed text-charcoal">{product.description}</p>
            <dl className="mt-8 grid grid-cols-2 gap-px border border-champagne/60 bg-champagne/60 text-sm">
              {[
                [t("included"), c("photos", { count: product.imageCount })],
                [t("format"), product.format],
                [t("delivery"), t("deliveryValue")],
                [t("license"), t("licenseValue")],
              ].map(([k, v]) => (
                <div key={k} className="bg-ivory-50 p-4">
                  <dt className="eyebrow text-taupe-700">{k}</dt>
                  <dd className="mt-1.5 text-charcoal">{v}</dd>
                </div>
              ))}
            </dl>
            {product.details && <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-taupe-700">{product.details}</p>}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <AddToCartButton productId={product.id} title={product.title} inCart={visitor.inCart.has(product.id)} owned={visitor.owned.has(product.id)} size="lg" className="sm:flex-1" />
              <ButtonLink href="/messages/new" variant="secondary" size="lg">
                <IconChat size={16} />
                {t("askLisa", { creator: brand.creatorName })}
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-start gap-3 text-xs leading-relaxed text-taupe-700">
              <IconShield size={18} className="shrink-0 text-espresso" />
              {t("secureNote")}
            </p>
          </div>
        </div>
        {related.length > 0 && (
          <section className="mt-32">
            <h2 className="mb-12 text-center text-4xl text-espresso sm:text-5xl">{t("related")}</h2>
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} inCart={visitor.inCart.has(p.id)} owned={visitor.owned.has(p.id)} canViewVerified={visitor.canViewVerified} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
