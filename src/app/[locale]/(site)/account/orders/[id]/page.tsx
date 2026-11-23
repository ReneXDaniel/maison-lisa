import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { formatDateTime, formatMoney } from "@/lib/format";

export default async function OrderDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "user", `/account/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order || order.userId !== user.id) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const t = await getTranslations("account.orders");
  const s = await getTranslations("account.orderStatus");
  const region = new Intl.DisplayNames([locale], { type: "region" });
  const delivery = order.status === "paid" ? t("deliveryAvailable") : order.status === "pending" ? t("deliveryPending") : t("deliveryNone");
  return (
    <div className="space-y-8" data-testid="order-detail">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-taupe-700">{t("order")}</p>
          <h2 className="font-display mt-1 text-4xl text-espresso">{order.number}</h2>
          <p className="mt-1 text-sm text-taupe-700">{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={order.status === "paid" ? "success" : "neutral"}>{s(order.status)}</Badge>
          <Badge tone="champagne">{delivery}</Badge>
        </div>
      </div>
      <ul className="divide-y divide-champagne/50 border-y border-champagne/50">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-6 py-4">
            <span className="font-display text-xl text-espresso">{i.title}</span>
            <span className="text-right text-sm">
              {i.discountCents > 0 && <span className="block text-xs text-taupe-700 line-through">{formatMoney(i.unitPriceCents, locale)}</span>}
              {formatMoney(i.lineTotalCents, locale)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="ml-auto max-w-sm space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-taupe-700">{t("subtotal")}</dt><dd>{formatMoney(order.subtotalCents, locale)}</dd></div>
        {order.discountSummary.map((d) => (
          <div key={d.id} className="flex justify-between text-success"><dt>{d.code ?? t("welcome")}</dt><dd>−{formatMoney(d.amountCents, locale)}</dd></div>
        ))}
        <div className="flex justify-between border-t border-champagne/50 pt-2 font-semibold"><dt>{t("total")}</dt><dd>{formatMoney(order.totalCents, locale)}</dd></div>
        <div className="flex justify-between text-xs text-taupe-700"><dt>{t("vat", { rate: order.vatRateBp / 100 })}</dt><dd>{formatMoney(order.vatCents, locale)}</dd></div>
        <div className="flex justify-between text-xs text-taupe-700"><dt>{t("country")}</dt><dd>{region.of(order.country)}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-3">
        {order.status === "paid" && <ButtonLink href="/account/purchases">{t("openPurchases")}</ButtonLink>}
        {["paid", "refunded"].includes(order.status) && <ButtonLink href={`/account/orders/${order.id}/receipt`} variant="secondary">{t("receipt")}</ButtonLink>}
        <Link href="/account/orders" className="eyebrow flex items-center px-3 text-taupe-700 link-underline">{t("back")}</Link>
      </div>
    </div>
  );
}
