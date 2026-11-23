import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { auditLogs, conversations, customRequests, orders, profiles, users, verificationRecords } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Panel, Table, Td } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { BlockToggle } from "@/components/admin/conversation-controls";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { effectiveAgeStatus } from "@/lib/auth/session";
import { revokeVerificationAction } from "@/app/actions/admin";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export default async function CustomerDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", `/admin/customers/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [row] = await db.select({ u: users, p: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, id));
  if (!row) notFound();
  const t = await getTranslations("admin.customers");
  const a = await getTranslations("admin.messages.age");
  const rs = await getTranslations("requests.status");
  const os = await getTranslations("account.orderStatus");
  const [records, ords, reqs, convs, log] = await Promise.all([
    db.select().from(verificationRecords).where(eq(verificationRecords.userId, id)).orderBy(desc(verificationRecords.createdAt)),
    db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt)),
    db.select().from(customRequests).where(eq(customRequests.customerId, id)).orderBy(desc(customRequests.createdAt)),
    db.select().from(conversations).where(eq(conversations.customerId, id)).orderBy(desc(conversations.lastMessageAt)),
    db.select().from(auditLogs).where(eq(auditLogs.targetId, id)).orderBy(desc(auditLogs.createdAt)).limit(15),
  ]);
  const age = effectiveAgeStatus(row.u.ageStatus, row.u.ageVerifiedUntil);
  return (
    <AdminPage eyebrow={t("eyebrow")} title={row.p?.displayName ?? row.u.email} actions={<><BlockToggle userId={row.u.id} blocked={!!row.u.blockedAt} />{age === "verified" && <ActionButton action={revokeVerificationAction.bind(null, row.u.id)} label={t("revoke")} confirm={t("revokeConfirm")} variant="danger" />}</>}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("profile")}>
          <dl className="space-y-2 text-sm">
            <div><dt className="eyebrow text-taupe-700">{t("email")}</dt><dd>{row.u.email}</dd></div>
            <div><dt className="eyebrow text-taupe-700">{t("joined")}</dt><dd>{formatDate(row.u.createdAt, locale)}</dd></div>
            <div><dt className="eyebrow text-taupe-700">{t("language")}</dt><dd>{row.p?.locale?.toUpperCase()}</dd></div>
            <div><dt className="eyebrow text-taupe-700">{t("emailVerified")}</dt><dd>{row.u.emailVerifiedAt ? formatDate(row.u.emailVerifiedAt, locale) : "—"}</dd></div>
            <div><dt className="eyebrow text-taupe-700">MFA</dt><dd>{row.u.mfaEnabled ? "✓" : "—"}</dd></div>
            {row.u.blockedAt && <div><dt className="eyebrow text-danger">{t("blocked")}</dt><dd>{row.u.blockedReason ?? "—"}</dd></div>}
          </dl>
        </Panel>
        <Panel title={t("verification")}>
          <Badge tone={age === "verified" ? "success" : "warning"}>{a(age)}</Badge>
          {row.u.ageVerifiedUntil && <p className="mt-2 text-xs text-taupe-700">{t("validUntil", { date: formatDate(row.u.ageVerifiedUntil, locale) })}</p>}
          <p className="mt-3 text-xs leading-relaxed text-taupe-700">{t("privacyNote")}</p>
          <ul className="mt-4 space-y-2 text-xs">
            {records.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 border-t border-champagne/40 pt-2"><span>{r.provider} · {a(r.status)}</span><span className="text-taupe-700">{formatDateTime(r.createdAt, locale)}</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("conversations")}>
          <ul className="space-y-2 text-sm">
            {convs.map((c) => <li key={c.id}><Link href={`/admin/messages/${c.id}`} className="link-underline">{c.subject ?? formatDate(c.createdAt, locale)}</Link></li>)}
            {!convs.length && <li className="text-taupe-700">—</li>}
          </ul>
        </Panel>
      </div>
      <h2 className="font-display mb-4 mt-10 text-3xl text-espresso">{t("orders")}</h2>
      <Table head={[t("order"), t("date"), t("total"), t("status")]}>
        {ords.map((o) => (
          <tr key={o.id}><Td><Link href={`/admin/orders/${o.id}`} className="link-underline">{o.number}</Link></Td><Td>{formatDate(o.createdAt, locale)}</Td><Td>{formatMoney(o.totalCents, locale)}</Td><Td>{os(o.status)}</Td></tr>
        ))}
      </Table>
      <h2 className="font-display mb-4 mt-10 text-3xl text-espresso">{t("requests")}</h2>
      <Table head={["No.", t("date"), t("status")]}>
        {reqs.map((r) => (
          <tr key={r.id}><Td><Link href={`/admin/requests/${r.id}`} className="link-underline">{r.number}</Link></Td><Td>{formatDate(r.createdAt, locale)}</Td><Td>{rs(r.status)}</Td></tr>
        ))}
      </Table>
      <h2 className="font-display mb-4 mt-10 text-3xl text-espresso">{t("audit")}</h2>
      <ul className="space-y-1 text-xs text-taupe-700">
        {log.map((l) => <li key={l.id}>{formatDateTime(l.createdAt, locale)} · {l.action}</li>)}
      </ul>
    </AdminPage>
  );
}
