// cases.js — the list of checks run against ONE production nameserver.
//
// The ground rules:
//   - every check aims straight at one nameserver's IP (never through a resolver),
//     so if ns2 is down while ns1 is up, only ns2 goes red;
//   - every check runs per transport (UDP and TCP) and per family (v4/v6),
//     because "alive on UDP" does not mean "alive on TCP" — real resolvers use both;
//   - test names are always randomised, so no cache anywhere can make a dead server
//     look alive;
//   - what is checked is not only the answer body but the header too: rcode, AA, RA, TC.

import { tanya, TYPE, ambil, NAMA_RCODE } from './dns.js';
import { ipv6ToBytes } from '../../src/parse.js';

const acak8 = () => Math.random().toString(36).slice(2, 10);

/**
 * A random label GUARANTEED not to be an IP address in any form.
 *
 * 🚨 This is not tidiness. `acak8()` uses base36 [0-9a-z]; if all eight
 * characters happen to land in [0-9a-f], the result is a **valid 8-hex-digit address**
 * and the server is RIGHT to answer it as an A record. The test is wrong, not the server.
 *
 * Measured: 1 in 659 labels. This check runs 8x per run (4 servers x 2 zones),
 * so 1.21% of runs end red with nothing broken. On a 30-minute schedule that is a
 * false alarm roughly every two days — and an alarm that lies often is more
 * dangerous than no alarm at all, because people stop looking at it.
 *
 * "z" is not in [0-9a-f], so this label can never be read as hex
 * or as dashed IPv6; there is no hyphen, so it is not dashed IPv4; and
 * it is not purely numeric, so it is not an octet.
 */
const labelBukanIP = () => 'z' + Math.random().toString(36).slice(2, 9) + 'z';
const oktet = () => Math.floor(Math.random() * 256);
const oktetTakNol = () => 1 + Math.floor(Math.random() * 254);
const rc = (n) => NAMA_RCODE[n] ?? `RCODE${n}`;

/** Build a random IPv4 address plus every spelling Open-Domain must recognise. */
function ipv4Acak() {
  const a = [oktetTakNol(), oktet(), oktet(), oktetTakNol()];
  const teks = a.join('.');
  const hex = a.map((n) => n.toString(16).padStart(2, '0')).join('');
  return { a, teks, titik: teks, strip: a.join('-'), hex };
}

/** Build a random IPv6 address in Open-Domain's dashed spelling. */
function ipv6Acak() {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16);
  const grup = [h(), h(), h()];
  return { teks: `2001:db8:${grup[0]}:${grup[1]}::${grup[2]}`, strip: `2001-db8-${grup[0]}-${grup[1]}--${grup[2]}` };
}

function wajib(syarat, pesan) { if (!syarat) throw new Error(pesan); }

/** Header checks that apply to EVERY authoritative answer. */
function periksaHeaderOtoritatif(j, { bolehTanpaAA = false } = {}) {
  wajib(j.qr, 'QR is clear — this is not a reply packet');
  wajib(bolehTanpaAA || j.aa, 'AA is clear — an authoritative answer must have AA=1 (otherwise: wrong zone, or someone intercepted)');
  wajib(!j.ra, 'RA is set — our nameserver must never claim recursion (the signature of a resolver or hijacker)');
  wajib(!j.tc, 'TC is set — the answer was truncated when it should have fitted');
}

/**
 * Build every case for one (zone, nameserver, transport) combination.
 * Each case: { judul, jalankan: async () => note|undefined }
 */
export function susunKasus({ zone, ip, nama, transport, timeout = 4000 }) {
  const T = (name, type, opsi = {}) => tanya({ ip, name, type, transport, timeout, ...opsi });
  const K = [];
  const tambah = (judul, jalankan) => K.push({ judul, jalankan, zone, ip, nama, transport });

  // ---- apex: SOA & NS ----
  tambah('apex SOA: NOERROR + AA + one sane SOA', async () => {
    const j = await T(zone, TYPE.SOA);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 0, `rcode ${rc(j.rcode)}, expected NOERROR`);
    const soa = ambil(j.answers, TYPE.SOA);
    wajib(soa.length === 1, `${soa.length} SOA records in the answer, expected 1`);
    const d = soa[0].data;
    wajib(d.serial > 0, 'SOA serial is 0');
    wajib(d.mname && d.mname.includes('.'), `odd MNAME: "${d.mname}"`);
    wajib(d.minimum > 0 && d.minimum <= 86400, `SOA minimum ${d.minimum} is out of range (negative-cache TTL)`);
    return `mname=${d.mname} serial=${d.serial} min=${d.minimum} ${j.ms.toFixed(0)}ms`;
  });

  tambah('apex NS: NOERROR + AA + at least 2 NS', async () => {
    const j = await T(zone, TYPE.NS);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 0, `rcode ${rc(j.rcode)}, expected NOERROR`);
    const ns = ambil(j.answers, TYPE.NS).map((rr) => rr.data).sort();
    wajib(ns.length >= 2, `only ${ns.length} NS at the apex (${ns.join(', ') || '-'}) — one nameserver is one point of failure`);
    return ns.join(', ');
  });

  // ---- the heart of the service: the IP is computed from the name ----
  tambah('A from dotted IPv4', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.titik}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a.length === 1 && a[0] === ip4.teks, `${ip4.titik}.${zone} -> ${a.join(',') || '(empty)'}, expected ${ip4.teks}`);
    return `${ip4.titik} ok ${j.ms.toFixed(0)}ms`;
  });

  tambah('A from dashed IPv4 (the single-label form)', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a.length === 1 && a[0] === ip4.teks, `${ip4.strip}.${zone} -> ${a.join(',') || '(empty)'}, expected ${ip4.teks}`);
  });

  tambah('A from 8-hex-digit IPv4', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.hex}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a.length === 1 && a[0] === ip4.teks, `${ip4.hex}.${zone} -> ${a.join(',') || '(empty)'}, expected ${ip4.teks}`);
  });

  tambah('AAAA from dashed IPv6', async () => {
    const ip6 = ipv6Acak();
    const j = await T(`${ip6.strip}.${zone}`, TYPE.AAAA);
    periksaHeaderOtoritatif(j);
    const rr = ambil(j.answers, TYPE.AAAA);
    wajib(rr.length === 1, `${rr.length} AAAA records, expected 1`);
    // Compared as bytes, to stay free of "::" spelling questions.
    wajib(rr[0].rdata.equals(ipv6ToBytes(ip6.teks)), `${ip6.strip}.${zone} -> ${rr[0].data}, expected ${ip6.teks}`);
  });

  tambah('an arbitrary prefix before the IP still answers', async () => {
    const ip4 = ipv4Acak();
    const nama2 = `${labelBukanIP()}.${labelBukanIP()}.${ip4.strip}.${zone}`;
    const j = await T(nama2, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a[0] === ip4.teks, `${nama2} -> ${a.join(',') || '(empty)'}, expected ${ip4.teks}`);
  });

  tambah('letter case makes no difference', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`.toUpperCase(), TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a[0] === ip4.teks, `the UPPERCASE form -> ${a.join(',') || '(empty)'}, expected ${ip4.teks}`);
  });

  // ---- negative answers: just as important ----
  tambah('a name in the zone that is not an IP -> NXDOMAIN + SOA in authority', async () => {
    const j = await T(`${labelBukanIP()}.${labelBukanIP()}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 3, `rcode ${rc(j.rcode)}, expected NXDOMAIN`);
    wajib(ambil(j.authority, TYPE.SOA).length === 1, 'no SOA in authority — resolvers cannot cache the negative answer');
  });

  tambah('a name outside the zone -> REFUSED (we are not an open resolver)', async () => {
    const j = await T(`${labelBukanIP()}.example.com`, TYPE.A);
    wajib(j.rcode === 5, `rcode ${rc(j.rcode)}, expected REFUSED — an authoritative server must not serve someone else's zone`);
    wajib(!j.ra, 'RA set on a REFUSED reply — never claim recursion');
    wajib(j.answers.length === 0, 'answers returned for a name outside the zone — the signature of an open resolver');
  });

  tambah('NODATA: AAAA on an IPv4 name -> NOERROR + 0 answers + SOA authority', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.AAAA);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 0, `rcode ${rc(j.rcode)}, expected NOERROR (NODATA, not NXDOMAIN)`);
    wajib(j.answers.length === 0, `${j.answers.length} answers present, expected none`);
    wajib(ambil(j.authority, TYPE.SOA).length === 1, 'NODATA tanpa SOA di authority');
  });

  // ---- real-world compatibility ----
  tambah('a query with EDNS0 is still answered correctly', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.A, { edns: true });
    wajib(j.rcode !== 1, 'FORMERR on a query carrying OPT — modern resolvers almost always send EDNS0, so this makes the zone unresolvable');
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a[0] === ip4.teks, `with EDNS0 -> ${a.join(',') || '(empty)'}, expected ${ip4.teks}`);
    const opt = j.additional.filter((rr) => rr.type === 41);
    return opt.length ? 'OPT echoed' : 'answered, but the OPT was not echoed (RFC 6891 asks for it; common resolvers still forgive it)';
  });

  tambah('response time is reasonable', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.A);
    wajib(j.ms < 1500, `${j.ms.toFixed(0)}ms — too slow for an authoritative query`);
    return `${j.ms.toFixed(0)}ms`;
  });

  return K;
}

/**
 * Zone-level checks (not per nameserver): fleet consistency.
 * @param {object} p { zone, delegasi:{ns,glue,sumber}, hasilApex: {ipNS: {ns:[], serial}} }
 */
export function susunKasusZone({ zone, delegasi, apexPerServer }) {
  const K = [];
  const tambah = (judul, jalankan) => K.push({ judul, jalankan, zone, ip: '-', nama: '(zone)', transport: '-' });

  tambah('the parent delegation has at least 2 nameservers', async () => {
    wajib(delegasi.ns.length >= 2, `the delegation has only ${delegasi.ns.length} NS (${delegasi.ns.join(', ')}) — one nameserver is one point of failure`);
    return delegasi.ns.join(', ');
  });

  tambah('every nameserver in the delegation has an address', async () => {
    const buntung = delegasi.ns.filter((n) => !(delegasi.glue[n] || []).length);
    wajib(buntung.length === 0, `no A/AAAA found for: ${buntung.join(', ')}`);
  });

  tambah('every nameserver in the delegation has an IPv6 address', async () => {
    const tanpaV6 = delegasi.ns.filter((n) => !(delegasi.glue[n] || []).some((ip) => ip.includes(':')));
    wajib(tanpaV6.length === 0, `no AAAA yet for: ${tanpaV6.join(', ')} — IPv6-only clients cannot reach us`);
  });

  tambah('the apex NS set matches the parent delegation exactly', async () => {
    const dariInduk = [...delegasi.ns].sort().join(', ');
    for (const [kunci, isi] of Object.entries(apexPerServer)) {
      const dariApex = [...isi.ns].sort().join(', ');
      wajib(dariApex === dariInduk, `${kunci}: the apex says [${dariApex}], the parent says [${dariInduk}] — delegation and zone are out of sync`);
    }
    return dariInduk;
  });

  tambah('the SOA serial is identical on every nameserver', async () => {
    const serial = Object.entries(apexPerServer).map(([k, v]) => [k, v.serial]);
    const unik = [...new Set(serial.map(([, s]) => s))];
    wajib(unik.length <= 1, `serials differ: ${serial.map(([k, s]) => `${k}=${s}`).join(', ')} — a resolver may treat one copy of the zone as stale`);
    return `serial=${unik[0]}`;
  });

  return K;
}
