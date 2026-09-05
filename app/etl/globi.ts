// GloBI (record 0002 E9, handoff 0006 "GloBI cap"): interaction?sourceTaxon= paged to the end, folded to six kinds,
// unique pairs with in-set targets first, at most 200 per species.
import { get, q } from './fetch'
import { capEdges, foldKind, usableTargetName, type Kind } from './prune'

const API = 'https://api.globalbioticinteractions.org/interaction'
const PAGE = 1000

type Row = { interaction_type: string; target_taxon_name?: string; target_taxon_external_id?: string; target_taxon_path?: string }
export type Edge = { kind: Kind; target: string; externalId?: string; path?: string }

/** Every edge with the species as source, pages of 1,000 until a short page. */
export async function globiEdges(sciName: string): Promise<{ edges: Edge[]; pages: number; raw: number }> {
  const edges: Edge[] = []
  let raw = 0
  let pages = 0
  for (let offset = 0; ; offset += PAGE) {
    const rows = (await get<Row[]>(`${API}?${q({ sourceTaxon: sciName, type: 'json.v2', limit: PAGE, offset })}`)) ?? []
    pages++
    raw += rows.length
    for (const r of rows) {
      const kind = foldKind(r.interaction_type)
      if (kind && usableTargetName(r.target_taxon_name, sciName)) edges.push({ kind, target: r.target_taxon_name!, externalId: r.target_taxon_external_id, path: r.target_taxon_path })
    }
    if (rows.length < PAGE) break
  }
  return { edges, pages, raw }
}

export { capEdges }
