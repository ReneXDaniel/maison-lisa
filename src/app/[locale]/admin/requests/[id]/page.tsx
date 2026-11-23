import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { customOffers, customRequests, deliveryFiles, profiles } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ActionButton, ImageUpload } from "@/components/admin/forms";
import { RequestStatusSelect } from "@/components/admin/conversation-controls";
import { Badge, Notice } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { deleteDeliveryFileAction, markDeliveredAction } from "@/app/actions/admin";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export default async function AdminRequestDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", `/admin/requests/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [r] = await db.select().from(customRequests).where(eq(customRequests.id, id));
  if (!r) notFound();
  const t = await getTranslations("admin.requests");
  const o = await getTranslations("options");
  const os = await getTranslations("chat.offer.status");
  const [[cust], offers] = await Promise.all([db.select().from(profiles).where(eq(profiles.userId, r.customerId)), db.select().from(customOffers).where(eq(customOffers.requestId, id))]);
  const files = offers.length ? await db.select().from(deliveryFiles).where(inArray(deliveryFiles.offerId, offers.map((x) => x.id))) : [];
  const sel = r.selections as Record<string, string>;
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("detailTitle", { number: r.number })} actions={r.conversationId ? <Link href={`/admin/messages/${r.conversationId}`} className="eyebrow border border-espresso px-4 py-2.5 text-espresso">{t("openChat")}</Link> : undefined}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title={t("request")}>
          <p className="text-sm">{cust?.displayName} · {formatDate(r.createdAt, locale)}</p>
          <dl className="mt-4 space-y-1 text-sm">
            {Object.entries(sel).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-taupe-700">{o(`${k}.label`)}</dt><dd className="font-semibold">{o(`${k}.${v}`)}</dd></div>)}
          </dl>
          {r.notes && <p className="mt-4 whitespace-pre-wrap border-t border-champagne/40 pt-3 text-sm italic">“{r.notes}”</p>}
          <div className="mt-4"><RequestStatusSelect id={r.id} status={r.status} /></div>
        </Panel>
        <div className="space-y-6 lg:col-span-2">
          {offers.length === 0 && <Notice>{t("noOffer")}</Notice>}
          {offers.map((offer) => {
            const mine = files.filter((f) => f.offerId === offer.id);
            return (
              <Panel key={offer.id} title={offer.title} actions={<Badge tone={offer.status === "paid" ? "success" : "neutral"}>{os(offer.status)}</Badge>}>
                <p className="text-sm text-taupe-700">{formatMoney(offer.priceCents, locale)} · {offer.deliveryDetails}</p>
                {offer.status === "paid" ? (
                  <div className="mt-5 space-y-4">
                    <p className="eyebrow text-taupe-700">{t("delivery")}</p>
                    <ul className="space-y-1 text-sm">
                      {mine.map((f) => <li key={f.id} className="flex items-center justify-between gap-3"><span>{f.fileName} · {formatDateTime(f.createdAt, locale)}</span>{!offer.deliveredAt && <ActionButton action={deleteDeliveryFileAction.bind(null, f.id)} label="✕" />}</li>)}
                      {!mine.length && <li className="text-taupe-700">{t("noFiles")}</li>}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <ImageUpload kind="delivery" offerId={offer.id} label={t("uploadDelivery")} />
                      {mine.length > 0 && !offer.deliveredAt && <ActionButton action={markDeliveredAction.bind(null, offer.id)} label={t("markDelivered")} variant="primary" confirm={t("deliverConfirm")} />}
                    </div>
                    {offer.deliveredAt && <Notice tone="success">{t("delivered", { date: formatDateTime(offer.deliveredAt, locale) })}</Notice>}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-taupe-700">{t("awaitingPayment")}</p>
                )}
              </Panel>
            );
          })}
        </div>
      </div>
    </AdminPage>
  );
}
