"use client";
import { useTranslations } from "next-intl";
import { Checkbox, Field } from "@/components/ui/field";
import { AdminForm } from "./forms";
import { saveSettingsAction } from "@/app/actions/admin";

export function SettingsForm({ settings }: { settings: { allowDiscountStacking: boolean; welcomeOncePerIdentity: boolean; downloadLinkTtlMinutes: number; checkoutSessionMinutes: number; chatAttachmentsEnabled: boolean; maxAttachmentMb: number; stockingSequenceManifest: string } }) {
  const t = useTranslations("admin.settings");
  return (
    <AdminForm action={saveSettingsAction} className="space-y-6">
      <div className="space-y-3">
        <Checkbox name="allowDiscountStacking" defaultChecked={settings.allowDiscountStacking} label={t("stacking")} />
        <Checkbox name="welcomeOncePerIdentity" defaultChecked={settings.welcomeOncePerIdentity} label={t("oncePerIdentity")} />
        <Checkbox name="chatAttachmentsEnabled" defaultChecked={settings.chatAttachmentsEnabled} label={t("attachments")} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("downloadTtl")} name="downloadLinkTtlMinutes" type="number" min={2} max={1440} defaultValue={settings.downloadLinkTtlMinutes} />
        <Field label={t("checkoutTtl")} name="checkoutSessionMinutes" type="number" min={10} max={1440} defaultValue={settings.checkoutSessionMinutes} />
        <Field label={t("maxAttachment")} name="maxAttachmentMb" type="number" min={1} max={25} defaultValue={settings.maxAttachmentMb} />
      </div>
      <Field label={t("sequence")} name="stockingSequenceManifest" defaultValue={settings.stockingSequenceManifest} placeholder="https://cdn.example.com/sequences/stocking/manifest.json" hint={t("sequenceHint")} />
    </AdminForm>
  );
}
