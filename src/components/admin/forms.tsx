"use client";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useRouter } from "@/i18n/navigation";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { useUI } from "@/stores/ui";
import { locales, localeNames } from "@/i18n/routing";

type Result = { ok: boolean; error?: string; fields?: Record<string, string>; data?: unknown };

/** Wraps a server action that takes FormData: shows success/error toasts and refreshes. */
export function AdminForm({ action, children, className, onDone, submitLabel, testId }: { action: (fd: FormData) => Promise<Result>; children: ReactNode; className?: string; onDone?: (r: Result) => void; submitLabel?: string; testId?: string }) {
  const t = useTranslations("admin.common");
  const e = useTranslations("errors");
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const [pending, start] = useTransition();
  return (
    <form
      className={className}
      data-testid={testId}
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        start(async () => {
          const r = await action(fd);
          if (r.ok) toast({ tone: "success", title: t("saved") });
          else toast({ tone: "error", title: e.has(r.error ?? "") ? e(r.error!) : e("server"), body: r.fields ? Object.keys(r.fields).join(", ") : undefined });
          onDone?.(r);
          router.refresh();
        });
      }}
    >
      {children}
      <div className="mt-6">
        <Button type="submit" loading={pending} data-testid={testId ? `${testId}-submit` : undefined}>
          {submitLabel ?? t("save")}
        </Button>
      </div>
    </form>
  );
}

/** Small button that invokes a server action (with optional confirmation). */
export function ActionButton({ action, label, confirm, variant = "secondary", size = "sm" }: { action: () => Promise<Result>; label: ReactNode; confirm?: string; variant?: ButtonVariant; size?: "sm" | "md" }) {
  const e = useTranslations("errors");
  const t = useTranslations("admin.common");
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await action();
          toast(r.ok ? { tone: "success", title: t("done") } : { tone: "error", title: e.has(r.error ?? "") ? e(r.error!) : e("server") });
          router.refresh();
        });
      }}
    >
      {label}
    </Button>
  );
}

/** One tab per language; fields are named tr.<locale>.<field>. */
export function LocaleTabs({ fields, values }: { fields: { name: string; label: string; multiline?: boolean }[]; values: Record<string, Record<string, string>> }) {
  const t = useTranslations("admin.common");
  const [active, setActive] = useState<string>(locales[0]);
  return (
    <div className="border border-champagne/50">
      <div role="tablist" className="no-scrollbar flex overflow-x-auto border-b border-champagne/50 bg-ivory-100">
        {locales.map((l) => {
          const filled = !!values[l]?.title;
          return (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={active === l}
              onClick={() => setActive(l)}
              className={clsx("flex items-center gap-1.5 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]", active === l ? "bg-ivory-50 text-espresso" : "text-taupe-700")}
              title={localeNames[l]}
            >
              {l}
              <span className={clsx("size-1.5 rounded-full", filled ? "bg-success" : "bg-champagne")} aria-label={filled ? t("translated") : t("missing")} />
            </button>
          );
        })}
      </div>
      {locales.map((l) => (
        <div key={l} role="tabpanel" hidden={active !== l} className="space-y-4 p-4">
          {fields.map((f) => (
            <label key={f.name} className="block">
              <span className="eyebrow text-taupe-700">
                {f.label} · {localeNames[l]}
              </span>
              {f.multiline ? (
                <textarea name={`tr.${l}.${f.name}`} defaultValue={values[l]?.[f.name] ?? ""} rows={4} className="mt-2 w-full border border-taupe/40 bg-ivory-50 px-3 py-2 text-sm outline-none focus:border-espresso" />
              ) : (
                <input name={`tr.${l}.${f.name}`} defaultValue={values[l]?.[f.name] ?? ""} className="mt-2 h-11 w-full border border-taupe/40 bg-ivory-50 px-3 text-sm outline-none focus:border-espresso" data-testid={`tr-${l}-${f.name}`} />
              )}
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Uploads one or more images to /api/admin/media. */
export function ImageUpload({ kind, productId, offerId, visibility, label, multiple = true, onUploaded }: { kind: "site" | "product_preview" | "product_original" | "delivery"; productId?: string; offerId?: string; visibility?: "public" | "verified"; label: string; multiple?: boolean; onUploaded?: (ids: string[]) => void }) {
  const t = useTranslations("admin.common");
  const e = useTranslations("errors");
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function upload(files: FileList) {
    const ids: string[] = [];
    for (const [i, f] of Array.from(files).entries()) {
      setBusy(`${i + 1}/${files.length}`);
      const fd = new FormData();
      fd.set("file", f);
      fd.set("kind", kind);
      if (productId) fd.set("productId", productId);
      if (offerId) fd.set("offerId", offerId);
      if (visibility) fd.set("visibility", visibility);
      const r = await fetch("/api/admin/media", { method: "POST", body: fd });
      const d = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !d.id) toast({ tone: "error", title: `${f.name}: ${e.has(d.error ?? "") ? e(d.error!) : e("server")}` });
      else ids.push(d.id);
    }
    setBusy(null);
    if (ids.length) toast({ tone: "success", title: t("uploaded", { count: ids.length }) });
    onUploaded?.(ids);
    router.refresh();
  }
  return (
    <div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} hidden onChange={(ev) => ev.target.files && upload(ev.target.files).finally(() => (ev.target.value = ""))} data-testid={`upload-${kind}`} />
      <Button type="button" variant="secondary" size="sm" loading={!!busy} onClick={() => input.current?.click()}>
        {busy ? t("uploading", { progress: busy }) : label}
      </Button>
    </div>
  );
}
