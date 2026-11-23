import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { devSimulatorsEnabled } from "@/lib/env";
import { verifyToken } from "@/lib/crypto";
import { simulateVerificationAction } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Container, DevLabel, Notice } from "@/components/ui/misc";

export const metadata = { robots: { index: false } };

export default async function DevVerificationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  if (!devSimulatorsEnabled()) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dev");
  const token = (await searchParams).token ?? "";
  const valid = verifyToken(token);
  const year = new Date().getFullYear() - 29;
  return (
    <Container className="max-w-2xl pb-24 pt-36">
      <DevLabel>{t("simulator", { kind: "identity verification" })}</DevLabel>
      <h1 className="mt-6 text-5xl text-espresso">{t("verificationTitle")}</h1>
      <p className="mt-4 text-sm leading-relaxed text-taupe-700">{t("verificationIntro")}</p>
      {!valid ? (
        <Notice tone="error" className="mt-8">{t("sessionInvalid")}</Notice>
      ) : (
        <form action={simulateVerificationAction} className="mt-10 grid gap-3">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" name="outcome" value="adult" data-testid="sim-adult">{t("approveAdult", { year })}</Button>
          <Button type="submit" name="outcome" value="minor" variant="secondary" data-testid="sim-minor">{t("approveMinor")}</Button>
          <Button type="submit" name="outcome" value="declined" variant="secondary">{t("decline")}</Button>
          <Button type="submit" name="outcome" value="review" variant="secondary">{t("review")}</Button>
        </form>
      )}
    </Container>
  );
}
