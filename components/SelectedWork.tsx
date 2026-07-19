import { work } from "@/lib/content";
import WorkCard from "./WorkCard";

export default function SelectedWork() {
  const featured = work.filter((item) => item.featured);
  const rest = work.filter((item) => !item.featured);

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

        {featured.map((item) => (
          <WorkCard key={item.slug} item={item} />
        ))}

        <div className="cards">
          {rest.map((item) => (
            <WorkCard key={item.slug} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
