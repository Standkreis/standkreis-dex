# 🚀 deploy — one VM, one domain ([handoff 0010](../docs/handoffs/0010-deploy.md))

Ubuntu 24.04 on a Hetzner CX22, Docker Compose, Caddy for https. One evening, top to bottom. Every command runs on the VM over SSH unless the row says "Mac".

| File | Does |
| --- | --- |
| `compose.yml` | `db` (Postgres 17, loopback port 5432 only) · `migrate` (one shot, `prisma migrate deploy`) · `app` (`node server.js`, photos in the `photos` volume at `/data/photos`) · `caddy` (80/443, Let's Encrypt) |
| `Caddyfile` | `{$DOMAIN} { encode; reverse_proxy app:3000 }`. Nothing else |
| `.env.example` | The four variables. Copy to `.env` |
| `deploy.sh` | `git pull --ff-only`, rebuild, restart what changed, prune |
| `backup.sh` | Nightly dump + photos tar to `/var/backups/dex`, 14 days, optional `rsync` |
| `../app/Dockerfile` | `deps` → `migrate` / `builder` → `runner` (standalone Next, ~300 MB) |

## 🖥️ 1 · The box

Prerequisites: the server exists (CX22, Ubuntu 24.04, your SSH key), `A`/`AAAA` records of the apex point at it (owner's todo 1–4 in the handoff).

```bash
ssh root@<ipv4>
apt-get update && apt-get -y upgrade
apt-get -y install ca-certificates curl git ufw
# Docker, the official way
curl -fsSL https://get.docker.com | sh
# a user that is not root
adduser --disabled-password --gecos '' dex && usermod -aG docker dex
mkdir -p /home/dex/.ssh && cp ~/.ssh/authorized_keys /home/dex/.ssh/ && chown -R dex:dex /home/dex/.ssh
# firewall: ssh, http, https
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable
mkdir -p /var/backups/dex && chown dex:dex /var/backups/dex
```

From here on as `dex`: `ssh dex@<ipv4>`.

## 📦 2 · The app

```bash
git clone https://github.com/Standkreis/standkreis-dex.git ~/standkreis-dex
cd ~/standkreis-dex
cp deploy/.env.example deploy/.env
nano deploy/.env        # DOMAIN, POSTGRES_PASSWORD, WEBAUTHN_SECRET (openssl rand -hex 32)
docker compose -f deploy/compose.yml up -d --build   # ~3 min on a CX22 the first time
docker compose -f deploy/compose.yml ps               # db healthy, migrate exited (0), app healthy, caddy up
docker compose -f deploy/compose.yml logs migrate     # "2 migrations found … applied"
curl -sS https://$DOMAIN/api/health                   # {"ok":true,"buildId":…,"sweepAt":…}
```

Caddy gets the certificate from Let's Encrypt on the first request; if DNS is not there yet, it retries on its own (`logs caddy`).

| Variable | In `.env` | Reaches |
| --- | --- | --- |
| `DB_BIND` | optional, default `127.0.0.1:5432` | the host side of the `db` port (the ETL tunnel) |
| `DOMAIN` | the apex, `standkreis.de` | Caddy's site, `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN=https://$DOMAIN` |
| `POSTGRES_PASSWORD` | anything long | `db` and the `DATABASE_URL` of `migrate` and `app` |
| `WEBAUTHN_SECRET` | `openssl rand -hex 32` | `app` |
| `BACKUP_TARGET` | optional, `user@host:path/` | `backup.sh` only |

## 🗄️ 3 · Fill the database

Regions and species come from the ETL on your Mac over an SSH tunnel; sightings and identities never travel. Steps and commands: [`app/etl/README.md` §🚀](../app/etl/README.md). The database listens on the VM's loopback only (`127.0.0.1:5432`), so on the Mac `ssh -L 5434:localhost:5432 dex@<ipv4>` puts it on `localhost:5434`, and `DATABASE_URL=postgresql://dex:<POSTGRES_PASSWORD>@localhost:5434/dex` is what the ETL runs with.

## 🔁 4 · Update

```bash
~/standkreis-dex/deploy/deploy.sh
```

Pulls `main`, rebuilds the image (layers cached: a code-only change is ~1–2 min), runs pending migrations, restarts `app` only when its image changed. Or press "Run workflow" on the `deploy` action in GitHub once the three secrets are set (`DEPLOY_HOST`, `DEPLOY_USER=dex`, `DEPLOY_SSH_KEY`: a private key whose public half is in `/home/dex/.ssh/authorized_keys`, made for this on the Mac with `ssh-keygen -t ed25519 -f ~/.ssh/dex-deploy -N ''`).

## 💾 5 · Backups

```bash
crontab -e
# every night at 03:15, log kept
15 3 * * * /home/dex/standkreis-dex/deploy/backup.sh >> /home/dex/backup.log 2>&1
```

`backup.sh` writes `db-<stamp>.dump` (`pg_dump -Fc`) and `photos-<stamp>.tgz` to `/var/backups/dex`, deletes files older than 14 days, and `rsync`s the folder to `BACKUP_TARGET` when set. A Hetzner Storage Box (BX11): `BACKUP_TARGET=u123456@u123456.your-storagebox.de:dex/` after `ssh-copy-id -p 23 u123456@u123456.your-storagebox.de` and, for port 23, a `~/.ssh/config` entry with `Port 23` for that host.

Run it once by hand now and read `ls -lh /var/backups/dex`.

## ♻️ Restore

From a fresh stack (`up -d` done, `migrate` exited 0) with the two files at hand:

```bash
cd ~/standkreis-dex
docker compose -f deploy/compose.yml stop app
docker compose -f deploy/compose.yml exec -T db pg_restore -U dex -d dex --clean --if-exists --no-owner < /var/backups/dex/db-<stamp>.dump
docker compose -f deploy/compose.yml start app
docker compose -f deploy/compose.yml exec -T app tar xz -C /data/photos < /var/backups/dex/photos-<stamp>.tgz
```

`pg_restore --clean` drops and recreates every table the dump holds, `_prisma_migrations` included, so the schema and its history come back as they were.

## 🔧 Handy

| Want | Type |
| --- | --- |
| Logs | `docker compose -f deploy/compose.yml logs -f app` (or `caddy`, `db`) |
| A psql shell | `docker compose -f deploy/compose.yml exec db psql -U dex dex` |
| Restart the app | `docker compose -f deploy/compose.yml restart app` |
| Everything down, data kept | `docker compose -f deploy/compose.yml down` |
| Everything down, **data gone** | `docker compose -f deploy/compose.yml down -v` (never on the VM without a backup in hand) |
| Disk | `docker system df`; `deploy.sh` prunes dangling images after each build |
