import type { ReactNode } from "react";
import ArchitectureDiagram from "./ArchitectureDiagram";
import TokenPanel from "./TokenPanel";
import SchemaDiagram from "./SchemaDiagram";
import DeployPanels from "./DeployPanels";
import IsometricFlow from "./IsometricFlow";
import TerminalPanel from "./TerminalPanel";

function Chapter({
  marker,
  title,
  children,
  visual,
}: {
  marker: string;
  title: string;
  children: ReactNode;
  visual: ReactNode;
}) {
  return (
    <article className="chapter reveal">
      <div className="chapter-copy">
        <p className="marker">{marker}</p>
        <h3 className="h3">{title}</h3>
        <p className="body">{children}</p>
      </div>
      <div className="chapter-visual">{visual}</div>
    </article>
  );
}

export default function HowIBuild() {
  return (
    <section className="section" aria-labelledby="how-i-build">
      <div className="shell">
        <header className="section-head reveal">
          <h2 id="how-i-build" className="h2">
            How I build.
          </h2>
          <p className="lede section-lede">
            A buyer can’t inspect code before hiring. You can inspect method.
            This is mine.
          </p>
        </header>

        <div className="chapters">
          <Chapter
            marker="1.0"
            title="Architecture"
            visual={
              <div className="visual-stack">
                <ArchitectureDiagram />
                <IsometricFlow />
              </div>
            }
          >
            Before code, I draw the boundaries: who owns each piece of data, what
            runs on a schedule versus on demand, where a feature gates by plan.
            ConsultBase runs as a multi-tenant SaaS — sixty Postgres tables with
            row-level security on every one, scheduled jobs living in the
            database rather than bolted on beside it, tier logic enforced at the
            query layer instead of hidden in the interface. Get the shape right
            first, and features stop fighting the system they live in.
          </Chapter>

          <Chapter
            marker="2.0"
            title="Design system discipline"
            visual={<TokenPanel />}
          >
            A visual system is a set of decisions made once, then enforced.
            Modernizing ConsultBase meant an editorial serif, a cool palette with
            gold used sparingly enough to mean something, hairline borders in
            place of shadows — and the unglamorous half: 137 lines of duplicated
            header markup consolidated into one component, and an off-scale
            opacity value caught in production{" "}
            <em>because the scale existed to catch it</em>. Consistency isn’t
            taste. It’s maintenance.
          </Chapter>

          <Chapter
            marker="3.0"
            title="Database craft"
            visual={<SchemaDiagram />}
          >
            Data outlives interfaces, so the schema gets the most careful
            thinking. Parenting Plan Pro generates legal documents, where a
            silently altered clause is a real-world harm — so statutory language
            lives in a protected-text registry, and the build fails if generated
            output drifts from its source by a character. The same instinct runs
            at lower stakes everywhere else: row-level security on every table,
            migrations that only roll forward, review states modeled in the
            schema rather than in anyone’s memory.
          </Chapter>

          <Chapter
            marker="4.0"
            title="Deploy discipline"
            visual={
              <div className="visual-stack">
                <TerminalPanel />
                <DeployPanels />
              </div>
            }
          >
            Shipping is a checklist, not a feeling. Nothing counts as deployed
            until the remote, my local branch, and the live build agree on the
            exact same commit — verified by SHA, not by refresh-and-squint.
            Database migrations land in coordination with the rebuild that
            expects them, never before, never after. History is append-only; no
            force-pushes, so every production state stays reconstructible.
            Boring, deliberately. The excitement in a deployment should be the
            feature, not the deploy.
          </Chapter>
        </div>
      </div>
    </section>
  );
}
