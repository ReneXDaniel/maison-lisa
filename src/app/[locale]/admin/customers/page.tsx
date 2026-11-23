import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { orders, profiles, users } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Table, Td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { effectiveAgeStatus } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/format";

export default async function CustomersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; status?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/customers");
  const t = await getTranslations("admin.customers");
  const a = await getTranslations("admin.messages.age");
  const sp = await searchParams;
  const conds: (SQL | undefined)[] = [eq(users.role, "customer")];
  if (sp.q) conds.push(or(ilike(users.email, `%${sp.q}%`), ilike(profiles.displayName, `%${sp.q}%`)));
  if (sp.status === "verified") conds.push(eq(users.ageStatus, "verified"));
  if (sp.status === "unverified") conds.push(sql`${users.ageStatus} <> 'verified'`);
  if (sp.status === "blocked") conds.push(sql`${users.blockedAt} is not null`);
  const rows = await db
    .select({ u: users, name: profiles.displayName, orders: sql<number>`(select count(*)::int from ${orders} o where o.user_id = ${users.id} and o.status = 'paid')`, revenue: sql<number>`(select coalesce(sum(o.total_cents),0)::int from ${orders} o where o.user_id = ${users.id} and o.status = 'paid')` })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(...conds.filter(Boolean)))
    .orderBy(desc(users.createdAt))
    .limit(200);
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <form className="mb-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder={t("search")} className="h-10 min-w-64 border border-taupe/40 bg-ivory-50 px-3 text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="h-10 border border-taupe/40 bg-ivory-50 px-3 text-sm">
          <option value="">{t("all")}</option>
          <option value="verified">{t("verifiedOnly")}</option>
          <option value="unverified">{t("unverified")}</option>
          <option value="blocked">{t("blocked")}</option>
        </select>
        <button className="eyebrow border border-espresso px-4 text-espresso">{t("filter")}</button>
      </form>
      <Table head={[t("name"), t("email"), t("verification"), t("orders"), t("revenue"), t("joined"), ""]}>
        {rows.map(({ u, name, orders: n, revenue }) => {
          const age = effectiveAgeStatus(u.ageStatus, u.ageVerifiedUntil);
          return (
            <tr key={u.id}>
              <Td><Link href={`/admin/customers/${u.id}`} className="font-semibold text-espresso link-underline">{name ?? "—"}</Link></Td>
              <Td className="text-taupe-700">{u.deletedAt ? t("deleted") : u.email}</Td>
              <Td><Badge tone={age === "verified" ? "success" : "warning"}>{a(age)}</Badge>{u.blockedAt && <Badge tone="danger" className="ml-1">{t("blocked")}</Badge>}</Td>
              <Td>{n}</Td>
              <Td>{formatMoney(revenue, locale)}</Td>
              <Td className="text-taupe-700">{formatDate(u.createdAt, locale)}</Td>
              <Td><Link href={`/admin/customers/${u.id}`} className="eyebrow text-espresso">{t("open")}</Link></Td>
            </tr>
          );
        })}
      </Table>
    </AdminPage>
  );
}
