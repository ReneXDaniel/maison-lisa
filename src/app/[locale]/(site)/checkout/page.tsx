import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { Container, DevLabel, PageHeader } from "@/components/ui/misc";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { requirePage } from "@/lib/auth/guards";
import { getCartLines } from "@/lib/cart";
import { priceCart } from "@/lib/discounts";
import { toPricingLines } from "@/lib/checkout";
import { paymentProvider } from "@/lib/payments";
import { CHECKOUT_COUNTRIES, DEFAULT_COUNTRY_BY_LOCALE, VAT_RATES_BP } from "@/lib/tax";
import { formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return pageMetadata({ locale, path: "/checkout", title: t("title"), noindex: true });
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Authentication, email confirmation and age verification are all required here.
  const user = await requirePage(locale, "adult", "/checkout");
  const t = await getTranslations("checkout");
  const { cart, lines } = await getCartLines(user, locale);
  const available = lines.filter((l) => !l.unavailable);
  if (!available.length) redirect(`/${locale}/cart`);
  const pricing = await priceCart(db, user.id, toPricingLines(available), cart?.discountCode ?? null, locale);
  const provider = paymentProvider();

  return (
    <Container className="max-w-5xl pb-28">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <h2 className="font-display mb-5 text-3xl text-espresso">{t("review")}</h2>
          <ul className="divide-y divide-champagne/50 border-y border-champagne/50">
            {pricing.lines.map((l) => {
              const src = available.find((a) => a.itemId === l.key)!;
              return (
                <li key={l.key} className="flex items-baseline justify-between gap-6 py-4" data-testid="checkout-line">
                  <span className="min-w-0">
                    <span className="font-display block text-xl text-espresso">{src.title}</span>
                    <span className="text-xs text-taupe-700">{src.kind === "offer" ? t("personalOffer") : t("digitalCollection")}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    {l.discountCents > 0 && <span className="block text-xs text-taupe-700 line-through">{formatMoney(l.priceCents, locale)}</span>}
                    <span>{formatMoney(l.totalCents, locale)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {lines.length !== available.length && <p className="mt-4 text-xs text-danger">{t("someUnavailable")}</p>}
          <div className="mt-10 border border-champagne/60 bg-ivory-50 p-6">
            <p className="eyebrow text-taupe-700">{t("paymentMethod")}</p>
            <p className="font-display mt-2 text-2xl text-espresso">{provider.displayName}</p>
            <p className="mt-2 text-xs leading-relaxed text-taupe-700">{t("paymentNote")}</p>
            {provider.id === "dev" && <div className="mt-3"><DevLabel>{t("devPayment")}</DevLabel></div>}
          </div>
        </section>
        <CheckoutForm
          subtotalCents={pricing.subtotalCents}
          totalCents={pricing.totalCents}
          discounts={pricing.applied.map((a) => ({ label: a.isWelcome ? "welcome" : (a.code ?? ""), amountCents: a.amountCents }))}
          codeConflict={pricing.codeError?.code === "discount_conflict_welcome"}
          countries={CHECKOUT_COUNTRIES}
          vatRates={VAT_RATES_BP}
          defaultCountry={DEFAULT_COUNTRY_BY_LOCALE[locale] ?? "DE"}
        />
      </div>
    </Container>
  );
}
