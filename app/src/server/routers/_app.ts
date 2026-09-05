import { router } from '../trpc'
import { dexRouter } from './dex'
import { identityRouter } from './identity'
import { taxonRouter } from './taxon'

export const appRouter = router({ identity: identityRouter, dex: dexRouter, taxon: taxonRouter })
export type AppRouter = typeof appRouter
