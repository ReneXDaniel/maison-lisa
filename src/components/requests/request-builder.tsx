"use client";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { IconGift } from "@/components/ui/icons";
import { useStudio } from "@/stores/studio";
import { useSessionUser } from "@/components/providers/session-provider";
import { ACCESSORIES, FOOTWEAR, PHOTO_STYLES, POLISH_FINISHES, STOCKINGS, type RequestSelections } from "@/lib/catalog-options";
import { BackgroundSwatches, ColorSwatches, OptionChips } from "@/components/studio/option-chips";
import { GiftBox } from "./gift-box";
import { submitRequestAction } from "@/app/actions/requests";
import { brand } from "@/config/brand";

const SUMMARY_ORDER = ["polishColor", "polishFinish", "style", "stockings", "footwear", "accessories", "background"] as const;

function Step({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-champagne/60 py-10 first:border-t-0 first:pt-0">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-display flex items-baseline gap-4 text-3xl text-espresso">
          <span className="eyebrow text-taupe-700">{String(n).padStart(2, "0")}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function RequestBuilder() {
  const t = useTranslations("requests");
  const o = useTranslations("options");
  const e = useTranslations("errors");
  const router = useRouter();
  const user = useSessionUser();
  const { selections, notes, set, setNotes, reset } = useStudio();
  const [hydrated, setHydrated] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [lidOpen, setLidOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => setHydrated(true), []);
  const sel = hydrated ? selections : ({} as RequestSelections);
  const chosen = SUMMARY_ORDER.filter((k) => sel[k]);
  const empty = chosen.length === 0 && !notes.trim();
  const canSend = !!user && user.emailVerified && (user.isAdultVerified || user.isAdmin);

  const send = () =>
    start(async () => {
      setError(null);
      const r = await submitRequestAction({ selections: sel, notes });
      if (!r.ok) return setError(r.error);
      setNotes("");
      router.push(`/messages/${r.data.conversationId}`);
    });

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <Step n={1} title={t("steps.polish")} aside={sel.polishColor ? <span className="text-xs text-taupe-700">{t("fromStudio")}</span> : <Link href="/nail-studio" className="eyebrow text-taupe-700 link-underline">Nail Studio</Link>}>
          <ColorSwatches value={sel.polishColor} onChange={(v) => set({ polishColor: v as RequestSelections["polishColor"] })} />
          <div className="mt-6">
            <OptionChips group="polishFinish" options={POLISH_FINISHES} value={sel.polishFinish} onChange={(v) => set({ polishFinish: v })} />
          </div>
        </Step>
        <Step n={2} title={t("steps.style")}>
          <OptionChips group="style" options={PHOTO_STYLES} value={sel.style} onChange={(v) => set({ style: v })} />
        </Step>
        <Step n={3} title={t("steps.styling")}>
          <div className="space-y-6">
            {(
              [
                ["stockings", STOCKINGS],
                ["footwear", FOOTWEAR],
                ["accessories", ACCESSORIES],
              ] as const
            ).map(([g, opts]) => (
              <div key={g}>
                <p className="eyebrow mb-3 text-taupe-700">{o(`${g}.label`)}</p>
                <OptionChips group={g} options={opts} value={sel[g] as never} onChange={(v) => set({ [g]: v } as Partial<RequestSelections>)} />
              </div>
            ))}
          </div>
        </Step>
        <Step n={4} title={t("steps.setting")}>
          <BackgroundSwatches value={sel.background} onChange={(v) => set({ background: v as RequestSelections["background"] })} />
        </Step>
        <Step n={5} title={t("steps.wishes")}>
          <label htmlFor="wishes" className="sr-only">
            {t("wishesLabel")}
          </label>
          <textarea
            id="wishes"
            value={hydrated ? notes : ""}
            onChange={(ev) => setNotes(ev.target.value)}
            maxLength={2000}
            rows={5}
            placeholder={t("wishesPlaceholder")}
            className="w-full border border-taupe/40 bg-ivory-50 px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-espresso"
            data-testid="wishes"
          />
          <p className="mt-2 text-xs text-taupe-700">{t("wishesHint")}</p>
        </Step>
      </div>

      <aside className="h-fit border border-champagne/60 bg-ivory-50 p-7 shadow-card lg:sticky lg:top-28">
        <p className="eyebrow text-taupe-700">{t("summary")}</p>
        <dl className="mt-4 space-y-2 text-sm">
          {SUMMARY_ORDER.map((k) => (
            <div key={k} className="flex justify-between gap-4 border-b border-champagne/30 pb-2">
              <dt className="text-taupe-700">{o(`${k}.label`)}</dt>
              <dd className={sel[k] ? "font-semibold text-espresso" : "text-taupe-600/70"}>{sel[k] ? o(`${k}.${sel[k]}`) : "—"}</dd>
            </div>
          ))}
        </dl>
        {notes.trim() && hydrated && <p className="mt-4 line-clamp-3 text-sm italic text-charcoal">“{notes.trim()}”</p>}
        <Button size="lg" className="mt-7 w-full" disabled={empty} onClick={() => setBoxOpen(true)} data-testid="prepare-request">
          <IconGift size={16} />
          {t("openGift")}
        </Button>
        {empty && <p className="mt-3 text-center text-xs text-taupe-700">{t("nothingSelected")}</p>}
        <button onClick={reset} className="eyebrow mt-5 block w-full text-center text-taupe-700 link-underline">
          {t("reset")}
        </button>
      </aside>

      <AnimatePresence>
        {boxOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("giftTitle")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] overflow-y-auto bg-ivory-100/96 px-4 py-10 backdrop-blur-md"
          >
            <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center">
              <GiftBox open={lidOpen} onOpen={() => setLidOpen(true)} label={t("giftHint")} hint={t("giftHint")}>
                <div className="border border-champagne bg-ivory-50 p-8 text-center shadow-lift" data-testid="gift-card">
                  <p className="font-display text-3xl tracking-[0.3em] text-espresso">{brand.monogram}</p>
                  <p className="font-display mt-4 text-4xl italic text-espresso">{t("giftTitle")}</p>
                  <p className="eyebrow mt-3 text-taupe-700">{t("giftSubtitle")}</p>
                  <div className="hairline mx-auto my-6 w-24" />
                  <ul className="space-y-1 text-sm text-charcoal">
                    {chosen.map((k) => (
                      <li key={k}>
                        <span className="text-taupe-700">{o(`${k}.label`)}:</span> {o(`${k}.${sel[k]}`)}
                      </li>
                    ))}
                  </ul>
                  {notes.trim() && <p className="mx-auto mt-4 max-w-sm text-sm italic text-charcoal">“{notes.trim()}”</p>}
                  {error && <Notice tone="error" className="mt-6 text-left">{e.has(error) ? e(error) : e("server")}</Notice>}
                  <div className="mt-8 flex flex-col gap-3">
                    {canSend ? (
                      <Button size="lg" loading={pending} onClick={send} data-testid="send-request">
                        {pending ? t("sending") : t("send")}
                      </Button>
                    ) : (
                      <>
                        <p className="text-xs leading-relaxed text-taupe-700">{t("loginRequired")}</p>
                        <ButtonLink size="lg" href={{ pathname: !user ? "/auth/login" : !user.emailVerified ? "/auth/verify-email" : "/verify", query: { next: "/custom-requests" } }}>
                          {!user ? t("continueToSignIn") : t("verifyToSend")}
                        </ButtonLink>
                      </>
                    )}
                    <button onClick={() => (setBoxOpen(false), setLidOpen(false))} className="eyebrow text-taupe-700 link-underline">
                      {t("edit")}
                    </button>
                  </div>
                </div>
              </GiftBox>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
