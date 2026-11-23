"use client";
import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { IconLock } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import { includedVat } from "@/lib/pricing";
import { localeTags, type Locale } from "@/i18n/routing";
import { checkoutAction, type CheckoutState } from "@/app/actions/cart";

/**
 * Final review. The VAT line updates with the selected country; every amount
 * is recomputed on the server when the order is created.
 */
export function CheckoutForm(props: {
  subtotalCents: number;
  totalCents: number;
  discounts: { label: string; amountCents: number }[];
  codeConflict: boolean;
  countries: string[];
  vatRates: Record<string, number>;
  defaultCountry: string;
}) {
  const t = useTranslations("checkout");
  const e = useTranslations("errors");
  const locale = useLocale();
  const [country, setCountry] = useState(props.defaultCountry);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, null);
  const names = useMemo(() => new Intl.DisplayNames([localeTags[locale as Locale] ?? locale], { type: "region" }), [locale]);
  const rate = props.vatRates[country] ?? 0;
  const sorted = useMemo(() => [...props.countries].sort((a, b) => (names.of(a) ?? a).localeCompare(names.of(b) ?? b)), [props.countries, names]);

  return (
    <form action={action} className="h-fit space-y-6 border border-champagne/60 bg-ivory-50 p-7 shadow-card lg:sticky lg:top-28" data-testid="checkout-form">
      {state?.error && <Notice tone="error">{e.has(state.error) ? e(state.error, state.values ?? {}) : e("server")}</Notice>}
      <Select label={t("country")} name="country" value={country} onChange={(ev) => setCountry(ev.target.value)} required>
        {sorted.map((c) => (
          <option key={c} value={c}>
            {names.of(c)}
          </option>
        ))}
      </Select>
      <dl className="space-y-3 border-t border-champagne/50 pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-taupe-700">{t("subtotal")}</dt>
          <dd>{formatMoney(props.subtotalCents, locale)}</dd>
        </div>
        {props.discounts.map((d) => (
          <div key={d.label} className="flex justify-between text-success" data-testid="discount-line" data-kind={d.label === "welcome" ? "welcome" : "code"}>
            <dt>{d.label === "welcome" ? t("welcomeDiscount") : t("codeDiscount", { code: d.label })}</dt>
            <dd>−{formatMoney(d.amountCents, locale)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-champagne/50 pt-4">
          <dt className="eyebrow text-espresso">{t("total")}</dt>
          <dd className="font-display text-3xl text-espresso" data-testid="checkout-total">
            {formatMoney(props.totalCents, locale)}
          </dd>
        </div>
        <div className="flex justify-between text-xs text-taupe-700">
          <dt>{rate ? t("vatIncluded", { rate: (rate / 100).toLocaleString(localeTags[locale as Locale]) }) : t("vatNone")}</dt>
          <dd>{rate ? formatMoney(includedVat(props.totalCents, rate), locale) : "—"}</dd>
        </div>
      </dl>
      {props.codeConflict && <Notice tone="warning">{e("discount_conflict_welcome")}</Notice>}
      <div className="space-y-4 border-t border-champagne/50 pt-5">
        <Checkbox
          name="terms"
          required
          data-testid="accept-terms"
          label={t.rich("terms", {
            terms: (c) => (
              <Link href="/legal/terms" target="_blank" className="underline">
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link href="/legal/privacy" target="_blank" className="underline">
                {c}
              </Link>
            ),
          })}
        />
        <Checkbox name="waiver" required data-testid="accept-waiver" label={t("waiver")} />
      </div>
      <Button type="submit" size="lg" loading={pending} className="h-auto! min-h-14 w-full whitespace-normal! py-4 text-center leading-relaxed" data-testid="place-order">
        <IconLock size={15} />
        {t("placeOrder")}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-taupe-700">{t("placeOrderNote")}</p>
    </form>
  );
}
