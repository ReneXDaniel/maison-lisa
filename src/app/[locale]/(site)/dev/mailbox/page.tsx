import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { mailOutbox } from "@/db/schema";
import { devSimulatorsEnabled } from "@/lib/env";
import { Container, DevLabel, EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";

export const metadata = { robots: { index: false } };

export default async function DevMailboxPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!devSimulatorsEnabled()) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dev");
  const mails = await db.select().from(mailOutbox).orderBy(desc(mailOutbox.createdAt)).limit(40);
  const l = await getLocale();
  return (
    <Container className="pb-24 pt-36">
      <DevLabel>{t("banner")}</DevLabel>
      <h1 className="mt-6 text-5xl text-espresso">{t("mailboxTitle")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-taupe-700">{t("mailboxIntro")}</p>
      <div className="mt-10 space-y-6">
        {mails.length === 0 && <EmptyState title={t("mailboxEmpty")} />}
        {mails.map((m) => (
          <details key={m.id} className="border border-champagne/60 bg-ivory-50" data-testid="dev-mail" data-to={m.to} data-template={m.template}>
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4">
              <span className="font-semibold text-espresso">{m.subject}</span>
              <span className="text-xs text-taupe-700">{t("to")}: {m.to} · {formatDateTime(m.createdAt, l)}</span>
            </summary>
            <div className="border-t border-champagne/40 p-5">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-charcoal" data-testid="dev-mail-text">{m.text}</pre>
            </div>
          </details>
        ))}
      </div>
    </Container>
  );
}
