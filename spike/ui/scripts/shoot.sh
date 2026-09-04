#!/usr/bin/env bash
# Headless Chrome → PNG → WebP (≤ 500 KB). Usage: shoot.sh <route> <name> [w] [h] [scrollY]
# Chrome headless refuses windows narrower than ~500 px, so the app renders inside a fixed-size iframe and we crop.
set -euo pipefail
ROUTE=$1; NAME=$2; W=${3:-390}; H=${4:-844}; Y=${5:-0}
OUT="$(cd "$(dirname "$0")/../../.." && pwd)/docs/adr/0001-standkreis-dex-the-first-walk"
TMP=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=$((W > 500 ? W : 500)),${H} --virtual-time-budget=10000 --screenshot="$TMP/shot.png" \
  "http://localhost:5199/frame.html?route=${ROUTE}&w=${W}&h=${H}&y=${Y}" 2>/dev/null
magick "$TMP/shot.png" -crop $((W*2))x$((H*2))+0+0 +repage "$TMP/crop.png"
cwebp -quiet -q 82 "$TMP/crop.png" -o "$OUT/0002-${NAME}.webp"
ls -la "$OUT/0002-${NAME}.webp" | awk '{print $5, $9}'
