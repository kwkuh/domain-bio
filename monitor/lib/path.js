// path.js — preflight: can the network path we are sitting on be trusted at all?
//
// The problem is real: plenty of networks (hotels, offices, and in our case an
// **Indonesian mobile carrier**) hijack port 53 — every DNS query is bent to their own
// resolver, whatever destination IP you aimed at. When that happens, monitoring can
// tell two different lies:
//   - PASS while our nameserver is dead (the hijacker answered), or
//   - FAIL while our nameserver is healthy (the hijacker returned NXDOMAIN for our name).
// So before judging any nameserver, we judge THE PATH. If the path is dirty the result
// is neither PASS nor FAIL but **INVALID** — and that has to be shouted, not whispered.
//
// Three layers of detection, most conclusive first:
//   1. Black-hole probe. Query the RFC 5737 / RFC 3849 documentation addresses
//      (192.0.2.1, 198.51.100.1, 203.0.113.1, 2001:db8::1). On a sane internet nothing
//      runs there, so the only correct outcome is a timeout. If anything answers, an
//      interceptor is certain — there is no room to misread it.
//   2. Answer fingerprint. The Open-Domain server never sets RA and never adds an
//      OPT/EDNS record on its own. An answer "from" our nameserver with RA set, or
//      carrying an additional section, belongs to somebody else.
//   3. Nonce. A random name whose answer can only be right if Open-Domain's own logic
//      computed it. This is the safety net for a clever hijacker.

import { tanya, TYPE, ambil } from './dns.js';

// Documentation addresses — guaranteed not to be used by any real service.
export const LUBANG_HITAM_V4 = ['192.0.2.1', '198.51.100.1', '203.0.113.1'];
export const LUBANG_HITAM_V6 = ['2001:db8::1'];

const acak = () => Math.random().toString(36).slice(2, 10);

/**
 * Test one transport (udp/tcp) on one address family.
 * @returns {Promise<{transport:string,keluarga:string,dibajak:boolean,bukti:string[],diuji:number}>}
 */
export async function periksaTransport({ transport = 'udp', keluarga = 'v4', timeout = 3000 } = {}) {
  const target = keluarga === 'v6' ? LUBANG_HITAM_V6 : LUBANG_HITAM_V4;
  const bukti = [];
  for (const ip of target) {
    try {
      const j = await tanya({ ip, name: `${acak()}.invalid`, type: TYPE.A, transport, timeout });
      bukti.push(`${ip} (${transport}/${keluarga}) ANSWERED rcode=${j.rcode} ra=${j.ra} answers=${j.answers.length} — impossible, nothing runs DNS there`);
    } catch {
      // timeout / unreachable — this is the correct outcome
    }
  }
  return { transport, keluarga, dibajak: bukti.length > 0, bukti, diuji: target.length };
}

/**
 * Check the fingerprint of an answer from our own nameserver.
 * Runs later, once we know the nameserver's address.
 */
export async function periksaSidikJari({ ip, zone, transport = 'udp', timeout = 4000 }) {
  const a = [1 + Math.floor(Math.random() * 254), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 1 + Math.floor(Math.random() * 254)];
  const nama = `${acak()}.${a.join('-')}.${zone}`;
  const bukti = [];
  const j = await tanya({ ip, name: nama, type: TYPE.A, transport, timeout });

  if (j.ra) bukti.push('RA (recursion available) is set — the Open-Domain server never sets RA; this is a resolver answering');
  if (!j.aa) bukti.push('AA (authoritative answer) is clear — an authoritative answer must have AA=1');
  if (j.additional.length > 0) bukti.push(`additional section is populated (${j.additional.length}) — our server never sends OPT/additional on its own`);
  const jawab = ambil(j.answers, TYPE.A).map((rr) => rr.data);
  if (jawab[0] !== a.join('.')) bukti.push(`answer ${jawab[0] ?? '(empty)'} does not match the ${a.join('.')} the name asked for`);

  return { ip, transport, dibajak: bukti.length > 0, bukti, nama };
}

/**
 * Full preflight before monitoring runs.
 * @returns {Promise<{tepercaya:boolean, laporan:object[], ringkas:string}>}
 */
export async function periksaJalur({ transports = ['udp', 'tcp'], ipv6 = false, timeout = 3000 } = {}) {
  const daftar = [];
  for (const t of transports) daftar.push({ transport: t, keluarga: 'v4' });
  if (ipv6) for (const t of transports) daftar.push({ transport: t, keluarga: 'v6' });

  const laporan = await Promise.all(daftar.map((d) => periksaTransport({ ...d, timeout })));
  const kotor = laporan.filter((l) => l.dibajak);
  const tepercaya = kotor.length === 0;
  const ringkas = tepercaya
    ? `path is clean (${laporan.map((l) => `${l.transport}/${l.keluarga}`).join(', ')} not hijacked)`
    : `PATH IS HIJACKED on ${kotor.map((l) => `${l.transport}/${l.keluarga}`).join(', ')}`;
  return { tepercaya, laporan, ringkas };
}

/** The warning printed when the path is dirty. Deliberately long: this is not a small warning. */
export function pesanJalurKotor(hasil) {
  const baris = [
    '',
    '  ┌─────────────────────────────────────────────────────────────────────────┐',
    '  │  RESULT INVALID — this network hijacks DNS                              │',
    '  └─────────────────────────────────────────────────────────────────────────┘',
    '',
    `  ${hasil.ringkas}`,
    '',
    '  Evidence:',
  ];
  for (const l of hasil.laporan) for (const b of l.bukti) baris.push(`    - ${b}`);
  baris.push(
    '',
    '  What this means: queries to ANY address on port 53 are bent to this network\'s',
    '  own resolver. Monitoring is STOPPED — nothing measured from here can be trusted,',
    '  neither the parts that look like a pass nor the parts that look like a failure.',
    '  This is NOT a sign that the nameserver is down.',
    '',
    '  Ways out, easiest first:',
    '    1. Change network (another Wi-Fi / a different carrier), then retry.',
    '    2. Bring up a VPN/WireGuard that carries its own DNS, then retry.',
    '    3. Borrow another server\'s eyes:  npm run monitor:jauh -- <ssh-host>',
    '       (this script is rsynced there, run there, and the result comes back here)',
    '    4. Run it from CI:  gh workflow run nameservers.yml',
    '',
    '  Note: DoH/DoT does not help with this test. Both can only talk to a recursive',
    '  resolver, whereas the whole point here is to query each authoritative nameserver',
    '  individually.',
    '',
  );
  return baris.join('\n');
}
