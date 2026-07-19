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
    stack: "Next.js · Supabase · react-pdf · Stripe · source-fidelity CI gate",
    approach:
      "The plan's legal language lives in a protected-text registry, and the build fails if rendered output drifts from its source by a character. One codebase renders jurisdiction-aware plans across US/Canada, UK, and Australia school-calendar systems. Contested arrangements — supervised visitation, step-up schedules — are gated behind professional mediation, so self-authored legal language never reaches a branded, court-ready PDF.",
    shot: "/work/parenting-plan-pro/hero-desktop.avif",
    shotAlt: "The Parenting Plan Pro landing page rendered on desktop.",
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
  },
  {
    slug: "villa-lestagne",
    name: "Villa L’Estagne",
    line: "A booking site for a Mediterranean villa, built to the property’s standard rather than a template’s.",
    note: "Preview coming soon.",
    stack: "Next.js · Supabase RLS · Resend · no cookies",
    approach:
      "Row-level security lets an anonymous visitor write a booking request and read nothing back, so one guest's dates and contact details are never visible to another. Overlapping requests are allowed by design — two parties can hold the same week as on_request and the owner arbitrates from the admin panel. Bilingual FR/EN with French primary. No cookies, no analytics, no payment processing — a direct-booking site without a platform in the middle.",
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
