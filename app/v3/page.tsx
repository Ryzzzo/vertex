import type { Metadata } from "next";
import { Fragment } from "react";

import Scene from "@/components/v3/Scene";
import { BridgeDrawing, DuneDrawing } from "@/components/v3/ShipDrawing";
import SmoothScroll from "@/components/v2/SmoothScroll";
import { BEATS, TRACK_VH, type Beat, type BeatId } from "@/components/v3/narrative";
import { paletteVars } from "@/components/v3/palette";
import { work } from "@/lib/content";
import "./ship.css";

export const metadata: Metadata = {
  title: "The Ship · Vertex prototype",
  description:
    "Preview-only prototype of a rebuilt vertexapps.dev. Not the live site.",
  // A prototype route on a preview branch has no business in an index.
  robots: { index: false, follow: false },
};

/**
 * The four the plain carries.
 *
 * The storyboard names ConsultBase, Parenting Plan Pro, Villa L'Estagne and
 * Fee Engine. Two of those are changed here and the change is deliberate: the
 * headline reads "Four in production", and Villa L'Estagne has no live URL
 * ("Preview coming soon" in `lib/content.ts`) while Fee Engine is an interface
 * concept under /labs. Shipping either under that headline would put a false
 * claim on a client-facing page.
 *
 * So the list is derived rather than hand-written — the first four entries in
 * `work` that actually have a URL — which also means it stays true if the
 * content file changes. Worth a look before this is signed off: if Villa
 * L'Estagne matters visually, the fix is the headline, not the data.
 */
const MONOLITHS = work.filter((w) => w.url).slice(0, 4);

/** The five press-and-hold controls, one per capability module. */
const HOLD_LABEL: Partial<Record<BeatId, string>> = {
  schema: "Hold to read the model",
  rls: "Hold to open the gate",
  actions: "Hold to run the arm",
  interface: "Hold to run the query",
  deploy: "Hold to arm pre-flight",
};

function Headline({ beat }: { beat: Beat }) {
  return (
    <h2 className="sh-h">
      {beat.head.map((w, i) => (
        <Fragment key={i}>
          {i > 0 ? " " : ""}
          {w.em ? <em>{w.word}</em> : w.word}
        </Fragment>
      ))}
    </h2>
  );
}

/**
 * The text the console screens deliberately do not bake in.
 *
 * The render shows row rhythm; this is the same content as real, selectable,
 * zoomable, screen-readable text. That pairing is what makes the abstraction on
 * the screen legitimate rather than a shortcut — see the header of
 * `ship-parts.ts` and WCAG 1.4.5.
 */
function SchemaBlock() {
  return (
    <pre className="sh-pre" aria-label="Prisma schema for the Quote model">
      <code>
        <span className="k">model</span> Quote {"{"}
        {"\n"}  id        String    <span className="d">@id</span>
        {"\n"}  amount    Decimal   <span className="d">@db.Money</span>
        {"\n"}  clientId  String    <span className="d">@index</span>
        {"\n"}  status    Status    <span className="d">@default(Open)</span>
        {"\n"}  createdAt DateTime  <span className="d">@default(now())</span>
        {"\n"}
        {"}"}
        {"\n"}
        {"\n"}<span className="d">@@index([status, createdAt])</span>
      </code>
    </pre>
  );
}

function TerminalBlock() {
  return (
    <pre className="sh-pre" aria-label="A query running against the quotes table">
      <code>
        <span className="g">$</span> select * from quotes
        {"\n"}  where status = <span className="k">&apos;Open&apos;</span>
        {"\n"}
        {"\n"}<span className="g">→</span> 143 rows · 12ms
        {"\n"}<span className="g">→</span> render → dashboard
        {"\n"}<span className="g">status: OK</span>
      </code>
    </pre>
  );
}

/** Everything a beat carries beyond its headline and sub. */
function BeatExtras({ beat }: { beat: Beat }) {
  const hold = HOLD_LABEL[beat.id];
  return (
    <>
      {beat.id === "schema" ? <SchemaBlock /> : null}
      {beat.id === "interface" ? <TerminalBlock /> : null}

      {beat.id === "hero" ? (
        <>
          <div className="sh-actions">
            <a className="sh-btn sh-btn-primary" href="#sh-portfolio">
              See what shipped
            </a>
            <a className="sh-btn" href="mailto:r.stacy@me.com">
              Start a project
            </a>
          </div>
          <p className="sh-cue">Pre-flight ↓</p>
        </>
      ) : null}

      {beat.id === "portfolio" ? (
        <ul className="sh-monoliths">
          {MONOLITHS.map((w, i) => (
            <li key={w.slug}>
              <a
                href={w.url}
                data-sh-monolith={w.slug}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span className="sh-mono-i">{String(i + 1).padStart(2, "0")}</span>
                <span className="sh-mono-n">{w.name}</span>
                <span className="sh-mono-l">{w.stack.split(" · ")[0]}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {beat.id === "footer" ? (
        <>
          <ul className="sh-foot-links">
            <li>
              <a href="mailto:r.stacy@me.com">r.stacy@me.com</a>
            </li>
            <li>
              <a href="/labs">Labs</a>
            </li>
            <li>
              <a href="https://www.linkedin.com/in/rystacy/" rel="noreferrer noopener">
                LinkedIn
              </a>
            </li>
            <li>
              <a href="https://github.com/Ryzzzo" rel="noreferrer noopener">
                GitHub
              </a>
            </li>
          </ul>
          <p className="sh-note">
            The Ship · preview branch <code>vx/ship-hero-v3</code> · not indexed,
            not merged. The live site at vertexapps.dev is untouched.
          </p>
        </>
      ) : null}

      {hold ? (
        /*
         * Revealed by the render loop, not by CSS. A control that drives a
         * canvas which is not running is a control that lies — so on the
         * drawing-only path it stays out of the layout and out of the
         * accessibility tree entirely.
         */
        <button className="sh-hold" type="button" data-sh-hold={beat.id} aria-pressed="false" hidden>
          <i aria-hidden="true" />
          <span>{hold}</span>
        </button>
      ) : null}
    </>
  );
}

function BeatSection({ beat }: { beat: Beat }) {
  const id = `sh-${beat.id}`;
  return (
    <section
      className="sh-beat"
      id={id}
      aria-labelledby={`${id}-h`}
      style={{ "--sh-vh": beat.vh } as React.CSSProperties}
    >
      <div className="sh-pin" data-side={beat.side}>
        <div className="sh-copy">
          <p className="sh-label">
            {beat.index ? <b>{beat.index}</b> : null}
            {beat.label}
          </p>
          <div id={`${id}-h`}>
            <Headline beat={beat} />
          </div>
          {beat.sub ? <p className="sh-sub">{beat.sub}</p> : null}
          <BeatExtras beat={beat} />
        </div>
      </div>
    </section>
  );
}

export default function ShipPage() {
  const ship = BEATS.filter((b) => b.act !== "dune");
  const dune = BEATS.filter((b) => b.act === "dune");

  return (
    <div
      className="sh-root"
      style={{ ...paletteVars(), "--sh-track": TRACK_VH } as React.CSSProperties}
    >
      <SmoothScroll />

      {/* The canvas layer. Fixed, behind everything, and only ever mounted
          where the capability gate says it is worth the download. */}
      <div className="sh-stage">
        <Scene />
      </div>

      <p className="sh-byline">
        <span>Ryan Stacy · Vertex Business Solutions</span>
        <span aria-hidden="true">Preview</span>
      </p>

      <main className="sh-track">
        {/* Two acts, two drawings. The backdrops are sticky inside their act
            wrapper, so the picture changes at the act break with no JavaScript
            at all — which is what makes the no-WebGL path a real two-act page
            rather than a bridge that never leaves. */}
        <div className="sh-act" data-act="ship">
          <div className="sh-backdrop">
            <BridgeDrawing />
          </div>
          {ship.map((b) => (
            <BeatSection key={b.id} beat={b} />
          ))}
        </div>

        <div className="sh-act" data-act="dune" id="sh-portfolio">
          <div className="sh-backdrop">
            <DuneDrawing />
          </div>
          {dune.map((b) => (
            <BeatSection key={b.id} beat={b} />
          ))}
        </div>
      </main>
    </div>
  );
}
