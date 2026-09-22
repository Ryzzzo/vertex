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
 * Read-only, published-only, CDN-backed.
 *
 * No token: every document this site reads is public, so shipping a read token
 * would widen the blast radius of a leak for nothing. No `defineLive` either —
 * that mounts a subscription in the root layout, and a portfolio whose own copy
 * advertises "no analytics, no cookies, zero third-party requests" should not
 * open a socket to fetch copy that changes twice a month. Freshness comes from
 * the webhook in app/api/revalidate/route.ts.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
  stega: false,
})
