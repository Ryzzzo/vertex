/**
 * One-shot: move display order from the numeric `order` field to the
 * `orderRank` string that the drag-to-reorder Studio list reads and writes.
 *
 *   node --env-file=../.env.local scripts/order-to-rank.mjs          dry run
 *   node --env-file=../.env.local scripts/order-to-rank.mjs --add    set orderRank from order
 *   node --env-file=../.env.local scripts/order-to-rank.mjs --drop   unset the retired order field
 *
 * Ranks are generated the way @sanity/orderable-document-list generates them
 * (LexoRank.min(), then genNext().genNext() per document), so the first drag
 * lands between two well-spaced values instead of forcing a rebalance.
 *
 * Run --add before the site deploy that sorts by orderRank, and --drop only
 * after it, so the live site never sorts by a field that is missing.
 */
import {createClient} from '@sanity/client'
import {LexoRank} from 'lexorank'

const ADD = process.argv.includes('--add')
const DROP = process.argv.includes('--drop')
const {
  NEXT_PUBLIC_SANITY_PROJECT_ID: projectId,
  NEXT_PUBLIC_SANITY_DATASET: dataset,
  NEXT_PUBLIC_SANITY_API_VERSION: apiVersion,
  SANITY_API_WRITE_TOKEN: token,
} = process.env
for (const [k, v] of Object.entries({projectId, dataset, apiVersion, token})) {
  if (!v) {
    console.error(`Missing ${k}. Run from studio/ with: node --env-file=../.env.local scripts/order-to-rank.mjs`)
    process.exitCode = 1
  }
}

if (!process.exitCode) {
  const client = createClient({projectId, dataset, apiVersion, token, useCdn: false})
  for (const type of ['project', 'lab']) {
    const docs = await client.fetch(
      `*[_type == $type && !(_id in path("drafts.**"))] | order(order asc){_id, "slug": slug.current, order, orderRank}`,
      {type},
    )
    const tx = client.transaction()
    let rank = LexoRank.min()
    for (const doc of docs) {
      rank = rank.genNext().genNext()
      const note = DROP ? (doc.order == null ? 'order already gone' : `unset order ${doc.order}`) : `orderRank ${rank.toString()}`
      console.log(`${type.padEnd(8)} ${String(doc.order ?? '-').padStart(2)}  ${doc.slug.padEnd(24)} ${note}`)
      if (ADD) tx.patch(doc._id, {set: {orderRank: rank.toString()}})
      if (DROP && doc.order != null) tx.patch(doc._id, {unset: ['order']})
    }
    if (ADD || DROP) await tx.commit()
  }
  console.log(ADD ? '\nRanks written.' : DROP ? '\nRetired order field removed.' : '\nDry run. Nothing written.')
}
