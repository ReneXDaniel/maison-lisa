import { and, count, desc, eq, gte, inArray, sql, sum } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { customRequests, discountRedemptions, discounts, orderItems, orders, users } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Panel, StatTile } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { requirePage } from "@/lib/auth/guards";
import { unreadConversations } from "@/lib/counts";
import { formatMoney } from "@/lib/format";

export default async function AdminOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requirePage(locale, "admin", "/admin");
  const t = await getTranslations("admin.overview");
  const since = new Date(Date.now() - 30 * 864e5);
  const paid = eq(orders.status, "paid");

  const [[all], [recent], [newCustomers], [verified], unread, [pendingReq], top, redemptions, daily] = await Promise.all([
    db.select({ total: sum(orders.totalCents), n: count() }).from(orders).where(paid),
    db.select({ total: sum(orders.totalCents), n: count() }).from(orders).where(and(paid, gte(orders.paidAt, since))),
    db.select({ n: count() }).from(users).where(and(eq(users.role, "customer"), gte(users.createdAt, since))),
    db.select({ n: count() }).from(users).where(and(eq(users.role, "customer"), eq(users.ageStatus, "verified"))),
    unreadConversations(admin),
    db.select({ n: count() }).from(customRequests).where(inArray(customRequests.status, ["submitted", "under_review"])),
    db
      .select({ title: orderItems.title, revenue: sum(orderItems.lineTotalCents), n: count() })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(paid)
      .groupBy(orderItems.title)
      .orderBy(desc(sum(orderItems.lineTotalCents)))
      .limit(5),
    db
      .select({ name: discounts.name, code: discounts.code, n: count(), amount: sum(discountRedemptions.amountCents) })
      .from(discountRedemptions)
      .innerJoin(discounts, eq(discounts.id, discountRedemptions.discountId))
      .where(eq(discountRedemptions.status, "redeemed"))
      .groupBy(discounts.name, discounts.code)
      .orderBy(desc(count())),
    db.execute<{ day: string; cents: string; n: string }>(sql`
      select to_char(d.day, 'YYYY-MM-DD') as day, coalesce(sum(o.total_cents), 0) as cents, count(o.id) as n
      from generate_series((now() at time zone 'Europe/Berlin')::date - 29, (now() at time zone 'Europe/Berlin')::date, interval '1 day') as d(day)
      left join orders o on o.status = 'paid' and (o.paid_at at time zone 'Europe/Berlin')::date = d.day
      group by d.day order by d.day`),
  ]);
  const recentTotal = Number(recent?.total ?? 0);
  const recentN = Number(recent?.n ?? 0);

  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="admin-kpis">
        <StatTile label={t("revenue30")} value={formatMoney(recentTotal, locale)} sub={t("revenueTotal", { total: formatMoney(Number(all?.total ?? 0), locale) })} />
        <StatTile label={t("orders30")} value={recentN} sub={t("ordersTotal", { n: Number(all?.n ?? 0) })} />
        <StatTile label={t("aov")} value={formatMoney(recentN ? Math.round(recentTotal / recentN) : 0, locale)} sub={t("last30")} />
        <StatTile label={t("newCustomers")} value={Number(newCustomers?.n ?? 0)} sub={t("verified", { n: Number(verified?.n ?? 0) })} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/messages" className="block"><StatTile label={t("unread")} value={unread} sub={t("openInbox")} /></Link>
        <Link href="/admin/requests" className="block"><StatTile label={t("pendingRequests")} value={Number(pendingReq?.n ?? 0)} sub={t("openRequests")} /></Link>
      </div>
      <Panel className="mt-8">
        <RevenueChart
          title={t("chartTitle")}
          tableLabel={t("showTable")}
          dateLabel={t("date")}
          revenueLabel={t("revenue")}
          ordersLabel={t("orders")}
          days={daily.rows.map((r) => ({ date: r.day, cents: Number(r.cents), orders: Number(r.n) }))}
        />
      </Panel>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Panel title={t("topProducts")}>
          {top.length === 0 ? <p className="text-sm text-taupe-700">{t("noData")}</p> : (
            <ol className="space-y-3 text-sm">
              {top.map((p, i) => (
                <li key={p.title} className="flex items-baseline justify-between gap-4">
                  <span><span className="mr-3 text-taupe-700">{i + 1}.</span>{p.title}</span>
                  <span className="text-taupe-700">{t("sold", { n: Number(p.n) })} · <span className="text-espresso">{formatMoney(Number(p.revenue ?? 0), locale)}</span></span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title={t("redemptions")}>
          {redemptions.length === 0 ? <p className="text-sm text-taupe-700">{t("noData")}</p> : (
            <ul className="space-y-3 text-sm">
              {redemptions.map((r) => (
                <li key={`${r.name}${r.code}`} className="flex items-baseline justify-between gap-4">
                  <span>{r.code ?? r.name}</span>
                  <span className="text-taupe-700">{t("used", { n: Number(r.n) })} · <span className="text-espresso">−{formatMoney(Number(r.amount ?? 0), locale)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminPage>
  );
}
