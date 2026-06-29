/**
 * Airship Design System — tokens extracted from the live console on
 * dashboard.airship.co.uk (Segments page), read via getComputedStyle and the
 * brand logo SVG. This is the documented source of truth; the Tailwind config
 * mirrors these values.
 *
 * The console is built on Bootstrap 4 + Tailwind. Most Bootstrap CSS variables
 * were stock defaults (--primary:#007bff etc.) and are NOT the real brand — the
 * values below are what the rendered components actually use.
 */
export const AIRSHIP_TOKENS = {
  fonts: {
    // Page titles use DIN-2014 (licensed) falling back to Lato.
    display: '"DIN-2014", Lato, sans-serif',
    // Nav / headings render in Lato; body uses the system stack at 16px.
    ui: "Lato, sans-serif",
    baseSize: "16px",
  },
  color: {
    canvas: "#f1f5f6", // body background
    surface: "#fafbfb", // cards / panels
    white: "#ffffff",
    textPrimary: "#212529",
    title: "#202c38",
    navy: "#354b64", // labels, nav items, links, secondary text
    actionBlue: "#38abff", // buttons, links, active nav, chevrons
    actionBlueDark: "#1e90e8",
    brandPurpleFrom: "#d14bea", // logo gradient start
    brandPurpleTo: "#8d00d4", // logo gradient end
    positiveGreen: "#71be37",
  },
  shape: {
    cardRadius: "9px",
    buttonRadius: "4.8px",
    badgeRadius: "4px",
    navWidth: "280px",
  },
  component: {
    // Ghost/outline button: transparent bg, ~1.8px blue border, blue 700 text.
    ghostButton: {
      border: "1.8px solid #38abff",
      color: "#38abff",
      fontWeight: 700,
      padding: "8px 19px",
      radius: "4.8px",
    },
    // Cards are flat: off-white, 9px radius, no shadow, hairline (or no) border.
    card: { background: "#fafbfb", radius: "9px", shadow: "none" },
    // Active nav item: white pill, subtle shadow, blue text + icon.
    activeNav: { background: "#ffffff", color: "#38abff" },
  },
  nav: {
    // Order/labels as they appear in the live left side-nav.
    items: [
      "Ask Airship",
      "Insights",
      "Segments",
      "Emails",
      "Journeys",
      "SMS campaigns",
      "Rewards",
      "Feedback",
      "Forms",
      "Database",
      "Tools",
      "Settings",
      "Console",
      "Help Academy",
    ],
  },
} as const;
