/**
 * Types and the handful of constants that are not worth a CMS.
 *
 * The project and lab data moved to Sanity on 2026-09-22; the fetchers live in
 * `lib/sanity/content.ts`. These types stay here because client components
 * (`WorkCard`, `LabPlate`) import them type-only, and because they describe the
 * shape the components consume, which is not identical to the shape Sanity
 * stores — `external` below is derived, not a field.
 *
 * The pre-migration version lives in git history (dc2c813 and earlier) and,
 * as the migration script's input, in `scripts/_content-snapshot.ts`.
 */

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
  /**
   * Deep links rendered on the card. These exist for Accession: four indexable
   * concept pages under /sql/learn that nothing on this site linked to, so they
   * were reachable by sitemap alone. The homepage is the highest-authority page
   * on the domain; linking them from here is the cheapest thing that can be
   * done for them.
   */
  references?: ReadonlyArray<{ label: string; href: string }>;
};

export type LabItem = {
  slug: string;
  name: string;
  line: string;
  /** Internal route (e.g. /labs/fee-engine) or an external URL. */
  href: string;
  /**
   * Derived from `href` rather than stored, so the flag and the URL cannot
   * disagree the way they could when both were hand-entered.
   */
  external: boolean;
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
 * Four links that have not changed in the life of the site and do not belong to
 * an editor. Kept in code so `lib/assistant/prompt.ts` can read them
 * synchronously at module scope.
 */
export const affordances = [
  { label: "Email", href: "mailto:contact@vertexapps.dev" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/vertexapps/" },
  { label: "Upwork", href: "https://www.upwork.com/freelancers/ryans108" },
  { label: "GitHub", href: "https://github.com/Ryzzzo" },
];
