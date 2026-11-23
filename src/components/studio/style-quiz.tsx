"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { Button, ButtonLink } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useStudio } from "@/stores/studio";
import type { RequestSelections } from "@/lib/catalog-options";

type Choice = { key: string; swatch: string; dark?: boolean; scores: Record<string, number>; preset: Partial<RequestSelections> };
const QUESTIONS: { key: string; choices: [Choice, Choice] }[] = [
  {
    key: "q1",
    choices: [
      { key: "classic", swatch: "linear-gradient(160deg,#f7f2eb,#e2d5c3)", scores: { "the-essentials": 2, "soft-elegance": 1 }, preset: { style: "minimal_studio" } },
      { key: "mysterious", swatch: "linear-gradient(160deg,#3e2e25,#1d140f)", dark: true, scores: { "the-private-edit": 2, "exclusive-by-lisa": 1 }, preset: { style: "mysterious_noir" } },
    ],
  },
  {
    key: "q2",
    choices: [
      { key: "soft", swatch: "linear-gradient(135deg,#ebc2c6,#d9b8a0)", scores: { "soft-elegance": 2, "the-silk-collection": 1 }, preset: { polishColor: "soft_nude", polishFinish: "glossy" } },
      { key: "bold", swatch: "linear-gradient(135deg,#9e1b2a,#5c1a24)", dark: true, scores: { "the-details": 2, "the-private-edit": 1 }, preset: { polishColor: "cherry_red", polishFinish: "glossy" } },
    ],
  },
  {
    key: "q3",
    choices: [
      { key: "ivory", swatch: "linear-gradient(160deg,#fbf7f1,#e2d5c3)", scores: { "the-essentials": 1, "the-silk-collection": 1 }, preset: { background: "ivory_studio" } },
      { key: "espresso", swatch: "linear-gradient(160deg,#4a382d,#1d140f)", dark: true, scores: { "exclusive-by-lisa": 2, "the-private-edit": 1 }, preset: { background: "dark_espresso" } },
    ],
  },
  {
    key: "q4",
    choices: [
      { key: "silk", swatch: "linear-gradient(115deg,#b99f83 0%,#e3d4c1 30%,#c9b299 55%,#f3e6d2 75%,#b99f83 100%)", scores: { "the-silk-collection": 2, "soft-elegance": 1 }, preset: { accessories: "silk_ribbon" } },
      { key: "lace", swatch: "radial-gradient(circle at 30% 30%,#3e2e25 0 18%,transparent 19%) 0 0/22px 22px, linear-gradient(160deg,#978171,#5f4f43)", dark: true, scores: { "the-private-edit": 1, "exclusive-by-lisa": 2 }, preset: { stockings: "elegant_lace" } },
    ],
  },
];

type Collection = { slug: string; title: string; description: string; image: string | null };

export function StyleQuiz({ collections }: { collections: Collection[] }) {
  const t = useTranslations("studio.quiz");
  const router = useRouter();
  const { set, setQuizResult } = useStudio();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Choice[]>([]);
  const done = step >= QUESTIONS.length;

  const scores: Record<string, number> = {};
  for (const a of answers) for (const [k, v] of Object.entries(a.scores)) scores[k] = (scores[k] ?? 0) + v;
  const resultSlug = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0];
  const result = collections.find((c) => c.slug === resultSlug) ?? collections[0];

  const choose = (c: Choice) => {
    setAnswers((a) => [...a.slice(0, step), c]);
    setStep((s) => s + 1);
    if (step === QUESTIONS.length - 1) setQuizResult(c.key);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 flex justify-center gap-2" aria-hidden="true">
        {QUESTIONS.map((q, i) => (
          <span key={q.key} className={clsx("h-px w-12 transition-colors duration-500", i < step ? "bg-espresso" : "bg-champagne")} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}>
            <p className="eyebrow text-center text-taupe-700">{t("progress", { n: step + 1, total: QUESTIONS.length })}</p>
            <h2 className="font-display mt-4 text-center text-5xl text-espresso sm:text-6xl">{t(`${QUESTIONS[step]!.key}.question`)}</h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {QUESTIONS[step]!.choices.map((c) => (
                <button key={c.key} onClick={() => choose(c)} className="group relative aspect-[4/5] overflow-hidden text-left shadow-card transition-transform duration-700 hover:-translate-y-1" data-testid={`quiz-${c.key}`}>
                  <span className="absolute inset-0 transition-transform duration-[1400ms] group-hover:scale-105" style={{ background: c.swatch }} />
                  <span className={clsx("absolute inset-x-0 bottom-0 p-8", c.dark ? "text-ivory-50" : "text-espresso")}>
                    <span className="font-display block text-4xl">{t(`${QUESTIONS[step]!.key}.${c.key}`)}</span>
                    <span className={clsx("mt-2 block text-sm", c.dark ? "text-champagne-200" : "text-taupe-700")}>{t(`${QUESTIONS[step]!.key}.${c.key}Hint`)}</span>
                  </span>
                </button>
              ))}
            </div>
            {step > 0 && (
              <div className="mt-8 text-center">
                <button onClick={() => setStep((s) => s - 1)} className="eyebrow text-taupe-700 link-underline">
                  {t("back")}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          result && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="grid items-center gap-10 md:grid-cols-2" data-testid="quiz-result">
              <div className="aspect-[4/5] overflow-hidden bg-ivory-200 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {result.image && <img src={result.image} alt={result.title} className="h-full w-full object-cover" />}
              </div>
              <div>
                <p className="eyebrow text-taupe-700">{t("resultEyebrow")}</p>
                <h2 className="font-display mt-4 text-5xl text-espresso">{result.title}</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-taupe-700">{result.description}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={`/collections/${result.slug}`} size="lg">
                    {t("explore")}
                  </ButtonLink>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      for (const a of answers) set(a.preset);
                      router.push("/custom-requests");
                    }}
                  >
                    {t("custom")}
                  </Button>
                </div>
                <p className="mt-6 text-xs leading-relaxed text-taupe-700">{t("disclaimer")}</p>
                <button onClick={() => (setStep(0), setAnswers([]))} className="eyebrow mt-4 text-taupe-700 link-underline">
                  {t("restart")}
                </button>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
