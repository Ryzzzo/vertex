import type { ReactNode } from "react";

const HEADLINE = "One developer. Software that reads as a firm.";

/**
 * The headline enters a word at a time, each arriving out of focus and slightly
 * low. It is the site's one signature moment, so it is spent on the sentence
 * that carries the whole pitch rather than on decoration elsewhere.
 *
 * Driven by CSS rather than by a JS animation library on purpose. This headline
 * is the page's LCP element: a library-driven entrance ships it at opacity 0 in
 * the server-rendered HTML and only reveals it once React has hydrated, so a
 * slow connection gets a blank hero and the LCP measurement waits for the
 * bundle. A CSS animation starts at first paint, needs no JavaScript at all,
 * and produces the same effect — and under prefers-reduced-motion the rule is
 * simply never declared, so the text is just there.
 */
export default function Hero({
  visual,
  pill,
}: {
  visual: ReactNode;
  pill: ReactNode;
}) {
  const words = HEADLINE.split(" ");
  /* Where the headline finishes, so the rest of the cluster follows it in. */
  const tail = words.length;

  return (
    <section className="section hero" aria-labelledby="hero-heading">
      <div className="shell">
        <div className="hero-copy">
          <h1 id="hero-heading" className="h1 hero-title">
            {words.map((w, i) => (
              <span
                key={`${w}-${i}`}
                className="hero-word"
                style={{ ["--i" as string]: i }}
              >
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </h1>

          <p
            className="body-lg hero-sub hero-enter"
            style={{ ["--i" as string]: tail }}
          >
            One person carries your project from architecture to production — so
            nothing is lost between the person who heard you and the person who
            builds it. You get software your clients take seriously, shipped,
            documented, and <em>owned outright</em>.
          </p>

          <div
            className="hero-actions hero-enter"
            style={{ ["--i" as string]: tail + 1 }}
          >
            <a className="button" href="#selected-work">
              See the work
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 2.5v9M3 8l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            {pill}
          </div>
        </div>

      </div>

      {/* Full-bleed, so it sits outside the shell rather than in a grid cell. */}
      {visual}
    </section>
  );
}
