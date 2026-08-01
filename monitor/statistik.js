#!/usr/bin/env node
// statistik.js — ringkas catatan query jadi ANGKA, lalu buang sisanya.
//
// 🚨 Batas yang menentukan segalanya, dan harus disebut sebelum angka mana pun:
//
// Yang bertanya ke nameserver otoritatif adalah RESOLVER, bukan pengguna. Terukur
// di produksi: penanya terbanyak adalah Google, Microsoft, dan Quad9. Ditambah TTL
// 3600 detik, satu query dari Google melayani entah berapa orang selama satu jam.
//
// Akibatnya, dua hal yang biasanya orang mau TIDAK BISA dijawab dari sini, dan
// bukan karena kita menolak — karena datanya memang tidak ada:
//   - "siapa saja yang memakai"      -> yang terlihat cuma resolver
//   - "berapa orang yang memakai"    -> cache menyembunyikan sebagian besar
//
// Yang bisa dijawab jujur: berapa banyak PERMINTAAN, untuk berapa banyak ALAMAT
// TUJUAN yang berbeda, dalam bentuk apa, dan lewat jalur apa. Itu cukup untuk
// menjawab "apakah ini tumbuh" tanpa perlu tahu apa pun tentang siapa pun.
//
// Keluarannya sengaja cuma bilangan: nol nama, nol alamat, nol blok. Berkas harian
// ini boleh disimpan selamanya justru karena isinya tidak bisa menunjuk siapa pun —
// itu yang bikin catatan mentahnya aman dihapus setelah 14 hari.
//
// Pakai:
//   node monitor/statistik.js /var/log/open-domain/query.jsonl
//   node monitor/statistik.js --json berkas.jsonl >> stats/harian.jsonl
//   zcat query.jsonl.1.gz | node monitor/statistik.js -

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
 * Golongkan tiap query. Ini bagian terpenting seluruh berkas ini.
 *
 * 🚨 Menjumlahkan semua query lalu menyebutnya "pemakaian" adalah menipu diri
 * sendiri. Terukur di hari pertama produksi: dari 3.772 query, 1.378 di antaranya
 * cuma resolver mencari alamat ns1/ns2 kita — itu pipa DNS bekerja, bukan seorang
 * pun memakai layanan. Ratusan lagi adalah pengujian kami sendiri, dan sisanya
 * pemindai yang menebak nama seperti "login" dan "fileshare".
 *
 * Yang layak disebut pemakaian cuma satu: nama yang benar-benar menghasilkan
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
  // Set dipakai SEMENTARA lalu dibuang; yang keluar cuma jumlahnya.
  const resolver = new Set();
  const tujuan = new Set();

  for (const l of baris) {
    // Baris kosong bukan data rusak — itu bukan apa-apa. Menghitungnya sebagai
    // rusak bikin angka "rusak" kehilangan arti, padahal gunanya justru sebagai
    // penanda catatan yang benar-benar bermasalah dan perlu dilihat.
    if (!String(l).trim()) continue;
    let e;
    try { e = JSON.parse(l); } catch { t.rusak++; continue; }
    if (!e || !e.n) { t.rusak++; continue; }
    // Lalu lintas pengujian kami sendiri dibuang sebelum dihitung. Kalau tidak,
    // monitor yang jalan tiap 30 menit akan membuat grafik naik terus tanpa satu
    // pun pengguna nyata — grafik yang naik karena kita menatapnya.
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
    // Jumlah ALAMAT TUJUAN berbeda, dihitung HANYA dari golongan "layanan".
    // Ini penanda pertumbuhan paling jujur yang kita punya: berapa banyak mesin
    // berbeda yang benar-benar dialamati. Bukan jumlah pengguna — satu orang bisa
    // punya banyak mesin, dan satu mesin bisa dipakai banyak orang.
    tujuanUnik: tujuan.size,
    // Blok resolver yang meneruskan permintaan layanan. Naiknya angka ini berarti
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
  // ABAIKAN_BLOK="5.78.141.,2a01:4ff:1f0" — awalan blok yang dibuang sebelum dihitung.
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
    console.log(`\n  ${r.query.toLocaleString()} query dicatat` +
      (r.diabaikan ? `, ${r.diabaikan.toLocaleString()} dibuang (lalu lintas kita sendiri)` : '') +
      (r.rusak ? `, ${r.rusak} baris rusak` : ''));
    console.log('');
    console.log(`  ${String(g.layanan).padStart(8)}  LAYANAN DIPAKAI   nama yang benar-benar menghasilkan alamat`);
    console.log(`  ${String(g.infrastruktur).padStart(8)}  infrastruktur     resolver mencari ns1/ns2 & apex — pipa DNS, bukan pemakaian`);
    console.log(`  ${String(g.derau).padStart(8)}  derau             nama dalam zone tapi bukan IP — pemindai & salah ketik`);
    console.log(`  ${String(g.ditolak).padStart(8)}  ditolak           di luar zone kita — kita bukan open resolver`);
    console.log('');
    console.log(`  ${r.tujuanUnik.toLocaleString()} alamat tujuan berbeda   <- ini penanda pertumbuhannya`);
    console.log(`  ${r.blokResolver.toLocaleString()} blok resolver          <- sebaran, BUKAN jumlah pengguna`);
    if (r.jamTersibuk) console.log(`  jam tersibuk: ${r.jamTersibuk.jam} (${r.jamTersibuk.query} query)`);
    tabel('per zone', r.zone);
    tabel('bentuk nama (golongan layanan saja)', r.bentuk);
    tabel('per tipe query', r.tipe);
    tabel('per hasil', r.hasil);
    tabel('per transport', r.transport);
    tabel('per keluarga alamat', r.keluarga);
    console.log('\n  Catatan: yang bertanya adalah RESOLVER, bukan pengguna, dan TTL 3600');
    console.log('  menyembunyikan sebagian besar pemakaian. Angka di atas adalah PERMINTAAN,');
    console.log('  bukan orang. Tidak ada nama atau alamat yang ikut keluar dari sini.\n');
  }
}
