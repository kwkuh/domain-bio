# Arah & Strategi a-i.sh

Dokumen internal buat Kukuh. Isinya arah besar: gimana a-i.sh pindah dari "utility
wildcard DNS" jadi **infrastruktur publik buat ekosistem agent terbuka**, dan gimana
adopsi itu diubah jadi kelayakan (eligibility) buat program funding OSS. Ini dokumen
**aksi**, bukan teori. Angka yang belum ada ditandai `[TODO]` — jangan dikarang, semua
program funding punya klausul anti-fraud dan reviewer teknis bisa ngecek.

Status per dokumen ini ditulis: repo lokal lengkap (src + web + README/ROADMAP/
CONTRIBUTING/SECURITY/CoC), **belum public, belum deploy**. Itu dua blocker #0.

---

## 0. TL;DR (baca ini kalau cuma punya 30 detik)

1. **Gate semua program funding = ADOPSI.** Bukan kerapihan kode, bukan jumlah star
   doang. Jadi seluruh strategi = mesin yang naikin pemakaian nyata.
2. **Positioning pindah** dari "wildcard DNS ala nip.io" jadi *"public address layer
   for the open agent ecosystem"*. Alasannya: ruang agent-native masih kosong (nol
   inkumben mengklaim), dan framing "critical infrastructure" itu justru pintu resmi
   ke Claude for OSS + NLnet buat proyek yang belum punya star gede.
3. **Urutan yang bener**: deploy gratis (Oracle) → dogfood di produk Kukuh sendiri →
   bikin pembeda (MCP, tunnel, TLS) → distribusi lewat integrasi tooling → baru apply
   program. Adopsi dulu, aplikasi belakangan.
4. **Jalur Claude for OSS tercepat = person-level Kukuh**, bukan metrik a-i.sh. a-i.sh
   disebut terpisah lewat klausul "critical infrastructure — apply anyway".
5. **llms.txt itu ergonomi, bukan discovery.** Jangan gantungin growth ke sana.

---

## 1. Flywheel adopsi → funding

Inti strategi. Tiap putaran nambah bukti pemakaian, tiap bukti pemakaian naikin
kelayakan program, tiap dana/kredit bikin putaran berikutnya lebih gampang.

```
   ┌─────────────────────────────────────────────────────────────┐
   │                                                             │
   ▼                                                             │
[1] DEPLOY  ──►  [2] DOGFOOD  ──►  [3] MCP + PEMBEDA  ──►  [4] LAUNCH/  ──►  [5] APPLY
 gratis di       pakai sendiri     jadi capability      DISTRIBUSI      PROGRAM
 Oracle          di produk Kukuh   yang dipanggil       (integrasi,     (Claude OSS,
 (IP statis      (openbot.id,      agent, bukan         awesome-list,   NLnet, GH
 + port 53)      anton.bot, dll)   diklik manusia       docs PR)        Secure Fund)
                                                                            │
                                                                            │ dana/kredit/
                                                                            │ kredibilitas
                                                                            ▼
                                                              balik ke [1]/[3]:
                                                              HA, secondary NS,
                                                              fitur baru, lebih
                                                              banyak integrasi
```

**Kenapa flywheel, bukan corong satu-arah:** adopsi utility DNS itu efek *compounding*
(sslip.io perlu 10+ tahun & referensi docs enterprise buat sampai 10k qps). Nggak ada
satu peristiwa yang bikin meledak — post nip.io di HN cuma 2 poin. Jadi yang dikejar
bukan "momen viral" tapi **putaran yang nggak berhenti**: tiap produk Kukuh yang pakai
a-i.sh = bukti pemakaian riil yang bisa dikutip di aplikasi funding, sekaligus test-bed
buat nemuin bug & fitur yang bikin integrasi berikutnya lebih gampang.

**Node paling under-rated di flywheel ini = [2] DOGFOOD.** Kukuh punya portofolio produk
agent/bot (openbot.id, anton.bot, ChatHermes, baleswa WA gateway, computer.bot). Tiap
box ephemeral / preview env / WA gateway yang butuh alamat TLS-able = kandidat pengguna
pertama a-i.sh. Ini adopsi paling jujur & paling cepat yang bisa dikontrol sendiri —
nggak nunggu orang lain. Angka query yang dihasilkan dari sini **riil** dan boleh
dikutip.

---

## 2. Perubahan positioning

### Dari
> "a-i.sh — wildcard DNS yang meng-encode IP di hostname, ala nip.io/sslip.io."

### Jadi
> **"a-i.sh — public address layer for the open agent ecosystem."**
> Satu-satunya address utility yang agent-native: docs machine-readable, format
> dashed buat wildcard TLS, stateless, MIT, didesain buat di-embed sebagai *default*
> di tooling agent.

### Kenapa pindah

1. **Ruang agent-native masih kosong.** Terverifikasi: nip.io, sslip.io, traefik.me,
   backname.io, xip.io — **nol** yang positioning ke AI agent, nol yang punya llms.txt.
   Kalau a-i.sh cuma "nip.io ke-46", nggak ada alasan orang pindah. Kalau a-i.sh =
   "address primitive buat agent", dia jadi kategori sendiri.
2. **Framing "critical infrastructure" = pintu funding buat proyek 0-adopsi.** Claude
   for OSS punya klausul persis: *"If you maintain something the ecosystem quietly
   depends on, apply anyway and tell us about it."* NLnet menilai merit teknis + dampak
   open internet, bukan star. Positioning "infrastruktur alamat publik" nyambung
   langsung ke dua pintu ini; positioning "utility DNS kecil" nggak.
3. **Sesuai cara utility ini beneran diadopsi**: jadi *default di dalam tooling orang
   lain* (nip.io jadi default di Knative). "Address layer buat agent" ngarahin energi
   ke embedding di framework/sandbox agent — persis tuas yang belum diklaim siapa pun.

### Yang HARUS dihindari di positioning (biar jujur & tahan review teknis)

- **Jangan klaim "llms.txt bikin a-i.sh ke-discover otomatis sama agent."** Ini
  factually lemah (bukti 2026: crawler AI hampir nggak pernah fetch /llms.txt; John
  Mueller/Google menyamakannya dengan meta keywords tag). llms.txt tetap dibikin
  lengkap & akurat — tapi perannya **hemat token pas agent SUDAH dikasih domain a-i.sh**,
  bukan kanal pertumbuhan. Reviewer teknis bisa bantah klaim discovery, dan itu bikin
  aplikasi funding kelihatan nggak kredibel.
- **Jangan gembungin metrik.** Semua program punya fraud clause. Pakai angka riil atau
  `[TODO]`.

---

## 3. Urutan konkret 30 / 60 / 90 hari

Prasyarat kelayakan yang jam-nya nggak bisa dipercepat, jadi mulai counter-nya SEKARANG:
awesome-list butuh repo umur 30 hari, awesome-selfhosted butuh rilis >4 bulan, Claude for
OSS butuh akun GitHub kwkuh ≥2 tahun + kontribusi publik dalam 90 hari terakhir.

### Hari 0–30 — Publish, deploy, dogfood pertama

- [ ] **Push repo public** ke `github.com/kwkuh/open-domain` (LICENSE MIT sudah ada → syarat
      "maintain ≥1 proyek OSI-approved" otomatis kelar). Ini nyalain jam repo-age.
- [ ] **Deploy resolver** di Oracle Cloud Always Free (ARM Ampere A1, reserved public IP
      statis, security list buka inbound UDP+TCP 53). Delegasi NS `a-i.sh` (di Cloudflare)
      → IP box Oracle. Catat `[TODO: public IP]` + `[TODO: tanggal deploy]`.
      - Verifikasi ulang sebelum andelin: jatah Ampere A1 (dipangkas 15 Jun 2026 jadi
        ~2 OCPU/12 GB — masih overkill buat DNS stateless), dan risiko out-of-capacity
        ARM di region populer (siapin plan B region).
- [ ] **Dogfood #1**: pindahin minimal 1 produk Kukuh ke alamat a-i.sh (kandidat:
      preview env / box ephemeral di openbot.id atau baleswa). Ini bikin query riil
      pertama.
- [ ] **Nyalain rel funding yang murah & nggak butuh adopsi**:
      - GitHub Sponsors (Indonesia didukung) + `.github/FUNDING.yml`.
      - `funding.json` (spec fundingjson.org) di root repo — bikin discoverable buat
        FLOSS/fund nanti.
- [ ] **Verifikasi akun GitHub kwkuh** memenuhi syarat dasar Claude for OSS: umur ≥2
      tahun `[TODO: konfirmasi tanggal buat akun]`, ADA commit/PR/release publik dalam
      90 hari terakhir (kalau belum, mulai kontribusi rutin sekarang).
- [ ] **Instrumentasi metrik** (lihat §4): minimal counter query/hari + IP unik dari
      log resolver. Tanpa ini, nggak ada angka buat aplikasi apa pun.

### Hari 31–60 — Pembeda + MCP + launch lunak

- [ ] **MCP server** buat a-i.sh (encode IP→hostname, kasih alamat TLS-ready, resolve
      cek). Ini ekspresi paling murni "agent-native": agent manggil address layer sebagai
      *tool*, tanpa manusia. Publish + daftarin ke registry MCP.
- [ ] **Managed wildcard TLS** (fitur yang bikin traefik.me sticky). Format dashed
      `1-2-3-4.a-i.sh` udah ada persis buat muat di bawah satu wildcard cert. Buat agent
      ini table-stakes — agent nggak bisa "klik lanjut" di TLS handshake.
- [ ] **Dogfood #2–3**: pindahin 2 produk Kukuh lagi. Target kumulatif `[TODO: N produk]`.
- [ ] **Launch lunak**: Show HN + posting relevan. Perlakukan sebagai **pemantik**, bukan
      mesin adopsi (ekspektasi realistis: puluhan poin, bukan ribuan). Yang penting dari
      launch = dapat feedback + backlink awal, bukan lonjakan permanen.
- [ ] **1 PR awesome-list** yang patuh aturan (repo udah lewat umur 30 hari): kandidat
      awesome-selfhosted (tunggu syarat rilis >4 bulan), awesome-devops, awesome-sysadmin.
      Satu PR rapi per list, bukan blast.

### Hari 61–90 — Distribusi, pembeda besar, aplikasi pertama

- [ ] **Tunnel / reachability buat agent di belakang NAT** — *pembeda kunci*. Semua
      inkumben cuma jalan kalau lo udah punya IP publik; mayoritas agent nggak (ephemeral,
      di belakang NAT). Agent dial-out, a-i.sh kasih alamat publik stabil yang route balik.
      Nggak ada kompetitor yang nutup ini. (Scope-nya besar — kalau 90 hari kekecilan,
      geser ke kuartal berikutnya, tapi taruh di roadmap publik biar jadi narasi.)
- [ ] **Distribusi lewat integrasi**: PR/plugin/contoh ke framework & sandbox agent
      (E2B, Daytona, Modal, devcontainer, dll) supaya a-i.sh jadi opsi terdokumentasi /
      default resolver di template box ephemeral. Ini tuas adopsi paling kuat (pola nip.io
      → Knative). Format dashed/TLS-friendly a-i.sh cocok jadi default di tooling itu.
- [ ] **Apply Claude for OSS** (`claude.com/contact-sales/claude-for-oss`) — rolling
      review, cap 10.000, first-come. **Lead dengan jejak person-level Kukuh** (Track 3:
      100+ PR merged ke repo orang lain 12 bln — mis. OpenCut & repo lain; atau Track 2
      committer proyek foundation), lalu **sebut a-i.sh terpisah** via klausul critical-
      infrastructure ("apply anyway"). Jangan nunggu star.
- [ ] **Siapin draft aplikasi NLnet/NGI Zero** (belum submit — open call reguler lagi
      dijeda, buka lagi ~akhir 2026). Framing R&D infrastruktur agent-native + "European
      dimension" `[TODO: rumuskan angle European]`. Pantau `nlnet.nl/propose`.
- [ ] **GitHub Secure Open Source Fund** ($10k + $10k Azure, rolling, Indonesia = region
      Sponsors yang didukung) begitu ada adopsi awal + repo public. Framing keamanan DNS
      (DNS = attack surface).

---

## 4. KPI yang harus dilacak (biar eligible)

Aturan keras: **angka riil atau `[TODO]`**. Instrumentasi dari log resolver + GitHub +
data integrasi. Ini metrik yang dibaca reviewer program.

| KPI | Kenapa penting | Nilai sekarang | Target 90 hari |
|---|---|---|---|
| GitHub stars | proxy adopsi paling umum (DigitalOcean OSS, awesome-list konteks) | `[TODO]` | `[TODO]` |
| Query DNS / hari | bukti pemakaian NYATA (paling kuat buat "critical infra") | `[TODO]` | `[TODO]` |
| IP unik / bulan (resolver) | proksi jumlah host/agent yang beneran pakai | `[TODO]` | `[TODO]` |
| Produk Kukuh yang pakai (dogfood) | adopsi terkontrol, bisa disebut per-nama | `[TODO]` | `[TODO]` |
| Integrasi eksternal (tool/docs yang refer a-i.sh) | tuas adopsi ala nip.io→Knative | `[TODO]` | `[TODO]` |
| Kontributor eksternal unik (PR merged) | Track 4 Claude OSS; sinyal komunitas | `[TODO]` | `[TODO]` |
| Sponsors (GitHub) | sinyal "fundable" | `[TODO]` | `[TODO]` |
| Uptime resolver | kredibilitas "infrastruktur" (fear #1 = continuity) | `[TODO]` | `[TODO]` |

### Ambang per-program (biar tau KPI mana yang buka pintu mana)

- **Claude for OSS** (penuhi SALAH SATU track — dinilai level ORANG, bukan proyek):
  - Track 1 Maintainer: 500+ dependent repos **ATAU** 100+ dependent packages **ATAU**
    200.000+ download/bln. (Susah buat a-i.sh karena ini layanan hosted, bukan package.)
  - Track 2 Core contributor: committer terdaftar di proyek foundation (Node.js TSC,
    CNCF, dll). ← jalur person-level Kukuh kalau ada.
  - **Track 3 Active contributor: 100+ PR merged ke repo BUKAN milik sendiri / 12 bln.**
    ← **jalur paling realistis buat Kukuh** (kontribusi OpenCut + repo lain).
  - Track 4 Community builder: 20+ kontributor eksternal unik dengan PR merged / 12 bln.
  - Track 5 Critical infra: repo dengan OpenSSF criticality score ≥ 0.4. (Catatan: 0.4
    itu heuristik informal, BUKAN ambang resmi; skornya under-reward layanan hosted.
    Jangan jadiin KPI formal.)
  - **Klausul fleksibel**: "apply anyway and tell us about it" ← pintu resmi a-i.sh.
  - Syarat DASAR (wajib semua): akun GitHub ≥2 tahun, in good standing, kontribusi
    publik dalam 90 hari, maintain ≥1 proyek lisensi OSI.
- **NLnet / NGI Zero**: nggak butuh star. Skor tertimbang harus >5 dari 7; proyek wajib
  open source + menguntungkan open internet, R&D sebagai tujuan. Grant €5k–€50k, per
  milestone. Hambatan: non-Eropa cuma prioritas kalau "exceptional quality + keahlian
  unik + European dimension jelas". Call reguler dijeda sampai ~akhir 2026.
- **GitHub Secure OSS Fund**: maintainer proyek lisensi OSS di region Sponsors yang
  didukung (Indonesia OK). $10k + $10k Azure + program keamanan 3 minggu. Rolling.
- **FLOSS/fund (Zerodha)**: $10k–$100k, global, no-strings — TAPI eksplisit **menolak
  proyek baru/minim-pemakaian**. Baru realistis SETELAH adopsi terbukti. `funding.json`
  disiapkan dari sekarang biar tinggal apply.
- **Sovereign Tech Fund**: model kontrak/komisi min €50k, syarat "sudah jadi infra
  kritis yang banyak dipakai". Fase lanjut, bukan sekarang.
- **DigitalOcean OSS credits**: di-gate star (100+ = $60/th, 500+ = $250/th, 10.000+ =
  hingga $20k/th). Nice-to-have setelah star naik, bukan fondasi.

---

## 5. Pembeda yang harus dibangun

Ini yang bikin a-i.sh **bukan** "nip.io ke-46". Urutan = dampak diferensiasi × kelayakan
teknis.

1. **MCP server** (agent manggil address layer sebagai tool). Ekspresi paling langsung
   dari "agent-native". Nggak ada inkumben yang punya. Relatif murah dibangun. → prioritas
   tinggi, target 30–60 hari.
2. **Tunnel / reachability buat agent di belakang NAT** — **pembeda terkuat**. Inkumben
   cuma berguna kalau lo udah punya IP publik; mayoritas agent nggak punya. Ini
   memperluas pasar dari "host yang udah reachable" ke "semua agent". Scope besar → mulai
   desain di 90 hari, ship bertahap.
3. **Managed wildcard TLS** (dashed encoding udah disiapkan buatnya). Table-stakes buat
   agent (nggak bisa klik-lanjut TLS). Ini yang bikin traefik.me sticky. → 60 hari.
4. **Named handles — `myagent.a-i.sh`** buat agent yang butuh identitas stabil lintas
   restart/re-IP. Dilayer di atas core stateless (path IP-encoding gratis nggak pernah
   gantung ke ini). Satu-satunya tempat tier paid/managed opsional mungkin hidup —
   resolver tetap gratis & self-hostable. → fase lanjut.
5. **Self-hostability first-class** (docs + guide). Bukan fitur mewah: ini jawaban
   langsung ke fear #1 developer (continuity, xip.io mati). Diferensiasi vs inkumben
   closed. → ongoing, docs digarap paralel.

Prinsip pembeda: **core resolver stateless & gratis selamanya nggak boleh gantung ke
fitur mana pun di atas.** Semua pembeda dilayer, opsional, self-hostable.

---

## 6. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Adopsi lambat** (gate semua funding) | Nggak lolos program mana pun | Dogfood produk Kukuh dulu = adopsi terkontrol yang nggak nunggu orang lain; kejar integrasi di tooling (bukan andelin launch viral). |
| **Single box = SPOF** (Oracle 1 instance) | Resolver mati = semua alamat mati = fear continuity kebukti | Jatah 2 VM Oracle → primary + secondary NS; arah anycast. Self-hostable = safety net. |
| **Out-of-capacity ARM** di region Oracle populer | Nggak bisa deploy | Siapin plan B region; atau AMD E2.1.Micro sbg cadangan (DNS stateless ringan). |
| **Gantung ke klaim llms.txt = discovery** | Aplikasi funding kelihatan nggak kredibel di review teknis | Framing jujur: llms.txt = ergonomi hemat-token, bukan growth. Discovery nyata = distribusi lewat integrasi. |
| **Deadline usang / misinfo program** (mis. "Claude OSS tutup 30 Jun 2026") | Salah timing, nggak jadi apply | Andelin teks halaman RESMI. Program open-ended, ekspansi 8 Jul 2026 konfirmasi masih buka. |
| **Godaan gembungin metrik** | Diskualifikasi (fraud clause Sec. 7) | Angka riil atau `[TODO]`. Metrik dari log resolver + GitHub, bukan karangan. |
| **Person-level eligibility Kukuh belum kuat** (PR ke repo orang <100, akun <2 th, atau nggak ada kontribusi 90 hari) | Nggak lolos syarat DASAR Claude OSS | Audit akun kwkuh SEKARANG; kalau kurang, mulai kontribusi rutin + konfirmasi umur akun. Ini prasyarat yang jam-nya nggak bisa dipercepat. |
| **Hambatan geografis NLnet** (non-Eropa prioritas rendah) | Proposal ditolak | Rumuskan "European dimension" eksplisit `[TODO]`; posisikan NLnet sbg jalur medium-term, bukan andalan tunggal. |
| **Scope tunnel/TLS meledak** | Ship telat, momentum ilang | Ship bertahap; resolver + MCP + TLS dulu (nilai jelas), tunnel di-desain paralel tapi nggak jadi blocker rilis. |
| **Domain a-i.sh/a-i.st lapse** (registrar) | Kehilangan seluruh alamat | Pantau tanggal expiry `[TODO]`; auto-renew; a-i.st sbg cadangan. |

---

*Maintainer: Kukuh Adi Laksana Rahman ([@kwkuh](https://github.com/kwkuh)). Dokumen ini
arah strategis internal — angka riil atau `[TODO]`, nggak ada metrik karangan. Selaras
dengan ROADMAP.md (eksekusi teknis) dan README.md (positioning publik).*
