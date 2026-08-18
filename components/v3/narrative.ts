/**
 * The ship narrative — one spine, read by four things.
 *
 * The page is a single 1,335svh scroll track with one fixed canvas behind it
 * and ten DOM sections scrolling over. Every consumer of "where are we" reads
 * this file: the server renders sections from it, the CSS gets its heights from
 * it, the camera score names its keyframes from it, and the shader event
 * vocabulary derives its uniform ramps from it.
 *
 * ── Why heights are the source of truth, not percentages ──────────────────
 *
 * The storyboard specifies the arc in scroll percentages (hero 0-10%, schema
 * 10-22%, transition 72-80%). Percentages are the right way to *describe* an
 * arc and the wrong way to *build* one, because the moment a section's copy
 * needs another 30svh of room, every percentage downstream of it is wrong and
 * nothing tells you. v2's decisions log calls this out as "one number, two
 * renderers" (§9): the callout ladder drifted for exactly this reason, and the
 * fix was to project from the real geometry rather than from a measured
 * constant.
 *
 * So heights are authored here in svh and the fractions are *derived*. Change a
 * height and the camera keyframes, the CSS track and the section boundaries all
 * move together, because there is only one number.
 *
 * ── What that costs against the storyboard ────────────────────────────────
 *
 * Two deliberate departures, both measured rather than estimated.
 *
 * **No beat is shorter than 100svh.** A `position: sticky` child taller than
 * its containing block does not stick — it scrolls, and then overflows into the
 * section below. The descent beat was first authored at 70svh and its headline
 * sat on top of the portfolio headline for the whole portfolio beat. The floor
 * is asserted below rather than left as a convention.
 *
 * **The act break lands at 68.5%-76.0%, not the storyboard's 72%-80%.** Once
 * every beat has a viewport floor, the warm act cannot be compressed below
 * ~31% of the track without reintroducing the overlap, and buying the last
 * three points back means a ship act long enough to push the page past 15
 * viewports. The proportional intent — ship ~69%, transition about seven-tenths
 * through, warm act the remainder — is preserved, and the two-point difference
 * is not perceivable while scrolling. Retune by editing `vh` and nothing else.
 */

/** The ten beats, in scroll order. */
export type BeatId =
  | "hero"
  | "schema"
  | "rls"
  | "actions"
  | "interface"
  | "deploy"
  | "launch"
  | "descent"
  | "portfolio"
  | "footer";

/** Which aesthetic act a beat belongs to. Drives the palette blend target. */
export type Act = "ship" | "transition" | "dune";

export type Beat = {
  id: BeatId;
  act: Act;
  /** Scroll distance this beat owns, in svh. The only authored number. */
  vh: number;
  /** "01".."05" for the five capability modules; absent for the cinematic beats. */
  index?: string;
  /** Micro-label above the headline. Also the accessible name of the section. */
  label: string;
  /**
   * The headline, split so one phrase can carry the serif italic. `em` marks
   * the phrase that changes face — the site's one editorial move, held to a
   * single phrase per headline.
   */
  head: readonly { word: string; em?: boolean }[];
  /** Supporting line. Absent where the headline is the whole statement. */
  sub?: string;
  /**
   * Which side of the frame the copy sits on. The camera alternates sides down
   * the ship so the descent reads as walking around the bridge rather than
   * riding a lift past it; the copy has to alternate with it or it sits on top
   * of the thing it is describing.
   */
  side: "left" | "right" | "center";
};

/** Splits a headline string into the word array, marking the italic phrase. */
function head(text: string, em?: string): readonly { word: string; em?: boolean }[] {
  const emWords = em ? em.split(" ") : [];
  const words = text.split(" ");
  // The italic phrase is always a trailing run, so matching from the end is
  // unambiguous even when the same word appears earlier in the line.
  const start = em ? words.length - emWords.length : -1;
  return words.map((word, i) => (start >= 0 && i >= start ? { word, em: true } : { word }));
}

export const BEATS: readonly Beat[] = [
  {
    id: "hero",
    act: "ship",
    vh: 140,
    label: "Bridge",
    head: head("Custom software that ships.", "that ships."),
    sub: "One developer, from architecture to deploy.",
    side: "left",
  },
  {
    id: "schema",
    act: "ship",
    vh: 155,
    index: "01",
    label: "Schema",
    head: head("The data model is the blueprint.", "the blueprint."),
    sub: "Types before UI. Migrations before endpoints. Constraints before validation.",
    side: "left",
  },
  {
    id: "rls",
    act: "ship",
    vh: 155,
    index: "02",
    label: "Authorization",
    head: head("Authorization at the hull.", "the hull."),
    sub: "Not the airlock. Every read and every write passes the same check.",
    side: "right",
  },
  {
    id: "actions",
    act: "ship",
    vh: 155,
    index: "03",
    label: "Server actions",
    head: head("Engineering runs the ship.", "the ship."),
    sub: "One file per capability. Type-safe. Testable.",
    side: "left",
  },
  {
    id: "interface",
    act: "ship",
    vh: 155,
    index: "04",
    label: "Interface",
    head: head("The interface is where value shows up.", "shows up."),
    sub: "Everything below exists to make this screen feel obvious.",
    side: "right",
  },
  {
    id: "deploy",
    act: "ship",
    vh: 155,
    index: "05",
    label: "Deploy",
    head: head("Every system passes pre-flight.", "pre-flight."),
    sub: "Types, migrations, policies and build, checked before anything leaves the bay.",
    side: "center",
  },
  {
    id: "launch",
    act: "transition",
    vh: 100,
    label: "Departure",
    head: head("Destination: production.", "production."),
    side: "center",
  },
  {
    id: "descent",
    act: "dune",
    vh: 105,
    label: "Descent",
    head: head("Where it lives once shipped.", "lives once shipped."),
    side: "center",
  },
  {
    id: "portfolio",
    act: "dune",
    vh: 110,
    label: "Shipped",
    head: head("Four in production.", "in production."),
    sub: "Click any to enter.",
    side: "left",
  },
  {
    id: "footer",
    act: "dune",
    vh: 105,
    label: "Contact",
    head: head("Ryan Stacy", "Stacy"),
    sub: "Vertex Business Solutions",
    side: "left",
  },
];

/** Total authored track, svh. Written into CSS as `--sh-track`. */
export const TRACK_VH = BEATS.reduce((n, b) => n + b.vh, 0);

/**
 * The viewport floor, asserted rather than trusted.
 *
 * Throwing at module load means a beat authored below 100svh fails the build
 * (this module is imported by the page, which is statically generated) instead
 * of shipping as two headlines stacked on each other — which is what it looked
 * like the first time, and which reads as a CSS bug rather than as a data one.
 */
for (const b of BEATS) {
  if (b.vh < 100) {
    throw new Error(
      `narrative: beat "${b.id}" is ${b.vh}svh. A sticky child taller than its ` +
        `containing block does not stick, so every beat must be at least 100svh.`,
    );
  }
}

/**
 * Cumulative start fraction of each beat, 0-1. Built once at module load; every
 * consumer reads the same object, so a height change can never desynchronise
 * the camera from the copy.
 */
export const RANGES: Readonly<Record<BeatId, readonly [number, number]>> = (() => {
  const out = {} as Record<BeatId, readonly [number, number]>;
  let acc = 0;
  for (const b of BEATS) {
    const start = acc / TRACK_VH;
    acc += b.vh;
    out[b.id] = [start, acc / TRACK_VH];
  }
  return out;
})();

/** Start fraction of a beat. Sugar, because the score reads these constantly. */
export const at = (id: BeatId) => RANGES[id][0];
/** End fraction of a beat. */
export const end = (id: BeatId) => RANGES[id][1];
/** Span of a beat, as a fraction of the whole track. */
export const span = (id: BeatId) => RANGES[id][1] - RANGES[id][0];

/**
 * The act break. Cool ship holds until the launch beat opens; the palette
 * crosses to warm across the launch beat itself and is fully Dune by the time
 * the descent starts. Everything that blends between the two palettes reads
 * these two numbers and nothing else.
 */
export const ACT_BREAK_IN = at("launch");
export const ACT_BREAK_OUT = end("launch");

/** The five capability modules, in camera order. */
export const MODULES = BEATS.filter((b) => b.index) as readonly (Beat & {
  index: string;
})[];
