// blocklist.js — daftar alamat yang tidak boleh dijawab.
//
// Kenapa ada: layanan wildcard-IP gratis PASTI dipakai untuk phishing. Tanpa cara
// mengeksekusi laporan penyalahgunaan, janji "act within 72 hours" di ABUSE.md cuma
// kalimat, dan registrar bisa menangguhkan domainnya — itu risiko ketersediaan,
// bukan sekadar reputasi.
//
// Prinsip yang bikin ini tidak bisa ditembus:
//   Keputusan diambil atas ALAMAT HASIL, bukan atas string nama.
// parse.js sudah membakukan semua bentuk penulisan ke satu alamat, jadi
// 1.2.3.4 / 01.02.03.04 / 1-2-3-4 / 0a000001 / apa-aja.1.2.3.4 — semuanya
// tiba di sini sebagai "1.2.3.4". Tidak ada jalan memutar lewat cara mengetik.
//
// Bentuk berkas (satu aturan per baris, "#" komentar):
//   ip     203.0.113.10          blokir satu alamat
//   cidr   203.0.113.0/24        blokir satu blok
//   allow  203.0.113.5           pengecualian — SELALU menang atas blokir
//
// Muat ulang tanpa restart: kirim SIGHUP, atau biarkan pemeriksaan mtime berkala.
// Kalau berkas rusak atau hilang saat dimuat ulang, daftar LAMA dipertahankan —
// gagal-muat tidak boleh diam-diam membuka semua yang tadinya terblokir.

import fs from 'node:fs';
import net from 'node:net';

/** IPv4 "1.2.3.4" -> bilangan 32-bit */
const v4ToInt = (ip) => ip.split('.').reduce((n, o) => (n * 256) + (Number(o) & 255), 0);

/** IPv6 -> BigInt 128-bit (menerima bentuk "::") */
function v6ToBig(ip) {
  const [head, tail] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined ? (tail ? tail.split(':') : []) : null;
  const groups = t === null ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 16n) | BigInt(parseInt(groups[i] || '0', 16) & 0xffff);
  return n;
}

/** Ubah satu baris jadi penguji. Balikan null kalau barisnya tidak dikenali. */
function bikinPenguji(jenis, nilai) {
  if (jenis === 'ip') {
    if (net.isIPv4(nilai)) { const a = v4ToInt(nilai); return (ip, v6) => !v6 && v4ToInt(ip) === a; }
    if (net.isIPv6(nilai)) { const a = v6ToBig(nilai); return (ip, v6) => v6 && v6ToBig(ip) === a; }
    return null;
  }
  if (jenis === 'cidr') {
    const [alamat, bitsRaw] = nilai.split('/');
    const bits = Number(bitsRaw);
    if (!Number.isInteger(bits)) return null;
    if (net.isIPv4(alamat) && bits >= 0 && bits <= 32) {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      const jaringan = (v4ToInt(alamat) & mask) >>> 0;
      return (ip, v6) => !v6 && ((v4ToInt(ip) & mask) >>> 0) === jaringan;
    }
    if (net.isIPv6(alamat) && bits >= 0 && bits <= 128) {
      const mask = bits === 0 ? 0n : (~0n << BigInt(128 - bits)) & ((1n << 128n) - 1n);
      const jaringan = v6ToBig(alamat) & mask;
      return (ip, v6) => v6 && (v6ToBig(ip) & mask) === jaringan;
    }
    return null;
  }
  return null;
}

/** Baca teks aturan jadi snapshot yang tidak berubah lagi setelah jadi. */
export function bacaAturan(teks) {
  const blokir = [];
  const izin = [];
  const salah = [];
  const baris = String(teks).split(/\r?\n/);

  baris.forEach((b, i) => {
    const bersih = b.replace(/#.*$/, '').trim();
    if (!bersih) return;
    const bagian = bersih.split(/\s+/);
    const kata = bagian[0].toLowerCase();
    const nilai = bagian[1];
    if (!nilai) { salah.push(`baris ${i + 1}: "${bersih}" tanpa nilai`); return; }

    if (kata === 'allow') {
      const p = bikinPenguji(nilai.includes('/') ? 'cidr' : 'ip', nilai);
      if (p) izin.push(p); else salah.push(`baris ${i + 1}: allow "${nilai}" tidak dikenali`);
      return;
    }
    if (kata === 'ip' || kata === 'cidr') {
      const p = bikinPenguji(kata, nilai);
      if (p) blokir.push(p); else salah.push(`baris ${i + 1}: ${kata} "${nilai}" tidak dikenali`);
      return;
    }
    salah.push(`baris ${i + 1}: jenis aturan "${kata}" tidak dikenal`);
  });

  return {
    jumlah: blokir.length,
    jumlahIzin: izin.length,
    salah,
    /** @returns {boolean} true kalau alamat ini harus ditolak */
    diblokir(ip, v6 = false) {
      for (const p of izin) if (p(ip, v6)) return false; // pengecualian menang duluan
      for (const p of blokir) if (p(ip, v6)) return true;
      return false;
    },
  };
}

const KOSONG = bacaAturan('');

/**
 * Daftar yang bisa dimuat ulang saat berjalan.
 * Snapshot ditukar sekaligus (atomik dari sisi pembaca) — tidak ada momen
 * di mana daftarnya setengah terisi.
 */
export function bukaDaftar({ berkas, intervalCekMs = 15000, log = () => {} } = {}) {
  let sekarang = KOSONG;
  let mtimeTerakhir = 0;
  let timer = null;

  function muat(alasan) {
    if (!berkas) return;
    try {
      const st = fs.statSync(berkas);
      if (st.mtimeMs === mtimeTerakhir) return;
      const baru = bacaAturan(fs.readFileSync(berkas, 'utf8'));
      mtimeTerakhir = st.mtimeMs;
      sekarang = baru;
      log(`blocklist dimuat (${alasan}): ${baru.jumlah} blokir, ${baru.jumlahIzin} izin` +
          (baru.salah.length ? `, ${baru.salah.length} baris diabaikan` : ''));
      for (const s of baru.salah) log(`  blocklist ${s}`);
    } catch (err) {
      // Sengaja TIDAK mengosongkan daftar: berkas hilang/rusak lebih mungkin
      // salah ketik daripada perintah membuka blokir.
      log(`blocklist GAGAL dimuat (${alasan}): ${err.message} — daftar lama dipertahankan (${sekarang.jumlah} aturan)`);
    }
  }

  muat('awal');
  if (berkas && intervalCekMs > 0) {
    timer = setInterval(() => muat('berkas berubah'), intervalCekMs);
    timer.unref?.();
  }
  process.on('SIGHUP', () => { mtimeTerakhir = 0; muat('SIGHUP'); });

  return {
    diblokir: (ip, v6) => sekarang.diblokir(ip, v6),
    get jumlah() { return sekarang.jumlah; },
    muatUlang: () => { mtimeTerakhir = 0; muat('manual'); },
    tutup: () => timer && clearInterval(timer),
  };
}
