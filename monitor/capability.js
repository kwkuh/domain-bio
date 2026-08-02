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

/** Root server itu titik uji paling netral: pasti hidup, pasti otoritatif, ada v4 & v6. */
async function coba(kunci, fn) {
  const t0 = Date.now();
  try { const catatan = await fn(); return { kunci, bisa: true, ms: Date.now() - t0, catatan }; }
  catch (e) { return { kunci, bisa: false, ms: Date.now() - t0, catatan: e.message }; }
}

const hasil = { waktu: new Date().toISOString(), uji: [] };

hasil.uji.push(await coba('udp53 keluar (IPv4)', async () => {
  const j = await tanya({ ip: ROOT[0].v4, name: '.', type: TYPE.NS, transport: 'udp', timeout: 4000 });
  return `${ROOT[0].nama} jawab ${j.answers.length} NS`;
}));

hasil.uji.push(await coba('tcp53 keluar (IPv4)', async () => {
  const j = await tanya({ ip: ROOT[0].v4, name: '.', type: TYPE.NS, transport: 'tcp', timeout: 5000 });
  return `${ROOT[0].nama} jawab ${j.answers.length} NS`;
}));

hasil.uji.push(await coba('udp53 keluar (IPv6)', async () => {
  const j = await tanya({ ip: ROOT[0].v6, name: '.', type: TYPE.NS, transport: 'udp', timeout: 4000 });
  return `${ROOT[0].nama} jawab ${j.answers.length} NS`;
}));

hasil.uji.push(await coba('DoH (HTTPS 443)', async () => {
  const r = await fetch('https://cloudflare-dns.com/dns-query?name=example.com&type=A', { headers: { accept: 'application/dns-json' } });
  return `HTTP ${r.status}`;
}));

const bajakUdp = await periksaTransport({ transport: 'udp', keluarga: 'v4', timeout: 3000 });
const bajakTcp = await periksaTransport({ transport: 'tcp', keluarga: 'v4', timeout: 3000 });
hasil.pembajakan = { udp: bajakUdp, tcp: bajakTcp };
hasil.layakMengukur = !bajakUdp.dibajak && !bajakTcp.dibajak && hasil.uji[0].bisa;

if (json) {
  console.log(JSON.stringify(hasil, null, 2));
} else {
  console.log('kemampuan jaringan pengukur:');
  for (const u of hasil.uji) console.log(`  ${u.bisa ? 'BISA  ' : 'GAGAL '} ${u.kunci.padEnd(24)} ${u.catatan} (${u.ms}ms)`);
  for (const [nama, p] of Object.entries(hasil.pembajakan)) {
    console.log(`  ${p.dibajak ? 'BAJAK ' : 'BERSIH'} port 53 ${nama}${p.dibajak ? ` — ${p.bukti.length}/${p.diuji} IP lubang hitam menjawab` : ''}`);
  }
  console.log(`\n  fit to measure: ${hasil.layakMengukur ? 'YES' : 'NO'}`);
}
process.exit(hasil.layakMengukur ? 0 : 1);
