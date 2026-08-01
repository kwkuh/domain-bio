// produksi.test.js — bungkus monitoring produksi jadi tes node:test.
//
// Ini SENGAJA dipisah dari test/ (yang isinya unit test murni, offline, milidetik).
// Yang di sini nembak internet dan bisa merah gara-gara hal di luar kode: nameserver mati,
// delegasi salah, atau jaringan pengukurnya sendiri yang bau.
//   npm test          -> unit test doang  (node --test test/)
//   npm run monitor:test -> file ini      (node --test monitor/)
//
// Kenapa dua antarmuka (CLI `periksa.js` dan tes ini)? Isinya sama persis — kasusnya
// dipakai bareng dari lib/kasus.js. Bedanya cuma pembungkus: CLI enak dibaca manusia dan
// punya kode keluar khusus buat "hasil tidak sah", sedangkan bentuk tes enak buat CI yang
// pengin laporan TAP per-pemeriksaan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periksaJalur, pesanJalurKotor } from './lib/jalur.js';
import { temukanNameserver, ROOT } from './lib/temukan.js';
import { susunKasus, susunKasusZone } from './lib/kasus.js';
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
// bukan di-skip diam-diam. Merah di sini artinya "hasilnya nggak sah", bukan "ns mati",
// dan pesannya bilang begitu.
test('jalur jaringan pengukur bersih (port 53 nggak dibajak)', () => {
  assert.ok(jalur.tepercaya, pesanJalurKotor(jalur));
});

if (jalur.tepercaya) {
  if (!pakaiIpv6) test('IPv6 keluar tersedia', { skip: 'jaringan pengukur nggak punya jalan keluar IPv6 (umum di runner GitHub-hosted) — pemeriksaan v6 dilewati' }, () => {});

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
