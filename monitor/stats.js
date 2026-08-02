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
// Pakai:
//   node monitor/stats.js /var/log/open-domain/query.jsonl
//   node monitor/stats.js --json berkas.jsonl >> stats/harian.jsonl
//   zcat query.jsonl.1.gz | node monitor/stats.js -

import fs from 'node:fs';
import readline from 'node:readline';
import { parseName } from '../src/parse.js';

const ZONES = (process.env.ZONES || 'a-i.st,a-i.sh').split(',').map((s) => s.trim());

/** Kelompokkan nama jadi BENTUK, bukan disimpan apa adanya. */
function bentuk(nama) {
  const p = parseName(nama, ZONES);
  if (p.kind === 'refused') return 'luar-zone';
  if (p.kind === 'apex') return 'apex';
  if (p.kind === 'nxdomain') return 'bukan-ip';

  const sub = String(nama).toLowerCase().replace(/\.$/, '');
  const zone = p.zone;
  const label = sub.slice(0, -(zone.length + 1)).split('.');
  const akhir = label[label.length - 1];
  const berprefix = label.length > (p.kind === 'AAAA' || /^[0-9a-f]{8}$/.test(akhir) || akhir.includes('-') ? 1 : 4);

  let b;
  if (p.kind === 'AAAA') b = 'ipv6-bergaris';
  else if (/^[0-9a-f]{8}$/.test(akhir)) b = 'heksa';
  else if (akhir.includes('-')) b = 'ipv4-bergaris';
  else b = 'ipv4-bertitik';
  return berprefix ? `${b}+prefix` : b;
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
 * Only one thing deserves to be called usage: a name that actually produces
 * sebuah ALAMAT. Sisanya dipisahkan supaya tidak pernah ikut membesarkan angka.
 */
function golongan(nama, p) {
  const n = String(nama).toLowerCase().replace(/\.$/, '');
  if (p.kind === 'refused') return 'ditolak';        // di luar zone kita
  if (p.kind === 'apex') return 'infrastruktur';     // SOA/NS zone
  // ns1.a-i.sh / ns2.a-i.st — resolver mencari alamat nameserver, bukan pemakaian.
  if (/^ns\d+\./.test(n)) return 'infrastruktur';
  if (p.kind === 'A' || p.kind === 'AAAA') return 'layanan';
  return 'derau';                                     // dalam zone tapi bukan IP
}

export function ringkas(baris, { abaikanBlok = [] } = {}) {
  const t = {
    query: 0, rusak: 0, diabaikan: 0,
    golongan: { layanan: 0, infrastruktur: 0, derau: 0, ditolak: 0 },
    zone: {}, tipe: {}, rcode: {}, transport: {}, keluarga: { v4: 0, v6: 0 },
    bentuk: {}, hasil: {}, jam: {},
  };
  // The Sets are TEMPORARY and then discarded; only their sizes leave this function.
  const resolver = new Set();
  const tujuan = new Set();

  for (const l of baris) {
    // Baris kosong bukan data rusak — itu bukan apa-apa. Menghitungnya sebagai
    // rusak bikin angka "rusak" kehilangan arti, padahal gunanya justru sebagai
    // a marker for records that are genuinely broken and worth looking at.
    if (!String(l).trim()) continue;
    let e;
    try { e = JSON.parse(l); } catch { t.rusak++; continue; }
    if (!e || !e.n) { t.rusak++; continue; }
    // Our own test traffic is discarded before counting. Without this,
    // the monitor running every 30 minutes would make the graph climb forever with
    // no real user at all — a graph that goes up because we are looking at it.
    if (abaikanBlok.length && abaikanBlok.some((b) => String(e.c).startsWith(b))) { t.diabaikan++; continue; }
    t.query++;

    const naik = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };
    const p = parseName(e.n, ZONES);
    const g = golongan(e.n, p);
    naik(t.golongan, g);
    naik(t.zone, p.zone || '(luar)');
    naik(t.tipe, String(e.q));
    naik(t.rcode, e.r === null || e.r === undefined ? 'dibatasi' : String(e.r));
    naik(t.transport, e.x || '?');
    naik(t.keluarga, String(e.c).startsWith('v6:') || String(e.c).includes(':') ? 'v6' : 'v4');
    naik(t.hasil, e.h || '?');
    if (e.t) naik(t.jam, String(e.t).slice(0, 13)); // YYYY-MM-DDTHH

    if (g === 'layanan') {
      naik(t.bentuk, bentuk(e.n));
      tujuan.add(p.ip);
      if (e.c) resolver.add(e.c);
    }
  }

  const jamTersibuk = Object.entries(t.jam).sort((a, b) => b[1] - a[1])[0];
  return {
    query: t.query,
    rusak: t.rusak,
    diabaikan: t.diabaikan,
    golongan: t.golongan,
    // The count of distinct TARGET ADDRESSES, taken ONLY from the "layanan" class.
    // This is the most honest growth signal we have: how many different machines
    // are actually being addressed. Not a user count — one person can own many
    // machines, and one machine can serve many people.
    tujuanUnik: tujuan.size,
    // Resolver blocks forwarding service requests. This number rising means the
    // sebarannya melebar, BUKAN penggunanya bertambah.
    blokResolver: resolver.size,
    zone: t.zone, tipe: t.tipe, rcode: t.rcode, transport: t.transport,
    keluarga: t.keluarga, bentuk: t.bentuk, hasil: t.hasil,
    jamTersibuk: jamTersibuk ? { jam: jamTersibuk[0], query: jamTersibuk[1] } : null,
  };
}

// ---- CLI ----
const argv = process.argv.slice(2);
const modeJson = argv.includes('--json');
const berkas = argv.filter((a) => !a.startsWith('--'));

if (import.meta.url === `file://${process.argv[1]}`) {
  const sumber = berkas[0] === '-' || berkas.length === 0
    ? process.stdin
    : fs.createReadStream(berkas[0]);
  const rl = readline.createInterface({ input: sumber, crlfDelay: Infinity });
  const baris = [];
  for await (const l of rl) if (l.trim()) baris.push(l);
  // ABAIKAN_BLOK="5.78.141.,2a01:4ff:1f0" — block prefixes discarded before counting.
  const abaikanBlok = (process.env.ABAIKAN_BLOK || '').split(',').map((s) => s.trim()).filter(Boolean);
  const r = ringkas(baris, { abaikanBlok });

  if (modeJson) {
    console.log(JSON.stringify({ tanggal: new Date().toISOString().slice(0, 10), ...r }));
  } else {
    const tabel = (judul, obj) => {
      const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
      console.log(`\n  ${judul}`);
      for (const [k, v] of Object.entries(obj).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k.padEnd(20)} ${String(v).padStart(8)}  ${(100 * v / total).toFixed(1).padStart(5)}%`);
      }
    };
    const g = r.golongan;
    console.log(`\n  ${r.query.toLocaleString()} queries recorded` +
      (r.diabaikan ? `, ${r.diabaikan.toLocaleString()} discarded (our own traffic)` : '') +
      (r.rusak ? `, ${r.rusak} malformed lines` : ''));
    console.log('');
    console.log(`  ${String(g.layanan).padStart(8)}  SERVICE USED      names that actually produced an address`);
    console.log(`  ${String(g.infrastruktur).padStart(8)}  infrastructure    resolvers looking up ns1/ns2 & apex — plumbing, not usage`);
    console.log(`  ${String(g.derau).padStart(8)}  noise             in-zone names that are not IPs — scanners & typos`);
    console.log(`  ${String(g.ditolak).padStart(8)}  refused           outside our zones — we are not an open resolver`);
    console.log('');
    console.log(`  ${r.tujuanUnik.toLocaleString()} distinct target addresses   <- this is the growth signal`);
    console.log(`  ${r.blokResolver.toLocaleString()} resolver blocks            <- reach, NOT a user count`);
    if (r.jamTersibuk) console.log(`  busiest hour: ${r.jamTersibuk.jam} (${r.jamTersibuk.query} queries)`);
    tabel('by zone', r.zone);
    tabel('name form (service class only)', r.bentuk);
    tabel('by query type', r.tipe);
    tabel('by outcome', r.hasil);
    tabel('by transport', r.transport);
    tabel('by address family', r.keluarga);
    console.log('\n  Note: what asks is a RESOLVER, not a user, and a TTL of 3600 hides');
    console.log('  most of the usage. The numbers above are REQUESTS, not people. No name and');
    console.log('  no address leaves this function.\n');
  }
}
