/** Minimal 18px stroke icons for the side nav, keyed by nav label. */
const PATHS: Record<string, React.ReactNode> = {
  "Ask Airship": <path d="M4 14a7 7 0 1 1 13-3.5M14 4l3 3-3 3" />,
  Insights: (
    <>
      <path d="M3 16V8M8 16V4M13 16v-6" />
    </>
  ),
  Segments: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="13" cy="6" r="2.2" />
      <path d="M3 16c0-2 1.5-3.5 3-3.5S9 14 9 16M11 16c0-2 1.5-3.5 3-3.5S17 14 17 16" />
    </>
  ),
  Emails: (
    <>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="M3 6l7 5 7-5" />
    </>
  ),
  Journeys: <path d="M5 16V7a3 3 0 0 1 6 0v6a3 3 0 0 0 6 0V4" />,
  "SMS campaigns": <path d="M3 4.5h14V13H8l-4 3v-3H3z" />,
  Rewards: <path d="M10 16s-6-3.7-6-8a3.2 3.2 0 0 1 6-1 3.2 3.2 0 0 1 6 1c0 4.3-6 8-6 8z" />,
  Feedback: (
    <>
      <path d="M3 4.5h14V13H6l-3 3z" />
    </>
  ),
  Forms: (
    <>
      <rect x="4" y="3" width="12" height="14" rx="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" />
    </>
  ),
  Database: (
    <>
      <ellipse cx="10" cy="5" rx="6" ry="2.2" />
      <path d="M4 5v10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5" />
    </>
  ),
  Tools: <path d="M12.5 3a3.5 3.5 0 0 0-3 5.3L3 14.8 5.2 17l6.5-6.5A3.5 3.5 0 1 0 12.5 3z" />,
  Settings: (
    <>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4" />
    </>
  ),
  Console: (
    <>
      <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
      <path d="M6 8l2.5 2L6 12M11 12h3" />
    </>
  ),
  "Help Academy": <path d="M3 7l7-3 7 3-7 3-7-3zM6 9v4c0 1 1.8 2 4 2s4-1 4-2V9" />,
};

export function NavIcon({ label }: { label: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {PATHS[label] ?? <circle cx="10" cy="10" r="3" />}
    </svg>
  );
}
