#!/usr/bin/env node
// check.js — Open-Domain's external monitoring.
//
// Queries the PRODUCTION nameservers one at a time (never through a recursive resolver), over
// UDP and TCP, IPv4 and IPv6, then delivers a verdict. Run from three places, same command:
//   - scheduled GitHub Actions   (npm run monitor)
//   - a laptop, by hand          (npm run monitor)
//   - cron on a VPS              (npm run monitor -- --json)
//
// Exit codes:
//   0  everything passed
//   1  a check failed (the nameserver has a problem)
//   2  could not start (discovery failed / misconfiguration)
//   3  RESULT INVALID — the network path is hijacked; conclude nothing from this run
//
// Env:
//   ZONES=a-i.sh,a-i.st        zones to watch
//   NAMESERVERS=name@ip,...    force the nameserver list (for a new ns not yet delegated)
//   TEMUKAN=auto|induk|doh|env how to discover nameservers
//   TRANSPORTS=udp,tcp         transports to test
//   IPV6=auto|on|off           auto = skipped when the network genuinely has no IPv6
//   TIMEOUT=4000               milliseconds per query
//   ABAIKAN_PREFLIGHT=1        continue on a dirty path (debug only; the result is not valid)

import fs from 'node:fs';
import { periksaJalur, pesanJalurKotor, periksaSidikJari } from './lib/path.js';
import { temukanNameserver, ROOT } from './lib/discover.js';
import { susunKasus, susunKasusZone } from './lib/cases.js';
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

/** Can this machine speak IPv6 outbound? GitHub-hosted runners: usually not. */
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

  // ---- 1. is IPv6 available at all ----
  let pakaiIpv6;
  if (opsi.ipv6 === 'off') pakaiIpv6 = false;
  else if (opsi.ipv6 === 'on') pakaiIpv6 = true;
  else {
    pakaiIpv6 = await adaIpv6();
    if (!pakaiIpv6) log(kuning('  [i] this network has no IPv6 route out — v6 checks are skipped, not counted as failures'));
  }

  // ---- 2. Preflight: jalurnya boleh dipercaya? ----
  const jalur = await periksaJalur({ transports: opsi.transports, ipv6: pakaiIpv6, timeout: 3000 });
  hasil.jalur = jalur;
  if (!jalur.tepercaya) {
    hasil.status = 'TIDAK_SAH';
    if (process.env.JSON_KE) fs.writeFileSync(process.env.JSON_KE, JSON.stringify(hasil, null, 2));
    if (opsi.json) console.log(JSON.stringify(hasil, null, 2));
    else console.error(pesanJalurKotor(jalur));
    ringkasKeGitHub('INVALID — the measuring network hijacks DNS', jalur.ringkas);
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
      console.error(merah(`  discovery failed for ${zone}: ${e.message}`));
      hasil.temuan.push(`discovery ${zone}: ${e.message}`);
      hasil.gagal++;
      continue;
    }
    z.delegasi = { sumber: delegasi.sumber, ns: delegasi.ns, glue: delegasi.glue, jejak: delegasi.jejak };
    log(redup(`  nameservers discovered via "${delegasi.sumber}": ${delegasi.ns.join(', ') || '(none)'}`));
    for (const j of delegasi.jejak) log(redup(`    · ${j}`));

    if (!delegasi.server.length) {
      console.error(merah(`  no testable nameserver address for ${zone}`));
      hasil.gagal++;
      continue;
    }

    // ---- 3a. Pemeriksaan per nameserver × transport ----
    const apexPerServer = {};
    for (const srv of delegasi.server) {
      for (const transport of opsi.transports) {
        const label = `${srv.nama} ${srv.ip} ${transport}/${srv.keluarga}`;
        log(`  ${label}`);

        // Fingerprint first: if answers from this IP do not look like ours, say so.
        try {
          const sidik = await periksaSidikJari({ ip: srv.ip, zone, transport, timeout: opsi.timeout });
          if (sidik.dibajak) {
            for (const b of sidik.bukti) log(`    ${kuning('!')} ${b}`);
            hasil.temuan.push(`${label}: sidik jari jawaban mencurigakan — ${sidik.bukti.join('; ')}`);
          }
        } catch (e) {
          log(`    ${kuning('!')} could not take a fingerprint: ${e.message}`);
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

        // Gather the material for the zone-level consistency checks.
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
    log(`  ${redup('fleet consistency')}`);
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
    log(`━━ summary ━━`);
    log(`  ${hasil.status === 'SEHAT' ? hijau(hasil.status) : merah(hasil.status)}  passed ${hasil.lulus} · failed ${hasil.gagal} · ${hasil.detik}s`);
    for (const t of hasil.temuan) log(`  ${merah('·')} ${t}`);
  }
  ringkasKeGitHub(hasil.status, `lulus ${hasil.lulus} · gagal ${hasil.gagal}`, hasil.temuan);
  process.exit(hasil.gagal === 0 ? 0 : 1);
}

/** Write a summary into the GitHub Actions step summary when running there. */
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
