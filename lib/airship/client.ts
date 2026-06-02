/**
 * Live Airship REST client.
 *
 * Talks to the Airship hospitality REST API (https://api.airship.co.uk/v1) and
 * rolls contacts up into the SCV shape via the shared `summariseSegment` maths.
 *
 * IMPORTANT — verification status:
 * The base URL and token auth are confirmed from Airship's developer docs. The
 * exact *endpoint paths* and *field names* below are best-effort and have NOT
 * yet been validated against a live account (we built before a token was
 * available). Everything Airship-specific is isolated in the CONFIG block and
 * the two `map*` functions, so when you add a token and see a real payload you
 * correct it in one place — the rollup maths and the entire UI stay untouched.
 *
 * To go live: set AIRSHIP_API_TOKEN in .env.local. index.ts then selects this
 * client automatically. If a request fails, the route surfaces the error rather
 * than silently faking data.
 */

import { summariseSegment, movementFromSignups, type RawContact } from "./metrics";
import type {
  AirshipAdapter,
  PortfolioTotals,
  SegmentSummary,
  SingleCustomerView,
} from "./types";

/** Everything that might need correcting once we see a real payload. */
const CONFIG = {
  baseUrl: process.env.AIRSHIP_API_BASE_URL ?? "https://api.airship.co.uk/v1",
  /** Header carrying the access token. Docs say tokens are generated in the
   *  dashboard; default to Bearer, override if the real scheme differs. */
  authHeader: process.env.AIRSHIP_AUTH_HEADER ?? "Authorization",
  authPrefix: process.env.AIRSHIP_AUTH_PREFIX ?? "Bearer ",
  endpoints: {
    segments: "/segments",
    /** Contacts within a segment. {id} is substituted. */
    segmentContacts: "/segments/{id}/contacts",
  },
  pageSize: 200,
  /** Safety cap on contacts pulled per segment in the prototype. */
  maxContactsPerSegment: 5000,
};

interface RawSegment {
  id: string;
  name: string;
  description: string;
}

function authHeaders(token: string): Record<string, string> {
  return {
    [CONFIG.authHeader]: `${CONFIG.authPrefix}${token}`,
    Accept: "application/json",
  };
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Airship API ${res.status} ${res.statusText} for ${url}${body ? ` — ${body.slice(0, 300)}` : ""}`
    );
  }
  return (await res.json()) as T;
}

/** Map a raw Airship segment object to our minimal shape. Adjust field names
 *  here once the real payload is known. */
function mapSegment(raw: Record<string, unknown>): RawSegment {
  return {
    id: String(raw.id ?? raw.segment_id ?? raw.uuid ?? ""),
    name: String(raw.name ?? raw.title ?? "Untitled segment"),
    description: String(raw.description ?? raw.summary ?? ""),
  };
}

/** Map a raw Airship contact to the RawContact the rollup needs. This is the
 *  single most likely thing to need correcting against a real payload. */
function mapContact(raw: Record<string, unknown>): RawContact {
  const num = (v: unknown): number => {
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (v: unknown): string | null => (v == null ? null : String(v));

  const rawGender = String(raw.gender ?? "").toLowerCase();
  const gender: RawContact["gender"] =
    rawGender === "f" || rawGender === "female"
      ? "female"
      : rawGender === "m" || rawGender === "male"
        ? "male"
        : rawGender === "other"
          ? "other"
          : "unknown";

  return {
    id: String(raw.id ?? raw.contact_id ?? ""),
    // Known Spend — Airship surfaces this as purchase/spend data.
    knownSpend: num(raw.known_spend ?? raw.total_spend ?? raw.spend),
    // Proof of Presence visits.
    visits: num(raw.pop_visits ?? raw.visits ?? raw.visit_count),
    // Campaign clicks (email/SMS) — for click-to-visit rate.
    clicks: num(raw.clicks ?? raw.email_clicks ?? raw.click_count),
    dateOfBirth: str(raw.date_of_birth ?? raw.dob),
    gender,
    createdAt: String(raw.created_at ?? raw.created ?? new Date(0).toISOString()),
    location: str(raw.town ?? raw.city ?? raw.region ?? raw.location),
  };
}

interface Paged {
  data?: unknown[];
  results?: unknown[];
  items?: unknown[];
  next?: string | null;
  next_page?: string | null;
}

function extractList(payload: Paged): unknown[] {
  return payload.data ?? payload.results ?? payload.items ?? [];
}

function extractNext(payload: Paged): string | null {
  return payload.next ?? payload.next_page ?? null;
}

export class LiveAirshipClient implements AirshipAdapter {
  readonly source = "live" as const;
  private readonly token: string;
  private readonly now: Date;

  constructor(token: string, now?: Date) {
    if (!token) throw new Error("LiveAirshipClient requires an access token");
    this.token = token;
    this.now = now ?? new Date();
  }

  private url(path: string): string {
    return `${CONFIG.baseUrl}${path}`;
  }

  private async fetchSegments(): Promise<RawSegment[]> {
    const payload = await getJson<Paged>(this.url(CONFIG.endpoints.segments), this.token);
    return extractList(payload).map((s) => mapSegment(s as Record<string, unknown>));
  }

  private async fetchSegmentContacts(segmentId: string): Promise<RawContact[]> {
    const contacts: RawContact[] = [];
    let path: string | null =
      CONFIG.endpoints.segmentContacts.replace("{id}", encodeURIComponent(segmentId)) +
      `?limit=${CONFIG.pageSize}`;

    while (path && contacts.length < CONFIG.maxContactsPerSegment) {
      const url = path.startsWith("http") ? path : this.url(path);
      const payload: Paged = await getJson<Paged>(url, this.token);
      for (const c of extractList(payload)) {
        contacts.push(mapContact(c as Record<string, unknown>));
      }
      path = extractNext(payload);
    }
    return contacts;
  }

  async getSingleCustomerView(): Promise<SingleCustomerView> {
    const segments = await this.fetchSegments();

    // Pull each segment's contacts (sequential to stay gentle on rate limits in
    // the prototype; parallelise with a concurrency cap for production).
    const perSegment: Array<{ seg: RawSegment; contacts: RawContact[] }> = [];
    for (const seg of segments) {
      const contacts = await this.fetchSegmentContacts(seg.id);
      perSegment.push({ seg, contacts });
    }

    const totalBase = perSegment.reduce((s, x) => s + x.contacts.length, 0);

    const summaries: SegmentSummary[] = perSegment.map(({ seg, contacts }) =>
      // Movement here is a best-effort sign-up proxy (growth only — see metrics).
      // For true grow/shrink, snapshot segment sizes daily and diff them.
      summariseSegment(seg, contacts, totalBase, this.now, movementFromSignups(contacts, this.now))
    );

    const totalKnownSpend = summaries.reduce((s, x) => s + x.knownSpend, 0);
    const totalVisits = summaries.reduce((s, x) => s + x.popVisits, 0);
    const totals: PortfolioTotals = {
      totalContacts: totalBase,
      totalKnownSpend,
      totalVisits,
      blendedSpendPerVisit:
        totalVisits > 0 ? Math.round((totalKnownSpend / totalVisits) * 100) / 100 : 0,
      segmentCount: summaries.length,
    };

    return {
      totals,
      segments: summaries,
      source: "live",
      generatedAt: this.now.toISOString(),
    };
  }
}
