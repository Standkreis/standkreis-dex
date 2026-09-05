# 🌿 standkreis-dex · rules for agents

Personal atlas over open biodiversity data. Next.js 16 App Router · tRPC 11 · Prisma 7 · Postgres · next-intl (`de`, `en`) · PWA with a hand-written service worker. Owner: Sven Reiser.

## 🗺️ Where things are

| Need | Read |
| --- | --- |
| What to build next, status of every milestone | [docs/ROADMAP.md](docs/ROADMAP.md) |
| The product contract | [docs/specs/0001](docs/specs/0001-standkreis-dex-the-first-walk.md), [docs/GLOSSARY.md](docs/GLOSSARY.md) |
| How a milestone is run | `docs/handoffs/NNNN-*.md` (the brief) and `NNNN-*-findings.md` (what was built, evidence, doubts); shots in `NNNN-shots/` |
| Live stack, env variables, how to deploy and fill the DB | [docs/DEPLOY.md](docs/DEPLOY.md) |
| ETL commands | [app/etl/README.md](app/etl/README.md) |
| Next.js 16 differences | `app/AGENTS.md` → `node_modules/next/dist/docs/` |

## 🚫 Never

- `prisma migrate reset`, `prisma db push`, `prisma migrate dev`. **The schema is frozen**; migrations run only in Vercel's build command.
- New regions from the UI until the owner says the loop is closed.
- Edit files outside your track's list when running as a parallel agent. Shared files are named in the handoff; merge them by hand.
- Push. The owner says "push".
- Read or print values from `.env*` files or `vercel env pull` output. Names and lengths only.

## ✅ Always

- Work in `app/`. `npm run check` (typecheck, lint, 30+ tests, export build) must be green before a merge.
- Test data in the dev DB (`postgresql://dex:dex@localhost:5433/dex`, Docker `standkreis-dex-db-1`) is fine. Never point local dev at Neon.
- Offline and worker behaviour is tested on the **production build** (`npm run build` + `next start -p 3002`), never on `next dev`. The desktop app's Browser pane blocks service workers; use headless Chrome over CDP (`app/scripts/m8a/offline.mjs`) or the iOS Simulator.
- Parallel milestones: two worktrees from `main` (`../standkreis-dex-<track>`), Track A merges first, B rebases. Verify no conflict markers before `git rebase --continue`.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Findings docs: decisions the handoff left open, every check with evidence and numbers, doubts for the owner, a "For the merge" note.

## ✍️ Style

Short and precise. Tables and code blocks over prose. Emojis on headings and table headers. Reference code as `path:line`. Question the owner's assumptions when they are wrong; do not default to yes.
