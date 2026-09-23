/**
 * Per-client limit for the precinct route.
 *
 * `fingerprintFrom` is reused from the assistant's limiter as-is: it hashes the
 * client IP so the raw address is never held. Its `consume` is not reused,
 * because it keeps one module-level map with the assistant's own budget — a
 * visitor trying ten addresses here would spend the chat allowance there, and
 * the other way round. Same shape, separate state, a budget sized for lookups.
 *
 * Per instance and reset on cold start: it damps a script hammering the free
 * Census service through this site; it is not a quota.
 */

import { fingerprintFrom } from "@/lib/assistant/rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;

const seen = new Map<string, number[]>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, times] of seen) {
    const live = times.filter((t) => t > now - WINDOW_MS);
    if (live.length) seen.set(key, live);
    else seen.delete(key);
  }
}

export function allowLookup(headers: Headers): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);
  const key = fingerprintFrom(headers);
  const times = (seen.get(key) ?? []).filter((t) => t > now - WINDOW_MS);
  if (times.length >= MAX_REQUESTS) {
    seen.set(key, times);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((times[0] + WINDOW_MS - now) / 1000)),
    };
  }
  times.push(now);
  seen.set(key, times);
  return { allowed: true, retryAfterSeconds: 0 };
}
