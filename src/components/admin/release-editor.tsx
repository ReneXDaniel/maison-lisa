"use client";
import { useTranslations } from "next-intl";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { AdminForm, ActionButton, LocaleTabs } from "./forms";
import { deleteReleaseAction, saveReleaseAction } from "@/app/actions/admin";

export function ReleaseEditor({ release, translations, images }: { release: { id: string; slug: string; releaseAt: string; published: boolean; coverMediaId: string; sortOrder: number } | null; translations: Record<string, Record<string, string>>; images: { id: string; fileName: string }[] }) {
  const t = useTranslations("admin.releases");
  return (
    <div className="space-y-4">
      <AdminForm action={saveReleaseAction} className="space-y-5">
        {release && <input type="hidden" name="id" value={release.id} />}
        <LocaleTabs values={translations} fields={[{ name: "title", label: t("name") }, { name: "description", label: t("description"), multiline: true }]} />
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label={t("slug")} name="slug" defaultValue={release?.slug} />
          <Field label={t("date")} name="releaseAt" type="datetime-local" defaultValue={release?.releaseAt} hint={t("dateHint")} />
          <Select label={t("cover")} name="coverMediaId" defaultValue={release?.coverMediaId ?? ""}>
            <option value="">—</option>
            {images.map((i) => <option key={i.id} value={i.id}>{i.fileName}</option>)}
          </Select>
          <Field label={t("sortOrder")} name="sortOrder" type="number" defaultValue={release?.sortOrder ?? 0} />
        </div>
        <Checkbox name="published" defaultChecked={release?.published ?? true} label={t("published")} />
      </AdminForm>
      {release && <ActionButton action={deleteReleaseAction.bind(null, release.id)} label={t("delete")} confirm={t("deleteConfirm")} variant="danger" />}
    </div>
  );
}
