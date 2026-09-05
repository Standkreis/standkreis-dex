# 🔍📓 [0008] Findings — log a sighting, the fill moment and the Tagebuch (M6)

> Findings of [handoff 0008](0008-log-and-journal.md). What the spec did not say, one table per track, the checks with evidence, the shots, the doubts.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C1–C7 pass (Track A) · Track B: see its section · C11 C12 on `main` after both merges |

## 🔍 Track A · log, save, photo, fill

Branch `m6-log`. Shots in [`0008-shots/a-*`](0008-shots/), driver script `app/scripts/m6a/log.mjs` (headless Chrome over CDP, no dependency; modes `fresh`, `c1`–`c7`, `shots`, `shots2`). Two commits: the first half (chooser, search, save, fill; C1 C2) was shown to the owner before the second (photo, content kick, "Entdeckt", nudge; C3–C7).

### 📐 What the spec did not say

| Topic | Decision | Why |
| --- | --- | --- |
| The "first" rule | **Strictly the earliest wild row** of a taxon per identity: earlier `at`, ties by earlier `createdAt`. Captive and cultivated never count. Computed in `isFirst()` in `sighting.ts`, once for `create` and `fill` | One rule for both tracks (handoff §🔀). A back-dated sighting entered later becomes "first" and the row it displaces stops being first, which is the honest reading of the dates |
| Backbone search | Three GBIF `species/search` calls: `qField=VERNACULAR` over every checklist folded to `nubKey`; the same query over **every field** (plain `q`); scientific names in the backbone (`rank=SPECIES status=ACCEPTED`). Keys read through the cached `species/{key}` for their ranks; no tile → dropped; ten rows, the keys most checklists agree on first | GBIF's vernacular field is whole-word: "Eichenprozessionsspinner" found **nothing**, only the plain search matches the hyphenated "Eichen-Prozessionsspinner". Found by C4, fixed in the second half |
| Shortlist | The set in `nowRatio` order minus the seen species, eight rows, month in the meta line | Findings 0002 §4 |
| `at` | The **client's clock**, sent as a Date; editable through a `datetime-local` capped at now | The phone knows when; the server would only be right in one zone |
| Gemeinde | GBIF `geocode/reverse` GADM3, nearest hit, uncached; else the region's name. Asked on the save screen after one line of explanation; a browser that already granted takes the point silently | Spec §⚖️ ladder; the exact point is stored, lists show the Gemeinde |
| "Gehalten" | `captive` for animals and fungi, `cultivated` for plants, decided by the tile | Schema `Wildness` has both; the button says one word |
| Repeat and kept toasts | `?again=<id>` → "Wiedergesehen · Amsel"; `?again=<id>&kept=1` → **"Gespeichert · Turmfalke · gehalten"** | A kept sighting of a species never seen wild is not "seen again"; the handoff had only the repeat line |
| Photo pipeline | `createImageBitmap(file, {imageOrientation: 'from-image'})` → canvas, 1,600 px long edge, JPEG q 0.85 → multipart `POST /api/photo` → `app/data/photos/<assetId>.jpg`, the **file name is the Asset id**. The Asset is created unattached (`ownerId`, no `sightingId`); `sighting.create({photoId})` or `sighting.attachPhoto` binds it. `url` and `sourceUrl` are **same-origin relative** (`/api/photo/<id>`); `photoSrc()` on the client prefixes `NEXT_PUBLIC_API_URL` for the export build | EXIF, and GPS with it, never leaves the phone; the orientation is applied before it is dropped. Relative URLs survive a port or host change of the API; an absolute one would pin dev on 3002 |
| Photo in the flow | The id rides in the URL (`/log?photo=`, `/log?taxon=&photo=`) so back and reload keep it. Chooser Foto = `<input capture="environment">`, Galerie = plain picker; both persistent hidden inputs (`data-testid=photo-input*`) so a test can set files | One state carrier for the three screens; no store |
| `GET /api/photo/<id>` | Serves the file when an Asset with that v4 uuid and `origin: 'user'` exists; no cookie check | The uuid is the capability: the export lists these URLs and they must open from the file later. See doubts |
| Own photo in the grid | `sighting.photos` = latest wild photo per taxon (by sighting `at`); the cell shows it in colour instead of the reference image, `data-own` set | Spec §🎨 2, `dex.set` untouched |
| Out-of-set cells | `sighting.outside({regionId})` = wild-seen taxa with no `Plausibility` in the region; appended **after** the set, tile icon until `contentAt`, polled every 10 s while a kick runs. Hidden under "nur jetzt" and "Neu"; shown under "Alle", "Entdeckt", "Studiert". **Not counted** in studiert · entdeckt · möglich, and the +1 tick stays off | The counters read "of 929 möglich" (findings 0002 doubt 41); an extra find would make the numerator drift from the denominator. See doubts |
| Content kick | `taxon.ensure` calls `runContent({keys: [key]})` in-process, not awaited, cached on `globalThis` per key; also for an **existing** row without content (a GloBI target) | Same rule as M5's region job; C4 landed in 10 s |
| "Entdeckt" on the species page | Two buttons in the sticky bar: "Entdeckt" (moss, `/log?taxon=<key>&from=species`), "Studiert" (amber). Once seen the label reads **"Wieder entdeckt"**. After the save: first → grid fill; repeat → back to the page with the toast. State row "✓ entdeckt · 5. Sept." from `progress.seenAt` | Owner's §❓ proposal: one fill implementation, on the grid |
| Nudge | Server: `shouldOfferPasskey(db, id)` = no passkey **and exactly one wild sighting**, returned as `offerPasskey` on `sighting.fill`. Client: shown when the fill sheet closes, `localStorage["dex.nudge.passkey"]` set on any exit. Wording as proposed in §❓ | Doubt 31 |
| Toast lifetime | `onDone` after 3 s drops the URL param; the caller keeps `onDone` stable (`useCallback`) | A toast that re-arms on every render would never leave |
| File cleanup | `app/src/server/photos.ts`: `deletePhotoFiles(sightingIds)` (Track B's `journal.remove` calls it **before** deleting the rows), `deletePhotoFilesOfIdentity(id)` (in `data.delete` before the cascade), `deletePhoto(assetId)` (one photo, evidence back to `claimed`) | The cascade drops the Asset rows the file names come from, so files go first |

### 🧪 Checks

Fresh identities per check (`log.mjs fresh`), Mainz-Bingen, 390 × 844, de/light unless noted.

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| C1 | ＋ → shortlist row → Wild, location refused | ✅ | Three taps (`choose-search`, `log-row`, `save-wild`). URL `/de?fill=<id>`; sheet "ENTDECKT · Turmfalke · 👁 5. Sept. · Mainz-Bingen · Ort grob gespeichert" with "Referenzbild: … · CC BY … · iNaturalist"; header "0 studiert · 1 entdeckt +1 · 929 möglich"; cell `fill: done, grayscale: false, ring: true, check: true`; Profil "0 studiert · 1 entdeckt · 929 möglich"; one row `wild claimed place=Mainz-Bingen lat=null`. `a-fill-sheet-*`, `a-fill-after-de-light` |
| C2 | Same species again | ✅ | URL `/de?again=<id>`, toast "Wiedergesehen · Amsel", `sheet: false`, counters unchanged, two rows. `a-fill-again-toast-*`, `a-species-again-toast-*` |
| C3 | "Gehalten · speichern", never seen wild | ✅ | Turmfalke: URL `/de?again=<id>&kept=1`, toast "Gespeichert · Turmfalke · gehalten", no sheet, no +1, "0 entdeckt · 929 möglich" before and after, cell `grayscale: true, check: false`; row `wildness: captive, evidence: claimed`. Tagebuch row "gehalten" is Track B's C8, checked after the merge. `a-captive-toast-*` |
| C4 | "Eichenprozessionsspinner" (not in the set) | ✅ | Backbone row "Eichen-Prozessionsspinner · Thaumetopoea processionea · Insekt oder Spinne · wird in deinen Atlas aufgenommen"; save screen "hier selten gemeldet"; after save the cell is **index 929 of 930** with `data-outside`, silhouette, no `<img>`; `contentAt` set after **10.4 s** (names de+en, intro de 113 chars, 1 lead image); species page title "Eichen-Prozessionsspinner", intro "Der Eichen-Prozessionsspinner ist ein Schmetterling…", 6 slider images, "hier selten gemeldet", state "entdeckt · 5. Sept."; grid cell then `hasImg: true, grayscale: false`; `Plausibility` for Mainz-Bingen **929**, the moth in **0** sets. Counters stay "0 entdeckt" (decision above). `a-outside-fill-*`, `a-outside-cell-*`, `a-outside-page-de-light` |
| C5 | Galerie → JPEG with EXIF GPS → save | ✅ | Source (canvas 2400 × 1600 + spliced APP1 Exif with GPSInfo 0x8825 → GPSLatitude 49°54′N, + APP1 XMP `exif:GPSLatitude`): 56,446 B, segments `E1:Exif E1:http:/ E0 E2 DB DB C0 C4…`, `hasGPS: true, hasExif: true`. Stored `app/data/photos/babc696b-….jpg`: 28,090 B, segments `E0 E2 DB DB C0 C4…` — **no APP1, `hasGPS: false, hasExif: false`**, 1600 × 1067. Asset `origin user · author Du · licence eigenes Foto · url /api/photo/<id>` owned by the identity; row `evidence: photographed`; cell `data-own`, `<img src=/api/photo/<id>>`, `grayscale: false`; sheet image = the photo, `attribution: null`, **no Foto button**. `a-fill-sheet-own-photo-*`, `a-grid-own-photo-*`, `a-photo-2-search-empty-*` (strip), `a-photo-3-save-*` (slot) |
| C6 | "Entdeckt" on the Amsel page, location allowed (49.9097, 8.2014) | ✅ | Bar before: "👁 Entdeckt · Studiert", state "noch nicht entdeckt". Save screen `/de/log?taxon=2490719&from=species`, species "Amsel", where "**Nieder-Olm** · genau gespeichert · geteilt nur grob" without a tap. After save `/de?fill=`, sheet meta "5. Sept. · Nieder-Olm · Ort grob gespeichert", cell filled. Back on the page: "**entdeckt · 5. Sept.**", bar "👁 Wieder entdeckt". Repeat from the page: `/de/species/2490719?again=<id>`, toast "Wiedergesehen · Amsel", no fill. Rows: `place=Nieder-Olm lat=49.9097 lng=8.2014` ×2. `a-species-bar-*`, `a-species-seen-*`, `a-species-again-toast-*`, `a-species-save-de-light` |
| C7 | First wild sighting on a fresh identity, dismiss the sheet | ✅ | `passkeys: 0`; nudge "🔑 Auch auf dem Laptop? Ein Passkey nimmt deine Sichtungen mit auf andere Geräte. Kein Konto, keine E-Mail. Später · Passkey anlegen"; "Später" → gone, `localStorage dex.nudge.passkey = "1"`; reload → not shown; a second species' fill sheet → not shown. Identity with a `Passkey` row (`fresh --passkey`): `passkeys: 1`, nudge never shown on the first fill nor the second. `a-nudge-*` |

`npm run check` green on `m6-log`: typecheck, lint, tests incl. locale parity, `STATIC_EXPORT=1 next build` with no `out/api`.

### 🖼️ Shots

`docs/handoffs/0008-shots/a-*`, all four of de/en × light/dark unless noted:

| Screen | Files |
| --- | --- |
| Chooser · search empty · results · save · save located | `a-log-1-chooser`, `a-log-2-search-empty`, `a-log-2-search-results`, `a-log-3-save`, `a-log-3-save-located` |
| The same with a photo taken first | `a-photo-1-chooser`, `a-photo-2-search-empty` (strip "Foto angehängt"), `a-photo-2-search-results`, `a-photo-3-save` (slot with the thumb), `a-photo-3-save-located` |
| Fill sheet · after dismiss · repeat toast | `a-fill-sheet`, `a-fill-after-de-light`, `a-fill-again-toast` |
| Own photo: sheet without Foto, grid cell in colour | `a-fill-sheet-own-photo`, `a-grid-own-photo` |
| Nudge | `a-nudge` |
| Species page: bar, seen with date, repeat toast, preset save | `a-species-bar`, `a-species-seen`, `a-species-again-toast`, `a-species-save-de-light` |
| Kept toast | `a-captive-toast` |
| Out of the set: fill, cell at the bottom, page after the kick | `a-outside-fill`, `a-outside-cell`, `a-outside-page-de-light`, `a-outside-cell-after-de-light` |

### 🤔 Doubts

| # | Doubt | Where it lands |
| --- | --- | --- |
| A1 | **Out-of-set finds do not move the counters.** The moth shows a filled cell and "0 entdeckt · 929 möglich". Alternative: count it in entdeckt and leave möglich at the set ("1 entdeckt · 929 möglich"), which needs `countersOf` to learn about `sighting.outside` for Profil too | Owner |
| A2 | The strict earliest-wild rule means a back-dated repeat can turn the fill on for a sighting entered second; the Tagebuch's "Neu entdeckt" chip follows the same rule, so both move together | Accepted, watch the diary |
| A3 | `taxon.search` is three uncached GBIF calls per debounced query (350 ms, ≥ 3 chars) plus one cached `species/{key}` per hit. Fine for one walker; a rate limit before launch | M8 |
| A4 | `at` is the client's clock; a phone with a wrong clock writes a wrong `at`, and the "first" rule reads it | Accepted (record Q1: the phone knows) |
| A5 | A taxon created by `ensure` shows its Latin name and no attribution on the fill sheet for the ~10 s until the kick lands; the sheet does not refetch. The species page and the grid catch up (poll) | Cosmetic; a refetch of `sighting.fill` on `outside` change would close it |
| A6 | `GET /api/photo/<id>` is a capability URL, no cookie check: anyone with the uuid sees the photo. Needed for the export and for a future device sync; a signed URL is M8's | M8 |
| A7 | Photos uploaded and then abandoned (chooser → back) stay as unattached Asset rows and files owned by the identity. `data.delete` removes them; nothing else does | A sweep in M8's job, or `removePhoto` on back |
| A8 | Photo URLs are relative; the export JSON lists `/api/photo/<id>` without a host. A Capacitor export (M15) prefixes `NEXT_PUBLIC_API_URL` on the client (`photoSrc`), Track B's sighting page renders `url` as is and works same-origin | Track B / M15 |
| A9 | `Toast.onDone` must be a stable callback; `SpeciesPage` drops `?again` through `history.replaceState`, the grid through `setParams`. Two small copies of the same idea | Fine |
| A10 | The chooser's Foto tile relies on `<input capture="environment">`: Safari and Chrome on phones open the camera, a desktop opens the picker. Headless tests set the file on the persistent input | Accepted |
| A11 | The content kick runs the whole content job for one key: Wikidata batch, Commons batch, GloBI edges. 10 s in C4. Two taps on two rows run two kicks in parallel; the job serialises its writes so no deadlock, but no queue either | M8 |
| A12 | `pg` in the driver script parses `timestamp` columns as local time; the evidence prints `at::text` (UTC as stored) to avoid a −2 h confusion | Script only |

**For Track B's merge:** `journal.remove` calls `deletePhotoFiles(ids)` from `@/server/photos` **before** `sighting.delete`; `journal.days` reads `photos[0].url` and renders it as is (same-origin).
