import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, PageHeader } from "@/components/ui/misc";
import { StyleQuiz } from "@/components/studio/style-quiz";
import { listCollections } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studio.quiz" });
  return pageMetadata({ locale, path: "/quiz", title: t("metaTitle"), description: t("body") });
}

export default async function QuizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("studio.quiz");
  const collections = await listCollections(locale);
  return (
    <Container className="pb-28">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("body")} />
      <StyleQuiz collections={collections.map((c) => ({ slug: c.slug, title: c.title, description: c.description, image: c.cover ? `/api/media/${c.cover.id}?w=960` : null }))} />
    </Container>
  );
}
