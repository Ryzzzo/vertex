/**
 * The /games index, held here rather than in Sanity: it is two entries that
 * change when a game ships, not copy that gets edited week to week, and each
 * entry carries layout decisions (which picture, whether it plays the
 * waterline) that a CMS field would only blur. Move it to Sanity the day it
 * passes a handful of entries.
 *
 * `experiment` sets the amber chip. It is the honest axis for this page: the
 * green chip on the media says whether the thing runs; this one says whether it
 * was built to be finished or to answer a design question.
 */
export type GameFact = { label: string; value: string };

export type GameItem = {
  slug: string;
  name: string;
  /** Mono line above the title: who made it and what kind of game it is. */
  kind: string;
  line: string;
  /** Same-origin path; both games are zones served through this domain. */
  href: string;
  cta: string;
  experiment: boolean;
  facts: GameFact[];
  /** "waterline" plays the drowned room's water under the pointer; "shot" is a still capture. */
  media:
    | { type: "waterline"; alt: string }
    | { type: "shot"; src: string; alt: string };
};

export const games: GameItem[] = [
  {
    slug: "drowned-hollow",
    name: "The Drowned Hollow",
    kind: "Vertex Games · Horror escape room",
    line:
      "In 1944 a dam drowned Sallow Hollow. Every drought, the drowned walk home. Turn back the hands of the stopped mantel clock and the river leaves the house with the hours.",
    href: "/games/drowned-hollow",
    cta: "Play the first slice",
    experiment: true,
    facts: [
      {
        label: "Built to test",
        value:
          "Whether rendered film stills can carry a game: every view is a Cycles render, with live water drawn over it.",
      },
      { label: "Plays", value: "In the browser · first slice, about 20 minutes · sound on" },
      { label: "Made with", value: "Blender Cycles · three.js · Web Audio · recorded sound only" },
    ],
    media: {
      type: "waterline",
      alt: "The main room of the house under the river: a lamp lit on the mantel, a rocking chair half under water, moonlight through the window.",
    },
  },
  {
    slug: "accession",
    name: "Accession",
    kind: "Vertex Labs · SQL puzzle",
    line:
      "A museum records puzzle that teaches SQL: thirty-six levels across six cases, each one a real query against a real database running in your own browser.",
    href: "/sql",
    cta: "Open the first case",
    experiment: false,
    facts: [
      { label: "Teaches", value: "SQL, one case at a time" },
      { label: "Plays", value: "In the browser · no signup, nothing to install" },
      { label: "Made with", value: "DuckDB-Wasm · Monaco · Next.js" },
    ],
    media: {
      type: "shot",
      src: "/work/accession/hero-desktop.avif",
      alt: "An Accession case, “The mislabeled treatment”: the case brief and the two-table schema on the left, the SQL toolkit, the objective and the query editor on the right.",
    },
  },
];
