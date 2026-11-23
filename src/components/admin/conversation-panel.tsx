import { and, count, desc, eq, sum } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { conversationNotes, conversations, customRequests, orders, profiles, users } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/misc";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { effectiveAgeStatus } from "@/lib/auth/session";
import { ConversationControls, NoteForm, OfferForm, RequestStatusSelect, BlockToggle } from "./conversation-controls";

/** Lisa's context panel next to a conversation. */
export async function ConversationPanel({ conversationId, locale }: { conversationId: string; locale: string }) {
  const t = await getTranslations("admin.messages");
  const st = await getTranslations("requests.status");
  const [c] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!c) return null;
  const [[cust], reqs, notes, recentOrders, [stats]] = await Promise.all([
    db.select({ u: users, p: profiles }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, c.customerId)),
    db.select().from(customRequests).where(eq(customRequests.customerId, c.customerId)).orderBy(desc(customRequests.createdAt)).limit(10),
    db.select({ n: conversationNotes, name: profiles.displayName }).from(conversationNotes).leftJoin(profiles, eq(profiles.userId, conversationNotes.authorId)).where(eq(conversationNotes.conversationId, c.id)).orderBy(desc(conversationNotes.createdAt)),
    db.select().from(orders).where(eq(orders.userId, c.customerId)).orderBy(desc(orders.createdAt)).limit(5),
    db.select({ n: count(), total: sum(orders.totalCents) }).from(orders).where(and(eq(orders.userId, c.customerId), eq(orders.status, "paid"))),
  ]);
  if (!cust) return null;
  const age = effectiveAgeStatus(cust.u.ageStatus, cust.u.ageVerifiedUntil);

  return (
    <div className="space-y-8 p-5 pb-16">
      <section>
        <p className="eyebrow text-taupe-700">{t("client")}</p>
        <p className="font-display mt-2 text-2xl text-espresso">{cust.p?.displayName}</p>
        <p className="mt-1 break-all text-xs text-taupe-700">{cust.u.email}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={age === "verified" ? "success" : "warning"}>{t(`age.${age}`)}</Badge>
          {cust.u.blockedAt && <Badge tone="danger">{t("blocked")}</Badge>}
          <Badge>{(cust.p?.locale ?? "de").toUpperCase()}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-ivory-100 p-3">
            <dt className="text-taupe-700">{t("paidOrders")}</dt>
            <dd className="font-display text-xl text-espresso">{Number(stats?.n ?? 0)}</dd>
          </div>
          <div className="bg-ivory-100 p-3">
            <dt className="text-taupe-700">{t("revenue")}</dt>
            <dd className="font-display text-xl text-espresso">{formatMoney(Number(stats?.total ?? 0), locale)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-taupe-700">{t("memberSince", { date: formatDate(cust.u.createdAt, locale) })}</p>
        <Link href={`/admin/customers/${cust.u.id}`} className="eyebrow mt-3 inline-block text-espresso link-underline">
          {t("viewCustomer")}
        </Link>
      </section>

      <section className="border-t border-champagne/50 pt-6">
        <p className="eyebrow mb-3 text-taupe-700">{t("conversation")}</p>
        <ConversationControls id={c.id} status={c.status} flagged={c.flagged} />
      </section>

      <section className="border-t border-champagne/50 pt-6">
        <p className="eyebrow mb-3 text-taupe-700">{t("requests")}</p>
        {reqs.length === 0 && <p className="text-sm text-taupe-700">{t("noRequests")}</p>}
        <ul className="space-y-3">
          {reqs.map((r) => (
            <li key={r.id} className="border border-champagne/50 bg-ivory-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-espresso">No. {r.number}</span>
                <span className="text-[11px] text-taupe-700">{formatDate(r.createdAt, locale)}</span>
              </div>
              <p className="mt-1 text-xs text-taupe-700">{st(r.status)}</p>
              <RequestStatusSelect id={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-champagne/50 pt-6">
        <p className="eyebrow mb-3 text-taupe-700">{t("createOffer")}</p>
        <OfferForm conversationId={c.id} requests={reqs.filter((r) => !["paid", "completed", "cancelled", "rejected", "delivered"].includes(r.status)).map((r) => ({ id: r.id, number: r.number }))} />
      </section>

      <section className="border-t border-champagne/50 pt-6">
        <p className="eyebrow mb-3 text-taupe-700">{t("orders")}</p>
        {recentOrders.length === 0 && <p className="text-sm text-taupe-700">{t("noOrders")}</p>}
        <ul className="space-y-2 text-sm">
          {recentOrders.map((o) => (
            <li key={o.id} className="flex justify-between gap-2">
              <Link href={`/admin/orders/${o.id}`} className="link-underline">
                {o.number}
              </Link>
              <span className="text-taupe-700">
                {formatMoney(o.totalCents, locale)} · {o.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-champagne/50 pt-6">
        <p className="eyebrow mb-3 text-taupe-700">{t("notes")}</p>
        <p className="mb-3 text-[11px] text-taupe-700">{t("notesHint")}</p>
        <NoteForm conversationId={c.id} />
        <ul className="mt-4 space-y-3">
          {notes.map(({ n, name }) => (
            <li key={n.id} className="border-l-2 border-champagne bg-ivory-100 px-3 py-2">
              <p className="whitespace-pre-wrap text-sm text-charcoal">{n.body}</p>
              <p className="mt-1 text-[11px] text-taupe-700">
                {name} · {formatDateTime(n.createdAt, locale)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-champagne/50 pt-6">
        <BlockToggle userId={cust.u.id} blocked={!!cust.u.blockedAt} />
      </section>
    </div>
  );
}
