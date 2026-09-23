import {defineType, defineField} from 'sanity'
import {CaseIcon} from '@sanity/icons/Case'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'

/**
 * Selected work: production software someone commissioned and relies on.
 *
 * The boundary against `lab` is editorial, not technical, and it is the reason
 * these are two types rather than one with a `surfaces` field: a demonstration
 * nobody paid for must not be able to appear here by ticking a box.
 */
export const project = defineType({
  name: 'project',
  title: 'Selected work',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name', maxLength: 64},
      description:
        'Also the folder name under /public/work/. Changing it orphans the captures.',
      validation: (rule) =>
        rule.required().custom((slug) => {
          if (!slug?.current) return 'Required'
          return /^[a-z0-9-]+$/.test(slug.current)
            ? true
            : 'Lowercase letters, numbers and hyphens only'
        }),
    }),
    // Position in the grid. Set by dragging in the Studio list, never typed:
    // a typed number does not move its neighbors, which is how two projects
    // ended up sharing position 6 on the first day.
    orderRankField({type: 'project'}),
    defineField({
      name: 'featured',
      type: 'boolean',
      description: 'Renders at hero scale above the grid. Exactly one project.',
      initialValue: false,
      validation: (rule) =>
        rule.custom(async (featured, context) => {
          if (!featured) return true
          const client = context.getClient({apiVersion: '2026-09-22'})
          const id = context.document?._id?.replace(/^drafts\./, '')
          const others = await client.fetch(
            `count(*[_type == "project" && featured == true && !(_id in [$id, "drafts." + $id])])`,
            {id},
          )
          return others === 0 || 'Another project is already featured. Unfeature it first.'
        }),
    }),
    defineField({
      name: 'line',
      title: 'One-line description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required().max(180).warning('Long lines wrap badly on the card.'),
    }),
    defineField({
      name: 'url',
      title: 'Live URL',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'note',
      type: 'string',
      description: 'Shown in place of the capture where none exists. Only read when there is no capture.',
    }),
    defineField({
      name: 'stack',
      type: 'string',
      description: 'Short, middot-separated. Revealed on hover.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'approach',
      type: 'text',
      rows: 8,
      description: 'Two or three sentences of technical method.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shot',
      title: 'Desktop capture path',
      type: 'string',
      description:
        'Repo path to the master AVIF, e.g. /work/consultbase/hero-desktop.avif. The responsive variants are built from it by scripts/build-shot-variants.py and must be committed alongside it.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || /^\/work\/[a-z0-9-]+\/[a-z0-9-]+\.avif$/.test(value)
            ? true
            : 'Must look like /work/<slug>/<name>.avif',
        ),
    }),
    defineField({
      name: 'shotAlt',
      title: 'Capture alt text',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'shotMobile',
      title: 'Phone capture path',
      type: 'string',
      description: '780x1688. Enables the desktop/phone flip.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || /^\/work\/[a-z0-9-]+\/[a-z0-9-]+\.avif$/.test(value)
            ? true
            : 'Must look like /work/<slug>/<name>.avif',
        ),
    }),
  ],
  orderings: [orderRankOrdering],
  preview: {
    select: {title: 'name', subtitle: 'line', featured: 'featured'},
    prepare: ({title, subtitle, featured}) => ({
      title: `${title}${featured ? ' (featured)' : ''}`,
      subtitle,
    }),
  },
})
