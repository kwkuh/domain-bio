// temukan.js — cari sendiri siapa saja nameserver produksi sebuah zone.
//
// Prinsipnya: daftar nameserver JANGAN ditulis di dalam kode tes. Begitu ns2 (dan ns3)
// nyala di benua lain, tes harus langsung ikut mengujinya tanpa satu baris pun diubah.
//
// Sumber kebenaran = **delegasi di zona induk**, bukan NS di apex zone kita sendiri.
// Alasannya: NS di apex itu jawaban dari server yang lagi kita uji — kalau errors konfigurasi,
// dia bisa "mengaku" apa saja. Yang menentukan siapa yang berhak menjawab dunia adalah
// record NS di induk (buat a-i.sh: server TLD .sh). Jadi kita jalan turun dari root:
//     root  ->  server .sh  ->  delegasi a-i.sh (+ glue A/AAAA)
// Selisih antara delegasi induk dan NS apex justru errors satu hal yang kita periksa.
//
// Tiga mode, dipilih otomatis, bisa dipaksa lewat env TEMUKAN=induk|doh|env:
//   induk : jalan turun dari root pakai DNS asli (paling benar, butuh port 53 keluar)
//   doh   : tanya resolver publik lewat HTTPS (buat jaringan yang port 53-nya diblok;
//           cukup buat NEMU nameserver, nggak dipakai buat MENILAI nameserver)
//   env   : daftar manual dari env NAMESERVERS — dipakai waktu ns baru belum didelegasikan
//
// Format env NAMESERVERS: "nama@ip" dipisah koma, nama boleh dilewat.
//   NAMESERVERS="ns1.open-domain.com@167.235.234.220,ns2.open-domain.com@203.0.113.9"

import { tanya, TYPE, ambil } from './dns.js';

// Root hints (data publik IANA). Cukup beberapa; kita pakai yang pertama merespons.
export const ROOT = [
  { nama: 'a.root-servers.net', v4: '198.41.0.4', v6: '2001:503:ba3e::2:30' },
  { nama: 'f.root-servers.net', v4: '192.5.5.241', v6: '2001:500:2f::f' },
  { nama: 'k.root-servers.net', v4: '193.0.14.129', v6: '2001:7fd::1' },
  { nama: 'l.root-servers.net', v4: '199.7.83.42', v6: '2001:500:9f::42' },
];

const bersih = (s) => String(s).toLowerCase().replace(/\.$/, '');

/** Satu langkah turun: tanya NS <zone> ke satu server, ambil NS + glue-nya. */
async function satuLangkah({ ip, zone, transport, timeout }) {
  const j = await tanya({ ip, name: zone, type: TYPE.NS, transport, timeout });
  const ns = [...ambil(j.answers, TYPE.NS), ...ambil(j.authority, TYPE.NS)];
  const glue = {};
  for (const rr of [...j.additional, ...j.answers]) {
    if (rr.type === TYPE.A || rr.type === TYPE.AAAA) (glue[bersih(rr.nama)] ||= []).push(rr.data);
  }
  return { ns: ns.map((rr) => ({ pemilik: bersih(rr.nama), nama: bersih(rr.data) })), glue, aa: j.aa };
}

/**
 * Jalan turun dari root sampai ketemu delegasi buat `zone`.
 * @returns {Promise<{sumber:string, ns:string[], glue:object, jejak:string[]}>}
 */
export async function temukanDariInduk(zone, { transport = 'udp', timeout = 4000 } = {}) {
  const target = bersih(zone);
  const jejak = [];
  let kandidat = ROOT.map((r) => r.v4);
  let glueTotal = {};

  for (let langkah = 0; langkah < 6; langkah++) {
    let hasil = null;
    let ipDipakai = null;
    for (const ip of kandidat) {
      try { hasil = await satuLangkah({ ip, zone: target, transport, timeout }); ipDipakai = ip; break; }
      catch (e) { jejak.push(`${ip} gagal: ${e.message}`); }
    }
    if (!hasil) throw new Error(`nggak ada server yang bisa dihubungi di langkah ${langkah}: ${jejak.join('; ')}`);

    glueTotal = { ...glueTotal, ...hasil.glue };
    const pemilik = hasil.ns.length ? hasil.ns[0].pemilik : '(kosong)';
    jejak.push(`@${ipDipakai} -> delegasi "${pemilik}" (${hasil.ns.length} NS)`);

    // Ketemu: NS-nya dimiliki persis oleh zone yang kita cari.
    if (hasil.ns.length && hasil.ns.every((n) => n.pemilik === target)) {
      const nama = [...new Set(hasil.ns.map((n) => n.nama))].sort();
      return { sumber: 'induk', ns: nama, glue: glueTotal, jejak };
    }
    if (!hasil.ns.length) throw new Error(`langkah ${langkah}: nggak ada NS di jawaban — zone "${target}" kemungkinan belum didelegasikan`);

    // Belum sampai: turun ke server delegasi berikutnya, pakai glue kalau ada.
    const berikut = [];
    for (const n of hasil.ns) for (const ip of glueTotal[n.nama] || []) if (!ip.includes(':')) berikut.push(ip);
    if (!berikut.length) {
      // Nggak ada glue (zone induk beda TLD) — resolve nama NS-nya dari root lagi.
      for (const n of hasil.ns.slice(0, 2)) {
        const ip = await alamatNS(n.nama, { transport, timeout }).catch(() => []);
        berikut.push(...ip.filter((x) => !x.includes(':')));
      }
    }
    if (!berikut.length) throw new Error(`langkah ${langkah}: NS ketemu tapi alamatnya nggak bisa dicari (${hasil.ns.map((n) => n.nama).join(', ')})`);
    kandidat = berikut;
  }
  throw new Error(`kelamaan turun tanpa ketemu delegasi buat ${target}`);
}

/**
 * Cari A/AAAA sebuah hostname lewat jalan-turun dari root (tanpa resolver rekursif).
 *
 * 🚨 AAAA SELALU dicari, apa pun kemampuan jaringan pengukur. Pertanyaannya
 * "apakah nameserver ini PUNYA alamat IPv6", dan itu sifat layanan yang diperiksa —
 * bukan sifat jaringan kita. Query-nya sendiri jalan di atas IPv4, jadi runner
 * tanpa jalan keluar IPv6 tetap bisa menjawabnya dengan benar.
 *
 * Yang boleh dimatikan oleh ketiadaan IPv6 cuma MENEMBAK server lewat IPv6, dan
 * itu diputuskan di temukanNameserver, bukan di sini.
 */
export async function alamatNS(host, { transport = 'udp', timeout = 4000 } = {}) {
  const nama = bersih(host);
  const bagian = nama.split('.');
  // Cari zone induk terdekat yang punya delegasi, lalu tanya server-nya langsung.
  for (let i = 1; i < bagian.length; i++) {
    const zone = bagian.slice(i).join('.');
    let d;
    try { d = await temukanDariInduk(zone, { transport, timeout }); } catch { continue; }
    const ipServer = [];
    for (const n of d.ns) for (const ip of d.glue[n] || []) if (!ip.includes(':')) ipServer.push(ip);
    for (const ip of ipServer) {
      try {
        const out = [];
        const a = await tanya({ ip, name: nama, type: TYPE.A, transport, timeout });
        out.push(...ambil(a.answers, TYPE.A).map((rr) => rr.data));
        const aaaa = await tanya({ ip, name: nama, type: TYPE.AAAA, transport, timeout }).catch(() => null);
        if (aaaa) out.push(...ambil(aaaa.answers, TYPE.AAAA).map((rr) => rr.data));
        if (out.length) return out;
      } catch { /* coba server berikutnya */ }
    }
  }
  return [];
}

// ---- Mode DoH: cuma buat NEMU, bukan buat MENILAI ----

const DOH = [
  (n, t) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(n)}&type=${t}`,
  (n, t) => `https://dns.google/resolve?name=${encodeURIComponent(n)}&type=${t}`,
];

async function doh(nama, tipe) {
  let salahTerakhir;
  for (const buatUrl of DOH) {
    try {
      const r = await fetch(buatUrl(nama, tipe), { headers: { accept: 'application/dns-json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return (j.Answer || []).map((a) => bersih(a.data));
    } catch (e) { salahTerakhir = e; }
  }
  throw new Error(`semua resolver DoH gagal: ${salahTerakhir?.message}`);
}

// AAAA tetap ditanyakan walau jaringan pengukur nggak punya IPv6 — DoH jalan di
// atas HTTPS/IPv4, dan yang ditanya adalah punya-atau-nggak, bukan bisa-dijangkau.
export async function temukanDariDoH(zone) {
  const ns = [...new Set(await doh(bersih(zone), 'NS'))].sort();
  const glue = {};
  for (const n of ns) {
    const a = await doh(n, 'A').catch(() => []);
    const aaaa = await doh(n, 'AAAA').catch(() => []);
    glue[n] = [...a, ...aaaa];
  }
  return { sumber: 'doh', ns, glue, jejak: ['lewat DoH (HTTPS) — dipakai buat nemu, bukan buat menilai'] };
}

// ---- Mode env: daftar manual ----

export function temukanDariEnv(daftar) {
  const ns = [];
  const glue = {};
  for (const potong of String(daftar).split(',').map((s) => s.trim()).filter(Boolean)) {
    const [kiri, kanan] = potong.includes('@') ? potong.split('@') : [potong, null];
    const nama = bersih(kiri);
    ns.push(nama);
    if (kanan) (glue[nama] ||= []).push(kanan.trim());
  }
  return { sumber: 'env', ns: [...new Set(ns)], glue, jejak: ['dari env NAMESERVERS (dipaksa manual)'] };
}

/**
 * Pintu masuk: temukan nameserver + alamatnya buat satu zone.
 * @returns {Promise<{sumber:string, ns:string[], glue:object, jejak:string[],
 *                    server:{nama:string, ip:string, keluarga:'v4'|'v6'}[]}>}
 */
export async function temukanNameserver(zone, opsi = {}) {
  const { mode = 'auto', ipv6 = true, transport = 'udp', timeout = 4000, daftarEnv = null } = opsi;

  let hasil;
  if (daftarEnv || mode === 'env') hasil = temukanDariEnv(daftarEnv || '');
  else if (mode === 'doh') hasil = await temukanDariDoH(zone);
  else {
    try { hasil = await temukanDariInduk(zone, { transport, timeout }); }
    catch (e) {
      if (mode === 'induk') throw e;
      hasil = await temukanDariDoH(zone);
      hasil.jejak.unshift(`jalan-turun dari root gagal (${e.message}), balik ke DoH`);
    }
  }

  // Lengkapi alamat tiap NS yang belum punya glue. Ini kena ke nameserver
  // out-of-bailiwick: ns2.a-i.st nggak muncul di bagian additional delegasi
  // a-i.sh (registry cuma nge-glue nama yang ada DI DALAM zone itu), jadi
  // alamatnya harus dicari sendiri.
  for (const n of hasil.ns) {
    if (hasil.glue[n]?.length) continue;
    hasil.glue[n] = hasil.sumber === 'doh'
      ? [...(await doh(n, 'A').catch(() => [])), ...(await doh(n, 'AAAA').catch(() => []))]
      : await alamatNS(n, { transport, timeout }).catch(() => []);
  }

  // 🚨 `ipv6` cuma memutuskan siapa yang DITEMBAK, bukan apa yang DIKETAHUI.
  // glue tetap lengkap (A + AAAA) supaya pemeriksaan tingkat zone "tiap
  // nameserver punya alamat IPv6" menilai layanannya, bukan jaringan pengukur.
  //
  // Ini bukan kehati-hatian teoretis: versi sebelumnya menyembunyikan AAAA saat
  // runner-nya nggak punya IPv6, lalu melaporkan "belum ada AAAA buat ns2.a-i.st"
  // sebagai insiden — padahal AAAA-nya ada. Alat ukur yang menyalahkan benda yang
  // diukur atas keterbatasan dirinya sendiri persis yang bikin monitor nggak bisa
  // dipercaya, dan itu yang mau dihindari seluruh berkas ini.
  hasil.server = [];
  for (const n of hasil.ns) {
    for (const ip of hasil.glue[n] || []) {
      const keluarga = ip.includes(':') ? 'v6' : 'v4';
      if (keluarga === 'v6' && !ipv6) continue;
      hasil.server.push({ nama: n, ip, keluarga });
    }
  }
  return hasil;
}
