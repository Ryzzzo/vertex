export type WorkItem = {
  slug: string;
  name: string;
  line: string;
  url?: string;
  /**
   * Shown in place of the screenshot where no capture exists. Only meaningful
   * when `shot` is absent.
   */
  note?: string;
  /** Short, dot-separated technology list revealed on hover / tap. */
  stack: string;
  /** Two or three sentences of technical method, revealed alongside `stack`. */
  approach: string;
  /** Present only where a real capture exists under /public/work/{slug}/ */
  shot?: string;
  shotAlt?: string;
  /** Phone capture, 780×1688, where one exists. Enables the desktop/phone flip. */
  shotMobile?: string;
  /** Renders at hero scale at the top of the grid. Exactly one item. */
  featured?: boolean;
};

export const work: WorkItem[] = [
  {
    slug: "consultbase",
    name: "ConsultBase",
    line: "A client portal that makes a solo consultancy read as a firm.",
    url: "https://myconsultbase.com",
    stack: "Next.js · Supabase RLS · Stripe · pg_cron · Vercel",
    approach:
      "Multi-tenant from the schema up: row-level security on all sixty tables, so a tenant boundary is a database guarantee rather than a filter someone remembered to write. Scheduled work runs inside Postgres on pg_cron instead of an external scheduler that can silently stop. Plan gating is enforced at the query layer, so the interface cannot leak a feature the tier does not include.",
    shot: "/work/consultbase/hero-desktop.avif",
    shotAlt: "The ConsultBase marketing site rendered on desktop.",
    shotMobile: "/work/consultbase/hero-mobile.avif",
    featured: true,
  },
  {
    slug: "true-colors",
    name: "True Colors",
    line: "Nineteen years of word of mouth and no website. A whole salon presence, built from one owner interview.",
    url: "https://truecolorsbristol.com",
    stack:
      "One self-contained HTML file \u00b7 hand-written WebGL shader \u00b7 JSON-LD \u00b7 no dependencies \u00b7 Vercel",
    approach:
      "The hero is a fragment shader written by hand rather than a stock video loop \u2014 no library, nothing to download but the page itself, and no license to renew. The whole site is one self-contained HTML file with the photography inlined as data URIs, so it has no build step and no dependency that can break it a year from now. Open and closed are computed from the salon\u2019s own timezone rather than the visitor\u2019s, so a browser in Seattle is told the Bristol answer, and the hours live in one map that the week grid reads from so the two cannot drift apart. A second page recruits stylists for the open stations, which is the other half of a nine-chair business a brochure site would have missed.",
    shot: "/work/true-colors/hero-desktop.avif",
    shotAlt:
      "The True Colors salon home page on desktop: the wordmark over a deep red WebGL satin hero, the salon\u2019s hours and phone number, and a stat band reading nineteen years, seventy-one Google reviews and a 4.5 average.",
    shotMobile: "/work/true-colors/hero-mobile.avif",
  },
  {
    slug: "parenting-plan-pro",
    name: "Parenting Plan Pro",
    line: "Legal document generation where the text is the product, and protected accordingly.",
    url: "https://parentingplanpro.com",
    stack: "Next.js · Supabase · react-pdf · Stripe · source-fidelity CI gate",
    approach:
      "The plan's legal language lives in a protected-text registry, and the build fails if rendered output drifts from its source by a character. One codebase renders jurisdiction-aware plans across US/Canada, UK, and Australia school-calendar systems. Contested arrangements — supervised visitation, step-up schedules — are gated behind professional mediation, so self-authored legal language never reaches a branded, court-ready PDF.",
    shot: "/work/parenting-plan-pro/hero-desktop.avif",
    shotAlt: "The Parenting Plan Pro landing page rendered on desktop.",
    shotMobile: "/work/parenting-plan-pro/hero-mobile.avif",
  },
  {
    slug: "villa-lestagne",
    name: "Villa L’Estagne",
    line: "A booking site for a Mediterranean villa, built to the property’s standard rather than a template’s.",
    url: "https://kay-holidays.com",
    stack: "Next.js · Supabase RLS · Resend · no cookies",
    approach:
      "Row-level security lets an anonymous visitor write a booking request and read nothing back, so one guest's dates and contact details are never visible to another. Overlapping requests are allowed by design — two parties can hold the same week as on_request and the owner arbitrates from the admin panel. Bilingual FR/EN with French primary. No cookies, no analytics, no payment processing — a direct-booking site without a platform in the middle.",
    shot: "/work/villa-lestagne/hero-desktop.avif",
    shotAlt: "The Villa L’Estagne booking site rendered on desktop.",
  },
  {
    slug: "civic-strategy-partners",
    name: "Civic Strategy Partners",
    line: "Site for a fractional GSA MAS advisory practice, built for an audience that checks your CAGE code.",
    url: "https://www.civicstrategypartners.com/",
    stack: "Next.js App Router · Tailwind · server-side form API · Vercel",
    approach:
      "A credibility site for a practice that sells judgment, so the detail work went where a federal buyer actually looks — the footer carries live UEI, CAGE, and NAICS identifiers beside the SDVOSB certification, because that audience verifies before it inquires. Motion is engineered rather than avoided: the gradient wave animates on background-position across an oversized canvas, so it never jumps at the seam. This is the second generation of the site for the same client, staged behind a passphrase gate for review before it took the root domain.",
    shot: "/work/civic-strategy-partners/hero-desktop.avif",
    shotAlt: "The Civic Strategy Partners site rendered on desktop.",
    shotMobile: "/work/civic-strategy-partners/hero-mobile.avif",
  },
  {
    slug: "revoix",
    name: "Revoix",
    line: "Product site for an on-device speech and situational-awareness tool used by police and emergency responders. Four languages, zero tracking by design.",
    url: "https://www.revoix.de",
    stack: "Next.js · prerendered on Vercel · no analytics · no cookies",
    approach:
      "Static-feel front-end for a language platform. Backend-free — the served HTML has zero third-party requests, no analytics, no cookies, not even Vercel Insights. Locale routes carry independently linkable metadata (title, description, OG) even though the body copy renders client-side.",
    shot: "/work/revoix/hero-desktop.avif",
    shotAlt: "The Revoix product site rendered on desktop.",
    shotMobile: "/work/revoix/hero-mobile.avif",
  },
  {
    slug: "fm24",
    name: "FM24",
    line: "Multilingual public site for a German security and facility-management software platform, shipped as a static build into the client’s existing server environment.",
    url: "https://fm24.info",
    stack: "Next.js · static export · dropped onto legacy Apache",
    approach:
      "Static export shipped into infrastructure with no Node runtime — the client hosts on a legacy Apache stack, so the entire built site is prerendered files. Backend-free. Four languages — German, English, Spanish, French — with build-time i18n and browser-language detection. GDPR-conformant cookie consent gate, so reCAPTCHA and embedded video load only after opt-in.",
    shot: "/work/fm24/hero-desktop.avif",
    shotAlt: "The FM24 public site rendered on desktop.",
    shotMobile: "/work/fm24/hero-mobile.avif",
  },
];

/**
 * A Lab shown at hero scale on the homepage. `status` is the optional amber
 * chip beside the title, for work that is genuinely usable but not yet whole —
 * distinct from the live/concept chip on the /labs index, which answers the
 * different question of whether the thing runs at all.
 */
export type FeaturedLab = {
  slug: string;
  name: string;
  line: string;
  stack: string;
  approach: string;
  url: string;
  shot: string;
  shotAlt: string;
  status?: string;
  meta?: string;
  /**
   * Which LabPlate treatment the capture gets. Declared per item rather than
   * inferred from the slug: the previous `slug === lab.slug ? map : sql` test
   * silently gave the sql plate to every future entry that was not the map.
   */
  plate: "map" | "sql";
};

export const lab: FeaturedLab = {
  slug: "nc-housing-terminal",
  name: "NC Housing Terminal",
  line: "A Bloomberg-style housing map of North Carolina: every ZIP code rendered as a live choropleth of Zillow home-value change.",
  stack: "Mapbox GL · Next.js · static data pipeline · Vercel",
  approach:
    "The color scale is clamped and diverging, so a given red means the same thing in Asheville as it does in Charlotte — unclamped, a single outlier county flattens the rest of the state into noise. Zillow’s raw series is reshaped into ZIP-indexed data by a build-time pipeline, so the map ships static and the browser never waits on an API. Labels are zoom-gated and detail resolves on hover, which keeps several hundred polygons legible rather than crowded.",
  url: "https://housing.vertexapps.dev",
  shot: "/work/nc-housing-terminal/hero-desktop.avif",
  shotAlt:
    "The NC Housing Terminal choropleth map zoomed into North Carolina with a ZIP-code tooltip visible.",
  meta: "Designed, built, and deployed in one evening.",
  plate: "map",
};


/**
 * Accession is the one item here nobody commissioned, which is why it sits in
 * Lab rather than Selected work: that section promises "production software
 * someone relies on", and this is a demonstration. It leads `featuredLabs`
 * because it is the only thing on the site a visitor can actually use.
 */
export const accession: FeaturedLab = {
  slug: "accession",
  name: "Accession",
  line: "A museum records puzzle that teaches SQL: thirty levels across six cases, each one a real query against a real database running in the visitor’s own browser.",
  stack: "Next.js Multi-Zone · DuckDB-Wasm · Monaco Editor · Vercel",
  approach:
    "DuckDB runs entirely in the browser, so there is no backend to keep alive and no data to leave the visitor's machine — schema, queries and answer checking all execute locally. Levels come in two kinds: drills check the result set, so the query is the lesson; investigations take a typed answer instead, which frees a hint to explain syntax without giving the finding away and makes a level that needs four queries possible at all. It is served as a Next.js Multi-Zone at vertexapps.dev/sql, so the pages inherit the domain rather than starting a new one, while the WebAssembly stays out of this site's bundle. A companion SQL reference publishes one indexable page per concept with the same live editor embedded.",
  url: "https://vertexapps.dev/sql",
  shot: "/work/accession/hero-desktop.avif",
  shotAlt:
    "The Accession board on the Ashcombe Bequest investigation: the case brief, a two-table schema, the Toolkit keyword panel, the query editor and the answer box.",
  meta: "Thirty levels, six cases, and a companion SQL reference. No backend, and no client.",
  plate: "sql",
};


/** The Labs shown at hero scale on the homepage, in order. */
export const featuredLabs: FeaturedLab[] = [accession, lab];

export type LabItem = {
  slug: string;
  name: string;
  line: string;
  /** Internal route (e.g. /labs/fee-engine) or an external URL. */
  href: string;
  external?: boolean;
  /** Sets the card's status chip: a running demo vs. a static interface study. */
  kind: "live" | "concept";
  /**
   * Optional amber chip beside the title. Orthogonal to `kind` — an item can be
   * fully live and still be building out, which is what this says.
   */
  status?: string;
  /** Real capture, where one exists; concept items render a drawn placeholder. */
  shot?: string;
  shotAlt?: string;
};

/**
 * The routed Labs index. NC Housing Terminal reuses the homepage `lab` entry so
 * its copy lives in one place; Fee Engine is the first item that lives on the
 * site itself rather than at its own domain.
 */
export const labs: LabItem[] = [
  {
    slug: "accession",
    name: accession.name,
    line: accession.line,
    href: accession.url,
    // Same domain, different app. A next/link here would attempt an RSC
    // request across the zone boundary; a plain anchor is the honest hop.
    external: true,
    kind: "live",
    shot: accession.shot,
    shotAlt: accession.shotAlt,
  },
  {
    slug: "ops-table",
    name: "Ops Queue Triage",
    line: "A 420-row exception table with keyboard-first ergonomics, URL-shareable filter state, and a CSV export that survives Excel — interface concept.",
    href: "/labs/ops-table",
    kind: "concept",
    shot: "/labs-shots/ops-table/hero-desktop.avif",
    shotAlt:
      "The Ops Queue Triage board: 27 of 420 shipment exceptions in compact density, each with a status pill, a color-coded priority, a right-aligned value and an age, above an Export 420 to CSV control.",
  },
  {
    slug: "fee-engine",
    name: "Fee Engine",
    line: "One pricing calculator, four industry rule sets, no vertical logic in the code — interface concept.",
    href: "/labs/fee-engine",
    kind: "concept",
    shot: "/labs-shots/fee-engine/hero-desktop.avif",
    shotAlt:
      "The Fee Engine board: four industry rule sets across the top, a package column, and a computed monthly fee of $4,242 broken into the five components that produced it.",
  },
  {
    slug: "nc-housing-terminal",
    name: lab.name,
    line: lab.line,
    href: lab.url,
    external: true,
    kind: "live",
    shot: lab.shot,
    shotAlt: lab.shotAlt,
  },
];

export const affordances = [
  { label: "Email", href: "mailto:contact@vertexapps.dev" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/vertexapps/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/ryans108" },
  { label: "GitHub", href: "https://github.com/Ryzzzo" },
];
