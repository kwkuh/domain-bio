# Monitoring eksternal Open-Domain

Dokumen internal buat Kukuh. Isinya: gimana kita tahu a-i.sh dan a-i.st **beneran hidup**
dari luar, tiap saat, tanpa nunggu ada orang ngeluh.

Unit test di `test/` cuma bilang "logikanya bener". Dokumen ini soal yang lain: **nameserver
produksinya jawab nggak, hari ini, jam ini, dari internet beneran** — dan yang sama pentingnya,
**alat ukurnya sendiri boleh dipercaya nggak**.

Semua yang ditulis di sini sudah dijalankan beneran, bukan rancangan di atas kertas. Angka dan
temuannya ada di [§8](#8-kondisi-terverifikasi-1-agustus-2026).

---

## 1. Yang diperiksa ke nameserver produksi

Tiap pemeriksaan nembak **langsung ke IP satu nameserver**, bukan lewat resolver rekursif, dan
diulang untuk **tiap transport (UDP dan TCP)** dan **tiap keluarga alamat (IPv4 dan IPv6)**.
Semua nama yang diuji **diacak tiap kali**, biar nggak ada cache di mana pun yang bisa bikin
server mati kelihatan hidup.

Sumbernya: `monitor/lib/kasus.js`.

### Apex

| Pemeriksaan | Yang diharapkan | Kenapa penting |
|---|---|---|
| `SOA` di apex zone | `NOERROR`, `AA=1`, tepat 1 SOA, serial > 0, MNAME wajar, `minimum` 1–86400 | SOA itu identitas zone; `minimum` = TTL cache negatif, kalau kegedean satu salah jawab nempel lama |
| `NS` di apex zone | `NOERROR`, `AA=1`, minimal 2 NS | satu nameserver = satu titik mati |

### Inti layanan (jawaban dihitung dari nama)

| Bentuk nama | Contoh | Diharapkan |
|---|---|---|
| IPv4 bertitik | `203.0.113.10.a-i.sh` | `A 203.0.113.10` |
| IPv4 bergaris | `203-0-113-10.a-i.sh` | `A 203.0.113.10` (bentuk yang dipakai sertifikat wildcard) |
| IPv4 heksa | `cb00710a.a-i.sh` | `A 203.0.113.10` |
| IPv6 bergaris | `2001-db8-1234-5678--9.a-i.sh` | `AAAA 2001:db8:1234:5678::9` (dibandingkan sebagai **byte**, bebas urusan ejaan `::`) |
| prefix bebas | `api.staging.203-0-113-10.a-i.sh` | `A 203.0.113.10` |
| HURUF BESAR | `203-0-113-10.A-I.SH` | sama persis dengan versi kecil |

### Jawaban negatif — sama pentingnya dengan yang positif

| Kasus | Diharapkan | Kalau salah |
|---|---|---|
| nama di dalam zone tapi bukan IP | `NXDOMAIN` + **SOA di authority** | tanpa SOA, resolver nggak bisa nge-cache jawaban negatif → beban query naik terus |
| nama di luar semua zone (`x.example.com`) | `REFUSED`, tanpa answer, `RA=0` | kalau dijawab = kita jadi **open resolver**, langsung jadi amunisi serangan amplifikasi |
| `AAAA` atas nama IPv4 | `NOERROR` + 0 answer + SOA authority (**NODATA**) | kalau dijawab `NXDOMAIN`, resolver nyimpulin seluruh nama nggak ada — `A`-nya ikut hilang |

### Kesehatan protokol

| Pemeriksaan | Kenapa |
|---|---|
| header tiap jawaban: `QR=1`, `AA=1`, `RA=0`, `TC=0` | `AA=0` atau `RA=1` = kita lagi ngobrol sama resolver/pembajak, bukan sama nameserver kita |
| ID query dipantulkan sama + question section dipantulkan persis | pertahanan dasar terhadap jawaban sisipan; dicek di **setiap** query, bukan sekali |
| query ber-**EDNS0** (ada OPT) tetap dijawab benar | resolver modern hampir selalu kirim EDNS0; kalau server balas `FORMERR`, zone-nya praktis mati di dunia nyata |
| waktu jawab < 1500 ms | ambang kasar; buat ngendus rute yang mulai busuk sebelum bener-bener putus |
| **TCP** dijawab sama dengan UDP | resolver naik ke TCP kalau jawaban kepotong; TCP mati = kegagalan diam-diam yang telat ketahuan |

### Konsistensi armada (tingkat zone)

| Pemeriksaan | Kenapa |
|---|---|
| delegasi induk punya ≥ 2 nameserver | ketahanan |
| tiap NS di delegasi punya alamat A | delegasi ke nama tanpa alamat = zone mati |
| tiap NS di delegasi punya alamat AAAA | klien IPv6-only harus bisa nyampe |
| NS di apex **sama persis** dengan delegasi induk | beda = "lame delegation": resolver dikirim ke server yang nggak siap |
| serial SOA seragam di semua nameserver | serial beda-beda bikin resolver nganggep salah satu salinan zone-nya basi |

---

## 2. Menguji tiap nameserver satu-satu

Aturannya cuma satu, tapi keras: **jangan pernah lewat resolver rekursif.**

Kalau kita tanya `1.2.3.4.a-i.sh` ke 1.1.1.1, yang kita ukur adalah "apakah ada **paling nggak
satu** nameserver yang hidup" — plus cache resolver itu. ns2 boleh mati seminggu dan hasilnya
tetap hijau.

Yang kita lakukan:

1. **Resolve dulu tiap nama NS jadi daftar IP** (bisa banyak: A + AAAA).
2. **Tembak tiap IP satu-satu**, dengan `RD=0` (recursion desired mati).
3. Kalikan ke tiap transport: `{tiap IP} × {udp, tcp} × {semua pemeriksaan di §1}`.
4. Label kegagalan selalu bawa `nama · ip · transport/keluarga`, jadi kelihatan persis mana
   yang mati — "ns2 203.0.113.9 tcp/v4" merah sementara sisanya hijau.

Alatnya klien DNS sendiri (`monitor/lib/dns.js`, ~230 baris, nol dependensi), bukan `dig`:

- runner GitHub Actions **nggak dijamin punya `dig`** (paket `dnsutils` sering belum kepasang);
- `dig +short` nyembunyiin header — padahal `rcode`, `AA`, `RA`, dan ID justru bahan utama buat
  bedain jawaban asli dari jawaban bajakan;
- repo ini nol dependensi, alat ukurnya juga harus begitu.

---

## 3. Daftar nameserver ditemukan sendiri

**Daftar nameserver nggak boleh ada di dalam kode tes.** Begitu ns2 nyala di benua lain, tes
harus langsung ikut mengujinya tanpa satu baris pun diubah.

Sumber kebenarannya = **delegasi di zona induk**, bukan NS di apex zone kita sendiri. Alasannya:
NS di apex itu jawaban dari server yang lagi kita uji — kalau salah konfigurasi, dia bisa
"mengaku" apa saja. Yang menentukan siapa yang berhak menjawab dunia adalah NS di induk.

Jadi `monitor/lib/temukan.js` jalan turun dari root, pakai DNS asli:

```
root (198.41.0.4)  ->  server .sh (65.22.161.9)  ->  delegasi a-i.sh + glue A/AAAA
```

Terukur ~113 ms buat a-i.sh, ~205 ms buat a-i.st. Selisih antara delegasi induk dan NS apex
justru salah satu yang diperiksa (§1, "lame delegation").

**Kenapa bukan RDAP seperti sslip.io.** sslip.io ngambil daftar nameserver dari RDAP registrar.
Buat kita itu nggak bisa: bootstrap RDAP IANA (`data.iana.org/rdap/dns.json`, 590 entri, 1200 TLD)
**nggak punya `.sh` maupun `.st`** — dicek 1 Agu 2026. Jalan turun dari root jalan buat semua TLD,
dan lebih dekat ke kebenaran karena bacanya delegasi, bukan basis data registrar.

Tiga mode, `TEMUKAN=auto|induk|doh|env`:

| Mode | Kapan dipakai |
|---|---|
| `induk` | normal — jalan turun dari root pakai DNS asli |
| `doh` | jaringan yang port 53-nya diblok. Tanya resolver publik lewat HTTPS. **Cuma buat NEMU nameserver, nggak pernah buat MENILAI** — menilai wajib nembak langsung |
| `env` | `NAMESERVERS="ns3.contoh@198.51.100.7"` — buat nguji nameserver baru **sebelum** didelegasikan. Sejak 1 Agu 2026 delegasi a-i.sh/a-i.st sudah nunjuk ke ns1/ns2 kita, jadi `induk` jalan sendiri; `env` sekarang cuma buat calon nameserver berikutnya |
| `auto` | coba `induk`, jatuh ke `doh` kalau gagal (alasannya dicatat di jejak) |

---

## 4. Jadwal, dan apa yang terjadi kalau gagal

`.github/workflows/nameservers.yml`:

- **`schedule: */30 * * * *`** — tiap 30 menit. GitHub sering telat beberapa menit di jam sibuk;
  itu wajar dan nggak masalah, yang penting ada mata yang ngelirik terus. (sslip.io 6 jam; buat
  layanan yang jadi tumpuan orang lain, 6 jam kelamaan.)
- **`workflow_dispatch`** dengan input `zones`, `nameservers`, `transports` — buat nguji ns2 baru
  sebelum delegasinya dipindah.
- **`push`** di path `monitor/**` dan `src/**` — kalau alat ukurnya sendiri diubah, langsung
  dibuktikan di jalur nyata.
- `concurrency: nameservers` — nggak ada dua run yang tumpang tindih.

Kode keluar `monitor/periksa.js` sengaja dibedakan:

| Kode | Arti | Tindakan |
|---|---|---|
| `0` | SEHAT | badge hijau; issue insiden ditutup kalau ada |
| `1` | BERMASALAH (nameserver) | job merah, issue insiden dibuka/di-comment, notif WhatsApp |
| `3` | **TIDAK SAH** (jaringan pengukurnya yang bau) | job merah + `::error` yang bilang jelas ini masalah alat ukur; **nggak** buka issue insiden, **nggak** kirim WA |
| `2` | nggak bisa mulai (discovery gagal) | job merah |

Pembedaan `1` vs `3` itu inti. Alarm yang bohong dua kali langsung nggak dipercaya orang.

**Badge.** Dua pilihan:

1. Bawaan GitHub, nol rahasia, langsung jalan:
   ```md
   [![Nameservers](https://github.com/kwkuh/open-domain/actions/workflows/nameservers.yml/badge.svg)](https://github.com/kwkuh/open-domain/actions/workflows/nameservers.yml)
   ```
2. shields.io endpoint lewat Gist (`up` / `down` / `unverified`), butuh secret `GIST_TOKEN` +
   variable `BADGE_GIST_ID`. Langkahnya sudah ada di workflow dan **dilewati otomatis** kalau
   secret-nya belum diisi. Bedanya: badge ini bisa nunjukin `unverified` — keadaan yang badge
   bawaan GitHub nggak punya kosakatanya.

**Notifikasi.**

- GitHub sendiri ngirim email ke pemilik repo tiap scheduled workflow di branch default gagal.
- Tambahan: WhatsApp lewat gateway sendiri (`secrets.WA_WEBHOOK`, dilewati kalau kosong).
- Issue insiden: **satu issue dipakai ulang** (dicari berdasarkan judul + label `monitoring`),
  di-comment kalau masih gagal, ditutup otomatis kalau sudah pulih. Bukan issue baru tiap 30 menit.

**Jebakan yang harus diingat:** GitHub **menonaktifkan scheduled workflow di repo publik setelah
60 hari nggak ada aktivitas repo**. Buat repo yang lagi sepi, monitoring bisa mati diam-diam.
Penangkalnya: lapis kedua di VPS (§6) yang nggak bergantung ke GitHub sama sekali.

---

## 5. Apakah runner GitHub bisa kirim DNS UDP ke port 53 keluar?

**Bisa — dan asumsinya jangan cuma dipercaya, tapi dibuktikan tiap kali jalan.**

Yang sudah diperiksa:

- Egress runner GitHub-hosted **terbuka secara default**; nggak ada penyaring yang nutup port 53
  kecuali repo/org sengaja masang egress filter (harden-runner, Bullfrog, dsb). Justru DNS keluar
  yang bebas itu dikenal sebagai celah eksfiltrasi — bukti nggak langsung bahwa jalurnya emang buka.
- **`dig` belum tentu ada** di image runner (perlu `apt-get install dnsutils`). Ini salah satu
  alasan kita nulis klien DNS sendiri.
- **IPv6 keluar praktis nggak tersedia** di runner GitHub-hosted (isu lama, belum kelar). Ini juga
  kemungkinan besar alasan sslip.io pakai runner **self-hosted** buat spec nameserver-nya.

Makanya langkah **pertama** di workflow adalah `node monitor/kemampuan.js`, yang ngelaporin:
UDP/53 keluar, TCP/53 keluar, IPv6 keluar, DoH, dan ada pembajakan atau nggak. Kalau suatu hari
GitHub nutup port 53, langkah itu yang merah duluan dengan alasan kebaca — bukan monitoring yang
salah nuduh nameserver mati.

`IPV6=auto` bikin pemeriksaan v6 **dilewati dengan alasan tercatat**, bukan dihitung gagal, di
mesin yang emang nggak punya jalan keluar IPv6. Ganti ke `IPV6=on` di runner yang punya IPv6.

**Rencana cadangan, urut:**

1. **TCP saja** (`TRANSPORTS=tcp`) — kalau UDP 53 diblok tapi TCP lolos, sebagian besar pemeriksaan
   tetap sah.
2. **Runner self-hosted** di VPS sendiri (pola sslip.io). Nggak butuh perubahan kode: cuma ganti
   `runs-on`. Bonus: IPv6 beneran ikut keuji.
3. **Cron di VPS**, lepas total dari GitHub — ini juga penangkal auto-disable 60 hari:
   ```
   */30 * * * *  cd /opt/open-domain && JSON_KE=/var/log/open-domain-monitor.json \
                 node monitor/periksa.js >> /var/log/open-domain-monitor.log 2>&1
   ```
   Taruh di server yang **bukan** ns1 — mengukur diri sendiri dari dalam nggak ada artinya.
4. **DoH cuma buat discovery** (`TEMUKAN=doh`). Penilaian tetap wajib nembak langsung; DoH nggak
   bisa nanya ke nameserver otoritatif tertentu.

---

## 6. Menjalankan manual dari laptop — dan bahaya jaringan seluler

Perintahnya sama persis dengan yang dipakai CI:

```bash
npm run kemampuan      # laptop ini layak nggak dipakai ngukur?
npm run monitor        # laporan buat mata manusia
npm run monitor:test   # bentuk TAP (node:test), sama isinya
npm run monitor -- --json > hasil.json

# nguji nameserver yang belum didelegasikan
NAMESERVERS="ns3.contoh@198.51.100.7" npm run monitor
```

### Peringatan keras: jaringan XL Axiata membajak port 53

Diverifikasi 1 Agu 2026 dari laptop Kukuh:

```
192.0.2.1  (udp) MENJAWAB   ← IP dokumentasi RFC 5737, mustahil ada DNS di situ
198.51.100.1 (udp) MENJAWAB
203.0.113.1  (udp) MENJAWAB
192.0.2.1  (tcp) MENJAWAB   ← TCP pun dibajak, bukan cuma UDP
```

Query ke **IP mana pun** di port 53 dibelokin ke resolver operator. Efeknya dua-duanya bohong:

- query ke `@167.235.234.220` (ns1 kita) balik dengan `RA=1`, tanpa `AA`, bawa OPT, dan SOA-nya
  nyebut `ganz.ns.cloudflare.com` — itu jawaban resolver operator, **bukan** jawaban ns1;
- kalau ns1 beneran mati, laptop tetap dapat jawaban dan monitoring bilang "aman".

**Cara ngendusnya (3 lapis, `monitor/lib/jalur.js`):**

1. **Probe lubang hitam** — kirim query ke `192.0.2.1`, `198.51.100.1`, `203.0.113.1` (RFC 5737)
   dan `2001:db8::1` (RFC 3849). Di internet yang waras jawabannya **wajib timeout**. Ada yang
   jawab = ada yang mencegat. Deterministik, nggak bisa salah tafsir.
2. **Sidik jari jawaban** — server Open-Domain nggak pernah nyalain `RA` dan nggak pernah ngirim
   additional/OPT. Jawaban "dari" ns kita yang `RA=1` atau punya additional = jawaban orang lain.
3. **Nonce** — nama acak yang jawabannya cuma bisa benar kalau logika Open-Domain yang ngitung.

**Kalau kebajak, hasilnya bukan LULUS dan bukan GAGAL, tapi `TIDAK SAH` (exit 3)** — dicetak
sebagai kotak peringatan besar yang bilang terus terang "ini BUKAN tanda nameserver mati", lengkap
dengan bukti dan jalan keluarnya. Di bentuk `node:test`, pemeriksaan pertama namanya
`jalur jaringan pengukur bersih (port 53 nggak dibajak)` dan dia **merah**, bukan di-skip
diam-diam. Diam itu yang bikin orang salah simpulan.

**Jalan keluarnya** (dicetak otomatis di pesan errornya):

1. ganti jaringan (Wi-Fi lain / tethering operator lain);
2. VPN/WireGuard yang bawa DNS-nya sendiri;
3. **pinjam mata server lain** — `./monitor/jauh.sh aicoid` nge-rsync `monitor/` + `src/` ke host
   SSH, jalanin di sana, hasilnya balik ke layar laptop, lalu direktori sementaranya dihapus.
   Sudah diuji dari laptop yang jaringannya kotor: jalan;
4. `gh workflow run nameservers.yml`.

DoH/DoT **nggak** nolong buat ini: keduanya cuma bisa nanya resolver rekursif, sedangkan yang mau
diuji justru tiap nameserver otoritatif satu-satu. DoH cuma dipakai buat discovery.

---

## 7. Berkas

| Berkas | Isi |
|---|---|
| `monitor/lib/dns.js` | klien DNS mini: query ke satu server, UDP/TCP, v4/v6, bongkar header + RR |
| `monitor/lib/jalur.js` | preflight anti-pembajakan + teks peringatannya |
| `monitor/lib/temukan.js` | discovery nameserver: jalan-turun dari root, DoH, env |
| `monitor/lib/kasus.js` | daftar pemeriksaan (§1) — dipakai bareng CLI dan bentuk tes |
| `monitor/periksa.js` | CLI buat manusia + kode keluar 0/1/2/3 |
| `monitor/produksi.test.js` | pembungkus `node:test` buat CI |
| `monitor/kemampuan.js` | laporan kelayakan jaringan pengukur |
| `monitor/jauh.sh` | jalanin monitor dari host SSH lain |
| `.github/workflows/nameservers.yml` | jadwal, badge, issue insiden, notifikasi |

`npm test` sekarang cuma jalanin `test/**/*.test.js` (unit, offline, milidetik). Monitoring
produksi dipanggil terpisah — pola yang sama dipakai sslip.io (`spec/` dipisah dari unit test).

---

## 8. Kondisi terverifikasi (1 Agustus 2026)

Dijalankan beneran dari `aicoid` (jaringannya bersih) ke ns1 produksi: **56 lulus, 6 gagal**.
Semua kegagalannya temuan nyata, bukan alat ukur yang rewel:

| # | Temuan | Kenapa penting |
|---|---|---|
| 1 | ~~**Delegasi a-i.sh dan a-i.st masih di Cloudflare**~~ — **BERES 1 Agu 2026.** Dua-duanya sekarang `ns1.a-i.sh` + `ns2.a-i.st` di registry (.sh lewat Spaceship, .st lewat Dynadot), lengkap dengan glue ke `167.235.234.220` | discovery mode `induk` sekarang nemu nameserver kita sendiri; `NAMESERVERS=` manual nggak perlu lagi |
| 2 | ~~**`ns1.open-domain.com` dan `ns2.open-domain.com` NXDOMAIN**~~ — **BERES.** Nama nameserver dipindah ke **in-zone**: `ns1.a-i.sh` + `ns2.a-i.st`, dan `resolve.js` menjawab A record buat keduanya dari `SELF_IP` | nama in-zone bikin delegasi nggak nyantol ke domain ketiga. Kalau `open-domain.com` bermasalah, resolusi tetap jalan — cuma halaman webnya yang mati |
| 3 | **ns1 nggak dengerin IPv6** | server punya `2a01:4f8:c015:8800::1`, tapi `BIND=167.235.234.220` dan soketnya `udp4` — dari luar: `connection refused`. Klien IPv6-only nggak bisa nyampe |
| 4 | **Serial SOA = `Date.now()/1000` saat proses mulai** | tiap restart serial loncat, dan ns1 vs ns2 **nggak akan pernah sama**. Pemeriksaan "serial seragam" bakal merah permanen begitu ns2 nyala. Harusnya serial deterministik (mis. dari tanggal deploy / commit), sama di semua nameserver |
| 5 | **Query ber-EDNS0 dijawab benar, tapi OPT-nya nggak dibalas** | RFC 6891 minta dibalas. Resolver umum masih maklum, jadi ini catatan, bukan alarm — tapi bakal ganjalan kalau nanti mau DNSSEC |
| 6 | ns1 sehat di UDP **dan** TCP buat a-i.sh + a-i.st; REFUSED buat zone luar (bukan open resolver); NXDOMAIN + SOA authority sudah benar | ini yang hijau — dan sekarang ada buktinya tiap 30 menit |

Yang masih terbuka:

- pindahin delegasi (butuh temuan #2 beres duluan);
- ns2 di benua lain — begitu didelegasikan, monitoring ikut sendiri tanpa ubah kode;
- IPv6 di ns1 (temuan #3) — dan `IPV6=on` di runner yang punya IPv6;
- serial SOA deterministik (temuan #4).
