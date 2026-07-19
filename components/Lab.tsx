import Image from "next/image";
import { lab } from "@/lib/content";

/**
 * The clamped diverging ramp the map itself uses. Rendering it on the card
 * carries the one idea that makes the choropleth readable — that a given red
 * means the same thing statewide — without needing the map to be open.
 */
function Scale() {
  return (
    <div className="lab-scale" aria-hidden="true">
      <div className="lab-scale-ramp" />
      <div className="lab-scale-ticks">
        <span>Decline</span>
        <span>Flat</span>
        <span>Growth</span>
      </div>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      className="card-chevron"
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
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

export default function Lab() {
  return (
    <section className="section" aria-labelledby="lab">
      <div className="shell">
        <header className="section-head reveal">
          <h2 id="lab" className="h2">
            Lab.
          </h2>
          <p className="body section-intro">
            Not client work — demonstrations. Built quickly to answer a specific
            question: what does capability look like before a contract exists?
          </p>
        </header>

        <article className="lab-card reveal">
          <div className="lab-media">
            <Image
              src={lab.shot}
              alt={lab.shotAlt}
              width={1920}
              height={1080}
              sizes="(max-width: 900px) 100vw, 1200px"
              className="card-shot"
            />
            <div className="lab-media-veil" aria-hidden="true" />
          </div>

          <div className="lab-body">
            <div className="lab-lede">
              <h3 className="h3 card-title">
                <a
                  className="card-title-link"
                  href={lab.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {lab.name}
                  <Chevron />
                </a>
              </h3>
              <p className="body lab-line">{lab.line}</p>
              <Scale />
            </div>

            <div className="lab-detail">
              <div className="card-detail-row">
                <p className="card-detail-label">Stack</p>
                <p className="card-detail-stack">{lab.stack}</p>
              </div>
              <div className="card-detail-row">
                <p className="card-detail-label">Approach</p>
                <p className="card-detail-approach">{lab.approach}</p>
              </div>
              <p className="marker lab-meta">{lab.meta}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
