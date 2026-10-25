/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F4",
        wall: "#FFFFFF",
        ink: "#232629",
        graphite: "#5C6168",
        dust: "#C9CCCF",
        mist: "#E7E9E8",
        indigo: {
          ink: "#2A3590",
        },
      },
      fontFamily: {
        sans: ['"Familjen Grotesk Variable"', "system-ui", "sans-serif"],
        serif: ['"Literata Variable"', "Georgia", "serif"],
        cormorant: ['"Cormorant Garamond"', "Georgia", "serif"],
      },
      letterSpacing: {
        tightish: "-0.015em",
      },
      maxWidth: {
        page: "1480px",
      },
    },
  },
  plugins: [],
}
