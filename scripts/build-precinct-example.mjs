/**
 * Freezes the Census geocoder's answer for the Precinct Lookup's example
 * address into data/precincts/example.json.
 *
 * Only the geocoder's part is frozen. The page resolves the precinct, the
 * boundary distance and the drawing from it at build time, against whatever
 * precinct file is current, so the example can't drift from the data. It also
 * means the page makes no geocoder call when it opens.
 *
 * Run: node scripts/build-precinct-example.mjs
 * (Node 24 imports the TypeScript module directly.) Re-run it only if the
 * example address changes or the Census Bureau re-issues its districts.
 */
import { writeFileSync } from "node:fs";
import { geocode } from "../lib/precinct/geocode.ts";

const ADDRESS = "1100 Central Ave, Charlotte, NC";

const outcome = await geocode(ADDRESS);
if (outcome.kind !== "match") {
  console.error(`geocoder: ${outcome.kind}; example.json left as it was`);
  process.exit(1);
}

const file = new URL("../data/precincts/example.json", import.meta.url);
const body = {
  address: ADDRESS,
  label: "1100 Central Ave, Charlotte",
  geocodedOn: new Date().toISOString().slice(0, 10),
  otherMatches: outcome.otherMatches,
  match: outcome.match,
};
writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`);
console.log(`wrote example.json: ${outcome.match.matchedAddress}`);
