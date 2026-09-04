import { species, byId } from '../data'
import { GROUPS, MONTH } from '../types'
import { Silhouette } from '../components/Silhouette'

// Screen 1 · Onboarding. Three screens, one action each. No account, no permission dialog before it is explained.

const hero = byId.get('milvus-milvus')!.image!

/** 1a · Promise + region. Dark photographic mood, real Commons photo, attribution. */
export function OnboardRegion({ variant = 'location' }: { variant?: 'location' | 'search' }) {
  return (
    <div className="relative flex min-h-full flex-col justify-end bg-night text-white">
      <img src={hero.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
      <div className="relative px-6 pb-8">
        <p className="text-[13px] font-semibold tracking-wide text-moss-soft uppercase">Standkreis Dex</p>
        <h1 className="mt-1 text-[32px] leading-[1.1] font-bold">Alles, was vor deiner Haustür lebt.</h1>
        <p className="mt-2 text-[16px] text-white/80">Lern es kennen. Find es draußen. Ohne Konto, ohne Punkte.</p>
        <div className="mt-8">
          <p className="text-[13px] text-white/70">Wo gehst du spazieren?</p>
          {variant === 'location' ? (
            <>
              <a href="#/onboard/groups" className="mt-2 block w-full rounded-2xl bg-moss py-4 text-center text-[17px] font-bold">📍 Meinen Standort nutzen</a>
              <p className="mt-2 text-[12px] leading-snug text-white/60">Dein Handy fragt gleich nach der Erlaubnis. Wir speichern nur den Landkreis; genaue Orte bleiben auf deinem Gerät.</p>
              <a href="#/onboard/region?v=search" className="mt-3 block w-full rounded-2xl border border-white/25 py-3 text-center text-[15px] font-semibold">Ort eingeben</a>
            </>
          ) : (
            <>
              <div className="mt-2 flex h-14 items-center gap-2 rounded-2xl bg-card px-4 text-ink"><span className="text-ink-faint">🔍</span><span className="flex-1 text-[16px]">Mainz-Bin<span className="animate-pulse">|</span></span></div>
              <div className="mt-1 overflow-hidden rounded-2xl bg-card text-ink">
                {['Mainz-Bingen · Landkreis, RLP', 'Mainz · Stadt, RLP', 'Bingen am Rhein · Stadt, Mainz-Bingen'].map((x, i) => <a key={x} href="#/onboard/groups" className={`block px-4 py-3 text-[15px] ${i ? 'border-t border-ink/8' : 'font-semibold'}`}>{x}</a>)}
              </div>
              <a href="#/onboard/groups" className="mt-3 inline-block text-[13px] text-white/60 underline">oder meinen Standort nutzen</a>
            </>
          )}
        </div>
        <p className="mt-6 text-[10px] text-white/45">Foto: {hero.author} · {hero.license} · Wikimedia Commons</p>
      </div>
    </div>
  )
}

/** 1b · Groups as illustrated tiles, all on by default. */
export function OnboardGroups() {
  const counts = Object.fromEntries(GROUPS.map((g) => [g.id, species.filter((s) => s.group === g.id).length]))
  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col px-5 pt-6 pb-8">
      <p className="text-[13px] text-ink-faint">2 von 3</p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold">Was interessiert dich?</h1>
      <p className="mt-1 text-[15px] text-ink-soft">Alles ist an. Schalte aus, was dich nicht reizt; du kannst es jederzeit ändern.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {GROUPS.map((g, i) => {
          const off = i === 6
          return (
            <button key={g.id} className={`flex items-center gap-3 rounded-2xl p-3 text-left ${off ? 'bg-tile text-ink-faint' : 'bg-card shadow-sm ring-2 ring-moss'}`}>
              <Silhouette group={g.id} mode="fill" className={`h-12 w-12 shrink-0 ${off ? 'text-ink/25' : 'text-ink/60'}`} />
              <div className="min-w-0"><p className="text-[15px] font-semibold">{g.de}</p><p className="text-[12px] text-ink-faint">{counts[g.id]} Arten hier</p></div>
              <span className={`ml-auto text-[16px] ${off ? 'text-ink/25' : 'text-moss-deep'}`}>{off ? '○' : '✓'}</span>
            </button>
          )
        })}
      </div>
      <div className="flex-1" />
      <a href="#/onboard/ready" className="mt-6 block rounded-2xl bg-moss py-4 text-center text-[17px] font-bold text-white">Weiter</a>
    </div>
  )
}

/** 1c · Ends on the dex, populated: the promise made concrete. */
export function OnboardReady() {
  // one tile per group where possible, so the preview does not look like nine copies of a bird
  const likely = [...new Map(species.filter((s) => s.months[MONTH] >= 3 && s.group !== 'reptile').map((s) => [s.group, s])).values()].concat(species.filter((s) => s.months[MONTH] >= 3 && s.group !== 'reptile')).filter((s, i, a) => a.indexOf(s) === i).slice(0, 9)
  const n = species.filter((s) => s.group !== 'reptile').length
  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col px-5 pt-6 pb-8">
      <p className="text-[13px] text-ink-faint">3 von 3</p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold">Dein Dex ist bereit.</h1>
      <p className="mt-1 text-[15px] text-ink-soft"><b className="text-ink">{n} Arten</b> sind im September in Mainz-Bingen wahrscheinlich. Alle noch grau. Zwei Wege, sie in Farbe zu bringen:</p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {likely.map((s) => <div key={s.id} className="aspect-square overflow-hidden rounded-2xl bg-tile">{s.image ? <img src={s.image.url} alt="" className="h-full w-full object-cover opacity-45 grayscale" /> : <Silhouette group={s.group} mode="fill" className="h-full w-full p-3 text-ink/55" />}</div>)}
      </div>
      <div className="mt-5 space-y-2 text-[14px]">
        <p className="flex gap-3 rounded-2xl bg-amber-soft p-3"><span className="text-[20px]">📖</span><span><b>Studieren.</b> Lies eine Art, sie bekommt einen Rahmen.</span></p>
        <p className="flex gap-3 rounded-2xl bg-moss-soft p-3"><span className="text-[20px]">👁</span><span><b>Entdecken.</b> Trag eine Sichtung ein, das Bild füllt sich.</span></p>
      </div>
      <div className="flex-1" />
      <p className="text-center text-[12px] text-ink-faint">Kein Konto nötig. Alles bleibt auf diesem Gerät, bis du es woanders sehen willst.</p>
      <a href="#/grid/a" className="mt-3 block rounded-2xl bg-moss py-4 text-center text-[17px] font-bold text-white">Los geht's</a>
    </div>
  )
}
