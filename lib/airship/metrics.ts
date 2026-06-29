/**
 * Pure rollup maths. Given a set of raw contacts (however the live client
 * shapes them), produce the per-segment numbers the SCV renders.
 *
 * Kept free of any Airship/HTTP specifics so the formulas are obvious and the
 * live client can feed it whatever it pulls back.
 */

import type { AgeBand, GenderSplit, MovementPoint, MovementWindowDays, SegmentSummary } from "./types";

/** The trailing windows (in days) shown in the movement strip. */
export const MOVEMENT_WINDOWS: MovementWindowDays[] = [7, 14, 30, 60, 90];

/** Minimal raw contact shape the rollup needs. The live client maps the real
 *  Airship contact payload down to this. */
export interface RawContact {
  id: string;
  /** Known Spend attributed to this contact, in £. */
  knownSpend: number;
  /** Proof of Presence visits for this contact. */
  visits: number;
  /** Campaign clicks (email/SMS) attributed to this contact. */
  clicks: number;
  /** ISO date of birth, or null if unknown. */
  dateOfBirth: string | null;
  gender: "female" | "male" | "other" | "unknown";
  /** ISO date the contact record was created (for tenure). */
  createdAt: string;
  /** Region/town label, or null. */
  location: string | null;
}

const AGE_BAND_EDGES: Array<[number, number, string]> = [
  [0, 17, "Under 18"],
  [18, 24, "18–24"],
  [25, 34, "25–34"],
  [35, 44, "35–44"],
  [45, 54, "45–54"],
  [55, 64, "55–64"],
  [65, 200, "65+"],
];

/** Whole years between an ISO date and `now`. */
export function yearsBetween(iso: string, now: Date): number {
  const then = new Date(iso);
  let age = now.getFullYear() - then.getFullYear();
  const m = now.getMonth() - then.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < then.getDate())) age--;
  return age;
}

/** Whole months between an ISO date and `now`. */
export function monthsBetween(iso: string, now: Date): number {
  const then = new Date(iso);
  return (
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth())
  );
}

/** Whole days between an ISO date and `now`. */
export function daysBetween(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Best-effort movement from contact sign-up dates: net-new contacts within each
 * trailing window as a share of the segment. This is a GROWTH proxy — it can
 * only show increase, never churn-driven decline, because a current snapshot
 * has no record of contacts that LEFT the segment. True movement needs
 * historical segment-size snapshots (see README). Used by the live client.
 */
export function movementFromSignups(contacts: RawContact[], now: Date): MovementPoint[] {
  const size = contacts.length || 1;
  const ages = contacts.map((c) => daysBetween(c.createdAt, now));
  return MOVEMENT_WINDOWS.map((windowDays) => ({
    windowDays,
    changePct: ages.filter((d) => d >= 0 && d <= windowDays).length / size,
  }));
}

function bandFor(age: number): string {
  for (const [lo, hi, label] of AGE_BAND_EDGES) {
    if (age >= lo && age <= hi) return label;
  }
  return "65+";
}

function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Roll a segment's contacts up into a SegmentSummary.
 *
 * @param totalBaseContacts total contactable base (for shareOfBase). Pass the
 *   segment count itself if you don't have the global figure.
 * @param now injected so the result is deterministic and testable.
 */
export function summariseSegment(
  segment: { id: string; name: string; description: string },
  contacts: RawContact[],
  totalBaseContacts: number,
  now: Date,
  movement: MovementPoint[]
): SegmentSummary {
  const contactCount = contacts.length;

  const knownSpend = contacts.reduce((s, c) => s + c.knownSpend, 0);
  const popVisits = contacts.reduce((s, c) => s + c.visits, 0);
  const totalClicks = contacts.reduce((s, c) => s + c.clicks, 0);

  // Headline: spend per visit. Guard divide-by-zero — a segment with no logged
  // visits has an undefined per-visit value, which we surface as 0.
  const avgSpendPerVisit = popVisits > 0 ? knownSpend / popVisits : 0;
  const valuePerCustomer = contactCount > 0 ? knownSpend / contactCount : 0;
  const avgVisitsPerCustomer = contactCount > 0 ? popVisits / contactCount : 0;
  // Click-to-visit: of clicks, the share that became a visit.
  const clickToVisitRate = totalClicks > 0 ? popVisits / totalClicks : 0;

  // Age + bands (only over contacts with a DOB).
  const ages = contacts
    .filter((c) => c.dateOfBirth)
    .map((c) => yearsBetween(c.dateOfBirth as string, now));
  const avgAge = ages.length
    ? round(ages.reduce((s, a) => s + a, 0) / ages.length)
    : null;

  const bandCounts = new Map<string, number>();
  for (const age of ages) {
    const label = bandFor(age);
    bandCounts.set(label, (bandCounts.get(label) ?? 0) + 1);
  }
  const ageBands: AgeBand[] = AGE_BAND_EDGES.map(([, , label]) => ({
    label,
    count: bandCounts.get(label) ?? 0,
  })).filter((b) => b.count > 0);

  const genderSplit: GenderSplit = { female: 0, male: 0, other: 0, unknown: 0 };
  for (const c of contacts) genderSplit[c.gender]++;

  const tenures = contacts.map((c) => monthsBetween(c.createdAt, now));
  const avgTenureMonths = tenures.length
    ? round(tenures.reduce((s, t) => s + t, 0) / tenures.length)
    : 0;

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    contactCount,
    shareOfBase: totalBaseContacts > 0 ? contactCount / totalBaseContacts : 0,
    knownSpend: round(knownSpend),
    popVisits,
    avgSpendPerVisit: round(avgSpendPerVisit, 2),
    valuePerCustomer: round(valuePerCustomer, 2),
    avgVisitsPerCustomer: round(avgVisitsPerCustomer, 1),
    clickToVisitRate: round(clickToVisitRate, 3),
    movement,
    avgAge,
    ageBands,
    genderSplit,
    avgTenureMonths,
  };
}
