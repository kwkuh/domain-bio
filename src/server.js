// server.js — authoritative DNS server buat layanan wildcard-IP (ala nip.io/sslip.io).
// Dengerin UDP/53 (utama) + TCP/53 (fallback). Semua jawaban dihitung dari nama query.

import dgram from 'node:dgram';
import net from 'node:net';
import { parseQuery } from './wire.js';
import { resolve } from './resolve.js';
import { bukaDaftar } from './blocklist.js';

// ---- Config dari env ----
// ZONES = daftar zone yang kita layani, dipisah koma. Satu proses bisa otoritatif
// buat beberapa suffix sekaligus (Open-Domain jalan di a-i.sh DAN a-i.st).
// ZONE (tunggal) masih dibaca demi kompatibilitas ke belakang.
const ZONES = (process.env.ZONES || process.env.ZONE || 'a-i.sh,a-i.st')
  .split(',')
  .map((s) => s.trim().toLowerCase().replace(/^\.|\.$/g, ''))
  .filter(Boolean);
const PORT = Number(process.env.PORT || 53); // lokal: pakai 5353 (port <1024 butuh root)
const BIND = process.env.BIND || '0.0.0.0';
// Alamat IPv6 buat didengerin. Kosongkan (BIND6="") kalau mesinnya nggak punya IPv6.
const BIND6 = process.env.BIND6 === undefined ? '::' : process.env.BIND6;
const DEBUG = process.env.DEBUG === '1';
const BLOCKLIST = process.env.BLOCKLIST || null;   // path berkas aturan
const SELF_IP = process.env.SELF_IP || process.env.BIND || null; // buat A record ns1/ns2 in-zone
const SELF_IP6 = process.env.SELF_IP6 || null;                   // buat AAAA record ns1/ns2 in-zone
const SINKHOLE_IP = process.env.SINKHOLE_IP || null; // kalau diisi, blokir -> alamat ini, bukan NXDOMAIN

const daftarBlokir = bukaDaftar({ berkas: BLOCKLIST, log: (m) => console.log(m) });

const cfg = {
  zones: ZONES,
  // Default sengaja pakai nama IN-ZONE: tiap zone menyimpan satu nameserver di dalam
  // dirinya sendiri (dipecahkan lewat glue di registry) dan satu di zone yang lain.
  // Nama di luar kedua zone (mis. ns1.open-domain.com) bikin delegasi bergantung pada
  // domain ketiga — kalau domain itu bermasalah, dua-duanya ikut mati.
  ns: (process.env.NS_HOSTS || 'ns1.a-i.sh,ns2.a-i.st').split(',').map((s) => s.trim()),
  ttl: Number(process.env.TTL || 300),
  refresh: Number(process.env.SOA_REFRESH || 3600),
  retry: Number(process.env.SOA_RETRY || 600),
  expire: Number(process.env.SOA_EXPIRE || 604800),
  minttl: Number(process.env.SOA_MINTTL || 60),
  serial: Math.floor(Date.now() / 1000), // serial naik tiap restart
  apexIp: process.env.APEX_IP || null, // opsional: A record buat apex (landing page)
  selfIp: SELF_IP && SELF_IP !== '0.0.0.0' ? SELF_IP : null,
  selfIp6: SELF_IP6 && SELF_IP6 !== '::' ? SELF_IP6 : null,
  sinkholeIp: SINKHOLE_IP,
  blocklist: daftarBlokir,
};

const TYPE_NAME = { 1: 'A', 2: 'NS', 6: 'SOA', 16: 'TXT', 28: 'AAAA', 255: 'ANY' };

function handle(msg, from) {
  const q = parseQuery(msg); // lempar kalau paket rusak
  if (DEBUG) console.log(`${from} ${q.name} ${TYPE_NAME[q.qtype] || q.qtype}`);
  return resolve(q, cfg);
}

// ---- UDP ----
// Dua soket terpisah, bukan satu soket v6 dual-stack. Alasannya operasional:
// dualstack bikin alamat klien IPv4 muncul sebagai "::ffff:1.2.3.4", dan jatuhnya
// beda per-OS (Linux ikut net.ipv6.bindv6only). Dua soket = perilaku yang sama
// di mana pun, dan matinya IPv6 nggak ikut menjatuhkan IPv4.
function pasangUdp(keluarga, alamat) {
  const sock = dgram.createSocket({ type: keluarga, ipv6Only: keluarga === 'udp6' });
  sock.on('message', (msg, rinfo) => {
    try {
      sock.send(handle(msg, rinfo.address), rinfo.port, rinfo.address);
    } catch (err) {
      if (DEBUG) console.error(`${keluarga}:`, err.message);
    }
  });
  sock.on('error', (err) => {
    // IPv4 wajib hidup. IPv6 opsional: mesin tanpa IPv6 nggak boleh gagal start
    // gara-gara ini — layanan v4-nya masih berguna sepenuhnya.
    if (keluarga === 'udp4') { console.error('udp4 fatal:', err.message); process.exit(1); }
    console.error(`udp6 mati (${err.message}) — lanjut IPv4 saja`);
  });
  sock.bind(PORT, alamat, () => console.log(`UDP  ${alamat}:${PORT} zones=${ZONES.join(',')} ns=${cfg.ns.join(',')} blocklist=${BLOCKLIST ? daftarBlokir.jumlah + ' aturan' : 'mati'}`));
  return sock;
}
pasangUdp('udp4', BIND);
if (BIND6) pasangUdp('udp6', BIND6);

// ---- TCP (fallback: paket diawali 2 byte panjang) ----
function bikinTcp() {
  return net.createServer((sock) => {
    let buf = Buffer.alloc(0);
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const len = buf.readUInt16BE(0);
        if (buf.length < 2 + len) break;
        const msg = buf.subarray(2, 2 + len);
        buf = buf.subarray(2 + len);
        try {
          const res = handle(msg, sock.remoteAddress);
          const framed = Buffer.alloc(2 + res.length);
          framed.writeUInt16BE(res.length, 0);
          res.copy(framed, 2);
          sock.write(framed);
        } catch (err) {
          if (DEBUG) console.error('tcp:', err.message);
          sock.end();
        }
      }
    });
    sock.on('error', () => {});
    sock.setTimeout(5000, () => sock.end());
  });
}

function pasangTcp(alamat, wajib) {
  const srv = bikinTcp();
  srv.on('error', (err) => {
    if (wajib) { console.error('tcp fatal:', err.message); process.exit(1); }
    console.error(`tcp6 mati (${err.message}) — lanjut IPv4 saja`);
  });
  srv.listen({ port: PORT, host: alamat, ipv6Only: !wajib }, () => console.log(`TCP  ${alamat}:${PORT}`));
  return srv;
}
pasangTcp(BIND, true);
if (BIND6) pasangTcp(BIND6, false);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
