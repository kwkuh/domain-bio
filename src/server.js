// server.js — authoritative DNS server buat layanan wildcard-IP (ala nip.io/sslip.io).
// Dengerin UDP/53 (utama) + TCP/53 (fallback). Semua jawaban dihitung dari nama query.

import dgram from 'node:dgram';
import net from 'node:net';
import { parseQuery, buildTruncated } from './wire.js';
import { resolve } from './resolve.js';
import { bukaDaftar } from './blocklist.js';
import { bikinPembatas } from './ratelimit.js';
import { bukaCatatan } from './querylog.js';

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

// Buffer terima soket. Default kernel (208 KB) cuma menampung ~250 paket DNS
// setelah overhead skbuff — satu klien tunggal bisa melampauinya tanpa niat jahat.
// Terukur di produksi sebelum tambalan ini: dari 5.000 query yang dikirim beruntun,
// kernel MEMBUANG 4.443 (`receive buffer errors`) sebelum Node sempat melihatnya.
// Prosesnya sendiri sehat — 557 masuk, 557 dijawab. Yang penuh bukan CPU, tapi antrean.
const RCVBUF = Number(process.env.RCVBUF || 4 * 1024 * 1024);

// Rate limiting (RRL). Angka per BLOK alamat, bukan per alamat tunggal — lihat
// ratelimit.js. Bawaan 100/dtk sengaja longgar: resolver besar seperti Google
// dan Cloudflare berbagi satu /24, jadi batas ketat menghukum pengguna sah lebih
// dulu daripada penyerang. RRL_PERDETIK=0 mematikan pembatas.
const RRL_PERDETIK = Number(process.env.RRL_PERDETIK ?? 100);
const RRL_LEDAKAN = process.env.RRL_LEDAKAN ? Number(process.env.RRL_LEDAKAN) : null;
const RRL_SLIP = Number(process.env.RRL_SLIP ?? 5);

/**
 * Serial SOA. Dulu `Date.now()/1000`, dan itu diam-diam salah: serialnya melompat
 * TIAP RESTART, dan dua nameserver TIDAK AKAN PERNAH punya angka yang sama. Begitu
 * ns2 menyala, pemeriksaan "serial seragam" merah permanen, dan alat pihak ketiga
 * (Zonemaster, dnsviz) melaporkannya sebagai zone yang tidak konsisten.
 *
 * Bentuk berbasis tanggal YYYYMMDDnn mengikuti RFC 1912 §2.2: sama di semua mesin,
 * naik secara wajar, dan tidak berubah gara-gara proses dinyalakan ulang.
 * SOA_SERIAL boleh menimpanya kalau nanti ada proses rilis yang menetapkannya.
 */
function serialHariIni() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const t = String(d.getUTCDate()).padStart(2, '0');
  return Number(`${y}${m}${t}01`);
}
const SERIAL = Number(process.env.SOA_SERIAL) || serialHariIni();

// Catatan query. Mati kalau QUERYLOG tidak diisi.
const catatan = bukaCatatan({
  berkas: process.env.QUERYLOG || null,
  penuh: process.env.QUERYLOG_PENUH === '1',
  log: (m) => console.log(m),
});

const pembatas = bikinPembatas({
  perDetik: RRL_PERDETIK,
  ledakan: RRL_LEDAKAN,
  slip: RRL_SLIP,
});

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
  serial: SERIAL,
  apexIp: process.env.APEX_IP || null, // opsional: A record buat apex (landing page)
  selfIp: SELF_IP && SELF_IP !== '0.0.0.0' ? SELF_IP : null,
  selfIp6: SELF_IP6 && SELF_IP6 !== '::' ? SELF_IP6 : null,
  sinkholeIp: SINKHOLE_IP,
  blocklist: daftarBlokir,
};

// Tipe yang benar-benar muncul di produksi, bukan cuma yang kita layani. CAA
// datang dari Let's Encrypt sebelum menerbitkan sertifikat, HTTPS/SVCB dari
// peramban modern, sisanya dari pemindai. Kalau tidak dinamai, semuanya muncul
// sebagai angka mentah di statistik dan tidak ada yang tahu artinya.
const TYPE_NAME = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT',
  28: 'AAAA', 33: 'SRV', 43: 'DS', 48: 'DNSKEY', 65: 'HTTPS', 99: 'SPF',
  255: 'ANY', 257: 'CAA',
};

function handle(msg, from, v6 = false, transport = 'udp') {
  const q = parseQuery(msg); // lempar kalau paket rusak
  if (DEBUG) console.log(`${from} ${q.name} ${TYPE_NAME[q.qtype] || q.qtype}`);
  const res = resolve(q, cfg);
  if (catatan.aktif) {
    catatan.catat({
      ip: from, v6, nama: q.name, qtype: TYPE_NAME[q.qtype] || q.qtype,
      rcode: res.readUInt16BE(2) & 0x0f, hasil: 'lolos', transport,
    });
  }
  return res;
}

// ---- UDP ----
// Dua soket terpisah, bukan satu soket v6 dual-stack. Alasannya operasional:
// dualstack bikin alamat klien IPv4 muncul sebagai "::ffff:1.2.3.4", dan jatuhnya
// beda per-OS (Linux ikut net.ipv6.bindv6only). Dua soket = perilaku yang sama
// di mana pun, dan matinya IPv6 nggak ikut menjatuhkan IPv4.
function pasangUdp(keluarga, alamat) {
  const sock = dgram.createSocket({ type: keluarga, ipv6Only: keluarga === 'udp6' });
  const v6 = keluarga === 'udp6';
  sock.on('message', (msg, rinfo) => {
    try {
      // Pembatas dipanggil SEBELUM resolve: query yang lewat batas tidak boleh
      // memakan CPU, dan yang 'buang' tidak boleh menghasilkan paket sama sekali —
      // paket itulah yang akan mendarat di korban kalau alamatnya dipalsukan.
      const putusan = pembatas.putuskan(rinfo.address, v6);
      if (putusan !== 'lolos') {
        // Query yang dibatasi tetap dicatat kalau catatan menyala. Justru ini yang
        // paling berguna waktu ada insiden: pola "siapa yang membanjiri" cuma
        // kelihatan dari query yang DITOLAK, dan itu persis yang hilang kalau
        // pembatas dipasang sebelum pencatat.
        if (catatan.aktif) {
          try {
            const q = parseQuery(msg);
            catatan.catat({ ip: rinfo.address, v6, nama: q.name, qtype: q.qtype, rcode: null, hasil: putusan, transport: 'udp' });
          } catch { /* paket rusak: tidak ada yang bisa dicatat */ }
        }
        if (putusan === 'buang') return;
        sock.send(buildTruncated(parseQuery(msg)), rinfo.port, rinfo.address);
        return;
      }
      sock.send(handle(msg, rinfo.address, v6, 'udp'), rinfo.port, rinfo.address);
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
  sock.bind(PORT, alamat, () => {
    // Minta buffer besar, lalu BACA BALIK yang benar-benar didapat. Kernel
    // memotong diam-diam di net.core.rmem_max, dan permintaan yang dipotong
    // terlihat persis seperti permintaan yang dikabulkan. Yang dicatat di log
    // harus angka yang nyata, bukan angka yang diminta.
    let nyata = null;
    try {
      sock.setRecvBufferSize(RCVBUF);
      nyata = sock.getRecvBufferSize();
    } catch (err) {
      console.error(`${keluarga}: gagal set buffer terima (${err.message}) — jalan dengan default kernel`);
    }
    const kurang = nyata !== null && nyata < RCVBUF;
    console.log(
      `UDP  ${alamat}:${PORT} zones=${ZONES.join(',')} ns=${cfg.ns.join(',')} ` +
      `blocklist=${BLOCKLIST ? daftarBlokir.jumlah + ' aturan' : 'mati'} ` +
      `rcvbuf=${nyata === null ? '?' : Math.round(nyata / 1024) + 'KB'}` +
      (kurang ? ` (diminta ${Math.round(RCVBUF / 1024)}KB, dipotong net.core.rmem_max)` : '') +
      ` rrl=${pembatas.aktif ? `${RRL_PERDETIK}/dtk per blok, slip ${RRL_SLIP}` : 'mati'}`
    );
  });
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
          const res = handle(msg, sock.remoteAddress, sock.remoteFamily === 'IPv6', 'tcp');
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
