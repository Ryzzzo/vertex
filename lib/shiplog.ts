import { execSync } from "node:child_process";
import snapshot from "./shiplog.snapshot.json";

/**
 * What the hero console is allowed to say about shipping: this repository's
 * own commit log, read at build time. Never a client repository — those are
 * private and some are under NDA — and never typed by hand.
 *
 * Order of truth:
 *   1. `git log` on the checkout the build is running from.
 *   2. The Vercel build environment, which always carries the deploying commit.
 *   3. A committed snapshot, so a build with neither still renders real history
 *      rather than an empty panel. Refresh it with `npm run shiplog`.
 */
export type Commit = {
  sha: string;
  short: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  subject: string;
};

const NOISE = /^(wip|fixup!|squash!|merge (branch|remote-tracking)|chore\(release\))/i;

function fromGit(limit: number): Commit[] {
  const out = execSync(`git log -n ${limit + 8} --format=%H%x1f%ad%x1f%s --date=short`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 4000,
  });
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, date, subject] = line.split("\x1f");
      return { sha, short: sha.slice(0, 7), date, subject: subject.trim() };
    })
    .filter((c) => c.sha && !NOISE.test(c.subject))
    .slice(0, limit);
}

function fromVercel(): Commit[] {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const subject = process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0]?.trim();
  if (!sha || !subject) return [];
  return [{ sha, short: sha.slice(0, 7), date: new Date().toISOString().slice(0, 10), subject }];
}

export function getShipLog(limit = 6): Commit[] {
  try {
    const commits = fromGit(limit);
    if (commits.length >= 2) return commits;
  } catch {
    /* no git on this build — fall through */
  }
  const live = fromVercel();
  const seen = new Set(live.map((c) => c.sha));
  const rest = (snapshot as Commit[]).filter((c) => !seen.has(c.sha));
  return [...live, ...rest].slice(0, limit);
}

/** The commit this build was made from — the one line the deploy check reconciles. */
export function getBuildSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
  } catch {
    return (snapshot as Commit[])[0]?.sha ?? "";
  }
}
