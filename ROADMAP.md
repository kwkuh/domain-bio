# Roadmap

`a-i.sh` is a wildcard DNS address layer for AI agents. `1.2.3.4.a-i.sh` resolves
to `1.2.3.4` — no dashboard, no account, no database. The answer is computed from
the hostname itself. This roadmap tracks where the project is and where it's going.

**Why this matters for the open agent ecosystem.** Agents get spawned on ephemeral
boxes with a raw IP and no human at the keyboard to click through a DNS control
panel. Every one of them still needs a stable, TLS-friendly address to be reached
at. `a-i.sh` is the missing address primitive: stateless, self-hostable, MIT, and
designed to be embedded as a default in agent tooling rather than "discovered" by
a person. The incumbents (nip.io, sslip.io, traefik.me, backname.io) solve the
IP-in-hostname trick but none of them are built for agents. That gap is the whole
project.

Everything here ships as free + open source (MIT). Nothing is gated behind a paid
tier unless explicitly noted, and even paid tiers keep the core self-hostable.

---

## Now

The core resolver, shipped and verifiable today.

- **v0.1 — Wildcard IP resolution** ✅ **DONE**
  - Dotted (`1.2.3.4.a-i.sh`), dashed (`1-2-3-4.a-i.sh`), hex (`0a000001.a-i.sh`),
    and IPv6 (`2001-db8--1.a-i.sh`) encodings.
  - Free-form prefixes (`app.1.2.3.4.a-i.sh`) for per-service subdomains.
  - Zero-dependency Node DNS server over UDP + TCP on port 53. Stateless — every
    answer is derived from the name, so there is no database to run or back up.
  - 12 unit tests passing, `dig`-verified locally.
- **Public release** — push to `github.com/kwkuh/open-domain` (MIT `LICENSE` already in
  the repo), publish the landing page + `llms.txt`, and get the project's clock
  running (awesome-lists and grant programs both care about repo age and usage
  history). Status: repo not yet public — [TODO: publish date].
- **Public deploy** — stand the resolver up on a static public IPv4 with inbound
  UDP/TCP 53 open, delegate `a-i.sh` NS records to it. Target host: Oracle Cloud
  Always Free (free forever, reserved static IP, port 53 allowed). Status: not yet
  deployed — [TODO: deploy date, public IP].

---

## Next

The features that turn a working resolver into agent-native infrastructure.
Rough order of priority, not fixed dates.

- **Managed HTTPS / wildcard TLS certificates**
  Ship a wildcard cert story so agents get working HTTPS out of the box, not just
  a resolvable name. The dashed encoding (`1-2-3-4.a-i.sh`) already exists
  precisely because it fits under a single wildcard certificate. This is the
  feature that made traefik.me sticky; for agents it's table stakes — an agent
  can't complete a TLS handshake it has to click through.

- **MCP server**
  A Model Context Protocol server so an agent can call `a-i.sh` directly as a tool:
  "encode this IP into a hostname", "give me a TLS-ready address for this box",
  "what does this name resolve to". This is the most direct expression of
  agent-native: the agent uses the address layer as a capability, no human and no
  web UI in the loop.

- **Tunnel / reachability for agents behind NAT** — *key differentiator*
  Every incumbent only works when you already have a public IP. Most agents don't:
  they run behind NAT on an ephemeral box and have no inbound path. A lightweight
  tunnel (agent dials out, `a-i.sh` gives it a stable public address that routes
  back in) makes the address layer useful for the majority of agents that the
  IP-in-hostname trick can't help at all. No competitor covers this.

- **Named handles — `myagent.a-i.sh` tier**
  Human/agent-memorable names mapped to a current address, for agents that need a
  stable identity across restarts and re-IPs. Kept optional and layered on top of
  the stateless core so the free IP-encoding path never depends on it. This is the
  one place a small paid/managed tier may live; the resolver stays free and
  self-hostable regardless.

---

## Later

Hardening and reach, once the core and the agent-facing features are proven.

- **Secondary nameserver / HA**
  A single box is a single point of failure. Add a second authoritative
  nameserver (the free-tier host allowance covers a primary + secondary) and move
  toward anycast so the address layer is dependable enough to be a *default* in
  other people's tooling. Service continuity is the #1 stated fear developers have
  about services like this (xip.io shutting down is the cautionary tale) —
  redundancy plus self-hostability is the honest answer to it.

- **Self-host guide**
  First-class docs for running your own `a-i.sh` instance on your own domain. This
  is the antidote to "what if the maintainer turns it off" and a hard requirement
  for adoption inside security-conscious environments. Being trivially
  self-hostable is a differentiator against closed incumbents, not just a nicety.

- **IPv6 polish**
  Round out IPv6 handling: zone-compression edge cases, mixed IPv4/IPv6 encodings,
  and full parity in tests and docs with the IPv4 path.

- **Distribution & integrations** (ongoing, not a single milestone)
  Land `a-i.sh` as a documented or default option inside agent sandboxes and
  frameworks (the way nip.io became a default in Knative). This is how utilities
  like this actually get adopted — embedded in tooling other people already run,
  not via a single launch post. Concrete, useful PRs to relevant docs and
  awesome-lists, following each project's contribution rules — never spam.

---

## Principles

- **Free and open source, forever.** MIT. The core resolver is always
  self-hostable; nothing essential is locked behind a hosted service.
- **Stateless by default.** Answers are computed from the name. No database is a
  feature, not a limitation — it's what makes the thing cheap, fast, and
  trivially reproducible.
- **Agent-first, honestly.** `llms.txt` exists to save tokens once an agent has
  already been handed an `a-i.sh` address — it is ergonomics, not a discovery or
  SEO channel, and we won't claim otherwise. Real adoption comes from being
  embedded as a default in agent tooling.
- **No invented metrics.** Usage numbers in this repo and in any funding
  application are real or marked [TODO]. We don't inflate adoption.

---

*Maintainer: Kukuh Adi Laksana Rahman ([@kwkuh](https://github.com/kwkuh)).
Feedback, integrations, and PRs welcome — this is meant to be public
infrastructure for the open agent ecosystem.*
