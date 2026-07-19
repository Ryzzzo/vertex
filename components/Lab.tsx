import Image from "next/image";
import { lab } from "@/lib/content";

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
          <a
            href={lab.url}
            target="_blank"
            rel="noreferrer noopener"
            className="lab-anchor"
          >
            <div className="lab-media">
              <Image
                src={lab.shot}
                alt={lab.shotAlt}
                width={1920}
                height={1080}
                sizes="(max-width: 900px) 100vw, 60vw"
                className="card-shot"
              />
            </div>
            <div className="lab-body">
              <h3 className="h3 card-title">
                {lab.name}
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
              </h3>
              <p className="body">{lab.line}</p>
            </div>
          </a>
        </article>
      </div>
    </section>
  );
}
