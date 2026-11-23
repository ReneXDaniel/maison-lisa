/**
 * Vector building blocks for the clearly-labelled demo artwork.
 * Everything here is illustration — no photographs of any person.
 */
export type Palette = { bg1: string; bg2: string; sheen: string; shadow: string; figure: string; accent: string; label: string };

export const PALETTES: Record<string, Palette> = {
  ivory: { bg1: "#f3ebe0", bg2: "#d9c8b2", sheen: "#fffaf2", shadow: "#a8927c", figure: "#3a2a20", accent: "#c9b299", label: "#8a7563" },
  champagne: { bg1: "#e6d3bb", bg2: "#b89c7d", sheen: "#fff4e3", shadow: "#7d6550", figure: "#2c1f18", accent: "#f3e6d2", label: "#6e5a49" },
  taupe: { bg1: "#b5a291", bg2: "#7f6a5b", sheen: "#eadccb", shadow: "#4f4036", figure: "#f3e9dc", accent: "#2c1f18", label: "#e2d5c3" },
  espresso: { bg1: "#4a372b", bg2: "#1d140f", sheen: "#c9b299", shadow: "#0f0a07", figure: "#e2d5c3", accent: "#c9b299", label: "#c9b299" },
  noir: { bg1: "#2f2620", bg2: "#120d0a", sheen: "#8f7a66", shadow: "#000", figure: "#c9b299", accent: "#e2d5c3", label: "#978171" },
};

/** Satin: turbulence height-map lit by a specular light, tinted by palette. */
export function satinDefs(id: string, p: Palette, seed: number, freq = "0.0016 0.009", angle = -18) {
  return `
  <linearGradient id="${id}-base" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/>
  </linearGradient>
  <filter id="${id}-satin" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="noise"/>
    <feGaussianBlur in="noise" stdDeviation="6" result="soft"/>
    <feSpecularLighting in="soft" surfaceScale="38" specularConstant="0.95" specularExponent="22" lighting-color="${p.sheen}" result="spec">
      <feDistantLight azimuth="${225 + angle}" elevation="38"/>
    </feSpecularLighting>
    <feDiffuseLighting in="soft" surfaceScale="30" diffuseConstant="1.05" lighting-color="#ffffff" result="diff">
      <feDistantLight azimuth="${225 + angle}" elevation="48"/>
    </feDiffuseLighting>
    <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="lit"/>
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
    <feBlend in="lit" in2="specIn" mode="screen"/>
  </filter>`;
}

export const satinRect = (id: string, w: number, h: number) => `<rect width="${w}" height="${h}" fill="url(#${id}-base)" filter="url(#${id}-satin)"/>`;

export { LEG_PATH } from "../../src/lib/art/leg";

export const label = (w: number, h: number, color: string) =>
  `<text x="${w - 36}" y="${h - 30}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(w / 90)}" letter-spacing="${Math.round(w / 300)}" fill="${color}" opacity="0.75">DEMO ARTWORK</text>`;

export function polishBottle(x: number, y: number, s: number, cap: string, body = "#f8f4ee") {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="60" cy="236" rx="62" ry="10" fill="#000" opacity="0.18"/>
    <rect x="0" y="92" width="120" height="142" rx="22" fill="${body}"/>
    <rect x="0" y="92" width="120" height="142" rx="22" fill="url(#glass)" opacity="0.55"/>
    <rect x="14" y="104" width="10" height="112" rx="5" fill="#fff" opacity="0.8"/>
    <rect x="36" y="74" width="48" height="24" rx="4" fill="#e9e2d8"/>
    <rect x="30" y="0" width="60" height="80" rx="10" fill="${cap}"/>
    <rect x="38" y="6" width="8" height="66" rx="4" fill="#fff" opacity="0.28"/>
  </g>`;
}

export function anklet(cx: number, cy: number, rx: number, ry: number, color = "#e9d8b8") {
  const beads = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return `<circle cx="${cx + Math.cos(a) * rx}" cy="${cy + Math.sin(a) * ry}" r="${Math.max(1.6, rx / 30)}" fill="${color}"/>`;
  }).join("");
  return `<g>${beads}<circle cx="${cx}" cy="${cy + ry + rx / 12}" r="${rx / 14}" fill="#fbf6ee" stroke="${color}" stroke-width="1.5"/></g>`;
}

export function ribbon(x: number, y: number, w: number, color: string) {
  return `<path d="M${x} ${y} C${x + w * 0.3} ${y - w * 0.18} ${x + w * 0.55} ${y + w * 0.22} ${x + w} ${y - w * 0.05}" stroke="${color}" stroke-width="${w / 18}" fill="none" stroke-linecap="round" opacity="0.92"/>
          <path d="M${x} ${y + w * 0.06} C${x + w * 0.3} ${y - w * 0.12} ${x + w * 0.55} ${y + w * 0.28} ${x + w} ${y + w * 0.01}" stroke="#fff" stroke-width="${w / 90}" fill="none" opacity="0.35"/>`;
}

export function windowShadow(w: number, h: number, opacity = 0.16) {
  const bars = Array.from({ length: 7 }, (_, i) => `<rect x="${-w * 0.2 + i * w * 0.18}" y="-${h * 0.2}" width="${w * 0.07}" height="${h * 1.6}" fill="#000"/>`).join("");
  return `<g transform="rotate(-24 ${w / 2} ${h / 2})" opacity="${opacity}" filter="url(#blur30)">${bars}</g>`;
}

export const commonDefs = `
  <linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#d8cfc3" stop-opacity="0.6"/></linearGradient>
  <filter id="blur30"><feGaussianBlur stdDeviation="30"/></filter>
  <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>`;
