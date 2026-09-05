'use client'

import { useSearchParams } from 'next/navigation'
import { LogSave } from './LogSave'
import { LogSearch } from './LogSearch'

// One flow, two screens (spec §🎨 4, handoff 0008 Track A): the search with the shortlist, then the save screen.
// The step is the URL: `/log` → search, `/log?taxon=<gbifKey>` → save. `?photo=<assetId>` rides along from the chooser's
// Foto/Galerie; `?from=species` sends a repeat sighting back to the page instead of the grid. The chooser is the sheet over the ＋ (LogSheet).
const uuid = /^[0-9a-f-]{36}$/i

export function LogFlow() {
  const params = useSearchParams()
  const taxon = Number(params.get('taxon'))
  const photo = params.get('photo')
  const photoId = photo && uuid.test(photo) ? photo : null
  return Number.isInteger(taxon) && taxon > 0 ? <LogSave gbifKey={taxon} photoId={photoId} fromSpecies={params.get('from') === 'species'} /> : <LogSearch photoId={photoId} />
}
