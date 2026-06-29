/** Display formatting helpers, GB locale. */

export function gbp(n: number, opts?: { decimals?: boolean }): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(n);
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function integer(n: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(n));
}

export function percent(fraction: number, dp = 0): string {
  return `${(fraction * 100).toFixed(dp)}%`;
}

/** Signed percentage, e.g. +4.2% / −1.0%. Uses a true minus sign. */
export function signedPercent(fraction: number, dp = 1): string {
  const pct = fraction * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(dp)}%`;
}

/**
 * Format an ISO instant in a fixed locale + timezone so server and client
 * render identically (avoids React hydration mismatches from differing TZs).
 */
export function dateTimeLondon(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Months → "3y 2m" / "8m" style. */
export function tenure(months: number): string {
  if (months < 12) return `${months}m`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}y ${m}m` : `${y}y`;
}
