# Adoption: how services like this actually become known

Written 1 August 2026. Every number here was measured, not estimated.

## The number that explains everything

Files on GitHub mentioning each service (GitHub code search, 1 Aug 2026):

| Service | Files | Status |
|---|---|---|
| nip.io | 11,856 | alive |
| **xip.io** | **10,752** | **DEAD for years** |
| sslip.io | 6,560 | alive |
| localtest.me | 3,276 | alive |
| traefik.me | 2,148 | alive |
| Open-Domain | 0 | new |

**xip.io shut down long ago and is still embedded in ten thousand files.** That single
fact explains the whole dynamic of this category:

1. Once you are in someone's config or documentation, you stay there for **years**
   after you stop being useful. Distribution here is sticky, not flowing.
2. Which also means the incumbents are **very hard to displace**. People are not
   shopping for a replacement; they are copying a line out of the tutorial they are
   already reading.
3. And therefore chasing search rankings aims at the wrong thing. What decides this is
   not people searching for a service like ours — it is **people copying a command**.

## Where those references actually live

File types that mention `nip.io`:

| Type | Files | What it means |
|---|---|---|
| `.md` | 7,560 | **documentation and tutorials — the biggest bucket** |
| `.yaml` | 5,976 | Kubernetes manifests |
| `.yml` | 1,876 | CI, compose, ansible |
| `.json` | 1,364 | tool configuration |
| `.tf` | 796 | Terraform |

So the order of importance is clear: **prose first, manifests second.** Not a product
page, not ads, not a launch.

The context that keeps recurring in the results: **Kubernetes ingress on a local or
test cluster**. People need a hostname for a LoadBalancer IP so cert-manager can issue
a certificate. That is one very specific workflow, and it is the door both incumbents
came through.

## Where Open-Domain stands today

- Zero results for `"open-domain.com"` and for `"a-i.st" wildcard dns`.
- `robots.txt` allows everything, `sitemap.xml` lists 10 URLs, there are Markdown
  mirrors and an `llms.txt` — the technical side of discovery is done and needs no
  further work.

Zero results is **normal** for a domain that started serving today, not a sign that
something is wrong. What matters to understand: indexing will not bring users in this
category — see point 3 above.

## What makes services like this fail to be adopted despite being technically right

Ordered by how fatal each one is:

1. **A history of downtime.** The biggest fear users of this category have is that the
   service disappears — and xip.io proved the fear is justified. One long early outage
   will be quoted for years. Open-Domain runs on **one machine**, so this risk is real
   and it is stated on the front page. Hiding it would be worse: people who feel misled
   do not come back.
2. **Certificates failing to issue.** The Let's Encrypt limit of 50 certificates per
   registered domain per 7 days is a **shared pool** across every user of `a-i.st`. The
   51st user does not see "quota exhausted" — they see a broken service. The rate limit
   request lives in `letsencrypt-rate-limit-request.md` and takes weeks, which is why it
   goes in before any promotion, not after.
3. **Promising more than is true.** This category is used by people who read
   documentation carefully. One claim that turns out to be false erases trust in the
   whole page. It has already happened twice in this project: "redundant by design" when
   there was one resolver, and TLS advice that assumed a wildcard certificate that never
   existed.

## What is worth doing

Not a "marketing strategy" — three things that follow directly from the data above:

1. **Write one genuinely useful guide for one workflow**, most likely local Kubernetes
   ingress with cert-manager, all the way to a working certificate. That is the shape
   people copy, and `.md` is where most references of this kind live.
2. **Fix the things that make people stop using it** before inviting anyone: the Let's
   Encrypt limit adjustment, and a second nameserver. Inviting people to a service that
   will disappoint them costs more than waiting.
3. **Do not compete with nip.io/sslip.io — complement them.** They are incumbents worth
   respecting, and our own page already points at them for critical use. The real reason
   to choose Open-Domain is the two suffixes and the agent-oriented design, not a
   better-than claim we cannot support.

## What is deliberately not recommended

- **Launching on Hacker News / Product Hunt now.** Zero traction on a single point of
  failure; attention arriving faster than readiness leaves a bad public record that is
  permanent.
- **Sending "add us" pull requests to other projects' documentation.** It reads as spam
  and damages the name before anyone is using it.
- **Chasing search rankings.** See the numbers above: people copy commands, they do not
  search for services.
