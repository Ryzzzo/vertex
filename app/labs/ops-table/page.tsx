import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const title = "Ops Queue Triage — interface concept · Vertex Labs";
const description =
  "A shipment-exception triage screen: 420 rows, keyboard-first navigation with a single tab stop, filter state carried in the URL, and a CSV export that stays safe when Excel opens it.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/labs/ops-table" },
  openGraph: {
    title,
    description,
    url: "https://vertexapps.dev/labs/ops-table",
    siteName: "Vertex Business Solutions",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 627 }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

/**
 * Four decisions from the build that are not visible by looking at the screen.
 * The point of publishing them is that the reasoning is the work sample — the
 * table itself is the easy half.
 */
const DESIGN_NOTES: Array<{ head: string; body: string }> = [
  {
    head: "The CSV export guards against formula injection",
    body: "A cell beginning =, +, - or @ is executed as a formula when Excel or Sheets opens the file, and a customer name is attacker-influenced data — so an export is a live path out of an ops tool and into someone's spreadsheet. Those cells ship prefixed with an apostrophe, alongside a UTF-8 BOM so Windows Excel stops mangling non-ASCII names.",
  },
  {
    head: "420 rows, one tab stop",
    body: "A plain table puts every focusable control in the tab order, which is 840 stops before a keyboard user reaches the end. A roving tabindex keeps exactly one row in the sequence and moves with the arrow keys or j/k. Full role=\"grid\" would also solve it but commits to cell-level focus management and application-mode screen-reader semantics — if these rows ever become editable this should be promoted to a real grid rather than patched further.",
  },
  {
    head: "Fixed layout, tabular figures, headers that follow their column",
    body: "The ecosystem default lands on 49px rows with proportional digits and every column left-aligned, which makes figures impossible to compare down a column and lets widths shift as data loads. Here the numerics are right-aligned with their headers, every figure is tabular, and table-layout is fixed against an explicit colgroup — which is most of how 19 rows fit in the space that usually shows 12.",
  },
  {
    head: "The verification pass found five defects, and they are in the README",
    body: "Rows measured 35px rather than the designed 33px because the status pill, not the text, was setting the height; a second easing curve had ridden in from the component library's defaults; the skip link animated a layout-inducing property; numeric headers computed as left-aligned and only looked correct; and the page scrolled horizontally at 320px. Portfolio work usually hides that list. Publishing it is the more useful signal.",
  },
];

export default function OpsTablePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section" aria-labelledby="ops-table-heading">
          <div className="shell">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link className="breadcrumb-link" href="/labs">
                Labs
              </Link>
              <span className="breadcrumb-sep" aria-hidden="true">
                /
              </span>
              <span className="breadcrumb-current">Ops Queue Triage</span>
            </nav>

            <header className="section-head labs-item-head">
              <div className="labs-item-titlerow">
                <h1 id="ops-table-heading" className="h2">
                  Ops Queue Triage.
                </h1>
                <span className="labs-tag labs-tag-concept labs-tag-inline">
                  Interface concept
                </span>
              </div>
              <p className="body section-intro">
                The screen an operations team lives in all day: 420 shipment
                exceptions, filtered, sorted and cleared under time pressure.
                Built to argue that the ordinary internal table is where the
                craft actually shows — density as a measured decision rather
                than a default, a keyboard path that does not require the mouse,
                and an export that cannot be turned into an attack on the person
                who opens it.
              </p>
              <p className="labs-disclaimer marker">
                Interface concept — not a live product. The data is generated,
                the company is fictional, and the mutations are simulated in the
                browser.
              </p>
            </header>

            <figure className="labs-frame-figure">
              <div className="mockup-window labs-frame">
                <div className="mockup-chrome labs-frame-chrome">
                  <span className="mockup-dot" />
                  <span className="mockup-dot" />
                  <span className="mockup-dot" />
                  <span className="mockup-url">ops-table · interface concept</span>
                  <a
                    className="labs-fullscreen"
                    href="/labs/ops-table/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open full screen ↗
                  </a>
                </div>
                <iframe
                  className="labs-iframe labs-iframe-tall"
                  src="/labs/ops-table/index.html"
                  title="Ops Queue Triage — an interactive interface concept"
                />
              </div>
              <figcaption className="labs-frame-caption marker">
                Live and interactive. Press <kbd className="labs-kbd">/</kbd> to
                search, <kbd className="labs-kbd">j</kbd> and{" "}
                <kbd className="labs-kbd">k</kbd> to move, or{" "}
                <kbd className="labs-kbd">?</kbd> for the full shortcut sheet.
                Best opened full screen.
              </figcaption>
            </figure>

            <details className="notes">
              <summary className="notes-summary">
                <span className="notes-summary-label">Design notes</span>
                <span className="notes-summary-hint marker">
                  Four decisions you cannot see by looking
                </span>
                <span className="notes-chevron" aria-hidden="true" />
              </summary>
              <div className="notes-body">
                {DESIGN_NOTES.map((note) => (
                  <div className="notes-item" key={note.head}>
                    <h2 className="notes-item-head">{note.head}</h2>
                    <p className="body notes-item-body">{note.body}</p>
                  </div>
                ))}
              </div>
            </details>

            <p className="labs-back">
              <Link className="link" href="/labs">
                ← Back to Labs
              </Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
