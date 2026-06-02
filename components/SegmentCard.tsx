import type { SegmentSummary } from "@/lib/airship/types";
import { gbp, integer, percent, tenure } from "@/lib/format";
import { AgeBands, GenderBar } from "./Bars";
import { ShareButton } from "./ShareButton";
import { Movement } from "./Movement";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[12px] text-navy">{label}</div>
      <div className="mt-0.5 font-display text-[17px] font-bold text-title">{value}</div>
      {sub ? <div className="text-[11px] text-navy/60">{sub}</div> : null}
    </div>
  );
}

export function SegmentCard({
  s,
  shareUrl,
  showDragHandle = true,
}: {
  s: SegmentSummary;
  shareUrl?: string;
  showDragHandle?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-card border border-navy/[0.06] bg-surface p-5 transition hover:shadow-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[16px] font-bold text-title">{s.name}</h3>
          <p className="mt-0.5 text-[12px] text-navy">{s.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-badge bg-brandblue/10 px-2.5 py-1 text-[11px] font-bold text-brandblue">
            {percent(s.shareOfBase, 1)} of base
          </span>
          {shareUrl ? <ShareButton url={shareUrl} /> : null}
          {/* Drag affordance — the whole card is the handle */}
          {showDragHandle && (
          <span className="text-navy/25" title="Drag to reorder" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.3" />
              <circle cx="10" cy="3" r="1.3" />
              <circle cx="4" cy="7" r="1.3" />
              <circle cx="10" cy="7" r="1.3" />
              <circle cx="4" cy="11" r="1.3" />
              <circle cx="10" cy="11" r="1.3" />
            </svg>
          </span>
          )}
        </div>
      </div>

      {/* Headline: avg spend per visit — Airship brand-purple gradient */}
      <div className="mt-4 rounded-card bg-gradient-to-br from-brand-from to-brand-to px-4 py-3 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
          Avg spend per visit
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-display text-[26px] font-bold leading-none">
            {gbp(s.avgSpendPerVisit, { decimals: true })}
          </span>
          <span className="text-[11px] text-white/75">
            {gbp(s.knownSpend)} spend ÷ {integer(s.popVisits)} visits
          </span>
        </div>
      </div>

      {/* Movement: is the segment growing or shrinking across time windows? */}
      <div className="mt-4">
        <Movement points={s.movement} />
      </div>

      {/* Value + lifecycle stats */}
      <div className="mt-4 grid grid-cols-2 gap-y-4">
        <Stat label="Customers" value={integer(s.contactCount)} />
        <Stat label="Value / customer" value={gbp(s.valuePerCustomer)} sub="total Known Spend" />
        <Stat label="Avg visits / customer" value={s.avgVisitsPerCustomer.toFixed(1)} sub="PoP" />
        <Stat label="Avg tenure" value={tenure(s.avgTenureMonths)} />
        <Stat label="Avg age" value={s.avgAge != null ? `${s.avgAge}` : "—"} />
        <Stat label="Click-to-visit" value={percent(s.clickToVisitRate, 0)} sub="clicks → visits" />
      </div>

      {/* Demographics */}
      <div className="mt-4 border-t border-navy/10 pt-4">
        <div className="mb-2 text-[12px] text-navy">Age distribution</div>
        <AgeBands bands={s.ageBands} />
      </div>
      <div className="mt-4">
        <div className="mb-2 text-[12px] text-navy">Gender</div>
        <GenderBar split={s.genderSplit} />
      </div>
    </div>
  );
}
