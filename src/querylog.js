// querylog.js — catatan query seperlunya buat menindaklanjuti laporan penyalahgunaan.
//
// 🚨 Yang dicatat ditentukan oleh PERTANYAAN YANG PERLU DIJAWAB, bukan oleh apa
// yang kebetulan tersedia.
//
// Laporan penyalahgunaan berbunyi: "bank.203.0.113.10.a-i.st dipakai buat phishing".
// Yang perlu kita buktikan: nama itu memang kami jawab, sejak kapan, dan seberapa
// sering. Semua itu ada di NAMA YANG DITANYA. Tidak satu pun butuh tahu SIAPA yang
// bertanya.
//
// Karena itu alamat klien dipotong ke /24 (v4) dan /48 (v6) secara bawaan. Itu
// cukup buat memisahkan "satu sumber membanjiri" dari "banyak orang memakai", dan
// tidak cukup buat mengikuti seseorang. Server ini di Jerman: menurut GDPR alamat
// IP utuh adalah data pribadi, dan menyimpan yang tidak kita butuhkan cuma
// menambah kewajiban tanpa menambah kemampuan.
//
// QUERYLOG_PENUH=1 mematikan pemotongan itu. Sengaja dibikin sebagai saklar
// terpisah yang harus dinyalakan sadar-sadar, bukan efek samping dari menyalakan
// log — dan sengaja tidak dipakai di produksi.
//
// Berkasnya ditulis apa adanya baris per baris (JSON Lines) supaya bisa dipotong
// oleh logrotate tanpa perlu memberi tahu proses ini.

import fs from 'node:fs';

/** Potong alamat ke blok yang cukup buat pola, tidak cukup buat menguntit. */
export function samarkan(ip, v6 = false) {
  if (!ip) return '?';
  if (v6) {
    const bagian = String(ip).split(':');
    return bagian.slice(0, 3).join(':') + '::/48';
  }
  const o = String(ip).split('.');
  if (o.length !== 4) return '?';
  return `${o[0]}.${o[1]}.${o[2]}.0/24`;
}

/**
 * @param {object} opsi
 * @param {string|null} opsi.berkas  path berkas log; null/kosong = log mati
 * @param {boolean} opsi.penuh       true = simpan alamat klien utuh (jangan di produksi)
 */
export function bukaCatatan({ berkas = null, penuh = false, log = () => {} } = {}) {
  if (!berkas) {
    return { aktif: false, catat() {}, tutup() {} };
  }

  let aliran;
  try {
    aliran = fs.createWriteStream(berkas, { flags: 'a' });
  } catch (err) {
    // Log yang gagal dibuka TIDAK boleh menjatuhkan layanan DNS. Menjawab query
    // itu tugas utamanya; mencatat cuma pendukung.
    log(`querylog GAGAL dibuka (${err.message}) — layanan lanjut tanpa catatan`);
    return { aktif: false, catat() {}, tutup() {} };
  }
  aliran.on('error', (err) => log(`querylog error tulis: ${err.message}`));
  log(`querylog aktif: ${berkas}${penuh ? ' (ALAMAT PENUH — jangan dipakai di produksi)' : ' (alamat disamarkan)'}`);

  return {
    aktif: true,
    /**
     * @param {object} e { ip, v6, nama, qtype, rcode, hasil, transport }
     */
    catat(e) {
      const baris = JSON.stringify({
        t: new Date().toISOString(),
        c: penuh ? e.ip : samarkan(e.ip, e.v6),
        n: e.nama,
        q: e.qtype,
        r: e.rcode,
        h: e.hasil,          // 'lolos' | 'potong' | 'buang' | 'blokir'
        x: e.transport,      // 'udp' | 'tcp'
      });
      aliran.write(baris + '\n');
    },
    tutup() { try { aliran.end(); } catch { /* sudah tertutup */ } },
  };
}
