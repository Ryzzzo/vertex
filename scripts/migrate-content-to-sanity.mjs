/**
 * One-shot migration of lib/content.ts into the Sanity `production` dataset.
 *
 *   node --env-file=.env.local scripts/migrate-content-to-sanity.mjs
 *   node --env-file=.env.local scripts/migrate-content-to-sanity.mjs --commit
 *
 * Dry run is the default and prints the exact documents it would write.
 *
 * Documents are matched by `slug`, never by a slug-derived `_id`: Sanity
 * assigns ids, and encoding source data into an id is how a content lake ends
 * up with a second private key nobody maintains. That also makes this script
 * re-runnable — a second run patches the seven projects rather than creating
 * seven more.
 *
 * Reads the pre-migration file via scripts/_content-snapshot.ts (a copy of
 * lib/content.ts.pre-sanity.bak) so the values are transcribed by the runtime
 * rather than by hand. Both are deleted once production is verified.
 */
import {createClient} from '@sanity/client'

const COMMIT = process.argv.includes('--commit')

const {
  NEXT_PUBLIC_SANITY_PROJECT_ID: projectId,
  NEXT_PUBLIC_SANITY_DATASET: dataset,
  NEXT_PUBLIC_SANITY_API_VERSION: apiVersion,
  SANITY_API_WRITE_TOKEN: token,
} = process.env

for (const [name, value] of Object.entries({projectId, dataset, apiVersion, token})) {
  if (!value) {
    console.error(`Missing ${name}. Run with: node --env-file=.env.local ${process.argv[1]}`)
    process.exit(1)
  }
}

const client = createClient({projectId, dataset, apiVersion, token, useCdn: false})

const snapshot = await import('./_content-snapshot.ts')

/** Strips undefined so Sanity is not sent explicit nulls for absent fields. */
const defined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

const projects = snapshot.work.map((item, index) =>
  defined({
    _type: 'project',
    name: item.name,
    slug: {_type: 'slug', current: item.slug},
    order: index,
    featured: item.featured === true,
    line: item.line,
    url: item.url,
    note: item.note,
    stack: item.stack,
    approach: item.approach,
    shot: item.shot,
    shotAlt: item.shotAlt,
    shotMobile: item.shotMobile,
  }),
)

const featuredBySlug = new Map(snapshot.featuredLabs.map((l) => [l.slug, l]))

const labs = snapshot.labs.map((item, index) => {
  const hero = featuredBySlug.get(item.slug)
  return defined({
    _type: 'lab',
    name: item.name,
    slug: {_type: 'slug', current: item.slug},
    order: index,
    featured: Boolean(hero),
    line: item.line,
    href: item.href,
    kind: item.kind,
    status: item.status ?? hero?.status,
    shot: item.shot,
    shotAlt: item.shotAlt,
    stack: hero?.stack,
    approach: hero?.approach,
    meta: hero?.meta,
    plate: hero?.plate,
    references: hero?.references?.map((ref, i) => ({
      _key: `ref${i}`,
      _type: 'referenceLink',
      label: ref.label,
      href: ref.href,
    })),
  })
})

const unmatched = [...featuredBySlug.keys()].filter(
  (slug) => !snapshot.labs.some((l) => l.slug === slug),
)
if (unmatched.length) {
  console.error(`Featured labs with no /labs index entry: ${unmatched.join(', ')}`)
  console.error('Those would lose their hero fields. Fix the snapshot and re-run.')
  process.exit(1)
}

const all = [...projects, ...labs]

console.log(`${projects.length} project + ${labs.length} lab documents`)
for (const doc of all) {
  const flags = [doc.featured ? 'featured' : null, doc.plate, doc.kind]
    .filter(Boolean)
    .join(' ')
  console.log(`  ${String(doc.order).padStart(2)} ${doc._type.padEnd(8)} ${doc.slug.current.padEnd(24)} ${flags}`)
}

if (!COMMIT) {
  console.log('\nDry run. Nothing written. Re-run with --commit to apply.')
} else {
  await commit()
}

// process.exit() here trips a libuv assertion on Windows while the client's
// keep-alive socket is still closing, which turns a clean dry run into exit 1.
// Letting the event loop drain on its own avoids it.
async function commit() {
let created = 0
let patched = 0

for (const doc of all) {
  const existing = await client.fetch(
    '*[_type == $type && slug.current == $slug][0]._id',
    {type: doc._type, slug: doc.slug.current},
  )

  if (existing) {
    const {_type, ...fields} = doc
    await client.patch(existing).set(fields).commit()
    patched += 1
    console.log(`patched  ${doc._type}/${doc.slug.current}`)
  } else {
    const result = await client.create(doc)
    created += 1
    console.log(`created  ${doc._type}/${doc.slug.current}  ${result._id}`)
  }
}

console.log(`\n${created} created, ${patched} patched.`)
}
