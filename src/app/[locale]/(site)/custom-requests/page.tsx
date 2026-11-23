import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/misc";
import { RequestBuilder } from "@/components/requests/request-builder";
import { Reveal } from "@/components/motion/reveal";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/config/brand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "requests" });
  return pageMetadata({ locale, path: "/custom-requests", title: t("metaTitle"), description: t("intro") });
}

export default async function CustomRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("requests");
  return (
    <div className="pb-28">
      <Container wide>
        <PageHeader eyebrow={t("eyebrow")} title={t("title", { creator: brand.creatorName })} intro={t("intro")} />
        <Reveal>
          <ol className="mx-auto mb-20 grid max-w-5xl gap-px border border-champagne/60 bg-champagne/60 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("howItWorks")}>
            {(["h1", "h2", "h3", "h4"] as const).map((k, i) => (
              <li key={k} className="bg-ivory-50 p-6">
                <p className="font-display text-4xl text-champagne-400">{i + 1}</p>
                <p className="font-display mt-2 text-2xl text-espresso">{t(`how.${k}.title`)}</p>
                <p className="mt-2 text-sm leading-relaxed text-taupe-700">{t(`how.${k}.body`, { creator: brand.creatorName })}</p>
              </li>
            ))}
          </ol>
        </Reveal>
        <RequestBuilder />
      </Container>
    </div>
  );
}
