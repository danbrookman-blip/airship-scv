/**
 * Airship-style wordmark. Recreated as a purple-gradient hexagon outline + the
 * "AIRSHIP" wordmark (the brand uses a #d14bea→#8d00d4 gradient). This is a
 * tasteful stand-in for the trademarked logo, not a copy of the asset.
 */
export function BrandLogo() {
  return (
    <svg width="120" height="46" viewBox="0 0 120 46" fill="none" aria-label="Airship" role="img">
      <defs>
        <linearGradient id="ap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d14bea" />
          <stop offset="100%" stopColor="#8d00d4" />
        </linearGradient>
      </defs>
      {/* Elongated hexagon outline */}
      <path
        d="M14 4 H106 L116 23 L106 42 H14 L4 23 Z"
        stroke="url(#ap)"
        strokeWidth="2.5"
        fill="none"
      />
      <text
        x="60"
        y="29"
        textAnchor="middle"
        fontFamily="'DIN-2014', Lato, sans-serif"
        fontSize="17"
        fontWeight="800"
        letterSpacing="3"
        fill="url(#ap)"
      >
        AIRSHIP
      </text>
    </svg>
  );
}
