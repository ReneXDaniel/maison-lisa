import { count, desc, eq, inArray } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { requirePage } from "@/lib/auth/guards";
import { formatDate, formatMoney } from "@/lib/format";

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "user", "/account/orders");
  const t = await getTranslations("account.orders");
  const s = await getTranslations("account.orderStatus");
  const list = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  const counts = list.length ? await db.select({ orderId: orderItems.orderId, n: count() }).from(orderItems).where(inArray(orderItems.orderId, list.map((o) => o.id))).groupBy(orderItems.orderId) : [];
  if (!list.length) return <EmptyState title={t("empty")} action={<ButtonLink href="/shop">{t("shop")}</ButtonLink>} />;
  return (
    <div>
      <h2 className="font-display mb-6 text-3xl text-espresso">{t("title")}</h2>
      <ul className="space-y-3" data-testid="orders-list">
        {list.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.id}`} className="grid grid-cols-2 gap-3 border border-champagne/50 bg-ivory-50 p-5 transition hover:border-espresso sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center">
              <span className="font-semibold text-espresso">{o.number}</span>
              <span className="text-sm text-taupe-700">{formatDate(o.createdAt, locale)}</span>
              <span className="text-sm text-taupe-700">{t("items", { count: Number(counts.find((c) => c.orderId === o.id)?.n ?? 0) })}</span>
              <span className="font-display text-xl text-espresso">{formatMoney(o.totalCents, locale)}</span>
              <Badge tone={o.status === "paid" ? "success" : o.status === "refunded" || o.status === "chargeback" ? "danger" : "neutral"}>{s(o.status)}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
