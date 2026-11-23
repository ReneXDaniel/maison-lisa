import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { orders, paymentTransactions } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { formatDateTime, formatMoney } from "@/lib/format";

export default async function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/payments");
  const t = await getTranslations("admin.orders");
  const rows = await db.select({ x: paymentTransactions, number: orders.number }).from(paymentTransactions).innerJoin(orders, eq(orders.id, paymentTransactions.orderId)).orderBy(desc(paymentTransactions.createdAt)).limit(300);
  return (
    <AdminPage eyebrow={t("paymentsEyebrow", { provider: env().PAYMENT_PROVIDER })} title={t("paymentsTitle")}>
      <Table head={[t("date"), t("number"), t("provider"), t("type"), t("status"), t("amount")]}>
        {rows.map(({ x, number }) => (
          <tr key={x.id}>
            <Td className="text-taupe-700">{formatDateTime(x.createdAt, locale)}</Td>
            <Td><Link href={`/admin/orders/${x.orderId}`} className="link-underline">{number}</Link></Td>
            <Td>{x.provider}</Td>
            <Td>{x.type}</Td>
            <Td><Badge tone={x.status === "succeeded" ? "success" : "warning"}>{x.status}</Badge></Td>
            <Td>{x.type === "payment" ? "" : "−"}{formatMoney(x.amountCents, locale)}</Td>
          </tr>
        ))}
      </Table>
    </AdminPage>
  );
}
