"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { AdminForm } from "./forms";
import { saveDiscountAction } from "@/app/actions/admin";

type D = { id: string; code: string; name: string; kind: string; value: string; scope: string; productIds: string[]; collectionIds: string[]; excludedProductIds: string[]; minOrder: string; startsAt: string; endsAt: string; maxRedemptions: string; perCustomerLimit: string; firstOrderOnly: boolean; stackable: boolean; active: boolean; isWelcome: boolean; customerId: string };

function MultiSelect({ name, label, options, initial }: { name: string; label: string; options: { id: string; title: string }[]; initial: string[] }) {
  const [sel, setSel] = useState(new Set(initial));
  return (
    <fieldset>
      <legend className="eyebrow mb-2 text-taupe-700">{label}</legend>
      <input type="hidden" name={name} value={[...sel].join(",")} />
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => setSel((s) => { const n = new Set(s); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} className={`border px-2.5 py-1 text-xs ${sel.has(o.id) ? "border-espresso bg-espresso text-ivory-50" : "border-taupe/40"}`}>
            {o.title}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function DiscountForm({ discount, products, collections }: { discount: D | null; products: { id: string; title: string }[]; collections: { id: string; title: string }[] }) {
  const t = useTranslations("admin.discounts");
  const router = useRouter();
  const [scope, setScope] = useState(discount?.scope ?? "order");
  const welcome = !!discount?.isWelcome;
  return (
    <AdminForm action={saveDiscountAction} testId="discount-form" onDone={(r) => r.ok && router.push("/admin/discounts")} className="max-w-3xl space-y-6">
      {discount && <input type="hidden" name="id" value={discount.id} />}
      {welcome && <input type="hidden" name="isWelcome" value="true" />}
      <div className="grid gap-5 sm:grid-cols-2">
        {!welcome && <Field label={t("code")} name="code" defaultValue={discount?.code} required placeholder="LISA15" className="uppercase" data-testid="discount-code" />}
        <Field label={t("internalName")} name="name" defaultValue={discount?.name} />
        <Select label={t("type")} name="kind" defaultValue={discount?.kind ?? "percent"}>
          <option value="percent">{t("percent")}</option>
          <option value="fixed">{t("fixed")}</option>
        </Select>
        <Field label={t("value")} name="value" type="number" step="0.01" min="0" defaultValue={discount?.value ?? "10"} required hint={t("valueHint")} data-testid="discount-value" />
        <Field label={t("minOrder")} name="minOrder" type="number" step="0.01" min="0" defaultValue={discount?.minOrder} />
        {!welcome && <Field label={t("maxRedemptions")} name="maxRedemptions" type="number" min="1" defaultValue={discount?.maxRedemptions} hint={t("unlimitedHint")} />}
        {!welcome && <Field label={t("perCustomerLimit")} name="perCustomerLimit" type="number" min="1" defaultValue={discount?.perCustomerLimit ?? "1"} />}
        {!welcome && <Field label={t("startsAt")} name="startsAt" type="datetime-local" defaultValue={discount?.startsAt} />}
        {!welcome && <Field label={t("endsAt")} name="endsAt" type="datetime-local" defaultValue={discount?.endsAt} />}
        {!welcome && <Field label={t("customerId")} name="customerId" defaultValue={discount?.customerId} hint={t("customerHint")} />}
      </div>
      <Select label={t("scope")} name="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
        <option value="order">{t("scopes.order")}</option>
        <option value="products">{t("scopes.products")}</option>
        <option value="collections">{t("scopes.collections")}</option>
      </Select>
      {scope === "products" && <MultiSelect name="productIds" label={t("eligibleProducts")} options={products} initial={discount?.productIds ?? []} />}
      {scope === "collections" && <MultiSelect name="collectionIds" label={t("eligibleCollections")} options={collections} initial={discount?.collectionIds ?? []} />}
      <MultiSelect name="excludedProductIds" label={t("excluded")} options={products} initial={discount?.excludedProductIds ?? []} />
      <div className="space-y-3">
        {!welcome && <Checkbox name="firstOrderOnly" defaultChecked={discount?.firstOrderOnly} label={t("firstOrderOnly")} />}
        <Checkbox name="stackable" defaultChecked={discount?.stackable} label={t("stackable")} />
        <Checkbox name="active" defaultChecked={discount?.active ?? true} label={t("activeLabel")} />
      </div>
    </AdminForm>
  );
}
