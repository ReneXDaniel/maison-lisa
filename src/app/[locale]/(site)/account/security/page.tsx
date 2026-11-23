import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Badge, Card } from "@/components/ui/misc";
import { MfaPanel, SessionsPanel, DeleteAccountPanel } from "@/components/account/account-forms";
import { requirePage } from "@/lib/auth/guards";
import { latestVerification } from "@/lib/verification/service";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "user", "/account/security");
  const t = await getTranslations("account.security");
  const v = await getTranslations("verify.status");
  const [[u], record, active] = await Promise.all([
    db.select().from(users).where(eq(users.id, user.id)),
    latestVerification(user.id),
    db.select().from(sessions).where(eq(sessions.userId, user.id)).orderBy(desc(sessions.lastSeenAt)),
  ]);
  return (
    <div className="max-w-2xl space-y-12">
      <Card className="p-7" >
        <p className="eyebrow text-taupe-700">{t("verificationTitle")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="font-display text-3xl text-espresso">{v(`${user.ageStatus}.title`)}</p>
          {user.isAdultVerified && <Badge tone="success">18+</Badge>}
        </div>
        <p className="mt-2 text-sm text-taupe-700">{v(`${user.ageStatus}.body`)}</p>
        {user.isAdultVerified && u?.ageVerifiedUntil && <p className="mt-3 text-xs text-taupe-700">{t("validUntil", { date: formatDate(u.ageVerifiedUntil, locale) })}</p>}
        {record && <p className="mt-1 text-xs text-taupe-700">{t("provider", { provider: record.provider, date: formatDate(record.createdAt, locale) })}</p>}
        <p className="mt-4 text-xs leading-relaxed text-taupe-700">{t("verificationPrivacy")}</p>
        {!user.isAdultVerified && !user.isAdmin && <Link href="/verify" className="eyebrow mt-4 inline-block text-espresso link-underline">{t("verifyNow")}</Link>}
      </Card>
      <section>
        <h2 className="font-display mb-4 text-3xl text-espresso">{t("mfaTitle")}</h2>
        <MfaPanel enabled={!!u?.mfaEnabled} />
      </section>
      <section className="border-t border-champagne/50 pt-10">
        <h2 className="font-display mb-4 text-3xl text-espresso">{t("sessionsTitle")}</h2>
        <SessionsPanel sessions={active.map((s) => ({ id: s.id.slice(0, 8), current: s.id === user.sessionId, agent: s.userAgent ?? "", created: formatDateTime(s.createdAt, locale) }))} />
      </section>
      <section className="border-t border-champagne/50 pt-10">
        <h2 className="font-display mb-4 text-3xl text-espresso">{t("deleteTitle")}</h2>
        <DeleteAccountPanel />
      </section>
    </div>
  );
}
