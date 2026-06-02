/**
 * Domain types for the Single Customer View.
 *
 * These describe the *rolled-up* shape the UI consumes — one summary per
 * segment. They are deliberately independent of Airship's raw API payloads so
 * that if the real API differs from our mapping we change the client, never the
 * UI. (Same adapter discipline as the foh-app project.)
 */

export type Gender = "female" | "male" | "other" | "unknown";

/** A coarse age band for distribution bars. */
export interface AgeBand {
  label: string; // e.g. "25–34"
  count: number;
}

export interface GenderSplit {
  female: number;
  male: number;
  other: number;
  unknown: number;
}

/** Trailing-window sizes (in days) used for the segment movement strip. */
export type MovementWindowDays = 7 | 14 | 30 | 60 | 90;

/**
 * Whether a segment grew or shrank over a trailing window.
 * `changePct` is a fraction: +0.04 = grew 4%, −0.02 = shrank 2%.
 */
export interface MovementPoint {
  windowDays: MovementWindowDays;
  changePct: number;
}

/**
 * Everything the SCV needs to render one segment card.
 *
 * Money is in minor units? No — kept in whole pounds (number) for prototype
 * simplicity; the real client rounds pence on the way out.
 */
export interface SegmentSummary {
  id: string;
  name: string;
  description: string;

  /** Number of contacts in the segment. */
  contactCount: number;

  /** Share of the total contactable base, 0..1. */
  shareOfBase: number;

  // ---- Value ----
  /** Total Known Spend attributed to the segment, in £. */
  knownSpend: number;
  /** Total Proof of Presence (PoP) visits across the segment. */
  popVisits: number;
  /**
   * HEADLINE metric: average spend per visit = knownSpend / popVisits, in £.
   * Answers "what is a single visit from this segment worth?".
   */
  avgSpendPerVisit: number;
  /** Secondary: total value per customer = knownSpend / contactCount, in £. */
  valuePerCustomer: number;
  /** Average visits per contact = popVisits / contactCount. */
  avgVisitsPerCustomer: number;
  /**
   * Click-to-visit rate, 0..1: of campaign clicks from this segment, the share
   * that converted into an actual visit (PoP). Engagement → footfall.
   */
  clickToVisitRate: number;

  // ---- Movement ----
  /** Segment size trend across trailing windows (7/14/30/60/90 days). */
  movement: MovementPoint[];

  // ---- Demographics ----
  /** Average guest age in years (null if no DOB data). */
  avgAge: number | null;
  ageBands: AgeBand[];
  genderSplit: GenderSplit;

  // ---- Lifecycle ----
  /** Average tenure (time as a contact) in months. */
  avgTenureMonths: number;
}

/** Top-of-page totals across all segments, for the header strip. */
export interface PortfolioTotals {
  totalContacts: number;
  totalKnownSpend: number;
  totalVisits: number;
  /** Blended avg spend per visit across the whole base, in £. */
  blendedSpendPerVisit: number;
  segmentCount: number;
}

export interface SingleCustomerView {
  totals: PortfolioTotals;
  segments: SegmentSummary[];
  /** "live" when served from the real Airship API, "sample" otherwise. */
  source: "live" | "sample";
  generatedAt: string; // ISO timestamp
}

/**
 * The adapter contract. Both the real Airship client and the sample provider
 * implement this. The UI/API layer only ever sees this interface.
 */
export interface AirshipAdapter {
  readonly source: "live" | "sample";
  getSingleCustomerView(): Promise<SingleCustomerView>;
}
