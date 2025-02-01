// parse.js — ekstraksi IP dari hostname (otak dari layanan wildcard-DNS).
//
// Semua jawaban DIHITUNG dari nama query, bukan disimpan di database.
// Satu server bisa otoritatif buat BEBERAPA zone sekaligus (mis. a-i.sh + a-i.st);
// tiap hasil bawa `zone` yang kena match, biar SOA/NS-nya nyambung ke zone yang bener.
//
// Contoh (zone = "a-i.sh"):
//   1.2.3.4.a-i.sh          -> A     1.2.3.4      (dotted)
//   1-2-3-4.a-i.sh          -> A     1.2.3.4      (dashed, buat wildcard TLS cert)
//   0a000001.a-i.sh         -> A     10.0.0.1     (hex 8 digit)
//   2001-db8--1.a-i.sh      -> AAAA  2001:db8::1  (IPv6 dashed, "-" ganti ":")
//   app.1.2.3.4.a-i.sh      -> A     1.2.3.4      (prefix bebas, IP diambil yg nempel zone)
//   a-i.sh                  -> apex  (SOA/NS)
//   foo.bar.a-i.sh          -> nxdomain (dalam zone tapi bukan IP)
//   google.com             -> refused (di luar semua zone)

import net from 'node:net';

const isOctet = (s) => /^\d{1,3}$/.test(s) && Number(s) <= 255;

/**
 * Bakukan IPv4 jadi satu bentuk. "01.02.03.04" dan "001.002.003.004" menunjuk alamat
 * yang sama dengan "1.2.3.4", jadi keduanya HARUS keluar sebagai "1.2.3.4".
 *
 * ⚠️ Ini bukan kerapian belaka. Blocklist memutuskan berdasarkan nilai `ip` di sini;
 * kalau nol di depan dibiarkan lolos, "1.2.3.4" yang diblokir bisa ditembus cukup
 * dengan mengetik "01.02.03.04" — alamat tujuannya sama persis.
 */
const bakukanV4 = (oktet) => oktet.map((o) => String(Number(o))).join('.');

/**
 * Cari zone mana yang mencakup sebuah nama. Match terpanjang menang, jadi zone
 * yang saling menaungi (mis. "a-i.sh" dan "dev.a-i.sh") tetap deterministik.
 * @param {string} rawName
 * @param {string|string[]} zones
 * @returns {string|null} zone yang kena, atau null kalau di luar semuanya
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
 * @param {string|string[]} zones  satu zone atau daftar zone
 * @returns {{kind:'apex', zone:string}
 *          |{kind:'A', ip:string, zone:string}
 *          |{kind:'AAAA', ip:string, zone:string}
 *          |{kind:'nxdomain', zone:string}
 *          |{kind:'refused'}}
 */
export function parseName(rawName, zones) {
  const name = String(rawName).toLowerCase().replace(/\.$/, '');
  const zone = matchZone(name, zones);

  if (!zone) return { kind: 'refused' }; // di luar semua zone kita
  if (name === zone) return { kind: 'apex', zone };

  const sub = name.slice(0, -(zone.length + 1)); // sisa label sebelum zone
  const labels = sub.split('.');
  const last = labels[labels.length - 1];

  // 1) IPv4 dashed: "1-2-3-4"
  const dash4 = last.match(/^(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})$/);
  if (dash4 && dash4.slice(1).every((o) => Number(o) <= 255)) {
    return { kind: 'A', ip: bakukanV4(dash4.slice(1)), zone };
  }

  // 2) IPv6 dashed: "-" -> ":", "--" -> "::"
  if (last.includes('-') && /^[0-9a-f-]+$/.test(last) && /[0-9a-f]/.test(last)) {
    const v6 = last.replace(/-/g, ':');
    if (net.isIPv6(v6)) return { kind: 'AAAA', ip: v6, zone };
  }

  // 3) Hex 8 digit -> IPv4 (mis. 0a000001 -> 10.0.0.1)
  if (/^[0-9a-f]{8}$/.test(last)) {
    const n = parseInt(last, 16);
    const ip = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    return { kind: 'A', ip, zone };
  }

  // 4) IPv4 dotted: 4 label numerik yang nempel ke zone
  if (labels.length >= 4) {
    const last4 = labels.slice(-4);
    if (last4.every(isOctet)) return { kind: 'A', ip: bakukanV4(last4), zone };
  }

  return { kind: 'nxdomain', zone }; // dalam zone tapi bukan bentuk IP
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
