import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { labs, type LabItem } from "@/lib/content";

const title = "Labs — Vertex Business Solutions";
const description =
  "Demonstrations, not client work — each built quickly to answer a single question: what capability looks like before a contract exists.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/labs" },
  openGraph: {
    title,
    description,
    url: "https://vertexapps.dev/labs",
    siteName: "Vertex Business Solutions",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 627 }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

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

/**
 * Drawn stand-in for the Fee Engine card, in the mockup's own amber identity
 * rather than a screenshot — a left column of inputs resolving into a single
 * fixed fee on the right, which is the whole idea of the tool at a glance.
 */
function ConceptThumb() {
  return (
    <svg
      className="labs-thumb"
      viewBox="0 0 640 360"
      role="img"
      aria-label="Fee Engine — a pricing calculator interface concept"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="640" height="360" fill="#0A0B0C" />
      <rect width="640" height="46" fill="#0C0D0F" />
      <rect y="45" width="640" height="1" fill="#1C2024" />
      <rect x="24" y="19" width="9" height="9" fill="#E3A33C" transform="rotate(45 28.5 23.5)" />
      <text x="46" y="27" fill="#8A8F98" fontFamily="monospace" fontSize="11" letterSpacing="2">
        FEE ENGINE
      </text>
      {/* input rows */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(40 ${86 + i * 56})`}>
          <rect width="330" height="40" rx="8" fill="#0E0F11" stroke="#1C2024" />
          <rect x="16" y="17" width={70 + i * 22} height="6" rx="3" fill="#2A2D31" />
          <rect x="286" y="12" width="28" height="16" rx="4" fill="#171A1E" stroke="#242830" />
          {i === 1 && <rect x="16" y="17" width="92" height="6" rx="3" fill="#E3A33C" opacity="0.85" />}
        </g>
      ))}
      {/* price card */}
      <rect x="416" y="86" width="200" height="228" rx="12" fill="#101214" stroke="#1C2024" />
      <rect x="440" y="112" width="120" height="2" fill="#E3A33C" />
      <text x="440" y="120" fill="#5E6068" fontFamily="monospace" fontSize="9" letterSpacing="1.5" dominantBaseline="hanging">
        RECOMMENDED
      </text>
      <text x="438" y="176" fill="#E8EAEC" fontFamily="monospace" fontSize="38" fontWeight="600">
        $1,320
      </text>
      <text x="440" y="196" fill="#5E6068" fontFamily="monospace" fontSize="9.5" letterSpacing="1">
        PER MONTH
      </text>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(440 ${224 + i * 26})`}>
          <rect width={68 - i * 8} height="5" rx="2.5" fill="#2A2D31" />
          <rect x="132" width="24" height="5" rx="2.5" fill="#3A3020" />
        </g>
      ))}
    </svg>
  );
}

function LabsCard({ item }: { item: LabItem }) {
  const heading = (
    <>
      {item.name}
      <Chevron />
    </>
  );

  return (
    <article className="card labs-card-index">
      <div className="card-media labs-card-media">
        {item.shot ? (
          <Image
            src={item.shot}
            alt={item.shotAlt ?? ""}
            width={1920}
            height={1080}
            sizes="(max-width: 720px) 100vw, 50vw"
            className="card-shot"
          />
        ) : (
          <ConceptThumb />
        )}
        <span className={`labs-tag labs-tag-${item.kind}`}>
          {item.kind === "live" ? "Live" : "Interface concept"}
        </span>
      </div>
      <div className="card-body">
        <h2 className="h3 card-title">
          {item.external ? (
            <a
              className="card-title-link"
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {heading}
            </a>
          ) : (
            <Link className="card-title-link" href={item.href}>
              {heading}
            </Link>
          )}
        </h2>
        <p className="body card-line">{item.line}</p>
      </div>
    </article>
  );
}

export default function LabsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section" aria-labelledby="labs-heading">
          <div className="shell">
            <header className="section-head reveal">
              <p className="marker">Vertex · Labs</p>
              <h1 id="labs-heading" className="h1 labs-title">
                Labs.
              </h1>
              <p className="body-lg">
                Demonstrations, not client work. Each one is built quickly to
                answer a single question — what capability looks like before a
                contract exists.
              </p>
            </header>

            <div className="cards labs-cards">
              {labs.map((item) => (
                <div key={item.slug} className="reveal card-slot">
                  <LabsCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
