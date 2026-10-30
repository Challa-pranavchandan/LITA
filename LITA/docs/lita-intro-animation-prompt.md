# Lita Intro Animation: Complete Prompt and Instructions

Use this file in two ways:
1. **Part A** is a ready-to-paste prompt for Claude Code, Cursor, or any AI coding tool.
2. **Part B** is the full spec and reference notes, so you can build it by hand or review what the AI produces.

---

# PART A: Prompt to paste into your AI coding tool

```
You are a senior front-end engineer who specializes in creative, high-end motion design for art and portfolio websites.

## Project context
I'm building an e-commerce website for artworks and gifts called "Lita" (full name: "Living in the Art").
Stack: Next.js (App Router) + TypeScript + Tailwind CSS. Backend/commerce pieces (Medusa JS, Supabase, Cloudinary) are separate and not part of this task.

## Task
Build a first-load intro animation (preloader) with a shared-element transition into the navbar logo.

## Required behavior (in order)
1. On first load, a full-screen overlay covers the page. The word "Lita" is displayed in very large type, centered on screen (roughly 18-25vw font size, one line).
2. While the overlay is showing, the real site loads underneath it. The reveal must be tied to actual readiness (fonts loaded + hero image decoded), with a minimum display time of 1800ms so it never flashes.
3. Once ready, the remaining words of the name reveal themselves around/after "Lita" so the full name "Living in the Art" appears. "Lita" stays in place as the anchor. Use a masked, staggered reveal (words or letters sliding up from a clipped line), duration about 0.9-1.2s, easing power3.out or a custom cubic-bezier.
4. After a short hold (about 0.6s), the extra words fade/slide out and the word "Lita" shrinks and travels to the top-right corner, merging into the logo slot in the navbar. This must be a true shared-element transition: the animated text must land exactly on the navbar logo's position and size, then the navbar logo becomes visible and the animated copy is removed with no visual jump.
5. The overlay fades out (or wipes away) and the homepage is revealed. Optionally stagger-animate the hero content in.
6. Body scroll is locked during the intro and restored at the end.

## Technical requirements
- Use GSAP (core) + the Flip plugin. Register plugins in a client component only.
- Create these files:
  - `components/intro/IntroLoader.tsx` (client component; overlay + timeline)
  - `components/layout/Navbar.tsx` (contains the logo target with `id="nav-logo"` or a ref via context)
  - `components/intro/IntroProvider.tsx` (React context sharing the logo ref and an `introDone` flag)
  - `hooks/useIntroReady.ts` (resolves when fonts + hero image are ready)
- Mount `IntroLoader` in `app/layout.tsx` above `{children}`. The real page content must render in the DOM underneath (SSR-friendly, SEO-safe). The overlay only visually covers it.
- Play only once per session: store `sessionStorage.setItem("lita-intro-seen", "1")`. If it is already set, skip the intro entirely and render the navbar logo immediately. Wrap storage access in try/catch.
- Respect `prefers-reduced-motion: reduce`: skip the animation, show the final state immediately.
- Use `document.fonts.ready` plus a preloaded display font via `next/font` to avoid a font swap flash mid-animation.
- Use `gsap.context()` inside `useLayoutEffect`/`useEffect` and return `ctx.revert()` for cleanup (React strict mode safe, no double-play).
- Hide the real navbar logo (`visibility: hidden`) until the animated "Lita" lands, then swap visibility in the same frame.
- Calculate the end position from `getBoundingClientRect()` of the navbar logo at runtime, so it works at every breakpoint (desktop, tablet, mobile). Recompute on resize only if the intro is still running.
- Only animate `transform` and `opacity` (no layout-thrashing properties). Add `will-change: transform` during the animation and remove it afterward.
- Use `100dvh` for the overlay so it is correct on mobile browsers with dynamic toolbars.
- Add `aria-hidden="true"` to the overlay and make sure focus is not trapped. Remove the overlay from the DOM when finished.
- Add a failsafe: if readiness is not reached within 6s, run the reveal anyway.

## Design direction
- Background: off-white/cream (#F7F3EC) or near-black, configurable via CSS variables.
- Display type: an elegant serif or expressive display font (for example Playfair Display, Cormorant Garamond, or Fraunces), loaded via `next/font/google`.
- Keep it minimal. The feel should be gallery-like, calm and confident, not flashy.
- Expose timings and colors as constants at the top of `IntroLoader.tsx` so I can tweak them easily.

## Deliverables
1. All files listed above, complete and working.
2. Install commands (`npm i gsap`).
3. A short explanation of how the timeline is structured and where to adjust timings.
4. A test checklist (below) with notes on anything I should verify manually.

## Test checklist to satisfy
- Intro plays on first visit and not on reload or navigation within the same session.
- No layout shift or flash of unstyled text.
- Lands exactly on the navbar logo on desktop and mobile widths (375px, 768px, 1440px).
- Works with reduced-motion enabled.
- No console warnings in React strict mode (dev).
- Lighthouse performance is not noticeably hurt (the overlay must not block LCP content from loading).

Before writing code, briefly state your plan. Then output the code file by file.
```

---

# PART B: Full spec and implementation notes

## 1. Concept summary

| Phase | What the user sees | Approx. time |
|---|---|---|
| 0. Cover | Full-screen overlay, huge "Lita" centered | 0 - 0.4s |
| 1. Load | "Lita" holds while fonts/images load (minimum 1.8s) | until ready |
| 2. Reveal | "Living in the Art" words reveal around "Lita" (masked slide-up, staggered) | ~1s |
| 3. Hold | Full name visible | ~0.6s |
| 4. Merge | Extra words fade out, "Lita" shrinks and flies to the top-right navbar logo | ~1.1s |
| 5. Handoff | Real logo appears, animated copy removed, overlay fades, homepage revealed | ~0.5s |

**Total:** about 4-5 seconds on first visit only. Instant on later visits in the same session.

> Assumption: the full brand name is "Lita: Living in the Art", and the navbar logo is the word "Lita" (or a Lita wordmark). If your logo is a symbol or monogram instead, see section 7.

## 2. Install

```bash
npm i gsap
```

GSAP's core and plugins (including Flip) are now free to use, so no paid club plugin is needed.

## 3. Recommended file structure

```
app/
  layout.tsx
  page.tsx
components/
  intro/
    IntroLoader.tsx
    IntroProvider.tsx
  layout/
    Navbar.tsx
hooks/
  useIntroReady.ts
```

## 4. Reference implementation (starting point)

The AI tool should produce something at least this complete. Use it to review the output.

### `components/intro/IntroProvider.tsx`

```tsx
"use client";
import { createContext, useContext, useRef, useState, ReactNode } from "react";

type IntroCtx = {
  logoRef: React.RefObject<HTMLElement | null>;
  introDone: boolean;
  setIntroDone: (v: boolean) => void;
};

const Ctx = createContext<IntroCtx | null>(null);

export function IntroProvider({ children }: { children: ReactNode }) {
  const logoRef = useRef<HTMLElement | null>(null);
  const [introDone, setIntroDone] = useState(false);
  return (
    <Ctx.Provider value={{ logoRef, introDone, setIntroDone }}>
      {children}
    </Ctx.Provider>
  );
}

export const useIntro = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIntro must be used inside IntroProvider");
  return c;
};
```

### `hooks/useIntroReady.ts`

```ts
"use client";
import { useEffect, useState } from "react";

const MIN_MS = 1800;
const MAX_MS = 6000;

export function useIntroReady(heroSelector = "[data-hero-img]") {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();

    const fonts = document.fonts?.ready ?? Promise.resolve();
    const hero = document.querySelector<HTMLImageElement>(heroSelector);
    const heroReady = hero?.decode ? hero.decode().catch(() => {}) : Promise.resolve();

    const failsafe = new Promise<void>((r) => setTimeout(r, MAX_MS));
    const assets = Promise.all([fonts, heroReady]).then(() => {});

    Promise.race([assets, failsafe]).then(() => {
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(() => !cancelled && setReady(true), wait);
    });

    return () => {
      cancelled = true;
    };
  }, [heroSelector]);

  return ready;
}
```

### `components/intro/IntroLoader.tsx`

```tsx
"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useIntro } from "./IntroProvider";
import { useIntroReady } from "@/hooks/useIntroReady";

// ---- Tweakable constants ----
const BG = "#F7F3EC";
const FG = "#1a1a1a";
const REVEAL_DUR = 1.0;
const HOLD = 0.6;
const MERGE_DUR = 1.1;
const FADE_DUR = 0.5;
const STORAGE_KEY = "lita-intro-seen";

export default function IntroLoader() {
  const { logoRef, setIntroDone } = useIntro();
  const overlayRef = useRef<HTMLDivElement>(null);
  const litaRef = useRef<HTMLSpanElement>(null);
  const extraRef = useRef<HTMLDivElement>(null);
  const [skip, setSkip] = useState<boolean | null>(null);
  const ready = useIntroReady();

  // Decide whether to play
  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) {
      setIntroDone(true);
      setSkip(true);
    } else {
      setSkip(false);
      document.body.style.overflow = "hidden";
      if (logoRef.current) logoRef.current.style.visibility = "hidden";
    }
  }, [logoRef, setIntroDone]);

  // Run the timeline once ready
  useEffect(() => {
    if (skip !== false || !ready) return;
    const overlay = overlayRef.current!;
    const lita = litaRef.current!;
    const extra = extraRef.current!;
    const logo = logoRef.current;
    if (!logo) return;

    const ctx = gsap.context(() => {
      const words = extra.querySelectorAll("[data-word]");
      gsap.set(words, { yPercent: 110 });

      const tl = gsap.timeline({
        onComplete: () => {
          logo.style.visibility = "visible";
          document.body.style.overflow = "";
          try {
            sessionStorage.setItem(STORAGE_KEY, "1");
          } catch {}
          setIntroDone(true);
          setSkip(true); // unmounts overlay
        },
      });

      // 1) Reveal the rest of the name
      tl.to(words, {
        yPercent: 0,
        duration: REVEAL_DUR,
        ease: "power3.out",
        stagger: 0.12,
      });

      // 2) Hold, then fade extra words
      tl.to(words, { yPercent: -110, duration: 0.6, ease: "power3.in", stagger: 0.06 }, `+=${HOLD}`);

      // 3) Fly "Lita" to the navbar logo (measure at this moment)
      tl.add(() => {
        const from = lita.getBoundingClientRect();
        const to = logo.getBoundingClientRect();
        const scale = to.height / from.height;
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        gsap.to(lita, {
          x: `+=${dx}`,
          y: `+=${dy}`,
          scale: `*=${scale}`,
          duration: MERGE_DUR,
          ease: "power4.inOut",
        });
      });
      tl.to({}, { duration: MERGE_DUR });

      // 4) Fade overlay background, swap to the real logo
      tl.add(() => {
        logo.style.visibility = "visible";
        lita.style.visibility = "hidden";
      });
      tl.to(overlay, { opacity: 0, duration: FADE_DUR, ease: "power1.out" });
    }, overlayRef);

    return () => ctx.revert();
  }, [skip, ready, logoRef, setIntroDone]);

  if (skip !== false) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      style={{ background: BG, color: FG, height: "100dvh" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
    >
      <div className="flex items-baseline gap-[2vw] leading-none">
        <span
          ref={litaRef}
          className="font-display will-change-transform"
          style={{ fontSize: "clamp(6rem, 22vw, 20rem)" }}
        >
          Lita
        </span>
        <div
          ref={extraRef}
          className="flex gap-[1.2vw] font-display"
          style={{ fontSize: "clamp(1rem, 3vw, 3rem)" }}
        >
          {["Living", "in", "the", "Art"].map((w) => (
            <span key={w} className="overflow-hidden inline-block">
              <span data-word className="inline-block will-change-transform">
                {w}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

> Note: the `+=dx` relative values and `*=` scale are GSAP relative-value syntax. If your layout differs (for example "Lita" is not centered alone because the extra words sit beside it), recalculate from `getBoundingClientRect()` as shown. Tune the layout so the final visual feels right.

### `components/layout/Navbar.tsx` (logo target)

```tsx
"use client";
import { useIntro } from "../intro/IntroProvider";

export default function Navbar() {
  const { logoRef } = useIntro();
  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4">
      <nav>{/* left links */}</nav>
      <a
        href="/"
        ref={logoRef as React.RefObject<HTMLAnchorElement>}
        className="font-display text-2xl"
      >
        Lita
      </a>
    </header>
  );
}
```

### `app/layout.tsx`

```tsx
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { IntroProvider } from "@/components/intro/IntroProvider";
import IntroLoader from "@/components/intro/IntroLoader";
import Navbar from "@/components/layout/Navbar";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <IntroProvider>
          <IntroLoader />
          <Navbar />
          {children}
        </IntroProvider>
      </body>
    </html>
  );
}
```

In `tailwind.config`, map `fontFamily.display` to `var(--font-display)`.

## 5. How the timeline is structured

1. **Reveal:** words slide up from behind a clipped line (`overflow: hidden` wrapper plus `yPercent` animation).
2. **Hold:** a short pause so the full name is readable.
3. **Dismiss extras:** words slide out upward, leaving only "Lita".
4. **Merge:** runtime measurement of the "Lita" box and the navbar logo box gives exact x, y, and scale values, which is what makes the landing pixel-accurate.
5. **Handoff:** the real logo becomes visible in the same frame the animated copy is hidden, then the overlay fades.

## 6. Edge cases and pitfalls

| Issue | Fix |
|---|---|
| Logo jumps at the end | Swap visibility in the same frame; make sure font size and weight of the animated text match the navbar logo after scaling |
| Animation plays twice in dev | Use `gsap.context()` and `ctx.revert()`; React strict mode double-invokes effects |
| Layout shift when overlay unmounts | The overlay is `position: fixed`, so it should not affect layout. Don't conditionally render the navbar |
| Flash of wrong font | Use `next/font` with `preload: true` and wait on `document.fonts.ready` |
| Mobile toolbar resize glitches | Use `100dvh`, not `100vh` |
| Page scrolls during intro | Lock `body` overflow and restore on complete (also in cleanup) |
| SEO / LCP concerns | Page content stays in the HTML underneath; the overlay is only visual and `aria-hidden` |
| Visitors who dislike intros | Play once per session only; respect reduced-motion |
| Slow connection | 6s failsafe runs the reveal anyway |

## 7. Variations

- **Logo is an icon or monogram instead of text:** have the big "Lita" shrink and cross-fade into the icon at the end (animate opacity of the icon from 0 to 1 while the text scales down and fades).
- **Letter-by-letter reveal:** split text with GSAP SplitText (now free) and stagger by character for a more handwritten, artistic feel.
- **Hand-drawn feel:** use an SVG path with `stroke-dashoffset` animation so "Lita" draws itself like a pen stroke, and fills in afterward.
- **Framer Motion alternative:** wrap the big text and the nav logo in `motion.span` with the same `layoutId="lita"` and toggle between the two positions. Simpler code, less control over timing.
- **Wipe instead of fade:** animate the overlay with `clipPath: inset(0 0 100% 0)` for a curtain-lift effect.

## 8. Test checklist

- [ ] First visit: full sequence plays and lands on the logo
- [ ] Reload in the same tab: intro skipped, logo visible instantly
- [ ] New tab or private window: intro plays again
- [ ] Widths 375px, 768px, 1440px: landing is exact
- [ ] `prefers-reduced-motion` enabled: no animation
- [ ] Throttled network (Slow 4G in DevTools): reveal waits for the fonts, 6s failsafe works
- [ ] Next.js dev mode strict mode: no double animation or console warnings
- [ ] Lighthouse: no significant drop in performance or LCP
- [ ] Keyboard and screen reader: overlay does not trap focus or announce content

## 9. Suggested iteration prompts (after the first version works)

- "Make the reveal feel more like an art gallery: slower easing, a subtle paper-grain texture on the overlay, and a thin line that draws under 'Lita' before the words appear."
- "Add a stagger-in animation for the hero headline and navbar links after the overlay fades."
- "Make the intro background match my brand color tokens from `globals.css`."
- "Add a small progress hint (a thin line along the bottom) that fills as assets load."
