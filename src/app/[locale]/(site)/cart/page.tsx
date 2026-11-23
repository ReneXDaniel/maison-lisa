import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { MediaImage } from "@/components/shop/media-image";
import { DiscountCodeForm, RemoveItemButton } from "@/components/shop/cart-client";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartLines } from "@/lib/cart";
import { priceCart } from "@/lib/discounts";
import { toPricingLines } from "@/lib/checkout";
import { formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { IconLock } from "@/components/ui/icons";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return pageMetadata({ locale, path: "/cart", title: t("title"), noindex: true });
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  const c = await getTranslations("common");
  const user = await getCurrentUser();
  const { cart, lines } = await getCartLines(user, locale);
  const available = lines.filter((l) => !l.unavailable);
  const pricing = await priceCart(db, user?.id ?? null, toPricingLines(available), cart?.discountCode ?? null, locale);
  const canView = !!user && (user.isAdultVerified || user.isAdmin);

  if (!lines.length)
    return (
      <Container className="pb-28">
        <PageHeader title={t("title")} />
        <EmptyState title={t("empty")} body={t("emptyBody")} action={<ButtonLink href="/collections">{t("explore")}</ButtonLink>} />
      </Container>
    );

  return (
    <Container wide className="pb-28">
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <ul className="divide-y divide-champagne/50 border-y border-champagne/50" data-testid="cart-lines">
          {lines.map((l) => (
            <li key={l.itemId} className="flex gap-5 py-6 sm:gap-8" data-testid="cart-line">
              <div className="w-24 shrink-0 sm:w-32">
                {l.kind === "product" ? (
                  <Link href={`/shop/${l.product.slug}`}>
                    <MediaImage media={l.product.cover} alt={l.title} className="aspect-[4/5]" canViewVerified={canView} sizes="128px" />
                  </Link>
                ) : (
                  <div className="dark-surface flex aspect-[4/5] items-center justify-center bg-espresso p-3 text-center">
                    <span className="eyebrow text-champagne">{t("personalOffer")}</span>
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="eyebrow text-taupe-700">{l.kind === "product" ? (l.product.collection?.title ?? "") : t("personalOffer")}</p>
                    <p className="font-display mt-1 text-2xl leading-tight text-espresso">{l.title}</p>
                    {l.kind === "product" && <p className="mt-1 text-xs text-taupe-700">{c("photos", { count: l.product.imageCount })} · {t("digital")}</p>}
                    {l.kind === "offer" && l.description && <p className="mt-1 line-clamp-2 text-xs text-taupe-700">{l.description}</p>}
                  </div>
                  <p className="font-display text-2xl text-espresso">{formatMoney(l.priceCents, locale)}</p>
                </div>
                {l.unavailable && <Notice tone="warning">{l.owned ? t("alreadyOwned") : t("unavailable")}</Notice>}
                <div>
                  <RemoveItemButton itemId={l.itemId} label={c("remove")} />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-6 border border-champagne/60 bg-ivory-50 p-7 shadow-card lg:sticky lg:top-28" data-testid="cart-summary">
          <h2 className="font-display text-3xl text-espresso">{t("summary")}</h2>
          <DiscountCodeForm applied={pricing.codeApplied} error={pricing.codeError} />
          {pricing.welcomeHintPercent && (
            <Notice title={t("welcomeHintTitle", { percent: pricing.welcomeHintPercent })}>{t("welcomeHintBody")}</Notice>
          )}
          <dl className="space-y-3 border-t border-champagne/50 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-taupe-700">{t("subtotal")}</dt>
              <dd data-testid="subtotal">{formatMoney(pricing.subtotalCents, locale)}</dd>
            </div>
            {pricing.applied.map((a) => (
              <div key={a.id} className="flex justify-between text-success" data-testid="discount-line">
                <dt>{a.isWelcome ? t("welcomeDiscount") : t("codeDiscount", { code: a.code ?? "" })}</dt>
                <dd>−{formatMoney(a.amountCents, locale)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-champagne/50 pt-4">
              <dt className="eyebrow text-espresso">{t("total")}</dt>
              <dd className="font-display text-3xl text-espresso" data-testid="total">{formatMoney(pricing.totalCents, locale)}</dd>
            </div>
            <p className="text-right text-[11px] text-taupe-700">{t("vatNote")}</p>
          </dl>
          <ButtonLink href="/checkout" size="lg" className="w-full" aria-disabled={!available.length} data-testid="to-checkout">
            <IconLock size={15} />
            {t("checkout")}
          </ButtonLink>
          {!user && <p className="text-center text-xs leading-relaxed text-taupe-700">{t("guestNote")}</p>}
          {user && !user.isAdultVerified && !user.isAdmin && <p className="text-center text-xs leading-relaxed text-taupe-700">{t("verifyNote")}</p>}
          <Link href="/shop" className="eyebrow block text-center text-taupe-700 link-underline">
            {c("continueShopping")}
          </Link>
        </aside>
      </div>
    </Container>
  );
}
