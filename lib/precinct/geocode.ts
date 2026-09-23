/**
 * The US Census Bureau geocoder: free, keyless, and it returns the current
 * congressional and state legislative districts alongside the point, which is
 * why this lookup only has to carry precinct geometry itself.
 *
 * https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
 *
 * Nothing here logs or stores the address. It leaves this server exactly once,
 * in the request to the Census Bureau, and the response is used and discarded.
 */

import type { Districts } from "./types";

const ENDPOINT = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress";
const TIMEOUT_MS = 9000;

export type GeocodeMatch = {
  matchedAddress: string;
  lon: number;
  lat: number;
  state: string | null;
  county: string | null;
  districts: Districts;
  /** The interior point of the 2020 Census block the geocoder assigned. */
  blockPoint: { lon: number; lat: number } | null;
  /** Layer names as the geocoder labels them, for the page's vintage line. */
  layers: { congress: string | null; legislature: string | null };
};

export type GeocodeOutcome =
  | { kind: "match"; match: GeocodeMatch; otherMatches: number }
  | { kind: "none" }
  | { kind: "unavailable" };

type Geo = Record<string, string | number | undefined>;
type CensusMatch = {
  matchedAddress: string;
  coordinates: { x: number; y: number };
  addressComponents?: { state?: string };
  geographies?: Record<string, Geo[]>;
};

/** "012" → "12". District numbers read better without the padding. */
function unpad(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim().replace(/^0+(?=\d)/, "");
  return s === "" || /^Z+$/i.test(s) ? null : s;
}

/**
 * Layer names carry their vintage ("120th Congressional Districts",
 * "2026 State Legislative Districts - Upper"), so they are matched by pattern
 * and the newest wins. That way the lookup keeps working when the Census
 * Bureau rolls to the next Congress without anyone editing a string.
 */
function pickLayer(geos: Record<string, Geo[]>, pattern: RegExp): [string, Geo] | null {
  const keys = Object.keys(geos)
    .filter((k) => pattern.test(k) && geos[k]?.length)
    .sort((a, b) => (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0));
  return keys.length ? [keys[0], geos[keys[0]][0]] : null;
}

function field(g: Geo | undefined, prefix: RegExp): unknown {
  if (!g) return null;
  const key = Object.keys(g).find((k) => prefix.test(k));
  return key ? g[key] : null;
}

function parse(m: CensusMatch): GeocodeMatch {
  const geos = m.geographies ?? {};
  const cd = pickLayer(geos, /Congressional Districts$/);
  const upper = pickLayer(geos, /State Legislative Districts - Upper$/);
  const lower = pickLayer(geos, /State Legislative Districts - Lower$/);
  const county = geos["Counties"]?.[0];
  const state = geos["States"]?.[0];
  const block = pickLayer(geos, /Census Blocks$/);

  const lat = Number(block?.[1]?.INTPTLAT);
  const lon = Number(block?.[1]?.INTPTLON);

  return {
    matchedAddress: m.matchedAddress,
    lon: m.coordinates.x,
    lat: m.coordinates.y,
    state:
      (state?.STUSAB as string | undefined) ??
      (state?.STATE === "37" ? "NC" : (m.addressComponents?.state ?? null)),
    county: (county?.BASENAME as string | undefined) ?? null,
    districts: {
      congress: unpad(field(cd?.[1], /^CD\d+$/) ?? cd?.[1]?.BASENAME),
      senate: unpad(upper?.[1]?.SLDU ?? upper?.[1]?.BASENAME),
      house: unpad(lower?.[1]?.SLDL ?? lower?.[1]?.BASENAME),
    },
    blockPoint: Number.isFinite(lat) && Number.isFinite(lon) ? { lon, lat } : null,
    layers: {
      congress: cd?.[0] ?? null,
      legislature: upper?.[0]?.replace(/ - Upper$/, "") ?? null,
    },
  };
}

async function call(address: string): Promise<GeocodeOutcome> {
  const params = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (!res.ok) return { kind: "unavailable" };
  let body: { result?: { addressMatches?: CensusMatch[] } };
  try {
    body = await res.json();
  } catch {
    return { kind: "unavailable" };
  }
  const matches = body.result?.addressMatches ?? [];
  if (matches.length === 0) return { kind: "none" };
  return { kind: "match", match: parse(matches[0]), otherMatches: matches.length - 1 };
}

/** True when the text already names a state or carries a ZIP code. */
function namesAPlace(address: string): boolean {
  return /\b(NC|N\.C\.|North Carolina)\b/i.test(address) || /\b\d{5}(-\d{4})?\s*$/.test(address);
}

/**
 * "123 Main St, Boone" is a North Carolina question on this page even when the
 * visitor leaves the state unsaid, and left bare it can match a Boone in
 * another state. So text that names no state or ZIP is tried with ", NC" first,
 * and as typed only if that finds nothing — which is how an address somewhere
 * else still gets the honest "that's not in North Carolina" answer.
 */
export async function geocode(address: string): Promise<GeocodeOutcome> {
  if (namesAPlace(address)) return call(address);
  const inNc = await call(`${address}, NC`);
  if (inNc.kind !== "none") return inNc;
  return call(address);
}
