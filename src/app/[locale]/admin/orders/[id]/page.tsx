import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { entitlements, orderItems, orders, paymentTransactions, profiles } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Panel, Table, Td } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { Badge, Notice } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { recordRefundAction } from "@/app/actions/admin";
import { formatDateTime, formatMoney } from "@/lib/format";

export default async function AdminOrderDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", `/admin/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [o] = await db.select().from(orders).where(eq(orders.id, id));
  if (!o) notFound();
  const t = await getTranslations("admin.orders");
  const s = await getTranslations("account.orderStatus");
  const [items, txs, ents, [cust]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(paymentTransactions).where(eq(paymentTransactions.orderId, id)).orderBy(desc(paymentTransactions.createdAt)),
    db.select().from(entitlements).where(eq(entitlements.orderId, id)),
    o.userId ? db.select().from(profiles).where(eq(profiles.userId, o.userId)) : Promise.resolve([]),
  ]);
  return (
    <AdminPage
      eyebrow={t("eyebrow")}
      title={o.number}
      actions={o.status === "paid" ? (
        <>
          <ActionButton action={recordRefundAction.bind(null, o.id, "refunded")} label={t("recordRefund")} confirm={t("refundConfirm")} variant="danger" />
          <ActionButton action={recordRefundAction.bind(null, o.id, "chargeback")} label={t("recordChargeback")} confirm={t("refundConfirm")} variant="secondary" />
        </>
      ) : undefined}
    >
      {o.status === "paid" && <Notice className="mb-6">{t("refundNote")}</Notice>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("summary")}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>{t("status")}</dt><dd><Badge tone={o.status === "paid" ? "success" : "neutral"}>{s(o.status)}</Badge></dd></div>
            <div className="flex justify-between"><dt>{t("customer")}</dt><dd>{o.userId ? <Link href={`/admin/customers/${o.userId}`} className="link-underline">{cust?.displayName ?? o.customerEmailSnapshot}</Link> : "—"}</dd></div>
            <div className="flex justify-between"><dt>{t("created")}</dt><dd>{formatDateTime(o.createdAt, locale)}</dd></div>
            {o.paidAt && <div className="flex justify-between"><dt>{t("paid")}</dt><dd>{formatDateTime(o.paidAt, locale)}</dd></div>}
            <div className="flex justify-between"><dt>{t("provider")}</dt><dd>{o.paymentProvider} {o.paymentRef && <span className="text-xs text-taupe-700">({o.paymentRef})</span>}</dd></div>
            <div className="flex justify-between"><dt>{t("country")}</dt><dd>{o.country} · VAT {o.vatRateBp / 100}%</dd></div>
          </dl>
        </Panel>
        <Panel title={t("amounts")} className="lg:col-span-2">
          <ul className="divide-y divide-champagne/40 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-2"><span>{i.title}{i.offerId && <Badge className="ml-2">{t("offer")}</Badge>}</span><span>{i.discountCents > 0 && <span className="mr-2 text-xs text-taupe-700 line-through">{formatMoney(i.unitPriceCents, locale)}</span>}{formatMoney(i.lineTotalCents, locale)}</span></li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd>{formatMoney(o.subtotalCents, locale)}</dd></div>
            {o.discountSummary.map((d) => <div key={d.id} className="flex justify-between text-success"><dt>{d.code ?? d.name}</dt><dd>−{formatMoney(d.amountCents, locale)}</dd></div>)}
            <div className="flex justify-between font-semibold"><dt>{t("total")}</dt><dd>{formatMoney(o.totalCents, locale)}</dd></div>
            <div className="flex justify-between text-xs text-taupe-700"><dt>VAT</dt><dd>{formatMoney(o.vatCents, locale)}</dd></div>
          </dl>
        </Panel>
      </div>
      <h2 className="font-display mb-4 mt-10 text-3xl text-espresso">{t("transactions")}</h2>
      <Table head={[t("date"), t("type"), t("status"), t("amount"), t("reference")]}>
        {txs.map((x) => <tr key={x.id}><Td>{formatDateTime(x.createdAt, locale)}</Td><Td>{x.type}</Td><Td>{x.status}</Td><Td>{formatMoney(x.amountCents, locale)}</Td><Td className="text-xs text-taupe-700">{x.providerRef ?? "—"}</Td></tr>)}
      </Table>
      <h2 className="font-display mb-4 mt-10 text-3xl text-espresso">{t("access")}</h2>
      <ul className="space-y-1 text-sm">
        {ents.map((e) => <li key={e.id}>{e.revokedAt ? `✕ ${t("revoked", { reason: e.revokeReason ?? "" })}` : `✓ ${t("granted", { date: formatDateTime(e.grantedAt, locale) })}`}</li>)}
        {!ents.length && <li className="text-taupe-700">—</li>}
      </ul>
    </AdminPage>
  );
}
