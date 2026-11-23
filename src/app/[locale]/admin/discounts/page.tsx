import { count, desc, eq, sum } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { discountRedemptions, discounts } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Panel, Table, Td } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { toggleDiscountAction } from "@/app/actions/admin";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AdminDiscounts({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/discounts");
  const t = await getTranslations("admin.discounts");
  const [rows, stats] = await Promise.all([
    db.select().from(discounts).orderBy(desc(discounts.isWelcome), desc(discounts.createdAt)),
    db.select({ id: discountRedemptions.discountId, n: count(), amount: sum(discountRedemptions.amountCents) }).from(discountRedemptions).where(eq(discountRedemptions.status, "redeemed")).groupBy(discountRedemptions.discountId),
  ]);
  const welcome = rows.find((d) => d.isWelcome);
  const value = (d: (typeof rows)[number]) => (d.kind === "percent" ? `${d.value}%` : formatMoney(d.value, locale));
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")} actions={<ButtonLink href="/admin/discounts/new">{t("new")}</ButtonLink>}>
      {welcome && (
        <Panel title={t("welcomeTitle")} className="mb-8" actions={<Link href={`/admin/discounts/${welcome.id}`} className="eyebrow text-espresso link-underline">{t("edit")}</Link>}>
          <p className="text-sm">{t("welcomeSummary", { value: value(welcome), min: formatMoney(welcome.minOrderCents, locale) })} · <Badge tone={welcome.active ? "success" : "neutral"}>{welcome.active ? t("active") : t("inactive")}</Badge></p>
          <p className="mt-2 text-xs text-taupe-700">{t("welcomeHelp")}</p>
        </Panel>
      )}
      <Table head={[t("code"), t("value"), t("scope"), t("limits"), t("period"), t("redemptions"), t("status"), ""]}>
        {rows.filter((d) => !d.isWelcome).map((d) => {
          const s = stats.find((x) => x.id === d.id);
          return (
            <tr key={d.id}>
              <Td><Link href={`/admin/discounts/${d.id}`} className="font-semibold tracking-[0.1em] text-espresso link-underline">{d.code}</Link><p className="text-xs text-taupe-700">{d.name}</p></Td>
              <Td>{value(d)}</Td>
              <Td className="text-xs">{t(`scopes.${d.scope}`)}{d.firstOrderOnly ? ` · ${t("firstOrder")}` : ""}</Td>
              <Td className="text-xs">{d.maxRedemptions ? t("max", { n: d.maxRedemptions }) : "∞"} · {t("perCustomer", { n: d.perCustomerLimit })}{d.minOrderCents ? ` · ≥ ${formatMoney(d.minOrderCents, locale)}` : ""}</Td>
              <Td className="text-xs text-taupe-700">{d.startsAt ? formatDate(d.startsAt, locale) : "—"} → {d.endsAt ? formatDate(d.endsAt, locale) : "—"}</Td>
              <Td>{Number(s?.n ?? 0)} <span className="text-xs text-taupe-700">(−{formatMoney(Number(s?.amount ?? 0), locale)})</span></Td>
              <Td><Badge tone={d.active ? "success" : "neutral"}>{d.active ? t("active") : t("inactive")}</Badge></Td>
              <Td><ActionButton action={toggleDiscountAction.bind(null, d.id, !d.active)} label={d.active ? t("deactivate") : t("activate")} /></Td>
            </tr>
          );
        })}
      </Table>
    </AdminPage>
  );
}
