// One build id per `npm run build` (handoff 0009 Track A). `next build` loads next.config.ts in more than one process,
// so an id minted there with Date.now() differs between `.next/BUILD_ID` and the value inlined into the client bundle
// (seen: mtoprir5 vs mtoprivc), and the worker looked for its manifest under the wrong id. The `prebuild` hooks write the
// seed here; the config reads it. BUILD_ID in the environment still wins.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(new URL('../../', import.meta.url).pathname, 'node_modules', '.cache')
mkdirSync(dir, { recursive: true })
const id = process.env.BUILD_ID ?? Date.now().toString(36)
writeFileSync(join(dir, 'dex-build-id'), id)
console.log(`build id ${id}`)
