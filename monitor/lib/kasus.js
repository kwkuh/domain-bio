// kasus.js — daftar pemeriksaan yang dijalankan ke SATU nameserver produksi.
//
// Aturan mainnya:
//   - tiap pemeriksaan nembak langsung ke IP satu nameserver (bukan lewat resolver),
//     jadi kalau ns2 mati sementara ns1 hidup, yang merah cuma ns2;
//   - tiap pemeriksaan dijalankan per-transport (UDP dan TCP) dan per-keluarga (v4/v6),
//     karena "hidup di UDP" bukan berarti "hidup di TCP" — resolver dunia nyata pakai dua-duanya;
//   - nama yang diuji selalu diacak, biar nggak ada cache (punya siapa pun) yang bisa
//     bikin server mati kelihatan hidup;
//   - yang diperiksa bukan cuma isi jawaban, tapi juga header: rcode, AA, RA, TC.

import { tanya, TYPE, ambil, NAMA_RCODE } from './dns.js';
import { ipv6ToBytes } from '../../src/parse.js';

const acak8 = () => Math.random().toString(36).slice(2, 10);
const oktet = () => Math.floor(Math.random() * 256);
const oktetTakNol = () => 1 + Math.floor(Math.random() * 254);
const rc = (n) => NAMA_RCODE[n] ?? `RCODE${n}`;

/** Bikin alamat IPv4 acak, plus semua ejaannya yang harus dikenali Open-Domain. */
function ipv4Acak() {
  const a = [oktetTakNol(), oktet(), oktet(), oktetTakNol()];
  const teks = a.join('.');
  const hex = a.map((n) => n.toString(16).padStart(2, '0')).join('');
  return { a, teks, titik: teks, strip: a.join('-'), hex };
}

/** Bikin alamat IPv6 acak dalam ejaan bergaris Open-Domain. */
function ipv6Acak() {
  const h = () => Math.floor(Math.random() * 0x10000).toString(16);
  const grup = [h(), h(), h()];
  return { teks: `2001:db8:${grup[0]}:${grup[1]}::${grup[2]}`, strip: `2001-db8-${grup[0]}-${grup[1]}--${grup[2]}` };
}

function wajib(syarat, pesan) { if (!syarat) throw new Error(pesan); }

/** Pemeriksaan header yang berlaku buat SEMUA jawaban otoritatif. */
function periksaHeaderOtoritatif(j, { bolehTanpaAA = false } = {}) {
  wajib(j.qr, 'QR mati — ini bukan paket jawaban');
  wajib(bolehTanpaAA || j.aa, 'AA mati — jawaban dari server otoritatif wajib AA=1 (kalau nggak: salah zone, atau ada yang mencegat)');
  wajib(!j.ra, 'RA nyala — nameserver kita nggak boleh ngaku bisa rekursi (tanda jawaban resolver/pembajak)');
  wajib(!j.tc, 'TC nyala — jawaban kepotong padahal harusnya muat');
}

/**
 * Susun semua kasus buat satu (zone, nameserver, transport).
 * Tiap kasus: { judul, jalankan: async () => catatan|undefined }
 */
export function susunKasus({ zone, ip, nama, transport, timeout = 4000 }) {
  const T = (name, type, opsi = {}) => tanya({ ip, name, type, transport, timeout, ...opsi });
  const K = [];
  const tambah = (judul, jalankan) => K.push({ judul, jalankan, zone, ip, nama, transport });

  // ---- apex: SOA & NS ----
  tambah('apex SOA: NOERROR + AA + satu SOA yang masuk akal', async () => {
    const j = await T(zone, TYPE.SOA);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 0, `rcode ${rc(j.rcode)}, harusnya NOERROR`);
    const soa = ambil(j.answers, TYPE.SOA);
    wajib(soa.length === 1, `SOA di answer ada ${soa.length}, harusnya 1`);
    const d = soa[0].data;
    wajib(d.serial > 0, 'serial SOA 0');
    wajib(d.mname && d.mname.includes('.'), `MNAME aneh: "${d.mname}"`);
    wajib(d.minimum > 0 && d.minimum <= 86400, `SOA minimum ${d.minimum} di luar akal (negative-cache TTL)`);
    return `mname=${d.mname} serial=${d.serial} min=${d.minimum} ${j.ms.toFixed(0)}ms`;
  });

  tambah('apex NS: NOERROR + AA + minimal 2 NS', async () => {
    const j = await T(zone, TYPE.NS);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 0, `rcode ${rc(j.rcode)}, harusnya NOERROR`);
    const ns = ambil(j.answers, TYPE.NS).map((rr) => rr.data).sort();
    wajib(ns.length >= 2, `cuma ${ns.length} NS di apex (${ns.join(', ') || '-'}) — satu nameserver = satu titik mati`);
    return ns.join(', ');
  });

  // ---- inti layanan: IP dihitung dari nama ----
  tambah('A dari IPv4 bertitik', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.titik}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a.length === 1 && a[0] === ip4.teks, `${ip4.titik}.${zone} -> ${a.join(',') || '(kosong)'}, harusnya ${ip4.teks}`);
    return `${ip4.titik} ok ${j.ms.toFixed(0)}ms`;
  });

  tambah('A dari IPv4 bergaris (bentuk buat wildcard TLS)', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a.length === 1 && a[0] === ip4.teks, `${ip4.strip}.${zone} -> ${a.join(',') || '(kosong)'}, harusnya ${ip4.teks}`);
  });

  tambah('A dari IPv4 heksa 8 digit', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.hex}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a.length === 1 && a[0] === ip4.teks, `${ip4.hex}.${zone} -> ${a.join(',') || '(kosong)'}, harusnya ${ip4.teks}`);
  });

  tambah('AAAA dari IPv6 bergaris', async () => {
    const ip6 = ipv6Acak();
    const j = await T(`${ip6.strip}.${zone}`, TYPE.AAAA);
    periksaHeaderOtoritatif(j);
    const rr = ambil(j.answers, TYPE.AAAA);
    wajib(rr.length === 1, `AAAA ada ${rr.length}, harusnya 1`);
    // Dibandingkan sebagai byte, biar bebas dari perkara ejaan "::".
    wajib(rr[0].rdata.equals(ipv6ToBytes(ip6.teks)), `${ip6.strip}.${zone} -> ${rr[0].data}, harusnya ${ip6.teks}`);
  });

  tambah('prefix bebas di depan IP tetap kejawab', async () => {
    const ip4 = ipv4Acak();
    const nama2 = `${acak8()}.${acak8()}.${ip4.strip}.${zone}`;
    const j = await T(nama2, TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a[0] === ip4.teks, `${nama2} -> ${a.join(',') || '(kosong)'}, harusnya ${ip4.teks}`);
  });

  tambah('huruf besar-kecil nggak ngaruh', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`.toUpperCase(), TYPE.A);
    periksaHeaderOtoritatif(j);
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a[0] === ip4.teks, `versi HURUF BESAR -> ${a.join(',') || '(kosong)'}, harusnya ${ip4.teks}`);
  });

  // ---- jawaban negatif: sama pentingnya ----
  tambah('nama dalam zone tapi bukan IP -> NXDOMAIN + SOA di authority', async () => {
    const j = await T(`${acak8()}.${acak8()}.${zone}`, TYPE.A);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 3, `rcode ${rc(j.rcode)}, harusnya NXDOMAIN`);
    wajib(ambil(j.authority, TYPE.SOA).length === 1, 'nggak ada SOA di authority — resolver jadi nggak bisa nge-cache jawaban negatif');
  });

  tambah('nama di luar zone -> REFUSED (bukan open resolver)', async () => {
    const j = await T(`${acak8()}.example.com`, TYPE.A);
    wajib(j.rcode === 5, `rcode ${rc(j.rcode)}, harusnya REFUSED — server otoritatif nggak boleh ngelayanin zone orang`);
    wajib(!j.ra, 'RA nyala di jawaban REFUSED — jangan ngaku bisa rekursi');
    wajib(j.answers.length === 0, 'ada answer buat nama di luar zone — ini gejala open resolver');
  });

  tambah('NODATA: AAAA atas nama IPv4 -> NOERROR + 0 answer + SOA authority', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.AAAA);
    periksaHeaderOtoritatif(j);
    wajib(j.rcode === 0, `rcode ${rc(j.rcode)}, harusnya NOERROR (NODATA, bukan NXDOMAIN)`);
    wajib(j.answers.length === 0, `ada ${j.answers.length} answer, harusnya kosong`);
    wajib(ambil(j.authority, TYPE.SOA).length === 1, 'NODATA tanpa SOA di authority');
  });

  // ---- kompatibilitas dunia nyata ----
  tambah('query ber-EDNS0 tetap dijawab benar', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.A, { edns: true });
    wajib(j.rcode !== 1, 'FORMERR buat query ber-OPT — resolver modern hampir selalu kirim EDNS0, ini bikin zone nggak keresolve');
    const a = ambil(j.answers, TYPE.A).map((r) => r.data);
    wajib(a[0] === ip4.teks, `dengan EDNS0 -> ${a.join(',') || '(kosong)'}, harusnya ${ip4.teks}`);
    const opt = j.additional.filter((rr) => rr.type === 41);
    return opt.length ? 'OPT dibalas' : 'dijawab, tapi OPT nggak dibalas (RFC 6891 minta dibalas; resolver umum masih maklum)';
  });

  tambah('waktu jawab masuk akal', async () => {
    const ip4 = ipv4Acak();
    const j = await T(`${ip4.strip}.${zone}`, TYPE.A);
    wajib(j.ms < 1500, `${j.ms.toFixed(0)}ms — kelamaan buat query otoritatif`);
    return `${j.ms.toFixed(0)}ms`;
  });

  return K;
}

/**
 * Pemeriksaan tingkat zone (bukan per nameserver): konsistensi armada.
 * @param {object} p { zone, delegasi:{ns,glue,sumber}, hasilApex: {ipNS: {ns:[], serial}} }
 */
export function susunKasusZone({ zone, delegasi, apexPerServer }) {
  const K = [];
  const tambah = (judul, jalankan) => K.push({ judul, jalankan, zone, ip: '-', nama: '(zone)', transport: '-' });

  tambah('delegasi induk punya minimal 2 nameserver', async () => {
    wajib(delegasi.ns.length >= 2, `delegasi cuma ${delegasi.ns.length} NS (${delegasi.ns.join(', ')}) — satu nameserver = satu titik mati`);
    return delegasi.ns.join(', ');
  });

  tambah('tiap nameserver di delegasi punya alamat', async () => {
    const buntung = delegasi.ns.filter((n) => !(delegasi.glue[n] || []).length);
    wajib(buntung.length === 0, `nggak ketemu A/AAAA buat: ${buntung.join(', ')}`);
  });

  tambah('tiap nameserver di delegasi punya alamat IPv6', async () => {
    const tanpaV6 = delegasi.ns.filter((n) => !(delegasi.glue[n] || []).some((ip) => ip.includes(':')));
    wajib(tanpaV6.length === 0, `belum ada AAAA buat: ${tanpaV6.join(', ')} — klien IPv6-only nggak bisa nyampe`);
  });

  tambah('NS di apex sama persis dengan delegasi induk', async () => {
    const dariInduk = [...delegasi.ns].sort().join(', ');
    for (const [kunci, isi] of Object.entries(apexPerServer)) {
      const dariApex = [...isi.ns].sort().join(', ');
      wajib(dariApex === dariInduk, `${kunci}: apex bilang [${dariApex}], induk bilang [${dariInduk}] — delegasi dan zone nggak sinkron`);
    }
    return dariInduk;
  });

  tambah('serial SOA seragam di semua nameserver', async () => {
    const serial = Object.entries(apexPerServer).map(([k, v]) => [k, v.serial]);
    const unik = [...new Set(serial.map(([, s]) => s))];
    wajib(unik.length <= 1, `serial beda-beda: ${serial.map(([k, s]) => `${k}=${s}`).join(', ')} — resolver bisa nganggep salah satu zone-nya basi`);
    return `serial=${unik[0]}`;
  });

  return K;
}
