import { Fragment } from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ExplodedStack from "@/components/v2/ExplodedStack";
import {
  ExplodedStackCallouts,
  ExplodedStackDrawing,
} from "@/components/v2/ExplodedStackFallback";
import RevealFallback from "@/components/v2/RevealFallback";
import SmoothScroll from "@/components/v2/SmoothScroll";
import ProofBand from "@/components/v2/ProofBand";
import StaticInstrument from "@/components/v2/StaticInstrument";
import { POSE_ZOOM, stageAspect } from "@/components/v2/exploded-stack";
import { SHAPE_ORDER } from "@/components/v2/instrument-shapes";
import "./direction-a.css";

export const metadata: Metadata = {
  title: "Direction A — Instrument · Vertex prototype",
  description:
    "Preview-only prototype of a rebuilt vertexapps.dev. Not the live site.",
  // A prototype route on a preview branch has no business in an index.
  robots: { index: false, follow: false },
};

/*
 * TODO (Ryan): the thesis line is a draft, not a decision. It names the
 * problem — software that gets specified and never lands — rather than the
 * service. Alternatives worth reading aloud before this gets locked:
 *   · "Custom software for people who need it to actually ship."   ← current
 *   · "Software that ships, from the person who scoped it."
 *   · "The build does not get handed off. That is the whole product."
 * Fifteen-word cap applies here as it does to every headline on the page.
 */
const THESIS: readonly { word: string; em?: boolean }[] = [
  { word: "Custom" },
  { word: "software" },
  { word: "for" },
  { word: "people" },
  { word: "who" },
  { word: "need" },
  { word: "it" },
  { word: "to", em: true },
  { word: "actually", em: true },
  { word: "ship.", em: true },
];

/**
 * Four beats, three transitions. Each headline is at or under fifteen words —
 * the rule is that if the section can't be said in fifteen, the section isn't
 * ready. Instrument order matches SHAPE_ORDER, which is also the order the
 * particle buffers morph in, so copy and cloud can never drift apart.
 */
const BEATS = [
  {
    index: "01",
    label: "Storefront",
    // 11 words.
    head: "You already run the business. That part was never the problem.",
    copy: "The work happens. Invoices go out, clients get answered, the schedule holds together. What is missing is not effort — it is an instrument that carries the parts nobody has time to carry twice.",
    note: ["Starts from", "how you already work, not a template"],
  },
  {
    index: "02",
    label: "Build",
    // 10 words.
    head: "The instrument gets built around how the work actually happens.",
    copy: "One person scopes it and one person builds it, so nothing is lost in the translation between the two. Architecture, schema, interface, deploy pipeline — same hands the whole way down.",
    note: ["Built on", "Next.js · Supabase RLS · Vercel"],
  },
  {
    index: "03",
    label: "Operate",
    // 10 words.
    head: "You run it every day. It does not need me.",
    copy: "The thing that separates software from a project is whether it survives the person who wrote it. Documented, owned outright, and boring to operate — which is the highest compliment an internal tool can earn.",
    note: ["Handed over", "with the repo, the docs, and the keys"],
  },
  {
    index: "04",
    label: "Output",
    // 10 words.
    head: "What comes out is the point. The rest is plumbing.",
    copy: "Quotes that go out the same day. A plan rendered to a court-ready PDF. A booking confirmed without a platform taking a cut. The instrument is judged on what it produces, not on how it was made.",
    note: ["Measured by", "what the client can now do unaided"],
  },
] as const;

export default function DirectionAPage() {
  return (
    <div className="da-root">
      <RevealFallback />
      <SmoothScroll />

      <SiteHeader />

      <main>
        {/* A scroll track. The stage inside is pinned for its length, which is
            the distance the stack needs to come apart, hold, and seat. Under
            reduced motion and below 768px the track is one viewport and this
            is an ordinary hero section. */}
        <section
          className="da-hero"
          id="da-hero"
          aria-labelledby="da-thesis"
        >
        <div className="da-hero-sticky">
          <div className="da-shell da-hero-grid">
            <div className="da-hero-copy">
              <p className="da-byline">
                {/* TODO (Ryan): confirm the byline spelling before this goes
                    anywhere public. Taken from the LinkedIn slug on file. */}
                <strong>Ryan Stacy</strong>
                <span aria-hidden="true">/</span>
                Vertex Business Solutions
              </p>

              <h1 className="da-display" id="da-thesis">
                {THESIS.map((t, i) => (
                  /* The inter-word space has to sit OUTSIDE .da-word: that
                     element is overflow:hidden so it can mask the word sliding
                     up, and trailing whitespace inside it gets clipped. */
                  <Fragment key={`${t.word}-${i}`}>
                    <span
                      className="da-word"
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <span>{t.em ? <em>{t.word}</em> : t.word}</span>
                    </span>
                    {i < THESIS.length - 1 ? " " : null}
                  </Fragment>
                ))}
              </h1>

              <p
                className="da-lede da-hero-sub da-enter"
                style={{ "--i": THESIS.length } as React.CSSProperties}
              >
                One developer, carrying a build from architecture to production
                without a handoff in the middle — because the handoff is where
                most software quietly stops being what you asked for.
              </p>

              <div
                className="da-hero-actions da-enter"
                style={{ "--i": THESIS.length + 1 } as React.CSSProperties}
              >
                <a className="da-btn da-btn-primary" href="#da-proof">
                  See what shipped
                  <svg viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M7 2.5v9M3 8l4 4 4-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a className="da-btn" href="mailto:contact@vertexapps.dev">
                  Start a project
                </a>
              </div>

              <p
                className="da-cue da-enter"
                style={{ "--i": THESIS.length + 2 } as React.CSSProperties}
              >
                Proof is one scroll away
              </p>
            </div>

            {/* The client wrapper owns the stage box and the capability gate;
                the drawing inside it is server-rendered and ships in the HTML,
                so it is the first paint everywhere and the whole picture where
                WebGL never arrives. */}
            <ExplodedStack
              aspect={stageAspect()}
              zoom={POSE_ZOOM.rest}
              callouts={<ExplodedStackCallouts />}
            >
              <ExplodedStackDrawing />
            </ExplodedStack>
          </div>
        </div>
        </section>

        {/* Viewport two. Evidence before theatre, deliberately. */}
        <ProofBand />

        <div className="da-rail" id="da-rail">
          {BEATS.map((b, i) => (
            <section
              className="da-beat da-shell"
              key={b.index}
              aria-labelledby={`da-beat-${b.index}`}
            >
              <div className="da-beat-copy da-reveal">
                <p className="da-beat-index">
                  {b.index} — {b.label}
                </p>
                <h2 className="da-h2" id={`da-beat-${b.index}`}>
                  {b.head}
                </h2>
                <p className="da-copy">{b.copy}</p>
                <p className="da-beat-note">
                  <b>{b.note[0]}</b>
                  {b.note[1]}
                </p>
              </div>

              <StaticInstrument id={SHAPE_ORDER[i]} />
            </section>
          ))}
        </div>

        <section className="da-section da-tail" aria-labelledby="da-tail-h">
          <div className="da-shell">
            <p className="da-marker">
              <span className="da-placeholder">Placeholder</span>
            </p>
            {/* 9 words. */}
            <h2 className="da-h2" id="da-tail-h">
              Everything past this line is scaffolding, not a decision.
            </h2>
            <ul className="da-tail-grid">
              <li className="da-reveal">
                <h3 className="da-h3">How it gets built</h3>
                <p>
                  The method section. Not written yet — it belongs to whichever
                  direction survives this review.
                </p>
              </li>
              <li className="da-reveal">
                <h3 className="da-h3">Labs</h3>
                <p>
                  Interface studies that are not client work. Reachable today at{" "}
                  <a className="da-link" href="/labs">
                    /labs
                  </a>
                  .
                </p>
              </li>
              <li className="da-reveal">
                <h3 className="da-h3">Contact</h3>
                <p>
                  A real form, not a mailto. Out of scope for a direction
                  prototype.
                </p>
              </li>
            </ul>

            <p className="da-tail-foot">
              Direction A — Instrument · preview branch{" "}
              <code>vx/direction-a-particles</code> · not indexed, not merged.
              The live site at vertexapps.dev is untouched.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
