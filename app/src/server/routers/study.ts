import { z } from 'zod'
import { publicProcedure, router } from '../trpc'

// The studied axis (spec §🧬, handoff 0007 Track B): one row per identity and taxon. Marking earns nothing;
// the recap (M11) sets `recapPassed`. Re-marking resets `at` to now and the recap to false.
export const studyRouter = router({
  mark: publicProcedure.input(z.object({ taxonId: z.string().uuid() })).mutation(({ ctx, input }) =>
    ctx.db.study.upsert({
      where: { identityId_taxonId: { identityId: ctx.identity.id, taxonId: input.taxonId } },
      create: { identityId: ctx.identity.id, taxonId: input.taxonId, at: new Date(), recapPassed: false },
      update: { at: new Date(), recapPassed: false },
      select: { taxonId: true, at: true },
    }),
  ),

  unmark: publicProcedure.input(z.object({ taxonId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { count } = await ctx.db.study.deleteMany({ where: { identityId: ctx.identity.id, taxonId: input.taxonId } })
    return { removed: count }
  }),
})
