import {createClient} from 'next-sanity'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION

if (!projectId || !dataset || !apiVersion) {
  throw new Error(
    'Sanity env vars missing. Expected NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and NEXT_PUBLIC_SANITY_API_VERSION in .env.local (and in the Vercel project settings).',
  )
}

/**
 * Read-only, published-only, and deliberately not on Sanity's API CDN.
 *
 * No token: every document this site reads is public, so shipping a read token
 * would widen the blast radius of a leak for nothing. No `defineLive` either —
 * that mounts a subscription in the root layout, and a portfolio whose own copy
 * advertises "no analytics, no cookies, zero third-party requests" should not
 * open a socket to fetch copy that changes twice a month. Freshness comes from
 * the webhook in app/api/revalidate/route.ts.
 *
 * `useCdn: false` because the CDN and that webhook race. The webhook fires as
 * a document is published, while apicdn.sanity.io went on serving the old
 * version for about a minute (measured 2026-09-22), so the revalidation it
 * triggered re-cached the stale copy for the full hour. Next's data cache
 * (tagged, `revalidate: 3600`) already sits between visitors and Sanity, so
 * these reads only happen on a build or a revalidation, and going uncached
 * costs a handful of requests a day.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: 'published',
  stega: false,
})
