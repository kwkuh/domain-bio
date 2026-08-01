# Adopsi: bagaimana layanan seperti ini sebenarnya dikenal

Ditulis 1 Agustus 2026. Semua angka diukur, bukan diperkirakan.

## Angka yang paling menjelaskan segalanya

Jumlah berkas di GitHub yang menyebut tiap layanan (GitHub code search, 1 Agu 2026):

| Layanan | Berkas | Status |
|---|---|---|
| nip.io | 11.856 | hidup |
| **xip.io** | **10.752** | **MATI bertahun-tahun** |
| sslip.io | 6.560 | hidup |
| localtest.me | 3.276 | hidup |
| traefik.me | 2.148 | hidup |
| Open-Domain | 0 | baru |

**xip.io sudah lama tutup dan masih tertanam di sepuluh ribu berkas.** Itu satu fakta
yang menjelaskan seluruh dinamika kategori ini:

1. Sekali masuk ke konfigurasi atau dokumentasi orang, kamu bertahan **bertahun-tahun**
   setelah kamu berhenti berguna. Distribusi di sini bersifat menetap, bukan mengalir.
2. Karena itu juga, posisi petahana **sangat sulit digeser**. Orang tidak mencari
   pengganti; mereka menyalin baris yang sudah ada di tutorial yang mereka baca.
3. Dan itu berarti mengejar "peringkat pencarian" adalah salah sasaran. Yang menentukan
   bukan orang mencari layanan seperti ini, melainkan **orang menyalin perintah**.

## Di mana referensi itu sebenarnya tinggal

Sebaran jenis berkas yang menyebut `nip.io`:

| Jenis | Berkas | Artinya |
|---|---|---|
| `.md` | 7.560 | **dokumentasi dan tutorial — terbesar** |
| `.yaml` | 5.976 | manifest Kubernetes |
| `.yml` | 1.876 | CI, compose, ansible |
| `.json` | 1.364 | konfigurasi alat |
| `.tf` | 796 | Terraform |

Jadi urutan kepentingannya jelas: **tulisan lebih dulu, manifest kemudian.** Bukan
halaman produk, bukan iklan, bukan peluncuran.

Konteks yang berulang di hasil pencarian: **ingress Kubernetes di klaster lokal atau
percobaan**. Orang butuh hostname untuk IP LoadBalancer supaya cert-manager bisa
menerbitkan sertifikat. Itu satu alur kerja yang sangat spesifik, dan itulah pintu
masuk yang dipakai kedua petahana.

## Posisi Open-Domain hari ini

- Nol hasil untuk `"open-domain.com"` dan `"a-i.st" wildcard dns`.
- `robots.txt` mengizinkan semua, `sitemap.xml` berisi 10 URL, ada cermin Markdown dan
  `llms.txt` — sisi teknis penemuan sudah beres dan tidak perlu dikerjakan lagi.

Nol hasil itu **wajar** untuk domain yang baru melayani hari ini, bukan tanda ada yang
salah. Yang perlu disadari: pengindeksan tidak akan membawa pengguna di kategori ini —
lihat poin 3 di atas.

## Yang membuat layanan sejenis gagal diadopsi meski teknisnya benar

Diurutkan dari yang paling mematikan:

1. **Riwayat downtime.** Ketakutan terbesar pengguna kategori ini adalah layanannya
   hilang — xip.io membuktikan ketakutan itu beralasan. Satu pemadaman panjang di awal
   akan dikutip bertahun-tahun. Open-Domain berjalan di **satu mesin**, jadi risiko ini
   nyata dan sudah disebutkan di halaman utama. Menyembunyikannya justru memperburuk:
   orang yang tertipu tidak kembali.
2. **Sertifikat gagal terbit.** Batas Let's Encrypt 50 sertifikat per registered domain
   per 7 hari adalah **kolam bersama** untuk seluruh pengguna `a-i.st`. Pengguna ke-51
   tidak melihat "kuota habis" — dia melihat layanan yang rusak. Permohonan penyesuaian
   ada di `letsencrypt-rate-limit-request.md` dan makan waktu berminggu-minggu; itu sebabnya
   diajukan sebelum promosi, bukan sesudah.
3. **Menjanjikan lebih dari yang benar.** Kategori ini dipakai oleh orang yang membaca
   dokumentasi dengan teliti. Satu klaim yang terbukti salah menghapus kepercayaan pada
   seluruh halaman. Sudah kejadian dua kali di proyek ini: "redundant by design" saat
   hanya ada satu resolver, dan saran TLS yang mengandaikan wildcard certificate yang
   tidak pernah ada.

## Yang masuk akal dilakukan

Bukan "strategi pemasaran" — tiga hal yang mengikuti langsung dari data di atas:

1. **Tulis satu panduan yang benar-benar berguna untuk satu alur kerja**, kemungkinan
   besar ingress Kubernetes lokal dengan cert-manager, sampai HTTPS hijau. Itu bentuk
   yang disalin orang, dan `.md` adalah tempat terbesar referensi ini tinggal.
2. **Selesaikan hal yang membuat orang berhenti memakai** sebelum mengundang siapa pun:
   penyesuaian batas Let's Encrypt, dan nameserver kedua. Mengundang orang ke layanan
   yang akan mengecewakan mereka lebih merugikan daripada menunggu.
3. **Jangan bersaing dengan nip.io/sslip.io — lengkapi.** Mereka petahana yang pantas
   dihormati dan halaman kita sudah menunjuk ke mereka untuk kebutuhan kritis. Alasan
   nyata memilih Open-Domain adalah dua suffix dan sifatnya yang dirancang untuk agen,
   bukan klaim lebih baik yang tidak bisa dibuktikan.

## Yang sengaja tidak disarankan

- Peluncuran di Hacker News / Product Hunt sekarang. Traksi nol dan satu titik gagal
  tunggal; perhatian yang datang lebih cepat daripada kesiapan berujung pada catatan
  publik yang buruk dan permanen.
- Mengirim pull request "tambahkan kami" ke dokumentasi proyek lain. Itu terbaca sebagai
  spam dan merusak nama sebelum ada yang memakai.
- Mengejar peringkat pencarian. Lihat angka di atas: orang menyalin perintah, tidak
  mencari layanan.
