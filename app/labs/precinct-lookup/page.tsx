import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import meta from "@/data/precincts/meta.json";
import PrecinctLookup from "./PrecinctLookup";
import "./precinct.css";

const title = "NC Precinct Lookup · Vertex Labs";
const description =
  "Type any North Carolina address and get its voting precinct, county, and US House, NC Senate and NC House districts — with the precinct drawn from the State Board's own boundaries, and an honest answer when the address sits on the line between two.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/labs/precinct-lookup" },
  openGraph: {
    title,
    description,
    url: "https://vertexapps.dev/labs/precinct-lookup",
    siteName: "Vertex Business Solutions",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 627 }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

/**
 * Four decisions from the build that are not visible by looking at the page.
 * Same convention as the Ops Queue lab: the reasoning is the work sample.
 */
const DESIGN_NOTES: Array<{ head: string; body: string }> = [
  {
    head: "The geocoder already knows which side of the street you're on",
    body: "The brief assumed the Census geocoder drops an address onto the street's centre line, so a precinct line running down that street would be a coin toss. Measured against Census block edges, it doesn't: it sets the point about 6 m off the centre line, on the address's own side. So on a boundary street the lookup takes two independent reads — the point itself, and the interior of the Census block the geocoder assigned — and says whether they agree. Checked against eight counties' own precinct maps, the lookup and both reads agreed on all 135 addresses tested — 105 of them within 40 m of a line, including pairs across the street from each other that land in different precincts.",
  },
  {
    head: "Every boundary is stored once, which is how the line gets drawn",
    body: "The State Board's statewide file is 24 MB zipped. It ships here as TopoJSON — each boundary stored once and referenced by the two precincts either side of it — simplified to about a metre in the state's own survey projection before reprojecting. That is 3.9 MB, read once per server and never sent to the browser. The line between two precincts is not traced or approximated: it is literally the arcs the two share.",
  },
  {
    head: "The address never goes anywhere it doesn't have to",
    body: "It is sent once, to the Census Bureau's geocoder, and the answer comes back to you. It is not logged, not stored, not cached, and not put in the page URL either — URLs end up in browser history and server request logs, which is the quiet way a privacy promise breaks. The page sets no cookies and runs no analytics.",
  },
  {
    head: "Near a line, it stops sounding certain",
    body: "Within 40 m of a boundary the result names both precincts, shows the line up close with the distance measured, and points to the State Board's lookup. The threshold is deliberately generous: most addresses on a boundary street sit about 6 m from it, and the close-up is there so you can see for yourself which side the point fell on rather than take the tool's word for it.",
  },
];

export default function PrecinctLookupPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section" aria-labelledby="precinct-heading">
          <div className="shell">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link className="breadcrumb-link" href="/labs">
                Labs
              </Link>
              <span className="breadcrumb-sep" aria-hidden="true">
                /
              </span>
              <span className="breadcrumb-current">NC Precinct Lookup</span>
            </nav>

            <header className="section-head labs-item-head">
              <div className="labs-item-titlerow">
                <h1 id="precinct-heading" className="h2">
                  NC Precinct Lookup.
                </h1>
                <span className="labs-tag labs-tag-live labs-tag-inline">Live</span>
              </div>
              <p className="body section-intro">
                Any North Carolina address in; its precinct, county and
                districts out — drawn from the State Board’s own boundaries.
                When an address sits on a precinct line, it shows the line,
                measures the distance, and says how sure it is.
              </p>
              <p className="labs-disclaimer marker">
                Unofficial. A demonstration built on public data — confirm your
                precinct with the NC State Board of Elections before you rely on
                it.
              </p>
            </header>

            <PrecinctLookup
              precinctCount={meta.precincts}
              countyCount={meta.counties}
              precinctsAsOf={meta.sourceAsOf}
              toleranceMeters={meta.simplification.toleranceMeters}
            />

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
