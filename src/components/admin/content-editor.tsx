"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useUI } from "@/stores/ui";
import { localeNames, type Locale } from "@/i18n/routing";
import { saveContentAction } from "@/app/actions/admin";

type Entry = { key: string; group: string; multiline?: boolean; default: string; value: string };

export function ContentEditor({ lang, locales, entries }: { lang: string; locales: string[]; entries: Entry[] }) {
  const t = useTranslations("admin.content");
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const [values, setValues] = useState(() => Object.fromEntries(entries.map((e) => [e.key, e.value])));
  const [pending, start] = useTransition();
  const groups = [...new Set(entries.map((e) => e.group))];
  return (
    <div>
      <nav className="no-scrollbar mb-6 flex overflow-x-auto border-b border-champagne/50">
        {locales.map((l) => (
          <Link key={l} href={{ pathname: "/admin/content", query: { lang: l } }} className={clsx("px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]", l === lang ? "border-b-2 border-espresso text-espresso" : "text-taupe-700")}>
            {localeNames[l as Locale]}
          </Link>
        ))}
      </nav>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          start(async () => {
            const r = await saveContentAction(lang, values);
            toast(r.ok ? { tone: "success", title: t("saved") } : { tone: "error", title: r.error });
            router.refresh();
          });
        }}
        className="space-y-10"
        data-testid="content-editor"
      >
        {groups.map((g) => (
          <section key={g}>
            <h2 className="font-display mb-4 text-3xl text-espresso">{t(`groups.${g}`)}</h2>
            <div className="space-y-5">
              {entries.filter((e) => e.group === g).map((e) => (
                <label key={e.key} className="block">
                  <span className="flex items-center justify-between gap-3">
                    <span className="eyebrow text-taupe-700">{e.key}</span>
                    {values[e.key] && <button type="button" onClick={() => setValues({ ...values, [e.key]: "" })} className="text-xs text-taupe-700 underline">{t("reset")}</button>}
                  </span>
                  {e.multiline ? (
                    <textarea value={values[e.key]} onChange={(ev) => setValues({ ...values, [e.key]: ev.target.value })} placeholder={e.default} rows={3} className="mt-2 w-full border border-taupe/40 bg-ivory-50 px-3 py-2 text-sm outline-none placeholder:text-taupe-600/60 focus:border-espresso" />
                  ) : (
                    <input value={values[e.key]} onChange={(ev) => setValues({ ...values, [e.key]: ev.target.value })} placeholder={e.default} className="mt-2 h-11 w-full border border-taupe/40 bg-ivory-50 px-3 text-sm outline-none placeholder:text-taupe-600/60 focus:border-espresso" data-testid={`content-${e.key}`} />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="sticky bottom-0 border-t border-champagne/50 bg-ivory-100/95 py-4 backdrop-blur">
          <Button type="submit" loading={pending} data-testid="content-save">{t("save", { language: localeNames[lang as Locale] })}</Button>
        </div>
      </form>
    </div>
  );
}
