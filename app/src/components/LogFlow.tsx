'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { LogSave } from './LogSave'
import { LogSearch } from './LogSearch'
import { load, useOutboxReady } from './Queue'

// One flow, two screens (spec §🎨 4, handoff 0008 Track A): the search with the shortlist, then the save screen.
// The step is the URL: `/log` → search, `/log?taxon=<gbifKey>` → save. `?photo=<assetId>` rides along from the chooser's
// Foto/Galerie; `&scan=1` opens the ladder sheet over the search for that photo (handoff 0016 B3); `?q=` prefills the
// search ("Nein, suchen", B4); `?from=species` sends a repeat sighting back to the page instead of the grid. The chooser is the sheet over the ＋ (LogSheet).
const uuid = /^[0-9a-f-]{36}$/i

export function LogFlow() {
  const params = useSearchParams()
  const taxon = Number(params.get('taxon'))
  const photo = params.get('photo')
  const photoId = photo && uuid.test(photo) ? photo : null
  // The outbox first (handoff 0016 B5): a photo id may be a queued row, and the scan must not ask the engine for a blob that is still on the phone.
  const ready = useOutboxReady()
  useEffect(() => { void load() }, [])
  if (!ready) return null
  return Number.isInteger(taxon) && taxon > 0 ? <LogSave gbifKey={taxon} photoId={photoId} fromSpecies={params.get('from') === 'species'} /> : <LogSearch photoId={photoId} scan={params.get('scan') === '1'} initialQuery={params.get('q') ?? ''} />
}
