// discover.js — work out for ourselves which nameservers actually serve a zone.
//
// The principle: never hard-code the nameserver list in the test. The moment ns2 (and ns3)
// come up on another continent, the tests must cover them without a single line changing.
//
// The source of truth is **the delegation in the parent zone**, not the NS set at our own apex.
// The reason: the apex NS is an answer from the very server under test — if it is misconfigured,
// it can claim anything. What decides who is entitled to answer the world is the NS
// record in the parent (for a-i.sh: the .sh TLD servers). So we walk down from the root:
//     root  ->  server .sh  ->  delegasi a-i.sh (+ glue A/AAAA)
// A mismatch between the parent delegation and the apex NS is itself one of the things we check.
//
// Three modes, chosen automatically, forceable via env DISCOVER=parent|doh|env:
//   parent: walk down from the root over real DNS (most correct, needs outbound port 53)
//   doh   : ask a public resolver over HTTPS (for networks that block port 53;
//           enough to FIND nameservers, never used to JUDGE them)
//   env   : a manual list from env NAMESERVERS — for a new ns that is not delegated yet
//
// NAMESERVERS format: "name@ip" separated by commas; the name may be omitted.
//   NAMESERVERS="ns1.open-domain.com@167.235.234.220,ns2.open-domain.com@203.0.113.9"

import { tanya, TYPE, ambil } from './dns.js';

// Root hints (public IANA data). A handful is enough; we use whichever answers first.
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
 * Walk down from the root until the delegation for `zone` is found.
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
    if (!hasil) throw new Error(`no server could be reached at step ${langkah}: ${jejak.join('; ')}`);

    glueTotal = { ...glueTotal, ...hasil.glue };
    const pemilik = hasil.ns.length ? hasil.ns[0].pemilik : '(empty)';
    jejak.push(`@${ipDipakai} -> delegation "${pemilik}" (${hasil.ns.length} NS)`);

    // Found it: the NS records are owned by exactly the zone we are looking for.
    if (hasil.ns.length && hasil.ns.every((n) => n.pemilik === target)) {
      const nama = [...new Set(hasil.ns.map((n) => n.nama))].sort();
      return { sumber: 'parent', ns: nama, glue: glueTotal, jejak };
    }
    if (!hasil.ns.length) throw new Error(`step ${langkah}: no NS in the answer — zone "${target}" is probably not delegated yet`);

    // Not there yet: descend to the next delegation's servers, using glue where present.
    const berikut = [];
    for (const n of hasil.ns) for (const ip of glueTotal[n.nama] || []) if (!ip.includes(':')) berikut.push(ip);
    if (!berikut.length) {
      // No glue (the parent zone is a different TLD) — resolve the NS name from the root again.
      for (const n of hasil.ns.slice(0, 2)) {
        const ip = await alamatNS(n.nama, { transport, timeout }).catch(() => []);
        berikut.push(...ip.filter((x) => !x.includes(':')));
      }
    }
    if (!berikut.length) throw new Error(`step ${langkah}: NS found but their addresses could not be resolved (${hasil.ns.map((n) => n.nama).join(', ')})`);
    kandidat = berikut;
  }
  throw new Error(`descended too far without finding a delegation for ${target}`);
}

/**
 * Find a hostname's A/AAAA by walking down from the root (no recursive resolver).
 *
 * 🚨 AAAA SELALU dicari, apa pun kemampuan jaringan pengukur. Pertanyaannya
 * "does this nameserver HAVE an IPv6 address", which is a property of the service —
 * bukan sifat jaringan kita. Query-nya sendiri jalan di atas IPv4, jadi runner
 * and a measuring host without IPv6 connectivity can still answer it correctly.
 *
 * The only thing a lack of IPv6 may disable is QUERYING a server over IPv6, and
 * itu diputuskan di temukanNameserver, bukan di sini.
 */
export async function alamatNS(host, { transport = 'udp', timeout = 4000 } = {}) {
  const nama = bersih(host);
  const bagian = nama.split('.');
  // Find the nearest parent zone that has a delegation, then ask its servers directly.
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

// ---- DoH mode: only to FIND, never to JUDGE ----

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
  throw new Error(`every DoH resolver failed: ${salahTerakhir?.message}`);
}

// AAAA is still asked even when the measuring network has no IPv6 — DoH runs over
// HTTPS/IPv4, and the question is has-one-or-not, not is-it-reachable.
export async function temukanDariDoH(zone) {
  const ns = [...new Set(await doh(bersih(zone), 'NS'))].sort();
  const glue = {};
  for (const n of ns) {
    const a = await doh(n, 'A').catch(() => []);
    const aaaa = await doh(n, 'AAAA').catch(() => []);
    glue[n] = [...a, ...aaaa];
  }
  return { sumber: 'doh', ns, glue, jejak: ['via DoH (HTTPS) — used to find, never to judge'] };
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
 * Entry point: discover the nameservers and their addresses for one zone.
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
      if (mode === 'parent') throw e;
      hasil = await temukanDariDoH(zone);
      hasil.jejak.unshift(`jalan-turun dari root gagal (${e.message}), balik ke DoH`);
    }
  }

  // Fill in the address of every NS that has no glue. This applies to nameservers
  // out-of-bailiwick: ns2.a-i.st does not appear in the additional section of the
  // a-i.sh delegation (a registry only glues names INSIDE that zone), so its
  // address has to be looked up separately.
  for (const n of hasil.ns) {
    if (hasil.glue[n]?.length) continue;
    hasil.glue[n] = hasil.sumber === 'doh'
      ? [...(await doh(n, 'A').catch(() => [])), ...(await doh(n, 'AAAA').catch(() => []))]
      : await alamatNS(n, { transport, timeout }).catch(() => []);
  }

  // 🚨 `ipv6` decides only who gets QUERIED, never what is KNOWN.
  // The glue stays complete (A + AAAA) so the zone-level check "every
  // nameserver punya alamat IPv6" menilai layanannya, bukan jaringan pengukur.
  //
  // Ini bukan kehati-hatian teoretis: versi sebelumnya menyembunyikan AAAA saat
  // the runner had no IPv6, and then reported "no AAAA yet for ns2.a-i.st"
  // as an incident — when the AAAA was there all along. An instrument that blames the
  // thing it measures for its own limitation is exactly what makes a monitor
  // untrustworthy, and avoiding that is the point of this entire file.
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
