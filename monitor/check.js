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
//   ZONES=a-i.sh,a-i.st          zones to watch
//   NAMESERVERS=name@ip,...      force the nameserver list (for a new ns not yet delegated)
//   DISCOVER=auto|parent|doh|env how to discover nameservers
//   TRANSPORTS=udp,tcp           transports to test
//   IPV6=auto|on|off             auto = skipped when the network genuinely has no IPv6
//   TIMEOUT=4000                 milliseconds per query
//   IGNORE_PREFLIGHT=1           continue on a dirty path (debug only; the result is not valid)

import fs from 'node:fs';
import { periksaJalur, pesanJalurKotor, periksaSidikJari } from './lib/path.js';
import { temukanNameserver, ROOT } from './lib/discover.js';
import { susunKasus, susunKasusZone } from './lib/cases.js';
import { tanya, TYPE, ambil } from './lib/dns.js';

const argv = process.argv.slice(2);
const hasArg = (n) => argv.includes(n);

const options = {
  zones: (process.env.ZONES || 'a-i.sh,a-i.st').split(',').map((s) => s.trim()).filter(Boolean),
  nameservers: process.env.NAMESERVERS || null,
  discover: process.env.DISCOVER || 'auto',
  transports: (process.env.TRANSPORTS || 'udp,tcp').split(',').map((s) => s.trim()).filter(Boolean),
  ipv6: process.env.IPV6 || 'auto',
  timeout: Number(process.env.TIMEOUT || 4000),
  json: hasArg('--json'),
  ignorePreflight: process.env.IGNORE_PREFLIGHT === '1' || hasArg('--ignore-preflight'),
};

const colour = process.stdout.isTTY && !process.env.NO_COLOR;
const green = (s) => (colour ? `\x1b[32m${s}\x1b[0m` : s);
const red = (s) => (colour ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s) => (colour ? `\x1b[33m${s}\x1b[0m` : s);
const dim = (s) => (colour ? `\x1b[2m${s}\x1b[0m` : s);
const log = (...a) => { if (!options.json) console.log(...a); };

/** Can this machine speak IPv6 outbound? GitHub-hosted runners: usually not. */
async function hasIpv6() {
  for (const r of ROOT) {
    try { await tanya({ ip: r.v6, name: '.', type: TYPE.NS, timeout: 2500 }); return true; }
    catch { /* try the next root */ }
  }
  return false;
}

async function main() {
  const started = Date.now();
  const result = { time: new Date().toISOString(), zones: {}, passed: 0, failed: 0, skipped: 0, findings: [] };

  // ---- 1. is IPv6 available at all ----
  let useIpv6;
  if (options.ipv6 === 'off') useIpv6 = false;
  else if (options.ipv6 === 'on') useIpv6 = true;
  else {
    useIpv6 = await hasIpv6();
    if (!useIpv6) log(yellow('  [i] this network has no IPv6 route out — v6 checks are skipped, not counted as failures'));
  }

  // ---- 2. Preflight: can the path be trusted? ----
  const path = await periksaJalur({ transports: options.transports, ipv6: useIpv6, timeout: 3000 });
  result.path = path;
  if (!path.tepercaya) {
    result.status = 'INVALID';
    if (process.env.JSON_TO) fs.writeFileSync(process.env.JSON_TO, JSON.stringify(result, null, 2));
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.error(pesanJalurKotor(path));
    summaryToGitHub('INVALID — the measuring network hijacks DNS', path.ringkas);
    process.exit(options.ignorePreflight ? 0 : 3);
  }
  log(dim(`  [i] ${path.ringkas}`));

  // ---- 3. Per zone ----
  for (const zone of options.zones) {
    log('');
    log(`━━ ${zone} ━━`);
    const z = { server: [], cases: [] };
    result.zones[zone] = z;

    let delegation;
    try {
      delegation = await temukanNameserver(zone, {
        mode: options.discover, ipv6: useIpv6, timeout: options.timeout, daftarEnv: options.nameservers,
      });
    } catch (e) {
      console.error(red(`  discovery failed for ${zone}: ${e.message}`));
      result.findings.push(`discovery ${zone}: ${e.message}`);
      result.failed++;
      continue;
    }
    z.delegation = { source: delegation.sumber, ns: delegation.ns, glue: delegation.glue, trace: delegation.jejak };
    log(dim(`  nameservers discovered via "${delegation.sumber}": ${delegation.ns.join(', ') || '(none)'}`));
    for (const line of delegation.jejak) log(dim(`    · ${line}`));

    if (!delegation.server.length) {
      console.error(red(`  no testable nameserver address for ${zone}`));
      result.failed++;
      continue;
    }

    // ---- 3a. Checks per nameserver × transport ----
    const apexPerServer = {};
    for (const srv of delegation.server) {
      for (const transport of options.transports) {
        const label = `${srv.nama} ${srv.ip} ${transport}/${srv.keluarga}`;
        log(`  ${label}`);

        // Fingerprint first: if answers from this IP do not look like ours, say so.
        try {
          const fingerprint = await periksaSidikJari({ ip: srv.ip, zone, transport, timeout: options.timeout });
          if (fingerprint.dibajak) {
            for (const b of fingerprint.bukti) log(`    ${yellow('!')} ${b}`);
            result.findings.push(`${label}: the answers do not look like ours — ${fingerprint.bukti.join('; ')}`);
          }
        } catch (e) {
          log(`    ${yellow('!')} could not take a fingerprint: ${e.message}`);
        }

        for (const k of susunKasus({ zone, ip: srv.ip, nama: srv.nama, transport, timeout: options.timeout })) {
          const record = { zone, server: label, title: k.judul };
          try {
            const note = await k.jalankan();
            record.status = 'passed';
            record.note = note || '';
            result.passed++;
            log(`    ${green('✓')} ${k.judul}${note ? dim(` — ${note}`) : ''}`);
          } catch (e) {
            record.status = 'failed';
            record.message = e.message;
            result.failed++;
            result.findings.push(`${label} — ${k.judul}: ${e.message}`);
            log(`    ${red('✗')} ${k.judul}`);
            log(`      ${red(e.message)}`);
          }
          z.cases.push(record);
        }

        // Gather the material for the zone-level consistency checks.
        try {
          const ns = await tanya({ ip: srv.ip, name: zone, type: TYPE.NS, transport, timeout: options.timeout });
          const soa = await tanya({ ip: srv.ip, name: zone, type: TYPE.SOA, transport, timeout: options.timeout });
          apexPerServer[label] = {
            ns: ambil(ns.answers, TYPE.NS).map((rr) => rr.data),
            serial: ambil(soa.answers, TYPE.SOA)[0]?.data.serial ?? null,
          };
        } catch { /* the failure is already recorded by the cases above */ }
      }
      z.server.push({ ...srv });
    }

    // ---- 3b. Fleet consistency checks ----
    log(`  ${dim('fleet consistency')}`);
    for (const k of susunKasusZone({ zone, delegasi: delegation, apexPerServer })) {
      const record = { zone, server: '(zone)', title: k.judul };
      try {
        const note = await k.jalankan();
        record.status = 'passed';
        result.passed++;
        log(`    ${green('✓')} ${k.judul}${note ? dim(` — ${note}`) : ''}`);
      } catch (e) {
        record.status = 'failed';
        record.message = e.message;
        result.failed++;
        result.findings.push(`${zone} — ${k.judul}: ${e.message}`);
        log(`    ${red('✗')} ${k.judul}`);
        log(`      ${red(e.message)}`);
      }
      z.cases.push(record);
    }
  }

  result.seconds = ((Date.now() - started) / 1000).toFixed(1);
  result.status = result.failed === 0 ? 'HEALTHY' : 'PROBLEMS';

  if (process.env.JSON_TO) fs.writeFileSync(process.env.JSON_TO, JSON.stringify(result, null, 2));
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    log('');
    log(`━━ summary ━━`);
    log(`  ${result.status === 'HEALTHY' ? green(result.status) : red(result.status)}  passed ${result.passed} · failed ${result.failed} · ${result.seconds}s`);
    for (const f of result.findings) log(`  ${red('·')} ${f}`);
  }
  summaryToGitHub(result.status, `passed ${result.passed} · failed ${result.failed}`, result.findings);
  process.exit(result.failed === 0 ? 0 : 1);
}

/** Write a summary into the GitHub Actions step summary when running there. */
function summaryToGitHub(status, summary, findings = []) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const lines = [`## Nameserver monitoring: ${status}`, '', summary, ''];
  if (findings.length) lines.push('### Findings', ...findings.map((f) => `- ${f}`));
  try { fs.appendFileSync(file, lines.join('\n') + '\n'); } catch { /* the summary is optional */ }
}

main().catch((e) => {
  console.error(red(`could not start: ${e.stack || e.message}`));
  process.exit(2);
});
