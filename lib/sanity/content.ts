import {cache} from "react";

import {client} from "./client";
import {
  LABS_FEATURED_QUERY,
  LABS_INDEX_QUERY,
  PROJECTS_QUERY,
} from "./queries";
import type {FeaturedLab, LabItem, WorkItem} from "@/lib/content";

/**
 * Server-only. Every caller is a Server Component or a route handler; client
 * components receive this data as props, which is what they already did when
 * the data was a module-scope array.
 *
 * Two revalidation mechanisms on purpose. The cache tags are the fast path —
 * the Sanity webhook hits /api/revalidate and the change is live in seconds.
 * The one-hour window is the safety net: a webhook that is misconfigured, rate
 * limited, or fired while a deploy was mid-flight would otherwise leave stale
 * copy up until the next push, and the failure would be silent.
 */
const REVALIDATE_SECONDS = 3600;

function fetchOptions(tag: string) {
  return {next: {revalidate: REVALIDATE_SECONDS, tags: [tag]}};
}

/** An href Sanity stores as a plain string is external iff it is absolute. */
function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

/** Drops nulls so optional fields read as `undefined`, the way the types say. */
function compact<T extends object>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined),
  ) as T;
}

export const getWork = cache(async (): Promise<WorkItem[]> => {
  const rows = await client.fetch(PROJECTS_QUERY, {}, fetchOptions("project"));
  return (rows ?? [])
    .filter((row): row is typeof row & {slug: string} => Boolean(row.slug))
    .map((row) => compact(row as unknown as WorkItem));
});

export const getFeaturedLabs = cache(async (): Promise<FeaturedLab[]> => {
  const rows = await client.fetch(LABS_FEATURED_QUERY, {}, fetchOptions("lab"));
  return (rows ?? [])
    .filter((row) => Boolean(row.slug) && (row.plate === "map" || row.plate === "sql"))
    .map((row) => compact(row as unknown as FeaturedLab));
});

export const getLabs = cache(async (): Promise<LabItem[]> => {
  const rows = await client.fetch(LABS_INDEX_QUERY, {}, fetchOptions("lab"));
  return (rows ?? [])
    .filter((row): row is typeof row & {slug: string; href: string} =>
      Boolean(row.slug) && Boolean(row.href),
    )
    .map((row) =>
      compact({
        ...(row as unknown as Omit<LabItem, "external">),
        external: isExternal(row.href),
      }) as LabItem,
    );
});
