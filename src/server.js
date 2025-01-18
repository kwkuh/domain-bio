// server.js — authoritative DNS server buat layanan wildcard-IP (ala nip.io/sslip.io).
// Dengerin UDP/53 (utama) + TCP/53 (fallback). Semua jawaban dihitung dari nama query.

import dgram from 'node:dgram';
import net from 'node:net';
import { parseQuery } from './wire.js';
import { resolve } from './resolve.js';

// ---- Config dari env ----
const ZONE = (process.env.ZONE || 'a-i.sh').toLowerCase();
const PORT = Number(process.env.PORT || 53); // lokal: pakai 5353 (port <1024 butuh root)
const BIND = process.env.BIND || '0.0.0.0';
const DEBUG = process.env.DEBUG === '1';

const cfg = {
  zone: ZONE,
  ns: (process.env.NS_HOSTS || `ns1.${ZONE},ns2.${ZONE}`).split(',').map((s) => s.trim()),
  ttl: Number(process.env.TTL || 300),
  refresh: Number(process.env.SOA_REFRESH || 3600),
  retry: Number(process.env.SOA_RETRY || 600),
  expire: Number(process.env.SOA_EXPIRE || 604800),
  minttl: Number(process.env.SOA_MINTTL || 60),
  serial: Math.floor(Date.now() / 1000), // serial naik tiap restart
  apexIp: process.env.APEX_IP || null, // opsional: A record buat apex (landing page)
};

const TYPE_NAME = { 1: 'A', 2: 'NS', 6: 'SOA', 16: 'TXT', 28: 'AAAA', 255: 'ANY' };

function handle(msg, from) {
  const q = parseQuery(msg); // lempar kalau paket rusak
  if (DEBUG) console.log(`${from} ${q.name} ${TYPE_NAME[q.qtype] || q.qtype}`);
  return resolve(q, cfg);
}

// ---- UDP ----
const udp = dgram.createSocket('udp4');
udp.on('message', (msg, rinfo) => {
  try {
    udp.send(handle(msg, rinfo.address), rinfo.port, rinfo.address);
  } catch (err) {
    if (DEBUG) console.error('udp:', err.message);
  }
});
udp.on('error', (err) => { console.error('udp fatal:', err.message); process.exit(1); });
udp.bind(PORT, BIND, () => console.log(`UDP  :${PORT} zone=${ZONE} ns=${cfg.ns.join(',')}`));

// ---- TCP (fallback: paket diawali 2 byte panjang) ----
const tcp = net.createServer((sock) => {
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
tcp.on('error', (err) => { console.error('tcp fatal:', err.message); process.exit(1); });
tcp.listen(PORT, BIND, () => console.log(`TCP  :${PORT}`));

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
