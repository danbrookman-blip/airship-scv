import { NextResponse } from "next/server";
import { buildViewShareUrl } from "@/lib/share/token";

export const dynamic = "force-dynamic";

/**
 * Mint a signed share URL for a Named View. Named views live only in the
 * browser, so the client posts the view's name + segment ids and we return an
 * absolute, HMAC-signed link (the signing secret never leaves the server).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name : "";
    const segmentIds = Array.isArray(body?.segmentIds)
      ? body.segmentIds.filter((x: unknown): x is string => typeof x === "string")
      : [];

    if (segmentIds.length === 0) {
      return NextResponse.json({ error: "No segments to share" }, { status: 400 });
    }

    const host = req.headers.get("host") ?? "localhost:3000";
    const proto =
      req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const url = buildViewShareUrl(`${proto}://${host}`, name, segmentIds);

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
