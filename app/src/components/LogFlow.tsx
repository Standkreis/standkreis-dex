'use client'

import { useSearchParams } from 'next/navigation'
import { LogSave } from './LogSave'
import { LogSearch } from './LogSearch'

// One flow, two screens (spec §🎨 4, handoff 0008 Track A): the search with the shortlist, then the save screen.
// The step is the URL: `/log` → search, `/log?taxon=<gbifKey>` → save. The chooser is the sheet over the ＋ (LogSheet).
export function LogFlow() {
  const params = useSearchParams()
  const taxon = Number(params.get('taxon'))
  return Number.isInteger(taxon) && taxon > 0 ? <LogSave gbifKey={taxon} /> : <LogSearch />
}
