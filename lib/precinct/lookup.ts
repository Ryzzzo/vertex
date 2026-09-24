/**
 * Address in, precinct out. Every failure comes back as a `LookupError` whose
 * message is written for the visitor, because on this page the error states are
 * part of the product: a PO box, an out-of-state match and a geocoder outage
 * each need a different, honest sentence.
 */

import { geocode } from "./geocode";
import { locate, mapPayload, precinctAt, precinctRef } from "./engine";
import { precinctFeature, precinctInfo, sharedFeature } from "./geo";
import type { LookupError, LookupResponse } from "./types";

export const MAX_ADDRESS_LENGTH = 200;

/**
 * PO boxes, private mailboxes and general delivery. Checked before geocoding
 * because the geocoder either fails on them or matches the post office, and a
 * precinct is decided by where someone lives, not where their mail is held.
 */
const MAILBOX =
  /\b(p\.?\s*o\.?\s*box|post\s+office\s+box|p\.?\s*o\.?\s*b\b|pmb\s*\d|general\s+delivery)\b/i;

function fail(code: LookupError["code"], message: string, extra: Partial<LookupError> = {}): LookupError {
  return { ok: false, code, message, ...extra };
}

export async function lookup(raw: string): Promise<LookupResponse> {
  const address = raw.replace(/\s+/g, " ").trim();
  if (!address) return fail("empty", "Type a street address to look up.");
  if (address.length > MAX_ADDRESS_LENGTH) {
    return fail("too_long", "That's longer than any street address. Try just the street, city and ZIP.");
  }
  if (MAILBOX.test(address)) {
    return fail(
      "po_box",
      "A PO box is where mail is held, not where someone lives — and a precinct is set by the residence. Try the street address of the home instead.",
    );
  }

  const outcome = await geocode(address);
  if (outcome.kind === "unavailable") {
    return fail(
      "geocoder_unavailable",
      "The Census Bureau's address service didn't answer in time. It's free and occasionally slow — try again in a moment.",
    );
  }
  if (outcome.kind === "none") {
    return fail(
      "no_match",
      "No match for that address. Include the house number and street, and the city or ZIP. New construction and rural route addresses are sometimes missing from Census records.",
    );
  }

  const { match, otherMatches } = outcome;
  if (match.state !== "NC") {
    return fail(
      "outside_nc",
      "That address is outside North Carolina. This lookup only covers North Carolina precincts.",
      { matchedAddress: match.matchedAddress },
    );
  }

  const started = performance.now();
  const located = locate(match.lon, match.lat);
  if (!located) {
    return fail(
      "no_precinct",
      "The address matched, but the point it resolved to isn't inside any State Board precinct — usually water or a gap between two counties' maps. Check it with the State Board's lookup.",
      { matchedAddress: match.matchedAddress },
    );
  }

  const block = match.blockPoint ? precinctAt(match.blockPoint.lon, match.blockPoint.lat) : null;
  const { map, closeup } = mapPayload(located);
  const { frame, nearest, precinct, acrossPrecinct } = located;
  const geo = {
    match: precinctFeature(precinct),
    across: acrossPrecinct ? precinctFeature(acrossPrecinct) : null,
    shared: acrossPrecinct ? sharedFeature(precinct, acrossPrecinct) : null,
    nearest: [
      Math.round((frame.lon0 + nearest[0] / frame.kx) * 1e6) / 1e6,
      Math.round((frame.lat0 - nearest[1] / frame.ky) * 1e6) / 1e6,
    ] as [number, number],
  };
  const lookupMs = Math.round((performance.now() - started) * 100) / 100;

  return {
    ok: true,
    matchedAddress: match.matchedAddress,
    otherMatches,
    location: {
      lon: Math.round(match.lon * 1e6) / 1e6,
      lat: Math.round(match.lat * 1e6) / 1e6,
    },
    county: located.precinct.county,
    precinct: precinctRef(located.precinct),
    districts: match.districts,
    boundary: { ...located.boundary, block: block ? precinctRef(block) : null },
    map,
    closeup,
    info: precinctInfo(precinct),
    geo,
    lookupMs,
  };
}
