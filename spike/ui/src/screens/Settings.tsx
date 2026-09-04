import { GROUPS } from '../types'
import { BottomBar, Screen } from '../components/Shell'

// Screen 9 · Einstellungen (slice two, mocked 2026-09-04, split off the profile on owner request). Record Q3: anonymous-first, passkey/email upgrade only for sync,
// export and delete in both states. Spec §⚖️: no name, no avatar, no number that goes up. The tab is settings and
// data ownership, not a profile. Two variants: P1 settings list, P2 (?v=card) with a share card of your dex on top.

const q = () => location.hash.split('?')[1] ?? ''
const themeOf = () => new URLSearchParams(q()).get('theme') ?? 'system'
const withParam = (k: string, v: string | null) => {
  const p = new URLSearchParams(q()); v === null ? p.delete(k) : p.set(k, v)
  const s = p.toString(); return `#/settings${s ? `?${s}` : ''}`
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl bg-card shadow-sm ring-1 ring-ink/5 ${className}`}>{children}</div>
)
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-1.5 px-1 text-[13px] font-bold tracking-wide text-ink-faint uppercase">{title}</h2>
    <Card className="divide-y divide-ink/5">{children}</Card>
  </section>
)
const Row = ({ label, value, hint, href = '#/settings', danger = false }: { label: string; value?: string; hint?: string; href?: string; danger?: boolean }) => (
  <a href={href} className="flex items-center gap-3 px-4 py-3">
    <div className="min-w-0 flex-1">
      <p className={`text-[15px] ${danger ? 'text-red-600' : ''}`}>{label}</p>
      {hint && <p className="text-[12px] leading-snug text-ink-faint">{hint}</p>}
    </div>
    {value && <span className="shrink-0 text-[14px] text-ink-soft">{value}</span>}
    <span className="text-ink-faint">›</span>
  </a>
)

/** Identity: the one place the record allows an account, and only for sync. */
function Identity({ synced }: { synced: boolean }) {
  return synced ? (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-soft text-[20px]">☁️</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Auf zwei Geräten</p>
          <p className="text-[13px] leading-snug text-ink-soft">Passkey, kein Passwort. Dieses Handy und dein Laptop, zuletzt heute 17:41.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 text-[13px]">
        <a href={withParam('synced', null)} className="rounded-full bg-tile px-3 py-1.5 font-medium text-ink-soft">Gerät entfernen</a>
        <a href="#/settings" className="rounded-full bg-tile px-3 py-1.5 font-medium text-ink-soft">E-Mail ergänzen</a>
      </div>
    </Card>
  ) : (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tile text-[20px]">📱</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Nur auf diesem Handy</p>
          <p className="text-[13px] leading-snug text-ink-soft">Kein Konto. Ein neues Handy fängt bei Null an, solange du nichts verknüpfst.</p>
        </div>
      </div>
      <a href={withParam('synced', '1')} className="mt-3 block rounded-xl bg-moss py-2.5 text-center text-[15px] font-bold text-white">🔑 Passkey anlegen</a>
      <p className="mt-2 text-center text-[12px] text-ink-faint">Face ID oder Fingerabdruck, kein Passwort. <a href="#/settings" className="underline">Oder per E-Mail.</a></p>
    </Card>
  )
}

export function Settings() {
  const synced = q().includes('synced')
  const theme = themeOf()
  const on = GROUPS.filter((g) => g.id !== 'reptile').length
  return (
    <Screen>
      <header className="px-4 pt-3 pb-3">
        <div className="flex h-10 items-center justify-between">
          <a href="#/you" className="flex h-9 items-center gap-1 rounded-full bg-tile pr-3 pl-2 text-[13px] font-medium text-ink-soft">‹ Du</a>
          <h1 className="text-[22px] leading-none font-bold tracking-tight">Einstellungen</h1>
          <span className="w-16" />
        </div>
      </header>
      <div className="space-y-5 px-4">
        <Identity synced={synced} />
        <Group title="Profil">
          <Row label="Name" value="Sven" hint="Nur auf deinem Profil. Niemand sonst sieht ihn" />
          <Row label="Foto" value="Initialen" hint="Ein eigenes Bild oder deine Initialen" />
        </Group>
        <Group title="Dein Kreis">
          <Row label="Region" value="Mainz-Bingen" hint="Bestimmt, welche Arten im Dex sind" href="#/onboard/region?v=search" />
          <Row label="Gruppen" value={`${on} von ${GROUPS.length} an`} href="#/onboard/groups" />
          <Row label="Standort" value="Nur beim Eintragen" hint="Genau auf dem Gerät, als Gemeinde im Tagebuch, grob beim Teilen" />
        </Group>
        <Group title="Darstellung">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[15px]">Design</p>
            <div className="flex rounded-full bg-tile p-0.5 text-[13px]">
              {([['light', 'Hell'], ['dark', 'Dunkel'], ['system', 'System']] as const).map(([v, l]) => (
                <a key={v} href={withParam('theme', v === 'system' ? null : v)} className={`rounded-full px-3 py-1 ${theme === v ? 'bg-card font-semibold shadow-sm' : 'text-ink-soft'}`}>{l}</a>
              ))}
            </div>
          </div>
          <Row label="Quests" value="Wöchentlich" hint="Pausieren geht direkt im Quests-Tab" href="#/quests" />
        </Group>
        <Group title="Deine Daten">
          <Row label="Exportieren" hint="Alle Entdeckungen und Studiertes als JSON, jederzeit, auch ohne Konto" />
          <Row label="An iNaturalist senden" hint="Später. Deine Entdeckungen bleiben deine, nie der Datensatz" />
          <Row label="Alles löschen" hint="Dieses Handy und, falls verknüpft, die Kopie im Sync" danger />
        </Group>
        <Group title="Über">
          <Row label="Quellen und Lizenzen" hint="GBIF · Wikidata · Wikipedia · GloBI · Commons · Xeno-canto · AnAge" />
          <Row label="Open Source" value="GitHub" />
          <Row label="Version" value="0.1 · Spike" />
        </Group>
        <p className="pb-2 text-center text-[12px] leading-snug text-ink-faint">Kein Konto, keine Punkte, keine Werbung. Kostenlos, für immer.</p>
      </div>
      <BottomBar active="you" />
    </Screen>
  )
}
