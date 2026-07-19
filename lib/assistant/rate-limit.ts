import { createHash } from "node:crypto";

/**
 * In-memory sliding-window rate limit for the assistant endpoint.
 *
 * This is per-instance and resets on cold start, so it damps abuse rather than
 * enforcing a hard quota — appropriate for a marketing-site widget, and not a
 * security control. Anything that genuinely needs to be enforced belongs in a
 * shared store (or upstream, at the edge).
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const SWEEP_INTERVAL_MS = 60 * 1000;

/** fingerprint -> ascending timestamps of requests inside the current window */
const requests = new Map<string, number[]>();
let lastSweep = 0;

/**
 * Hashes the client IP so the raw address is never stored or logged. The hash
 * is the only identifier that leaves this module.
 */
export function fingerprintFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const ip = first || headers.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

/** Drops fingerprints with no activity inside the window so the map stays bounded. */
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  const cutoff = now - WINDOW_MS;
  for (const [key, timestamps] of requests) {
    const live = timestamps.filter((t) => t > cutoff);
    if (live.length === 0) {
      requests.delete(key);
    } else if (live.length !== timestamps.length) {
      requests.set(key, live);
    }
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the oldest request in the window ages out. Zero when allowed. */
  retryAfterSeconds: number;
};

export function consume(fingerprint: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const cutoff = now - WINDOW_MS;
  const timestamps = (requests.get(fingerprint) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= MAX_REQUESTS) {
    requests.set(fingerprint, timestamps);
    const oldest = timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  timestamps.push(now);
  requests.set(fingerprint, timestamps);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - timestamps.length,
    retryAfterSeconds: 0,
  };
}
