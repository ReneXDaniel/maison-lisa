"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { AdminForm, LocaleTabs } from "./forms";
import { saveProductAction } from "@/app/actions/admin";

type P = { id: string; slug: string; collectionId: string | null; price: string; format: string; status: string; featured: boolean; verifiedPreviewOnly: boolean; sortOrder: number };

export function ProductForm({ product, translations, collections }: { product: P | null; translations: Record<string, Record<string, string>>; collections: { id: string; title: string }[] }) {
  const t = useTranslations("admin.products");
  const router = useRouter();
  return (
    <AdminForm action={saveProductAction} testId="product-form" onDone={(r) => !product && r.ok && router.replace(`/admin/products/${(r.data as { id: string }).id}`)} className="space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <LocaleTabs values={translations} fields={[{ name: "title", label: t("name") }, { name: "description", label: t("description"), multiline: true }, { name: "details", label: t("details"), multiline: true }]} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("price")} name="price" type="number" step="0.01" min="0" defaultValue={product?.price ?? "29.00"} required data-testid="product-price" />
        <Select label={t("collection")} name="collectionId" defaultValue={product?.collectionId ?? ""}>
          <option value="">—</option>
          {collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
        <Select label={t("statusLabel")} name="status" defaultValue={product?.status ?? "draft"} data-testid="product-status">
          {["draft", "published", "archived"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </Select>
        <Field label={t("slug")} name="slug" defaultValue={product?.slug} hint={t("slugHint")} />
        <Field label={t("format")} name="format" defaultValue={product?.format ?? "JPEG · high resolution"} />
        <Field label={t("sortOrder")} name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} />
      </div>
      <div className="space-y-3">
        <Checkbox name="featured" defaultChecked={product?.featured} label={t("featured")} />
        <Checkbox name="verifiedPreviewOnly" defaultChecked={product?.verifiedPreviewOnly} label={t("verifiedPreviewOnly")} />
      </div>
    </AdminForm>
  );
}
