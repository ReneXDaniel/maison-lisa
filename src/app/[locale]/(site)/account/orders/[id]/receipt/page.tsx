import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { requirePage } from "@/lib/auth/guards";
import { formatDate, formatMoney } from "@/lib/format";
import { brand } from "@/config/brand";
import { legalEntity } from "@/config/legal";
import { Notice } from "@/components/ui/misc";
import { PrintButton } from "@/components/account/print-button";

/** Printable receipt. Becomes a compliant invoice once real seller details are configured (see config/legal.ts). */
export default async function ReceiptPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "user", `/account/orders/${id}/receipt`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order || (order.userId !== user.id && !user.isAdmin) || !["paid", "refunded"].includes(order.status)) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const t = await getTranslations("account.receipt");
  return (
    <article className="border border-champagne/60 bg-white p-8 text-charcoal print:border-0 print:p-0 sm:p-12">
      {legalEntity.isPlaceholder && <Notice tone="warning" className="mb-8 print:hidden">{t("placeholder")}</Notice>}
      <header className="flex flex-wrap justify-between gap-6 border-b border-champagne pb-8">
        <div>
          <p className="font-display text-3xl tracking-[0.3em] text-espresso">{brand.name}</p>
          <p className="mt-3 text-xs leading-relaxed text-taupe-700">{legalEntity.name}<br />{legalEntity.address}<br />{t("vatId")}: {legalEntity.vatId}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-display text-2xl text-espresso">{t("title")}</p>
          <p className="mt-2">{t("number")}: {order.number}</p>
          <p>{t("date")}: {formatDate(order.paidAt ?? order.createdAt, locale)}</p>
          <p className="mt-2 text-xs text-taupe-700">{order.customerEmailSnapshot}</p>
        </div>
      </header>
      <table className="mt-8 w-full text-sm">
        <thead><tr className="text-left text-taupe-700"><th className="pb-3 font-normal">{t("item")}</th><th className="pb-3 text-right font-normal">{t("amount")}</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t border-champagne/50"><td className="py-3">{i.title}</td><td className="py-3 text-right">{formatMoney(i.lineTotalCents, locale)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-6 max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd>{formatMoney(order.subtotalCents, locale)}</dd></div>
        {order.discountCents > 0 && <div className="flex justify-between"><dt>{t("discount")}</dt><dd>−{formatMoney(order.discountCents, locale)}</dd></div>}
        <div className="flex justify-between border-t border-champagne pt-2 font-semibold"><dt>{t("total")}</dt><dd>{formatMoney(order.totalCents, locale)}</dd></div>
        <div className="flex justify-between text-xs text-taupe-700"><dt>{t("vatIncluded", { rate: order.vatRateBp / 100 })}</dt><dd>{formatMoney(order.vatCents, locale)}</dd></div>
      </dl>
      <p className="mt-10 text-xs leading-relaxed text-taupe-700">{t("digitalNote")}</p>
      <div className="mt-8 print:hidden"><PrintButton label={t("print")} /></div>
    </article>
  );
}
