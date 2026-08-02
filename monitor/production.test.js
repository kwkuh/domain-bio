// production.test.js — wrap the production monitoring as node:test cases.
//
// This is DELIBERATELY kept out of test/ (which is pure unit tests: offline, milliseconds).
// What lives here reaches the internet and can go red for reasons outside the code: a dead
// nameserver, a wrong delegation, or a measuring network that is itself dirty.
//   npm test             -> unit tests only (node --test test/)
//   npm run monitor:test -> this file     (node --test monitor/)
//
// Why two interfaces (the `check.js` CLI and these tests)? The content is identical — the
// cases are shared from lib/cases.js. Only the wrapper differs: the CLI reads well for a
// human and has a dedicated exit code for "invalid result", while the test form suits CI
// that wants a TAP report per check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periksaJalur, pesanJalurKotor } from './lib/path.js';
import { temukanNameserver, ROOT } from './lib/discover.js';
import { susunKasus, susunKasusZone } from './lib/cases.js';
import { tanya, TYPE, ambil } from './lib/dns.js';

const ZONES = (process.env.ZONES || 'a-i.sh,a-i.st').split(',').map((s) => s.trim()).filter(Boolean);
const TRANSPORTS = (process.env.TRANSPORTS || 'udp,tcp').split(',').map((s) => s.trim()).filter(Boolean);
const TIMEOUT = Number(process.env.TIMEOUT || 4000);

async function adaIpv6() {
  if (process.env.IPV6 === 'off') return false;
  if (process.env.IPV6 === 'on') return true;
  for (const r of ROOT) {
    try { await tanya({ ip: r.v6, name: '.', type: TYPE.NS, timeout: 2500 }); return true; }
    catch { /* lanjut */ }
  }
  return false;
}

const pakaiIpv6 = await adaIpv6();
const jalur = await periksaJalur({ transports: TRANSPORTS, ipv6: pakaiIpv6, timeout: 3000 });

// Pemeriksaan nomor satu: alat ukurnya sendiri. Kalau jalurnya dibajak, ini MERAH —
// not skipped silently. Red here means "the result is invalid", not "the ns is down",
// dan pesannya bilang begitu.
test('the measuring network path is clean (port 53 not hijacked)', () => {
  assert.ok(jalur.tepercaya, pesanJalurKotor(jalur));
});

if (jalur.tepercaya) {
  if (!pakaiIpv6) test('outbound IPv6 is available', { skip: 'the measuring network has no IPv6 route out (common on GitHub-hosted runners) — v6 checks skipped' }, () => {});

  for (const zone of ZONES) {
    const delegasi = await temukanNameserver(zone, {
      mode: process.env.TEMUKAN || 'auto',
      ipv6: pakaiIpv6,
      timeout: TIMEOUT,
      daftarEnv: process.env.NAMESERVERS || null,
    });

    const apexPerServer = {};

    for (const srv of delegasi.server) {
      for (const transport of TRANSPORTS) {
        const label = `${zone} · ${srv.nama} ${srv.ip} ${transport}/${srv.keluarga}`;
        test(label, async (t) => {
          for (const k of susunKasus({ zone, ip: srv.ip, nama: srv.nama, transport, timeout: TIMEOUT })) {
            await t.test(k.judul, async () => { await k.jalankan(); });
          }
          try {
            const ns = await tanya({ ip: srv.ip, name: zone, type: TYPE.NS, transport, timeout: TIMEOUT });
            const soa = await tanya({ ip: srv.ip, name: zone, type: TYPE.SOA, transport, timeout: TIMEOUT });
            apexPerServer[label] = {
              ns: ambil(ns.answers, TYPE.NS).map((rr) => rr.data),
              serial: ambil(soa.answers, TYPE.SOA)[0]?.data.serial ?? null,
            };
          } catch { /* udah kecatat di subtest di atas */ }
        });
      }
    }

    test(`${zone} · konsistensi armada`, async (t) => {
      for (const k of susunKasusZone({ zone, delegasi, apexPerServer })) {
        await t.test(k.judul, async () => { await k.jalankan(); });
      }
    });
  }
}
