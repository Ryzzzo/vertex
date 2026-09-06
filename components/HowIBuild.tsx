import type { ReactNode } from "react";
import ArchitectureDiagram from "./ArchitectureDiagram";
import TokenPanel from "./TokenPanel";
import SchemaDiagram from "./SchemaDiagram";
import DeployPanels from "./DeployPanels";
import IsometricFlow from "./IsometricFlow";
import TerminalPanel from "./TerminalPanel";

/**
 * Two registers per chapter. The heading and body are written for the person
 * hiring — an owner, a consultant, a director — and say what the practice
 * does for them. The `code` line underneath carries the same idea in the
 * words an engineer would use, so a technical reader finds the proof without
 * the buyer having to read past it.
 */
function Chapter({
  marker,
  title,
  children,
  code,
  visual,
}: {
  marker: string;
  title: string;
  children: ReactNode;
  /** The technical register — terms of art, dot-separated. */
  code: string;
  visual: ReactNode;
}) {
  return (
    <article className="chapter reveal">
      <div className="chapter-copy">
        <p className="marker">{marker}</p>
        <h3 className="h3">{title}</h3>
        <p className="body">{children}</p>
        <p className="chapter-code">
          <span className="chapter-code-label">In the code</span>
          {code}
        </p>
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
            title="Every piece of data has an owner."
            code="Postgres · row-level security on all 60 tables · pg_cron · plan gating at the query layer"
            visual={
              <div className="visual-stack">
                <ArchitectureDiagram />
                <IsometricFlow />
              </div>
            }
          >
            Before I write code, I decide who is allowed to see what, what runs
            on a schedule, and what each plan includes — and I put those rules
            in the system itself, not in a checklist someone has to remember.
            ConsultBase serves many consultancies from one database, and each
            one can only ever see its own clients, because the database
            enforces it, not the screen. Get that shape right first, and every
            feature after it stops fighting the system it lives in.
          </Chapter>

          <Chapter
            marker="2.0"
            title="It looks like one company built it."
            code="design tokens · one type scale · 137 lines of duplicated header markup → one component"
            visual={<TokenPanel />}
          >
            A visual system is a set of decisions made once, then kept.
            Modernizing ConsultBase meant an editorial typeface, a cool palette
            with gold used rarely enough to mean something, and hairline borders
            in place of shadows. The unglamorous half is what makes it hold: the
            same header rebuilt once instead of five times, and a stray value
            caught in production{" "}
            <em>because the system existed to catch it</em>. Consistency isn’t
            taste. It’s maintenance.
          </Chapter>

          <Chapter
            marker="3.0"
            title="The data outlives the screen."
            code="schema-first · protected-text registry · source-fidelity CI gate · forward-only migrations"
            visual={<SchemaDiagram />}
          >
            Screens get redesigned; the records underneath them have to be
            right for years. Parenting Plan Pro generates legal documents, where
            one silently changed sentence is a real-world harm — so the legal
            wording is stored once, in one place, and the site refuses to
            publish if a generated document differs from it by a single
            character. The same instinct runs everywhere at lower stakes: every
            table locked to its owner, changes that only move forward, and
            approval states kept in the database rather than in anyone’s
            memory.
          </Chapter>

          <Chapter
            marker="4.0"
            title="Shipped means verified."
            code="git rev-parse HEAD = origin/main = vercel --prod · append-only history · migrations paired with the build that expects them"
            visual={
              <div className="visual-stack">
                <TerminalPanel />
                <DeployPanels />
              </div>
            }
          >
            Shipping is a checklist, not a feeling. Nothing counts as live
            until my copy, the repository, and the running site all agree on
            the exact same version — checked by its fingerprint, not by
            refreshing and squinting. Database changes land together with the
            release that expects them, never before, never after. Nothing in
            the history is ever rewritten, so any past version can be put back.
            Boring, deliberately. The excitement in a release should be the
            feature, not the release.
          </Chapter>
        </div>
      </div>
    </section>
  );
}
