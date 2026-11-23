import { anklet, commonDefs, label, LEG_PATH, PALETTES, polishBottle, ribbon, satinDefs, satinRect, windowShadow, type Palette } from "./art";

export type Kind = "drape" | "leg" | "foot" | "stilllife" | "lace" | "shadow" | "pair";

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

function legGroup(x: number, y: number, scale: number, fill: string, opts: { rim?: string; rotate?: number; stocking?: string } = {}) {
  const r = opts.rotate ?? 0;
  return `<g transform="translate(${x} ${y}) rotate(${r} 300 800) scale(${scale})">
    <path d="${LEG_PATH}" fill="#000" opacity="0.22" transform="translate(28 22)" filter="url(#blur30)"/>
    <path d="${LEG_PATH}" fill="${fill}"/>
    <path d="${LEG_PATH}" fill="url(#legShade)"/>
    ${opts.stocking ? `<path d="${LEG_PATH}" fill="${opts.stocking}" opacity="0.55"/><path d="M196 330 C250 318 320 318 362 330" stroke="${opts.stocking}" stroke-width="26" fill="none" opacity="0.8"/>` : ""}
    ${opts.rim ? `<path d="${LEG_PATH}" fill="none" stroke="${opts.rim}" stroke-width="3" opacity="0.55"/>` : ""}
  </g>`;
}

/** Builds one demo composition as an SVG string. */
export function compose(kind: Kind, paletteName: keyof typeof PALETTES, w: number, h: number, seed: number): string {
  const p: Palette = PALETTES[paletteName]!;
  const defs = `<defs>${commonDefs}${satinDefs("s", p, seed, kind === "lace" ? "0.003 0.006" : "0.0014 0.008", (seed % 5) * 9 - 18)}
    <pattern id="lace" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="18" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.5"/><circle cx="0" cy="0" r="10" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity="0.4"/><circle cx="60" cy="60" r="10" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity="0.4"/></pattern>
    <linearGradient id="legShade" x1="0.2" y1="0" x2="0.75" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.32"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient>
  </defs>`;
  const base = `<g transform="translate(-60 -60)">${satinRect("s", w + 120, h + 120)}</g>`;
  const finish = `<rect width="${w}" height="${h}" fill="url(#vignette)"/><rect width="${w}" height="${h}" filter="url(#grain)"/>${label(w, h, p.label)}`;
  const legScale = (h * 0.95) / 1600;

  switch (kind) {
    case "drape":
      return svg(w, h, `${defs}${base}<text x="${w / 2}" y="${h * 0.52}" text-anchor="middle" font-family="Didot, 'Bodoni 72', Georgia, serif" font-size="${w / 6}" fill="${p.accent}" opacity="0.18" letter-spacing="${w / 60}">ML</text>${finish}`);
    case "leg":
      return svg(w, h, `${defs}${base}${legGroup(w * 0.5 - 300 * legScale, h * 0.04, legScale, p.figure, { rim: p.sheen, rotate: (seed % 3) * 4 - 4 })}${finish}`);
    case "pair":
      return svg(w, h, `${defs}${base}${legGroup(w * 0.38 - 300 * legScale, h * 0.06, legScale, p.figure, { rotate: -6 })}${legGroup(w * 0.62 - 300 * legScale, h * 0.02, legScale, p.figure, { rim: p.sheen, rotate: 5 })}${finish}`);
    case "lace":
      return svg(w, h, `${defs}${base}<rect width="${w}" height="${h}" fill="url(#lace)" opacity="0.5"/>${legGroup(w * 0.5 - 300 * legScale, h * 0.03, legScale, p.figure, { stocking: "#1d140f", rotate: 3 })}${finish}`);
    case "shadow":
      return svg(w, h, `${defs}${base}${legGroup(w * 0.52 - 300 * legScale, h * 0.04, legScale, p.figure, { rotate: -3 })}${windowShadow(w, h)}${finish}`);
    case "foot": {
      const s = (h * 1.9) / 1600;
      return svg(
        w,
        h,
        `${defs}${base}<g transform="translate(${w * 0.02} ${-h * 1.05}) rotate(-38 ${w * 0.5} ${h * 1.6})">${legGroup(0, 0, s, p.figure, { rim: p.sheen })}</g>${anklet(w * 0.36, h * 0.47, w * 0.075, w * 0.03, p.accent)}${finish}`,
      );
    }
    case "stilllife": {
      const s = w / 900;
      return svg(
        w,
        h,
        `${defs}${base}<path d="M${w * 1.02} ${h * 0.02} C${w * 0.86} ${h * 0.18} ${w * 0.98} ${h * 0.34} ${w * 0.84} ${h * 0.5}" stroke="#1d140f" stroke-width="${w * 0.07}" fill="none" opacity="0.38" stroke-linecap="round"/><path d="M${w * 1.02} ${h * 0.02} C${w * 0.86} ${h * 0.18} ${w * 0.98} ${h * 0.34} ${w * 0.84} ${h * 0.5}" stroke="#1d140f" stroke-width="2" fill="none" opacity="0.6"/>${ribbon(w * 0.05, h * 0.72, w * 0.9, p.accent)}${polishBottle(w * 0.28, h * 0.32, s * 1.6, "#9E1B2A")}${polishBottle(w * 0.5, h * 0.38, s * 1.3, "#D9C3A1")}${polishBottle(w * 0.66, h * 0.44, s * 1.05, "#17120F")}${anklet(w * 0.3, h * 0.82, w * 0.12, w * 0.035, p.accent)}${finish}`,
      );
    }
  }
}

/** Top-down foot with five toes for the Nail Studio. Returns base art and a matching nail mask. */
export function nailStudio(w: number, h: number) {
  const toes = [
    { cx: 0.33, cy: 0.62, rx: 0.075, ry: 0.11, rot: -8 },
    { cx: 0.455, cy: 0.66, rx: 0.058, ry: 0.088, rot: -3 },
    { cx: 0.56, cy: 0.69, rx: 0.052, ry: 0.078, rot: 2 },
    { cx: 0.65, cy: 0.71, rx: 0.046, ry: 0.07, rot: 7 },
    { cx: 0.73, cy: 0.72, rx: 0.04, ry: 0.06, rot: 12 },
  ];
  const nails = toes.map((t) => ({ cx: t.cx * w, cy: (t.cy + t.ry * 0.38) * h, rx: t.rx * w * 0.62, ry: t.ry * h * 0.42, rot: t.rot }));
  const p = PALETTES.ivory!;
  const skin = `<radialGradient id="skin" cx="0.45" cy="0.35" r="0.8"><stop offset="0" stop-color="#ecd3bf"/><stop offset="0.7" stop-color="#d9b69c"/><stop offset="1" stop-color="#c49b80"/></radialGradient>
    <radialGradient id="toe" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#efd8c5"/><stop offset="1" stop-color="#cfa98d"/></radialGradient>
    <radialGradient id="nail" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#f6e4dc"/><stop offset="1" stop-color="#e1c3b6"/></radialGradient>`;
  const foot = `<path d="M${w * 0.24} ${h * 0.02} C${w * 0.22} ${h * 0.25} ${w * 0.22} ${h * 0.45} ${w * 0.27} ${h * 0.6} L${w * 0.79} ${h * 0.68} C${w * 0.82} ${h * 0.5} ${w * 0.76} ${h * 0.25} ${w * 0.7} ${h * 0.02} Z" fill="url(#skin)"/>`;
  const toeShapes = toes
    .map(
      (t) => `<g transform="rotate(${t.rot} ${t.cx * w} ${t.cy * h})">
        <ellipse cx="${t.cx * w + 6}" cy="${t.cy * h + 10}" rx="${t.rx * w}" ry="${t.ry * h}" fill="#7a5a45" opacity="0.25" filter="url(#blur8)"/>
        <ellipse cx="${t.cx * w}" cy="${t.cy * h}" rx="${t.rx * w}" ry="${t.ry * h}" fill="url(#toe)"/></g>`,
    )
    .join("");
  const nailShapes = (fill: string, withShine: boolean) =>
    nails
      .map(
        (n) => `<g transform="rotate(${n.rot} ${n.cx} ${n.cy})"><rect x="${n.cx - n.rx}" y="${n.cy - n.ry}" width="${n.rx * 2}" height="${n.ry * 2}" rx="${n.rx * 0.9}" fill="${fill}"/>
        ${withShine ? `<rect x="${n.cx - n.rx * 0.55}" y="${n.cy - n.ry * 0.75}" width="${n.rx * 0.28}" height="${n.ry * 1.1}" rx="${n.rx * 0.14}" fill="#fff" opacity="0.55"/>` : ""}</g>`,
      )
      .join("");
  const defs = `<defs>${commonDefs}${skin}${satinDefs("s", p, 11, "0.0012 0.007", 10)}</defs>`;
  const baseSvg = svg(w, h, `${defs}${satinRect("s", w, h)}${foot}${toeShapes}${nailShapes("url(#nail)", true)}<rect width="${w}" height="${h}" filter="url(#grain)"/>${label(w, h, p.label)}`);
  const maskSvg = svg(w, h, `<defs><filter id="soft"><feGaussianBlur stdDeviation="0.8"/></filter></defs><rect width="${w}" height="${h}" fill="#000"/><g filter="url(#soft)">${nailShapes("#fff", false)}</g>`);
  return { baseSvg, maskSvg };
}
