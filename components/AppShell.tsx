import { BrandLogo } from "./BrandLogo";
import { NavIcon } from "./NavIcon";
import { AIRSHIP_TOKENS } from "@/lib/airship/design-tokens";

/** Items that show a "New" purple badge in the real console. */
const NEW_ITEMS = new Set(["Journeys"]);
/** Items that have an expandable caret in the real console. */
const EXPANDABLE = new Set([
  "Insights",
  "Segments",
  "Emails",
  "Journeys",
  "SMS campaigns",
  "Database",
  "Tools",
  "Settings",
  "Console",
]);

function Caret() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="ml-auto text-navy/40" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The Airship console shell: 280px left side-nav on the canvas, with the
 * brand wordmark, nav items, and an active "Segments → Single Customer View".
 * Layout/colours/spacing mirror tokens extracted from dashboard.airship.co.uk.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Side nav */}
      <aside className="hidden w-[280px] shrink-0 flex-col px-5 pb-6 pt-5 lg:flex">
        <div className="px-2">
          <BrandLogo />
        </div>

        <nav className="mt-6 flex flex-col gap-0.5">
          {AIRSHIP_TOKENS.nav.items.map((item) => {
            const isSegments = item === "Segments";
            return (
              <div key={item}>
                <div
                  className={
                    "flex items-center gap-3 rounded-btn px-2.5 py-2 text-[14.4px] " +
                    (isSegments
                      ? "font-semibold text-navy"
                      : "text-navy/90 hover:bg-white/60")
                  }
                >
                  <span className={isSegments ? "text-brandblue" : "text-navy/70"}>
                    <NavIcon label={item} />
                  </span>
                  <span>{item}</span>
                  {NEW_ITEMS.has(item) && (
                    <span className="ml-1 rounded-badge bg-gradient-to-br from-brand-from to-brand-to px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                  {EXPANDABLE.has(item) && !NEW_ITEMS.has(item) && <Caret />}
                </div>

                {/* Expanded Segments sub-item: the SCV, shown active */}
                {isSegments && (
                  <div className="mt-1 pl-2">
                    <div className="flex items-center gap-2.5 rounded-btn bg-white px-3 py-2 text-[13px] font-semibold text-brandblue shadow-pill">
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="10" cy="10" r="3" />
                        <path d="M10 2v2M10 16v2M2 10h2M16 10h2" strokeLinecap="round" />
                      </svg>
                      Single Customer View
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Venue / location footer card (mirrors the real console) */}
        <div className="mt-auto">
          <div className="mb-3 border-t border-navy/10" />
          <div className="px-2 text-[15px] font-bold text-title">Koh Thai</div>
          <div className="mt-2 rounded-card bg-surface px-3 pb-3 pt-2">
            <div className="text-[12.8px] text-navy">Location</div>
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-title">Head Office</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brandblue text-brandblue">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
