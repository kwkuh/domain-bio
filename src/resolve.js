// resolve.js — the logic: turn a query (name + type) into a DNS answer.
// Kept separate from transport (UDP/TCP) so it can be tested directly.

import { parseName, matchZone, ipv4ToBytes, ipv6ToBytes } from './parse.js';
import {
  TYPE, RCODE, encodeName, answerRecord, namedRecord, soaRdata, hinfoRdata, buildResponse,
} from './wire.js';

/**
 * @param {{id:number,flags:number,name:string,qtype:number,questionSection:Buffer}} q
 * @param {object} cfg  { zones:[...], ns:[...], ttl, refresh, retry, expire, minttl, serial,
 *                        apexIp?, apexIp6?, selfIp?, blocklist?, sinkholeIp? }
 *                      A single `zone` is still accepted for backward compatibility.
 * @returns {Buffer}
 */
export function resolve(q, cfg) {
  const zones = cfg.zones || cfg.zone;
  const parsed = parseName(q.name, zones);
  // SOA/NS must name the zone that actually matched, not the first one in the list.
  const zone = parsed.zone || (Array.isArray(zones) ? zones[0] : zones);
  const soa = () => namedRecord(zone, TYPE.SOA, cfg.minttl, soaRdata(zone, cfg));
  const t = q.qtype;
  const answers = [];
  const authority = [];

  // A nameserver whose name lives INSIDE its own zone (ns1.a-i.sh serving a-i.sh)
  // must have an address record of its own, or the delegation deadlocks: a resolver
  // needs the nameserver's address in order to ask it anything, but that address can
  // only be asked of that same nameserver. The registry breaks the circle with a glue
  // record, and we have to answer consistently with it.
  if ((cfg.selfIp || cfg.selfIp6) && Array.isArray(cfg.ns)) {
    const name = String(q.name).toLowerCase().replace(/\.$/, '');
    const isOurNs = cfg.ns.some((h) => String(h).toLowerCase().replace(/\.$/, '') === name);
    if (isOurNs && matchZone(name, zones)) {
      if (t === TYPE.A && cfg.selfIp) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(cfg.selfIp)));
      // The AAAA is not decoration: an IPv6-only resolver has no other way to reach
      // us, and RFC 8109 makes resolvers prefer nameservers that have both families.
      // Without it, IPv6-only clients see the zone as dead.
      if (t === TYPE.AAAA && cfg.selfIp6) answers.push(answerRecord(TYPE.AAAA, cfg.ttl, ipv6ToBytes(cfg.selfIp6)));
      if (answers.length === 0) authority.push(soa()); // NODATA, not NXDOMAIN
      return buildResponse(q, { answers, authority });
    }
  }

  // ANY is answered as small as possible (the spirit of RFC 8482). Answering ANY with
  // the whole apex hands an attacker a large reply for a small query — our bandwidth,
  // spent attacking someone else. Measured before this fix: 6.75x amplification.
  if (t === TYPE.ANY) {
    answers.push(answerRecord(TYPE.HINFO, cfg.minttl, hinfoRdata('RFC8482')));
    return buildResponse(q, { answers });
  }

  // Blocking is decided on the RESULTING ADDRESS, never on the name. parse.js has
  // already canonicalised every spelling, so no alternate form can slip past.
  if (cfg.blocklist && (parsed.kind === 'A' || parsed.kind === 'AAAA')) {
    if (cfg.blocklist.isBlocked(parsed.ip, parsed.kind === 'AAAA')) {
      if (cfg.sinkholeIp && parsed.kind === 'A') {
        // Point at an explanation page: the victim learns why, the site owner learns what to do.
        return buildResponse(q, { answers: [answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(cfg.sinkholeIp))] });
      }
      return buildResponse(q, { rcode: RCODE.NXDOMAIN, authority: [soa()] });
    }
  }

  switch (parsed.kind) {
    case 'refused':
      return buildResponse(q, { rcode: RCODE.REFUSED });

    case 'nxdomain':
      // Inside the zone but not an IP -> NXDOMAIN + SOA in authority, so resolvers
      // can cache the negative answer instead of asking again for every miss.
      authority.push(soa());
      return buildResponse(q, { rcode: RCODE.NXDOMAIN, authority });

    case 'apex':
      if (t === TYPE.SOA) answers.push(answerRecord(TYPE.SOA, cfg.minttl, soaRdata(zone, cfg)));
      if (t === TYPE.NS) for (const ns of cfg.ns) answers.push(answerRecord(TYPE.NS, cfg.ttl, encodeName(ns)));
      // The apex is the one name in the zone a human is likely to type into a browser.
      // Without an address it answers nothing, and a bare "a-i.st" looks like a dead
      // domain — which is a poor first impression for a service whose whole job is
      // making addresses work. Both families are served: an IPv6-only client typing
      // the apex deserves the same answer as everyone else.
      if (t === TYPE.A && cfg.apexIp) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(cfg.apexIp)));
      if (t === TYPE.AAAA && cfg.apexIp6) answers.push(answerRecord(TYPE.AAAA, cfg.ttl, ipv6ToBytes(cfg.apexIp6)));
      break;

    case 'A':
      if (t === TYPE.A) answers.push(answerRecord(TYPE.A, cfg.ttl, ipv4ToBytes(parsed.ip)));
      break;

    case 'AAAA':
      if (t === TYPE.AAAA) answers.push(answerRecord(TYPE.AAAA, cfg.ttl, ipv6ToBytes(parsed.ip)));
      break;
  }

  // Valid name, but nothing of that type (AAAA on an IPv4 name) -> NODATA: NOERROR + SOA.
  if (answers.length === 0) authority.push(soa());
  return buildResponse(q, { answers, authority });
}
