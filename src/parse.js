// parse.js — extracting an IP from a hostname (the brain of a wildcard-DNS service).
//
// Every answer is COMPUTED from the query name; nothing is stored in a database.
// One process can be authoritative for several zones at once (a-i.sh + a-i.st),
// so each result carries the `zone` it matched, keeping its SOA/NS consistent.
//
// Examples (zone = "a-i.sh"):
//   1.2.3.4.a-i.sh          -> A     1.2.3.4      (dotted)
//   1-2-3-4.a-i.sh          -> A     1.2.3.4      (dashed, one label for TLS)
//   0a000001.a-i.sh         -> A     10.0.0.1     (8 hex digits)
//   2001-db8--1.a-i.sh      -> AAAA  2001:db8::1  (dashed IPv6, "-" replaces ":")
//   app.1.2.3.4.a-i.sh      -> A     1.2.3.4      (any prefix; the IP nearest the zone wins)
//   a-i.sh                  -> apex  (SOA/NS)
//   foo.bar.a-i.sh          -> nxdomain (in the zone, but not an IP)
//   google.com              -> refused (outside every zone we serve)

import net from 'node:net';

const isOctet = (s) => /^\d{1,3}$/.test(s) && Number(s) <= 255;

/**
 * Canonicalise IPv4 into a single form. "01.02.03.04" and "001.002.003.004" name the
 * same address as "1.2.3.4", so all of them must come out as "1.2.3.4".
 *
 * ⚠️ This is not tidiness. The blocklist decides on the `ip` value produced here; if
 * leading zeros survived, a block on "1.2.3.4" could be walked around just by typing
 * "01.02.03.04" — the exact same destination.
 */
const canonicalV4 = (octets) => octets.map((o) => String(Number(o))).join('.');

/**
 * Find which zone contains a name. Longest match wins, so nested zones
 * ("a-i.sh" and "dev.a-i.sh") stay deterministic.
 * @param {string} rawName
 * @param {string|string[]} zones
 * @returns {string|null} the matching zone, or null if outside all of them
 */
export function matchZone(rawName, zones) {
  const name = String(rawName).toLowerCase().replace(/\.$/, '');
  const list = (Array.isArray(zones) ? zones : [zones])
    .map((z) => String(z).toLowerCase().replace(/^\.|\.$/g, ''))
    .filter(Boolean);

  let best = null;
  for (const zone of list) {
    if (name === zone || name.endsWith('.' + zone)) {
      if (!best || zone.length > best.length) best = zone;
    }
  }
  return best;
}

/**
 * @param {string} rawName
 * @param {string|string[]} zones  one zone or a list of them
 * @returns {{kind:'apex', zone:string}
 *          |{kind:'A', ip:string, zone:string}
 *          |{kind:'AAAA', ip:string, zone:string}
 *          |{kind:'nxdomain', zone:string}
 *          |{kind:'refused'}}
 */
export function parseName(rawName, zones) {
  const name = String(rawName).toLowerCase().replace(/\.$/, '');
  const zone = matchZone(name, zones);

  if (!zone) return { kind: 'refused' }; // outside every zone we serve
  if (name === zone) return { kind: 'apex', zone };

  const sub = name.slice(0, -(zone.length + 1)); // labels before the zone
  const labels = sub.split('.');
  const last = labels[labels.length - 1];

  // 1) Dashed IPv4: "1-2-3-4"
  const dash4 = last.match(/^(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})$/);
  if (dash4 && dash4.slice(1).every((o) => Number(o) <= 255)) {
    return { kind: 'A', ip: canonicalV4(dash4.slice(1)), zone };
  }

  // 2) Dashed IPv6: "-" becomes ":", "--" becomes "::"
  if (last.includes('-') && /^[0-9a-f-]+$/.test(last) && /[0-9a-f]/.test(last)) {
    const v6 = last.replace(/-/g, ':');
    if (net.isIPv6(v6)) return { kind: 'AAAA', ip: v6, zone };
  }

  // 3) Eight hex digits -> IPv4 (0a000001 -> 10.0.0.1)
  if (/^[0-9a-f]{8}$/.test(last)) {
    const n = parseInt(last, 16);
    const ip = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    return { kind: 'A', ip, zone };
  }

  // 4) Dotted IPv4: four numeric labels sitting next to the zone
  if (labels.length >= 4) {
    const last4 = labels.slice(-4);
    if (last4.every(isOctet)) return { kind: 'A', ip: canonicalV4(last4), zone };
  }

  return { kind: 'nxdomain', zone }; // in the zone, but not an address
}

/** IPv4 string -> 4-byte Buffer */
export function ipv4ToBytes(ip) {
  return Buffer.from(ip.split('.').map((n) => parseInt(n, 10) & 255));
}

/**
 * IPv6 -> eight four-hex groups with no "::" ("2a01:4f8::1" -> ["2a01","04f8",...,"0001"]).
 *
 * Used anywhere an address has to be compared or grouped. IPv6 spelling is not unique:
 * "2a01:4f8:0:1::1" and "2a01:4f8::1" can name the same /48, and slicing the raw string
 * gives different keys for the same network — exactly the failure that makes grouping
 * useless.
 */
export function expandV6(ip) {
  const [head, tail] = String(ip).split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined ? (tail ? tail.split(':') : []) : null;
  const groups = t === null ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  const out = [];
  for (let i = 0; i < 8; i++) out.push((parseInt(groups[i] || '0', 16) & 0xffff).toString(16).padStart(4, '0'));
  return out;
}

/** IPv6 string (may use "::") -> 16-byte Buffer */
export function ipv6ToBytes(ip) {
  const groups = expandV6(ip);
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 8; i++) buf.writeUInt16BE(parseInt(groups[i], 16) & 0xffff, i * 2);
  return buf;
}
