import {defineCliConfig} from 'sanity/cli'

/**
 * The Studio is standalone and deploys to Sanity's own hosting, so the Next.js
 * build never compiles it. Typegen still points back at the app: the schema
 * lives here, the queries live there, and both halves of the generated types
 * have to agree.
 */
export default defineCliConfig({
  api: {projectId: 'pnvu1x7w', dataset: 'production'},
  // Hosted at https://vertexapps.sanity.studio. The appId was issued on the
  // first deploy (2026-09-22); with it set, `npm run studio:deploy` runs
  // without prompting. Not a secret.
  deployment: {
    appId: 'ps1u7fkn7nrszt229hmsq1ya',
    autoUpdates: true,
  },
  // Schema extraction (and so typegen) evaluates the Studio config in Node via
  // Vite's SSR module runner with every dependency bundled. lexorank, pulled in
  // by the drag-to-reorder plugin, is CommonJS, which that runner cannot
  // evaluate ("exports is not defined"). Vite lets ssr.external override
  // noExternal: true, so lexorank loads natively. No effect on the browser build.
  vite: {
    ssr: {external: ['lexorank']},
  },
  typegen: {
    enabled: true,
    path: '../{app,components,lib}/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
})
