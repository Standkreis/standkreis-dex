import { z } from 'zod'
import { Tile } from '@/generated/prisma/enums'
import { get, q } from '../../../etl/fetch'
import { resolveRegion } from '../../../etl/gbif'
import { isNow, nowRatio, perMille } from '../../../etl/rules'
import { background } from '../jobs'
import { publicProcedure, router } from '../trpc'

const GBIF = 'https://api.gbif.org/v1'
type GadmHit = { id: string; name: string; gadmLevel: number; type?: string[]; englishType?: string[]; higherRegions?: { id: string; name: string }[] }
type GadmSearch = { results: GadmHit[] }
type ReverseHit = { id: string; type: string; title: string; distance: number }

const gadmSearch = (params: Record<string, string | number>) => get<GadmSearch>(`${GBIF}/geocode/gadm/search?${q({ ...params, limit: 10 })}`).then((j) => j?.results ?? [])
const gadmById = (gid: string) => gadmSearch({ gadmGid: gid }).then((r) => r.find((h) => h.id === gid) ?? null)

/** One level-2 unit as the onboarding shows it: name · type, parent. `type` is GADM's native word (Landkreis), `typeEn` the English one (District). */
const toUnit = (h: GadmHit) => {
  const higher = h.higherRegions ?? []
  return { gadmGid: h.id, name: h.name, higher: higher.map((x) => x.name).join(' › '), parent: higher.at(-1)?.name ?? null, type: h.type?.[0] ?? null, typeEn: h.englishType?.[0] ?? null }
}
type Unit = ReturnType<typeof toUnit>

// In-process region jobs (handoff 0007 Track A, accepted for M5). Cached on globalThis so dev reloads do not start the
// same region twice; a second identity asking for a running region waits on the same job. On Vercel the promise is
// handed to `waitUntil` (handoff 0011 Track B, `server/jobs.ts`), so the invocation lives until the job settles.
const jobs: Map<string, Promise<void>> = ((globalThis as unknown as { __dexRegionJobs?: Map<string, Promise<void>> }).__dexRegionJobs ??= new Map())

/**
 * The region job: facets → set → content, in this process, once per gadmGid at a time. `requestRegion` starts it for a
 * new or failed region; the restart sweep (handoff 0009 Track B, `server/sweep.ts`, on Vercel the hourly cron) restarts
 * it for a region left `queued` by a server that died. Returns the running job, so a caller may await it.
 */
export function startRegionJob(gadmGid: string): Promise<void> {
  const running = jobs.get(gadmGid)
  if (running) return running
  const log = (s: string) => console.log(`[region ${gadmGid}] ${s}`)
  const job = (async () => {
    const { runRegion } = await import('../../../etl/region')
    const { runContent } = await import('../../../etl/content')
    const r = await runRegion(gadmGid, log)
    log(`ready: set ${r.set} in ${r.seconds.toFixed(1)} s`)
    const c = await runContent({ region: gadmGid, log })
    log(`content: ${c.done} filled, ${c.failed} failed in ${(c.seconds / 60).toFixed(1)} min`)
  })()
    .catch((e) => log(`failed: ${e instanceof Error ? e.message : String(e)}`))
    .finally(() => jobs.delete(gadmGid))
  jobs.set(gadmGid, job)
  background(job)
  return job
}

const tile = z.enum(Object.values(Tile) as [Tile, ...Tile[]])

const INAT = 'https://inaturalist-open-data.s3.amazonaws.com/'
const WIKI_THUMB = 330 // one of the widths Wikimedia serves without a scaler run (250, 330, 500, 960 ...); 110 px cell at 3×
/**
 * The grid's image variant (handoff 0009 Track A) for a 110 px cell. iNaturalist `medium.*` (500 px, ~45–60 KB)
 * becomes `small.*` (240 px, ~30 KB). A Wikimedia thumb (960 px, 70–325 KB) becomes the 330 px one (~17 KB); an
 * unscaled original (250 KB to over 1 MB, rate-limited with 429 when fetched in bulk) becomes its 330 px thumb.
 * Own photos stay as they are. The species page keeps the full variants. Measured in findings 0009 §C2.
 */
export const smallVariant = (url: string) => {
  if (url.startsWith(INAT)) return url.replace(/\/medium\.(\w+)$/, '/small.$1')
  const m = url.match(/^https:\/\/(?:thumb|upload)\.wikimedia\.org\/wikipedia\/commons\/(thumb\/)?([0-9a-f]\/[0-9a-f]{2}\/[^/?#]+)(?:\/\d+px-[^/?#]+)?(?:[?#].*)?$/)
  if (!m) return url
  const file = m[2].split('/').pop()!
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[2]}/${WIKI_THUMB}px-${file}${/\.svg$/i.test(file) ? '.png' : ''}`
}
const thisMonth = () => new Date().getMonth() + 1

// The grid's data (spec §🧬 "The plausible set", §🎨 2). Pure read: no identity, the dex state is joined by the client (M5).
export const dexRouter = router({
  /**
   * The species of a region's set for the given tiles, sorted "jetzt wahrscheinlich" (this month's share ÷ peak, then
   * observations). `nowOnly` keeps only the species at ≥ 25 % of their peak this month. The fish tile is hidden
   * (dropped from `tiles` and never returned) when the region's set has no fish (record 0002 E12).
   */
  set: publicProcedure
    .input(z.object({ regionId: z.string().uuid(), tiles: z.array(tile).min(1), nowOnly: z.boolean().default(false), month: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const month = input.month ?? thisMonth()
      const region = await ctx.db.region.findUnique({ where: { id: input.regionId }, select: { id: true, name: true, higher: true, status: true, refreshedAt: true, monthTotals: true } })
      if (!region) return null
      const counts = await ctx.db.plausibility.groupBy({ by: ['taxonId'], where: { regionId: region.id }, _count: true })
      const tilesPresent = await ctx.db.taxon.groupBy({ by: ['tile'], where: { plausibility: { some: { regionId: region.id } } }, _count: { _all: true } })
      const present = new Map(tilesPresent.map((t) => [t.tile, t._count._all]))
      const tiles = input.tiles.filter((t) => t !== 'fish' || (present.get('fish') ?? 0) > 0)
      const rows = await ctx.db.plausibility.findMany({
        where: { regionId: region.id, taxon: { tile: { in: tiles } } },
        include: { taxon: { include: { assets: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1 } } } },
      })
      const species = rows
        .map((p) => ({
          taxonId: p.taxonId,
          gbifKey: p.taxon.gbifKey,
          sciName: p.taxon.sciName,
          names: p.taxon.commonNames as Record<string, string>,
          tile: p.taxon.tile,
          obs: p.obs,
          monthShare: p.monthShare.map(perMille),
          peak: perMille(p.peak),
          nowRatio: +nowRatio(p.monthShare, p.peak, month).toFixed(3),
          now: isNow(p.monthShare, p.peak, month),
          words: p.words,
          lead: p.taxon.assets[0] ?? null,
          leadSmall: p.taxon.assets[0] ? smallVariant(p.taxon.assets[0].url) : null,
          hasContent: p.taxon.contentAt !== null,
        }))
        .filter((s) => !input.nowOnly || s.now)
        .sort((a, b) => b.nowRatio - a.nowRatio || b.obs - a.obs)
      return {
        region,
        month,
        setSize: counts.length,
        tiles: (Object.values(Tile) as Tile[]).filter((t) => t !== 'fish' || (present.get('fish') ?? 0) > 0).map((t) => ({ tile: t, count: present.get(t) ?? 0 })),
        species,
      }
    }),

  /**
   * Regions the ETL knows, for the onboarding picker and the filter drawer, with the honesty line of record 0002 E12:
   * `content` = set members the content job has run for, `introEn` = intros only in English, `noGermanName` = set
   * members without a German name. Shares are of `setSize`; the UI shows "N % nur auf Englisch" when it matters.
   */
  /**
   * The onboarding's region lookup, both paths through GBIF (record 0002 E1): a place name via `geocode/gadm/search`,
   * a point via `geocode/reverse`. Only level-2 units come back; a level-3 hit (Bingen am Rhein) is folded into its
   * level-2 parent (Mainz-Bingen). Each unit carries the Region row's id and status when the ETL already knows it.
   */
  lookupRegion: publicProcedure
    .input(
      z
        .object({ q: z.string().trim().min(2).max(80).optional(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() })
        .refine((i) => i.q !== undefined || (i.lat !== undefined && i.lng !== undefined), 'q or lat+lng'),
    )
    .query(async ({ ctx, input }) => {
      const units: Unit[] = []
      const seen = new Set<string>()
      const push = (u: Unit | null) => { if (u && !seen.has(u.gadmGid)) { seen.add(u.gadmGid); units.push(u) } }
      if (input.q !== undefined) {
        const hits = await gadmSearch({ q: input.q })
        for (const h of hits) {
          if (h.gadmLevel === 2) push(toUnit(h))
          else if (h.gadmLevel === 3) {
            const parent = h.higherRegions?.at(-1)
            if (parent && !seen.has(parent.id)) push(await gadmById(parent.id).then((p) => (p ? toUnit(p) : null)))
          }
        }
      } else {
        const hits = (await get<ReverseHit[]>(`${GBIF}/geocode/reverse?${q({ lat: input.lat!, lng: input.lng! })}`)) ?? []
        const nearest = hits.filter((h) => h.type === 'GADM2').sort((a, b) => a.distance - b.distance)[0]
        if (nearest) push(await gadmById(nearest.id).then((p) => (p ? toUnit(p) : null)))
      }
      const known = units.length ? await ctx.db.region.findMany({ where: { gadmGid: { in: units.map((u) => u.gadmGid) } }, select: { id: true, gadmGid: true, status: true } }) : []
      const byGid = new Map(known.map((r) => [r.gadmGid, { id: r.id, status: r.status }]))
      return units.map((u) => ({ ...u, region: byGid.get(u.gadmGid) ?? null }))
    }),

  /**
   * Make a region exist and be prepared: upserts the Region row `queued` and starts the region job and then the
   * content job in this process, not awaited. Idempotent: a ready region returns at once, a running job is joined,
   * a failed region is retried. The grid polls `identity.me` until `ready` (C2).
   */
  requestRegion: publicProcedure.input(z.object({ gadmGid: z.string().regex(/^[A-Z]{3}(\.\d+)+_\d+$/) })).mutation(async ({ ctx, input }) => {
    const { gadmGid } = input
    const pick = { id: true, name: true, status: true, error: true } as const
    let region = await ctx.db.region.findUnique({ where: { gadmGid }, select: pick })
    if (region?.status === 'ready') return region
    if (!region) {
      const g = await resolveRegion(gadmGid)
      region = await ctx.db.region.upsert({ where: { gadmGid }, create: { gadmGid, name: g.name, higher: g.higher, status: 'queued' }, update: {}, select: pick })
    }
    if (!jobs.has(gadmGid)) {
      if (region.status === 'failed') region = await ctx.db.region.update({ where: { gadmGid }, data: { status: 'queued', error: null }, select: pick })
      void startRegionJob(gadmGid)
    }
    return { ...region, status: 'queued' as const, error: null }
  }),

  regions: publicProcedure.query(async ({ ctx }) => {
    const regions = await ctx.db.region.findMany({ orderBy: { name: 'asc' }, select: { id: true, gadmGid: true, name: true, higher: true, status: true, refreshedAt: true } })
    return Promise.all(
      regions.map(async (r) => {
        const inSet = { plausibility: { some: { regionId: r.id } } }
        const [setSize, content, introEn, noGermanName] = await Promise.all([
          ctx.db.taxon.count({ where: inSet }),
          ctx.db.taxon.count({ where: { ...inSet, contentAt: { not: null } } }),
          ctx.db.taxon.count({ where: { ...inSet, intro: { path: ['lang'], equals: 'en' } } }),
          ctx.db.taxon.count({ where: { ...inSet, contentAt: { not: null }, NOT: { commonNames: { path: ['de'], string_contains: '' } } } }),
        ])
        return { ...r, setSize, content, introEn, noGermanName, introEnShare: setSize ? +(introEn / setSize).toFixed(3) : 0 }
      }),
    )
  }),
})
