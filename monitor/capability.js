#!/usr/bin/env node
// capability.js — a short report: is this machine fit to measure DNS at all?
//
// Used in both places:
//   - in CI, as the first step, so the assumption "the runner may send UDP 53 outbound"
//     is proven on every run rather than simply trusted;
//   - on a laptop, to understand why monitoring refuses to run.
//
// What it reports: outbound UDP/53, outbound TCP/53, outbound IPv6, DoH (HTTPS), and
// most important of all — whether port 53 is being hijacked.
//
//   node monitor/capability.js
//   node monitor/capability.js --json

import { tanya, TYPE } from './lib/dns.js';
import { periksaTransport } from './lib/path.js';
import { ROOT } from './lib/discover.js';

const json = process.argv.includes('--json');

/** A root server is the most neutral probe there is: always up, always authoritative,
 *  and reachable over both IPv4 and IPv6. */
async function attempt(key, fn) {
  const t0 = Date.now();
  try { const note = await fn(); return { key, ok: true, ms: Date.now() - t0, note }; }
  catch (e) { return { key, ok: false, ms: Date.now() - t0, note: e.message }; }
}

const result = { time: new Date().toISOString(), tests: [] };

result.tests.push(await attempt('udp53 outbound (IPv4)', async () => {
  const r = await tanya({ ip: ROOT[0].v4, name: '.', type: TYPE.NS, transport: 'udp', timeout: 4000 });
  return `${ROOT[0].nama} answered with ${r.answers.length} NS`;
}));

result.tests.push(await attempt('tcp53 outbound (IPv4)', async () => {
  const r = await tanya({ ip: ROOT[0].v4, name: '.', type: TYPE.NS, transport: 'tcp', timeout: 5000 });
  return `${ROOT[0].nama} answered with ${r.answers.length} NS`;
}));

result.tests.push(await attempt('udp53 outbound (IPv6)', async () => {
  const r = await tanya({ ip: ROOT[0].v6, name: '.', type: TYPE.NS, transport: 'udp', timeout: 4000 });
  return `${ROOT[0].nama} answered with ${r.answers.length} NS`;
}));

result.tests.push(await attempt('DoH (HTTPS 443)', async () => {
  const r = await fetch('https://cloudflare-dns.com/dns-query?name=example.com&type=A', { headers: { accept: 'application/dns-json' } });
  return `HTTP ${r.status}`;
}));

const hijackUdp = await periksaTransport({ transport: 'udp', keluarga: 'v4', timeout: 3000 });
const hijackTcp = await periksaTransport({ transport: 'tcp', keluarga: 'v4', timeout: 3000 });
result.hijacking = { udp: hijackUdp, tcp: hijackTcp };
result.fitToMeasure = !hijackUdp.dibajak && !hijackTcp.dibajak && result.tests[0].ok;

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('capability of the measuring network:');
  for (const t of result.tests) console.log(`  ${t.ok ? 'YES   ' : 'NO    '} ${t.key.padEnd(24)} ${t.note} (${t.ms}ms)`);
  for (const [name, h] of Object.entries(result.hijacking)) {
    console.log(`  ${h.dibajak ? 'HIJACK' : 'CLEAN '} port 53 ${name}${h.dibajak ? ` — ${h.bukti.length}/${h.diuji} blackhole IPs answered` : ''}`);
  }
  console.log(`\n  fit to measure: ${result.fitToMeasure ? 'YES' : 'NO'}`);
}
process.exit(result.fitToMeasure ? 0 : 1);
