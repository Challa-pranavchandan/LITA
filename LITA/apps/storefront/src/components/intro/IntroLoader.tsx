"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useIntro } from "./IntroProvider";
import { useIntroReady } from "@/hooks/useIntroReady";

// Register GSAP plugins safely in client environment
if (typeof window !== "undefined") {
  gsap.registerPlugin(Flip);
}

// ---- Tweakable constants & styling tokens ----
export const INTRO_CONFIG = {
  bg: "var(--intro-bg, #F7F3EC)", // Gallery warm cream / off-white
  fg: "var(--intro-fg, #111111)", // Deep gallery ink
  revealDuration: 1.0,           // Duration for "Livin In The Art" reveal
  holdDuration: 0.6,             // Pause holding the full brand name
  mergeDuration: 1.1,            // Travel & scale duration to navbar logo
  fadeDuration: 0.5,             // Overlay background fade-out duration
  storageKey: "lita-intro-seen", // Session storage cache key
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function IntroLoader() {
  const { logoRef, setIntroDone } = useIntro();
  const overlayRef = useRef<HTMLDivElement>(null);
  const litaRef = useRef<HTMLSpanElement>(null);
  const livinBrandRef = useRef<HTMLDivElement>(null);

  // Render overlay during SSR and initial hydration so the page never flashes
  const [skip, setSkip] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const forceReplay = urlParams.has("intro") || urlParams.has("replay");
      if (forceReplay) return false;
      return sessionStorage.getItem(INTRO_CONFIG.storageKey) === "1";
    } catch {
      return false;
    }
  });

  const ready = useIntroReady();

  // Evaluate whether to play the intro animation (run once on mount before paint)
  useIsomorphicLayoutEffect(() => {
    let seen = false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const forceReplay = urlParams.has("intro") || urlParams.has("replay");
      if (forceReplay) {
        sessionStorage.removeItem(INTRO_CONFIG.storageKey);
        seen = false;
      } else {
        seen = sessionStorage.getItem(INTRO_CONFIG.storageKey) === "1";
      }
    } catch {
      seen = false;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const navLogo = logoRef.current || document.getElementById("nav-logo");

    if (seen || prefersReducedMotion) {
      document.documentElement.classList.add("intro-done");
      document.body.style.overflow = "";
      setIntroDone(true);
      setSkip(true);
      if (navLogo) {
        navLogo.style.visibility = "visible";
      }
    } else {
      document.documentElement.classList.remove("intro-done");
      setSkip(false);
      document.body.style.overflow = "hidden";
      if (navLogo) {
        navLogo.style.visibility = "hidden";
      }
    }
  }, [logoRef, setIntroDone]);

  // Execute motion timeline once assets (fonts + hero image) are ready
  useEffect(() => {
    if (skip !== false || !ready) return;

    const overlay = overlayRef.current;
    const lita = litaRef.current;
    const livinBrand = livinBrandRef.current;

    if (!overlay || !lita || !livinBrand) return;

    // Apply performance hints
    livinBrand.style.willChange = "transform, opacity";
    lita.style.willChange = "opacity";

    const ctx = gsap.context(() => {
      const words = livinBrand.querySelectorAll<HTMLElement>("[data-word]");

      // Clean initial state: words are positioned 40px down and transparent
      gsap.set(words, { y: 40, opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => {
          document.documentElement.classList.add("intro-done");
          const logo = logoRef.current || document.getElementById("nav-logo");
          if (logo) logo.style.visibility = "visible";
          livinBrand.style.willChange = "auto";
          lita.style.willChange = "auto";
          document.body.style.overflow = "";
          try {
            sessionStorage.setItem(INTRO_CONFIG.storageKey, "1");
          } catch {}
          setIntroDone(true);
          setSkip(true); // Unmounts overlay from the DOM
        },
      });

      // 1) Masked slide-up reveal of "Livin In The Art"
      tl.to(words, {
        y: 0,
        opacity: 1,
        duration: INTRO_CONFIG.revealDuration,
        ease: "power3.out",
        stagger: 0.12,
      });

      // 2) Hold full brand name
      tl.to({}, { duration: INTRO_CONFIG.holdDuration });

      // 3) Fade "Lita" and fly "Livin In The Art" to the exact navbar logo slot
      tl.to(
        lita,
        {
          opacity: 0,
          duration: 0.45,
          ease: "power2.inOut",
        },
        "+=0"
      );

      tl.add(() => {
        const logo = logoRef.current || document.getElementById("nav-logo");
        if (!logo) {
          // If navbar logo is somehow not found, fade overlay directly
          return;
        }

        const from = livinBrand.getBoundingClientRect();
        const to = logo.getBoundingClientRect();

        const scale = to.height / from.height;
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);

        gsap.set(livinBrand, { transformOrigin: "50% 50%" });

        gsap.to(livinBrand, {
          x: `+=${dx}`,
          y: `+=${dy}`,
          scale: `*=${scale}`,
          duration: INTRO_CONFIG.mergeDuration,
          ease: "power4.inOut",
        });
      }, "<");

      // Advance timeline while the merge takes place
      tl.to({}, { duration: INTRO_CONFIG.mergeDuration });

      // 4) Swap visibility in the exact same frame (real navbar logo visible, animated text hidden)
      tl.add(() => {
        const logo = logoRef.current || document.getElementById("nav-logo");
        if (logo) logo.style.visibility = "visible";
        livinBrand.style.visibility = "hidden";
      });

      // 5) Fade out the full-screen overlay curtain to reveal the storefront
      tl.to(overlay, {
        opacity: 0,
        duration: INTRO_CONFIG.fadeDuration,
        ease: "power1.out",
      });
    }, overlayRef);

    return () => {
      document.body.style.overflow = "";
      ctx.revert();
    };
  }, [skip, ready, logoRef, setIntroDone]);

  // Clean unmount once complete or when skipped
  if (skip) return null;

  return (
    <div
      ref={overlayRef}
      id="intro-overlay"
      aria-hidden="true"
      style={{
        backgroundColor: INTRO_CONFIG.bg,
        color: INTRO_CONFIG.fg,
        height: "100dvh",
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden select-none pointer-events-auto"
    >
      <div className="relative flex flex-col items-center justify-center text-center px-4">
        {/* Anchor brand monogram / acronym */}
        <span
          ref={litaRef}
          className="font-display font-normal tracking-tight inline-block select-none leading-none mb-3 sm:mb-4 will-change-transform text-[#111111]"
          style={{
            fontSize: "clamp(3.8rem, 15vw, 11rem)",
          }}
        >
          Lita
        </span>

        {/* Revealed full brand name wordmark that merges into the navbar logo */}
        <div
          ref={livinBrandRef}
          className="font-display inline-flex items-baseline justify-center gap-[0.3em] select-none whitespace-nowrap will-change-transform text-[#111111]"
          style={{
            fontSize: "clamp(1.5rem, 4.5vw, 3.6rem)",
            lineHeight: 1.2,
          }}
        >
          {["Livin", "In", "The", "Art"].map((word) => (
            <span
              key={word}
              className="overflow-hidden inline-block py-1"
              style={{ verticalAlign: "bottom" }}
            >
              <span
                data-word
                className="inline-block will-change-transform leading-none font-normal tracking-wide"
              >
                {word}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
