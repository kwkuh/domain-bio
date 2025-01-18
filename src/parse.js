// parse.js — ekstraksi IP dari hostname (otak dari layanan wildcard-DNS).
//
// Semua jawaban DIHITUNG dari nama query, bukan disimpan di database.
// Contoh (zone = "a-i.sh"):
//   1.2.3.4.a-i.sh          -> A     1.2.3.4      (dotted)
//   1-2-3-4.a-i.sh          -> A     1.2.3.4      (dashed, buat wildcard TLS cert)
//   0a000001.a-i.sh         -> A     10.0.0.1     (hex 8 digit)
//   2001-db8--1.a-i.sh      -> AAAA  2001:db8::1  (IPv6 dashed, "-" ganti ":")
//   app.1.2.3.4.a-i.sh      -> A     1.2.3.4      (prefix bebas, IP diambil yg nempel zone)
//   a-i.sh                  -> apex  (SOA/NS)
//   foo.bar.a-i.sh          -> nxdomain (dalam zone tapi bukan IP)
//   google.com             -> refused (di luar zone)

import net from 'node:net';

const isOctet = (s) => /^\d{1,3}$/.test(s) && Number(s) <= 255;

/**
 * @returns {{kind:'apex'}
 *          |{kind:'A', ip:string}
 *          |{kind:'AAAA', ip:string}
 *          |{kind:'nxdomain'}
 *          |{kind:'refused'}}
 */
export function parseName(rawName, zone) {
  const name = String(rawName).toLowerCase().replace(/\.$/, '');
  zone = zone.toLowerCase();

  if (name === zone) return { kind: 'apex' };
  if (!name.endsWith('.' + zone)) return { kind: 'refused' }; // di luar zone kita

  const sub = name.slice(0, -(zone.length + 1)); // sisa label sebelum zone
  const labels = sub.split('.');
  const last = labels[labels.length - 1];

  // 1) IPv4 dashed: "1-2-3-4"
  const dash4 = last.match(/^(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})$/);
  if (dash4 && dash4.slice(1).every((o) => Number(o) <= 255)) {
    return { kind: 'A', ip: dash4.slice(1).join('.') };
  }

  // 2) IPv6 dashed: "-" -> ":", "--" -> "::"
  if (last.includes('-') && /^[0-9a-f-]+$/.test(last) && /[0-9a-f]/.test(last)) {
    const v6 = last.replace(/-/g, ':');
    if (net.isIPv6(v6)) return { kind: 'AAAA', ip: v6 };
  }

  // 3) Hex 8 digit -> IPv4 (mis. 0a000001 -> 10.0.0.1)
  if (/^[0-9a-f]{8}$/.test(last)) {
    const n = parseInt(last, 16);
    const ip = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    return { kind: 'A', ip };
  }

  // 4) IPv4 dotted: 4 label numerik yang nempel ke zone
  if (labels.length >= 4) {
    const last4 = labels.slice(-4);
    if (last4.every(isOctet)) return { kind: 'A', ip: last4.join('.') };
  }

  return { kind: 'nxdomain' }; // dalam zone tapi bukan bentuk IP
}

/** IPv4 string -> 4 byte Buffer */
export function ipv4ToBytes(ip) {
  return Buffer.from(ip.split('.').map((n) => parseInt(n, 10) & 255));
}

/** IPv6 string (boleh pakai "::") -> 16 byte Buffer */
export function ipv6ToBytes(ip) {
  const [head, tail] = ip.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail !== undefined ? (tail ? tail.split(':') : []) : null;

  let groups;
  if (tailGroups === null) {
    groups = headGroups; // nggak ada "::"
  } else {
    const missing = 8 - headGroups.length - tailGroups.length;
    groups = [...headGroups, ...Array(Math.max(0, missing)).fill('0'), ...tailGroups];
  }

  const buf = Buffer.alloc(16);
  for (let i = 0; i < 8; i++) {
    buf.writeUInt16BE(parseInt(groups[i] || '0', 16) & 0xffff, i * 2);
  }
  return buf;
}
