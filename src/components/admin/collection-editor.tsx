"use client";
import { useTranslations } from "next-intl";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { AdminForm, ActionButton, LocaleTabs, ImageUpload } from "./forms";
import { deleteCollectionAction, saveCollectionAction } from "@/app/actions/admin";

export function CollectionEditor({ collection, translations, images }: { collection: { id: string; slug: string; sortOrder: number; published: boolean; coverMediaId: string } | null; translations: Record<string, Record<string, string>>; images: { id: string; fileName: string }[] }) {
  const t = useTranslations("admin.collections");
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <AdminForm action={saveCollectionAction} className="space-y-5">
        {collection && <input type="hidden" name="id" value={collection.id} />}
        <LocaleTabs values={translations} fields={[{ name: "title", label: t("name") }, { name: "description", label: t("description"), multiline: true }]} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("slug")} name="slug" defaultValue={collection?.slug} />
          <Field label={t("sortOrder")} name="sortOrder" type="number" defaultValue={collection?.sortOrder ?? 0} />
          <Select label={t("cover")} name="coverMediaId" defaultValue={collection?.coverMediaId ?? ""}>
            <option value="">—</option>
            {images.map((i) => <option key={i.id} value={i.id}>{i.fileName}</option>)}
          </Select>
        </div>
        <Checkbox name="published" defaultChecked={collection?.published ?? true} label={t("published")} />
      </AdminForm>
      <div className="space-y-3">
        {collection?.coverMediaId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/media/${collection.coverMediaId}?w=480`} alt="" className="aspect-[5/4] w-full object-cover" />
        )}
        <ImageUpload kind="site" label={t("uploadCover")} multiple={false} />
        <p className="text-xs text-taupe-700">{t("coverHelp")}</p>
        {collection && <ActionButton action={deleteCollectionAction.bind(null, collection.id)} label={t("delete")} confirm={t("deleteConfirm")} variant="danger" />}
      </div>
    </div>
  );
}
