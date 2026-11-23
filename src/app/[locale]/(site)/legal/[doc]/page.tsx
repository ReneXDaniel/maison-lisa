import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Notice } from "@/components/ui/misc";
import { legalEntity } from "@/config/legal";
import { pageMetadata } from "@/lib/seo";

const DOCS = ["imprint", "privacy", "terms", "withdrawal", "youth-protection"] as const;
type Doc = (typeof DOCS)[number];
type Section = { h: string; p: string[] };

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  if (!DOCS.includes(doc as Doc)) return {};
  const t = await getTranslations({ locale, namespace: "legal" });
  return pageMetadata({ locale, path: `/legal/${doc}`, title: t(`docs.${doc}.title`) });
}

const fill = (s: string) =>
  s
    .replaceAll("{name}", legalEntity.name)
    .replaceAll("{representative}", legalEntity.representative)
    .replaceAll("{address}", legalEntity.address)
    .replaceAll("{email}", legalEntity.email)
    .replaceAll("{vatId}", legalEntity.vatId)
    .replaceAll("{register}", legalEntity.register)
    .replaceAll("{youthOfficer}", legalEntity.youthProtectionOfficer);

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  if (!DOCS.includes(doc as Doc)) notFound();
  const t = await getTranslations("legal");
  const sections = t.raw(`docs.${doc}.sections`) as Section[];
  return (
    <Container className="max-w-3xl pb-28 pt-36">
      <h1 className="text-5xl text-espresso sm:text-6xl">{t(`docs.${doc}.title`)}</h1>
      <Notice tone="warning" className="mt-8">{t("reviewNotice")}</Notice>
      {!["de", "en"].includes(locale) && <Notice className="mt-3">{t("translationNotice")}</Notice>}
      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-3xl text-espresso">{fill(s.h)}</h2>
            <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-charcoal">
              {s.p.filter((x) => fill(x).trim()).map((x, i) => <p key={i}>{fill(x)}</p>)}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
