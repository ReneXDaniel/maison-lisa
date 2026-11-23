import { getLocale, getTranslations } from "next-intl/server";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";
import type { ProductCard as P } from "@/lib/catalog";
import { MediaImage } from "./media-image";
import { AddToCartButton } from "./add-to-cart";

export async function ProductCard({ product, inCart, owned, canViewVerified, aspect = "aspect-[4/5]", className }: { product: P; inCart?: boolean; owned?: boolean; canViewVerified: boolean; aspect?: string; className?: string }) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const s = await getTranslations("shop");
  return (
    <article className={clsx("group flex flex-col", className)} data-testid="product-card" data-slug={product.slug}>
      <Link href={`/shop/${product.slug}`} className="relative block overflow-hidden" aria-label={product.title}>
        <MediaImage
          media={product.cover}
          alt={product.title}
          className={clsx(aspect, "transition-transform duration-[1400ms] ease-[var(--ease-luxe)] group-hover:scale-[1.03]")}
          canViewVerified={canViewVerified}
          lockedLabel={s("lockedPreview")}
          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-espresso/25 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          {product.collection && <Badge tone="champagne">{product.collection.title}</Badge>}
          {product.verifiedPreviewOnly && <Badge tone="dark">{s("privateEdit")}</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl leading-tight text-espresso">
            <Link href={`/shop/${product.slug}`} className="link-underline">
              {product.title}
            </Link>
          </h3>
          <p className="font-display shrink-0 text-2xl text-espresso">{formatMoney(product.priceCents, locale, product.currency)}</p>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-taupe-700">{product.description}</p>
        <p className="eyebrow mt-3 text-taupe-700">{t("photos", { count: product.imageCount })}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <AddToCartButton productId={product.id} title={product.title} inCart={inCart} owned={owned} size="sm" />
          <Link href={`/shop/${product.slug}`} className="eyebrow flex h-9 items-center px-3 text-espresso link-underline">
            {t("viewDetails")}
          </Link>
        </div>
      </div>
    </article>
  );
}
