import type { MetadataRoute } from "next";

/**
 * Sitemap for vertexapps.dev.
 *
 * Only this app's own routes. The /sql zone is a separate build with its own
 * sitemap at /sql/sitemap.xml — listing its pages from here would mean this
 * file going stale every time a reference page is added over there, which is
 * exactly the sort of quiet drift a sitemap is supposed to prevent. robots.ts
 * names both.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/labs", "/labs/fee-engine", "/labs/ops-table"];

  return routes.map((route) => ({
    url: `https://vertexapps.dev${route}`,
    lastModified: now,
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : 0.7,
  }));
}