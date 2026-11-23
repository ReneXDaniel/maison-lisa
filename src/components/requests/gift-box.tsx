"use client";
import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import clsx from "clsx";

const W = 260;
const H = 170;
const D = 260;
const LID_H = 40;
const P = 12; // lid overhang

const espresso = "linear-gradient(160deg, #4a382d 0%, #2c1f18 55%, #1d140f 100%)";
const ribbonV = "linear-gradient(90deg, transparent calc(50% - 16px), #b99f83 calc(50% - 16px), #e3d4c1 50%, #b99f83 calc(50% + 16px), transparent calc(50% + 16px))";
const ribbonH = "linear-gradient(0deg, transparent calc(50% - 16px), #b99f83 calc(50% - 16px), #e3d4c1 50%, #b99f83 calc(50% + 16px), transparent calc(50% + 16px))";
const silk = "radial-gradient(120% 90% at 30% 20%, #fffaf2 0%, #efe4d4 45%, #d9c8b2 100%)";

function Face({ w, h, transform, background, className }: { w: number; h: number; transform: string; background: string; className?: string }) {
  const style: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: w,
    height: h,
    marginLeft: -w / 2,
    marginTop: -h / 2,
    transform,
    background,
    backfaceVisibility: "hidden",
  };
  return <div className={clsx("border border-champagne/20", className)} style={style} />;
}

/**
 * Interactive MAISON LISA gift box. Purely presentational — opening it does
 * not submit anything; the card inside holds the real send button.
 */
export function GiftBox({ open, onOpen, label, hint, children }: { open: boolean; onOpen: () => void; label: string; hint: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const lidStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: W,
    height: H,
    marginLeft: -W / 2,
    marginTop: -H / 2,
    transformStyle: "preserve-3d",
    transformOrigin: "50% 50% 0",
    transform: open ? "translate3d(40px, -150px, -90px) rotateX(16deg) rotateZ(-8deg)" : "none",
    transition: reduce ? "none" : "transform 1.6s cubic-bezier(0.65, 0, 0.35, 1)",
  };
  const skirtY = `translateY(${-H / 2 + LID_H / 2 - 2}px)`;

  return (
    <div className="relative mx-auto flex w-full max-w-xl flex-col items-center">
      <button
        type="button"
        onClick={onOpen}
        disabled={open}
        aria-label={label}
        className="group relative h-[380px] w-full cursor-pointer disabled:cursor-default"
        style={{ perspective: 1300 }}
        data-testid="gift-box"
      >
        <div className="absolute left-1/2 top-[62%] h-10 w-[340px] -translate-x-1/2 rounded-[50%] bg-espresso/30 blur-2xl" />
        <div
          className={clsx("absolute inset-0 transition-transform duration-700", !open && "group-hover:-translate-y-1.5")}
          style={{ transformStyle: "preserve-3d", transform: "translateY(30px) rotateX(-24deg) rotateY(-34deg)" }}
        >
          {/* walls (outside) */}
          <Face w={W} h={H} transform={`translateZ(${D / 2}px)`} background={`${ribbonV}, ${espresso}`} />
          <Face w={W} h={H} transform={`rotateY(180deg) translateZ(${D / 2}px)`} background={`${ribbonV}, ${espresso}`} />
          <Face w={D} h={H} transform={`rotateY(90deg) translateZ(${W / 2}px)`} background={`${ribbonV}, ${espresso}`} />
          <Face w={D} h={H} transform={`rotateY(-90deg) translateZ(${W / 2}px)`} background={`${ribbonV}, ${espresso}`} />
          <Face w={W} h={D} transform={`rotateX(-90deg) translateZ(${H / 2}px)`} background={espresso} />
          {/* walls (inside, ivory silk) */}
          <Face w={W} h={H} transform={`translateZ(${D / 2 - 1}px) rotateY(180deg)`} background={silk} />
          <Face w={W} h={H} transform={`rotateY(180deg) translateZ(${D / 2 - 1}px) rotateY(180deg)`} background={silk} />
          <Face w={D} h={H} transform={`rotateY(90deg) translateZ(${W / 2 - 1}px) rotateY(180deg)`} background={silk} />
          <Face w={D} h={H} transform={`rotateY(-90deg) translateZ(${W / 2 - 1}px) rotateY(180deg)`} background={silk} />
          <Face w={W} h={D} transform={`rotateX(90deg) translateZ(${H / 2 - 1}px)`} background={silk} />
          {/* lid */}
          <div style={lidStyle}>
            <Face w={W + P} h={D + P} transform={`rotateX(90deg) translateZ(${H / 2 + 1}px)`} background={`${ribbonV}, ${ribbonH}, ${espresso}`} />
            <Face w={W + P} h={D + P} transform={`rotateX(-90deg) translateZ(${-H / 2 - 1}px)`} background={silk} />
            <Face w={W + P} h={LID_H} transform={`${skirtY} translateZ(${(D + P) / 2}px)`} background={`${ribbonV}, ${espresso}`} />
            <Face w={W + P} h={LID_H} transform={`${skirtY} rotateY(180deg) translateZ(${(D + P) / 2}px)`} background={`${ribbonV}, ${espresso}`} />
            <Face w={D + P} h={LID_H} transform={`${skirtY} rotateY(90deg) translateZ(${(W + P) / 2}px)`} background={`${ribbonV}, ${espresso}`} />
            <Face w={D + P} h={LID_H} transform={`${skirtY} rotateY(-90deg) translateZ(${(W + P) / 2}px)`} background={`${ribbonV}, ${espresso}`} />
            {/* bow, lying on the lid */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{ width: 150, height: 110, marginLeft: -75, marginTop: -55, transform: `rotateX(90deg) translateZ(${H / 2 + 3}px)`, backfaceVisibility: "hidden" }}
            >
              <svg viewBox="0 0 150 110" width="150" height="110" aria-hidden>
                <defs>
                  <linearGradient id="bow" x1="0" x2="1">
                    <stop offset="0" stopColor="#b99f83" />
                    <stop offset="0.5" stopColor="#f3e6d2" />
                    <stop offset="1" stopColor="#b99f83" />
                  </linearGradient>
                </defs>
                <path d="M75 55 C40 10 5 20 12 48 C18 72 50 66 75 55 Z" fill="url(#bow)" />
                <path d="M75 55 C110 10 145 20 138 48 C132 72 100 66 75 55 Z" fill="url(#bow)" />
                <path d="M70 58 L52 104 L66 96 L74 62 Z M80 58 L98 104 L84 96 L76 62 Z" fill="#b99f83" />
                <ellipse cx="75" cy="55" rx="11" ry="9" fill="#e3d4c1" stroke="#b99f83" />
              </svg>
            </div>
          </div>
        </div>
        {!open && (
          <span className="eyebrow absolute bottom-2 left-1/2 -translate-x-1/2 animate-pulse text-taupe-700">{hint}</span>
        )}
      </button>
      <motion.div
        initial={false}
        animate={open ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 60, scale: 0.92 }}
        transition={{ duration: reduce ? 0 : 1.1, delay: open && !reduce ? 0.9 : 0, ease: [0.22, 0.61, 0.36, 1] }}
        className={clsx("relative z-10 -mt-24 w-full", !open && "pointer-events-none")}
        aria-hidden={!open}
      >
        {children}
      </motion.div>
    </div>
  );
}
