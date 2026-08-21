import type { Metadata } from "next";
import Link from "next/link";
import BridgeViewscreen from "@/components/ship/BridgeViewscreen";
import { ROOMS, getRoom } from "@/lib/ship/registry";
import "@/components/ship/bridge-photoreal.css";

/**
 * The Bridge, as a photographed set rather than a generated one.
 *
 * This is a STATIC segment sitting beside `app/ship/[room]/page.tsx`. Next resolves a
 * literal segment ahead of a dynamic one, so /ship/bridge lands here and the other four
 * compartments still fall through to the procedural room. That is what makes this a
 * replacement rather than a fork: one route changed, the multi-room architecture and its
 * single GL context are untouched, and `ShipShell` skips mounting a renderer on this
 * path so nothing pays for a canvas it never shows.
 *
 * The layer sandwich is BACK video / MID render / FRONT hotspots, per the photoreal
 * pipeline spec. The render carries a real alpha hole where the viewscreen is, so the
 * video is genuinely behind the geometry rather than composited into it — which is why
 * the console silhouettes read correctly against a moving planet.
 *
 * Accessibility follows the same rule the WebGL room set: the visual is decorative and
 * the compartment is described in prose below it, so a screen reader gets a page about
 * a ship's bridge rather than an instruction to imagine one.
 */

const ROOM_SLUG = "bridge";

export const metadata: Metadata = {
  title: "Bridge",
  description:
    "The bridge of a working ship: a wide viewport onto a gas giant, six crew consoles, and a command station. Custom software, one developer, architecture to deploy.",
};

/** Measured from the render's alpha channel; see bridge-photoreal.css. */
const IMG_BASE = "/images/bridge";
const WIDTHS = [1280, 1920, 2560, 3840];
const srcset = (ext: string) =>
  WIDTHS.map((w) => `${IMG_BASE}/bridge-${w}.${ext} ${w}w`).join(", ");

/**
 * The stage is cover-fitted, so on anything taller than 16:9 it is WIDER than the
 * viewport — `100vw` would under-select a variant and ship a soft plate on portrait
 * phones. 177.8vh is the stage's real width in that regime.
 */
const SIZES = "(max-aspect-ratio: 16 / 9) 177.8vh, 100vw";

type Spot = { slug: string; label: string };

/**
 * Placed over the colonnade walls in the upper half of the frame — the lower half is
 * where the copy card and the ship computer live, and a hotspot underneath either is a
 * hit target a visitor can see and cannot press.
 *
 * The coordinates themselves are in bridge-photoreal.css, keyed on `data-spot`. They are
 * not inline styles here because an inline custom property outranks a stylesheet rule,
 * which made the narrow-viewport overrides a no-op and left the dots off screen.
 */
const SPOTS: Spot[] = [
  { slug: "portfolio", label: "Portfolio Bay" },
  { slug: "labs", label: "Labs Bay" },
  { slug: "engineering", label: "Engineering" },
  { slug: "comms", label: "Comms" },
];

export default function BridgePage() {
  const room = getRoom(ROOM_SLUG)!;
  const sealed = ROOMS.filter((r) => r.status === "sealed");

  return (
    <>
      <div className="pbridge">
        <div className="pbridge-stage">
          <BridgeViewscreen />

          <picture>
            <source type="image/avif" srcSet={srcset("avif")} sizes={SIZES} />
            <source type="image/webp" srcSet={srcset("webp")} sizes={SIZES} />
            {/* LCP element. High priority and eager: it is the page. */}
            <img
              className="pbridge-plate"
              src={`${IMG_BASE}/bridge-1920.webp`}
              alt=""
              width={3840}
              height={2160}
              decoding="async"
              fetchPriority="high"
            />
          </picture>

          <nav className="pbridge-spots" aria-label="Other compartments">
            {SPOTS.map((spot) => {
              const target = getRoom(spot.slug);
              return (
                <a
                  key={spot.slug}
                  className="pbridge-dot"
                  data-spot={spot.slug}
                  href="#coming-soon"
                  title={`${spot.label} — sealed${
                    target?.opens ? `, opens ${target.opens}` : ""
                  }`}
                >
                  <span className="pbridge-dot-label">{spot.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="ship-content">
        <div className="ship-topbar">
          <span>Ryan Stacy — Vertex Business Solutions</span>
          <span>{room.designation}</span>
        </div>

        <div className="ship-copy">
          <p className="ship-eyebrow">{room.designation}</p>
          <h1 className="ship-title">
            Custom software <em>that ships.</em>
          </h1>
          <p className="ship-blurb">{room.blurb}</p>
          <div className="ship-actions">
            <a className="ship-btn ship-btn-primary" href="#readout">
              See what shipped
            </a>
            <a className="ship-btn" href="mailto:contact@vertexapps.dev">
              Start a project
            </a>
          </div>
        </div>
      </div>

      <section className="ship-readout" id="readout" aria-labelledby="readout-h">
        <div className="ship-readout-inner">
          <h2 id="readout-h">
            Compartment {room.designation.split(" · ")[0]}
          </h2>
          <p>{room.described}</p>
          <p>
            This compartment is a photograph of a set, not a drawing of one. The
            room was built from a modular kit, lit and path-traced in Blender at
            3840×2160, and the frame you are looking at carries a real hole where
            the viewport is — so the gas giant is genuinely behind the consoles
            rather than painted onto them.
          </p>
          <p id="coming-soon">
            Four more compartments are under construction. The marked points on
            the walls lead to them, and the ship computer at the lower right
            says when each opens:{" "}
            {sealed.map((r, i) => (
              <span key={r.slug}>
                {i > 0 ? ", " : ""}
                {r.designation.replace(/^\d+\s·\s/, "")}
                {r.opens ? ` (${r.opens})` : ""}
              </span>
            ))}
            .
          </p>
          <p>
            Scene assets are credited on the{" "}
            <Link href="/legal/credits">credits page</Link>.{" "}
            <Link href="/">Return to the standard site</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
