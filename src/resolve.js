// resolve.js — logika: dari query (nama + tipe) hasilkan jawaban DNS.
// Dipisah dari transport (UDP/TCP) biar gampang di-test.

import { parseName, ipv4ToBytes, ipv6ToBytes } from './parse.js';
import {
  TYPE, RCODE, encodeName, answerRecord, namedRecord, soaRdata, buildResponse,
} from './wire.js';

/**
 * @param {{id:number,flags:number,name:string,qtype:number,questionSection:Buffer}} q
 * @param {object} cfg  { zones:[...], ns:[...], ttl, refresh, retry, expire, minttl, serial, apexIp? }
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

  switch (parsed.kind) {
    case 'refused':
      return buildResponse(q, { rcode: RCODE.REFUSED });

    case 'nxdomain':
      // Dalam zone tapi bukan IP -> NXDOMAIN + SOA di authority (buat negative caching).
      authority.push(soa());
      return buildResponse(q, { rcode: RCODE.NXDOMAIN, authority });

    case 'apex':
      if (t === TYPE.SOA || t === TYPE.ANY) answers.push(answerRecord(TYPE.SOA, cfg.minttl, soaRdata(zone, cfg)));
      if (t === TYPE.NS || t === TYPE.ANY) for (const ns of cfg.ns) answers.push(answerRecord(TYPE.NS, cfg.ttl, encodeName(ns)));
      if ((t === TYPE.A || t === TYPE.ANY) && cfg.apexIp) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(cfg.apexIp)));
      break;

    case 'A':
      if (t === TYPE.A || t === TYPE.ANY) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(parsed.ip)));
      break;

    case 'AAAA':
      if (t === TYPE.AAAA || t === TYPE.ANY) answers.push(answerRecord(TYPE.AAAA, cfg.ttl, ipv6ToBytes(parsed.ip)));
      break;
  }

  // Nama valid tapi tipe nggak ada isinya (mis. AAAA di nama IPv4) -> NODATA: NOERROR + SOA authority.
  if (answers.length === 0) authority.push(soa());
  return buildResponse(q, { answers, authority });
}
