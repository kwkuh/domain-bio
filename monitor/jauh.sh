#!/usr/bin/env bash
# jauh.sh — pinjam mata server lain buat ngukur.
#
# Kepakai kalau jaringan tempat kita duduk membajak port 53 (jaringan seluler Indonesia
# sering begitu) — laptop nggak bisa dipercaya jadi alat ukur, tapi VPS-nya bisa.
# Skrip ini nyalin monitor + src ke host SSH, jalanin di sana, hasilnya balik ke layar kita.
#
#   ./monitor/jauh.sh aicoid
#   ./monitor/jauh.sh aicoid --json > hasil.json
#   NAMESERVERS="ns2.open-domain.com@203.0.113.9" ./monitor/jauh.sh kula
#
# Syarat di sisi server: node >= 18 dan port 53 keluar nggak dibajak (dicek sendiri sama
# preflight-nya; kalau server itu ternyata juga kotor, hasilnya tetap ditolak).

set -euo pipefail

HOST="${1:-}"
if [ -z "$HOST" ]; then
  echo "pakai: $0 <host-ssh> [--json]" >&2
  exit 2
fi
shift || true

AKAR="$(cd "$(dirname "$0")/.." && pwd)"
TUJUAN="/tmp/open-domain-monitor-$$"

# Cuma kirim yang perlu: monitor/ butuh src/wire.js + src/parse.js.
rsync -az --delete \
  -e "ssh -o BatchMode=yes" \
  "$AKAR/src" "$AKAR/monitor" "$AKAR/package.json" \
  "$HOST:$TUJUAN/"

# Teruskan env yang relevan, jalankan, lalu bersihin.
ssh -o BatchMode=yes "$HOST" \
  "cd '$TUJUAN' && \
   ZONES='${ZONES:-a-i.sh,a-i.st}' \
   NAMESERVERS='${NAMESERVERS:-}' \
   TEMUKAN='${TEMUKAN:-auto}' \
   TRANSPORTS='${TRANSPORTS:-udp,tcp}' \
   IPV6='${IPV6:-auto}' \
   TIMEOUT='${TIMEOUT:-4000}' \
   NO_COLOR=1 \
   node monitor/periksa.js $*; \
   KODE=\$?; rm -rf '$TUJUAN'; exit \$KODE"
