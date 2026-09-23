import {defineType, defineField, defineArrayMember} from 'sanity'
import {RocketIcon} from '@sanity/icons/Rocket'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'

/**
 * Labs: demonstrations nobody commissioned.
 *
 * One type covers both surfaces. `featured` promotes an item to hero scale on
 * the homepage and unlocks the depth fields; the /labs index renders every
 * item. The previous shape kept two arrays and had the index reach into the
 * homepage entry for its copy (`name: lab.name`), which Sanity cannot express
 * and which meant one item existed twice.
 *
 * `external` is deliberately absent. It is derived from `href` at query time,
 * so the flag and the URL cannot disagree.
 */
export const lab = defineType({
  name: 'lab',
  title: 'Lab',
  type: 'document',
  icon: RocketIcon,
  groups: [
    {name: 'card', title: 'Index card', default: true},
    {name: 'hero', title: 'Homepage hero'},
  ],
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      group: 'card',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'card',
      options: {source: 'name', maxLength: 64},
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return 'Required'
          return /^[a-z0-9-]+$/.test(slug.current)
            ? true
            : 'Lowercase letters, numbers and hyphens only'
        }),
    }),
    // Position on /labs and among the homepage heroes. Set by dragging in the
    // Studio list, never typed.
    orderRankField({type: 'lab'}),
    defineField({
      name: 'line',
      title: 'One-line description',
      type: 'text',
      rows: 3,
      group: 'card',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'href',
      title: 'Destination',
      type: 'string',
      group: 'card',
      description:
        'An absolute URL (https://...) or an internal route (/labs/fee-engine). Absolute URLs open in a new tab automatically.',
      validation: (rule) =>
        rule.required().custom((value) =>
          !value || /^(https?:\/\/|\/)/.test(value)
            ? true
            : 'Must start with https:// or /',
        ),
    }),
    defineField({
      name: 'kind',
      type: 'string',
      group: 'card',
      description: 'Does the thing actually run, or is it an interface study?',
      options: {
        list: [
          {title: 'Live', value: 'live'},
          {title: 'Concept', value: 'concept'},
        ],
        layout: 'radio',
      },
      initialValue: 'concept',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      group: 'card',
      description:
        'Optional amber chip beside the title. Orthogonal to Live/Concept: a thing can be fully live and still building out.',
    }),
    defineField({
      name: 'shot',
      title: 'Capture path',
      type: 'string',
      group: 'card',
      description:
        'Repo path to the master AVIF, e.g. /labs-shots/fee-engine/hero-desktop.avif or /work/accession/hero-desktop.avif. Concept items without one render a drawn placeholder.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || /^\/(labs-shots|work)\/[a-z0-9-]+\/[a-z0-9-]+\.avif$/.test(value)
            ? true
            : 'Must look like /labs-shots/<slug>/<name>.avif or /work/<slug>/<name>.avif',
        ),
    }),
    defineField({
      name: 'shotAlt',
      title: 'Capture alt text',
      type: 'text',
      rows: 3,
      group: 'card',
    }),

    defineField({
      name: 'featured',
      title: 'Show at hero scale on the homepage',
      type: 'boolean',
      group: 'hero',
      initialValue: false,
    }),
    defineField({
      name: 'stack',
      type: 'string',
      group: 'hero',
      description: 'Short, middot-separated.',
      hidden: ({parent}) => !parent?.featured,
      validation: (rule) =>
        rule.custom((value, context) =>
          (context.document as {featured?: boolean})?.featured && !value
            ? 'Required for a featured Lab'
            : true,
        ),
    }),
    defineField({
      name: 'approach',
      type: 'text',
      rows: 8,
      group: 'hero',
      hidden: ({parent}) => !parent?.featured,
      validation: (rule) =>
        rule.custom((value, context) =>
          (context.document as {featured?: boolean})?.featured && !value
            ? 'Required for a featured Lab'
            : true,
        ),
    }),
    defineField({
      name: 'meta',
      type: 'string',
      group: 'hero',
      description: 'The small line under the card, e.g. "Designed, built, and deployed in one evening."',
      hidden: ({parent}) => !parent?.featured,
    }),
    defineField({
      name: 'references',
      title: 'Reference links',
      type: 'array',
      group: 'hero',
      description:
        'Deep links rendered on the card. These exist for Accession: indexable concept pages under /sql/learn that nothing else on this site links to, so they were reachable by sitemap alone. The homepage is the highest-authority page on the domain.',
      hidden: ({parent}) => !parent?.featured,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'referenceLink',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'href',
              type: 'url',
              validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'href'}},
        }),
      ],
      validation: (rule) => rule.max(6).warning('More than six crowds the card.'),
    }),
    defineField({
      name: 'plate',
      title: 'Plate treatment',
      type: 'string',
      group: 'hero',
      description:
        'Which LabPlate treatment the capture gets. Declared, never inferred from the slug.',
      options: {
        list: [
          {title: 'Map', value: 'map'},
          {title: 'SQL', value: 'sql'},
        ],
        layout: 'radio',
      },
      hidden: ({parent}) => !parent?.featured,
      validation: (rule) =>
        rule.custom((value, context) =>
          (context.document as {featured?: boolean})?.featured && !value
            ? 'Required for a featured Lab'
            : true,
        ),
    }),
  ],
  orderings: [orderRankOrdering],
  preview: {
    select: {title: 'name', subtitle: 'line', featured: 'featured', kind: 'kind'},
    prepare: ({title, subtitle, featured, kind}) => ({
      title: `${title}${featured ? ' (homepage hero)' : ''}`,
      subtitle: `${kind === 'live' ? 'Live' : 'Concept'} — ${subtitle ?? ''}`,
    }),
  },
})
