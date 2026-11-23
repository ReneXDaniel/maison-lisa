import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { discounts } from "@/db/schema";
import { AdminPage } from "@/components/admin/ui";
import { DiscountForm } from "@/components/admin/discount-form";
import { requirePage } from "@/lib/auth/guards";
import { listCollections, listProducts } from "@/lib/catalog";

export default async function AdminDiscountEdit({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", `/admin/discounts/${id}`);
  const t = await getTranslations("admin.discounts");
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [d] = isNew ? [null] : await db.select().from(discounts).where(eq(discounts.id, id));
  if (!isNew && !d) notFound();
  const [prods, cols] = await Promise.all([listProducts(locale, { includeDrafts: true }), listCollections(locale, { includeUnpublished: true })]);
  const iso = (x: Date | null) => (x ? x.toISOString().slice(0, 16) : "");
  return (
    <AdminPage eyebrow={t("eyebrow")} title={isNew ? t("new") : d!.isWelcome ? t("welcomeTitle") : (d!.code ?? d!.name)}>
      <DiscountForm
        discount={d ? { id: d.id, code: d.code ?? "", name: d.name, kind: d.kind, value: d.kind === "percent" ? String(d.value) : (d.value / 100).toFixed(2), scope: d.scope, productIds: d.productIds, collectionIds: d.collectionIds, excludedProductIds: d.excludedProductIds, minOrder: d.minOrderCents ? (d.minOrderCents / 100).toFixed(2) : "", startsAt: iso(d.startsAt), endsAt: iso(d.endsAt), maxRedemptions: d.maxRedemptions ? String(d.maxRedemptions) : "", perCustomerLimit: String(d.perCustomerLimit), firstOrderOnly: d.firstOrderOnly, stackable: d.stackable, active: d.active, isWelcome: d.isWelcome, customerId: d.customerId ?? "" } : null}
        products={prods.map((p) => ({ id: p.id, title: p.title }))}
        collections={cols.map((c) => ({ id: c.id, title: c.title }))}
      />
    </AdminPage>
  );
}
