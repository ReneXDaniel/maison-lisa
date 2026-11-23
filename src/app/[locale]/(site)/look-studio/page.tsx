import { and, asc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { lookPollOptions, lookPolls, lookVotes } from "@/db/schema";
import { Container, PageHeader } from "@/components/ui/misc";
import { LookStudio, LookVoting } from "@/components/studio/look-studio";
import { getCurrentUser } from "@/lib/auth/session";
import { pollResults } from "@/app/actions/looks";
import { pageMetadata } from "@/lib/seo";
import { brand } from "@/config/brand";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studio.look" });
  return pageMetadata({ locale, path: "/look-studio", title: t("metaTitle"), description: t("body") });
}

export default async function LookStudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("studio");
  const user = await getCurrentUser();
  const [poll] = await db.select().from(lookPolls).where(eq(lookPolls.active, true)).limit(1);
  const options = poll ? await db.select().from(lookPollOptions).where(eq(lookPollOptions.pollId, poll.id)).orderBy(asc(lookPollOptions.sortOrder)) : [];
  const [myVote] = poll && user ? await db.select().from(lookVotes).where(and(eq(lookVotes.pollId, poll.id), eq(lookVotes.userId, user.id))) : [];
  return (
    <div className="pb-28">
      <Container wide>
        <PageHeader eyebrow={t("look.eyebrow")} title={t("look.title")} intro={t("look.body")} />
        <LookStudio />
      </Container>
      {poll && options.length > 0 && (
        <section className="paper-grain mt-28 bg-ivory py-24">
          <Container wide>
            <div className="mb-12 text-center">
              <p className="eyebrow text-taupe-700">{t("vote.eyebrow")}</p>
              <h2 className="mt-4 text-5xl text-espresso sm:text-6xl">{t("vote.title", { creator: brand.creatorName })}</h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] text-taupe-700">{t("vote.body", { creator: brand.creatorName })}</p>
            </div>
            <LookVoting pollId={poll.id} options={options} initialMine={myVote?.optionId ?? null} initialResults={myVote ? await pollResults(poll.id) : null} />
          </Container>
        </section>
      )}
    </div>
  );
}
