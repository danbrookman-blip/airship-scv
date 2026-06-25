import Link from "next/link";
import { getAirshipAdapter } from "@/lib/airship";
import { decodeViewPayload, verifyViewToken } from "@/lib/share/token";
import { SegmentCard } from "@/components/SegmentCard";
import { BrandLogo } from "@/components/BrandLogo";
import { totalsFor } from "@/lib/named-views";
import { gbp, integer } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

function first(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center gap-3 border-b border-navy/10 bg-surface px-6 py-3">
        <BrandLogo />
        <span className="ml-1 text-[13px] font-semibold text-navy">Single Customer View</span>
        <span className="ml-auto rounded-badge bg-navy/5 px-2.5 py-1 text-[11px] font-semibold text-navy">
          Shared view
        </span>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

function Invalid() {
  return (
    <Frame>
      <div className="mx-auto max-w-xl rounded-card border border-navy/[0.06] bg-surface p-8 text-center">
        <h1 className="font-display text-[18px] font-bold text-title">This share link isn’t valid</h1>
        <p className="mt-2 text-[13px] text-navy">
          The link may be incomplete or the access token is missing. Ask whoever shared it to copy
          the link again.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-btn border-[1.8px] border-brandblue px-4 py-2 text-[11.2px] font-bold uppercase tracking-wide text-brandblue hover:bg-brandblue/5"
        >
          Open Single Customer View
        </Link>
      </div>
    </Frame>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 first:pl-0">
      <div className="text-[12px] text-navy">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-title">{value}</div>
    </div>
  );
}

export default async function SharedViewPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const d = first(sp.d);
  const t = first(sp.t);

  if (!d || !verifyViewToken(d, t)) return <Invalid />;
  const payload = decodeViewPayload(d);
  if (!payload) return <Invalid />;

  const view = await getAirshipAdapter().getSingleCustomerView();
  const byId = new Map(view.segments.map((s) => [s.id, s]));
  const segments = payload.segmentIds.map((id) => byId.get(id)).filter(Boolean) as NonNullable<
    ReturnType<typeof byId.get>
  >[];

  // Sort to match the dashboard's default headline ranking.
  segments.sort((a, b) => b.avgSpendPerVisit - a.avgSpendPerVisit);
  const totals = totalsFor(segments);
  const dropped = payload.segmentIds.length - segments.length;

  return (
    <Frame>
      <p className="text-[12px] text-navy">
        Shared view{view.source === "sample" ? " · sample data" : ""}
      </p>
      <h1 className="mt-1 font-display text-[24px] font-bold text-title">
        {payload.name || "Named view"}
      </h1>
      <p className="mt-1 text-[13px] text-navy">
        {segments.length} {segments.length === 1 ? "segment" : "segments"}, shown together. Headline
        number is average spend per visit (Known Spend ÷ Proof of Presence visits).
      </p>

      {segments.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-navy/15 bg-surface px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-title">Nothing to show</p>
          <p className="mt-1 text-[12px] text-navy">
            The segments in this view aren’t available here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap divide-x divide-navy/10 rounded-card bg-surface px-5 py-4">
            <HeaderStat label="Segments" value={integer(totals.segmentCount)} />
            <HeaderStat label="Total customers" value={integer(totals.totalContacts)} />
            <HeaderStat label="Known Spend" value={gbp(totals.totalKnownSpend)} />
            <HeaderStat label="PoP visits" value={integer(totals.totalVisits)} />
            <HeaderStat
              label="Blended £/visit"
              value={gbp(totals.blendedSpendPerVisit, { decimals: true })}
            />
          </div>

          {dropped > 0 && (
            <p className="mt-3 text-[11px] text-navy/60">
              {dropped} {dropped === 1 ? "tile isn’t" : "tiles aren’t"} available here (locally-added
              segments aren’t shared).
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {segments.map((s) => (
              <SegmentCard key={s.id} s={s} showDragHandle={false} />
            ))}
          </div>
        </>
      )}

      <p className="mt-8 text-center text-[11px] text-navy/60">
        Powered by Single Customer View · Airship
      </p>
    </Frame>
  );
}
