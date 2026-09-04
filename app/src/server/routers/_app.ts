import { router } from '../trpc'
import { identityRouter } from './identity'

export const appRouter = router({ identity: identityRouter })
export type AppRouter = typeof appRouter
