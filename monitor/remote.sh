#!/usr/bin/env bash
# remote.sh — borrow another server's eyes to take the measurement.
#
# Needed when the network we are sitting on hijacks port 53 (Indonesian mobile networks
# often do) — the laptop cannot be trusted as an instrument, but a VPS can.
# This script copies monitor/ and src/ to an SSH host, runs there, and brings the result back.
#
#   ./monitor/remote.sh aicoid
#   ./monitor/remote.sh aicoid --json > hasil.json
#   NAMESERVERS="ns2.open-domain.com@203.0.113.9" ./monitor/remote.sh kula
#
# Requirements on the far side: node >= 18 and outbound port 53 that is not hijacked (its own
# preflight checks that; if that server turns out to be dirty too, the result is still refused).

set -euo pipefail

HOST="${1:-}"
if [ -z "$HOST" ]; then
  echo "usage: $0 <ssh-host> [--json]" >&2
  exit 2
fi
shift || true

AKAR="$(cd "$(dirname "$0")/.." && pwd)"
TUJUAN="/tmp/open-domain-monitor-$$"

# Send only what is needed: monitor/ depends on src/wire.js and src/parse.js.
rsync -az --delete \
  -e "ssh -o BatchMode=yes" \
  "$AKAR/src" "$AKAR/monitor" "$AKAR/package.json" \
  "$HOST:$TUJUAN/"

# Forward the relevant environment, run, then clean up.
ssh -o BatchMode=yes "$HOST" \
  "cd '$TUJUAN' && \
   ZONES='${ZONES:-a-i.sh,a-i.st}' \
   NAMESERVERS='${NAMESERVERS:-}' \
   TEMUKAN='${TEMUKAN:-auto}' \
   TRANSPORTS='${TRANSPORTS:-udp,tcp}' \
   IPV6='${IPV6:-auto}' \
   TIMEOUT='${TIMEOUT:-4000}' \
   NO_COLOR=1 \
   node monitor/check.js $*; \
   KODE=\$?; rm -rf '$TUJUAN'; exit \$KODE"
