export type WorkItem = {
  slug: string;
  name: string;
  line: string;
  url?: string;
  /** Present only where a real capture exists under /public/work/{slug}/ */
  shot?: string;
  shotAlt?: string;
};

export const work: WorkItem[] = [
  {
    slug: "consultbase",
    name: "ConsultBase",
    line: "A client portal that makes a solo consultancy read as a firm.",
    url: "https://myconsultbase.com",
    shot: "/work/consultbase/hero-desktop.avif",
    shotAlt: "The ConsultBase marketing site rendered on desktop.",
  },
  {
    slug: "parenting-plan-pro",
    name: "Parenting Plan Pro",
    line: "Legal document generation where the text is the product, and protected accordingly.",
  },
  {
    slug: "civic-strategy-partners",
    name: "Civic Strategy Partners",
    line: "Site for a fractional GSA MAS advisory practice — both generations: the 2025 launch site and the complete 2026 rebuild now live.",
    url: "https://www.civicstrategypartners.com/",
    shot: "/work/civic-strategy-partners/hero-desktop.avif",
    shotAlt: "The Civic Strategy Partners site rendered on desktop.",
  },
  {
    slug: "revoix",
    name: "Revoix",
    line: "Product site for an on-device speech and situational-awareness tool used by police and emergency responders. Four languages, zero tracking by design.",
    url: "https://www.revoix.de",
    shot: "/work/revoix/hero-desktop.avif",
    shotAlt: "The Revoix product site rendered on desktop.",
  },
  {
    slug: "fm24",
    name: "FM24",
    line: "Multilingual public site for a German security and facility-management software platform, shipped as a static build into the client’s existing server environment.",
    url: "https://fm24.info",
    shot: "/work/fm24/hero-desktop.avif",
    shotAlt: "The FM24 public site rendered on desktop.",
  },
  {
    slug: "villa-lestagne",
    name: "Villa L’Estagne",
    line: "A booking site for a Mediterranean villa, built to the property’s standard rather than a template’s.",
  },
];

export const lab = {
  name: "NC Housing Terminal",
  line: "A Bloomberg-style housing map of North Carolina: every ZIP code rendered as a live choropleth of Zillow home-value change, diverging red-to-blue on a clamped scale so the color means the same thing in Asheville as in Charlotte, with zoom-gated labels and hover detail. Mapbox GL, Next.js, static data pipeline. Designed, built, and deployed in one evening.",
  url: "https://housing.vertexapps.dev",
  shot: "/work/nc-housing-terminal/hero-desktop.avif",
  shotAlt:
    "The NC Housing Terminal choropleth map zoomed into North Carolina with a ZIP-code tooltip visible.",
};

export const affordances = [
  { label: "Email", href: "mailto:contact@vertexapps.dev" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/rystacy/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/ryans108" },
  { label: "GitHub", href: "https://github.com/Ryzzzo" },
];
