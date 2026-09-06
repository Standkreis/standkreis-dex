# 🔍▲ [0011] Findings — the app on Vercel (M8b · take two)

> Findings of [handoff 0011](0011-vercel.md). What the handoff did not decide, the checks with evidence, the Blob costs seen, the doubts, what the owner sets.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-06 | Sven Reiser | C1–C3 pass (Track A, production build `mtp3zwk7`, `next start -p 3002`, the real store `standkreis-dex-blob`, headless Chrome over CDP) · C4 C5 Track B · C6 C7 the owner with the phone |

## 🖼️ Track A · photos in Blob

Branch `0011-a`, worktree `standkreis-dex-a`. Files: `app/src/server/photos.ts`, `app/src/app/api/photo/route.ts` (one comment), `app/src/app/api/photo/[id]/route.ts`, `app/src/server/env.ts`, `app/.env.example`, `app/package.json` (`@vercel/blob` 2.8.0), the driver `app/scripts/m11a/photo.mjs` (new), shots in [`0011-shots/a-*`](0011-shots/). `journal.ts` untouched: the helper signatures did not change.

### 📐 What the handoff did not decide

| Topic | Decision | Why |
| --- | --- | --- |
| Backend pick | Once, at module load: `BLOB_READ_WRITE_TOKEN` set → Blob, else disk (`photos.ts:12`, exported as `photoStore` for logs and tests) | One `if` per operation; the sweep, the journal and `data.delete` never learn which store they hit |
| Serving | `GET /api/photo/<id>` **streams** the private object (`get()` → `ReadableStream`) with `Cache-Control: private, max-age=31536000, immutable` and the store's `content-length`; never a redirect | The store is private, there is no URL to send a browser to; the worker caches the response under the request URL it already knows (`sw.js:52`). The owner's correction to C1's "302s to it" |
| One read helper | New export `readPhoto(assetId)` → `{ body, size } \| null`; the route no longer imports `photoPath` or reads the file itself | The route knew the disk layout; now it knows only the seam. `photoPath` stays exported (nobody imports it) |
| Blob options | `put('photos/<id>.jpg', bytes, { access: 'private', addRandomSuffix: false, contentType: 'image/jpeg' })`; `allowOverwrite` left at its default (throw) | The Asset id is minted per upload, so a second `put` on the same path is a bug, not a retry: the outbox re-uploads to `POST /api/photo`, which mints a new row |
| Missing object | `del()` and `unlink()` both swallow; `get()` on a missing object → `null` → 404 | "A missing file is already gone", as before; a row without an object answers 404 like a row without a file did |
| `PHOTO_DIR` in production | Strict schema: `PHOTO_DIR` optional, `BLOB_READ_WRITE_TOKEN` optional, a `superRefine` demands one of them (`PHOTO_DIR: not set (or set BLOB_READ_WRITE_TOKEN …)`) | The env guard keeps refusing a server with nowhere to put photos; on Vercel the token is there and `PHOTO_DIR` can go |
| Token passed explicitly | `{ token: BLOB_TOKEN }` on every SDK call | The SDK would read `process.env` itself; through `env.ts` the value is trimmed and `''` becomes "unset", so `BLOB_READ_WRITE_TOKEN=` in a shell honestly selects the disk (that is how C2 ran with `.env.local` still holding the token) |
| Driver | `scripts/m11a/photo.mjs c1\|c3`: Node uploads, views, binds (`sighting.create`) and deletes (`journal.remove`); `c3` adds headless Chrome (the `offline.mjs` attach-at-browser pattern) for the diary and the sighting online, then offline. `node --env-file=.env.local …` loads the token without it ever being printed | Findings 0009's driver knows species pages, not photos; a new file rather than a mode in a file Track A does not own |

### 🧪 C1 · the real store (`next start -p 3002`, token in `.env.local`, `scripts/m11a/photo.mjs c1`)

| Step | Evidence |
| --- | --- |
| `POST /api/photo`, 71,254-byte JPEG | **201** in 502 ms (cold), 393 ms (second run); `{ id, url: "/api/photo/<id>" }`, `dex_id` cookie minted |
| The object | `list({ prefix: 'photos/<id>' })` → `photos/d339737d-….jpg`, size **71,254**, `uploadedAt` 1 s after the upload |
| `GET /api/photo/<id>` (`redirect: 'manual'`) | **200**, `content-type: image/jpeg`, `cache-control: private, max-age=31536000, immutable`, `content-length: 71254`, **no `location`**, body byte-identical to the upload; 259 ms first read, 184 ms second |
| `sighting.create({ photoId })` | `evidence: "photographed"`, `first: true` |
| `journal.remove` | `{ removed: 1 }` in 163 ms; `list()` → **`[]`**; `GET /api/photo/<id>` → **404** in 7 ms (the row is gone, the store is never asked) |
| The store afterwards | `list()` over the whole store: **0 blobs, 0 bytes** (nothing left behind by C1, C2, C3) |

### 🧪 C2 · without the token (`BLOB_READ_WRITE_TOKEN= PHOTO_DIR=/tmp/dex-0011a/photos`, same driver)

| Step | Evidence |
| --- | --- |
| Upload | 201 in 55 ms; `list()` → `[]`, `/tmp/dex-0011a/photos/<id>.jpg` **exists** |
| View | 200, same headers, 10 ms / 7 ms, byte-identical |
| Remove | `{ removed: 1 }` in 26 ms; the file is **gone**, 404 after |
| Signatures | `deletePhotoFiles(sightingIds): Promise<number>`, `deletePhotoFilesOfIdentity`, `deleteAbandonedPhotos`, `deletePhoto`, `writePhoto`, `photoUrl` unchanged; `journal.ts`, `sweep.ts`, `data.ts`, `sighting.ts` untouched and compile |
| `npm run check` | green: typecheck, lint (0 errors, 1 pre-existing warning), **30 tests in 6 files**, export build compiled |
| The guard | `next start` with the token but without the four other variables: `[env] refusing to start` naming `DATABASE_URL WEBAUTHN_RP_ID WEBAUTHN_ORIGIN WEBAUTHN_SECRET`, **not `PHOTO_DIR`** |

### 🧪 C3 · the worker offline with a Blob photo (`photo.mjs c3`, Chrome headless, 390×844)

| Step | Evidence |
| --- | --- |
| Online, diary | one `<img src="/api/photo/<id>">`, decoded, 369 px wide; `dex-images` holds **1 entry for `/api/photo/`, 71,254 bytes**, `image/jpeg` (the streamed response, cached under the request URL) |
| Online, sighting | same image decoded, same cache entry (cache-first: no second read) |
| **Offline, diary** | `/de/journal`, 1 day, the photo **decoded from the cache**, 0 failed `/api/photo/` requests — `a-c3-offline-journal-de-light.png` |
| Offline, sighting | **"Einen Moment …"** and the banner, no image — `a-c3-offline-sighting-de-light.png`. **Not the store**: the disk control run (C2, same driver) shows the identical screen. `journal.get` is not in the persisted query list (`trpc/client.tsx:26`, findings 0009 chose eight queries) and the page renders nothing without it; the photo itself sits in the cache. Doubt A1 |
| Offline banner | shows on the sighting page (its query failed), not on the diary (data fresh; CDP leaves `navigator.onLine` true, as findings 0009 C1 saw) |

### 💰 Blob costs seen

| What | Number |
| --- | --- |
| Store `standkreis-dex-blob` | private, `iad1`; before and after the session **0 blobs, 0 bytes** |
| Per photo, this session | 1 `put` (71 KB), 2 `get` from the Node driver + **1 `get` from the browser** (the worker's cache answered the second page), 1 `del`, 3–4 `list` from the driver |
| Latency from the Mac to `iad1` | `put` 390–500 ms, `get` 180–260 ms, `del` ~160 ms; disk on the same box 7–55 ms |
| Steady state per photo | 1 write, 1 read **per device** that views it (then the worker's cache, 1 year `immutable`), 1 delete. Vercel's function in `fra1` fetches from `iad1` on each first view: ~100–200 ms of function time per photo per device |

### 🤔 Doubts

| # | Doubt | Weight |
| --- | --- | --- |
| A1 | **The sighting page is blank offline**, with any store. Persisting `journal.get` (or seeding it from `journal.days`) is one line in `trpc/client.tsx` `PERSISTED`, a file this track does not own. Handoff C3 says "the diary and the sighting"; half of it was never possible since M8 | medium, M9 |
| A2 | The route sets `content-length` from the store's `size`. If Blob ever gzips or ranges a response the header would lie; the SDK's `get()` today returns the raw object (sizes matched in every run) | low |
| A3 | `get()` goes to Blob's CDN by default (`useCache: true`); a `del` + re-`put` on the same path could serve stale bytes for a while. Cannot happen here: a path is one Asset id, written once | low |
| A4 | The function fetches `iad1` from `fra1` on every uncached view; a scraper with the capability URL and no worker costs one Blob read per hit. Same exposure as the disk had, priced now | low |
| A5 | The driver is a new file outside the handoff's list (`scripts/m11a/`), plus the shots directory. No overlap with Track B | note |

### 🔀 For the merge

- `env.ts`: A appended `BLOB_READ_WRITE_TOKEN` to **both** schemas (strict needs it for the `superRefine`) and to the `source` map; B appends `CRON_SECRET` after it in the same three places. Take both lines; the `superRefine` block stays on the strict object.
- `.env.example`: A's block is the last lines; B's `CRON_SECRET` goes below it.
- `package.json`: `"@vercel/blob": "^2.8.0"` in `dependencies`; B adds `@vercel/functions` next to it. `package-lock.json`: run `npm install` after the merge rather than resolving the lock by hand.
- Vercel: `PHOTO_DIR` can be removed from the project's variables once this is live (harmless if left).
- The one lint warning in `npm run check` (`scripts/m8b/queue.mjs:39` `waitGone` unused) predates this track.
