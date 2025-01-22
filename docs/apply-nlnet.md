# NLnet / NGI Zero — Grant Proposal Draft: a-i.sh

> **Status:** Draft for the NGI Zero Commons Fund open call (via <https://nlnet.nl/propose/>).
> **Note on timing:** As of mid-2026 NLnet's *regular* open call is temporarily paused during the
> transition to the "Open Internet Stack" initiative; only NGI Taler and NGI Fediversity are open
> (deadline 1 Aug 2026), neither of which fits a DNS project. Submit this proposal when the regular
> NGI Zero Commons open call reopens (expected after summer 2026 — monitor <https://nlnet.nl/propose/>).
> **Note on geography:** NLnet gives priority to inhabitants of the EU / countries associated to
> Horizon Europe. Proposals from outside that area (the maintainer is based in Indonesia) are eligible
> only when the project is of *exceptional quality*, the proposer holds *unique technical expertise*,
> and there is a *clear European dimension*. This draft leans deliberately on the open-internet /
> European-relevance framing in section 3 — sharpen it before submitting.

---

## 0. Applicant details

| Field | Value |
|---|---|
| Project name | **a-i.sh — a public address layer for the open agent ecosystem** |
| Applicant | Kukuh Adi Laksana Rahman (natural person / individual) |
| Country of residence | Indonesia |
| Contact email | [TODO: contact email to use for the application] |
| Project website | https://a-i.sh (pending deploy) — [TODO: confirm live URL before submitting] |
| Source repository | https://github.com/kwkuh/open-domain |
| License | MIT (OSI-approved) |
| Requested amount | **EUR [TODO: choose within 25,000–45,000] EUR** (see §5) |
| Requested fund | NGI Zero Commons Fund (regular open call) |

---

## 1. Abstract (the "in one paragraph, describe your project" question)

**a-i.sh** is a free, open-source, self-hostable **authoritative wildcard-IP DNS service**: it turns any
IP address into a working hostname by *computing* the answer from the query name, with no database and
no per-user configuration. `1.2.3.4.a-i.sh` resolves to `1.2.3.4`; `192-168-1-1.a-i.sh` (dashed form)
resolves to `192.168.1.1` and enables wildcard TLS certificates; IPv6 and hex forms are supported too.
This is the same well-proven idea behind [nip.io](https://nip.io) and [sslip.io](https://sslip.io) — a
category of infrastructure that large parts of the developer ecosystem quietly depend on (nip.io is the
*default* base domain in Knative; sslip.io reports serving 10,000+ queries/second and is referenced in
Google, IBM, Cisco and Oracle documentation). a-i.sh's distinct contribution is to build this address
layer **for the emerging ecosystem of autonomous software agents**: agents and bots are increasingly
spawned on ephemeral machines that have a raw IP but no human at a DNS dashboard to give them a name.
a-i.sh gives every such machine an instant, deterministic, TLS-capable address with zero human steps —
and does so as neutral public infrastructure that anyone can run themselves.

---

## 2. What exactly do you want to build? (deliverables)

The core resolver already exists and works (zero-dependency Node.js, UDP+TCP on port 53, 12 passing
unit tests, verified with `dig`). This grant funds the work that turns a working prototype into
**dependable, redundant public infrastructure** plus the reference material the ecosystem needs to adopt
and self-host it. Concretely:

1. **Production-grade authoritative server** — hardened resolver: full EDNS0/OPT handling, DNSSEC-signed
   responses (online signing for a computed zone), correct SOA/NS/negative-answer semantics, rate
   limiting and abuse controls, structured metrics.
2. **Multi-nameserver / redundant deployment** — a documented, reproducible deployment of ≥2 geographically
   separate nameservers so the service does not have a single point of failure (the historical #1
   developer objection to hosted wildcard-DNS services: "what if the operator shuts it down?").
3. **First-class self-hosting** — a container image + one-command install so any organisation can run
   its *own* instance for its *own* domain. This is the direct answer to the service-continuity risk:
   the public instance can never be a lock-in, because the whole thing is trivially self-hostable.
4. **Agent-native integrations** — reference plugins / config snippets that make a-i.sh a documented
   (ideally *default*) option inside popular agent sandboxes and dev tooling (ephemeral-box templates,
   reverse proxies, PaaS preview environments). This mirrors how the incumbents actually gained
   adoption: by being wired into other people's tooling and docs, not by a viral launch.
5. **Machine-readable usage docs (`llms.txt`) and human docs** — accurate, honest documentation so that
   an agent (or a developer) already pointed at the domain can consume the format ergonomically.
   *(We are explicit internally that `llms.txt` is a token-saving convenience for consumers already given
   the domain, not a discovery/SEO channel — we will not overstate it.)*
6. **Public transparency** — an operational status/metrics page reporting real usage (query volume,
   uptime) so the project's criticality can be evidenced honestly rather than asserted.

---

## 3. Why does it matter for the open internet? (the core NGI question)

NGI Zero funds R&D that strengthens a free, open, trustworthy, human-centric internet. a-i.sh advances
that mission on several axes:

- **It is neutral, self-hostable naming infrastructure — the opposite of centralisation.** The addressing
  layer for machines is today either manual (human clicks in a DNS dashboard) or captured inside
  proprietary cloud platforms. a-i.sh is a small, auditable, MIT-licensed primitive that *anyone* can run.
  It reduces dependence on any single hosted operator — including us — because self-hosting is a
  first-class deliverable, not an afterthought.
- **It serves an emerging open ecosystem before it gets enclosed.** Autonomous agents are a fast-growing
  class of internet participants. The open-source agent ecosystem needs *open* base infrastructure — an
  address layer that is not owned by one hyperscaler. Building this now, in the open, is precisely the
  kind of forward-looking internet-commons R&D NGI Zero exists to support.
- **It improves security and encryption on the open web.** The dashed format issues clean, predictable
  names for **wildcard TLS**, letting ephemeral and development environments get HTTPS with valid
  certificates instead of self-signed warnings or plain HTTP. Better-encrypted machine-to-machine and
  dev traffic is a direct open-internet security benefit.
- **It is genuinely open and reproducible.** Stateless-by-design: every answer is derived from the query
  name, so the behaviour is fully specified by the (open) code — no hidden database, nothing to trust
  beyond an auditable ~few-hundred-line codebase.

### European dimension (NLnet eligibility — strengthen before submission)

- DNS and TLS are *shared global internet standards*; robust, redundant, non-commercial address
  infrastructure benefits European developers, researchers, and open-source projects on equal terms, and
  can be operated by European mirrors/secondaries as neutral commons.
- The deliverables include **European-operated secondary nameservers** and encourage EU organisations to
  self-host their own instances for their own domains, keeping the addressing layer for European agent
  workloads inside infrastructure they control rather than a single non-EU operator.
- The project aligns with European priorities around **digital sovereignty and reducing dependence on
  hyperscaler-controlled infrastructure**: a-i.sh is deliberately runnable on any commodity VM, including
  European public-interest hosting.
- [TODO: if possible before submission, line up one concrete European anchor — e.g. an EU open-source
  tool that would adopt/default to a-i.sh, or an EU host running a secondary — as evidence of the
  European dimension.]

---

## 4. How does it compare to existing solutions? (the "prior art" question)

NLnet explicitly asks how a project relates to what already exists. Honest answer: the *technique* is
prior art, and we say so plainly.

| | nip.io | sslip.io | traefik.me | backname.io | **a-i.sh** |
|---|---|---|---|---|---|
| Computes IP from hostname | Yes | Yes | Yes | Yes | Yes |
| Open source | Yes (Apache-2.0) | Yes | Yes | Yes | **Yes (MIT)** |
| Self-hostable | Yes | Yes | Partial | Yes | **Yes (first-class)** |
| Dashed form for wildcard TLS | Yes | Yes | Yes | Yes | **Yes** |
| IPv6 support | Partial | Yes | — | Partial | **Yes** |
| Zero runtime dependencies | No (PowerDNS+Python) | No | — | Go | **Yes (Node built-ins only)** |
| Positioned / documented for AI agents | No | No | No | No | **Yes** |
| Machine-readable usage doc (`llms.txt`) | No | No | No | No | **Yes** |

**What a-i.sh adds over the incumbents:**

1. **Agent-native positioning and integrations.** No existing service targets autonomous agents or
   ephemeral agent sandboxes. This is an unclaimed, and increasingly important, niche.
2. **A tiny, auditable, zero-dependency reference implementation.** The whole resolver is a handful of
   Node.js files with no external packages — easy to read, verify, fork and trust, which matters for a
   piece of trust-bearing infrastructure.
3. **Self-hosting and redundancy as headline deliverables**, directly answering the service-continuity
   objection that has historically limited trust in this category (xip.io, an early entrant, shut down).

We are **not** claiming to invent wildcard-IP DNS. We are claiming to build the *open, agent-native,
redundantly-operated, trivially-self-hostable* instance of it, and to do the integration and hardening
work that makes it dependable public infrastructure.

---

## 5. Requested funding and budget

NGI Zero Commons grants are typically **EUR 5,000–50,000**, milestone-based. We request
**EUR [TODO: choose within 25,000–45,000]**, allocated roughly as follows *(indicative — adjust to the
final milestone plan)*:

| Work package | Indicative share |
|---|---|
| WP1 — Server hardening: EDNS0, DNSSEC online signing, rate limiting, correct negative answers | ~30% |
| WP2 — Redundant multi-nameserver deployment + reproducible infra (incl. EU secondary) | ~20% |
| WP3 — First-class self-hosting: container image, one-command install, docs | ~15% |
| WP4 — Agent-native integrations (plugins/config for agent sandboxes, proxies, PaaS) | ~20% |
| WP5 — Documentation (`llms.txt` + human docs), transparency/status page, security review | ~15% |

All work is delivered as open source under the MIT license and paid per accepted milestone.
[TODO: confirm applicant can meet NLnet payment requirements — bank account + any tax documents.]

---

## 6. Milestones (milestone-based payout, NLnet style)

Each milestone is independently verifiable (public commit/tag + working artifact).

1. **M1 — Hardened resolver v1.** EDNS0/OPT echoed correctly; rate limiting; full SOA/NS/NXDOMAIN
   correctness; expanded test suite. *Verification:* tagged release + passing CI + `dig` transcripts.
2. **M2 — DNSSEC-signed responses.** Online signing for the computed zone; validates against public
   resolvers. *Verification:* `dig +dnssec` transcript validating through a validating resolver.
3. **M3 — Redundant deployment live.** ≥2 geographically separate nameservers (incl. one European
   secondary), documented and reproducible; public status page reporting real query volume/uptime.
   *Verification:* live NS records + status page URL.
4. **M4 — Self-hosting release.** Container image + one-command installer + self-host guide; a third
   party can stand up their own instance for their own domain. *Verification:* published image + a
   reproduced third-party deployment.
5. **M5 — Agent-native integrations + docs.** Reference integrations for ≥[TODO: N] agent/dev tools
   (with upstream PRs where the tool's contribution rules allow), accurate `llms.txt` and human docs.
   *Verification:* merged/published integrations + docs URLs.

---

## 7. License and openness

- **Code:** MIT (OSI-approved) — see `LICENSE` in the repository.
- **All grant outputs open access:** code, docs, deployment recipes and container images published
  publicly. Nothing is gated.
- **Repository:** https://github.com/kwkuh/open-domain — includes `README`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- **No lock-in by construction:** the service is stateless and fully self-hostable, so the public
  instance is a convenience, never a dependency.

---

## 8. Team

- **Kukuh Adi Laksana Rahman** — indie developer / builder (Node.js / TypeScript), based in Indonesia.
  Builds and operates a range of agent- and bot-oriented products and has contributed to open-source
  projects. Sole maintainer and operator of a-i.sh. GitHub: [`kwkuh`](https://github.com/kwkuh).
  - [TODO: 2–3 concrete, verifiable lines of evidence of relevant technical expertise — e.g. named
    open-source contributions, shipped products, DNS/infra experience — to satisfy NLnet's
    "unique technical expertise" bar for a non-EU applicant.]
- [TODO: note any collaborators, European secondary-DNS operators, or advisers if secured before
  submission — helps both redundancy and the European-dimension case.]

---

## 9. Honesty note on metrics

a-i.sh is newly built and, at time of drafting, **not yet deployed and has no adoption metrics**. This
proposal deliberately does **not** cite any usage numbers. Where numbers will strengthen the case
(query volume, adopting tools, self-host installs) they are marked `[TODO]` and will be filled with
*real, transparent* figures only once the service is live — never estimated or inflated. NLnet's
evaluation is merit- and impact-based rather than popularity-based, which is why this project applies
here rather than to funds that gate strictly on existing usage.

---

*Draft prepared for the applicant to review, verify, and complete the `[TODO]` fields before submission.
Do not submit while the regular NGI Zero Commons open call is paused — see the timing note at the top.*
