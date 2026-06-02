import { headers } from "next/headers";
import { getAirshipAdapter } from "@/lib/airship";
import { SegmentGrid } from "@/components/SegmentGrid";
import { AppShell } from "@/components/AppShell";
import { gbp, integer, dateTimeLondon } from "@/lib/format";
import { buildShareUrl } from "@/lib/share/token";

export const dynamic = "force-dynamic";

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 first:pl-0">
      <div className="text-[12px] text-navy">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-title">{value}</div>
    </div>
  );
}

export default async function Page() {
  const view = await getAirshipAdapter().getSingleCustomerView();
  const { totals } = view;

  // Headline ranking: which segment is worth most per visit.
  const segments = [...view.segments].sort((a, b) => b.avgSpendPerVisit - a.avgSpendPerVisit);
  const live = view.source === "live";

  // Absolute share URLs (with capability token) computed from the request host.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const shareUrls: Record<string, string> = {};
  for (const s of segments) shareUrls[s.id] = buildShareUrl(origin, s.id);

  return (
    <AppShell>
      {/* Title bar — mirrors the console: large title, ghost action, thin rule */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[26px] font-bold text-title">Single Customer View</h1>
        <div className="flex items-center gap-3">
          <span
            className={
              "rounded-badge px-2.5 py-1 text-[11px] font-bold " +
              (live ? "bg-positive/10 text-positive" : "bg-brand-soft text-brand")
            }
            title={
              live
                ? "Served from the live Airship API"
                : "Sample data — add AIRSHIP_API_TOKEN to .env.local to go live"
            }
          >
            {live ? "● Live data" : "● Sample data"}
          </span>
          <button className="rounded-btn border-[1.8px] border-brandblue px-4 py-2 text-[11.2px] font-bold uppercase tracking-wide text-brandblue transition hover:bg-brandblue/5">
            Export
          </button>
        </div>
      </div>
      <p className="mt-1 max-w-2xl text-[13px] text-navy">
        Every segment in one place — the value each delivers back to the business, plus who they
        are. Headline number is <strong className="font-semibold text-ink">average spend per
        visit</strong> (Known Spend ÷ Proof of Presence visits).
      </p>
      <div className="mt-4 border-b border-navy/15" />

      {/* Portfolio totals strip */}
      <div className="mt-6 flex flex-wrap divide-x divide-navy/10 rounded-card bg-surface px-5 py-4">
        <HeaderStat label="Segments" value={integer(totals.segmentCount)} />
        <HeaderStat label="Total customers" value={integer(totals.totalContacts)} />
        <HeaderStat label="Known Spend" value={gbp(totals.totalKnownSpend)} />
        <HeaderStat label="PoP visits" value={integer(totals.totalVisits)} />
        <HeaderStat label="Blended £/visit" value={gbp(totals.blendedSpendPerVisit, { decimals: true })} />
      </div>

      {/* Segment grid — drag cards to re-rank */}
      <div className="mt-6">
        <SegmentGrid segments={segments} shareUrls={shareUrls} />
      </div>

      <p className="mt-8 text-center text-[11px] text-navy/60">
        Generated {dateTimeLondon(view.generatedAt)} · drag cards to reorder
      </p>
    </AppShell>
  );
}
