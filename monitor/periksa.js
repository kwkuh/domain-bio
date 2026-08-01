#!/usr/bin/env node
// periksa.js — monitoring eksternal Open-Domain.
//
// Nembak nameserver PRODUKSI satu per satu (bukan lewat resolver rekursif), lewat UDP dan
// TCP, IPv4 dan IPv6, lalu ngasih vonis. Dipakai di tiga tempat dengan perintah yang sama:
//   - GitHub Actions terjadwal   (npm run monitor)
//   - laptop, manual             (npm run monitor)
//   - cron di VPS                (npm run monitor -- --json)
//
// Kode keluar:
//   0  semua lulus
//   1  ada pemeriksaan yang gagal (nameserver bermasalah)
//   2  nggak bisa mulai (discovery gagal / salah konfigurasi)
//   3  HASIL TIDAK SAH — jalur jaringannya dibajak, jangan disimpulkan apa-apa
//
// Env:
//   ZONES=a-i.sh,a-i.st        zone yang dipantau
//   NAMESERVERS=nama@ip,...    paksa daftar nameserver (buat ns baru yang belum didelegasikan)
//   TEMUKAN=auto|induk|doh|env cara nemu nameserver
//   TRANSPORTS=udp,tcp         transport yang diuji
//   IPV6=auto|on|off           auto = dilewati kalau jaringannya emang nggak punya IPv6
//   TIMEOUT=4000               milidetik per query
//   ABAIKAN_PREFLIGHT=1        lanjut walau jalur kotor (buat debug doang, hasilnya nggak sah)

import fs from 'node:fs';
import { periksaJalur, pesanJalurKotor, periksaSidikJari } from './lib/jalur.js';
import { temukanNameserver, ROOT } from './lib/temukan.js';
import { susunKasus, susunKasusZone } from './lib/kasus.js';
import { tanya, TYPE, ambil } from './lib/dns.js';

const argv = process.argv.slice(2);
const punyaArg = (n) => argv.includes(n);

const opsi = {
  zones: (process.env.ZONES || 'a-i.sh,a-i.st').split(',').map((s) => s.trim()).filter(Boolean),
  nameservers: process.env.NAMESERVERS || null,
  temukan: process.env.TEMUKAN || 'auto',
  transports: (process.env.TRANSPORTS || 'udp,tcp').split(',').map((s) => s.trim()).filter(Boolean),
  ipv6: process.env.IPV6 || 'auto',
  timeout: Number(process.env.TIMEOUT || 4000),
  json: punyaArg('--json'),
  abaikanPreflight: process.env.ABAIKAN_PREFLIGHT === '1' || punyaArg('--abaikan-preflight'),
};

const warna = process.stdout.isTTY && !process.env.NO_COLOR;
const hijau = (s) => (warna ? `\x1b[32m${s}\x1b[0m` : s);
const merah = (s) => (warna ? `\x1b[31m${s}\x1b[0m` : s);
const kuning = (s) => (warna ? `\x1b[33m${s}\x1b[0m` : s);
const redup = (s) => (warna ? `\x1b[2m${s}\x1b[0m` : s);
const log = (...a) => { if (!opsi.json) console.log(...a); };

/** Apakah mesin ini bisa ngomong IPv6 keluar? Runner GitHub-hosted: biasanya nggak bisa. */
async function adaIpv6() {
  for (const r of ROOT) {
    try { await tanya({ ip: r.v6, name: '.', type: TYPE.NS, timeout: 2500 }); return true; }
    catch { /* coba root berikutnya */ }
  }
  return false;
}

async function main() {
  const mulai = Date.now();
  const hasil = { waktu: new Date().toISOString(), zones: {}, lulus: 0, gagal: 0, dilewati: 0, temuan: [] };

  // ---- 1. IPv6 tersedia atau nggak ----
  let pakaiIpv6;
  if (opsi.ipv6 === 'off') pakaiIpv6 = false;
  else if (opsi.ipv6 === 'on') pakaiIpv6 = true;
  else {
    pakaiIpv6 = await adaIpv6();
    if (!pakaiIpv6) log(kuning('  [i] jaringan ini nggak punya jalan keluar IPv6 — pemeriksaan v6 dilewati, bukan dianggap gagal'));
  }

  // ---- 2. Preflight: jalurnya boleh dipercaya? ----
  const jalur = await periksaJalur({ transports: opsi.transports, ipv6: pakaiIpv6, timeout: 3000 });
  hasil.jalur = jalur;
  if (!jalur.tepercaya) {
    hasil.status = 'TIDAK_SAH';
    if (process.env.JSON_KE) fs.writeFileSync(process.env.JSON_KE, JSON.stringify(hasil, null, 2));
    if (opsi.json) console.log(JSON.stringify(hasil, null, 2));
    else console.error(pesanJalurKotor(jalur));
    ringkasKeGitHub('TIDAK SAH — jaringan pengukur membajak DNS', jalur.ringkas);
    process.exit(opsi.abaikanPreflight ? 0 : 3);
  }
  log(redup(`  [i] ${jalur.ringkas}`));

  // ---- 3. Per zone ----
  for (const zone of opsi.zones) {
    log('');
    log(`━━ ${zone} ━━`);
    const z = { server: [], kasus: [] };
    hasil.zones[zone] = z;

    let delegasi;
    try {
      delegasi = await temukanNameserver(zone, {
        mode: opsi.temukan, ipv6: pakaiIpv6, timeout: opsi.timeout, daftarEnv: opsi.nameservers,
      });
    } catch (e) {
      console.error(merah(`  discovery gagal buat ${zone}: ${e.message}`));
      hasil.temuan.push(`discovery ${zone}: ${e.message}`);
      hasil.gagal++;
      continue;
    }
    z.delegasi = { sumber: delegasi.sumber, ns: delegasi.ns, glue: delegasi.glue, jejak: delegasi.jejak };
    log(redup(`  nameserver ketemu lewat "${delegasi.sumber}": ${delegasi.ns.join(', ') || '(kosong)'}`));
    for (const j of delegasi.jejak) log(redup(`    · ${j}`));

    if (!delegasi.server.length) {
      console.error(merah(`  nggak ada alamat nameserver yang bisa diuji buat ${zone}`));
      hasil.gagal++;
      continue;
    }

    // ---- 3a. Pemeriksaan per nameserver × transport ----
    const apexPerServer = {};
    for (const srv of delegasi.server) {
      for (const transport of opsi.transports) {
        const label = `${srv.nama} ${srv.ip} ${transport}/${srv.keluarga}`;
        log(`  ${label}`);

        // Sidik jari dulu: kalau jawaban dari IP ini kelihatan bukan punya kita, bilang.
        try {
          const sidik = await periksaSidikJari({ ip: srv.ip, zone, transport, timeout: opsi.timeout });
          if (sidik.dibajak) {
            for (const b of sidik.bukti) log(`    ${kuning('!')} ${b}`);
            hasil.temuan.push(`${label}: sidik jari jawaban mencurigakan — ${sidik.bukti.join('; ')}`);
          }
        } catch (e) {
          log(`    ${kuning('!')} sidik jari nggak bisa diambil: ${e.message}`);
        }

        for (const k of susunKasus({ zone, ip: srv.ip, nama: srv.nama, transport, timeout: opsi.timeout })) {
          const catat = { zone, server: label, judul: k.judul };
          try {
            const catatan = await k.jalankan();
            catat.status = 'lulus';
            catat.catatan = catatan || '';
            hasil.lulus++;
            log(`    ${hijau('✓')} ${k.judul}${catatan ? redup(` — ${catatan}`) : ''}`);
          } catch (e) {
            catat.status = 'gagal';
            catat.pesan = e.message;
            hasil.gagal++;
            hasil.temuan.push(`${label} — ${k.judul}: ${e.message}`);
            log(`    ${merah('✗')} ${k.judul}`);
            log(`      ${merah(e.message)}`);
          }
          z.kasus.push(catat);
        }

        // Kumpulin bahan buat pemeriksaan konsistensi tingkat zone.
        try {
          const ns = await tanya({ ip: srv.ip, name: zone, type: TYPE.NS, transport, timeout: opsi.timeout });
          const soa = await tanya({ ip: srv.ip, name: zone, type: TYPE.SOA, transport, timeout: opsi.timeout });
          apexPerServer[label] = {
            ns: ambil(ns.answers, TYPE.NS).map((rr) => rr.data),
            serial: ambil(soa.answers, TYPE.SOA)[0]?.data.serial ?? null,
          };
        } catch { /* kegagalannya udah kecatat di kasus di atas */ }
      }
      z.server.push({ ...srv });
    }

    // ---- 3b. Pemeriksaan konsistensi armada ----
    log(`  ${redup('konsistensi armada')}`);
    for (const k of susunKasusZone({ zone, delegasi, apexPerServer })) {
      const catat = { zone, server: '(zone)', judul: k.judul };
      try {
        const catatan = await k.jalankan();
        catat.status = 'lulus';
        hasil.lulus++;
        log(`    ${hijau('✓')} ${k.judul}${catatan ? redup(` — ${catatan}`) : ''}`);
      } catch (e) {
        catat.status = 'gagal';
        catat.pesan = e.message;
        hasil.gagal++;
        hasil.temuan.push(`${zone} — ${k.judul}: ${e.message}`);
        log(`    ${merah('✗')} ${k.judul}`);
        log(`      ${merah(e.message)}`);
      }
      z.kasus.push(catat);
    }
  }

  hasil.detik = ((Date.now() - mulai) / 1000).toFixed(1);
  hasil.status = hasil.gagal === 0 ? 'SEHAT' : 'BERMASALAH';

  if (process.env.JSON_KE) fs.writeFileSync(process.env.JSON_KE, JSON.stringify(hasil, null, 2));
  if (opsi.json) {
    console.log(JSON.stringify(hasil, null, 2));
  } else {
    log('');
    log(`━━ ringkasan ━━`);
    log(`  ${hasil.status === 'SEHAT' ? hijau(hasil.status) : merah(hasil.status)}  lulus ${hasil.lulus} · gagal ${hasil.gagal} · ${hasil.detik}s`);
    for (const t of hasil.temuan) log(`  ${merah('·')} ${t}`);
  }
  ringkasKeGitHub(hasil.status, `lulus ${hasil.lulus} · gagal ${hasil.gagal}`, hasil.temuan);
  process.exit(hasil.gagal === 0 ? 0 : 1);
}

/** Tulis ringkasan ke step summary GitHub Actions kalau lagi jalan di sana. */
function ringkasKeGitHub(status, ringkas, temuan = []) {
  const berkas = process.env.GITHUB_STEP_SUMMARY;
  if (!berkas) return;
  const baris = [`## Monitoring nameserver: ${status}`, '', ringkas, ''];
  if (temuan.length) baris.push('### Temuan', ...temuan.map((t) => `- ${t}`));
  try { fs.appendFileSync(berkas, baris.join('\n') + '\n'); } catch { /* summary opsional */ }
}

main().catch((e) => {
  console.error(merah(`gagal mulai: ${e.stack || e.message}`));
  process.exit(2);
});
