# ✉️ [0020] Handoff — email attach (M7b)

> Build handoff. Child of [ROADMAP](../ROADMAP.md) M7b and [findings 0006](0006-etl-and-identity-findings.md) (identity, passkeys, "owner's call 2026-09-05: Resend"). The passkey flow in `app/src/server/routers/identity.ts:161-234` is the model: a second way to adopt an identity, same merge, same cookie.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §⚖️ · [Record 0001](../records/0001-first-walk.md) Q3 (one identity, many devices) · [DEPLOY](../DEPLOY.md) | 1 session on `main` |

---

## 🎯 Why

A passkey is the only way to carry an identity to a second phone. People who do not trust Face ID, or who lose the phone, have nothing. An email address is the second recovery path the spec promised.

## 🧭 Decision taken here: a code, not a link

The roadmap says "magic link". On iOS the installed PWA and Safari have **separate cookie jars**: a link tapped in Mail opens in Safari with a fresh anonymous identity, not in the app that asked. A six-digit code typed into the app has no such problem and needs no `/link` route.

| | Code | Link |
| --- | --- | --- |
| Works from the installed PWA | ✅ | ❌ lands in Safari |
| Desktop convenience | type 6 digits | one tap |
| Attack surface | brute force, throttled | token in URL, mail-client prefetch |

Build the code. The link is a doubt for the findings, not a feature.

## 📐 What to build

| # | Piece | Detail |
| --- | --- | --- |
| E1 | **Schema** | `Identity.emailVerifiedAt DateTime?` next to the reserved `email`. New `EmailCode { id, identityId → Identity (Cascade), email, codeHash, attempts Int 0, expiresAt, usedAt?, createdAt, locale }`, index on `(identityId)` and `(email, createdAt)`. Hand-written `app/prisma/migrations/20260908000000_email_attach/migration.sql`; `prisma migrate deploy` locally, the Vercel build in prod. Never `migrate dev`, `db push`, `reset` |
| E2 | **`identity.emailStart({ email })`** | Lower-cases and trims, zod email. Throttle: 3 codes per address per hour, 10 per identity per day, one live code per identity (the new one invalidates the old). Code = 6 digits from `crypto.randomInt`, stored as SHA-256, 10 min. Sends the mail (E4). Returns `{ sentTo, expiresAt }`. Never reveals whether the address is known |
| E3 | **`identity.emailVerify({ code })`** | Finds the live code of `ctx.identity`, constant-time compare, `attempts++` (5 → code dead). On success: **if the address belongs to another identity → `mergeIdentities(current → owner)`, set the `dex_id` cookie to the owner, return `{ adopted: true, merged }`**, exactly like `authenticateVerify`. Else set `email`, `emailVerifiedAt` on the current identity, `{ adopted: false }`. Mark the code used |
| E4 | **Mail** | `app/src/server/mail.ts` with the `resend` npm package. From `Standkreis Atlas <atlas@standkreis.de>`, no reply-to, **no click or open tracking**. Subject and body in the request locale (`ctx.locale`, de/en), plain text plus a minimal HTML with the code in large type and "Wenn du das nicht warst, ignoriere diese Mail." `RESEND_API_KEY` **required in production** (`env.ts`, server refuses to start), optional in dev: unset → the code is printed to the server log as `[mail] code for <address>: ……` and nothing is sent. `RESEND_BASE_URL` honoured by the SDK for a stub in checks; documented in `.env.example` like `ANTHROPIC_BASE_URL` |
| E5 | **`identity.emailRemove()`** | Clears `email`, `emailVerifiedAt`, deletes the identity's codes. Allowed always; the UI warns when it is the last recovery path |
| E6 | **Settings UI** | `IdentitySettings.tsx`: a row under the passkey buttons. States: none → "E-Mail verknüpfen"; entering → address field + send; sent → 6-digit field with `inputmode=numeric autocomplete=one-time-code`, "Neuen Code" after 60 s, the address shown; verified → address + "Entfernen". `synced` = passkeys > 0 **or** email verified; `localBody` says "solange du keinen Passkey und keine E-Mail verknüpfst". The sign-in line becomes "Schon einen Passkey oder eine E-Mail? Hier anmelden." → a small `Sheet` with the two options; the email option runs E2+E3 and shows the `adopted` notice with the merge counts, same string as the passkey path |
| E7 | **`me` and export** | `me` returns `email` (verified only). The export includes it; delete cascades `EmailCode` |
| E8 | **Nudge** | `PasskeyNudge.tsx` text names the email as the alternative in one clause; no second nudge |

## 🔒 Rules

- Email is PII (spec §⚖️): only on the identity, in the export and in the mail. Never in a URL, never logged in production (the dev log line is guarded by `NODE_ENV !== 'production'`).
- The code is hashed at rest; the plain code exists only in the mail and the dev log line.
- Adoption merges the **device's** identity into the address's identity, never the other way; a verified address is never moved between identities silently.
- Key names only in docs and findings: `RESEND_API_KEY` lives in `app/.env.local` and Vercel (Production + Preview). Already set by the owner. Never read or print `.env*` values.

## 🧪 Checks

Script `app/scripts/m7b/email.mjs`: starts a Resend stub (`RESEND_BASE_URL`) that records `POST /emails`, drives two browser contexts over CDP against the production build (`next start -p 3002`), shots to `docs/handoffs/0020-shots/`.

| # | Check | Evidence |
| --- | --- | --- |
| C1 | Attach on device A: send, the stub holds one mail with a 6-digit code, from `atlas@standkreis.de`, no tracking flags; enter it; row shows the address; `me.email` set | stub payload, shot |
| C2 | Sign-in on device B (fresh context) with the same address: B is merged into A's identity, cookie changed, notice with the counts, B's sightings visible under A | counts before/after, shot |
| C3 | Wrong code ×5 → dead, 6th correct attempt refused; expired code refused | error strings |
| C4 | Throttle: 4th code for one address within an hour → refused with a friendly line, the first three sent | stub count |
| C5 | Dev without `RESEND_API_KEY`: the log line, no network; prod build without it: refuses to start naming the variable | log excerpt |
| C6 | Delete identity → `EmailCode` rows gone, the address free to be verified again | SQL counts |
| C7 | `npm run check` green; migration rehearsed on a `pg_dump` copy | exit code |
| C8 | Owner: a real mail to their own address from the live deployment, on the Simulator and the phone | shot, owner |

## ⬇️ Output

`docs/handoffs/0020-email-attach-findings.md` (decisions, C1–C8 with evidence, doubts, "For the merge"), `app/.env.example` and `docs/DEPLOY.md` rows for the two variables, `docs/ROADMAP.md` M7b line. Commit on `main`, do not push.

## 🚫 Not in this build

Magic link · receiving mail · newsletters · email as a login for anything but adoption · changing an address (remove, then attach).
