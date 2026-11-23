import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { media, products, productTranslations } from "@/db/schema";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ActionButton, ImageUpload } from "@/components/admin/forms";
import { ProductForm } from "@/components/admin/product-form";
import { ProductMediaGrid } from "@/components/admin/media-grid";
import { requirePage } from "@/lib/auth/guards";
import { listCollections } from "@/lib/catalog";
import { deleteProductAction } from "@/app/actions/admin";

export default async function AdminProductEdit({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", `/admin/products/${id}`);
  const t = await getTranslations("admin.products");
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [p] = isNew ? [null] : await db.select().from(products).where(eq(products.id, id));
  if (!isNew && !p) notFound();
  const [tr, files, cols] = await Promise.all([
    p ? db.select().from(productTranslations).where(eq(productTranslations.productId, p.id)) : [],
    p ? db.select().from(media).where(eq(media.productId, p.id)).orderBy(asc(media.kind), asc(media.sortOrder)) : [],
    listCollections(locale, { includeUnpublished: true }),
  ]);
  const values = Object.fromEntries(tr.map((x) => [x.locale, { title: x.title, description: x.description, details: x.details }]));
  return (
    <AdminPage eyebrow={t("eyebrow")} title={isNew ? t("new") : (values[locale]?.title ?? values.en?.title ?? p!.slug)} actions={p ? <ActionButton action={deleteProductAction.bind(null, p.id)} label={t("delete")} confirm={t("deleteProductConfirm")} variant="danger" /> : undefined}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ProductForm product={p ? { id: p.id, slug: p.slug, collectionId: p.collectionId, price: (p.priceCents / 100).toFixed(2), format: p.format, status: p.status, featured: p.featured, verifiedPreviewOnly: p.verifiedPreviewOnly, sortOrder: p.sortOrder } : null} translations={values} collections={cols.map((c) => ({ id: c.id, title: c.title }))} />
        {p ? (
          <div className="space-y-6">
            <Panel title={t("previews")} actions={<ImageUpload kind="product_preview" productId={p.id} label={t("uploadPreview")} />}>
              <p className="mb-4 text-xs text-taupe-700">{t("previewHelp")}</p>
              <ProductMediaGrid productId={p.id} items={files.filter((f) => f.kind === "product_preview").map((f) => ({ ...f, isCover: f.id === p.coverMediaId }))} />
            </Panel>
            <Panel title={t("originals")} actions={<ImageUpload kind="product_original" productId={p.id} label={t("uploadOriginal")} />}>
              <p className="mb-4 text-xs text-taupe-700">{t("originalHelp")}</p>
              <ProductMediaGrid productId={p.id} items={files.filter((f) => f.kind === "product_original")} />
            </Panel>
          </div>
        ) : (
          <p className="text-sm text-taupe-700">{t("saveFirst")}</p>
        )}
      </div>
    </AdminPage>
  );
}
