"use client";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { ButtonLink, Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { useStudio } from "@/stores/studio";
import { useSessionUser } from "@/components/providers/session-provider";
import { ACCESSORIES, BACKGROUNDS, FOOTWEAR, STOCKINGS, type RequestSelections } from "@/lib/catalog-options";
import { OptionChips } from "./option-chips";
import { LookPreview } from "./look-preview";
import { voteAction } from "@/app/actions/looks";

export function LookStudio() {
  const t = useTranslations("studio.look");
  const o = useTranslations("options");
  const { selections, set } = useStudio();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const sel = hydrated ? selections : ({} as RequestSelections);
  const look = { stockings: sel.stockings ?? "black_sheer", footwear: sel.footwear ?? "high_heels", accessories: sel.accessories ?? "none", background: sel.background ?? "champagne_satin" };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <LookPreview look={look} className="mx-auto aspect-[3/5] max-h-[78vh] w-full max-w-md border border-champagne/60 shadow-soft transition-[background] duration-700" />
        <p className="mt-3 text-center text-xs text-taupe-700">{t("illustrative")}</p>
      </div>
      <div className="space-y-10">
        {(
          [
            ["stockings", STOCKINGS],
            ["footwear", FOOTWEAR],
            ["accessories", ACCESSORIES],
            ["background", BACKGROUNDS],
          ] as const
        ).map(([g, opts]) => (
          <div key={g}>
            <p className="eyebrow mb-4 text-taupe-700">{o(`${g}.label`)}</p>
            <OptionChips group={g} options={opts} value={look[g] as never} onChange={(v) => v && set({ [g]: v } as Partial<RequestSelections>)} />
          </div>
        ))}
        <div className="border-t border-champagne/60 pt-8">
          <p className="text-sm leading-relaxed text-taupe-700">{t("saved")}</p>
          <ButtonLink href="/custom-requests" size="lg" className="mt-5">
            {t("cta")}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

type Option = { id: string; stockings: string; footwear: string; accessory: string; background: string };

export function LookVoting({ pollId, options, initialMine, initialResults }: { pollId: string; options: Option[]; initialMine: string | null; initialResults: Record<string, number> | null }) {
  const t = useTranslations("studio.vote");
  const o = useTranslations("options");
  const e = useTranslations("errors");
  const user = useSessionUser();
  const [mine, setMine] = useState(initialMine);
  const [results, setResults] = useState(initialResults);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = results ? Object.values(results).reduce((a, b) => a + b, 0) : 0;
  const canVote = !!user && (user.isAdultVerified || user.isAdmin);

  return (
    <div>
      {!canVote && (
        <Notice className="mb-8">
          {t("verifiedOnly")}{" "}
          <a href={user ? "/verify?next=/look-studio" : "/auth/login?next=/look-studio"} className="font-semibold underline">
            {user ? t("verify") : t("signIn")}
          </a>
        </Notice>
      )}
      {error && <Notice tone="error" className="mb-6">{e.has(error) ? e(error) : e("server")}</Notice>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((opt, i) => {
          const pct = results && total ? Math.round(((results[opt.id] ?? 0) / total) * 100) : null;
          const chosen = mine === opt.id;
          return (
            <article key={opt.id} className={clsx("flex flex-col border bg-ivory-50 transition", chosen ? "border-espresso shadow-lift" : "border-champagne/60")} data-testid="vote-option">
              <LookPreview id={`v${i}`} look={{ stockings: opt.stockings as never, footwear: opt.footwear as never, accessories: opt.accessory as never, background: opt.background as never }} className="aspect-[4/5]" />
              <div className="flex flex-1 flex-col p-5">
                <p className="font-display text-2xl text-espresso">{t("option", { n: i + 1 })}</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-taupe-700">
                  {[o(`stockings.${opt.stockings}`), o(`footwear.${opt.footwear}`), o(`accessories.${opt.accessory}`), o(`background.${opt.background}`)].join(" · ")}
                </p>
                {pct !== null && (
                  <div className="mt-4" aria-label={t("share", { pct })}>
                    <div className="h-1 bg-ivory-200">
                      <div className="h-1 bg-espresso transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-taupe-700">{pct}%</p>
                  </div>
                )}
                <Button
                  size="sm"
                  variant={chosen ? "primary" : "secondary"}
                  className="mt-4"
                  disabled={!canVote || pending}
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      const r = await voteAction(pollId, opt.id);
                      if (!r.ok) return setError(r.error);
                      setMine(r.data.mine);
                      setResults(r.data.results);
                    })
                  }
                  data-testid="vote-button"
                >
                  {chosen ? t("yourVote") : mine ? t("change") : t("vote")}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-taupe-700">{t("oneVote")}</p>
    </div>
  );
}
