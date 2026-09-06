// Refreshes lib/shiplog.snapshot.json from git — the fallback the hero's ship
// log renders when a build has neither git history nor Vercel's commit env.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const NOISE = /^(wip|fixup!|squash!|merge (branch|remote-tracking)|chore\(release\))/i;
const out = execSync("git log -n 14 --format=%H%x1f%ad%x1f%s --date=short", { encoding: "utf8" });
const commits = out.split("\n").filter(Boolean).map((l) => {
  const [sha, date, subject] = l.split("\x1f");
  return { sha, short: sha.slice(0, 7), date, subject: subject.trim() };
}).filter((c) => !NOISE.test(c.subject)).slice(0, 6);
writeFileSync(new URL("../lib/shiplog.snapshot.json", import.meta.url), JSON.stringify(commits, null, 2) + "\n");
console.log(`shiplog snapshot: ${commits.length} commits, head ${commits[0]?.short}`);
