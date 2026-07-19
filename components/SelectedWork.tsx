import Image from "next/image";
import { work, type WorkItem } from "@/lib/content";

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

function Media({ item }: { item: WorkItem }) {
  if (!item.shot) {
    return (
      <div className="card-media card-media-empty">
        <span className="card-media-note">No public URL</span>
      </div>
    );
  }

  return (
    <div className="card-media">
      <Image
        src={item.shot}
        alt={item.shotAlt ?? ""}
        width={1920}
        height={1080}
        sizes="(max-width: 720px) 100vw, 50vw"
        className="card-shot"
      />
    </div>
  );
}

function Card({ item }: { item: WorkItem }) {
  const body = (
    <>
      <Media item={item} />
      <div className="card-body">
        <h3 className="h3 card-title">
          {item.name}
          {item.url ? <Chevron /> : null}
        </h3>
        <p className="body card-line">{item.line}</p>
      </div>
    </>
  );

  if (!item.url) {
    return <article className="card reveal">{body}</article>;
  }

  return (
    <article className="card card-link reveal">
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        className="card-anchor"
      >
        {body}
      </a>
    </article>
  );
}

export default function SelectedWork() {
  return (
    <section className="section" aria-labelledby="selected-work">
      <div className="shell">
        <header className="section-head reveal">
          <h2 id="selected-work" className="h2">
            Selected work.
          </h2>
          <p className="body section-intro">
            A short list, deliberately. Each of these is production software
            someone relies on. Read them for consistency of judgment, not variety
            of logos — and look for the seams: where booking meets calendar,
            where a document meets the statute it quotes.
          </p>
        </header>

        <div className="cards">
          {work.map((item) => (
            <Card key={item.slug} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
