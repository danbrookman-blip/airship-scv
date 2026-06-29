import { NextResponse } from "next/server";
import { getAirshipAdapter } from "@/lib/airship";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adapter = getAirshipAdapter();
    const view = await adapter.getSingleCustomerView();
    return NextResponse.json(view);
  } catch (err) {
    // Surface live-API failures rather than silently faking data.
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, hint: "Check AIRSHIP_API_TOKEN / endpoint config, or unset it to use sample data." },
      { status: 502 }
    );
  }
}
