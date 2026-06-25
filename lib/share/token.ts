import crypto from "node:crypto";

/**
 * Stateless capability tokens for sharing a single segment by link — mirrors
 * Airship's `?t=<token>` share pattern. The token is an HMAC of the segment id
 * with a server-side secret, so it can be minted and verified without any
 * storage and can't be forged by guessing an id.
 *
 * Set SCV_SHARE_SECRET in production. The dev fallback keeps prototype links
 * working but is not secret.
 */
const SECRET = process.env.SCV_SHARE_SECRET || "scv-dev-share-secret-change-me";

/** Mint a 32-char alphanumeric token for a segment (Airship-style format). */
export function mintShareToken(segmentId: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`segment:${segmentId}`)
    .digest("base64url")
    .replace(/[-_]/g, "")
    .slice(0, 32);
}

/** Constant-time verify of a token against a segment id. */
export function verifyShareToken(segmentId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = mintShareToken(segmentId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Build the absolute share URL for a segment given the request host/proto. */
export function buildShareUrl(origin: string, segmentId: string): string {
  return `${origin}/segment/${encodeURIComponent(segmentId)}?t=${mintShareToken(segmentId)}`;
}

/* -------------------------------------------------------------------------- */
/* Named-view sharing                                                         */
/*                                                                            */
/* A Named View is client-only state (localStorage) — the server has no       */
/* record of it. So a share link carries the view's *contents* (name + the    */
/* segment ids it contains) in the URL, signed with an HMAC so the payload     */
/* can't be tampered with. The recipient's server re-resolves those ids        */
/* against live/sample segment data and renders them together.                */
/* -------------------------------------------------------------------------- */

export interface ViewSharePayload {
  name: string;
  segmentIds: string[];
}

/** Pack a view's name + segment ids into a URL-safe base64url string. */
export function encodeViewPayload(name: string, segmentIds: string[]): string {
  const json = JSON.stringify({ n: name, s: segmentIds });
  return Buffer.from(json, "utf8").toString("base64url");
}

/** Decode a view payload string back into name + segment ids (null if malformed). */
export function decodeViewPayload(d: string | null | undefined): ViewSharePayload | null {
  if (!d) return null;
  try {
    const obj = JSON.parse(Buffer.from(d, "base64url").toString("utf8"));
    if (!obj || typeof obj.n !== "string" || !Array.isArray(obj.s)) return null;
    const segmentIds = (obj.s as unknown[]).filter((x): x is string => typeof x === "string");
    return { name: obj.n, segmentIds };
  } catch {
    return null;
  }
}

/** Mint a token over an encoded view payload. */
export function mintViewToken(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`view:${encodedPayload}`)
    .digest("base64url")
    .replace(/[-_]/g, "")
    .slice(0, 32);
}

/** Constant-time verify of a token against an encoded view payload. */
export function verifyViewToken(encodedPayload: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = mintViewToken(encodedPayload);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Build the absolute share URL for a named view given the request host/proto. */
export function buildViewShareUrl(origin: string, name: string, segmentIds: string[]): string {
  const d = encodeViewPayload(name, segmentIds);
  return `${origin}/view?d=${d}&t=${mintViewToken(d)}`;
}
