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
    featured: true,
  },
  {
    slug: "parenting-plan-pro",
    name: "Parenting Plan Pro",
    line: "Legal document generation where the text is the product, and protected accordingly.",
    url: "https://parentingplanpro.com",
    stack: "Next.js · Supabase · Postgres · deterministic PDF assembly",
    approach:
      "Statutory language lives in a protected-text registry, and the build fails if generated output drifts from its source by a character. Assembly is deterministic — the same inputs produce the same bytes — so a plan can be regenerated and diffed years after it was filed. Review states are modeled in the schema rather than tracked in anyone’s memory.",
  },
  {
    slug: "civic-strategy-partners",
    name: "Civic Strategy Partners",
    line: "Site for a fractional GSA MAS advisory practice — both generations: the 2025 launch site and the complete 2026 rebuild now live.",
    url: "https://www.civicstrategypartners.com/",
    stack: "Next.js · Tailwind · static render · Vercel",
    approach:
      "A credibility site for a practice that sells judgment, so the build optimizes for trust signals and first paint rather than motion. Everything renders statically; nothing on the critical path waits on a client-side fetch. The 2026 rebuild preserved the existing URL structure, so inbound links and accumulated search equity survived the redesign intact.",
    shot: "/work/civic-strategy-partners/hero-desktop.avif",
    shotAlt: "The Civic Strategy Partners site rendered on desktop.",
  },
  {
    slug: "revoix",
    name: "Revoix",
    line: "Product site for an on-device speech and situational-awareness tool used by police and emergency responders. Four languages, zero tracking by design.",
    url: "https://www.revoix.de",
    stack: "Next.js · next-intl · static export · no analytics, no backend",
    approach:
      "The privacy claim on the page has to survive the network tab, so the site makes no third-party requests and ships no analytics. There is no backend and no API surface — every page renders at build time. Locale routing is path-based across four languages, so each one is independently linkable and independently indexable.",
    shot: "/work/revoix/hero-desktop.avif",
    shotAlt: "The Revoix product site rendered on desktop.",
  },
  {
    slug: "fm24",
    name: "FM24",
    line: "Multilingual public site for a German security and facility-management software platform, shipped as a static build into the client’s existing server environment.",
    url: "https://fm24.info",
    stack: "Next.js · static export · build-time i18n · client-hosted",
    approach:
      "Shipped as a static export dropped into infrastructure the client already runs — no Node runtime for them to maintain, no API for the site to depend on. Language routing resolves at build time rather than through a request-time redirect. The handoff was the deliverable: they own the output and can redeploy it without me.",
    shot: "/work/fm24/hero-desktop.avif",
    shotAlt: "The FM24 public site rendered on desktop.",
  },
  {
    slug: "villa-lestagne",
    name: "Villa L’Estagne",
    line: "A booking site for a Mediterranean villa, built to the property’s standard rather than a template’s.",
    note: "Preview coming soon.",
    stack: "Next.js · Supabase · Stripe · date-fns",
    approach:
      "Booking is the part that has to be right: two requests for the same night cannot both win, so the constraint lives in the database rather than in application code that races itself. Availability, pricing, and calendar sync are modeled once and read everywhere, so the calendar and the checkout can never disagree. The design brief was the property’s standard, not a booking template’s.",
  },
];

export const lab = {
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

export const affordances = [
  { label: "Email", href: "mailto:contact@vertexapps.dev" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/rystacy/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/ryans108" },
  { label: "GitHub", href: "https://github.com/Ryzzzo" },
];
