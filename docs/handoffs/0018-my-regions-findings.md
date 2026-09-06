# 🗺️ [0018] Findings — my regions

> What was built for [0018](0018-my-regions.md), with evidence. One session on `main`.

| 🗓️ Done | 👤 Agent | ⬆️ Handoff | 🧪 Checks |
| --- | --- | --- | --- |
| 2026-09-06 | Claude | [0018](0018-my-regions.md) | C1–C6 ✅ · C7 owner |

## 🛠️ What was built

| Row | Done | Where |
| --- | --- | --- |
| R1 | `Filter.regionIds String[] @default([])`, `regionId` stays the active one. Migration **`20260907000000_filter_regions`** written by hand (`ADD COLUMN … TEXT[] NOT NULL DEFAULT '{}'` + the backfill `UPDATE … SET "regionIds" = ARRAY["regionId"]`), applied to the dev DB with `migrate deploy` only; `migrate diff` against the dev DB: "No difference detected" | `prisma/schema.prisma:58-62` · `prisma/migrations/20260907000000_filter_regions/migration.sql` |
| R2 | `identity.me` returns `region` (active) plus `regionIds` and `regions` (id · name · status, in list order). `setFilter({ regionId, regionIds?, tiles?, nowOnly? })`: the list is deduplicated, must contain `regionId`, every id must be a `ready` region; an absent `regionIds` keeps the list (the grid's tile write), absent `tiles`/`nowOnly` stay too. `setRegion({ regionId })`: the one-tap switch, `regionId` must be in the list | `identity.ts:72-83` (`me`), `:133-148` (`setFilter`), `:153-157` (`setRegion`) |
| R3 | `RegionSheet.tsx` on the 0014b `Sheet` (`z-50`, over the drawer): one card per ready region of `dex.regions`, name · `higher` · "N Arten · M jetzt"; sky radio (`border-sky` ring, `bg-sky` dot, 0014 G5) for the active one plus a 1.5 px sky inset ring on its card; a sky checkbox on the right (`role=checkbox`) for "in my list". `dex.regions` gained `nowCount` (members at ≥ 25 % of peak this month) | `RegionSheet.tsx:71-140` · `dex.ts:187-195` |
| R4 | Profile: "Region ändern" is a button opening the sheet (the `/onboarding?change=1` link is gone). Atlas header: a `bg-tile` pill with the region name and a chevron (`Marks.tsx` `chevron`), right of the title, opens the same sheet. Drawer: "Ändern" opens it over the drawer. `router.push('/onboarding?change=1')` is gone from the grid; the onboarding's change mode stays in code, unlinked | `IdentityProfile.tsx:81` · `AtlasGrid.tsx:174,226,238` · `FilterDrawer.tsx` untouched |
| R5 | `useRegionSwitch`: optimistic `identity.me` (region ← from `me.regions`), then `setRegion`, then invalidate. Every region reader derives from `me.region` (grid, counters, profile, log search, `useScan`, the diary's scan drawer, `OfflineDownload`), and `dex.set` · `sighting.outside` key by `regionId`, so the switch is a cache-entry swap, no code in those files. `['dex','regions']` joined `PERSISTED` so the sheet lists offline. Without network the mutation fails, the wish goes to `localStorage['dex.region.pending']`; `RegionReplay` (mounted in the layout) resends it on `online`/foreground and keeps `me` on the pending region while the server still answers the old one | `RegionSheet.tsx:23-63` · `trpc/client.tsx:30` · `layout.tsx:62` |
| R6 | First run: `regionIds = [it]`. Change mode (URL still works, no link): the list so far plus the pick, so an old bookmark does not shrink the list | `Onboarding.tsx:240,246` |
| i18n | New block `regions` (title, open, species, now, inList, activeStays, lastStays, onlineFirst, offlineList, hint) in both files; `messages.test` green | `de.json`, `en.json` after `you` |

## 🗳️ Decisions the handoff left open

| Question | Decision | Why |
| --- | --- | --- |
| Tap on a row **not** in the list | Adds it **and** makes it active, closes | The travel case in one tap; the checkbox still adds without switching. Server side it is one `setFilter` |
| `setFilter` without `regionIds` | Keeps the list | The grid writes tiles from a `me` that may be a persisted, pre-0018 snapshot without `regionIds`; a required list would have collapsed three regions to one on the first tile tap after the deploy |
| Refusal order | "Eine Region bleibt." wins over "Die aktive Region bleibt." when the list has one entry | With one region both are true; the shorter line is the one that explains the checkbox |
| Offline checkbox | Refused with "Hinzufügen und Entfernen geht erst mit Netz." | Adding needs the server (the list is server state); the handoff only asked for the switch offline |
| Offline switch that never reaches the server | Pending in localStorage + replay + overlay (`RegionReplay`) | An optimistic switch alone reverts on the next `me` refetch after reconnect: a trap on the walk |
| "This month's count" | `nowCount` on `dex.regions` = `isNow` over the region's plausibility rows (4 × ~900 rows, `monthShare`+`peak` only) | The same rule as the chip; `dex.regions` is not on the walk's hot path |
| Sheet row sub line | Two lines (`higher`, then the counts) | One line truncated at 390 px ("929 Arten · …", first run's shot) |

## 🧪 Checks

Production build (`next build` + `next start -p 3008`, dev DB, disk photos `/tmp/m18-photos`), headless Chrome 390 × 844 over CDP, `app/scripts/m18/regions.mjs` (`LOCALE=en SHEET_ONLY=1` for the English shot). Fresh identity, Mainz-Bingen, all tiles.

### C1 · the migration on the dev DB

| | |
| --- | --- |
| Before | 81 `Filter` rows, 81 with `regionId` |
| After `migrate deploy` | 81 rows, **81** with `regionIds = ARRAY[regionId]`, 0 empty |
| `migrate diff` (`--from-config-datasource --to-schema`) | No difference detected |

### C2 · profile → sheet → add Schagen → tap it

| Step | Result | Shot |
| --- | --- | --- |
| Profile | "Region ändern" is a `BUTTON`; the sheet opens with 4 rows: Kyoto 303 · 165, **Mainz-Bingen 929 · 364** (active: dot `rgb(37,99,235)`, card ring `0 0 0 1.5px inset` sky), Schagen 902 · 378, Südwestpfalz 583 · 201 | `c2-sheet-profile-de`, `-en` |
| Checkbox Schagen | row `data-in-list`, server `regionIds = [Mainz-Bingen, Schagen]`, active unchanged | `c2-sheet-added` |
| Tap Schagen | sheet closed in **268 ms**, profile line SCHAGEN, server `region = Schagen` | `c2-profile-schagen` |
| Atlas | header pill "Schagen ⌄", counters **`0 studiert · 0 entdeckt · 902 möglich`** | `c2-atlas-schagen` |
| Header pill | opens the same sheet (`z-index 50`), Schagen active | `c2-sheet-atlas` |
| Drawer's Ändern | region section "Region · Ändern · Schagen"; the sheet opens over the drawer, the drawer stays | `c2-sheet-over-drawer` |
| Log search | shortlist = Schagen's first 8 in "jetzt" order (Kiebitz, Sandregenpfeifer, Steinwälzer, Waldbrettspiel, Odinshühnchen, Zwergfledermaus, Sichelstrandläufer, Rauchschwalbe): **8/8** in Schagen's set, **0/8** in Mainz-Bingen's top 8 | `c2-log-schagen` |
| Diary | a sighting without a point logged after the switch gets `place = "Schagen"` (`sighting.ts:51`, the filter's region); the day card reads "Heute · So 6. Sep · Schagen · Sandregenpfeifer · Neu entdeckt" | `c2-journal-schagen` |

### C3 · the refusals

| Try | Client | Server |
| --- | --- | --- |
| Uncheck the active one (Schagen) | line "Die aktive Region bleibt. Wechsle erst zu einer anderen.", list unchanged | `setFilter({ regionId: MB, regionIds: [Schagen] })` → **400** "the active region must be in the list" |
| Uncheck the last one (Mainz-Bingen alone) | line "Eine Region bleibt." | `regionIds: []` → **400** zod `too_small` |
| Unknown / not ready region in the list | – | **400** "only ready regions" |
| `setRegion` to a region not in the list (Kyoto) | – | **400** "not one of your regions" |
| Tiles without a list | – | **200**, `regionIds` unchanged |

Shots `c3-refused-active`, `c3-refused-last`.

### C4 · without network

Online first (through the sheet): list [Mainz-Bingen, Schagen, Kyoto], Mainz-Bingen active; persisted store holds `dex.set` for Mainz-Bingen and Schagen (both were on screen) and `dex.regions`, no Kyoto set. Worker controlling, 3 worker sessions attached. Then `Network.emulateNetworkConditions offline` on the page and every worker; `fetch('/api/trpc/identity.me')` fails.

| Step | Result | Shot |
| --- | --- | --- |
| Reload | grid up in **90 ms** from the shell cache | |
| Sheet from the header | 4 rows from the cache; Kyoto's row carries "erst online laden" | `c4-offline-sheet` |
| Tap Kyoto | line "erst online laden", header stays Mainz-Bingen | `c4-offline-uncached` |
| Tap Schagen | sheet closed in 302 ms, header Schagen in 1 ms, counters **902 möglich** from the cache, `dex.region.pending = Schagen` | `c4-offline-switched` |
| Reload, still offline | header Schagen, 902 möglich (persisted `me` + overlay); the server still says Mainz-Bingen | |
| Online again | pending cleared, server `region = Schagen`, header Schagen | |

### C5 · the scan after the switch

Switch to Schagen through the sheet (one tap on the unlisted row: added and active, server confirms). `splash.jpg` uploaded through `POST /api/photo`; `sighting.identify` intercepted over CDP `Fetch` and answered with `{ subject: 'single', answer: null, outside: 'Vulpes vulpes', … }` (no Anthropic call, 0 ¢).

| | |
| --- | --- |
| Request body | `{ photoId, regionId: 67303e90-… }` = **Schagen** |
| Ladder sentence | **"Nicht im Atlas von Schagen: vermutlich Vulpes vulpes"** |

Shot `c5-scan-schagen`.

### C6 · `npm run check` and the migration on a copy

`npm run check`: typecheck, lint, **46 tests** in 8 files, export build green (log `/tmp/m18-check.log`).

Copy: `pg_dump dex | psql dex_copy`, then `DROP COLUMN "regionIds"` and the migration row deleted, then `migrate deploy` against `dex_copy`.

| Table | Before | After |
| --- | --- | --- |
| Filter | 83 | 83 (**83** backfilled, 0 without region) |
| Sighting | 122 | 122 |
| Study | 24 | 24 |
| Taxon | 28 714 | 28 714 |
| Plausibility | 2 717 | 2 717 |
| Identity · Asset | 108 · 1 926 | 108 · 1 926 |

`dex_copy` dropped afterwards.

## ❓ Doubts for the owner

1. **"Diary header Mainz-Bingen" (C2) does not exist.** The Tagebuch has no region line; the region appears as a sighting's `place` when it was logged without a point, fixed at creation (`sighting.ts:51`). Verified that way: a sighting after the switch says Schagen; the earlier ones keep their place. If a region line in the diary header was meant, it is one `me.region.name` under the title.
2. **`higher` is English** ("Germany › Rheinland-Pfalz", "Netherlands › Noord-Holland"): GADM's name through the ETL, shown as stored. A German country name needs a lookup in the ETL or `Intl.DisplayNames` on the client (needs the ISO code, which `Region` does not store).
3. **A list changed on another device** shows up here after the persisted `me` turns stale (60 s) or on focus; the sheet does not refetch on open. Same rule as every other query.
4. **The offline "erst online laden" appears twice** on a tap (the row's marker and the reply line under the list). Both are the wording the handoff asked for; drop the row marker if it feels doubled.
5. **`setFilter` takes an optional list**, not the required one the handoff wrote (R2). Reason in §🗳️; the required rule holds whenever a list is sent.
6. **The pending switch is one slot**: two offline switches keep the last. Rows in the outbox would be the full treatment; not worth a `Row` kind for one id.
7. **Findings 0014 doubt 1** (change mode preselects the first region) is moot: no link reaches change mode any more. Left as is.

## 🔀 For the merge

Single session on `main`, nothing parallel. Files: `prisma/schema.prisma` + the migration folder (runs in Vercel's build as every migration; Neon gets it on the next deploy, the backfill is in the same file), `identity.ts`, `dex.ts`, `RegionSheet.tsx` (new), `AtlasGrid.tsx`, `IdentityProfile.tsx`, `Onboarding.tsx`, `Marks.tsx`, `trpc/client.tsx` (`PERSISTED`), `[locale]/layout.tsx` (`RegionReplay`), `de.json`/`en.json` (`regions` block), `scripts/m18/regions.mjs`. DEPLOY.md untouched. Onboarding's change mode still compiles, unreachable from the UI. C7 (Simulator) is the owner's.
