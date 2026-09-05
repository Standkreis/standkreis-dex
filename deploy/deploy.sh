#!/usr/bin/env bash
# Update the running stack on the VM: pull main, rebuild, restart what changed, drop dangling images.
# Run from anywhere: `~/standkreis-dex/deploy/deploy.sh`. deploy.yml calls it over SSH.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose -f deploy/compose.yml up -d --build
docker image prune -f
docker compose -f deploy/compose.yml ps
