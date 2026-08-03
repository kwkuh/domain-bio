// dns.js — a tiny DNS client for monitoring: send one query to ONE specific server
// (UDP atau TCP, IPv4 atau IPv6), lalu bongkar jawabannya apa adanya.
//
// Kenapa nulis klien sendiri, bukan manggil `dig`:
//   - a GitHub Actions runner is not guaranteed to have dig (dnsutils is often absent);
//   - `dig +short` hides the header (rcode, AA, RA, ID) — and the header is exactly what
//     tells a GENUINE answer apart from a HIJACKED one;
//   - this repo has zero dependencies, so its instrument must have zero dependencies too.
//
// Every query is sent with RD=0 (recursion desired off). An authoritative server has no
// use for recursion; anything answering with RA=1 means we are talking to a resolver,
// bukan sama nameserver kita.

import dgram from 'node:dgram';
import net from 'node:net';
import crypto from 'node:crypto';
import { TYPE, CLASS_IN, encodeName } from '../../src/wire.js';

export { TYPE };
export const NAMA_RCODE = ['NOERROR', 'FORMERR', 'SERVFAIL', 'NXDOMAIN', 'NOTIMP', 'REFUSED'];
export const NAMA_TYPE = { 1: 'A', 2: 'NS', 6: 'SOA', 16: 'TXT', 28: 'AAAA', 41: 'OPT', 255: 'ANY' };

/** An empty OPT record (EDNS0, 1232-byte buffer) for the additional section. */
function optRecord(udpSize = 1232) {
  const b = Buffer.alloc(11);
  b.writeUInt8(0, 0); // root name
  b.writeUInt16BE(41, 1); // TYPE = OPT
  b.writeUInt16BE(udpSize, 3); // CLASS is reused as the buffer size
  b.writeUInt32BE(0, 5); // TTL: extended rcode + versi + flags
  b.writeUInt16BE(0, 9); // RDLENGTH
  return b;
}

/** Nama root ditulis "." di mana-mana, tapi di kawat dia nama KOSONG (satu byte 0). */
const namaKawat = (n) => (n === '.' ? '' : String(n).replace(/\.$/, ''));

/** Build a query packet. rd=false and edns=false are the defaults we want. */
export function buatQuery({ name, type, id, rd = false, edns = false }) {
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(rd ? 0x0100 : 0x0000, 2);
  header.writeUInt16BE(1, 4); // qdcount
  header.writeUInt16BE(0, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(edns ? 1 : 0, 10); // arcount
  const ekor = Buffer.alloc(4);
  ekor.writeUInt16BE(type, 0);
  ekor.writeUInt16BE(CLASS_IN, 2);
  const bagian = [header, encodeName(namaKawat(name)), ekor];
  if (edns) bagian.push(optRecord());
  return Buffer.concat(bagian);
}

/** Baca nama berlabel, ikutin pointer kompresi. Balikin [nama, offset setelah nama]. */
function bacaNama(buf, off) {
  const label = [];
  let lompat = null;
  let langkah = 0;
  while (true) {
    if (off >= buf.length) throw new Error('name truncated');
    if (++langkah > 128) throw new Error('pointer loop in name');
    const len = buf[off];
    if (len === 0) { off += 1; break; }
    if ((len & 0xc0) === 0xc0) {
      const target = ((len & 0x3f) << 8) | buf[off + 1];
      if (lompat === null) lompat = off + 2;
      off = target;
      continue;
    }
    label.push(buf.toString('ascii', off + 1, off + 1 + len));
    off += 1 + len;
  }
  return [label.join('.').toLowerCase(), lompat === null ? off : lompat];
}

/** 16 bytes -> a compact IPv6 string (using "::" for the longest run of zeros). */
function bytesKeIpv6(b) {
  const g = [];
  for (let i = 0; i < 8; i++) g.push(b.readUInt16BE(i * 2).toString(16));
  let awal = -1, panjang = 0, a = -1, p = 0;
  for (let i = 0; i < 8; i++) {
    if (g[i] === '0') { if (a < 0) a = i; p++; if (p > panjang) { awal = a; panjang = p; } }
    else { a = -1; p = 0; }
  }
  if (panjang < 2) return g.join(':');
  return (g.slice(0, awal).join(':') + '::' + g.slice(awal + panjang).join(':')).replace(/:{3,}/, '::');
}

/** Bongkar satu resource record. */
function bacaRR(buf, off) {
  const [nama, o1] = bacaNama(buf, off);
  const type = buf.readUInt16BE(o1);
  const kelas = buf.readUInt16BE(o1 + 2);
  const ttl = buf.readUInt32BE(o1 + 4);
  const rdlen = buf.readUInt16BE(o1 + 8);
  const rdOff = o1 + 10;
  const rdata = buf.subarray(rdOff, rdOff + rdlen);
  const rr = { nama, type, kelas, ttl, rdata };

  if (type === TYPE.A && rdlen === 4) rr.data = [...rdata].join('.');
  else if (type === TYPE.AAAA && rdlen === 16) rr.data = bytesKeIpv6(rdata);
  else if (type === TYPE.NS) rr.data = bacaNama(buf, rdOff)[0];
  else if (type === TYPE.SOA) {
    const [mname, o2] = bacaNama(buf, rdOff);
    const [rname, o3] = bacaNama(buf, o2);
    rr.data = {
      mname,
      rname,
      serial: buf.readUInt32BE(o3),
      refresh: buf.readUInt32BE(o3 + 4),
      retry: buf.readUInt32BE(o3 + 8),
      expire: buf.readUInt32BE(o3 + 12),
      minimum: buf.readUInt32BE(o3 + 16),
    };
  } else if (type === TYPE.TXT) {
    const potongan = [];
    let p = 0;
    while (p < rdata.length) { const n = rdata[p]; potongan.push(rdata.toString('ascii', p + 1, p + 1 + n)); p += 1 + n; }
    rr.data = potongan.join('');
  }
  return [rr, rdOff + rdlen];
}

/** Unpack a complete reply packet into an object. */
export function bacaJawaban(buf) {
  if (buf.length < 12) throw new Error('paket kependekan');
  const flags = buf.readUInt16BE(2);
  const hasil = {
    id: buf.readUInt16BE(0),
    qr: !!(flags & 0x8000),
    opcode: (flags >> 11) & 0xf,
    aa: !!(flags & 0x0400),
    tc: !!(flags & 0x0200),
    rd: !!(flags & 0x0100),
    ra: !!(flags & 0x0080),
    rcode: flags & 0xf,
    pertanyaan: null,
    answers: [],
    authority: [],
    additional: [],
  };
  const qd = buf.readUInt16BE(4);
  const counts = [buf.readUInt16BE(6), buf.readUInt16BE(8), buf.readUInt16BE(10)];

  let off = 12;
  for (let i = 0; i < qd; i++) {
    const [nama, o] = bacaNama(buf, off);
    if (i === 0) hasil.pertanyaan = { nama, type: buf.readUInt16BE(o), kelas: buf.readUInt16BE(o + 2) };
    off = o + 4;
  }
  const bagian = ['answers', 'authority', 'additional'];
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < counts[s]; i++) {
      const [rr, o] = bacaRR(buf, off);
      hasil[bagian[s]].push(rr);
      off = o;
    }
  }
  return hasil;
}

function kirimUdp(ip, paket, timeout, port) {
  return new Promise((selesai, gagal) => {
    const sock = dgram.createSocket(net.isIPv6(ip) ? 'udp6' : 'udp4');
    const jam = setTimeout(() => { tutup(); gagal(new Error(`timeout udp ${timeout}ms`)); }, timeout);
    const tutup = () => { clearTimeout(jam); try { sock.close(); } catch {} };
    sock.on('message', (msg) => { tutup(); selesai(msg); });
    sock.on('error', (e) => { tutup(); gagal(e); });
    sock.send(paket, port, ip, (e) => { if (e) { tutup(); gagal(e); } });
  });
}

function kirimTcp(ip, paket, timeout, port) {
  return new Promise((selesai, gagal) => {
    const berbingkai = Buffer.alloc(2 + paket.length);
    berbingkai.writeUInt16BE(paket.length, 0);
    paket.copy(berbingkai, 2);
    const sock = net.connect({ host: ip, port });
    let buf = Buffer.alloc(0);
    const tutup = () => { sock.destroy(); };
    sock.setTimeout(timeout, () => { tutup(); gagal(new Error(`timeout tcp ${timeout}ms`)); });
    sock.on('connect', () => sock.write(berbingkai));
    sock.on('data', (c) => {
      buf = Buffer.concat([buf, c]);
      if (buf.length >= 2 && buf.length >= 2 + buf.readUInt16BE(0)) {
        const len = buf.readUInt16BE(0);
        tutup();
        selesai(buf.subarray(2, 2 + len));
      }
    });
    sock.on('error', (e) => { tutup(); gagal(e); });
    sock.on('close', () => gagal(new Error('koneksi tcp ditutup sebelum jawaban lengkap')));
  });
}

/**
 * Tanya satu server DNS langsung (tanpa resolver rekursif).
 * @returns {Promise<object>} jawaban terbongkar + `ms` (lama jawab) + `dikirim`
 */
export async function tanya({ ip, name, type, transport = 'udp', timeout = 4000, rd = false, edns = false, port = 53 }) {
  const id = crypto.randomInt(0, 65536);
  const paket = buatQuery({ name, type, id, rd, edns });
  const mulai = process.hrtime.bigint();
  const mentah = transport === 'tcp'
    ? await kirimTcp(ip, paket, timeout, port)
    : await kirimUdp(ip, paket, timeout, port);
  const ms = Number(process.hrtime.bigint() - mulai) / 1e6;
  const jwb = bacaJawaban(mentah);

  // Two cheap, mandatory anti-spoof checks: the ID must come back unchanged, and
  // the question must be echoed exactly. An answer failing either belongs to someone else.
  if (jwb.id !== id) throw new Error(`reply ID mismatch (sent ${id}, got ${jwb.id}) — something injected an answer`);
  const namaMinta = namaKawat(String(name).toLowerCase());
  if (!jwb.pertanyaan || jwb.pertanyaan.nama !== namaMinta || jwb.pertanyaan.type !== type) {
    throw new Error(`question section not echoed (asked ${namaMinta}/${type}, got ${jwb.pertanyaan?.nama}/${jwb.pertanyaan?.type})`);
  }
  return { ...jwb, ms, dikirim: { ip, name: namaMinta, type, transport, port } };
}

/** Take every record of a given type out of a section. */
export const ambil = (list, type) => list.filter((rr) => rr.type === type);
