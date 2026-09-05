// The content job (spec §🗃️ D–I, record 0002 E6–E9): GBIF species → Wikidata batch → image ladder → Wikipedia de → en →
// GloBI pruned. Not written in the C2 session: the owner sees the tile counts before any content is fetched (handoff 0006).
export async function runContent(opts: { purge?: number; limit?: number }) {
  throw new Error(`content job: not implemented yet (handoff 0006 stops after C2/C3); options ${JSON.stringify(opts)}`)
}
