import Image from "next/image";

type Proof = {
  name: string;
  line: string;
  href: string;
  meta: string;
  external: boolean;
  shot?: string;
  shotAlt?: string;
};

/**
 * All four verified reachable on 2026-08-15: myconsultbase.com,
 * parentingplanpro.com, kay-holidays.com (redirects to /fr) and
 * vertexapps.dev/labs/fee-engine all returned 200.
 */
const PROOF: Proof[] = [
  {
    name: "ConsultBase",
    line: "A client portal that makes a solo consultancy read as a firm.",
    href: "https://myconsultbase.com",
    meta: "Next.js · Supabase RLS · Stripe",
    external: true,
    shot: "/work/consultbase/hero-desktop.avif",
    shotAlt: "The ConsultBase marketing site rendered on desktop.",
  },
  {
    name: "Parenting Plan Pro",
    line: "Legal document generation where the text is the product, and protected accordingly.",
    href: "https://parentingplanpro.com",
    meta: "react-pdf · source-fidelity CI gate",
    external: true,
    shot: "/work/parenting-plan-pro/hero-desktop.avif",
    shotAlt: "The Parenting Plan Pro landing page rendered on desktop.",
  },
  {
    name: "Villa L’Estagne",
    line: "Direct booking for a Mediterranean villa, without a platform in the middle.",
    href: "https://kay-holidays.com",
    meta: "Supabase RLS · Resend · no cookies",
    external: true,
  },
  {
    name: "Fee Engine",
    line: "One pricing calculator, four industry rule sets, no vertical logic in the code.",
    href: "/labs/fee-engine",
    meta: "Labs · interface concept",
    external: false,
  },
];

/** Drawn, not photographed — no invented screenshot stands in for a real one. */
function DrawnPanel() {
  return (
    <svg
      className="da-proof-drawn"
      viewBox="0 0 320 200"
      role="img"
      aria-label="No capture yet — a drawn placeholder panel."
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="0.5" y="0.5" width="319" height="199" />
        <path d="M0 28h320" />
        <circle cx="16" cy="14" r="3" />
        <circle cx="28" cy="14" r="3" />
        <circle cx="40" cy="14" r="3" />
        <path d="M84 28v172" />
        <path d="M16 48h48M16 66h40M16 84h52M16 102h36" />
        <rect x="104" y="48" width="88" height="44" />
        <rect x="204" y="48" width="88" height="44" />
        <path d="M104 168h188" />
        <path d="M112 152l24-26 24 14 24-34 24 20 24-30 24 24" />
      </g>
    </svg>
  );
}

/**
 * Proof, placed second on the page on purpose. The particle sequence is the
 * argument; this is the evidence, and evidence that arrives after four
 * viewports of theatre has already lost the reader.
 */
export default function ProofBand() {
  return (
    <section className="da-section da-proof" id="da-proof" aria-labelledby="da-proof-h">
      <div className="da-shell">
        <p className="da-marker">Shipped</p>
        {/* 10 words. */}
        <h2 className="da-h2" id="da-proof-h">
          Four things that shipped. All four are live right now.
        </h2>

        <ul className="da-proof-grid">
          {PROOF.map((p, i) => (
            <li className="da-proof-item da-reveal" key={p.name} style={{ "--i": i } as React.CSSProperties}>
              <article className="da-proof-card">
                <div className="da-proof-media">
                  {p.shot ? (
                    <Image
                      src={p.shot}
                      alt={p.shotAlt ?? ""}
                      width={1920}
                      height={1080}
                      sizes="(max-width: 720px) 92vw, (max-width: 1100px) 45vw, 30vw"
                      className="da-proof-shot"
                    />
                  ) : (
                    <DrawnPanel />
                  )}
                </div>
                <div className="da-proof-body">
                  <h3 className="da-h3">
                    <a
                      className="da-proof-link"
                      href={p.href}
                      {...(p.external
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                    >
                      {p.name}
                      <svg viewBox="0 0 13 13" aria-hidden="true">
                        <path
                          d="M3.5 9.5 L9.5 3.5 M4.75 3.5 H9.5 V8.25"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </h3>
                  <p className="da-proof-line">{p.line}</p>
                  <p className="da-proof-meta">{p.meta}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
