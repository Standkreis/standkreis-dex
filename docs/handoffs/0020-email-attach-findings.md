# ✉️ [0020] Findings — email attach (M7b)

> What was built for [0020](0020-email-attach.md), with evidence. One session on `main`.

| 🗓️ Done | 👤 Agent | ⬆️ Handoff | 🧪 Checks |
| --- | --- | --- | --- |
| 2026-09-07 | Claude | [0020](0020-email-attach.md) | C1–C7 ✅ · C8 owner |

## 🛠️ What was built

| # | Done | Where |
| --- | --- | --- |
| E1 | `Identity.emailVerifiedAt DateTime?` next to `email`; `EmailCode { id, identityId → Identity Cascade, email, codeHash, attempts 0, expiresAt, usedAt?, createdAt, locale }`, indexes `(identityId)` and `(email, createdAt)`. Migration **`20260908000000_email_attach`** by hand, `migrate deploy` on the dev DB, `migrate diff`: "No difference detected" | `prisma/schema.prisma:20-23,40` · `prisma/migrations/20260908000000_email_attach/migration.sql` |
| E2 | `identity.emailStart({ email })`: zod `trim().toLowerCase().email().max(254)`; 3 per address per hour, 10 per identity per day → `TOO_MANY_REQUESTS`; the identity's live code is marked used, the new one is `randomInt(0, 1e6)` padded to 6, SHA-256 at rest, 10 min; the mail goes out; `{ sentTo, expiresAt }`. A send failure is `INTERNAL_SERVER_ERROR "mail not sent"` with the provider's message in the log, never the address | `identity.ts:252-270` |
| E3 | `identity.emailVerify({ code })`: the newest unused code of `ctx.identity`, `timingSafeEqual` on the hashes, `attempts++` on a miss (5 → "code dead", then "no live code"), expired → "code expired". Hit: address on another identity with `emailVerifiedAt` → `mergeIdentities(current → owner)`, `dex_id` cookie to the owner, `{ adopted: true, merged, email }`; else `email` + `emailVerifiedAt` on the current one, `{ adopted: false, email }`. The code is marked used either way | `identity.ts:272-295` |
| E4 | `server/mail.ts` with `resend` 6.26: from `Standkreis Atlas <atlas@standkreis.de>`, no reply-to, no tags, no headers; subject and body de/en from `ctx.locale`, plain text plus a minimal HTML with the code at 40 px and the "Wenn du das nicht warst" line. `RESEND_API_KEY` required in production (`env.ts` strict), optional in dev: unset → `[mail] code for <address>: ……` on the server log, no network. `RESEND_BASE_URL` is read by the SDK itself | `mail.ts:9,26,41` · `env.ts:22-23,37-38` |
| E5 | `identity.emailRemove()`: `email` and `emailVerifiedAt` null, the identity's codes deleted, in one transaction | `identity.ts:297-303` |
| E6 | `IdentityEmail.tsx`: `EmailForm` (address → "Code schicken" → the six-digit field with `inputmode=numeric autocomplete=one-time-code pattern=[0-9]*`, "Andere Adresse", "Neuer Code in N s" counting down from 60, then "Neuen Code") and `SignInSheet` (🔑 Mit Passkey · ✉️ Mit E-Mail). The identity card: `synced = !me.anonymous` where `anonymous = devices === 0 && !email`; title "Per E-Mail verknüpft" when there is no passkey; the row under the passkey buttons with states `none / attaching / verified` (`data-testid=email-row`, `data-state`); "Entfernen" asks once more when the address is the last recovery path. The sign-in line opens the sheet; both paths end in `emailVerified()` which shows the passkey path's `identity.adopted` string with the counts | `IdentityEmail.tsx:31,74,106` · `IdentitySettings.tsx:85-94,119,142-172,204` |
| E7 | `me.email` (verified only), `data.export.identity.email`; `displayName` in the export once a passkey **or** a verified address exists; `Identity` delete cascades `EmailCode` | `identity.ts:85` · `data.ts:32-33,62` |
| E8 | Nudge body: "Ein Passkey oder eine E-Mail nimmt deine Sichtungen mit auf andere Geräte. Kein Konto, kein Passwort." `shouldOfferPasskey` also stays quiet once an address is verified | `de.json:458` · `webauthn.ts:79-81` |
| i18n | `settings.email` (22 keys), `settings.identity.{syncedTitleEmail, syncedBodyEmail, signInTitle, signInHint, signInPasskey, signInEmail}`, `localBody` and `signIn` reworded; `messages.test` green | `de.json`, `en.json` |

The migration:

```sql
ALTER TABLE "Identity" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL, "identityId" TEXT NOT NULL, "email" TEXT NOT NULL, "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "locale" TEXT NOT NULL,
    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id"));
CREATE INDEX "EmailCode_identityId_idx" ON "EmailCode"("identityId");
CREATE INDEX "EmailCode_email_createdAt_idx" ON "EmailCode"("email", "createdAt");
ALTER TABLE "EmailCode" ADD CONSTRAINT "EmailCode_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## 🗳️ Decisions the handoff left open

| Question | Decision | Why |
| --- | --- | --- |
| "No click or open tracking" | Nothing per mail: Resend has **no per-mail flag**, tracking is a domain setting. The payload carries no `tags`, `headers`, `reply_to`; the HTML has 0 `<a>` and 0 `<img>`, so there is nothing to rewrite or to load | Verified on the stub payload (C1). The owner switches tracking off on the domain at Resend (doubt 1) |
| Device already has a verified address and verifies one that belongs to another identity | Refused: `PRECONDITION_FAILED "remove your address first"` | §🔒 "a verified address is never moved between identities silently": the merge deletes the device's identity and its address with it. Unreachable from the UI (a verified address hides the sign-in line); the server holds the rule anyway |
| `me.anonymous` | `devices === 0 && !email` | The only reader is the settings card (`synced`). Export's `displayName` rule follows |
| "Auf N Geräten" with an address and no passkey | Title "Per E-Mail verknüpft", body "Kein Passkey. Der Code aus der Mail holt deine Sichtungen auf ein neues Gerät.", the "Gerät entfernen" button hidden | "Auf 0 Geräten" is wrong; `syncedBody` names a passkey that is not there |
| "Entfernen" on the last recovery path | Two taps: the first shows the warning and "Trotzdem entfernen" | The handoff: "allowed always; the UI warns" |
| Resend after 60 s | The same `emailStart`: a new code, the old one marked used, the same throttle | One live code per identity is the rule; the resend has no exemption from 3 per hour |
| Address change while "sent" | "Andere Adresse" goes back to the field; the live code stays live until the next send or 10 min | A code the user never sees cannot be used by anyone who does not have the inbox |
| The nudge after a verified address | Not shown (`shouldOfferPasskey`) | One recovery path exists; the handoff asks for no second nudge |
| The 6th correct attempt after 5 misses | "no live code" (the dead code is not found any more), not "code dead" | The client maps both to "Fordere einen neuen Code an" |
| Wrong shape (`12ab`) | zod refuses before the DB is touched | No attempt is spent on garbage |
| Unverified `email` on another row | Cleared before the address is set here | No writer existed before 0020; a guard for the unique index, not a path |

## 🧪 Checks

Production build (`next build` + `next start -p 3002`, dev DB, `PHOTO_DIR=/tmp/m7b-photos`, `RESEND_API_KEY=<stub>`, `RESEND_BASE_URL=http://localhost:3107`), headless Chrome 390 × 844 over CDP with **two browser contexts** (device A, device B), the Resend stub inside `app/scripts/m7b/email.mjs run` recording every `POST /emails`. Addresses `<check>-<run>@example.com` (run `hq5mp9`), so a rerun within the hour is not throttled. Shots in [`0020-shots/`](0020-shots/).

### C1 · attach on device A

| Step | Result | Shot |
| --- | --- | --- |
| Card before | `local`, body "… solange du keinen Passkey und keine E-Mail verknüpfst.", sign-in line "Schon einen Passkey oder eine E-Mail? Hier anmelden.", row `none` | `c1-row-de` |
| Address → send | stub 0 → **1** mail; "Code geschickt an a-hq5mp9@example.com.", "Neuer Code in 60 s", code field `inputmode=numeric autocomplete=one-time-code` | `c1-address-de`, `c1-sent-de` |
| The mail | from **`Standkreis Atlas <atlas@standkreis.de>`**, to the address, subject "······ ist dein Code für den Atlas", `Authorization: Bearer`, UA `resend-node:6.26.0`, text + html, code in both, `reply_to` null, `tags` null, `headers` null, **0 tracking keys, 0 `<a>`, 0 `<img>`**; text "Dein Code für den Standkreis Atlas: / ······ / Er gilt zehn Minuten. / Wenn du das nicht warst, ignoriere diese Mail." | stub payload |
| Code from the stub → Bestätigen | row `verified` with the address, card `synced`, title "Per E-Mail verknüpft", notice "Verknüpft mit a-hq5mp9@example.com."; `me.email` and `data.export.identity.email` = the address | `c1-verified-de` |

### C2 · sign-in on device B with the same address

A: 2 sightings, B: 3 (one on the same taxon as A's at a different instant). Two identities.

| Step | Result | Shot |
| --- | --- | --- |
| The sign-in line | sheet "Anmelden" with 🔑 Mit Passkey · ✉️ Mit E-Mail | `c2-sheet-de` |
| ✉️ → address → send | stub 1 → **2** mails, same lines as C1 | `c2-address-de`, `c2-sent-de` |
| Code → Bestätigen | sheet closed in **260 ms**; notice **"Verknüpft. 3 Sichtungen von hier übernommen."**; cookie `d6d02204…` (B) → **`80a97057…` = A**; B's row gone from `Identity`; `data.export` under A: **5** sightings (2 + 3), seen by B's browser: 5; the diary shows 4 days | `c2-adopted-de`, `c2-journal-de` |

### C3 · wrong ×5, expired

Identity C over tRPC.

| Try | Answer |
| --- | --- |
| wrong × 4 | `400 "wrong code"` × 4 |
| wrong × 5 | `400 "code dead"`; row `attempts = 5, usedAt null` |
| 6th, the correct code | `400 "no live code"` |
| new code, `expiresAt` set to now − 1 s in the DB, the correct code | `400 "code expired"` |
| `12ab` | `400` zod `invalid_format` |
| `me.email` afterwards | null |

### C4 · throttle

Identity D, one address, four `emailStart` in a row: **sent · sent · sent · `TOO_MANY_REQUESTS "too many codes, try again later"`**; stub +3; `EmailCode` rows for the address 3, live (unused) 1. Another identity, the same address → refused (per address); another address → sent. Client line: "Zu viele Codes in kurzer Zeit. Versuch es in einer Stunde noch einmal."

### C5 · without the key

`node scripts/m7b/email.mjs c5` spawns both servers with `RESEND_API_KEY=` (empty) and the stub URL set.

| Server | Result |
| --- | --- |
| `next dev -p 3013` | `emailStart` 200; log **`[mail] code for c5-v90waz@example.com: ······`**; stub **0** mails; the logged code verifies (`adopted: false`) |
| `next start -p 3014` | **exit 1** within the second: `[env] refusing to start, the environment is incomplete:` / `RESEND_API_KEY: empty` |

### C6 · delete

| | `EmailCode` of A | `Identity` with the address |
| --- | --- | --- |
| before | 1 | 1 |
| `data.delete` (confirm: 0 devices · 5 sightings; then done) | **0** | **0** |

A fresh identity E then verifies the same address: `adopted: false`, `me.email` set. `emailRemove` → `me.email` null, 0 codes.

### C7 · `npm run check`, the migration on a copy

`npm run check` exit **0**: typecheck, lint (0 errors, 5 pre-existing warnings in `scripts/id-probe`, `m8b`, `steckbrief-probe`), **46 tests** in 8 files, export build (`/tmp/m7b-check.log`).

Copy: `pg_dump dex | psql dex_copy` in the container, then `DROP TABLE "EmailCode"`, `DROP COLUMN "emailVerifiedAt"`, the migration row deleted, then `migrate deploy` against `dex_copy`.

| Table | Before | After |
| --- | --- | --- |
| Identity | 114 | 114 |
| Sighting · Study · Passkey · Filter | 122 · 24 · 1 · 84 | same |
| Taxon · Asset | 28 714 · 1 926 | same |
| EmailCode | (dropped) | table back, 0 rows, 3 indexes (`pkey`, `identityId`, `email_createdAt`) |

`dex_copy` dropped afterwards. The nine mails of the run never left the machine.

## ❓ Doubts for the owner

1. **Tracking is a domain setting at Resend**, not a per-mail flag. Once `standkreis.de` is added: Domains → standkreis.de → switch **open tracking and click tracking off**. Until then the mail cannot promise "no tracking" on the SDK side, only "nothing to track" (no link, no image).
2. **Deliverability is unproven** (C8): DKIM, SPF and the return path at Resend, plus the EU region for the domain. A first mail to the owner's own address from atlas.standkreis.de is the check; also whether Gmail and iCloud put a bare-code mail from a new domain in spam.
3. **The magic link stays out**, as the handoff decided. On the desktop the code is six keystrokes; on iOS Mail offers the code above the keyboard through `autocomplete=one-time-code` when the mail carries a recognisable code (Apple's heuristic wants the code near words like "Code"; the subject starts with it).
4. **A shared inbox is an identity**: whoever reads the mail can adopt the identity. Same as any email login; the throttle (3 per hour per address) and 5 tries per code are the only brakes. No notification to the old address when a new device adopts.
5. **`Identity.email` is unique**: `emailVerify` clears the address from a row that carries it unverified before setting it here. No such row can exist today; the branch is a guard.
6. **`anonymous` changed meaning** (`devices === 0 && !email`). Only the settings card reads it; anything persisted in `dex.queries` from before shows "local" until `me` refetches (60 s or focus).
7. **Throttle in the UI**: after three codes the user reads "Versuch es in einer Stunde noch einmal." The counter only comes from the server's refusal; the 60-second "Neuer Code" wait is client-side and shorter than the real budget.
8. **The dev log line prints the address** (`[mail] code for <address>: ……`), guarded by `!isProduction` as the handoff asks. On the Mac only.
9. **No cleanup of `EmailCode` rows**: used and expired rows stay (a few per attach). The sweep could delete rows older than a day; not built, the table stays small.
10. **The passkey path's `identity.adopted` notice** is reused word for word; it names sightings only, not studies (`studiesMerged` is in the payload).

## 🔀 For the merge

Single session on `main`, nothing parallel. Files: `prisma/schema.prisma` + `prisma/migrations/20260908000000_email_attach/` (runs in Vercel's build on the next deploy; additive, no backfill), `src/server/{env,mail,webauthn}.ts`, `src/server/routers/{identity,data}.ts`, `src/components/{IdentityEmail (new),IdentitySettings}.tsx`, `src/i18n/{de,en}.json`, `scripts/m7b/email.mjs`, `package.json` (+ `resend`), `.env.example`, `docs/DEPLOY.md`, `docs/ROADMAP.md`. **Before the push**: `RESEND_API_KEY` must be set in Vercel for Production and Preview (the owner says it is), or the production server refuses to start. C8 is the owner's.
