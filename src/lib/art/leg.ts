/**
 * Shared vector geometry of the stylised leg (side profile, heel raised,
 * toe pointed) used by the demo artwork generator, the "Behind the Silk"
 * procedural fallback and the Look Studio. Design box: 600 × 1600.
 */
export const LEG_BOX = { w: 600, h: 1600 } as const;

export const LEG_FRONT: [number, number][] = [
  [392, 0], [384, 250], [366, 480], [374, 545], [370, 600], [360, 650], [350, 760], [342, 900], [338, 1050], [334, 1180], [330, 1262],
  [348, 1330], [384, 1400], [428, 1470], [470, 1535], [500, 1584],
];
export const LEG_BACK: [number, number][] = [
  [508, 1600], [470, 1590], [420, 1552], [360, 1500], [306, 1446], [266, 1390], [244, 1345], [236, 1305], [240, 1262], [228, 1180], [214, 1050], [192, 900],
  [176, 760], [184, 690], [196, 640], [208, 560], [204, 480], [184, 250], [172, 0],
];

/** Catmull-Rom spline through points → smooth SVG path. */
export function spline(points: [number, number][], closed = true): string {
  const pts = closed ? [points[points.length - 1]!, ...points, points[0]!, points[1]!] : [points[0]!, ...points, points[points.length - 1]!];
  let d = `M${pts[1]![0]} ${pts[1]![1]}`;
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1]!, pts[i]!, pts[i + 1]!, pts[i + 2]!];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d + (closed ? " Z" : "");
}

export const LEG_PATH = spline([...LEG_FRONT, ...LEG_BACK]);

/** Horizontal extent of the leg (back x, front x) at height y — used to drape fabric folds. */
export function legSpanAt(y: number): [number, number] {
  const lerp = (pts: [number, number][], yy: number) => {
    const sorted = [...pts].sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < sorted.length - 1; i++) {
      const [x0, y0] = sorted[i]!;
      const [x1, y1] = sorted[i + 1]!;
      if (yy >= y0 && yy <= y1) return x0 + ((x1 - x0) * (yy - y0)) / Math.max(1, y1 - y0);
    }
    return sorted[yy < sorted[0]![1] ? 0 : sorted.length - 1]![0];
  };
  // the back contour is a function of y along its whole length (calf → heel → sole)
  const back = lerp(LEG_BACK, y);
  const front = lerp(LEG_FRONT, y);
  return [Math.min(back, front), Math.max(back, front)];
}
