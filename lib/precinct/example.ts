/**
 * The page opens on a worked example instead of an empty form: 1100 Central
 * Ave, Charlotte, which sits 6 m from the line between precincts 109 and 014.
 *
 * Only the Census geocoder's answer is frozen (data/precincts/example.json,
 * written by scripts/build-precinct-example.mjs). Everything the page shows is
 * resolved from it at build time against the current precinct file, so the
 * example cannot disagree with a live lookup of the same address, and opening
 * the page costs no geocoder call.
 */

import example from "@/data/precincts/example.json";
import type { GeocodeMatch } from "./geocode";
import { resolve } from "./lookup";
import type { LookupResult } from "./types";

export type PrecinctExample = { label: string; result: LookupResult };

export function precinctExample(): PrecinctExample | null {
  const r = resolve(example.match as GeocodeMatch, example.otherMatches);
  // A data rebuild that no longer places the point (it never should) drops
  // the page back to its empty state rather than showing a wrong answer.
  return r.ok ? { label: example.label, result: { ...r, lookupMs: 0 } } : null;
}
