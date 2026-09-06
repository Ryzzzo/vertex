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
      "Static export shipped into infrastructure with no Node runtime — the client hosts on a legacy Apache stack, so the entire built site is prerendered files. Backend-free. Bilingual DE/EN with build-time i18n. GDPR-conformant cookie consent gate.",
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
};

export const lab: FeaturedLab = {
  slug: "nc-housing-terminal",
  name: "NC Housing Terminal",
  line: "A Bloomberg-style housing map of North Carolina: every ZIP code rendered as a live choropleth of Zillow home-value change.",
  stack: "Mapbox GL · Next.js · static data pipeline · Vercel",
  approach:
    "The colour scale is clamped and diverging, so a given red means the same thing in Asheville as it does in Charlotte — unclamped, a single outlier county flattens the rest of the state into noise. Zillow’s raw series is reshaped into ZIP-indexed data by a build-time pipeline, so the map ships static and the browser never waits on an API. Labels are zoom-gated and detail resolves on hover, which keeps several hundred polygons legible rather than crowded.",
  url: "https://housing.vertexapps.dev",
  shot: "/work/nc-housing-terminal/hero-desktop.avif",
  shotAlt:
    "The NC Housing Terminal choropleth map zoomed into North Carolina with a ZIP-code tooltip visible.",
  meta: "Designed, built, and deployed in one evening.",
};

export const queryGrid: FeaturedLab = {
  slug: "query-grid",
  name: "Query Grid",
  line: "A SQL puzzle campaign. Learn the language of data, one puzzle at a time.",
  stack: "Next.js · DuckDB-Wasm · Monaco Editor · Vercel",
  approach:
    "DuckDB runs entirely in the browser, so there is no backend to keep alive and no data to send anywhere — the schema, the queries, and the correctness check all execute on the visitor's machine. The Toolkit panel names the SQL keywords each level uses before the player runs anything, inverting the teach-by-failure loop most tutorials fall into. Currently one scenario × five levels; the campaign structure supports twelve scenarios totaling sixty puzzles.",
  url: "https://sql-game-zeta.vercel.app",
  shot: "/work/query-grid/hero-desktop.avif",
  shotAlt:
    "The Query Grid board on level one: the scenario brief, a two-table schema, the Toolkit keyword panel, and the query editor.",
  status: "In Development",
};

/** The Labs shown at hero scale on the homepage, in order. */
export const featuredLabs: FeaturedLab[] = [lab, queryGrid];

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
    slug: "ops-table",
    name: "Ops Queue Triage",
    line: "A 420-row exception table with keyboard-first ergonomics, URL-shareable filter state, and a CSV export that survives Excel — interface concept.",
    href: "/labs/ops-table",
    kind: "concept",
  },
  {
    slug: "fee-engine",
    name: "Fee Engine",
    line: "One pricing calculator, four industry rule sets, no vertical logic in the code — interface concept.",
    href: "/labs/fee-engine",
    kind: "concept",
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
  {
    slug: queryGrid.slug,
    name: queryGrid.name,
    line: queryGrid.line,
    href: queryGrid.url,
    external: true,
    kind: "live",
    status: queryGrid.status,
    shot: queryGrid.shot,
    shotAlt: queryGrid.shotAlt,
  },
];

export const affordances = [
  { label: "Email", href: "mailto:contact@vertexapps.dev" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/rystacy/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/ryans108" },
  { label: "GitHub", href: "https://github.com/Ryzzzo" },
];
