import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'vertexapps',
  title: 'Vertex Business Solutions',
  projectId: 'pnvu1x7w',
  dataset: 'production',
  plugins: [structureTool(), visionTool({defaultApiVersion: '2026-09-22'})],
  schema: {types: schemaTypes},
})
