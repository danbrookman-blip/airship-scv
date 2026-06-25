/**
 * Named Views — a client-side, localStorage-persisted layer over the segment
 * grid. A Named View is a saved collection of segment tiles the user can name
 * and switch between; the grid filters to the view's tiles and the totals strip
 * recomputes for that subset.
 *
 * Everything here is prototype state (no server round-trip). It follows the same
 * discipline as `scv:segment-order` — deterministic SSR defaults, then a load
 * from storage after mount so there's no hydration mismatch.
 */

import type { PortfolioTotals, SegmentSummary } from "@/lib/airship/types";

export interface NamedView {
  id: string;
  name: string;
  /** Segment ids that belong to this view (may reference archived/custom ones). */
  segmentIds: string[];
}

/** A tile's free position on the canvas, in px from the canvas top-left. */
export interface TilePos {
  x: number;
  y: number;
}
/** One view's arrangement: segment id → position. */
export type ViewLayout = Record<string, TilePos>;
/** All arrangements, keyed by view (or ALL_VIEW_KEY for "All segments"). */
export type Layouts = Record<string, ViewLayout>;

/** Layout key for the default "All segments" view. */
export const ALL_VIEW_KEY = "__all__";

/** localStorage keys. `order` is the pre-existing sequence key. */
export const LS = {
  views: "scv:named-views",
  active: "scv:active-view",
  archived: "scv:archived",
  custom: "scv:custom-segments",
  order: "scv:segment-order",
  layouts: "scv:view-layouts",
} as const;

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable / quota — non-fatal for a prototype */
  }
}

/** Short, collision-resistant id for views/segments created in the browser. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)
    .toString(36)
    .padStart(3, "0")}`;
}

/**
 * Reorder `ids` to follow the sequence in `order`; any id not present in
 * `order` keeps its relative position at the end. Mirrors the grid's existing
 * "saved order, then anything new appended" behaviour.
 */
export function applyOrder(order: string[], ids: string[]): string[] {
  const want = new Set(ids);
  const ranked = order.filter((id) => want.has(id));
  const missing = ids.filter((id) => !ranked.includes(id));
  return [...ranked, ...missing];
}

/** Recompute the portfolio totals strip for an arbitrary set of segments. */
export function totalsFor(segments: SegmentSummary[]): PortfolioTotals {
  const totalContacts = segments.reduce((n, s) => n + s.contactCount, 0);
  const totalKnownSpend = segments.reduce((n, s) => n + s.knownSpend, 0);
  const totalVisits = segments.reduce((n, s) => n + s.popVisits, 0);
  return {
    totalContacts,
    totalKnownSpend,
    totalVisits,
    blendedSpendPerVisit: totalVisits > 0 ? totalKnownSpend / totalVisits : 0,
    segmentCount: segments.length,
  };
}

/**
 * A blank segment created from the "Add segment" flow. Real rules would
 * populate it; here it starts empty so the card renders cleanly (the demo
 * components all tolerate zero/empty data).
 */
export function makeBlankSegment(id: string, name: string): SegmentSummary {
  return {
    id,
    name,
    description: "New segment — define rules to populate",
    contactCount: 0,
    shareOfBase: 0,
    knownSpend: 0,
    popVisits: 0,
    avgSpendPerVisit: 0,
    valuePerCustomer: 0,
    avgVisitsPerCustomer: 0,
    clickToVisitRate: 0,
    movement: [],
    avgAge: null,
    ageBands: [],
    genderSplit: { female: 0, male: 0, other: 0, unknown: 0 },
    avgTenureMonths: 0,
  };
}
