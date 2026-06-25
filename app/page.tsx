import { headers } from "next/headers";
import { getAirshipAdapter } from "@/lib/airship";
import { SegmentBoard } from "@/components/SegmentBoard";
import { AppShell } from "@/components/AppShell";
import { buildShareUrl } from "@/lib/share/token";

export const dynamic = "force-dynamic";

export default async function Page() {
  const view = await getAirshipAdapter().getSingleCustomerView();

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
      <SegmentBoard
        segments={segments}
        shareUrls={shareUrls}
        live={live}
        source={view.source}
        generatedAt={view.generatedAt}
      />
    </AppShell>
  );
}
