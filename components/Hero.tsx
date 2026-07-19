import HeroMockup from "./HeroMockup";

export default function Hero() {
  return (
    <section className="section hero" aria-labelledby="hero-heading">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <h1 id="hero-heading" className="h1">
            One developer. Software that reads as a firm.
          </h1>
          <p className="body-lg hero-sub">
            One person carries your project from architecture to production — so
            nothing is lost between the person who heard you and the person who
            builds it. You get software your clients take seriously, shipped,
            documented, and <em>owned outright</em>.
          </p>
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
        </div>

        {/* Parallax now lives on the mockup's individual planes, not the wrapper. */}
        <div className="hero-visual">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
