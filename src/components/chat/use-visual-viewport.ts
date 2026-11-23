"use client";
import { useEffect, useState } from "react";

/**
 * Tracks the visual viewport so the full-screen mobile chat keeps its input
 * above the on-screen keyboard (iOS Safari does not resize the layout viewport).
 */
export function useVisualViewportHeight() {
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setH(vv.height);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return h;
}
