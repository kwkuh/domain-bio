# Permohonan kenaikan batas Let's Encrypt

**Form:** https://isrg.formstack.com/forms/rate_limit_adjustment_request (11 halaman)
**Status:** belum dikirim — pengisian akhir & tombol Submit ada di tangan Kukuh.

## Kenapa ini penting, dan kenapa harus sekarang

Orang memakai wildcard-IP DNS justru supaya bisa HTTPS. Batas Let's Encrypt
**"New Certificates per Registered Domain" = 50 per 7 hari**, isi ulang 1 tiap
202 menit. Yang dihitung "registered domain" adalah `a-i.st` sebagai **satu
entitas** — bukan per pengguna. Jadi pengguna ke-51 dalam seminggu gagal, dan
dia akan menyimpulkan layanannya rusak, bukan bahwa kuotanya habis.

`a-i.st` dan `a-i.sh` **tidak ada di Public Suffix List**, dan jalur itu tertutup:
PSL menolak layanan wildcard-IP (issue #335 ditutup dalam 16 menit).

Preseden yang menguntungkan: **sslip.io/nip.io dinaikkan dari 50 → 250.000.**
Permintaan mereka ke 500.000 ditolak. Jadi jalurnya nyata dan pernah dikabulkan
untuk layanan yang bentuknya persis sama.

⏳ **Lead time:** form ditinjau mingguan, perubahan didorong ke produksi dua kali
sebulan, dan mereka menulis eksplisit *"we cannot guarantee any timeline"*.
Ini satu-satunya pekerjaan yang tidak bisa dikejar belakangan.

💡 Renewal **dikecualikan** dari batas ini. Yang memakan kuota cuma sertifikat
untuk nama baru — dan di layanan ini, tiap pengguna baru = nama baru.

## Jawaban siap tempel

| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | Have you read the Integration Guide? | ✅ centang |
| 2 | Have you read the Rate Limits Documentation? | ✅ centang |
| 3 | Are you receiving a rate limit message? | **No, I am proactively reaching out** |
| 4 | For which rate limit do you need an override? | **Certificates per Registered Domain** |
| 5 | Apply to Account ID or Domains? | **Domain(s)** |
| 6 | Domains (maks 3, eTLD+1) | `a-i.st` dan `a-i.sh` |
| 7 | Largest new certs/week, **ignoring** renewals | **300 – 1,000** — lihat catatan di bawah |
| 8 | Largest new certs/week, **including** renewals | **300 – 1,000** |
| 9 | Organization / Company Name | `Open-Domain` |
| 10 | Organization / Company Website | `https://open-domain.com` |
| 11 | What ACME client do you use? | lihat teks di bawah |
| 12 | Your Email Address | `kuhlaksana@gmail.com` |
| 13 | First / Last Name | isi sendiri |
| 14 | Privacy Policy acknowledgement | ✅ centang |
| 15 | Technical Email Updates | **Opt In** — kalau batas berubah, kita mau tahu duluan |
| 16 | Monthly newsletter | bebas |
| 17 | Financially supporting Let's Encrypt? | **Not at this time** |

### Catatan soal angka (pertanyaan 7 & 8)

Pilihan terendah di form adalah **100 – 300**, dan itu pun sudah 2–6x batas bawaan.

- **300 – 1,000** = rekomendasi. Sekitar 43–143 nama baru per hari. Cukup untuk
  tahun pertama adopsi tanpa terdengar mengada-ada.
- **10,000+** memicu pertanyaan tambahan "sebutkan angka pastinya" dan menuntut
  pembenaran. Dengan traksi masih nol, itu justru memperbesar peluang ditolak.
- Boleh mengajukan lagi nanti kalau memang terpakai. Menaikkan permintaan yang
  terbukti dipakai jauh lebih mudah daripada mempertahankan angka yang dikarang.

⚠️ **Jangan mengarang angka.** Traksi Open-Domain hari ini nol. Yang ditanyakan
adalah kebutuhan ke depan, jadi 300–1,000 itu proyeksi yang jujur — bukan klaim
tentang keadaan sekarang.

### Teks untuk "Tell us about the service(s) or product(s)"

> Open-Domain is a free wildcard-IP DNS service on the suffixes a-i.st and a-i.sh.
> Appending a suffix to any IP address returns that IP: 203.0.113.10.a-i.st resolves
> to 203.0.113.10. Every answer is computed from the query name, so there is no
> database, no signup, no API key, and no account. It is the same shape of service
> as nip.io and sslip.io, and the source is MIT-licensed at
> https://github.com/kwkuh/open-domain
>
> Subscribers use it to obtain certificates for machines that have an IP address but
> no domain name: local development, homelab services, CI runners, ephemeral preview
> environments, and agent-to-agent addressing. Each such subscriber needs a
> certificate for a distinct hostname under a-i.st or a-i.sh.
>
> Because the entire service lives under two registered domains, every subscriber
> draws from the same per-registered-domain bucket. The default of 50 certificates
> per week is therefore shared across all users of the service rather than being per
> user, which is why we are asking proactively rather than after subscribers start
> failing.
>
> We understand nip.io and sslip.io were granted an adjustment for the same
> structural reason. Our expected volume is far smaller; we are asking for headroom
> for early adoption, not for their scale.

### Teks untuk "What ACME client do you use?"

> Not applicable to us directly — we operate the DNS layer only and do not request
> certificates ourselves. Our subscribers run their own ACME clients against their
> own machines; in practice that is Certbot, acme.sh, Caddy, Traefik, and
> cert-manager. We do not proxy, batch, or intermediate their requests.

## Sesudah dikirim

- Mereka mengabari lewat email ketika permohonan diproses.
- Sambil menunggu, halaman utama **belum boleh** menjanjikan HTTPS mulus. Sebutkan
  apa adanya bahwa kuota sertifikat dibagi bersama sampai penyesuaian turun.
- Kalau ditolak: sebutkan jumlah pengguna nyata yang sudah ada dan ajukan ulang.
  Permintaan yang didukung pemakaian terukur jauh lebih kuat daripada proyeksi.
