import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { devSimulatorsEnabled } from "@/lib/env";
import { verifyToken } from "@/lib/crypto";
import { simulatePaymentAction } from "@/app/actions/dev";
import { Button } from "@/components/ui/button";
import { Container, DevLabel, Notice } from "@/components/ui/misc";
import { formatMoney } from "@/lib/format";

export const metadata = { robots: { index: false } };

export default async function DevPaymentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  if (!devSimulatorsEnabled()) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dev");
  const token = (await searchParams).token ?? "";
  const data = verifyToken<{ n: string; a: number; c: string }>(token);
  const l = await getLocale();
  return (
    <Container className="max-w-2xl pb-24 pt-36">
      <DevLabel>{t("simulatorPayment")}</DevLabel>
      <h1 className="mt-6 text-5xl text-espresso">{t("paymentTitle")}</h1>
      <p className="mt-4 text-sm leading-relaxed text-taupe-700">{t("paymentIntro")}</p>
      {!data ? (
        <Notice tone="error" className="mt-8">{t("sessionInvalid")}</Notice>
      ) : (
        <>
          <div className="mt-8 border border-champagne/60 bg-ivory-50 p-6">
            <p className="eyebrow text-taupe-700">{data.n}</p>
            <p className="font-display mt-2 text-4xl text-espresso">{formatMoney(data.a, l, data.c)}</p>
          </div>
          <form action={simulatePaymentAction} className="mt-8 grid gap-3">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" name="outcome" value="success" data-testid="pay-success">{t("paySuccess")}</Button>
            <Button type="submit" name="outcome" value="fail" variant="secondary" data-testid="pay-fail">{t("payFail")}</Button>
            <Button type="submit" name="outcome" value="cancel" variant="ghost">{t("payCancel")}</Button>
          </form>
        </>
      )}
    </Container>
  );
}
