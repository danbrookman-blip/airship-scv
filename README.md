# Single Customer View (Airship)

A segment-level rollup that sits conceptually alongside Airship's **Segments**
page: every segment in one place, with the **value each delivers back to the
business** and **who those customers are** — pulled into one card per segment.

This is a working prototype. It runs today on realistic **sample data** and
flips to the **live Airship API** the moment you add an access token. The UI
never changes between the two — only the data source behind the adapter does.

## What each card shows

| Indicator | Definition | Airship source |
|---|---|---|
| **Avg spend per visit** *(headline)* | `Known Spend ÷ PoP visits` — what a single visit from this segment is worth | Purchase History ÷ Proof of Presence |
| Value / customer | `Known Spend ÷ customers` — total value each customer represents | Purchase History |
| Avg visits / customer | `PoP visits ÷ customers` | Proof of Presence |
| **Segment movement** | Grew/shrank across trailing 7/14/30/60/90-day windows (green up, red down) | Segment size over time |
| **Click-to-visit** | `PoP visits ÷ campaign clicks` — share of clicks that became a visit | Clicks + Proof of Presence |
| Customers | Number of contacts in the segment | Contacts |
| % of base | Segment's share of the total contactable base | Contacts |
| Avg age + age distribution | Mean age and a band histogram, over contacts with a DOB | `date_of_birth` |
| Gender split | Female / male / other / unknown | `gender` |
| Avg tenure | Mean time as a contact (created date → now) | `created_at` |
| Top location | Most common town/region in the segment | `town` / `city` / `region` |

Segments are **ranked by avg spend per visit** so the most valuable cohort
leads. The header strip shows portfolio totals and a blended £/visit.

Cards are **drag-to-reorder** (powered by `@dnd-kit`): drag one to re-rank and
the rest reflow; the arrangement persists to `localStorage` and survives
reloads. A "Reset to spend-per-visit order" link restores the default ranking.
Reordering works with mouse, touch, and keyboard (focus a card, Space to lift,
arrows to move, Space to drop).

Each card also has a **Share** button (mirrors Airship's `?t=<token>` share
links): it copies an absolute link to that single segment, e.g.
`https://host/segment/vip-regulars?t=<token>`. Opening the link shows a clean,
branded **single-segment view** with no nav. The token is a real capability —
an HMAC of the segment id (`lib/share/token.ts`) — so links are verifiable
statelessly and can't be forged by guessing an id; an invalid/missing token
shows a "link not valid" page. Set `SCV_SHARE_SECRET` in production (a dev
fallback keeps prototype links working).

> **Note on "PoP":** in the Airship console this is **Proof of Presence**
> (logged visits), *not* "proportion of population." The % share of base is shown
> separately as the "of base" chip on each card.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000  (or the port the dev server prints)
```

With no token configured it serves sample data — the badge top-right reads
**Sample data**.

## Go live with the real Airship API

1. Generate an access token in the Airship dashboard.
2. `cp .env.local.example .env.local` and set `AIRSHIP_API_TOKEN=<your token>`.
3. Restart `npm run dev`. The badge flips to **Live data** and the app calls
   `https://api.airship.co.uk/v1`.

If a live request fails, `/api/scv` returns the actual error (status + message)
rather than silently faking data — so you can see exactly what to correct.

### ⚠️ Live mapping not yet verified against a real account

The base URL and token auth are confirmed from Airship's developer docs, but the
**endpoint paths and field names were written before a token was available** and
have not been validated against a live payload. They are best-effort guesses.

Everything Airship-specific is isolated in **two places** so correcting them is a
5-minute job that never touches the UI or the maths:

- **`lib/airship/client.ts` → `CONFIG`** — endpoint paths, page size, auth header.
- **`lib/airship/client.ts` → `mapSegment()` / `mapContact()`** — field-name
  mapping from the real payload to our internal shape. `mapContact` is the most
  likely to need a tweak (it already tries several common field names for spend,
  visits, DOB, gender, location).

When you first connect a token, eyeball one real response and adjust those field
names. The rollup formulas (`lib/airship/metrics.ts`) and the entire UI stay as-is.

## Design system

The UI is styled with **real Airship Design System tokens**, extracted from the
live console (`dashboard.airship.co.uk`) by reading `getComputedStyle` off the
rendered components and the brand logo SVG. The console runs on Bootstrap 4 +
Tailwind; the values below are what the components *actually* render, not the
stock Bootstrap defaults.

- **Fonts:** page titles `DIN-2014` → `Lato`; UI `Lato` (loaded via `next/font`).
- **Canvas** `#f1f5f6` · **card surface** `#fafbfb` · **text** `#212529` ·
  **title** `#202c38` · **navy** (labels/nav/links) `#354b64`.
- **Action blue** `#38abff` · **brand purple gradient** `#d14bea → #8d00d4`
  (logo + accents) · **positive green** `#71be37`.
- **Cards** flat, 9px radius, no shadow · **buttons** ghost (blue border + blue
  700 text) · **side nav** 280px, active item = white pill + blue.

Documented source of truth: [`lib/airship/design-tokens.ts`](lib/airship/design-tokens.ts),
mirrored into [`tailwind.config.ts`](tailwind.config.ts). The page is wrapped in
an Airship-style console shell ([`components/AppShell.tsx`](components/AppShell.tsx))
with the real left side-nav, so it reads as a native section of the dashboard.

## Architecture

```
app/
  page.tsx               Single Customer View — header strip + segment grid
  segment/[id]/page.tsx  Shared single-segment view (validates ?t= token)
  api/scv/route.ts       JSON endpoint (same data, for external use / debugging)
components/
  AppShell.tsx        Airship console shell — 280px side nav + main area
  BrandLogo.tsx       Purple-gradient AIRSHIP wordmark
  NavIcon.tsx         Side-nav icons
  SegmentGrid.tsx     Client: drag-to-reorder grid (@dnd-kit) + persistence
  SegmentCard.tsx     One card: headline + value stats + demographics
  Movement.tsx        Grow/shrink strip across 7/14/30/60/90-day windows
  ShareButton.tsx     Client: copy share link + confirmation
  Bars.tsx            Age histogram + gender split bar
lib/
  share/token.ts      HMAC capability tokens for share links
lib/
  airship/
    types.ts          Domain shapes the UI consumes (SegmentSummary, etc.)
    metrics.ts        Pure rollup maths (spend/visit, tenure, age bands…)
    sample.ts         Zero-config sample-data adapter
    client.ts         Live REST client → api.airship.co.uk/v1  ← swap point
    index.ts          Picks live vs sample by AIRSHIP_API_TOKEN
  format.ts           GB currency / number / tenure formatting
```

The **adapter pattern** mirrors the sibling `foh-app` project: Airship lives
behind an interface (`AirshipAdapter`), with a real client and a sample
implementation. The app imports only `getAirshipAdapter()` — it never knows
which one it's talking to.

## Production notes (beyond the prototype)

- **Rate limits / volume:** the live client pulls contacts per segment
  sequentially. For large bases, parallelise with a concurrency cap and/or push
  the rollup server-side if Airship exposes pre-aggregated segment stats.
- **Caching:** results are computed on each request (`force-dynamic`). Add a
  short server cache (e.g. 5–15 min) once live, since these are aggregate stats.
- **Money units:** kept as whole £ for the prototype; confirm whether Airship
  returns pounds or pence and adjust `mapContact`.
- **Segment movement (live):** the live client derives movement from contact
  sign-up dates (`movementFromSignups`) — a **growth-only proxy** that can't see
  churn-driven decline, since a current snapshot has no record of contacts that
  left the segment. For true grow/shrink, snapshot each segment's size daily and
  diff the windows. The sample adapter shows real up *and* down movement.
