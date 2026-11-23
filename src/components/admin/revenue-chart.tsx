"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { formatDate, formatMoney } from "@/lib/format";

/** Validated single-series colour (cognac, passes chroma/contrast checks on the ivory surface). */
const BAR = "#A86532";

/**
 * Revenue per day. One series → no legend box; the title names it. Thin bars
 * with 4px rounded data-ends on a baseline, 2px gaps, recessive grid, a hover
 * tooltip with full-height hit targets, and a data table for accessibility.
 */
export function RevenueChart({ days, title, tableLabel, dateLabel, revenueLabel, ordersLabel }: { days: { date: string; cents: number; orders: number }[]; title: string; tableLabel: string; dateLabel: string; revenueLabel: string; ordersLabel: string }) {
  const locale = useLocale();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 200;
  const pad = { l: 56, r: 8, t: 12, b: 24 };
  const max = Math.max(100, ...days.map((d) => d.cents));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / days.length;
  const bw = Math.max(2, slot - 2);
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const ticks = [0, top / 2, top];
  const h = hover !== null ? days[hover] : null;

  return (
    <figure className="relative">
      <figcaption className="font-display mb-3 text-2xl text-espresso">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#c9b299" strokeOpacity={t === 0 ? 0.9 : 0.35} strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#5f4f43">
              {formatMoney(t, locale).replace(/[.,]00(?=\D*$)/, "")}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = pad.l + i * slot + 1;
          const bh = Math.max(0, pad.t + ih - y(d.cents));
          const r = Math.min(4, bw / 2, bh);
          return (
            <g key={d.date}>
              {bh > 0 && (
                <path
                  d={`M${x} ${pad.t + ih} V${pad.t + ih - bh + r} Q${x} ${pad.t + ih - bh} ${x + r} ${pad.t + ih - bh} H${x + bw - r} Q${x + bw} ${pad.t + ih - bh} ${x + bw} ${pad.t + ih - bh + r} V${pad.t + ih} Z`}
                  fill={BAR}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
            </g>
          );
        })}
        {[0, Math.floor(days.length / 2), days.length - 1].map((i) =>
          days[i] ? (
            <text key={i} x={pad.l + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#5f4f43">
              {formatDate(days[i]!.date, locale, { day: "numeric", month: "short" })}
            </text>
          ) : null,
        )}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-8 border border-champagne/60 bg-ivory-50 px-3 py-2 text-xs shadow-card" style={{ left: `${Math.min(80, ((hover! + 0.5) / days.length) * 100)}%` }}>
          <p className="font-semibold text-espresso">{formatDate(h.date, locale, { dateStyle: "medium" })}</p>
          <p className="text-charcoal">
            {revenueLabel}: {formatMoney(h.cents, locale)}
          </p>
          <p className="text-taupe-700">
            {ordersLabel}: {h.orders}
          </p>
        </div>
      )}
      <details className="mt-3 text-xs text-taupe-700">
        <summary className="cursor-pointer">{tableLabel}</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left">
              <th className="py-1">{dateLabel}</th>
              <th>{revenueLabel}</th>
              <th>{ordersLabel}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td className="py-0.5">{formatDate(d.date, locale)}</td>
                <td>{formatMoney(d.cents, locale)}</td>
                <td>{d.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
