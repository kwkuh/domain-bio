# Riset Pendanaan & Adopsi OSS untuk a-i.sh

> Laporan riset terverifikasi untuk Kukuh. Fokus: bikin **a-i.sh** (wildcard DNS agent-native, MIT, stateless) jadi 100% free + open-source, lolos **Claude for Open Source**, dan buka jalur funding/kredit infra OSS.
>
> **Aturan baca:** semua angka di sini dari sumber tersitasi. Yang belum diketahui ditandai `[TODO]`. Bagian paling penting = **[§7 Koreksi Hasil Verifikasi](#7-koreksi-hasil-verifikasi)** — utamakan itu kalau ada konflik dengan bagian lain.
>
> Username GitHub konsisten: **kwkuh**. Repo target: **github.com/kwkuh/open-domain**.

---

## Ringkasan Eksekutif (TL;DR)

1. **Gate semua program = ADOPSI/USAGE**, bukan kerapihan kode. Prioritas #0 = publish repo publik + deploy + kejar bukti pemakaian nyata (query/detik, integrasi, stars).
2. **Claude for Open Source** = peluang tercepat & paling realistis. Dinilai di **level ORANG, bukan proyek** — jadi a-i.sh yang 0 adopsi **bukan blocker**. Apply lewat jejak person-level Kukuh (Track 3: 100+ PR ke repo orang lain, mis. OpenCut) + sebut a-i.sh terpisah via jalur **critical infrastructure ("apply anyway")**.
3. **Syarat dasar yang sering terlewat:** akun GitHub kwkuh harus **umur ≥ 2 tahun** + ADA kontribusi publik (commit/PR/release) dalam **90 hari terakhir** + maintain ≥ 1 proyek lisensi OSI (repo a-i.sh MIT sudah cukup).
4. **Hosting mesin DNS:** **Oracle Cloud Always Free** = pemenang jelas (gratis PERMANEN, IP statis, port 53 bisa dibuka). Managed DNS mana pun (Cloudflare/Route 53) TIDAK bisa jalanin wildcard computed.
5. **Langkah murah SEKARANG (tanpa nunggu adopsi):** aktifkan GitHub Sponsors (Indonesia didukung) + `FUNDING.yml`, bikin `funding.json`, publish repo, deploy di Oracle → mulai "jam terbang".
6. **llms.txt BUKAN kanal discovery** (lihat §7). Tetap bikin — tapi perannya hemat-token setelah agent dikasih domain, bukan growth. Discovery nyata = integrasi ke tooling/sandbox agent.

---

## 1. Claude for Open Source (Anthropic)

Program memberi **6 bulan Claude Max 20x GRATIS** (~$1.200) untuk maintainer/kontributor OSS. Cap **10.000 penerima**, **1 per orang**, review rolling.

- **Apply:** https://claude.com/contact-sales/claude-for-oss (alias yang disebut satu sumber: `claude.com/open-source-max`)
- **Terms resmi:** https://www.anthropic.com/claude-for-oss-terms

### 1.1 Yang ditawarkan
| Item | Detail |
|---|---|
| Benefit | Claude Max 20x gratis, 6 bulan (~$1.200 = $200/bln × 6) |
| Setelah 6 bulan | Kalau sebelumnya punya plan berbayar → lanjut plan lama; kalau tidak → balik ke Free |
| Aktivasi | Kode gift harus diaktifkan **dalam 90 hari** setelah diterima |
| Cap | "up to 10,000 approved recipients"; 1 subscription aktif per orang |

Sumber: https://www.anthropic.com/claude-for-oss-terms

### 1.2 Eligibility DASAR (WAJIB semua pelamar)
- Natural person (bukan badan usaha), ≥ 18 tahun / dewasa di yurisdiksinya.
- Legal resident negara tempat Claude.ai tersedia; **bukan** karyawan/kontraktor/keluarga inti Anthropic.
- Akun GitHub **"in good standing", umur ≥ 2 TAHUN**.
- Ada aktivitas kontribusi OSS publik (commit, PR, review, atau release) dalam **90 hari terakhir** sebelum submit.
- Maintain/kontribusi ke **≥ 1 proyek berlisensi OSI-approved** (repo a-i.sh MIT ✅).

Sumber: https://www.anthropic.com/claude-for-oss-terms

### 1.3 Lima track eligibility maintainer (cukup penuhi SALAH SATU)
| # | Track | Ambang persis |
|---|---|---|
| 1 | Maintainer/Library author | 500+ dependent repos **ATAU** 100+ dependent packages **ATAU** 200.000+ download bulanan gabungan (npm/PyPI/crates.io/RubyGems) |
| 2 | Core contributor | committer/maintainer terdaftar di proyek foundation/bahasa (CPython, Rust team, Node.js TSC, Apache PMC, CNCF, Kubernetes, Linux kernel, Django, Rails, dll) |
| 3 | Active contributor | **100+ PR di-merge ke repo yang BUKAN milikmu** dalam 12 bulan terakhir |
| 4 | Community builder | salah satu repo-mu punya 20+ kontributor eksternal unik dengan PR merged dalam 12 bulan |
| 5 | Critical infrastructure | repo yang kamu maintain punya **OpenSSF criticality score ≥ 0.4** |

Sumber: https://claude.com/contact-sales/claude-for-oss

### 1.4 Jalur edge-case / "Ecosystem Impact Track" (diskresioner) — KUNCI buat a-i.sh
Anthropic menulis eksplisit:

> "Don't quite fit? If you maintain something the ecosystem quietly depends on, apply anyway and tell us about it."

Terms menyebutnya **"Ecosystem Impact Track"** — pertimbangan diskresioner untuk kontribusi signifikan yang tak terukur metrik standar. Ini pintu resmi buat a-i.sh diframing sebagai **"public address layer for the open agent ecosystem"**.

Sumber: https://claude.com/contact-sales/claude-for-oss

### 1.5 Insight person-level (proyek 0 adopsi BUKAN penghalang)
Track 2 & Track 3 dinilai di **level ORANG**, bukan proyek. Eligibility bisa dari "authorship of 100+ pull requests merged in others' repos within 12 months". Jadi a-i.sh yang belum punya adopsi TIDAK jadi penghalang — Kukuh bisa lolos lewat riwayat kontribusinya sendiri (mis. OpenCut & repo lain).

**Strategi apply:** pakai proyek/jejak terkuat yang ADA, lalu sebut a-i.sh terpisah lewat jalur critical-infrastructure.

Sumber: https://www.anthropic.com/claude-for-oss-terms

### 1.6 Proses, tips, dan kalibrasi
- **Proses:** rolling review per track; notifikasi acceptance via email; ada pemberitahuan sebelum masa 6 bulan berakhir.
- **Yang dihargai Anthropic:** ECOSYSTEM IMPACT (dependents, downloads, pengguna produksi) **di atas** jumlah stars. Deskripsikan workflow maintainer konkret (triage, release, security, docs). Apply dengan repo TERKUAT, bukan yang terbaru.
- **Fraud clause (Section 7):** jangan menggelembungkan metrik (bot/purchased engagement/multiple accounts) — bisa diskualifikasi.
- **Kalibrasi penerima:** Daniel Avila diterima dengan "Claude Code Templates" (22.000+ stars, 111.000+ download npm). Itu **batas atas** kalibrasi, bukan ambang minimum — ekspansi Juli + jalur person-level/critical-infra dibuat justru agar yang di bawah angka itu tetap lolos.

Sumber: https://explainx.ai/blog/claude-for-open-source-expanded-max-20x-july-2026 ; https://medium.com/@dan.avila7/i-got-selected-for-claude-for-open-source-program-heres-how-you-can-apply-too-1024da17ef31

### 1.7 Catatan timeline & deadline
- Program **diperluas 8 Juli 2026** dari kriteria awal (5.000 stars / 1M download npm, Feb 2026) menjadi 5 track yang lebih inklusif. **Kriteria Juli inilah yang berlaku sekarang.**
- Deadline "30 Juni 2026" dari sumber lama **SUDAH USANG**. Terms resmi menyatakan periode aplikasi **open-ended** sampai Anthropic menutupnya; ekspansi 8 Juli mengonfirmasi masih dibuka. **Apply sekarang** (rolling + cap 10.000 = first-come).

Sumber: https://explainx.ai/blog/claude-for-open-source-expanded-max-20x-july-2026

### 1.8 Aksi konkret Claude for OSS
- [ ] Pastikan akun **kwkuh ≥ 2 tahun** + ada commit/PR/release publik dalam **90 hari**.
- [ ] Push repo a-i-dns ke **github.com/kwkuh/open-domain** dengan LICENSE MIT (memenuhi syarat "≥ 1 proyek OSI").
- [ ] Apply lewat **jejak person-level** (Track 3: 100+ PR ke repo orang, mis. OpenCut) — bukan metrik a-i.sh.
- [ ] Sebut a-i.sh terpisah via **"Ecosystem Impact / critical infrastructure — apply anyway"**, framing "public address layer for the open agent ecosystem" + workflow konkret (agent-native DNS, llms.txt, stateless, MIT).
- [ ] Lead dengan DAMPAK EKOSISTEM, bukan stars. Jangan mengarang metrik (fraud clause §7).

---

## 2. Grant Infrastruktur Internet OSS

Ringkasan realisme untuk maintainer Indonesia + proyek 0 adopsi:

| Program | Angka | Geo (Indonesia?) | Gate adopsi | Realistis untuk a-i.sh sekarang? |
|---|---|---|---|---|
| **NLnet / NGI Zero** | €5k–50k (bisa naik ~150k, plafon seumur hidup 500k), milestone-based | Boleh dari luar EU, **tapi prioritas EU/Horizon Europe** | Merit teknis + dampak open internet (tidak butuh stars) | Berat (hambatan geo) + open call reguler lagi **dijeda** |
| **FLOSS/fund (Zerodha)** | $10k–$100k/thn (pool $1jt/thn) | Global, Indonesia OK (butuh rekening + dok pajak; ada urusan tax residency India) | **Menolak proyek baru/minim-usage** | ❌ Belum — target SETELAH adopsi terbukti |
| **Sovereign Tech Fund** | Min **> €50k**, model kontrak/komisi (bukan hibah) | Worldwide (opsi employment hanya Jerman) | Harus **sudah** infrastruktur kritis banyak dipakai | ❌ Belum realistis |
| **GitHub Secure OSS Fund** | **$10k tunai + $10k kredit Azure** + program 3 minggu | Region yang didukung GitHub Sponsors (**Indonesia OK sejak 2022**) | Maintainer proyek OSS berlisensi valid | ✅ Paling aksesibel — begitu repo publik |
| **GitHub Accelerator** | Lihat §2.5 (koreksi finansial di §7) | Worldwide, tim maks 3 | Kontributor/maintainer OSS | Tematik cocok, **tapi tak ada window terbuka terkonfirmasi 2026** |

### 2.1 NLnet / NGI Zero
- **Eligibility geo (kutipan resmi):** "Given equal proposals, inhabitants of the EU and countries associated to Horizon Europe are given priority" dan proposal dari luar area itu eligible **hanya** kalau "exceptional quality + unique technical expertise ... under the condition that there is a clear European dimension." Istilah "European dimension" tidak didefinisikan — harus di-frame sendiri.
- **Ukuran & syarat:** €5.000–€50.000 (bisa scale up), semua hasil harus open access + lisensi FOSS. "In principle anyone can apply." Tema = protokol & infrastruktur internet inti (privacy, desentralisasi, jaringan) — DNS agent-native cocok tematik.
- **Seleksi 2 tahap:** filter kriteria minimal → skor tertimbang harus **> 5 dari 7** → tahap 2 pilih paling berdampak buat masyarakat. Proyek HARUS open source DAN menguntungkan open internet, R&D sebagai tujuan utama.
- **Timing (per Juli 2026):** open call **REGULER dijeda**; sementara cuma NGI Taler & NGI Fediversity yang buka (deadline 1 Agustus 2026, **tidak relevan** untuk DNS). Call reguler "will reopen after the summer" (transisi ke "Open Internet Stack"). Deadline Commons Fund 1 Juni 2026 sudah lewat.

Sumber: https://nlnet.nl/commonsfund/eligibility/ ; https://nlnet.nl/funding.html ; https://nlnet.nl/propose/ ; https://nlnet.nl/useroperated/guideforapplicants/

### 2.2 FLOSS/fund (Zerodha, India)
- **Global, Indonesia bisa** — asal punya "a bank account and the necessary tax documents (which vary between jurisdictions)"; karena entitas India, penerima harus lengkapi dokumen tax residency sesuai hukum India. **No strings attached** soal arah proyek.
- **TAPI gate keras:** fokus "existing, widely used, and impactful projects"; eksplisit "very new projects or projects with minimal usage are not considered for the time being."
- **Angka:** $10.000–$100.000/tahun (kelipatan $25k setelah minimum), pool $1jt/tahun. Review tiap akhir kuartal, pencairan ~4 minggu paperwork.
- **Cara apply:** tulis manifest **`funding.json`** (spec di fundingjson.org), publish di repo/website, submit URL-nya.
- **Aksi:** bikin `funding.json` di repo SEKARANG (murah, standar terbuka), apply nanti setelah adopsi naik.

Sumber: https://floss.fund/faq/ ; https://floss.fund/

### 2.3 Sovereign Tech Fund (Jerman)
- Terima aplikasi **seluruh dunia** (Indonesia OK), TAPI **bukan hibah bebas** — model kontrak/komisi kerja. "commissions specific work ... rather than distributing simple grants"; pembayaran diikat ke invoice + progress report + scoping phase + review pakar eksternal.
- **Minimum kerja > €50.000.** Tidak eligible kalau entitas publik lain sudah mendanai aktivitas sama. Opsi individu (Fellowship/freelance) worldwide; opsi employment hanya untuk yang berhak kerja di Jerman.
- **Verdict:** taruh di "nanti setelah a-i.sh terbukti kritis & banyak dipakai".

Sumber: https://www.sovereign.tech/programs/fund

### 2.4 GitHub Secure Open Source Fund — JALUR PALING AKSESIBEL
- **Benefit:** "$10,000 per project in funding, a 3 week program with 5-10 hours of instruction and workshops, and $10,000 in Azure credits." Rolling applications.
- **Syarat:** "current maintainer of an open source project with a valid open source license and located in one of the regions supported by GitHub Sponsors." Indonesia **sudah didukung sejak 2022**.
- **Framing pas:** keamanan (DNS = permukaan serangan). Cocok begitu repo a-i.sh publik.

Sumber: https://github.com/open-source/github-secure-open-source-fund

### 2.5 GitHub Accelerator
- **Worldwide**, tim maks 3 orang, aplikasi gratis, program 10 minggu (~10 proyek). Tema "AI advancements in the open" — cocok dengan positioning agent-native.
- **KOREKSI PENTING (lihat §7):** ini sebagian besar **HIBAH non-dilutif** ($40k sponsorship + ~$350k benefit Microsoft/Azure = ~$400k), **bukan** "jalur investasi via M12" seperti sering diklaim. Peran M12 cuma "introduction + office hour". **DAN** tidak ada cohort 2025/2026 terkonfirmasi — cohort terakhir 2024, aplikasi TUTUP. Bukan actionable sekarang; pantau accelerator.github.com.

Sumber: https://accelerator.github.com/ ; https://github.com/open-source/accelerator

### 2.6 GitHub Sponsors (rel pembayaran & sinyal "fundable")
- Mendukung **Indonesia sejak 2022** (ekspansi 30 region). "Anyone in these regions can sign up right away if you have a bank account in one of the aforementioned countries."
- **Aksi termurah & tercepat:** aktifkan Sponsors di profil kwkuh + repo a-i.sh, pasang tombol Sponsor + `FUNDING.yml`. Jadi prasyarat/rel pembayaran beberapa program lain (mis. Secure OSS Fund pakai region Sponsors).

Sumber: https://github.blog/news-insights/company-news/github-sponsors-available-in-30-new-regions-2/

---

## 3. Kredit Cloud & Hosting Mesin DNS

**Prinsip arsitektur (keras):** authoritative DNS wildcard yang **computed** (baca hostname → hitung IP) TIDAK bisa pakai managed DNS mana pun (Cloudflare DNS, Route 53, OCI Public DNS) — semuanya cuma serve record statis. Mesin a-i.sh (`src/server.js`, UDP+TCP :53, stateless) WAJIB jalan di **VM dengan IPv4 publik statis + izin inbound UDP+TCP port 53**.

Sumber: https://docs.oracle.com/en-us/iaas/Content/DNS/Concepts/gettingstarted.htm

### 3.1 Oracle Cloud Always Free — PEMENANG (gratis PERMANEN)
| Aspek | Detail |
|---|---|
| Compute | ARM Ampere A1 (VM.Standard.A1.Flex): per Juli 2026 = 1.500 OCPU-jam + 9.000 GB-jam/bln ≈ **~2 OCPU + 12 GB RAM** (turun dari 4 OCPU/24 GB per 15 Juni 2026) + 2× AMD E2.1.Micro |
| Storage / egress | 200 GB block storage, 10 TB egress/bln |
| IP statis | **Reserved public IP** = objek persisten yang tetap walau instance stop/start |
| Port 53 | Security list **wajib/boleh** allow inbound UDP+TCP 53. Satu-satunya port yang diblok default = **OUTBOUND 25 (SMTP)**, bukan 53 |
| Sifat | **Always Free** — tidak ada masa kadaluarsa kredit. Matiin biaya server DNS permanen |

Untuk DNS stateless yang ringan, 2 OCPU/12 GB masih **jauh lebih dari cukup** — pemangkasan 15 Juni praktis tak ngefek. Catatan: 1 box = single point of failure (buat mulai OK); jatah 2 VM bisa dipakai primary+secondary NS nanti. Tenancy baru kadang kena **out-of-capacity ARM** di region populer — siapkan plan B region.

Sumber: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm ; https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/ ; https://docs.oracle.com/en/learn/reserved-pub-ip/index.html

### 3.2 Program CDN/edge — BUKAN untuk port 53
- **Cloudflare OSS (Project Alexandria):** upgrade gratis ke Pro + akses Workers/Pages/R2/Zero Trust. Eligibility: proyek OSS berlisensi, non-profit, pasang link balik. **Bukan** tempat authoritative nameserver. Kegunaan nyata: host landing `web/index.html` + `llms.txt` di Pages/Workers, dan pakai Cloudflare cuma untuk **delegasi NS** ke box Oracle.
- **Fastly Fast Forward:** komit $50jt layanan gratis OSS. Sama — CDN/edge (VCL/Compute@Edge) buat landing page + llms.txt, **bukan** authoritative DNS.

Sumber: https://blog.cloudflare.com/cloudflare-new-oss-sponsorships-program/ ; https://www.fastly.com/fast-forward

### 3.3 Kredit startup (cadangan — semua expire dan/atau di-gate adopsi)
| Program | Kredit | Catatan |
|---|---|---|
| AWS Activate Founders | $1.000 + $350 support | Startup <10 thn, <10 karyawan, funding <$1jt, non-VC. EC2 + Elastic IP + SG port 53 bisa, tapi kredit cepat habis |
| Microsoft for Startups | Basic $1.000 → Enhanced $5.000 → investor $150k | Wajib entitas bisnis legal + produk software + Azure customer baru. Perusahaan jasa umumnya tidak lolos. Kredit expire |
| DigitalOcean OSS | Testing 100+ stars = $60/thn; Staging 500+ = $250; Production 10.000+ = $250–$20.000/thn | **Di-gate GitHub stars** (masalah ayam-telur). Reapply tiap tahun. Nice-to-have setelah stars naik |

Sumber: https://aws.amazon.com/startups/credits/ ; https://learn.microsoft.com/en-us/startups/microsoft-for-startups/overview ; https://www.digitalocean.com/open-source/credits-for-projects

### 3.4 GitHub (bukan hosting DNS, tapi aset OSS gratis)
Repo publik dapat Actions + storage **unlimited** gratis, plus CodeQL, Dependabot, secret scanning — cukup untuk CI/test + auto-deploy tanpa biaya. Peran GitHub: (1) rumah repo + CI/CD, (2) funding via Sponsors, (3) Copilot Pro gratis untuk maintainer OSS populer. **Tidak** menyediakan box port 53.

Sumber: https://github.com/open-source

---

## 4. Playbook Adopsi

Temuan besar: adopsi utility DNS ini **BUKAN** dari satu post HN viral, tapi dari **efek compounding 10+ tahun** — di-referensiin di docs enterprise + jadi DEFAULT di tooling populer.

### 4.1 Bukti mekanisme adopsi
- **sslip.io:** beroperasi 10+ tahun, server terima **10.000+ query/detik**; di-referensiin docs resmi Google, IBM (RedBooks), AMD, Cisco, Oracle (Verrazzano). Let's Encrypt sampai naikin limit sertifikat dari 50 → 250.000.
- **Knative** pakai base domain **nip.io sebagai DEFAULT** — cluster baru langsung bisa dites tanpa konfig DNS. Verrazzano/Epinio kasih opsi konfig ke nip.io/sslip.io.
- **traefik.me:** nempel ke ekosistem Traefik via nama + kasih **wildcard TLS pre-issued**. Strategi beachhead: pilih satu komunitas + kasih fitur persis kebutuhan mereka. Format **dash a-i.sh (`1-2-3-4.a-i.sh`)** selaras dengan angle wildcard TLS ini.
- **Show HN cuma pemantik:** backname.io Show HN = 46 poin; post nip.io di HN cuma **2 poin** padahal salah satu paling banyak diadopsi. Jangan gantung adopsi ke satu peluncuran.
- **Kekhawatiran #1 developer = service-continuity** (xip.io pernah mati). Jawaban = **100% open-source + gampang self-host** → langsung hilangkan blocker adopsi terbesar + diferensiasi vs kompetitor closed.

Sumber: https://sslip.io/ ; https://docs.epinio.io/installation/wildcardDNS_setup ; https://github.com/pyrou/traefik.me ; https://news.ycombinator.com/item?id=37690996 ; https://news.ycombinator.com/item?id=36959387

### 4.2 Taktik "di-referensiin" yang etis
1. **Awesome-list (satu PR rapi, bukan spam):** sindresorhus/awesome butuh repo **umur ≥ 30 hari**, tidak AI-generated, lolos awesome-lint, default branch `main`. awesome-selfhosted butuh software rilis **> 4 bulan lalu**, aktif dimaintain, instruksi instalasi berfungsi, satu item per PR, deskripsi < 250 karakter. → Rilis a-i.sh SEKARANG biar counter umur jalan.
2. **PR docs beneran-berguna** ke proyek populer (Kubernetes `kubernetes/website`, Traefik, dll) via contribution guide resmi mereka. Konten harus nambah nilai buat pembaca mereka (mis. "local dev / ephemeral agent box pakai wildcard DNS + TLS"), **bukan iklan** a-i.sh. Ini persis cara nip.io masuk docs enterprise.

Sumber: https://github.com/sindresorhus/awesome/blob/main/create-list.md ; https://kubernetes.io/docs/contribute/docs/

### 4.3 Kanal ekosistem agent (diferensiasi belum diklaim siapa pun)
Semua inkumben (nip.io/sslip.io/traefik.me/backname.io/xip.io) **nol** yang positioning ke AI agent, **nol** yang punya llms.txt. Tuas adopsi agent-native = a-i.sh di-**hardcode jadi default** di framework/sandbox agent tempat box ephemeral cuma punya IP mentah: **E2B, Daytona, Modal, devcontainer, Docker network helper**, dll + masuk docs mereka. Format dashed/wildcard-TLS a-i.sh cocok jadi default TLS-friendly di tooling itu.

> ⚠️ **PENTING:** jangan klaim "llms.txt bikin kita ke-discover otomatis" — lihat §7. Itu factually lemah.

---

## 5. OpenSSF Criticality Score — jangan jadikan KPI

- Skor 0–1 dari **10 sinyal berbobot** (rata-rata log-normalized). Terberat (bobot 2.0): **dependents_count** (T=500.000) & **contributor_count** (T=5.000). Lainnya: created_since (1), updated_since (−1), org_count (1), commit_frequency (1), recent_releases (0.5), closed_issues (0.5), updated_issues (0.5), comment_frequency (1). Sumber data utama = metadata GitHub.
- **TIDAK ada ambang resmi 0.4.** Itu heuristik informal "infra menengah". Dalam praktik dipakai ranking "top 200" / "top 200 per bahasa". OpenSSF sendiri: skor "primarily measures activity, not necessarily criticality". Contoh: moby 0.83, prometheus 0.80; go-dbus 0.135, osext 0.159.
- **Implikasi a-i.sh:** dua sinyal terberat (dependents & kontributor) susah dinaikin buat layanan hosted stateless (bukan package). **Main di jalur "critical infrastructure exception"** ketimbang ngejar skor. Sediakan bukti pemakaian transparan yang bisa dikutip (query/detik, daftar tool yang integrasi) — **jangan dikarang**.

Sumber: https://github.com/ossf/criticality_score/blob/main/README.md ; https://github.com/ossf/wg-securing-critical-projects/tree/main/Initiatives/Identifying-Critical-Projects

---

## 6. Urutan Aksi (Roadmap)

**Fase 0 — Sekarang (murah, tanpa nunggu adopsi):**
1. Push **github.com/kwkuh/open-domain** publik (LICENSE MIT). Rilis publik = mulai counter umur repo.
2. Deploy mesin DNS di **Oracle Always Free** (reserved public IP + inbound UDP/TCP 53). Verifikasi ulang jatah Ampere A1 & ketersediaan kapasitas ARM region.
3. Set **delegasi NS** a-i.sh & a-i.st (di Cloudflare) → nunjuk ke reserved IP Oracle.
4. Aktifkan **GitHub Sponsors** + `FUNDING.yml`; bikin **`funding.json`** (fundingjson.org).
5. Pastikan kwkuh **≥ 2 tahun** + kontribusi publik 90 hari terakhir.
6. **Apply Claude for OSS** via jejak person-level + sebut a-i.sh via "apply anyway".

**Fase 1 — Setelah adopsi awal + repo publik:**
7. Kejar bukti pemakaian: query/detik `[TODO]`, GitHub stars `[TODO]`, daftar tool integrasi `[TODO]`.
8. **GitHub Secure OSS Fund** ($10k + $10k Azure, framing keamanan DNS).
9. PR etis: satu ke awesome-selfhosted/awesome-devops/awesome-sysadmin (patuhi umur minimum), plus PR docs berguna ke Kubernetes/Traefik.
10. Integrasi/di-default-kan di sandbox agent (E2B/Daytona/Modal/devcontainer).

**Fase 2 — Setelah adopsi terbukti:**
11. **NLnet/NGI Zero** saat call reguler buka lagi (akhir 2026) — siapkan narasi "European dimension".
12. **FLOSS/fund** (funding.json sudah siap dari Fase 0).
13. **Sovereign Tech Fund** begitu jadi infra kritis banyak dipakai.
14. Pantau **GitHub Accelerator** kalau buka cohort baru (tema AI cocok).

---

## 7. Koreksi Hasil Verifikasi

> **Utamakan bagian ini** kalau ada konflik dengan bagian lain.

### 7.1 GitHub Accelerator — karakterisasi finansial TERBALIK + kontinuitas overstate
Yang bertahan: tema "AI advancements in the open", worldwide, program 10 minggu ~10 proyek, aplikasi gratis, eligibility kontributor/maintainer OSS, tim maks 3, kredit Azure AI (akses GPU) + go-to-market. **Dua koreksi material:**

1. **Inti award = HIBAH non-dilutif, bukan "investasi via M12".** Tiap proyek dapat **$40.000 sponsorship non-dilutif** (via GitHub Sponsors) + ~$350.000 benefit Microsoft/Azure ≈ **~$400k, semuanya non-dilutif**. Peran M12 di dalam akselerator cuma "introduction to, and at least one office hour with M12" — **bukan** investasi pre-seed/seed yang dijamin. Framing "jalur investasi, bukan hibah" overstated & terbalik.
2. **"Cohort 2024–2026" overstate.** Cohort terakhir terkonfirmasi = **2024** (ke-2; ke-1 = 2023). Tidak ada cohort 2025/2026. Per Juli 2026 aplikasi TUTUP (deadline lama 5 Maret 2024). Bukan actionable sekarang.

Net: angle AI-open cocok tematik, tapi ini peluang **hibah non-dilutif + benefit** (bagus buat tujuan "free + OSS"), bukan jalur investasi — dan belum ada window terbuka 2026.

Sumber: https://github.blog/news-insights/company-news/powering-advancements-of-ai-in-the-open-apply-now-to-github-accelerator/ ; https://accelerator.github.com/ ; https://github.com/open-source/accelerator ; https://github.blog/open-source/maintainers/github-accelerator-showcase-celebrating-our-second-cohort-and-whats-next/ ; https://m12.vc/github-fund/

### 7.2 Gate Claude for OSS — angka "5.000 star / 1M npm" OVERSTATED/kadaluarsa
"Pengecualian critical infrastructure" **TERKONFIRMASI dan lebih kuat** dari yang diklaim — jadi kesimpulan strategis a-i.sh (jalur narasi "infrastruktur alamat publik" + bukti pemakaian) **TETAP VALID**.

Yang dikoreksi: framing "gate = 5.000+ star ATAU 1jt npm/bln" **tidak cocok** dengan halaman resmi Anthropic saat ini. Angka itu muncul di blog pihak ketiga (versi awal program). Per Juli 2026 kriteria resmi **lebih luas & ambang lebih rendah**, multi-jalur (§1.3): 500+ dependent repos / 100+ dependent packages / **200k+ download/bln** (jauh di bawah 1jt); core contributor foundation; 100+ PR ke repo orang; 20+ kontributor eksternal; OpenSSF ≥ 0.4; plus klausul "apply anyway and tell us about it".

Untuk a-i.sh (stateless, susah kejar star): jalur paling realistis = **(a) klausul critical-infrastructure + "apply anyway"**, dan (b) jangka menengah target dependent-repos. Utamakan teks halaman resmi karena kriteria berubah saat program di-expand.

Sumber: https://claude.com/contact-sales/claude-for-oss ; https://www.ossperks.com/programs/anthropic-claude ; https://byteiota.com/anthropic-claude-for-open-source-10k-free-claude-max/ ; https://medium.com/@dan.avila7/i-got-selected-for-claude-for-open-source-program-heres-how-you-can-apply-too-1024da17ef31 ; https://explainx.ai/blog/claude-for-open-source-expanded-max-20x-july-2026

### 7.3 llms.txt BUKAN kanal discovery — koreksi paling penting untuk pitch
**Yang BENAR (bertahan):**
1. Positioning agent-native belum diklaim inkumben. Verifikasi: nip.io (exentriquesolutions, Apache-2.0, PowerDNS+Python), sslip.io, traefik.me (pyrou), backname.io (Matloka, Go), xip.io — **nol** positioning ke AI agent, **nol** punya llms.txt.
2. Mekanisme adopsi historis = "jadi default DI DALAM tooling/docs pihak lain" (nip.io >10k qps karena dirujuk Google Knative, IBM, Cisco, Oracle, Epinio, Verrazzano — bukan orang "nemu" sendiri).

**Yang OVERSTATED/KELIRU:** premis "llms.txt = discoverability, agent auto-discover a-i.sh lewat file itu" bertentangan dengan bukti 2026:
- Ahrefs (137rb situs): **97% llms.txt nol traffic** (Mei 2026).
- OtterlyAI: dari 62.100 request AI bot, cuma **84 (0,1%)** ke llms.txt.
- Monitoring 500jt+ kunjungan AI bot/90 hari: cuma 408 yang hit llms.txt langsung.
- John Mueller (Google): AI services "don't even check for it"; disamakan dgn meta keywords tag.
- Panduan AI Google 15 Mei 2026: llms.txt **TIDAK diperlukan** buat fitur generatif apa pun.

**Koreksi operasional a-i.sh:**
- Tetap bikin llms.txt lengkap & akurat — TAPI perannya = **ergonomi/hemat-token** pas agent SUDAH dikasih domain a-i.sh, **bukan** growth/SEO/discovery.
- Discovery yang beneran jalan = **distribusi lewat integrasi** (PR/plugin ke framework & sandbox agent, contoh di README, default resolver di template box ephemeral).
- **Jangan klaim** "llms.txt bikin kita ke-discover otomatis" di landing/pitch OSS — reviewer teknis bisa bantah. Klaim jujur & kuat: *"satu-satunya address utility yang agent-native (docs machine-readable + format dashed buat wildcard TLS), didesain buat di-embed sebagai default di tooling agent."*

Sumber: Ahrefs study (97% nol traffic, Mei 2026) & OtterlyAI (84/62.100) via SEO roundup 2026; seroundtable.com "Google Search Team Does Not Endorse LLMs.txt"; searchenginejournal.com "Google Says LLMs.txt Comparable To Keywords Meta Tag"; stanventures.com "Google Dismisses LLMs.txt as Ineffective"; Google AI optimization guide 15 Mei 2026; caseyrb.com "state of llms.txt adoption"; aeo.press "State of llms.txt in 2026"; github.com/exentriquesolutions/nip.io ; https://sslip.io/

---

## Lampiran: Placeholder yang harus diisi
| Placeholder | Keterangan |
|---|---|
| `[TODO: query/detik a-i.sh]` | Volume query DNS riil setelah deploy — bukti adopsi untuk semua aplikasi grant |
| `[TODO: GitHub stars]` | Jumlah stars repo kwkuh/open-domain — gate DigitalOcean OSS credits |
| `[TODO: daftar tool integrasi]` | Framework/sandbox agent yang sudah pakai a-i.sh sebagai default |
| `[TODO: umur akun GitHub kwkuh]` | Verifikasi ≥ 2 tahun sebelum apply Claude for OSS |

*Konsisten pakai username **kwkuh** dan angka adopsi RIIL di semua aplikasi. Jangan mengarang/menggelembungkan metrik — fraud clause & reviewer teknis akan mendeteksi.*
