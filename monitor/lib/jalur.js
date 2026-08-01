// jalur.js — preflight: apakah jalur jaringan yang kita pakai boleh dipercaya?
//
// Masalahnya nyata: banyak jaringan (hotel, kantor, dan di kasus kita **seluler XL Axiata**)
// membajak port 53 — semua query DNS dibelokin ke resolver mereka, ke IP tujuan mana pun.
// Kalau itu terjadi, monitoring bisa ngasih dua kebohongan sekaligus:
//   - LULUS padahal nameserver kita mati (yang jawab resolver pembajak), atau
//   - GAGAL padahal nameserver kita sehat (pembajak jawab NXDOMAIN buat nama kita).
// Makanya sebelum menilai nameserver, kita nilai dulu JALURNYA. Kalau jalur kotor,
// hasilnya bukan LULUS dan bukan GAGAL, tapi **TIDAK SAH** — dan itu harus diteriakin.
//
// Cara ngendus (tiga lapis, dari yang paling telak):
//   1. Probe lubang hitam. Kirim query ke IP dokumentasi RFC 5737 / RFC 3849
//      (192.0.2.1, 198.51.100.1, 203.0.113.1, 2001:db8::1). Di internet yang waras,
//      IP itu nggak menjalankan apa pun — jadi jawabannya WAJIB timeout. Kalau ada yang
//      jawab, 100% ada yang mencegat: nggak mungkin salah tafsir.
//   2. Sidik jari jawaban. Server Open-Domain nggak pernah nyalain RA dan nggak pernah
//      nambahin OPT/EDNS (arcount selalu 0). Jawaban "dari" nameserver kita yang RA-nya
//      nyala atau bawa additional = jawaban orang lain.
//   3. Nonce. Nama acak yang jawabannya cuma bisa bener kalau logika Open-Domain yang
//      ngitung. Ini juga jaring pengaman kalau pembajaknya pintar.

import { tanya, TYPE, ambil } from './dns.js';

// IP khusus dokumentasi — dijamin nggak dipakai layanan sungguhan.
export const LUBANG_HITAM_V4 = ['192.0.2.1', '198.51.100.1', '203.0.113.1'];
export const LUBANG_HITAM_V6 = ['2001:db8::1'];

const acak = () => Math.random().toString(36).slice(2, 10);

/**
 * Uji satu transport (udp/tcp) di satu keluarga IP.
 * @returns {Promise<{transport:string,keluarga:string,dibajak:boolean,bukti:string[],diuji:number}>}
 */
export async function periksaTransport({ transport = 'udp', keluarga = 'v4', timeout = 3000 } = {}) {
  const target = keluarga === 'v6' ? LUBANG_HITAM_V6 : LUBANG_HITAM_V4;
  const bukti = [];
  for (const ip of target) {
    try {
      const j = await tanya({ ip, name: `${acak()}.invalid`, type: TYPE.A, transport, timeout });
      bukti.push(`${ip} (${transport}/${keluarga}) MENJAWAB rcode=${j.rcode} ra=${j.ra} answer=${j.answers.length} — mustahil, IP ini nggak menjalankan DNS`);
    } catch {
      // timeout / unreachable = justru inilah yang bener
    }
  }
  return { transport, keluarga, dibajak: bukti.length > 0, bukti, diuji: target.length };
}

/**
 * Periksa sidik jari jawaban dari nameserver kita sendiri.
 * Dipakai belakangan, setelah kita tahu IP nameserver-nya.
 */
export async function periksaSidikJari({ ip, zone, transport = 'udp', timeout = 4000 }) {
  const a = [1 + Math.floor(Math.random() * 254), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 1 + Math.floor(Math.random() * 254)];
  const nama = `${acak()}.${a.join('-')}.${zone}`;
  const bukti = [];
  const j = await tanya({ ip, name: nama, type: TYPE.A, transport, timeout });

  if (j.ra) bukti.push('RA (recursion available) nyala — server Open-Domain nggak pernah nyalain RA; ini jawaban resolver');
  if (!j.aa) bukti.push('AA (authoritative answer) mati — jawaban otoritatif wajib AA=1');
  if (j.additional.length > 0) bukti.push(`additional section terisi (${j.additional.length}) — server kita nggak pernah ngirim OPT/additional`);
  const jawab = ambil(j.answers, TYPE.A).map((rr) => rr.data);
  if (jawab[0] !== a.join('.')) bukti.push(`jawaban ${jawab[0] ?? '(kosong)'} ≠ ${a.join('.')} yang diminta nama`);

  return { ip, transport, dibajak: bukti.length > 0, bukti, nama };
}

/**
 * Preflight lengkap sebelum monitoring jalan.
 * @returns {Promise<{tepercaya:boolean, laporan:object[], ringkas:string}>}
 */
export async function periksaJalur({ transports = ['udp', 'tcp'], ipv6 = false, timeout = 3000 } = {}) {
  const daftar = [];
  for (const t of transports) daftar.push({ transport: t, keluarga: 'v4' });
  if (ipv6) for (const t of transports) daftar.push({ transport: t, keluarga: 'v6' });

  const laporan = await Promise.all(daftar.map((d) => periksaTransport({ ...d, timeout })));
  const kotor = laporan.filter((l) => l.dibajak);
  const tepercaya = kotor.length === 0;
  const ringkas = tepercaya
    ? `jalur bersih (${laporan.map((l) => `${l.transport}/${l.keluarga}`).join(', ')} nggak dibajak)`
    : `JALUR DIBAJAK di ${kotor.map((l) => `${l.transport}/${l.keluarga}`).join(', ')}`;
  return { tepercaya, laporan, ringkas };
}

/** Teks peringatan yang dicetak kalau jalur kotor. Sengaja panjang: ini bukan warning kecil. */
export function pesanJalurKotor(hasil) {
  const baris = [
    '',
    '  ┌─────────────────────────────────────────────────────────────────────────┐',
    '  │  HASIL TIDAK SAH — jaringan ini membajak DNS                            │',
    '  └─────────────────────────────────────────────────────────────────────────┘',
    '',
    `  ${hasil.ringkas}`,
    '',
    '  Bukti:',
  ];
  for (const l of hasil.laporan) for (const b of l.bukti) baris.push(`    - ${b}`);
  baris.push(
    '',
    '  Artinya: query ke IP mana pun di port 53 dibelokin ke resolver jaringan ini.',
    '  Monitoring DIHENTIKAN — hasil apa pun dari sini nggak bisa dipercaya, baik yang',
    '  kelihatan lulus maupun yang kelihatan gagal. Ini BUKAN tanda nameserver mati.',
    '',
    '  Jalan keluar (urut dari yang paling gampang):',
    '    1. Ganti jaringan (Wi-Fi lain / tethering operator lain), lalu ulangi.',
    '    2. Nyalakan VPN/WireGuard yang bawa DNS-nya sendiri, lalu ulangi.',
    '    3. Pinjam mata server lain:  npm run monitor:jauh -- <host-ssh>',
    '       (skrip ini di-rsync ke server itu, dijalankan di sana, hasilnya balik ke sini)',
    '    4. Jalankan dari CI:  gh workflow run nameservers.yml',
    '',
    '  Catatan: DoH/DoT nggak nolong buat uji ini. Keduanya cuma bisa nanya ke resolver',
    '  rekursif, sedangkan yang mau kita uji justru tiap nameserver otoritatif satu-satu.',
    '',
  );
  return baris.join('\n');
}
