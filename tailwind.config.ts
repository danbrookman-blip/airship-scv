import type { Config } from "tailwindcss";

/**
 * Airship Design System tokens — extracted from the live console
 * (dashboard.airship.co.uk) via getComputedStyle + the brand logo SVG.
 * See lib/airship/design-tokens.ts for the documented source values.
 */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: "#f1f5f6", // body background
        surface: "#fafbfb", // card / panel surface (near-white, flat)
        // Text
        ink: "#212529", // primary body text
        title: "#202c38", // page titles
        navy: "#354b64", // labels, nav items, secondary text, links
        // Interactive
        brandblue: {
          DEFAULT: "#38abff", // actions, links, active nav, ghost-button accent
          dark: "#1e90e8",
        },
        // Brand purple (logo gradient #d14bea → #8d00d4); used for accents/badges
        brand: {
          from: "#d14bea",
          to: "#8d00d4",
          DEFAULT: "#a31fd8",
          soft: "#f4e6fb",
        },
        // Status
        positive: "#71be37", // Airship green
        warning: "#ffc107",
        danger: "#dc3545",
      },
      borderRadius: {
        card: "9px", // Airship card radius
        btn: "5px", // ghost-button radius (~4.8px)
        badge: "4px",
      },
      fontFamily: {
        sans: ["var(--font-lato)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"DIN-2014"', "var(--font-lato)", "sans-serif"],
      },
      boxShadow: {
        // Airship cards are essentially flat; a hairline lift on hover only.
        card: "0 1px 2px rgba(32,44,56,0.04)",
        pill: "0 2px 6px rgba(32,44,56,0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
