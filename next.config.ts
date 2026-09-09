import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  /**
   * Query Grid, the SQL game, runs as a separate Next.js app in its own Vercel
   * project and is served through this site at /sql — a Multi-Zone.
   *
   * Why a rewrite and not a merge: that app ships DuckDB-Wasm and a bundled
   * Monaco editor. Pulling it into this repo would put megabytes of
   * WebAssembly and editor into the same build as a site that scores 100 on
   * Lighthouse, and the two would then share a bundle graph forever. A rewrite
   * costs one network hop at the edge and keeps the builds unable to affect
   * each other.
   *
   * Why a rewrite and not a redirect or a subdomain: the whole reason the game
   * lives here is that a subfolder inherits this domain's authority. A
   * redirect would send visitors (and crawlers) to the vercel.app hostname, and
   * a subdomain would be treated as a separate site — both give up the thing
   * the arrangement exists for. The zone's own basePath is "/sql" and its
   * canonicals point back here, so the vercel.app URL never competes.
   *
   * Both entries are required: ":path*" does not match the bare "/sql".
   *
   * The origin is the zone's public production alias, NOT
   * sql-game-vertexapps.vercel.app: the team-scoped alias sits behind Vercel
   * Authentication and answers 302 to vercel.com/sso-api, which would have
   * made /sql bounce every visitor to a login page. Verified by requesting
   * both hosts directly -- the team alias 302s, this one returns 200.
   */
  async rewrites() {
    return [
      /*
       * Analytics beacons first, and prefix-stripping: Vercel serves
       * /_vercel/insights/* at the ROOT of a deployment regardless of its
       * basePath, so these cannot go through the general /sql/:path* rule --
       * the zone would 404 them. The zone is configured to request them under
       * /sql/_vercel/*, and this rule takes that prefix back off. Without it
       * both scripts 404 against vertexapps.dev and the SQL pages record no
       * traffic, which for a subfolder that exists to earn search traffic is
       * the failure that matters most.
       */
      {
        source: "/sql/_vercel/:path*",
        destination: "https://sql-game-zeta.vercel.app/_vercel/:path*",
      },
      {
        source: "/sql",
        destination: "https://sql-game-zeta.vercel.app/sql",
      },
      {
        source: "/sql/:path*",
        destination: "https://sql-game-zeta.vercel.app/sql/:path*",
      },
    ];
  },
  // The ship concept moved out of this repo (C:\DEVELOPMENT\Concepts\vertex-ship).
  // Anyone holding an old /ship link lands on the site rather than a 404.
  async redirects() {
    return [
      { source: "/ship", destination: "/", permanent: true },
      { source: "/ship/:path*", destination: "/", permanent: true },
      { source: "/legal/credits", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
