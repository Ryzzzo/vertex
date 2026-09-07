/**
 * Section rail: one dot per section, pinned to the right edge, the current one
 * lit. Renders on the server with no state of its own — HeaderNav writes the
 * active section and scrolled flag onto <html>, and the CSS reads them, so
 * the rail and the header links are always the same answer.
 *
 * Desktop only (≤1100px hides it): on a narrow viewport it would sit over
 * content, and mobile is functional, not animated, by decision.
 */
const SECTIONS = [
  { id: "how-i-build", label: "Method" },
  { id: "selected-work", label: "Work" },
  { id: "lab", label: "Lab" },
  { id: "contact", label: "Contact" },
] as const;

export default function SectionRail() {
  return (
    <nav className="rail" aria-label="Sections">
      <span className="rail-track" aria-hidden="true">
        <span className="rail-cursor" />
      </span>
      <ol className="rail-list">
        {SECTIONS.map((s, i) => (
          <li key={s.id} className="rail-item" style={{ "--i": i } as React.CSSProperties}>
            <a className="rail-link" href={`/#${s.id}`} data-section={s.id}>
              <span className="rail-label">{s.label}</span>
              <span className="rail-dot" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
