import { router } from '../trpc'
import { dexRouter } from './dex'
import { dataRouter } from './data'
import { identityRouter } from './identity'
import { taxonRouter } from './taxon'

export const appRouter = router({ identity: identityRouter, dex: dexRouter, taxon: taxonRouter, data: dataRouter })
export type AppRouter = typeof appRouter
