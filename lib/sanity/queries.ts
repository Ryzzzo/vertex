import {defineQuery} from 'next-sanity'

/**
 * Field order in these projections is load-bearing, not cosmetic.
 *
 * GROQ returns projected keys in the order they are written, and
 * `lib/assistant/prompt.ts` serialises this data into the assistant's system
 * prompt. Anthropic prompt caching only hits on a byte-identical prefix, so a
 * reordered projection would silently turn every cache hit into a cache miss
 * on every chat message. Add fields at the end; do not shuffle them.
 */

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project"] | order(orderRank asc) {
    "slug": slug.current,
    name,
    line,
    url,
    note,
    stack,
    approach,
    shot,
    shotAlt,
    shotMobile,
    featured
  }
`)

export const LABS_INDEX_QUERY = defineQuery(`
  *[_type == "lab"] | order(orderRank asc) {
    "slug": slug.current,
    name,
    line,
    href,
    kind,
    status,
    shot,
    shotAlt
  }
`)

export const LABS_FEATURED_QUERY = defineQuery(`
  *[_type == "lab" && featured == true] | order(orderRank asc) {
    "slug": slug.current,
    name,
    line,
    stack,
    approach,
    "url": href,
    shot,
    shotAlt,
    status,
    meta,
    plate,
    references[]{ label, href }
  }
`)
