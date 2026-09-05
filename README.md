# 🌿 standkreis-dex

A **personal collection layer over open biodiversity data**: see what could be living around you right now, learn about it before you meet it, and fill the silhouette when you do. Web first, phone later, free forever.

| 🗺️ Roadmap | 📄 Spec | 📖 Glossary | 💬 Records | 🖼️ Reference screenshots |
| --- | --- | --- | --- | --- |
| [docs/ROADMAP.md](docs/ROADMAP.md) | [docs/specs/0001](docs/specs/0001-standkreis-dex-the-first-walk.md) | [docs/GLOSSARY.md](docs/GLOSSARY.md) | [0001](docs/records/0001-standkreis-dex-the-first-walk.md) · [0002](docs/records/0002-etl-the-plausible-set.md) | [docs/adr/0001-…/](docs/adr/0001-standkreis-dex-the-first-walk/) with the [UI findings](docs/handoffs/0002-ui-exploration-findings.md) |

## 🏗️ Stack

Next.js App Router · TypeScript strict · Tailwind 4 · next-intl (`de`, `en`) · tRPC · Prisma · Postgres. PWA now, Capacitor wrap of the static export later.

## 🚀 Run

```bash
cd app && npm install          # generates the Prisma client (postinstall)
npm run db:up                  # Postgres in Docker on :5433
npm run db:migrate && npm run db:seed
npm run dev                    # http://localhost:3000 → /de or /en
```

| Script | Does |
| --- | --- |
| `npm run check` | typecheck · lint · test · static export build. The CI job |
| `npm run build:export` | `out/` for any file server or Capacitor. The tRPC route stays out; set `NEXT_PUBLIC_API_URL` |
| `node scripts/shot.mjs /de dark out.png` | 390 × 844 screenshot in a colour scheme, via headless Chrome |

Production: push to `main` deploys to [atlas.standkreis.de](https://atlas.standkreis.de) on Vercel with Neon and Blob, see [docs/DEPLOY.md](docs/DEPLOY.md).

## 🗂️ Layout

```
app/
  prisma/            schema, migrations, seed (one dev identity)
  src/app/[locale]/  the four tabs; (root)/ picks the browser language once
  src/app/api/trpc/  the only API, cookie-bound anonymous identity
  src/components/    Shell (bottom bar), Marks (icons, badges), LogSheet
  src/i18n/          routing, de.json, en.json — keys not sentences, de is the source of truth
  src/styles/        tokens.css — 15 colours, light default, dark follows the system
  src/server/        Prisma client, tRPC context and routers
docs/                research, record, spec, handoffs, screenshots
```
