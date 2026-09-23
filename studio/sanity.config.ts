import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
import {CaseIcon} from '@sanity/icons/Case'
import {RocketIcon} from '@sanity/icons/Rocket'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'vertexapps',
  title: 'Vertex Business Solutions',
  projectId: 'pnvu1x7w',
  dataset: 'production',
  plugins: [
    // Both lists are drag-to-reorder. The order you drag here is the order the
    // site shows, top to bottom.
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Content')
          .items([
            orderableDocumentListDeskItem({type: 'project', title: 'Selected work', icon: CaseIcon, S, context}),
            orderableDocumentListDeskItem({type: 'lab', title: 'Lab', icon: RocketIcon, S, context}),
          ]),
    }),
    visionTool({defaultApiVersion: '2026-09-22'}),
  ],
  schema: {types: schemaTypes},
})
