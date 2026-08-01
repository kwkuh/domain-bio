// resolve.js — logika: dari query (nama + tipe) hasilkan jawaban DNS.
// Dipisah dari transport (UDP/TCP) biar gampang di-test.

import { parseName, matchZone, ipv4ToBytes, ipv6ToBytes } from './parse.js';
import {
  TYPE, RCODE, encodeName, answerRecord, namedRecord, soaRdata, hinfoRdata, buildResponse,
} from './wire.js';

/**
 * @param {{id:number,flags:number,name:string,qtype:number,questionSection:Buffer}} q
 * @param {object} cfg  { zones:[...], ns:[...], ttl, refresh, retry, expire, minttl, serial,
 *                        apexIp?, selfIp?, blocklist?, sinkholeIp? }
 *                      `zone` (tunggal) masih diterima demi kompatibilitas.
 * @returns {Buffer}
 */
export function resolve(q, cfg) {
  const zones = cfg.zones || cfg.zone;
  const parsed = parseName(q.name, zones);
  // SOA/NS harus nyebut zone yang kena match, bukan zone pertama di daftar.
  const zone = parsed.zone || (Array.isArray(zones) ? zones[0] : zones);
  const soa = () => namedRecord(zone, TYPE.SOA, cfg.minttl, soaRdata(zone, cfg));
  const t = q.qtype;
  const answers = [];
  const authority = [];

  // Nameserver yang namanya ADA DI DALAM zone sendiri (mis. ns1.a-i.sh melayani a-i.sh)
  // wajib punya A record sendiri, kalau tidak delegasinya buntu: resolver butuh alamat
  // nameserver untuk bertanya, tapi alamat itu cuma bisa ditanyakan ke nameserver itu.
  // Registry menutup lingkaran ini lewat glue, dan kita harus menjawab yang cocok.
  if ((cfg.selfIp || cfg.selfIp6) && Array.isArray(cfg.ns)) {
    const nama = String(q.name).toLowerCase().replace(/\.$/, '');
    const cocok = cfg.ns.some((h) => String(h).toLowerCase().replace(/\.$/, '') === nama);
    if (cocok && matchZone(nama, zones)) {
      if (t === TYPE.A && cfg.selfIp) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(cfg.selfIp)));
      // AAAA nameserver bukan pemanis: resolver IPv6-only nggak punya jalan lain
      // sampai ke sini, dan RFC 8109 bikin resolver milih nameserver yang punya
      // dua-duanya. Tanpa ini, klien IPv6-only lihat zone-nya seolah mati.
      if (t === TYPE.AAAA && cfg.selfIp6) answers.push(answerRecord(TYPE.AAAA, cfg.ttl, ipv6ToBytes(cfg.selfIp6)));
      if (answers.length === 0) authority.push(soa()); // NODATA, bukan NXDOMAIN
      return buildResponse(q, { answers, authority });
    }
  }

  // ANY dijawab seminimal mungkin (semangat RFC 8482). Menjawab ANY dengan seluruh
  // isi apex memberi penyerang paket balasan besar dari query kecil — bandwidth kita
  // yang dipakai menyerang orang lain. Diukur sebelum tambalan ini: 6,75x.
  if (t === TYPE.ANY) {
    answers.push(answerRecord(TYPE.HINFO, cfg.minttl, hinfoRdata('RFC8482')));
    return buildResponse(q, { answers });
  }

  // Blokir diputuskan atas ALAMAT HASIL, bukan atas nama. parse.js sudah membakukan
  // semua bentuk penulisan, jadi tidak ada bentuk alternatif yang bisa menyelinap.
  if (cfg.blocklist && (parsed.kind === 'A' || parsed.kind === 'AAAA')) {
    if (cfg.blocklist.diblokir(parsed.ip, parsed.kind === 'AAAA')) {
      if (cfg.sinkholeIp && parsed.kind === 'A') {
        // Arahkan ke halaman penjelasan: korban tahu kenapa, pemilik situs tahu harus apa.
        return buildResponse(q, { answers: [answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(cfg.sinkholeIp))] });
      }
      return buildResponse(q, { rcode: RCODE.NXDOMAIN, authority: [soa()] });
    }
  }

  switch (parsed.kind) {
    case 'refused':
      return buildResponse(q, { rcode: RCODE.REFUSED });

    case 'nxdomain':
      // Dalam zone tapi bukan IP -> NXDOMAIN + SOA di authority (buat negative caching).
      authority.push(soa());
      return buildResponse(q, { rcode: RCODE.NXDOMAIN, authority });

    case 'apex':
      if (t === TYPE.SOA) answers.push(answerRecord(TYPE.SOA, cfg.minttl, soaRdata(zone, cfg)));
      if (t === TYPE.NS) for (const ns of cfg.ns) answers.push(answerRecord(TYPE.NS, cfg.ttl, encodeName(ns)));
      if (t === TYPE.A && cfg.apexIp) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(cfg.apexIp)));
      break;

    case 'A':
      if (t === TYPE.A) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(parsed.ip)));
      break;

    case 'AAAA':
      if (t === TYPE.AAAA) answers.push(answerRecord(TYPE.AAAA, cfg.ttl, ipv6ToBytes(parsed.ip)));
      break;
  }

  // Nama valid tapi tipe nggak ada isinya (mis. AAAA di nama IPv4) -> NODATA: NOERROR + SOA authority.
  if (answers.length === 0) authority.push(soa());
  return buildResponse(q, { answers, authority });
}
