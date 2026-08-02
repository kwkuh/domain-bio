#!/bin/sh
# Reduce yesterday's query log to NUMBERS and keep them forever.
# Deployed to /usr/local/bin/open-domain-stats-daily and run from cron once a day.
#
# The raw log is deleted after 14 days because it concerns people. This summary does
# not: no names, no addresses, no blocks — only counts. Precisely because it cannot
# point at anyone, it may be kept without limit, so a year of trend survives long after
# the daily logs behind it are gone. See monitor/stats.js and PRIVACY.md.
set -e

YESTERDAY=$(date -u -d yesterday +%Y-%m-%d)

# logrotate (cron.daily, ~06:25) has already rotated the file, so query.jsonl.1 holds a
# complete day. delaycompress means it is not gzipped yet, but handle both.
SOURCE=/var/log/open-domain/query.jsonl.1
[ -f "$SOURCE.gz" ] && SOURCE="$SOURCE.gz"
[ -f "$SOURCE" ] || exit 0

OUT=/var/lib/open-domain/stats/daily.jsonl
mkdir -p "$(dirname "$OUT")"

if [ "${SOURCE%.gz}" != "$SOURCE" ]; then READ="zcat $SOURCE"; else READ="cat $SOURCE"; fi

# IGNORE_BLOCKS drops our own monitoring traffic before counting (set it in the cron line).
# The date in the summary is stamped to the day the log covers, not the day this ran.
$READ | node /opt/open-domain/monitor/stats.js --json - \
  | sed "s/\"date\":\"[^\"]*\"/\"date\":\"$YESTERDAY\"/" >> "$OUT"
