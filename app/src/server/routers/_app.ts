import { router } from '../trpc'
import { dexRouter } from './dex'
import { dataRouter } from './data'
import { identityRouter } from './identity'
import { journalRouter } from './journal'
import { sightingRouter } from './sighting'
import { studyRouter } from './study'
import { taxonRouter } from './taxon'

export const appRouter = router({ identity: identityRouter, dex: dexRouter, taxon: taxonRouter, data: dataRouter, study: studyRouter, sighting: sightingRouter, journal: journalRouter })
export type AppRouter = typeof appRouter
