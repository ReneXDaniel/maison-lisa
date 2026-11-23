import type { MediaRef } from "./catalog";

export function mediaSrc(m: MediaRef | null | undefined, w = 1600) {
  if (!m) return { src: null, srcSet: null };
  const srcSet = [...m.variants].sort((a, b) => a.width - b.width).map((v) => `/api/media/${m.id}?w=${v.width} ${v.width}w`).join(", ");
  return { src: `/api/media/${m.id}?w=${w}`, srcSet };
}
