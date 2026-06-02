/**
 * Sample-data adapter. Generates realistic, deterministic hospitality segments
 * so the Single Customer View runs with zero configuration and gives a faithful
 * preview of the live experience. Swapped out for the real client the moment an
 * AIRSHIP_API_TOKEN is present (see index.ts).
 *
 * Determinism: no Math.random — we seed contacts from fixed parameters so the
 * view is stable across reloads (and the build environment forbids
 * Math.random/Date.now in some contexts anyway).
 */

import { summariseSegment, MOVEMENT_WINDOWS, type RawContact } from "./metrics";
import type {
  AirshipAdapter,
  MovementPoint,
  PortfolioTotals,
  SegmentSummary,
  SingleCustomerView,
} from "./types";

interface SegmentSpec {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  /** Avg Known Spend per contact, in £. */
  avgSpend: number;
  /** Avg PoP visits per contact. */
  avgVisits: number;
  /** Centre of the age distribution. */
  ageCentre: number;
  ageSpread: number;
  /** Female share 0..1 (rest split male/other/unknown). */
  femaleShare: number;
  /** Avg tenure in months. */
  tenureMonths: number;
  topLocation: string;
  /** Monthly size growth rate (fraction): + growing, − shrinking. */
  momentumMonthly: number;
  /** Target click-to-visit conversion 0..1 (drives generated click volume). */
  clickToVisitRate: number;
}

const SPECS: SegmentSpec[] = [
  {
    id: "vip-regulars",
    name: "VIP Regulars",
    description: "Top 5% by spend — visit at least fortnightly",
    contactCount: 480,
    avgSpend: 1840,
    avgVisits: 26,
    ageCentre: 47,
    ageSpread: 11,
    femaleShare: 0.46,
    tenureMonths: 38,
    topLocation: "Manchester",
    momentumMonthly: 0.02,
    clickToVisitRate: 0.52,
  },
  {
    id: "weekend-brunchers",
    name: "Weekend Brunchers",
    description: "Sat/Sun daytime visitors, high covers per visit",
    contactCount: 2150,
    avgSpend: 410,
    avgVisits: 9,
    ageCentre: 33,
    ageSpread: 8,
    femaleShare: 0.61,
    tenureMonths: 16,
    topLocation: "Leeds",
    momentumMonthly: 0.06,
    clickToVisitRate: 0.34,
  },
  {
    id: "lapsing-loyalists",
    name: "Lapsing Loyalists",
    description: "Were frequent, no visit in 90+ days — win-back target",
    contactCount: 1320,
    avgSpend: 520,
    avgVisits: 11,
    ageCentre: 41,
    ageSpread: 13,
    femaleShare: 0.52,
    tenureMonths: 29,
    topLocation: "Birmingham",
    momentumMonthly: -0.09,
    clickToVisitRate: 0.12,
  },
  {
    id: "new-this-quarter",
    name: "New This Quarter",
    description: "First captured in the last 90 days",
    contactCount: 3040,
    avgSpend: 96,
    avgVisits: 2,
    ageCentre: 29,
    ageSpread: 9,
    femaleShare: 0.55,
    tenureMonths: 2,
    topLocation: "London",
    momentumMonthly: 0.22,
    clickToVisitRate: 0.28,
  },
  {
    id: "midweek-diners",
    name: "Midweek Diners",
    description: "Tue–Thu evening covers, steady mid-value",
    contactCount: 1870,
    avgSpend: 340,
    avgVisits: 7,
    ageCentre: 52,
    ageSpread: 12,
    femaleShare: 0.48,
    tenureMonths: 22,
    topLocation: "Bristol",
    momentumMonthly: 0.01,
    clickToVisitRate: 0.3,
  },
  {
    id: "gift-card-holders",
    name: "Gift Card Holders",
    description: "Hold a Toggle gift card balance",
    contactCount: 760,
    avgSpend: 175,
    avgVisits: 3,
    ageCentre: 38,
    ageSpread: 14,
    femaleShare: 0.58,
    tenureMonths: 12,
    topLocation: "Glasgow",
    momentumMonthly: -0.03,
    clickToVisitRate: 0.2,
  },
];

const LOCATIONS_NEARBY: Record<string, string[]> = {
  Manchester: ["Manchester", "Salford", "Stockport"],
  Leeds: ["Leeds", "Wakefield", "Bradford"],
  Birmingham: ["Birmingham", "Solihull", "Wolverhampton"],
  London: ["London", "Croydon", "Watford"],
  Bristol: ["Bristol", "Bath", "Weston"],
  Glasgow: ["Glasgow", "Paisley", "Hamilton"],
};

const GENDERS: RawContact["gender"][] = ["female", "male", "other", "unknown"];

/**
 * Deterministic pseudo-jitter in [0,1) from two integer seeds. Lets us spread
 * spend/visits/age around the spec centre without Math.random.
 */
function jitter(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildContacts(spec: SegmentSpec, now: Date): RawContact[] {
  // Generate the full population (headcounts are small — under 10k total across
  // all segments). No sampling/weighting, so every rolled-up number reconciles:
  // customers × avg = total, exactly.
  const nearby = LOCATIONS_NEARBY[spec.topLocation] ?? [spec.topLocation];
  const contacts: RawContact[] = [];

  for (let i = 0; i < spec.contactCount; i++) {
    const jSpend = jitter(i, 1);
    const jVisits = jitter(i, 2);
    const jAge = jitter(i, 3) + jitter(i, 7) - 1; // ~symmetric [-1,1]
    const jTenure = jitter(i, 4);
    const jGender = jitter(i, 5);
    const jLoc = jitter(i, 6);

    const jClicks = jitter(i, 8);
    const visits = Math.max(1, Math.round(spec.avgVisits * (0.5 + jVisits)));
    const spendPerVisit = spec.avgSpend / Math.max(1, spec.avgVisits);
    const knownSpend = Math.round(spendPerVisit * visits * (0.7 + jSpend * 0.6));
    // Clicks back out from the target conversion: clicks = visits / rate, with
    // mild jitter, so the rolled-up click-to-visit rate lands near the target.
    const clicks = Math.max(visits, Math.round((visits / spec.clickToVisitRate) * (0.85 + jClicks * 0.3)));

    const age = Math.round(spec.ageCentre + jAge * spec.ageSpread);
    const dobYear = now.getFullYear() - age;
    const dateOfBirth = `${dobYear}-0${(i % 9) + 1}-15`;

    // Gender: femaleShare to female, then taper male/other/unknown.
    let gender: RawContact["gender"];
    if (jGender < spec.femaleShare) gender = "female";
    else if (jGender < spec.femaleShare + (1 - spec.femaleShare) * 0.82) gender = "male";
    else if (jGender < spec.femaleShare + (1 - spec.femaleShare) * 0.93) gender = "other";
    else gender = "unknown";

    const tenure = Math.max(0, Math.round(spec.tenureMonths * (0.4 + jTenure * 1.2)));
    const created = new Date(now);
    created.setMonth(created.getMonth() - tenure);

    contacts.push({
      id: `${spec.id}-${i}`,
      knownSpend,
      visits,
      clicks,
      dateOfBirth,
      gender,
      createdAt: created.toISOString(),
      location: nearby[Math.floor(jLoc * nearby.length)],
    });
  }
  return contacts;
}

/**
 * Movement per trailing window from the spec's monthly momentum. Longer windows
 * accumulate more change; a little deterministic jitter keeps the windows from
 * looking perfectly linear. Sign = direction (grow/shrink).
 */
function buildMovement(spec: SegmentSpec): MovementPoint[] {
  return MOVEMENT_WINDOWS.map((windowDays, idx) => {
    const base = spec.momentumMonthly * (windowDays / 30);
    const noise = (jitter(spec.contactCount, idx + 11) - 0.5) * Math.abs(spec.momentumMonthly) * 0.25;
    return { windowDays, changePct: Math.round((base + noise) * 1000) / 1000 };
  });
}

export class SampleAirshipAdapter implements AirshipAdapter {
  readonly source = "sample" as const;
  private readonly now: Date;

  /** `now` injected for determinism/testability; defaults to call time. */
  constructor(now?: Date) {
    this.now = now ?? new Date();
  }

  async getSingleCustomerView(): Promise<SingleCustomerView> {
    const totalBase = SPECS.reduce((s, sp) => s + sp.contactCount, 0);

    const segments: SegmentSummary[] = SPECS.map((spec) => {
      const contacts = buildContacts(spec, this.now);
      const summary = summariseSegment(
        { id: spec.id, name: spec.name, description: spec.description },
        contacts,
        totalBase,
        this.now,
        buildMovement(spec)
      );
      return summary;
    });

    const totalKnownSpend = segments.reduce((s, x) => s + x.knownSpend, 0);
    const totalVisits = segments.reduce((s, x) => s + x.popVisits, 0);
    const totals: PortfolioTotals = {
      totalContacts: totalBase,
      totalKnownSpend,
      totalVisits,
      blendedSpendPerVisit: totalVisits > 0 ? Math.round((totalKnownSpend / totalVisits) * 100) / 100 : 0,
      segmentCount: segments.length,
    };

    return {
      totals,
      segments,
      source: "sample",
      generatedAt: this.now.toISOString(),
    };
  }
}
