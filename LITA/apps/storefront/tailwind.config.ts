import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F4",
        wall: "#FFFFFF",
        ink: "#232629",
        graphite: "#5C6168",
        dust: "#C9CCCF",
        mist: "#E7E9E8",
        indigo: { ink: "#2A3590" },

        // Premium artwork redesign tokens
        gallery: {
          page: "#F6F3EE",       // Warm off-white (page background)
          sand: "#EAE5DC",       // Deeper sand (alternate sections)
          wall: "#ECE7DF",       // Gallery wall panel tone
          charcoal: "#2B2B2B",   // Charcoal (dark band, buttons, high-contrast text)
          accent: "#C8372D",     // Artwork warm red accent
          "accent-hover": "#A82C23",
          hairline: "#E2DDD4",   // 1px hairline border
          card: "#FAF8F5",       // Buy box card subtle background
          subtle: "#F5F1E9",     // Sub-panel background
          muted: "#6E685F",      // Muted secondary/spec text
          light: "#FDFCFB",
        },
      },
      fontFamily: {
        sans: ['"Familjen Grotesk Variable"', "Inter", "system-ui", "sans-serif"],
        hanken: ['"Hanken Grotesk"', '"Familjen Grotesk Variable"', "system-ui", "sans-serif"],
        serif: ['"Cormorant Garamond"', '"Literata Variable"', "Georgia", "serif"],
        cormorant: ['"Cormorant Garamond"', "Georgia", "serif"],
        display: ["var(--font-display)", '"Cormorant Garamond"', "Georgia", "serif"],
      },
      boxShadow: {
        artwork: "0 30px 60px rgba(0, 0, 0, 0.18), 0 8px 16px rgba(0, 0, 0, 0.12)",
        "artwork-lg": "0 36px 72px rgba(0, 0, 0, 0.22), 0 12px 24px rgba(0, 0, 0, 0.14)",
        "card-lift": "0 20px 40px -15px rgba(43, 43, 43, 0.08)",
        "btn-lift": "0 10px 24px -4px rgba(43, 43, 43, 0.35)",
      },
      letterSpacing: {
        tightish: "-0.015em",
        eyebrow: "0.12em",
      },
      maxWidth: {
        page: "1480px",
      },
    },
  },
  plugins: [],
};

export default config;
