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
