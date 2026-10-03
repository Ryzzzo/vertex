import type { Metadata } from "next";
import Shot from "@/components/Shot";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LakeCover from "@/components/LakeCover";
import { games, type GameItem } from "@/lib/games";

const title = "Games — Vertex Business Solutions";
const description =
  "Small games that play in the browser. Some are finished; others are portfolio experiments, built to test an aesthetic, a rendering method or a style of play.";

/* The share card is The Drowned Hollow's key art: a Cycles render, no text
   baked in, cropped to the 1200×627 the rest of the site's cards use. */
const ogImage = {
  url: "/og-games.jpg",
  width: 1200,
  height: 627,
  alt: "A church steeple standing in a flooded valley at dusk, a lantern lit in a rowing boat in the foreground.",
};

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/games" },
  openGraph: {
    title,
    description,
    url: "https://vertexapps.dev/games",
    siteName: "Vertex Business Solutions",
    type: "website",
    images: [ogImage],
  },
  twitter: { card: "summary_large_image", title, description, images: [ogImage.url] },
};

function Chevron() {
  return (
    <svg className="card-chevron" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M3.5 9.5 L9.5 3.5 M4.75 3.5 H9.5 V8.25"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Shown at about 7/12 of the 1200px shell beside the text, full width below 900px. */
const SIZES = "(max-width: 900px) 100vw, 680px";

function Game({ game, first }: { game: GameItem; first: boolean }) {
  const headingId = `game-${game.slug}`;
  return (
    <article className="card games-item" aria-labelledby={headingId}>
      <div className="games-media-col">
        <div className="card-media games-media">
          {game.media.type === "lake" ? (
            <LakeCover alt={game.media.alt} sizes={SIZES} priority={first} />
          ) : (
            <Shot src={game.media.src} alt={game.media.alt} sizes={SIZES} priority={first} />
          )}
          <span className="labs-tag labs-tag-live">Playable</span>
        </div>
        {game.media.type === "lake" ? (
          <p className="games-hint" aria-hidden="true">
            Move over the lake: the water stirs.
          </p>
        ) : null}
      </div>

      <div className="games-body">
        <div className="games-kicker">
          {game.experiment ? <span className="labs-tag labs-tag-inline labs-tag-wip">Experiment</span> : null}
          <p className="marker">{game.kind}</p>
        </div>
        <h2 id={headingId} className="h2 card-title games-title">
          {/* Plain <a>: both games are separate apps served through this
              domain (next.config.ts), so the router must not try to render
              them as pages of this one. */}
          <a className="card-title-link" href={game.href}>
            {game.name}
            <Chevron />
          </a>
        </h2>
        <p className="body games-line">{game.line}</p>
        <dl className="games-facts">
          {game.facts.map((f) => (
            <div key={f.label} className="games-fact">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        {/* The stretched title link already makes the whole card the target;
            this is the visible affordance for it, not a second link. */}
        <span className="games-cta" aria-hidden="true">
          {game.cta}
          <Chevron />
        </span>
      </div>
    </article>
  );
}

export default function GamesPage() {
  return (
    <>
      <SiteHeader current="games" />
      <main>
        <section className="section" aria-labelledby="games-heading">
          <div className="shell">
            <header className="section-head games-head reveal">
              <div className="games-head-main">
                <p className="marker">Vertex · Games</p>
                <h1 id="games-heading" className="h1 labs-title">
                  Games.
                </h1>
                <p className="body-lg">
                  Small games that play in the browser. Some are finished; others are portfolio
                  experiments.
                </p>
              </div>
              <aside className="games-note" aria-label="About these games">
                <p className="games-note-label">Read these as experiments</p>
                <p className="games-note-text">
                  Several of these were built to test an aesthetic, a rendering method or a style of
                  play rather than to ship as complete games. They may be unpolished, unfinished or not
                  fully thought through, and are best taken as design and style studies. Each experiment
                  is marked as one and says what it was built to test.
                </p>
              </aside>
            </header>

            <ol className="games-list">
              {games.map((g, i) => (
                <li key={g.slug} className="reveal">
                  <Game game={g} first={i === 0} />
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
