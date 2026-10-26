"use client";

import { useEffect, useState } from "react";

const MIN_MS = 600;
const MAX_MS = 2500;

export function useIntroReady(heroSelector = "[data-hero-img]") {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();

    const fonts =
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready
        : Promise.resolve();

    const hero =
      typeof document !== "undefined"
        ? document.querySelector<HTMLImageElement>(heroSelector)
        : null;

    const heroReady = hero?.decode
      ? hero.decode().catch(() => {})
      : Promise.resolve();

    const failsafe = new Promise<void>((resolve) => setTimeout(resolve, MAX_MS));
    const assets = Promise.all([fonts, heroReady]).then(() => {});

    Promise.race([assets, failsafe]).then(() => {
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(() => {
        if (!cancelled) {
          setReady(true);
        }
      }, wait);
    });

    return () => {
      cancelled = true;
    };
  }, [heroSelector]);

  return ready;
}
