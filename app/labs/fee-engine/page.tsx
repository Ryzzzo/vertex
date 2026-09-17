import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const title = "Fee Engine — interface concept · Vertex Labs";
const description =
  "A configurable pricing engine, built as an interface concept. Four industry rule sets share one calculator — every band, rate and multiplier is a row of editable data rather than hard-coded logic, so swapping the data changes the whole tool.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/labs/fee-engine" },
  openGraph: {
    title,
    description,
    url: "https://vertexapps.dev/labs/fee-engine",
    siteName: "Vertex Business Solutions",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 627 }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function FeeEnginePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section" aria-labelledby="fee-engine-heading">
          <div className="shell">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link className="breadcrumb-link" href="/labs">
                Labs
              </Link>
              <span className="breadcrumb-sep" aria-hidden="true">
                /
              </span>
              <span className="breadcrumb-current">Fee Engine</span>
            </nav>

            <header className="section-head labs-item-head">
              <div className="labs-item-titlerow">
                <h1 id="fee-engine-heading" className="h2">
                  Fee Engine.
                </h1>
                <span className="labs-tag labs-tag-concept labs-tag-inline">
                  Interface concept
                </span>
              </div>
              <p className="body section-intro">
                Pricing logic held as data rather than code. Seven inputs, a
                package choice and a set of add-ons resolve into one defensible
                monthly fee — but the point is what sits underneath: every band,
                rate and multiplier is a row in an editable table, so loading a
                different rule set turns the same engine into a different
                calculator. Four are included here, and none of the four is
                written into the code.
              </p>
              <p className="labs-disclaimer marker">
                Interface concept — not a live product. Nothing here can be
                signed up for or purchased; the figures are illustrative.
              </p>
            </header>

            <figure className="labs-frame-figure">
              <div className="mockup-window labs-frame">
                <div className="mockup-chrome labs-frame-chrome">
                  <span className="mockup-dot" />
                  <span className="mockup-dot" />
                  <span className="mockup-dot" />
                  <span className="mockup-url">fee-engine · interface concept</span>
                  <a
                    className="labs-fullscreen"
                    href="/labs/fee-engine.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open full screen ↗
                  </a>
                </div>
                {/* The demo repeats this page's own pitch verbatim in its
                    first 300px, so a visitor read it twice before reaching
                    anything interactive. Cropped with a clip box and a
                    negative offset rather than by scrolling the frame: a
                    scroll depends on the runtime markup having rendered and
                    on a hash surviving the loader, and neither held. This is
                    deterministic and needs no script. */}
                <div className="labs-iframe-clip">
                  <iframe
                    className="labs-iframe labs-iframe-cropped"
                    src="/labs/fee-engine.html"
                    title="Fee Engine — an interactive interface concept"
                  />
                </div>
              </div>
              <figcaption className="labs-frame-caption marker">
                Live, interactive concept. Drag the inputs and the fee resolves
                as you go.
              </figcaption>
            </figure>

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
