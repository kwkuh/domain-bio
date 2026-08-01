// ratelimit.js — Response Rate Limiting (RRL) buat DNS otoritatif.
//
// Kenapa ada, dan kenapa BUKAN "biar server nggak kewalahan":
//
// Server ini menjawab query UDP tanpa jabat tangan, jadi alamat pengirimnya bisa
// dipalsukan. Penyerang mengirim query dengan alamat sumber = alamat KORBAN, dan
// balasan kita mendarat di korban. Kita jadi senjata orang lain, dan yang terlihat
// di log korban adalah IP kita. Amplifikasi ANY sudah ditekan ke 1,88x lewat
// RFC 8482, tapi 1,88x dikalikan ribuan paket tetap serangan — dan kali ini
// bandwidth kita yang membiayainya.
//
// Karena itu batasnya dihitung per BLOK ALAMAT, bukan per alamat tunggal:
// serangan pemalsuan mengacak alamat sumber, jadi pembatas per-IP tidak pernah
// melihat pengulangan. Blok /24 (v4) dan /56 (v6) mengikuti praktik RRL BIND.
//
// 🚨 SLIP — bagian yang membedakan RRL dari "buang saja".
// Membuang balasan secara diam-diam ikut membunuh pengguna sah yang kebetulan
// satu blok dengan penyerang (mis. satu kantor, satu resolver besar). Jadi setiap
// balasan ke-N yang melewati batas TIDAK dibuang, melainkan dijawab TERPOTONG
// (TC=1, nol jawaban). Klien sah membaca TC=1 lalu mengulang lewat TCP — dan TCP
// tidak bisa dipalsukan, jadi mereka tetap terlayani. Penyerang yang memalsukan
// alamat tidak pernah menerima balasan itu, jadi tidak bisa menindaklanjutinya.
//
// Batas cuma berlaku di UDP. TCP sudah membuktikan alamatnya lewat jabat tangan.

/** Ambil awalan alamat sebagai kunci ember. */
export function kunciPrefix(ip, v6 = false, bitsV4 = 24, bitsV6 = 56) {
  if (!v6) {
    const o = ip.split('.');
    if (o.length !== 4) return ip; // bentuk aneh: pakai apa adanya, jangan dilewatkan
    const n = ((Number(o[0]) << 24) | (Number(o[1]) << 16) | (Number(o[2]) << 8) | Number(o[3])) >>> 0;
    const mask = bitsV4 === 0 ? 0 : (~0 << (32 - bitsV4)) >>> 0;
    return String((n & mask) >>> 0);
  }
  // IPv6: ambil `bitsV6` bit pertama. Nibble = 4 bit, jadi cukup potong bentuk penuh.
  const penuh = perpanjangV6(ip);
  const nibble = Math.ceil(bitsV6 / 4);
  return 'v6:' + penuh.slice(0, nibble);
}

/** "2a01:4f8::1" -> "2a0104f80000...0001" (32 nibble, tanpa titik dua) */
function perpanjangV6(ip) {
  const [head, tail] = String(ip).split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined ? (tail ? tail.split(':') : []) : null;
  const groups = t === null ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  let s = '';
  for (let i = 0; i < 8; i++) s += (parseInt(groups[i] || '0', 16) & 0xffff).toString(16).padStart(4, '0');
  return s;
}

/**
 * @param {object} opsi
 * @param {number} opsi.perDetik   balasan per detik per blok alamat (0 = pembatas mati)
 * @param {number} opsi.ledakan    jatah menganggur yang boleh ditumpuk (token bucket)
 * @param {number} opsi.slip       tiap balasan ke-N yang melewati batas dijawab TC=1; 0 = tidak pernah
 * @param {number} opsi.maksEntri  batas keras jumlah ember — pembatas tidak boleh jadi kebocoran memori
 * @param {number} opsi.ttlEntriMs ember yang diam selama ini dibuang
 */
export function bikinPembatas({
  perDetik = 0,
  ledakan = null,
  slip = 5,
  bitsV4 = 24,
  bitsV6 = 56,
  maksEntri = 50000,
  ttlEntriMs = 60000,
  sekarang = () => Date.now(),
} = {}) {
  const kapasitas = ledakan ?? Math.max(perDetik * 2, perDetik);
  const ember = new Map();
  let dibuang = 0;
  let dipotong = 0;
  let diusir = 0;

  /**
   * 🚨 Ember-nya sendiri bisa jadi serangan. Alamat sumber palsu itu acak, jadi
   * tiap paket bisa melahirkan satu entri baru. Tanpa batas keras, pembatas laju
   * berubah jadi kebocoran memori yang dipicu dari luar — obatnya lebih parah
   * daripada penyakitnya.
   */
  function sapu(t) {
    for (const [k, e] of ember) if (t - e.terakhir > ttlEntriMs) ember.delete(k);
    if (ember.size < maksEntri) return;
    // Masih penuh: usir yang paling lama tidak tersentuh. Map di JS menjaga urutan
    // penyisipan, dan entri yang aktif terus tetap di posisi lamanya — jadi ini
    // bukan LRU murni, tapi cukup: yang diusir pasti entri yang sudah lama dibuat.
    const buang = Math.max(1, Math.floor(ember.size * 0.2));
    let n = 0;
    for (const k of ember.keys()) { ember.delete(k); if (++n >= buang) break; }
    diusir += n;
  }

  return {
    /**
     * @returns {'lolos'|'buang'|'potong'}
     *   lolos  = jawab seperti biasa
     *   buang  = jangan balas apa pun (jangan kirim paket — itu inti anti-refleksi)
     *   potong = balas TC=1 tanpa jawaban, supaya klien sah pindah ke TCP
     */
    putuskan(ip, v6 = false) {
      if (perDetik <= 0) return 'lolos'; // pembatas mati
      const t = sekarang();
      const k = kunciPrefix(ip, v6, bitsV4, bitsV6);
      let e = ember.get(k);
      if (!e) {
        if (ember.size >= maksEntri) sapu(t);
        e = { token: kapasitas, terakhir: t, lewat: 0 };
        ember.set(k, e);
      }
      // Isi ulang sesuai waktu yang berlalu.
      const isi = ((t - e.terakhir) / 1000) * perDetik;
      if (isi > 0) e.token = Math.min(kapasitas, e.token + isi);
      e.terakhir = t;

      if (e.token >= 1) { e.token -= 1; e.lewat = 0; return 'lolos'; }

      e.lewat += 1;
      if (slip > 0 && e.lewat % slip === 0) { dipotong += 1; return 'potong'; }
      dibuang += 1;
      return 'buang';
    },
    sapuSekarang: () => sapu(sekarang()),
    get statistik() { return { entri: ember.size, dibuang, dipotong, diusir }; },
    get aktif() { return perDetik > 0; },
  };
}
