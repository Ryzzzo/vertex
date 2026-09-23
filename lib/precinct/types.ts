/**
 * The contract between POST /api/precinct and the page. Shared so the client
 * cannot drift from what the route actually returns.
 *
 * Map coordinates are metres in a local frame centred on the geocoded point:
 * x runs east, y runs SOUTH (screen order), so the client can drop them into an
 * SVG viewBox without flipping anything. At the scale of one precinct a flat
 * frame is accurate to well under a metre.
 */

export type Xy = [number, number];
export type Ring = Xy[];
/** minX, minY, maxX, maxY in the local frame. */
export type Box = [number, number, number, number];

export type PrecinctRef = {
  /** State Board precinct code, e.g. "013" or "01-20". Unique within a county. */
  id: string;
  /** Precinct name as the State Board publishes it. */
  name: string;
  county: string;
};

export type ShapeRole = "match" | "across" | "neighbor";

export type MapShape = PrecinctRef & {
  role: ShapeRole;
  /** Outer rings and holes together; rendered with the even-odd rule. */
  rings: Ring[];
  /** A point comfortably inside the shape and inside the view, for a label. */
  label?: Xy;
};

export type MapLayer = {
  /** The box the client should frame. Shapes extend past it so any aspect ratio fills. */
  view: Box;
  shapes: MapShape[];
  /** The boundary between the match and the precinct across, as polylines. */
  shared: Ring[];
};

export type Districts = {
  /** US House district number, no leading zeros ("12"). */
  congress: string | null;
  /** NC Senate district number ("41"). */
  senate: string | null;
  /** NC House district number ("102"). */
  house: string | null;
};

export type BoundaryReport = {
  /** Distance from the geocoded point to the edge of its precinct, metres. */
  distanceM: number;
  /** True when that distance is under the threshold and another precinct is across the line. */
  near: boolean;
  thresholdM: number;
  /** The precinct on the other side of the nearest line, when near. */
  across: PrecinctRef | null;
  /**
   * The precinct holding the interior point of the Census block the geocoder
   * assigned this address to. Blocks are bounded by streets and the geocoder
   * picks the block on the address's side of the street, so when a precinct
   * line follows a street this is a second, independent read of the side.
   */
  block: PrecinctRef | null;
};

export type LookupResult = {
  ok: true;
  /** As the geocoder matched it, so the visitor can confirm it is their address. */
  matchedAddress: string;
  /** How many further candidates the geocoder returned; the first is used. */
  otherMatches: number;
  location: { lon: number; lat: number };
  county: string;
  precinct: PrecinctRef;
  districts: Districts;
  boundary: BoundaryReport;
  map: MapLayer;
  /** A tight window on the line, only when the address is near one. */
  closeup: (MapLayer & { nearest: Xy }) | null;
  /** Server-side lookup time, geocoding excluded, for the page's own footnote. */
  lookupMs: number;
};

export type LookupErrorCode =
  | "empty"
  | "too_long"
  | "po_box"
  | "no_match"
  | "outside_nc"
  | "no_precinct"
  | "geocoder_unavailable"
  | "rate_limited"
  | "bad_request";

export type LookupError = {
  ok: false;
  code: LookupErrorCode;
  /** Human copy, ready to show. */
  message: string;
  /** Present when the geocoder did match something, e.g. an out-of-state address. */
  matchedAddress?: string;
  retryAfterSeconds?: number;
};

export type LookupResponse = LookupResult | LookupError;
