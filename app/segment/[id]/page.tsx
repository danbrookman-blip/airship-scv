import Link from "next/link";
import { getAirshipAdapter } from "@/lib/airship";
import { verifyShareToken } from "@/lib/share/token";
import { SegmentCard } from "@/components/SegmentCard";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type Search = Promise<{ [key: string]: string | string[] | undefined }>;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center gap-3 border-b border-navy/10 bg-surface px-6 py-3">
        <BrandLogo />
        <span className="ml-1 text-[13px] font-semibold text-navy">Single Customer View</span>
        <span className="ml-auto rounded-badge bg-navy/5 px-2.5 py-1 text-[11px] font-semibold text-navy">
          Shared link
        </span>
      </header>
      <main className="mx-auto max-w-xl px-6 py-10">{children}</main>
    </div>
  );
}

export default async function SharedSegmentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : Array.isArray(sp.t) ? sp.t[0] : undefined;

  if (!verifyShareToken(id, token)) {
    return (
      <Frame>
        <div className="rounded-card border border-navy/[0.06] bg-surface p-8 text-center">
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

  const view = await getAirshipAdapter().getSingleCustomerView();
  const segment = view.segments.find((s) => s.id === id);

  if (!segment) {
    return (
      <Frame>
        <div className="rounded-card border border-navy/[0.06] bg-surface p-8 text-center">
          <h1 className="font-display text-[18px] font-bold text-title">Segment not found</h1>
          <p className="mt-2 text-[13px] text-navy">
            This segment no longer exists in the current view.
          </p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <p className="mb-3 text-[12px] text-navy">
        Shared segment{view.source === "sample" ? " · sample data" : ""}
      </p>
      {/* No shareUrl / drag handle on the shared view. */}
      <SegmentCard s={segment} showDragHandle={false} />
      <p className="mt-6 text-center text-[11px] text-navy/60">
        Powered by Single Customer View · Airship
      </p>
    </Frame>
  );
}
