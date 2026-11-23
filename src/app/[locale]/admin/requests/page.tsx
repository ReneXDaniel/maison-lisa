import { desc, eq, inArray } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { customRequests, profiles } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Table, Td } from "@/components/admin/ui";
import { RequestStatusSelect } from "@/components/admin/conversation-controls";
import { requirePage } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { REQUEST_STATUSES } from "@/lib/constants";

export default async function AdminRequests({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/requests");
  const t = await getTranslations("admin.requests");
  const rs = await getTranslations("requests.status");
  const o = await getTranslations("options");
  const sp = await searchParams;
  const status = REQUEST_STATUSES.find((s) => s === sp.status);
  const rows = await db.select({ r: customRequests, name: profiles.displayName }).from(customRequests).leftJoin(profiles, eq(profiles.userId, customRequests.customerId)).where(status ? inArray(customRequests.status, [status]) : undefined).orderBy(desc(customRequests.createdAt)).limit(200);
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <nav className="mb-6 flex flex-wrap gap-1">
        <Link href="/admin/requests" className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${!status ? "bg-espresso text-ivory-50" : "text-taupe-700"}`}>{t("all")}</Link>
        {REQUEST_STATUSES.map((s) => <Link key={s} href={{ pathname: "/admin/requests", query: { status: s } }} className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] ${status === s ? "bg-espresso text-ivory-50" : "text-taupe-700"}`}>{rs(s)}</Link>)}
      </nav>
      <Table head={["No.", t("customer"), t("date"), t("summary"), t("status"), ""]}>
        {rows.map(({ r, name }) => {
          const sel = r.selections as Record<string, string>;
          return (
            <tr key={r.id}>
              <Td><Link href={`/admin/requests/${r.id}`} className="font-semibold text-espresso link-underline">{r.number}</Link></Td>
              <Td>{name}</Td>
              <Td className="text-taupe-700">{formatDate(r.createdAt, locale)}</Td>
              <Td className="max-w-xs truncate text-xs text-taupe-700">{Object.entries(sel).map(([k, v]) => o(`${k}.${v}`)).join(" · ")}</Td>
              <Td className="w-48"><RequestStatusSelect id={r.id} status={r.status} /></Td>
              <Td>{r.conversationId && <Link href={`/admin/messages/${r.conversationId}`} className="eyebrow text-espresso">{t("chat")}</Link>}</Td>
            </tr>
          );
        })}
      </Table>
    </AdminPage>
  );
}
