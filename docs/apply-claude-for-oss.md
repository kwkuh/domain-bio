# Applying to "Claude for Open Source" — Guide + Draft for a-i.sh

> **What this is.** A practical, honest playbook for getting Kukuh Adi Laksana Rahman
> (GitHub: `kwkuh`) accepted into Anthropic's **Claude for Open Source** program, and a
> reusable application draft. All numbers you'd submit are left as `[TODO]` placeholders —
> **do not invent adoption metrics.** The program has a fraud/disqualification clause
> (Terms §7) for inflated or fabricated numbers.
>
> **Program page:** https://claude.com/contact-sales/claude-for-oss
> **Terms:** https://www.anthropic.com/claude-for-oss-terms
> **Last research pass:** July 2026 (post-expansion, 8 Jul 2026).

---

## 0. TL;DR — the honest verdict for a-i.sh

**a-i.sh alone is not enough to get in.** It has zero adoption today (not deployed, no
users, no dependents, no stars). None of the metric-based tracks can be satisfied by
a-i.sh right now.

**But that is not a blocker**, because eligibility is assessed at the **person level**, not
the project level. The realistic path is:

1. **Qualify as a person** through Kukuh's own OSS track record (Track 3 — merged PRs to
   other people's repos — is the most reachable), **and**
2. **Mention a-i.sh separately** through the discretionary **"Ecosystem Impact / apply
   anyway"** clause, framed as *public address infrastructure for the open agent ecosystem*.

Do **not** wait to accumulate 5,000 GitHub stars. That threshold is **outdated** third-party
lore, not the current official gate (see §1).

**Timing:** Apply now. Review is rolling, the cap is "up to 10,000 approved recipients," and
one subscription per person. The "30 June 2026" deadline some sources cite is stale — the
Terms describe an open-ended application window and the 8 Jul 2026 expansion confirms it's
still open.

---

## 1. Eligibility, accurately (July 2026)

### 1.1 What you get
- A complimentary **Claude Max 20x** subscription for **6 months** (~$1,200 value; $200/mo × 6).
- After 6 months: if you previously had a paid plan it continues on the old plan; otherwise
  the account reverts to Free.
- The gift code must be **activated within 90 days** of receipt.

### 1.2 Baseline requirements (everyone must meet — often overlooked)
- Natural person (not a company), 18+ / age of majority in your jurisdiction.
- Legal resident of a country where Claude.ai is available.
- Not an Anthropic employee/contractor/immediate family.
- **A GitHub account "in good standing," at least 2 YEARS old.**
- **Public OSS contribution activity (commit, PR, review, or release) within the last 90 DAYS.**
- Maintain/contribute to **at least one OSI-approved-licensed project** (a-i.sh is MIT → this
  box is checked once the repo is public).

> ⚠️ **Action for Kukuh:** confirm `kwkuh` is ≥ 2 years old and has a public contribution in
> the last 90 days. If the 90-day window is thin, land a real contribution *before* submitting
> (see §4).

### 1.3 The five maintainer tracks — satisfy ANY one
| # | Track | Threshold |
|---|-------|-----------|
| 1 | Maintainer / library author | 500+ dependent repos **OR** 100+ dependent packages **OR** 200,000+ combined monthly downloads (npm/PyPI/crates.io/RubyGems) |
| 2 | Core contributor | Listed committer/maintainer of a foundation/language project (CPython, Rust team, Node.js TSC, Apache PMC, CNCF, Kubernetes, Django, Rails, …) |
| 3 | **Active contributor** | **100+ PRs merged into repos you don't own, in the last 12 months** |
| 4 | Community builder | One of your repos has 20+ unique external contributors with merged PRs in 12 months |
| 5 | Critical infrastructure | A repo you maintain has an OpenSSF criticality score ≥ 0.4 |

Plus the discretionary clause (exact wording):
> **"Don't quite fit? If you maintain something the ecosystem quietly depends on, apply anyway
> and tell us about it."**
> The Terms call this the **Ecosystem Impact Track** — discretionary consideration for
> significant contributions not captured by standard metrics.

### 1.4 Which track is realistic for Kukuh?
- **Track 3 (100+ merged PRs to others' repos in 12 months)** — *most reachable* if Kukuh's
  contribution history (e.g. OpenCut and other repos) supports it. **This is the lead.**
  → *Verify the real 12-month count before relying on it; it's `[TODO: count merged PRs]`.*
- **Track 2 (foundation committer)** — only if Kukuh actually holds committer status somewhere.
  Don't claim it otherwise.
- **Ecosystem Impact / "apply anyway"** — the vehicle for **a-i.sh itself**, described as
  growing public infrastructure, not as a metric claim.
- **Tracks 1, 4, 5** — not currently satisfiable by a-i.sh (stateless hosted service, no
  package dependents, few code contributors). Treat OpenSSF ≥ 0.4 as a *later* target, not a
  near-term KPI.

> **Correction applied:** older third-party posts describe the gate as "5,000+ stars OR 1M+
> npm downloads/month." That is stale/overstated. The current official criteria are the
> multi-track set above (thresholds are *lower* and multi-path). Prefer the official page over
> third-party blogs, which contradict each other on numbers.

---

## 2. Evidence checklist + target metrics

Collect these **before** submitting. Use real figures or explicit `[TODO]` — never inflate.

### 2.1 Person-level (the actual basis for acceptance)
- [ ] `kwkuh` account age ≥ 2 years — **confirm creation date** `[TODO: YYYY-MM]`.
- [ ] Public contribution in last 90 days — link the commit/PR/release `[TODO: url]`.
- [ ] **Merged-PR count to repos you don't own, last 12 months** `[TODO: N]` (Track 3 needs 100+).
  - [ ] List the strongest repos contributed to (e.g. OpenCut) with PR links `[TODO: urls]`.
- [ ] At least one OSI-licensed project you maintain — **a-i.sh (MIT)** ✅ once public.

### 2.2 Project-level for a-i.sh (supporting narrative, not the gate)
- [ ] Repo public at `github.com/kwkuh/open-domain` — **do this first** (§4).
- [ ] LICENSE = MIT ✅ (already in repo).
- [ ] README explains the agent-native positioning + self-host instructions.
- [ ] `llms.txt` present and accurate (machine-readable usage). *Role: token-ergonomics once an
      agent already has the domain — NOT a discovery/growth channel (see §5 correction).*
- [ ] `FUNDING.yml` + GitHub Sponsors enabled (signals a fundable OSS project).
- [ ] `funding.json` (fundingjson.org spec) present (cheap, future FLOSS/fund readiness).
- [ ] Deployed and answering real queries `[TODO: deploy date]`.
- [ ] **Usage evidence, once live:** DNS queries/sec or /day `[TODO]`, integrations that use it
      `[TODO: list]`, GitHub stars `[TODO]`. All transparent, none fabricated.

### 2.3 Target metrics (aspirational, for the growth story — not required to apply)
- Get a-i.sh referenced/defaulted inside at least one agent framework or sandbox `[TODO]`.
- Reach a citable, honest query volume `[TODO]`.
- (Long term) OpenSSF criticality ≥ 0.4 — only meaningful after real dependents/adoption.

---

## 3. Application narrative — draft template

> Fill every `[TODO]`. Lead with **ecosystem impact and concrete maintainer workflow**, not
> enthusiasm or star counts. Apply with your **strongest existing track record**, and introduce
> a-i.sh separately as growing infrastructure.

### 3.1 Primary submission — person-level (Track 3 lead)

**Who I am**
I'm Kukuh Adi Laksana Rahman (GitHub: `kwkuh`), an independent Node.js/TypeScript developer
from Indonesia. Over the last 12 months I've merged `[TODO: N]` pull requests into open-source
repositories I don't own, including `[TODO: project, e.g. OpenCut]` (`[TODO: PR links]`). My
GitHub account has been active and in good standing since `[TODO: YYYY]`, with public
contributions in the last 90 days (`[TODO: recent commit/PR/release link]`).

**How I contribute**
`[TODO: describe concrete maintainer/contributor workflow — e.g. triage, bug fixes, docs,
releases, reviews — with 2–3 specific examples and links. Be concrete, not generic.]`

**Why the subscription helps**
`[TODO: 2–3 sentences on how Claude Max 20x accelerates your OSS work specifically — e.g.
reviewing PRs, writing tests/docs, maintaining infrastructure across multiple repos.]`

### 3.2 Secondary mention — a-i.sh via "apply anyway" / Ecosystem Impact

I also maintain **a-i.sh**, an MIT-licensed, agent-native wildcard DNS service
(`github.com/kwkuh/open-domain`). It encodes an IP address directly in the hostname —
`1.2.3.4.a-i.sh` resolves to `1.2.3.4` — with no database and no dashboard, computing every
answer statelessly from the name (like nip.io / sslip.io).

What makes it different: it's positioned as **public address infrastructure for the open agent
ecosystem**. AI agents spawned in ephemeral boxes have a raw IP and no human to click a DNS
dashboard — a-i.sh gives them an addressable name with zero human steps. It's the only address
utility of its kind that ships machine-readable docs (`llms.txt`) and a dashed wildcard-TLS
format (`1-2-3-4.a-i.sh`) designed to be embedded as a default in agent tooling.

It's 100% open-source and self-hostable by design — directly answering developers' top concern
with services like this (the xip.io shutdown), and removing the largest adoption blocker.

It's early: `[TODO: honest status — e.g. "deployed <date>, currently serving [TODO] queries"
OR "public and self-hostable; deployment in progress"]`. I'm applying under the "apply anyway"
clause because this is the kind of quiet address-layer infrastructure the growing agent
ecosystem depends on, and I'd like Claude's help maintaining it (security, tests, docs,
integrations) as adoption grows.

> **Honesty guardrails for §3.2:**
> - Don't claim query volume you don't have — use the placeholder or say "deployment in progress."
> - Don't claim "llms.txt makes us auto-discoverable." It's factually weak and a technical
>   reviewer can rebut it (see §5). Claim only what's true: *machine-readable docs + dashed
>   wildcard-TLS format, designed to be embedded as a default in agent tooling.*
> - Don't cite "5,000 stars" or an OpenSSF 0.4 score you don't have.

---

## 4. 30 / 60 / 90-day plan toward eligibility

The gate for every funding/benefit program is **adoption + a public OSS repo**. You can apply
to Claude for OSS *immediately* on person-level track record; the 30/60/90 plan strengthens the
a-i.sh half of the story in parallel.

### Days 0–30 — make it real and applyable (do now)
- [ ] **Publish the repo** at `github.com/kwkuh/open-domain` (MIT). This starts every clock:
      awesome-lists want repo age ≥ 30 days, awesome-selfhosted wants release age > 4 months,
      grants want usage history. Time is the one variable you can't accelerate.
- [ ] **Confirm baseline eligibility:** `kwkuh` ≥ 2 years old + a public contribution in the
      last 90 days. If thin, land one genuine contribution now.
- [ ] **Count your real Track-3 number** (merged PRs to others' repos, 12 months). Record it.
- [ ] Enable **GitHub Sponsors** + add `FUNDING.yml`; add **`funding.json`** (fundingjson.org).
- [ ] **Deploy a-i.sh** on Oracle Cloud Always Free (free permanently; static reserved public
      IP; security list opens inbound UDP+TCP 53). Delegate NS from Cloudflare to the Oracle IP.
- [ ] **Submit the Claude for OSS application** — lead with person-level Track 3, mention a-i.sh
      via "apply anyway." Don't wait for stars.

### Days 30–60 — start the adoption flywheel (honest, non-spam)
- [ ] Start capturing **transparent usage numbers** (queries/day) you can cite later.
- [ ] Ship one **genuinely useful docs/integration PR** to a popular project via its official
      contribution guide (e.g. Kubernetes `kubernetes/website`, Traefik) — content that helps
      *their* readers (local dev / preview env with wildcard DNS + TLS; ephemeral agent boxes),
      not an ad for a-i.sh. This is how nip.io organically entered enterprise docs.
- [ ] Pursue being a **documented/default option inside tooling** people already use — agent
      sandboxes/frameworks (E2B, Daytona, Modal), devcontainers, reverse proxies. The dashed
      wildcard-TLS format is a natural TLS-friendly default.
- [ ] Prepare one clean **awesome-list PR** per relevant list, obeying each list's rules
      (awesome-selfhosted needs release age > 4 months → note the clock; one item per PR,
      description < 250 chars). No mass blasting.

### Days 60–90 — compound and prepare adjacent programs
- [ ] Optional **Show HN** as a spark — not a growth engine (nip.io's HN post got 2 points;
      real adoption came from years of references, not one launch).
- [ ] Apply to **GitHub Secure Open Source Fund** ($10k + $10k Azure; rolling; Indonesia is a
      supported GitHub Sponsors region) with a security framing (DNS = attack surface).
- [ ] Watch **NLnet/NGI Zero** regular open call reopening (paused mid-2026, transition to
      "Open Internet Stack"); prepare the "European dimension" narrative if you go for it.
- [ ] Keep **FLOSS/fund** (Zerodha, $10k–$100k) as a *later* target — it explicitly rejects new
      / minimal-usage projects; `funding.json` is already in place for when usage is proven.
- [ ] If a-i.sh renewal/reapplication comes up, revisit **OpenSSF criticality** — it rises with
      real dependents/adoption and reinforces the "critical infrastructure" narrative.

---

## 5. Verified corrections to apply (don't repeat the myths)

- **Star gate is stale.** "5,000 stars / 1M npm downloads" is outdated third-party lore. The
  July 2026 official criteria are the multi-track set in §1.3 with *lower*, multi-path
  thresholds. The **critical-infrastructure / "apply anyway"** clause is real and, if anything,
  stronger than the old summaries — the strategic path for a-i.sh holds.
- **`llms.txt` is not a discovery channel.** 2026 evidence: crawlers/agents almost never fetch
  `/llms.txt` (Ahrefs: 97% of `llms.txt` files get zero traffic; OtterlyAI: 84 of 62,100 AI-bot
  requests; Google's John Mueller compares it to the meta-keywords tag). Keep `llms.txt`
  accurate for **token-ergonomics once an agent already has the domain**, but **do not** pitch
  it as auto-discovery in the application — a reviewer can rebut it. Real distribution =
  integrations/defaults inside agent tooling + useful docs PRs.
- **OpenSSF 0.4 is not a formal program threshold you must hit.** It's one of five tracks and a
  heuristic that under-rewards hosted stateless services. Use the "apply anyway" narrative +
  transparent usage evidence instead of chasing the score.
- **No hard 30 June 2026 deadline.** Open-ended window; rolling review; cap ~10,000; one
  subscription per person. Apply early for first-come reasons, not a cliff.
- **GitHub Accelerator note (if it comes up elsewhere):** it's mostly **non-dilutive** ($40k
  Sponsors + ~$350k Microsoft/Azure benefits), not a pre-seed investment path, and there's **no
  confirmed open 2026 cohort** — not actionable right now.

---

## 6. One-page action list

1. Publish `github.com/kwkuh/open-domain` (MIT) — starts every clock.
2. Verify `kwkuh` ≥ 2yr + a public contribution in the last 90 days.
3. Tally real 12-month merged-PR count to others' repos (Track 3).
4. Enable GitHub Sponsors + `FUNDING.yml` + `funding.json`.
5. Deploy on Oracle Cloud Always Free (static IP + UDP/TCP 53); delegate NS from Cloudflare.
6. Submit Claude for OSS: **lead person-level (Track 3), mention a-i.sh via "apply anyway."**
7. Then compound: useful docs/integration PRs, tooling defaults, transparent usage numbers.

*Apply at https://claude.com/contact-sales/claude-for-oss. Never fabricate metrics — Terms §7
disqualifies inflated or false numbers.*
