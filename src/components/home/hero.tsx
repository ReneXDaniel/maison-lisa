"use client";
import { Fragment, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ButtonLink } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

const E = [0.22, 0.61, 0.36, 1] as const;

export function Hero(props: { srcSet: string | null; src: string | null; eyebrow: string; title: string; subtitle: string; support: string; ctaCollection: string; ctaExperience: string; scroll: string }) {
  const reduce = useReducedMotion();
  const media = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reduce || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.to(media.current, { yPercent: 16, scale: 1.08, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(content.current, { yPercent: -22, opacity: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "80% top", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, [reduce]);

  // Letters animate one by one, but each word stays unbreakable so narrow
  // screens wrap "MAISON / LISA" between words, never mid-word.
  let counter = 0;
  const words = props.title.split(" ").map((word) => word.split("").map((ch) => ({ ch, i: counter++ })));
  return (
    <section ref={root} className="dark-surface relative flex h-[100svh] min-h-[620px] items-end overflow-hidden bg-espresso-900 text-ivory-50" data-testid="hero">
      <div ref={media} className="absolute inset-0 will-change-transform">
        {props.src && (
          <motion.img
            src={props.src}
            srcSet={props.srcSet ?? undefined}
            sizes="100vw"
            alt=""
            fetchPriority="high"
            initial={reduce ? false : { opacity: 0, scale: 1.12 }}
            animate={{ opacity: 0.9, scale: 1 }}
            transition={{ duration: 2.6, ease: E }}
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-espresso-900 via-espresso-900/35 to-espresso-900/40" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_40%,transparent,rgba(20,13,9,0.55))]" />
      <div ref={content} className="relative mx-auto w-full max-w-[1440px] px-6 pb-28 text-center sm:px-10 sm:pb-32">
        <motion.p initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6, ease: E }} className="eyebrow text-champagne">
          {props.eyebrow}
        </motion.p>
        <h1 className="font-display mt-6 text-[13vw] leading-none tracking-[0.18em] sm:text-[9vw] lg:text-[8.2rem]" aria-label={props.title}>
          {words.map((word, w) => (
            <Fragment key={w}>
              {w > 0 ? " " : null}
              <span aria-hidden="true" className="inline-block whitespace-nowrap">
                {word.map(({ ch, i }) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    initial={reduce ? false : { opacity: 0, y: "0.4em", filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1.4, delay: 0.8 + i * 0.06, ease: E }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </span>
            </Fragment>
          ))}
        </h1>
        <motion.p initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 1.7, ease: E }} className="font-display mt-6 text-3xl italic text-champagne sm:text-4xl">
          {props.subtitle}
        </motion.p>
        <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: 2.1 }} className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-champagne-200">
          {props.support}
        </motion.p>
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 2.5, ease: E }} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/collections" variant="champagne" size="lg" data-testid="hero-collection">
            {props.ctaCollection}
          </ButtonLink>
          <ButtonLink href="/nail-studio" variant="light" size="lg">
            {props.ctaExperience}
          </ButtonLink>
        </motion.div>
      </div>
      <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2, duration: 1 }} className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="eyebrow text-[10px] text-champagne-200">{props.scroll}</span>
        <span className="relative h-10 w-px overflow-hidden bg-champagne/25">
          <span className="absolute left-0 top-0 h-4 w-px animate-[scrollcue_2.2s_ease-in-out_infinite] bg-champagne" />
        </span>
      </motion.div>
    </section>
  );
}
