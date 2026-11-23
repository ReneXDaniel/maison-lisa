import { asc, count, desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { lookPollOptions, lookPolls, lookVotes } from "@/db/schema";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { PollCreator } from "@/components/admin/poll-creator";
import { LookPreview } from "@/components/studio/look-preview";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { closePollAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/format";

export default async function AdminLooks({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/looks");
  const t = await getTranslations("admin.looks");
  const o = await getTranslations("options");
  const polls = await db.select().from(lookPolls).orderBy(desc(lookPolls.createdAt)).limit(5);
  const data = await Promise.all(polls.map(async (p) => ({ p, options: await db.select().from(lookPollOptions).where(eq(lookPollOptions.pollId, p.id)).orderBy(asc(lookPollOptions.sortOrder)), votes: await db.select({ id: lookVotes.optionId, n: count() }).from(lookVotes).where(eq(lookVotes.pollId, p.id)).groupBy(lookVotes.optionId) })));
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <div className="space-y-8">
        {data.map(({ p, options, votes }) => {
          const total = votes.reduce((a, b) => a + Number(b.n), 0);
          return (
            <Panel key={p.id} title={t("poll", { date: formatDate(p.createdAt, locale) })} actions={<span className="flex items-center gap-2"><Badge tone={p.active ? "success" : "neutral"}>{p.active ? t("open") : t("closed")}</Badge>{p.active && <ActionButton action={closePollAction.bind(null, p.id)} label={t("close")} />}</span>}>
              <p className="mb-4 text-sm text-taupe-700">{t("total", { n: total })}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {options.map((opt, i) => {
                  const n = Number(votes.find((v) => v.id === opt.id)?.n ?? 0);
                  const pct = total ? Math.round((n / total) * 100) : 0;
                  return (
                    <div key={opt.id} className="border border-champagne/40">
                      <LookPreview id={`a${p.id.slice(0, 4)}${i}`} look={{ stockings: opt.stockings as never, footwear: opt.footwear as never, accessories: opt.accessory as never, background: opt.background as never }} className="aspect-[4/5]" />
                      <div className="p-3 text-xs">
                        <p className="text-taupe-700">{[o(`stockings.${opt.stockings}`), o(`footwear.${opt.footwear}`), o(`accessories.${opt.accessory}`), o(`background.${opt.background}`)].join(" · ")}</p>
                        <div className="mt-2 h-1 bg-ivory-200"><div className="h-1 bg-[#A86532]" style={{ width: `${pct}%` }} /></div>
                        <p className="mt-1 font-semibold">{n} · {pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
        <Panel title={t("newPoll")}>
          <PollCreator />
        </Panel>
      </div>
    </AdminPage>
  );
}
