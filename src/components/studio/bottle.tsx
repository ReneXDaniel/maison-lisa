import clsx from "clsx";

/** Luxury nail polish bottle: white body, coloured cap, glass reflections. */
export function Bottle({ color, className, size = 86 }: { color: string; className?: string; size?: number }) {
  const id = color.replace("#", "");
  return (
    <svg viewBox="0 0 120 240" width={size} height={size * 2} className={clsx("drop-shadow-[0_18px_18px_rgba(44,31,24,0.22)]", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.85" stopColor="#d9d0c4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c9beb0" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`c-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <rect x="6" y="104" width="108" height="130" rx="20" fill="#faf7f2" />
      <rect x="6" y="104" width="108" height="130" rx="20" fill={`url(#g-${id})`} />
      <rect x="18" y="116" width="8" height="100" rx="4" fill="#fff" opacity="0.9" />
      <rect x="34" y="86" width="52" height="22" rx="4" fill="#ebe4da" />
      <rect x="28" y="6" width="64" height="84" rx="10" fill={color} />
      <rect x="28" y="6" width="64" height="84" rx="10" fill={`url(#c-${id})`} />
      <rect x="36" y="12" width="7" height="70" rx="3.5" fill="#fff" opacity="0.35" />
      <text x="60" y="176" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" letterSpacing="3" fill="#b9ab9b">ML</text>
    </svg>
  );
}
