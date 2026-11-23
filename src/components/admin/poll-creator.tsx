"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useUI } from "@/stores/ui";
import { ACCESSORIES, BACKGROUNDS, FOOTWEAR, STOCKINGS } from "@/lib/catalog-options";
import { createPollAction } from "@/app/actions/admin";

type Opt = { stockings: (typeof STOCKINGS)[number]; footwear: (typeof FOOTWEAR)[number]; accessory: (typeof ACCESSORIES)[number]; background: (typeof BACKGROUNDS)[number] };
const blank = (): Opt => ({ stockings: "black_sheer", footwear: "high_heels", accessory: "none", background: "ivory_studio" });

export function PollCreator() {
  const t = useTranslations("admin.looks");
  const o = useTranslations("options");
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const [opts, setOpts] = useState<Opt[]>([blank(), blank()]);
  const [pending, start] = useTransition();
  const groups = [["stockings", STOCKINGS], ["footwear", FOOTWEAR], ["accessory", ACCESSORIES], ["background", BACKGROUNDS]] as const;
  return (
    <div className="space-y-4">
      <p className="text-sm text-taupe-700">{t("newHelp")}</p>
      {opts.map((opt, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 border-b border-champagne/40 pb-3">
          <span className="eyebrow w-full text-taupe-700">{t("concept", { n: i + 1 })}</span>
          {groups.map(([g, list]) => (
            <select key={g} value={opt[g]} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, [g]: e.target.value } : x)))} className="h-9 border border-taupe/40 bg-ivory-50 px-2 text-xs">
              {list.map((v) => <option key={v} value={v}>{o(`${g === "accessory" ? "accessories" : g}.${v}`)}</option>)}
            </select>
          ))}
          {opts.length > 2 && <button onClick={() => setOpts(opts.filter((_, j) => j !== i))} className="text-xs text-danger underline">{t("remove")}</button>}
        </div>
      ))}
      <div className="flex gap-2">
        {opts.length < 8 && <Button variant="ghost" size="sm" onClick={() => setOpts([...opts, blank()])}>{t("add")}</Button>}
        <Button size="sm" loading={pending} onClick={() => start(async () => { const r = await createPollAction(opts); toast(r.ok ? { tone: "success", title: t("created") } : { tone: "error", title: r.error }); router.refresh(); })}>{t("create")}</Button>
      </div>
    </div>
  );
}
