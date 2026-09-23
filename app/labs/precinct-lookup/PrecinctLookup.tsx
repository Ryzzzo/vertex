"use client";

import { useEffect, useId, useRef, useState } from "react";
import overview from "@/data/precincts/overview.json";
import type { LookupError, LookupResponse, LookupResult } from "@/lib/precinct/types";
import PrecinctPlate from "./PrecinctPlate";

const NCSBE_LOOKUP = "https://vt.ncsbe.gov/RegLkup/";

/**
 * Samples. The first two are the point of the piece: the same block of the
 * same street, opposite sides, different precincts — reachable in one click.
 */
const SAMPLES: Array<{ label: string; address: string }> = [
  { label: "1100 Central Ave", address: "1100 Central Ave, Charlotte, NC" },
  { label: "1101 Central Ave", address: "1101 Central Ave, Charlotte, NC" },
  { label: "200 College St, Asheville", address: "200 College St, Asheville, NC" },
  { label: "2000 W Club Blvd, Durham", address: "2000 W Club Blvd, Durham, NC" },
];

/** Under this, a loading indicator is a flicker, not information. */
const QUIET_MS = 300;

type Status =
  | { kind: "idle" }
  | { kind: "loading"; slow: boolean }
  | { kind: "error"; error: LookupError };

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtM(m: number): string {
  if (m >= 1000) return `${(m / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;
  return `${m.toLocaleString("en-US", { maximumFractionDigits: m < 10 ? 1 : 0 })} m`;
}

/** Where a lon/lat falls on the statewide drawing, as percentages. */
function onOverview(lon: number, lat: number) {
  const x = overview.pad + (lon - overview.lonMin) * overview.kx * overview.scale;
  const y = overview.pad + (overview.latMax - lat) * overview.scale;
  return { left: `${(x / overview.width) * 100}%`, top: `${(y / overview.height) * 100}%` };
}

function precinctTitle(id: string, name: string) {
  return name && name !== id ? name : null;
}

/* ── Statewide drawing ─────────────────────────────────────────────────── */

function StateDrawing({
  lon,
  lat,
  compact,
  precinctCount,
}: {
  lon?: number;
  lat?: number;
  compact?: boolean;
  precinctCount: number;
}) {
  return (
    <div className={compact ? "pl-state pl-state-compact" : "pl-state"}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image adds nothing to vector art */}
      <img
        className="pl-state-img"
        src="/labs-shots/precinct-lookup/nc-precincts.svg"
        width={overview.width}
        height={overview.height}
        alt={
          compact
            ? "Locator: where this address sits in North Carolina"
            : `Every voting precinct boundary in North Carolina — ${precinctCount.toLocaleString("en-US")} precincts`
        }
        decoding="async"
      />
      {lon !== undefined && lat !== undefined ? (
        <span className="pl-state-pin" style={onOverview(lon, lat)} aria-hidden="true" />
      ) : null}
    </div>
  );
}

/* ── The answer ─────────────────────────────────────────────────────────── */

function Verdict({ r }: { r: LookupResult }) {
  const { boundary: b, precinct: p } = r;
  const across = b.across;

  if (!b.near || !across) {
    return (
      <div className="pl-verdict pl-verdict-clear">
        <p className="pl-verdict-head">
          <span className="pl-dot pl-dot-clear" aria-hidden="true" />
          Clear of the lines
        </p>
        <p className="pl-verdict-body">
          The nearest precinct line is {fmtM(b.distanceM)} away — well past the{" "}
          {b.thresholdM} m at which this lookup starts to hedge.
        </p>
      </div>
    );
  }

  const blockAgrees = b.block !== null && b.block.id === p.id && b.block.county === p.county;
  const blockAcross =
    b.block !== null && b.block.id === across.id && b.block.county === across.county;

  if (blockAgrees) {
    return (
      <div className="pl-verdict pl-verdict-line">
        <p className="pl-verdict-head">
          <span className="pl-dot pl-dot-line" aria-hidden="true" />
          On the line — both reads agree
        </p>
        <p className="pl-verdict-body">
          This address sits {fmtM(b.distanceM)} from the boundary with precinct{" "}
          {across.id}
          {across.county !== p.county ? ` (${across.county} County)` : ""}. The
          Census geocoder places it on {p.id}’s side, and the Census block
          for that side of the street is in {p.id} too. Two independent reads,
          one answer — but at this distance, the State Board’s record is the
          one that counts.
        </p>
      </div>
    );
  }

  return (
    <div className="pl-verdict pl-verdict-split">
      <p className="pl-verdict-head">
        <span className="pl-dot pl-dot-split" aria-hidden="true" />
        Too close to call
      </p>
      <p className="pl-verdict-body">
        The point lands in {p.id}, {fmtM(b.distanceM)} from {across.id}
        {blockAcross
          ? `, but the Census block for this side of the street is in ${across.id}. The two reads disagree`
          : ", and the Census block check couldn't confirm the side"}
        . It could be either precinct — check the State Board’s lookup.
      </p>
    </div>
  );
}

function Answer({ r }: { r: LookupResult }) {
  const name = precinctTitle(r.precinct.id, r.precinct.name);
  const d = r.districts;
  return (
    <div className="pl-answer">
      <p className="marker pl-answer-kicker">Precinct · {r.county} County</p>
      <p className="pl-answer-id">{r.precinct.id}</p>
      {name ? <p className="marker pl-answer-name">{name}</p> : null}

      <dl className="pl-districts">
        <div className="pl-district">
          <dt>US House</dt>
          <dd>{d.congress ?? "—"}</dd>
        </div>
        <div className="pl-district">
          <dt>NC Senate</dt>
          <dd>{d.senate ?? "—"}</dd>
        </div>
        <div className="pl-district">
          <dt>NC House</dt>
          <dd>{d.house ?? "—"}</dd>
        </div>
      </dl>

      <p className="pl-matched">
        <span className="pl-matched-label">Matched as</span>{" "}
        <span className="pl-matched-address">{r.matchedAddress}</span>
        {r.otherMatches > 0 ? (
          <span className="pl-matched-more">
            {" "}
            · {r.otherMatches} other candidate{r.otherMatches === 1 ? "" : "s"} — add a
            ZIP if this isn’t yours
          </span>
        ) : null}
      </p>

      <Verdict r={r} />

      <a className="pl-official" href={NCSBE_LOOKUP} target="_blank" rel="noreferrer noopener">
        Confirm with the State Board’s voter lookup <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

/* ── The page's instrument ──────────────────────────────────────────────── */

export default function PrecinctLookup({
  precinctCount,
  countyCount,
  precinctsAsOf,
  toleranceMeters,
}: {
  precinctCount: number;
  countyCount: number;
  precinctsAsOf: string;
  toleranceMeters: number;
}) {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [result, setResult] = useState<LookupResult | null>(null);
  const [announce, setAnnounce] = useState("");
  const inFlight = useRef<AbortController | null>(null);
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();

  useEffect(() => () => inFlight.current?.abort(), []);

  async function run(value: string) {
    const query = value.trim();
    inFlight.current?.abort();
    if (!query) {
      setStatus({
        kind: "error",
        error: { ok: false, code: "empty", message: "Type a street address to look up." },
      });
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    setStatus({ kind: "loading", slow: false });
    const slowTimer = window.setTimeout(() => {
      setStatus((s) => (s.kind === "loading" ? { kind: "loading", slow: true } : s));
    }, QUIET_MS);

    let body: LookupResponse;
    try {
      const res = await fetch("/api/precinct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: query }),
        signal: controller.signal,
      });
      body = (await res.json()) as LookupResponse;
    } catch (err) {
      window.clearTimeout(slowTimer);
      if (controller.signal.aborted) return;
      void err;
      body = {
        ok: false,
        code: "geocoder_unavailable",
        message: "Couldn't reach the lookup. Check your connection and try again.",
      };
    }
    window.clearTimeout(slowTimer);
    if (controller.signal.aborted) return;

    if (body.ok) {
      setResult(body);
      setStatus({ kind: "idle" });
      const where = body.boundary.near && body.boundary.across
        ? ` On the line with precinct ${body.boundary.across.id}.`
        : "";
      setAnnounce(
        `Precinct ${body.precinct.id}, ${body.county} County. US House ${body.districts.congress ?? "unknown"}, NC Senate ${body.districts.senate ?? "unknown"}, NC House ${body.districts.house ?? "unknown"}.${where}`,
      );
    } else {
      // The previous answer would sit under an error about a different
      // address and read as the answer to this one. Clear it.
      setResult(null);
      setStatus({ kind: "error", error: body });
      setAnnounce("");
    }
  }

  const loading = status.kind === "loading";
  const error = status.kind === "error" ? status.error : null;

  return (
    <div className="pl" data-state={result ? "result" : "empty"}>
      <div className="pl-strip marker" aria-hidden="true">
        <span>NC · {precinctCount.toLocaleString("en-US")} precincts</span>
        <span className="pl-strip-counties">{countyCount} counties</span>
        <span className="pl-strip-wide">State Board boundaries as of {formatDate(precinctsAsOf)}</span>
        <span className="pl-strip-live">
          <span className="pl-dot pl-dot-clear" /> live
        </span>
      </div>

      <div className="pl-grid-layout">
        <div className="pl-side">
          <form
            className="pl-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(address);
            }}
            noValidate
          >
            <label className="pl-label-text" htmlFor={inputId}>
              Street address in North Carolina
            </label>
            <div className="pl-field">
              <input
                id={inputId}
                className="pl-input"
                type="text"
                inputMode="text"
                autoComplete="street-address"
                enterKeyHint="search"
                spellCheck={false}
                placeholder="e.g. 600 E 4th St, Charlotte"
                value={address}
                maxLength={200}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (status.kind === "error") setStatus({ kind: "idle" });
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : hintId}
              />
              <button className="pl-submit" type="submit" aria-busy={loading || undefined}>
                {loading ? "Looking up" : "Look up"}
              </button>
            </div>

            {error ? (
              <div className="pl-error" id={errorId} role="alert">
                <span className="pl-error-icon" aria-hidden="true">!</span>
                <div>
                  <p className="pl-error-text">{error.message}</p>
                  {error.matchedAddress ? (
                    <p className="pl-error-matched">Matched as {error.matchedAddress}</p>
                  ) : null}
                  {error.code === "no_precinct" || error.code === "no_match" ? (
                    <a className="pl-official" href={NCSBE_LOOKUP} target="_blank" rel="noreferrer noopener">
                      State Board voter lookup <span aria-hidden="true">↗</span>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="pl-hint" id={hintId}>
                Sent only to the US Census Bureau’s geocoder. Not logged, not
                stored; no cookies, no analytics.
              </p>
            )}

            <div className="pl-samples">
              <span className="pl-samples-label marker">Same street, opposite sides</span>
              <div className="pl-samples-row">
                {SAMPLES.slice(0, 2).map((s) => (
                  <button
                    key={s.address}
                    type="button"
                    className="pl-sample"
                    onClick={() => {
                      setAddress(s.address);
                      void run(s.address);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="pl-samples-label marker">Or try</span>
              <div className="pl-samples-row">
                {SAMPLES.slice(2).map((s) => (
                  <button
                    key={s.address}
                    type="button"
                    className="pl-sample"
                    onClick={() => {
                      setAddress(s.address);
                      void run(s.address);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </form>

          <p className="pl-status marker" aria-live="polite">
            {status.kind === "loading" && status.slow ? "Asking the Census geocoder…" : ""}
          </p>

          {result ? (
            <div className={loading ? "pl-result is-stale" : "pl-result"} key={result.matchedAddress}>
              <Answer r={result} />
            </div>
          ) : null}
        </div>

        <div className={loading && result ? "pl-stage is-stale" : "pl-stage"}>
          {result ? (
            <div className="pl-plates" key={`p-${result.matchedAddress}`}>
              <PrecinctPlate
                layer={result.map}
                kind="main"
                label={`Map of precinct ${result.precinct.id} in ${result.county} County with its neighbouring precincts and the address marked.`}
              >
                <StateDrawing
                  compact
                  lon={result.location.lon}
                  lat={result.location.lat}
                  precinctCount={precinctCount}
                />
              </PrecinctPlate>
              {result.closeup && result.boundary.across ? (
                <figure className="pl-closeup">
                  <PrecinctPlate
                    layer={result.closeup}
                    kind="closeup"
                    nearest={result.closeup.nearest}
                    distanceM={result.boundary.distanceM}
                    label={`Close-up of the boundary between precinct ${result.precinct.id} and precinct ${result.boundary.across.id}; the address is ${fmtM(result.boundary.distanceM)} from the line.`}
                  />
                  <figcaption className="pl-closeup-caption marker">
                    At the line, {fmtM(Math.round(result.closeup.view[2] - result.closeup.view[0]))} across.
                    The dot is where the Census geocoder put the address; the
                    bright line is the State Board’s boundary.
                  </figcaption>
                </figure>
              ) : null}
            </div>
          ) : (
            <div className="pl-empty">
              <StateDrawing precinctCount={precinctCount} />
              <p className="pl-empty-caption marker">
                Every line here is a precinct boundary —{" "}
                {precinctCount.toLocaleString("en-US")} of them, drawn from the
                State Board’s file.
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="pl-vintage marker">
        Unofficial. Precincts: NC State Board of Elections, as of {formatDate(precinctsAsOf)},
        simplified to ~{Math.round(toleranceMeters)} m. Districts: US Census Bureau geocoder — US
        House S.L. 2025-95, NC Senate S.L. 2023-146, NC House S.L. 2023-149, the maps in force for
        the Nov 3, 2026 general election (checked Sep 23, 2026).
      </p>

      <p className="pl-sr" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
