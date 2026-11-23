import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { orders, profiles } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { formatDateTime, formatMoney } from "@/lib/format";

const STATUSES = ["pending", "paid", "failed", "cancelled", "expired", "refunded", "chargeback"] as const;

export default async function AdminOrders({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; status?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/orders");
  const t = await getTranslations("admin.orders");
  const s = await getTranslations("account.orderStatus");
  const sp = await searchParams;
  const conds: (SQL | undefined)[] = [];
  if (sp.q) conds.push(or(ilike(orders.number, `%${sp.q}%`), ilike(orders.customerEmailSnapshot, `%${sp.q}%`)));
  if (STATUSES.includes(sp.status as never)) conds.push(eq(orders.status, sp.status as (typeof STATUSES)[number]));
  const rows = await db.select({ o: orders, name: profiles.displayName }).from(orders).leftJoin(profiles, eq(profiles.userId, orders.userId)).where(conds.length ? and(...conds) : undefined).orderBy(desc(orders.createdAt)).limit(200);
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <form className="mb-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder={t("search")} className="h-10 min-w-64 border border-taupe/40 bg-ivory-50 px-3 text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 border border-taupe/40 bg-ivory-50 px-3 text-sm">
          <option value="">{t("all")}</option>
          {STATUSES.map((x) => <option key={x} value={x}>{s(x)}</option>)}
        </select>
        <button className="eyebrow border border-espresso px-4 text-espresso">{t("filter")}</button>
      </form>
      <Table head={[t("number"), t("customer"), t("date"), t("total"), t("discount"), t("status")]}>
        {rows.map(({ o, name }) => (
          <tr key={o.id}>
            <Td><Link href={`/admin/orders/${o.id}`} className="font-semibold text-espresso link-underline">{o.number}</Link></Td>
            <Td>{name ?? o.customerEmailSnapshot}</Td>
            <Td className="text-taupe-700">{formatDateTime(o.createdAt, locale)}</Td>
            <Td>{formatMoney(o.totalCents, locale)}</Td>
            <Td className="text-taupe-700">{o.discountCents ? `−${formatMoney(o.discountCents, locale)}` : "—"}</Td>
            <Td><Badge tone={o.status === "paid" ? "success" : o.status === "pending" ? "neutral" : "warning"}>{s(o.status)}</Badge></Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
