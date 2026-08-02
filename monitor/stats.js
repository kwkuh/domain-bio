#!/usr/bin/env node
// stats.js — reduce the query log to NUMBERS, then discard the rest.
//
// 🚨 The limit that decides everything, and it must be stated before any number:
//
// What asks an authoritative nameserver is a RESOLVER, not a user. Measured in
// production: the top askers are Google, Microsoft and Quad9. Add a TTL of 3600
// seconds, and one query from Google serves who-knows-how-many people for an hour.
//
// So the two things people usually want CANNOT be answered from here — not because
// we refuse, but because the data genuinely does not exist:
//   - "who is using it"        -> all that is visible is resolvers
//   - "how many people use it" -> caching hides most of it
//
// What can be answered honestly: how many REQUESTS, for how many distinct TARGET
// ADDRESSES, in what form, and over which transport. That is enough to answer
// "is this growing" without knowing anything about anyone.
//
// The output is deliberately numbers only: no names, no addresses, no blocks. The
// daily file may be kept forever precisely because it cannot point at anyone —
// which is what makes deleting the raw log after 14 days safe.
//
// Usage:
//   node monitor/stats.js /var/log/open-domain/query.jsonl
//   node monitor/stats.js --json file.jsonl >> stats/daily.jsonl
//   zcat query.jsonl.1.gz | node monitor/stats.js -

import fs from 'node:fs';
import readline from 'node:readline';
import { parseName } from '../src/parse.js';

const ZONES = (process.env.ZONES || 'a-i.st,a-i.sh').split(',').map((s) => s.trim());

/** Group a name into its FORM, rather than storing it as-is. */
function nameForm(name) {
  const p = parseName(name, ZONES);
  if (p.kind === 'refused') return 'outside-zone';
  if (p.kind === 'apex') return 'apex';
  if (p.kind === 'nxdomain') return 'not-ip';

  const sub = String(name).toLowerCase().replace(/\.$/, '');
  const zone = p.zone;
  const label = sub.slice(0, -(zone.length + 1)).split('.');
  const last = label[label.length - 1];
  const hasPrefix = label.length > (p.kind === 'AAAA' || /^[0-9a-f]{8}$/.test(last) || last.includes('-') ? 1 : 4);

  let form;
  if (p.kind === 'AAAA') form = 'ipv6-dashed';
  else if (/^[0-9a-f]{8}$/.test(last)) form = 'hex';
  else if (last.includes('-')) form = 'ipv4-dashed';
  else form = 'ipv4-dotted';
  return hasPrefix ? `${form}+prefix` : form;
}

/**
 * Classify every query. This is the most important part of this whole file.
 *
 * 🚨 Adding up every query and calling it "usage" is self-deception. Measured on
 * the first day in production: of 3,772 queries, 1,378 were only resolvers looking
 * up our ns1/ns2 addresses — that is DNS plumbing working, not a single person
 * using the service. Hundreds more were our own testing, and the rest were
 * scanners guessing names like "login" and "fileshare".
 *
 * Only one thing deserves to be called usage: a name that actually produces an
 * ADDRESS. Everything else is separated out so it can never inflate the number.
 */
function classify(name, p) {
  const n = String(name).toLowerCase().replace(/\.$/, '');
  if (p.kind === 'refused') return 'refused';            // outside our zones
  if (p.kind === 'apex') return 'infrastructure';        // the zone's own SOA/NS
  // ns1.a-i.sh / ns2.a-i.st — a resolver looking up a nameserver address, not usage.
  if (/^ns\d+\./.test(n)) return 'infrastructure';
  if (p.kind === 'A' || p.kind === 'AAAA') return 'service';
  return 'noise';                                         // in-zone but not an IP
}

export function summarise(lines, { ignoreBlocks = [] } = {}) {
  const t = {
    queries: 0, malformed: 0, ignored: 0,
    classes: { service: 0, infrastructure: 0, noise: 0, refused: 0 },
    zones: {}, types: {}, rcodes: {}, transports: {}, families: { v4: 0, v6: 0 },
    forms: {}, outcomes: {}, hours: {},
  };
  // The Sets are TEMPORARY and then discarded; only their sizes leave this function.
  const resolvers = new Set();
  const targets = new Set();

  for (const l of lines) {
    // A blank line is not broken data — it is nothing at all. Counting it as broken
    // makes the "malformed" number meaningless, when its whole purpose is to be a
    // marker for records that are genuinely broken and worth looking at.
    if (!String(l).trim()) continue;
    let e;
    try { e = JSON.parse(l); } catch { t.malformed++; continue; }
    if (!e || !e.n) { t.malformed++; continue; }
    // Our own test traffic is discarded before counting. Without this, the monitor
    // running every 30 minutes would make the graph climb forever with no real user
    // at all — a graph that goes up because we are looking at it.
    if (ignoreBlocks.length && ignoreBlocks.some((b) => String(e.c).startsWith(b))) { t.ignored++; continue; }
    t.queries++;

    const bump = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };
    const p = parseName(e.n, ZONES);
    const c = classify(e.n, p);
    bump(t.classes, c);
    bump(t.zones, p.zone || '(outside)');
    bump(t.types, String(e.q));
    bump(t.rcodes, e.r === null || e.r === undefined ? 'limited' : String(e.r));
    bump(t.transports, e.x || '?');
    bump(t.families, String(e.c).startsWith('v6:') || String(e.c).includes(':') ? 'v6' : 'v4');
    bump(t.outcomes, e.h || '?');
    if (e.t) bump(t.hours, String(e.t).slice(0, 13)); // YYYY-MM-DDTHH

    if (c === 'service') {
      bump(t.forms, nameForm(e.n));
      targets.add(p.ip);
      if (e.c) resolvers.add(e.c);
    }
  }

  const busiest = Object.entries(t.hours).sort((a, b) => b[1] - a[1])[0];
  return {
    queries: t.queries,
    malformed: t.malformed,
    ignored: t.ignored,
    classes: t.classes,
    // The count of distinct TARGET ADDRESSES, taken ONLY from the "service" class.
    // This is the most honest growth signal we have: how many different machines
    // are actually being addressed. Not a user count — one person can own many
    // machines, and one machine can serve many people.
    distinctTargets: targets.size,
    // Resolver blocks forwarding service requests. This number rising means the
    // reach is widening, NOT that there are more users.
    resolverBlocks: resolvers.size,
    zones: t.zones, types: t.types, rcodes: t.rcodes, transports: t.transports,
    families: t.families, forms: t.forms, outcomes: t.outcomes,
    busiestHour: busiest ? { hour: busiest[0], queries: busiest[1] } : null,
  };
}

// ---- CLI ----
const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const files = argv.filter((a) => !a.startsWith('--'));

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = files[0] === '-' || files.length === 0
    ? process.stdin
    : fs.createReadStream(files[0]);
  const rl = readline.createInterface({ input: source, crlfDelay: Infinity });
  const lines = [];
  for await (const l of rl) if (l.trim()) lines.push(l);
  // IGNORE_BLOCKS="5.78.141.,2a01:4ff:1f0" — block prefixes discarded before counting.
  const ignoreBlocks = (process.env.IGNORE_BLOCKS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const r = summarise(lines, { ignoreBlocks });

  if (jsonMode) {
    console.log(JSON.stringify({ date: new Date().toISOString().slice(0, 10), ...r }));
  } else {
    const table = (title, obj) => {
      const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
      console.log(`\n  ${title}`);
      for (const [k, v] of Object.entries(obj).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k.padEnd(20)} ${String(v).padStart(8)}  ${(100 * v / total).toFixed(1).padStart(5)}%`);
      }
    };
    const g = r.classes;
    console.log(`\n  ${r.queries.toLocaleString()} queries recorded` +
      (r.ignored ? `, ${r.ignored.toLocaleString()} discarded (our own traffic)` : '') +
      (r.malformed ? `, ${r.malformed} malformed lines` : ''));
    console.log('');
    console.log(`  ${String(g.service).padStart(8)}  SERVICE USED      names that actually produced an address`);
    console.log(`  ${String(g.infrastructure).padStart(8)}  infrastructure    resolvers looking up ns1/ns2 & apex — plumbing, not usage`);
    console.log(`  ${String(g.noise).padStart(8)}  noise             in-zone names that are not IPs — scanners & typos`);
    console.log(`  ${String(g.refused).padStart(8)}  refused           outside our zones — we are not an open resolver`);
    console.log('');
    console.log(`  ${r.distinctTargets.toLocaleString()} distinct target addresses   <- this is the growth signal`);
    console.log(`  ${r.resolverBlocks.toLocaleString()} resolver blocks            <- reach, NOT a user count`);
    if (r.busiestHour) console.log(`  busiest hour: ${r.busiestHour.hour} (${r.busiestHour.queries} queries)`);
    table('by zone', r.zones);
    table('name form (service class only)', r.forms);
    table('by query type', r.types);
    table('by outcome', r.outcomes);
    table('by transport', r.transports);
    table('by address family', r.families);
    console.log('\n  Note: what asks is a RESOLVER, not a user, and a TTL of 3600 hides');
    console.log('  most of the usage. The numbers above are REQUESTS, not people. No name and');
    console.log('  no address leaves this function.\n');
  }
}
