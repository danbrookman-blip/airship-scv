/**
 * Adapter selector — the single swap point between live and sample data.
 *
 *   - AIRSHIP_API_TOKEN set   → LiveAirshipClient (real api.airship.co.uk)
 *   - otherwise               → SampleAirshipAdapter (zero-config demo data)
 *
 * The rest of the app imports only `getAirshipAdapter()` and the types — it
 * never knows or cares which implementation is behind the interface.
 */

import { LiveAirshipClient } from "./client";
import { SampleAirshipAdapter } from "./sample";
import type { AirshipAdapter } from "./types";

export function getAirshipAdapter(): AirshipAdapter {
  const token = process.env.AIRSHIP_API_TOKEN?.trim();
  if (token) return new LiveAirshipClient(token);
  return new SampleAirshipAdapter();
}

export * from "./types";
