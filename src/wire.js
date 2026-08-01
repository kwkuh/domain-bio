// wire.js — encoder/decoder format paket DNS (RFC 1035) seperlunya.
// Cukup buat authoritative server sederhana: parse pertanyaan, susun jawaban.

// ---- Tipe record ----
export const TYPE = { A: 1, NS: 2, SOA: 6, HINFO: 13, TXT: 16, AAAA: 28, OPT: 41, ANY: 255 };
export const CLASS_IN = 1;

// ---- Flag header ----
const QR = 0x8000; // ini response
const AA = 0x0400; // authoritative answer
const RD = 0x0100; // recursion desired (di-copy dari query)
export const RCODE = { OK: 0, FORMERR: 1, NXDOMAIN: 3, REFUSED: 5 };

/** Encode nama domain jadi label-label (mis. "ns1.a-i.sh" -> \x03ns1\x04a-i\x02sh\x00). */
export function encodeName(name) {
  const parts = name ? name.split('.') : [];
  const bufs = [];
  for (const p of parts) {
    const b = Buffer.from(p, 'ascii');
    if (b.length > 63) throw new Error('label kepanjangan');
    bufs.push(Buffer.from([b.length]), b);
  }
  bufs.push(Buffer.from([0]));
  return Buffer.concat(bufs);
}

// Pointer kompresi ke offset 12 (awal QNAME di pertanyaan) — hemat byte, standar.
const NAME_PTR = Buffer.from([0xc0, 0x0c]);

/** Susun satu resource record. nameBuf = NAME_PTR atau hasil encodeName(). */
function record(nameBuf, type, ttl, rdata) {
  const mid = Buffer.alloc(8);
  mid.writeUInt16BE(type, 0);
  mid.writeUInt16BE(CLASS_IN, 2);
  mid.writeUInt32BE(ttl, 4);
  const rdlen = Buffer.alloc(2);
  rdlen.writeUInt16BE(rdata.length, 0);
  return Buffer.concat([nameBuf, mid, rdlen, rdata]);
}

export const answerRecord = (type, ttl, rdata) => record(NAME_PTR, type, ttl, rdata);
export const namedRecord = (name, type, ttl, rdata) => record(encodeName(name), type, ttl, rdata);

/** RDATA buat SOA. */
export function soaRdata(zone, cfg) {
  const mname = encodeName(cfg.ns[0]);
  const rname = encodeName(`hostmaster.${zone}`);
  const nums = Buffer.alloc(20);
  nums.writeUInt32BE(cfg.serial >>> 0, 0);
  nums.writeUInt32BE(cfg.refresh, 4);
  nums.writeUInt32BE(cfg.retry, 8);
  nums.writeUInt32BE(cfg.expire, 12);
  nums.writeUInt32BE(cfg.minttl, 16);
  return Buffer.concat([mname, rname, nums]);
}

/** Parse query: ambil id, flags, nama pertanyaan pertama, qtype, plus byte pertanyaan mentah. */
/**
 * HINFO rdata: dua character-string. Dipakai buat menjawab ANY sesuai RFC 8482 —
 * balasan sekecil mungkin supaya query ANY nggak bisa dipakai memperbesar serangan.
 */
export function hinfoRdata(cpu = 'RFC8482', os = '') {
  const s1 = Buffer.from(cpu, 'ascii');
  const s2 = Buffer.from(os, 'ascii');
  return Buffer.concat([Buffer.from([s1.length]), s1, Buffer.from([s2.length]), s2]);
}

/**
 * Cari OPT pseudo-record (EDNS0, RFC 6891) di bagian additional.
 *
 * OPT bukan record biasa: NAME-nya wajib akar (satu byte 0x00), CLASS dipakai
 * ulang sebagai ukuran payload UDP yang sanggup diterima klien, dan byte pertama
 * TTL adalah extended-rcode. Kita cuma butuh dua hal: ukuran payload, dan versi.
 *
 * Ditelusuri dengan melompati record satu per satu, bukan menebak posisi —
 * paket sah boleh menaruh apa pun sebelum OPT.
 *
 * @returns {{ada:boolean, payload:number, versi:number, do:boolean}|null}
 */
function cariOpt(buf, off, arcount) {
  for (let i = 0; i < arcount; i++) {
    if (off >= buf.length) return null;
    // Lewati NAME. Batasnya diperiksa di setiap langkah dengan alasan yang sama
    // seperti di parseQuery: paket yang habis di tengah nama tidak boleh membuat
    // penelusuran ini berjalan liar.
    if (buf[off] === 0) {
      off += 1;
    } else {
      let langkah = 0;
      while (off < buf.length) {
        if (++langkah > 128) return null; // nama sah tidak sepanjang ini
        const len = buf[off];
        if (len === 0) { off += 1; break; }
        if ((len & 0xc0) === 0xc0) { off += 2; break; }
        if (len > 63) return null;
        off += 1 + len;
      }
    }
    if (!Number.isFinite(off) || off + 10 > buf.length) return null;
    const type = buf.readUInt16BE(off);
    const kelas = buf.readUInt16BE(off + 2);
    const ttl = buf.readUInt32BE(off + 4);
    const rdlen = buf.readUInt16BE(off + 8);
    if (type === TYPE.OPT) {
      return {
        ada: true,
        // Lantai 512: klien yang mengiklankan lebih kecil dari paket DNS minimum
        // biasanya salah konfigurasi, dan menuruti angkanya bikin semua jawaban
        // terpotong tanpa alasan.
        payload: Math.max(512, kelas),
        versi: (ttl >> 16) & 0xff,
        do: ((ttl >> 15) & 1) === 1,
      };
    }
    off += 10 + rdlen;
  }
  return null;
}

/** Susun OPT untuk balasan. Kita tidak mendukung opsi apa pun, jadi RDATA kosong. */
export function optRecord(payload = 1232, extRcode = 0, versi = 0) {
  const b = Buffer.alloc(11);
  b.writeUInt8(0, 0);                                   // NAME = akar
  b.writeUInt16BE(TYPE.OPT, 1);
  b.writeUInt16BE(payload, 3);                          // CLASS dipakai ulang: ukuran payload kita
  b.writeUInt8(extRcode, 5);                            // extended rcode
  b.writeUInt8(versi, 6);                               // EDNS versi
  b.writeUInt16BE(0, 7);                                // flags — DO tidak diset: kita belum DNSSEC
  b.writeUInt16BE(0, 9);                                // RDLENGTH = 0
  return b;
}

export function parseQuery(buf) {
  if (buf.length < 12) throw new Error('paket kependekan');
  const id = buf.readUInt16BE(0);
  const flags = buf.readUInt16BE(2);
  const qdcount = buf.readUInt16BE(4);
  const arcount = buf.readUInt16BE(10);
  if (qdcount < 1) throw new Error('tanpa pertanyaan');

  // 🚨 Setiap baca WAJIB diperiksa batasnya dulu.
  //
  // Versi sebelumnya tidak, dan itu bisa mematikan server dari jarak jauh dengan
  // 12 byte. Paket yang bilang "ada 1 pertanyaan" lalu habis di situ membuat
  // buf[off] jadi undefined; `undefined & 0xc0` bernilai 0 sehingga bukan pointer,
  // `off += 1 + undefined` jadi NaN, dan `buf[NaN]` undefined lagi — perulangannya
  // tidak pernah keluar sambil terus mendorong string kosong ke dalam array.
  //
  // Terukur: 12 byte masuk -> 3 detik CPU dan 1,4 GB memori sebelum akhirnya
  // melempar. Node satu utas, jadi 0,3 paket per detik sudah cukup mematikan
  // layanan, dan alamat pengirim UDP bisa dipalsukan sehingga pembatas laju
  // per-blok tidak menolong.
  let off = 12;
  const labels = [];
  let panjangNama = 0;
  while (true) {
    if (off >= buf.length) throw new Error('nama kepotong');
    const len = buf[off];
    if (len === 0) { off += 1; break; }
    if ((len & 0xc0) === 0xc0) { // pointer kompresi — tidak sah di pertanyaan
      if (off + 2 > buf.length) throw new Error('pointer kepotong');
      off += 2;
      break;
    }
    if (len > 63) throw new Error('label lebih dari 63 oktet'); // RFC 1035 §2.3.4
    panjangNama += len + 1;
    if (panjangNama > 255) throw new Error('nama lebih dari 255 oktet'); // RFC 1035 §2.3.4
    if (off + 1 + len > buf.length) throw new Error('label lewat ujung paket');
    labels.push(buf.toString('ascii', off + 1, off + 1 + len));
    off += 1 + len;
  }
  if (off + 4 > buf.length) throw new Error('pertanyaan tanpa qtype/qclass');
  const qtype = buf.readUInt16BE(off);
  off += 4; // lewati qtype + qclass
  const questionSection = buf.subarray(12, off);

  // Sisa paket sesudah pertanyaan: answer + authority + additional. Kita cuma
  // peduli additional, tapi qdcount>1 tidak didukung dan ancount/nscount di query
  // sah selalu 0 — jadi menelusuri dari sini aman.
  const edns = cariOpt(buf, off, arcount);
  return { id, flags, name: labels.join('.'), qtype, questionSection, edns };
}

const TC = 0x0200; // truncated — "jawabannya nggak muat, ulangi lewat TCP"

/**
 * Balasan TERPOTONG tanpa isi: cuma menyalin pertanyaannya dan menyalakan TC=1.
 *
 * Dipakai oleh rate limiter sebagai jalan keluar buat klien sah. Klien yang benar
 * membaca TC=1 lalu mengulang lewat TCP; penyerang yang memalsukan alamat sumber
 * tidak pernah menerima paket ini, jadi tidak bisa menindaklanjutinya. Ukurannya
 * lebih kecil daripada query-nya sendiri, jadi tidak bisa dipakai mengamplifikasi.
 */
export function buildTruncated({ id, flags, questionSection, edns }) {
  // OPT tetap dibawa kalau query membawanya: klien yang mengirim EDNS lalu
  // menerima balasan tanpa OPT bisa menyimpulkan server ini tidak paham EDNS
  // dan berhenti memakainya — padahal ini cuma pembatasan laju sesaat.
  const additional = edns && edns.ada ? [optRecord(PAYLOAD_KAMI)] : [];
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(QR | AA | TC | (flags & RD) | RCODE.OK, 2);
  header.writeUInt16BE(1, 4); // qdcount
  header.writeUInt16BE(0, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(additional.length, 10);
  return Buffer.concat([header, questionSection, ...additional]);
}

// Ukuran payload UDP yang kita iklankan. 1232 = angka yang direkomendasikan
// DNS Flag Day 2020: muat di MTU 1280 (minimum IPv6) tanpa fragmentasi IP.
// Fragmen DNS gampang hilang dan gampang dipalsukan, jadi lebih baik memaksa
// klien pindah ke TCP daripada mengirim paket yang pecah.
export const PAYLOAD_KAMI = 1232;

/**
 * Susun buffer response lengkap.
 *
 * Kalau query membawa OPT, balasannya WAJIB membawa OPT juga (RFC 6891 §6.1.1).
 * Resolver umum masih memaafkan kalau tidak, tapi ini prasyarat DNSSEC dan
 * beberapa resolver menandai server tanpa OPT sebagai "tidak mendukung EDNS"
 * lalu berhenti mencoba fitur yang butuh EDNS.
 *
 * Versi EDNS yang tidak kita kenal dijawab BADVERS (extended rcode 16) dengan
 * OPT versi 0 — bukan diabaikan, karena mengabaikan bikin klien mengira paketnya
 * hilang lalu mengulang terus.
 */
export function buildResponse({ id, flags, questionSection, edns }, { rcode = RCODE.OK, answers = [], authority = [] }) {
  const pakaiOpt = !!(edns && edns.ada);
  const versiAsing = pakaiOpt && edns.versi > 0;

  const isi = versiAsing ? [] : answers;
  const kuasa = versiAsing ? [] : authority;
  const additional = pakaiOpt
    ? [optRecord(PAYLOAD_KAMI, versiAsing ? 1 : 0, 0)] // extRcode hi-byte 1 => BADVERS (16)
    : [];

  const header = Buffer.alloc(12);
  const rd = flags & RD;
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(QR | AA | rd | (versiAsing ? 0 : rcode), 2);
  header.writeUInt16BE(1, 4); // qdcount
  header.writeUInt16BE(isi.length, 6);
  header.writeUInt16BE(kuasa.length, 8);
  header.writeUInt16BE(additional.length, 10);
  return Buffer.concat([header, questionSection, ...isi, ...kuasa, ...additional]);
}
