import clsx from "clsx";
import { LEG_PATH } from "@/lib/art/leg";
import { BACKGROUND_SWATCH, type RequestSelections } from "@/lib/catalog-options";

type Look = Pick<RequestSelections, "stockings" | "footwear" | "accessories" | "background">;

const anklet = (cx: number, cy: number, rx: number, ry: number) =>
  Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2;
    return <circle key={i} cx={cx + Math.cos(a) * rx} cy={cy + Math.sin(a) * ry} r={3.4} fill="#e9d8b8" stroke="#b99f83" strokeWidth={0.8} />;
  });

/**
 * Illustrative look preview composed from vector layers (background,
 * stockings, footwear, accessories). It is an illustration — never presented
 * as a photograph of a combination.
 */
export function LookPreview({ look, className, id = "lp" }: { look: Look; className?: string; id?: string }) {
  const bg = look.background ?? "ivory_studio";
  const dark = bg === "dark_espresso";
  return (
    <div className={clsx("relative overflow-hidden", className)} style={{ background: BACKGROUND_SWATCH[bg] }}>
      <svg viewBox="-60 -40 720 1680" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-leg`}>
            <path d={LEG_PATH} />
          </clipPath>
          <linearGradient id={`${id}-skin`} x1="0.25" x2="0.75">
            <stop offset="0" stopColor="#b39a82" />
            <stop offset="0.45" stopColor="#dfc8b1" />
            <stop offset="0.8" stopColor="#f2e4d2" />
            <stop offset="1" stopColor="#d2b89d" />
          </linearGradient>
          <pattern id={`${id}-lace`} width="34" height="34" patternUnits="userSpaceOnUse">
            <circle cx="17" cy="17" r="11" fill="none" stroke="#1d140f" strokeWidth="2.2" opacity="0.55" />
            <circle cx="0" cy="0" r="6" fill="none" stroke="#1d140f" strokeWidth="1.6" opacity="0.45" />
            <circle cx="34" cy="34" r="6" fill="none" stroke="#1d140f" strokeWidth="1.6" opacity="0.45" />
          </pattern>
          <filter id={`${id}-shadow`}>
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <ellipse cx="380" cy="1612" rx="190" ry="16" fill="#000" opacity={dark ? 0.5 : 0.18} filter={`url(#${id}-shadow)`} />
        <path d={LEG_PATH} fill="#000" opacity="0.2" transform="translate(22 18)" filter={`url(#${id}-shadow)`} />
        <path d={LEG_PATH} fill={`url(#${id}-skin)`} />

        <g clipPath={`url(#${id}-leg)`}>
          {look.stockings === "black_sheer" && (
            <>
              <rect x="0" y="300" width="640" height="1400" fill="#140d09" opacity="0.58" />
              <rect x="0" y="292" width="640" height="22" fill="#0c0805" opacity="0.85" />
              <path d="M200 330 L216 1300" stroke="#0a0604" strokeWidth="3" opacity="0.6" />
            </>
          )}
          {look.stockings === "soft_nude" && (
            <>
              <rect x="0" y="300" width="640" height="1400" fill="#a8775a" opacity="0.28" />
              <rect x="0" y="292" width="640" height="18" fill="#8a5f46" opacity="0.4" />
            </>
          )}
          {look.stockings === "elegant_lace" && (
            <>
              <rect x="0" y="300" width="640" height="1400" fill="#140d09" opacity="0.42" />
              <rect x="0" y="240" width="640" height="90" fill={`url(#${id}-lace)`} />
              <rect x="0" y="300" width="640" height="1400" fill={`url(#${id}-lace)`} opacity="0.35" />
            </>
          )}
        </g>
        <path d={LEG_PATH} fill="none" stroke="#fff6ea" strokeWidth="2.5" opacity="0.35" />

        {look.footwear === "high_heels" && (
          <g>
            <path d="M246 1300 C238 1330 240 1360 262 1392 C300 1446 360 1506 430 1556 C462 1578 492 1596 512 1602 L520 1590 C500 1560 470 1526 432 1488 C400 1450 372 1418 350 1388 C320 1350 290 1318 262 1296 Z" fill="#1d140f" />
            <path d="M262 1392 L276 1606 L290 1606 L284 1398 Z" fill="#1d140f" />
            <path d="M262 1392 C300 1446 360 1506 430 1556" stroke="#c9b299" strokeWidth="3" fill="none" opacity="0.6" />
          </g>
        )}
        {look.footwear === "sandals" && (
          <g stroke="#2c1f18" strokeWidth="9" fill="none" strokeLinecap="round">
            <path d="M236 1268 C262 1282 300 1284 334 1272" />
            <path d="M420 1520 C440 1505 465 1520 470 1540" />
            <path d="M250 1350 C300 1450 380 1530 512 1600" strokeWidth="7" opacity="0.85" />
            <path d="M262 1392 L276 1606" strokeWidth="10" />
          </g>
        )}
        {look.footwear === "minimalist" && (
          <g>
            <path d="M400 1480 C440 1520 480 1556 512 1600 L500 1606 C460 1586 420 1556 380 1520 Z" fill="#b99f83" />
            <path d="M380 1520 C420 1556 460 1586 500 1606" stroke="#2c1f18" strokeWidth="3" fill="none" />
            <path d="M390 1470 C410 1462 430 1470 440 1486" stroke="#2c1f18" strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
        )}

        {look.accessories === "anklet" && <g>{anklet(287, 1262, 56, 12)}</g>}
        {look.accessories === "toe_ring" && <ellipse cx="478" cy="1556" rx="12" ry="7" fill="none" stroke="#d9c3a1" strokeWidth="5" />}
        {look.accessories === "silk_ribbon" && (
          <g fill="none" stroke="#c9b299" strokeLinecap="round">
            <path d="M232 1250 C262 1268 304 1268 336 1250" strokeWidth="14" />
            <path d="M232 1250 C262 1268 304 1268 336 1250" strokeWidth="3" stroke="#f3e6d2" />
            <path d="M330 1252 C370 1290 360 1340 390 1380" strokeWidth="10" />
            <path d="M330 1252 C360 1300 330 1350 352 1400" strokeWidth="10" />
          </g>
        )}
      </svg>
    </div>
  );
}
