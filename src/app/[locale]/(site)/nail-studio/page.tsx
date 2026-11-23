import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/misc";
import { NailStudio } from "@/components/studio/nail-studio";
import { getSettings } from "@/lib/settings";
import { mediaByIds } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studio.nail" });
  return pageMetadata({ locale, path: "/nail-studio", title: t("metaTitle"), description: t("body") });
}

export default async function NailStudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("studio.nail");
  const { siteMedia } = await getSettings();
  const media = await mediaByIds([siteMedia.nailBase, siteMedia.nailMask].filter(Boolean) as string[]);
  const base = siteMedia.nailBase ? media.get(siteMedia.nailBase) : undefined;
  const mask = siteMedia.nailMask ? media.get(siteMedia.nailMask) : undefined;
  const maxW = (m?: { variants: { width: number }[] }) => Math.max(...(m?.variants.map((v) => v.width) ?? [960]));
  return (
    <Container wide className="pb-28">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("body")} />
      <NailStudio
        baseUrl={base ? `/api/media/${base.id}?w=${maxW(base)}` : null}
        maskUrl={mask ? `/api/media/${mask.id}?w=${maxW(mask)}` : null}
        isDemo={!!base?.isDemo}
      />
    </Container>
  );
}
