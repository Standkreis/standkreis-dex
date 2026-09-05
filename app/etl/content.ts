// The content job (spec §🗃️ D–I, record 0002 E6–E9, handoff 0006 Track A): for every taxon in any region's set or with
// a sighting and no content yet: GBIF species → Wikidata batch (P846, then name) → image ladder (iNat → Commons P18 →
// next iNat → none) → Wikipedia de → en → GloBI pruned and capped. Runs once per taxon (`contentAt`); `--purge <gbifKey>`
// re-fetches one. A failure on one taxon logs and continues.
import { Prisma } from '../src/generated/prisma/client'
import { db } from './db'
import { pool, requests } from './fetch'
import { gbifMatch, gbifSpecies, type Species } from './gbif'
import { capEdges, globiEdges, type Edge } from './globi'
import { iucnCode, pickNames } from './prune'
import { tileOf } from './rules'
import { anageFacts, commonsAsset, commonsInfo, inatDefault, inatNext, inatTaxon, wikipediaIntro, type AssetDraft, type Fact, type Intro } from './sources'
import { wikidataFor, type WdMatch } from './wikidata'

export type ContentOpts = { purge?: number; limit?: number; region?: string; keys?: number[]; log?: (s: string) => void }
export type ContentResult = {
  taxa: number
  done: number
  failed: number
  seconds: number
  ladder: Record<string, number>
  intro: Record<string, number>
  wikidata: Record<string, number>
  edges: number
  targetsCreated: number
  requests: ReturnType<typeof requests>
}

type Target = { id: string; gbifKey: number; inSet: boolean }
type Taxon = { id: string; gbifKey: number; sciName: string }

/** The taxa the job works on: no content yet, and in a set or logged (E13). Never GloBI's out-of-set targets. `keys` = just these (the log's in-process kick, handoff 0008). */
async function selectTaxa({ purge, limit, region, keys }: ContentOpts): Promise<Taxon[]> {
  const select = { id: true, gbifKey: true, sciName: true }
  if (purge) {
    const t = await db.taxon.findUnique({ where: { gbifKey: purge }, select })
    if (!t) throw new Error(`no taxon with gbifKey ${purge}`)
    await db.$transaction([
      db.asset.deleteMany({ where: { taxonId: t.id, sightingId: null } }),
      db.interaction.deleteMany({ where: { sourceId: t.id } }),
      db.taxon.update({ where: { id: t.id }, data: { contentAt: null, intro: Prisma.DbNull, facts: Prisma.DbNull, wikidataId: null, iucn: null, namePath: null, commonNames: {} } }),
    ])
    return [t]
  }
  if (keys) return db.taxon.findMany({ where: { contentAt: null, gbifKey: { in: keys } }, select, orderBy: { gbifKey: 'asc' } })
  const regionRow = region ? await db.region.findFirst({ where: { OR: [{ name: region }, { gadmGid: region }] }, select: { id: true } }) : null
  if (region && !regionRow) throw new Error(`no region "${region}"`)
  return db.taxon.findMany({
    where: { contentAt: null, OR: [{ plausibility: { some: regionRow ? { regionId: regionRow.id } : {} } }, { sightings: { some: {} } }] },
    select,
    orderBy: { gbifKey: 'asc' },
    take: limit,
  })
}

export async function runContent(opts: ContentOpts): Promise<ContentResult> {
  const log = opts.log ?? console.log
  const t0 = Date.now()
  const taxa = await selectTaxa(opts)
  log(`content: ${taxa.length} taxa to fill`)
  const r: ContentResult = { taxa: taxa.length, done: 0, failed: 0, seconds: 0, ladder: {}, intro: {}, wikidata: {}, edges: 0, targetsCreated: 0, requests: requests() }
  if (!taxa.length) return r
  const count = (bucket: Record<string, number>, k: string) => (bucket[k] = (bucket[k] ?? 0) + 1)

  // Batches first: Wikidata (≈ 8 calls per 929), Commons file info for every P18 (≈ 22 calls).
  const wd = await wikidataFor(taxa)
  const commons = await commonsInfo([...wd.values()].map((m) => m.item?.img).filter((x): x is string => !!x))
  log(`wikidata ${[...wd.values()].filter((m) => m.item).length} items · commons ${commons.size} files`)

  // Every set member anywhere, by name and key: GloBI targets in a set come first and never get a new row.
  const members = await db.taxon.findMany({ where: { plausibility: { some: {} } }, select: { id: true, gbifKey: true, sciName: true } })
  const setByName = new Map(members.map((m) => [m.sciName, { id: m.id, gbifKey: m.gbifKey, inSet: true }]))
  const setByKey = new Map(members.map((m) => [m.gbifKey, { id: m.id, gbifKey: m.gbifKey, inSet: true }]))
  const targetCache = new Map<string, Promise<Target | null>>()
  // Fetches run four taxa wide; writes go one at a time. Four parallel transactions touching Taxon deadlocked in Postgres.
  let chain: Promise<unknown> = Promise.resolve()
  const serial = <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn, fn)
    chain = next.catch(() => undefined)
    return next
  }

  /** A GloBI target name → the Taxon row it lands on: a set member by name or key, else a new row from GBIF match. */
  const resolveTarget = (name: string, sourceKey: number): Promise<Target | null> => {
    const hit = setByName.get(name)
    if (hit) return Promise.resolve(hit)
    let p = targetCache.get(name)
    if (!p) {
      p = (async () => {
        const m = await gbifMatch(name)
        if (!m?.usageKey || m.matchType !== 'EXACT' || m.usageKey === sourceKey) return null
        const inSet = setByKey.get(m.usageKey)
        if (inSet) return inSet
        const tile = tileOf(m)
        if (!tile) return null
        const row = await serial(() =>
          db.taxon.upsert({
            where: { gbifKey: m.usageKey! },
            create: { gbifKey: m.usageKey!, sciName: m.canonicalName ?? name, rank: (m.rank ?? 'UNRANKED').toLowerCase(), tile, class: m.class ?? null, order: m.order ?? null, genus: m.genus ?? null },
            update: {},
            select: { id: true },
          }),
        )
        return { id: row.id, gbifKey: m.usageKey, inSet: false }
      })()
      targetCache.set(name, p)
    }
    return p
  }

  let n = 0
  await pool(taxa, 4, async (t) => {
    try {
      const out = await fillOne(t, wd.get(t.gbifKey) ?? { path: 'none', item: null }, commons, { inSet: (name) => setByName.has(name), resolve: (name) => resolveTarget(name, t.gbifKey), serial }, log)
      count(r.ladder, out.ladder)
      count(r.intro, out.intro)
      count(r.wikidata, out.wikidata)
      r.edges += out.edges
      r.targetsCreated += out.targetsCreated
      r.done++
    } catch (e) {
      r.failed++
      log(`  ✗ ${t.sciName} (${t.gbifKey}): ${e instanceof Error ? e.message : e}`)
    }
    if (++n % 25 === 0 || n === taxa.length) log(`  ${n}/${taxa.length} · ${((Date.now() - t0) / 60_000).toFixed(1)} min · ${JSON.stringify(requests().perHost)}`)
  })
  r.seconds = (Date.now() - t0) / 1000
  r.requests = requests()
  return r
}

/** One taxon, every source, one transaction. */
async function fillOne(t: Taxon, wd: WdMatch, commons: Awaited<ReturnType<typeof commonsInfo>>, targets: { inSet: (name: string) => boolean; resolve: (name: string) => Promise<Target | null>; serial: <T>(fn: () => Promise<T>) => Promise<T> }, log: (s: string) => void) {
  const s: Species | null = await gbifSpecies(t.gbifKey)
  const sciName = s?.canonicalName ?? t.sciName
  const item = wd.item
  if (wd.note) log(`  · ${sciName}: ${wd.note}`)
  const names = pickNames({ sciName, deLabel: item?.deLabel, enLabel: item?.enLabel, jaLabel: item?.jaLabel, dewiki: item?.dewiki, enwiki: item?.enwiki })

  // Image ladder (E7): iNat default if licensed → Commons P18 unless rejected → next licensed iNat → none (tile icon).
  const inat = await inatTaxon(sciName)
  let asset: AssetDraft | null = inatDefault(inat, sciName)
  let ladder = 'inat'
  if (!asset) {
    asset = commonsAsset(commons, item?.img, sciName)
    ladder = 'commons'
  }
  if (!asset && inat) {
    asset = await inatNext(inat, sciName)
    ladder = 'inatNext'
  }
  if (!asset) ladder = 'none'

  // Intro de → en (E8, E12), facts from AnAge (E8).
  const intro: Intro | null = (await wikipediaIntro(item?.dewiki, 'de')) ?? (await wikipediaIntro(item?.enwiki, 'en'))
  const facts: Record<string, Fact> = await anageFacts(item?.anage)

  // GloBI (E9): fold, cap with in-set first, resolve the kept targets.
  const globi = await globiEdges(sciName)
  const kept: Edge[] = capEdges(globi.edges, targets.inSet)
  const resolved = await Promise.all(kept.map(async (e) => ({ e, target: await targets.resolve(e.target) })))
  const interactions = resolved.filter((x): x is { e: Edge; target: Target } => !!x.target && x.target.id !== t.id).map((x) => ({ sourceId: t.id, targetId: x.target.id, kind: x.e.kind, origin: 'GloBI' }))
  const targetsCreated = resolved.filter((x) => x.target && !x.target.inSet).length

  const data = {
    sciName,
    rank: (s?.rank ?? 'species').toLowerCase(),
    class: s?.class ?? undefined,
    order: s?.order ?? undefined,
    genus: s?.genus ?? undefined,
    commonNames: names,
    iucn: iucnCode(item?.iucn),
    intro: intro ?? undefined,
    facts: Object.keys(facts).length ? facts : undefined,
    namePath: wd.path,
    contentAt: new Date(),
  }
  const write = (wikidataId: string | null) =>
    targets.serial(() =>
      db.$transaction(async (tx) => {
        await tx.asset.deleteMany({ where: { taxonId: t.id, sightingId: null } })
        await tx.interaction.deleteMany({ where: { sourceId: t.id } })
        if (asset) await tx.asset.create({ data: { ...asset, kind: 'image', taxonId: t.id } })
        if (interactions.length) await tx.interaction.createMany({ data: interactions, skipDuplicates: true })
        await tx.taxon.update({ where: { id: t.id }, data: { ...data, wikidataId } })
      }),
    )
  try {
    await write(item?.qid ?? null)
  } catch (e) {
    // Two GBIF keys on one Wikidata item (a synonym pair): the second keeps the content, not the id.
    if (!(e instanceof Error && 'code' in e && e.code === 'P2002' && item)) throw e
    log(`  · ${sciName}: ${item.qid} already belongs to another taxon, stored without wikidataId`)
    await write(null)
  }
  return { ladder, intro: intro?.lang ?? 'none', wikidata: wd.path, edges: interactions.length, targetsCreated }
}
