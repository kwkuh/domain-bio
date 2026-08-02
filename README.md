# Open-Domain

> **Serving since 1 August 2026.** Both suffixes resolve through the public DNS hierarchy. They are answered by one resolver on one machine, so they fail together — a second nameserver is the next piece of work. For production-critical use today, [nip.io](https://nip.io) and [sslip.io](https://sslip.io) run on more machines than we do.

**A free, stateless address layer for the open agent ecosystem.** Append `.a-i.st` or `.a-i.sh` to any IP address and it resolves right back to that IP — no signup, no API key, no dashboard, no human in the loop.

[![License: MIT](https://img.shields.io/badge/license-MIT-3ddc97.svg)](./LICENSE)
[![Nameservers](https://github.com/kwkuh/open-domain/actions/workflows/nameservers.yml/badge.svg)](https://github.com/kwkuh/open-domain/actions/workflows/nameservers.yml)

```
203.0.113.10.a-i.st      -> A     203.0.113.10
203.0.113.10.a-i.sh      -> A     203.0.113.10
```

That's it. Any IP, plus one of our suffixes, becomes a working hostname.

## What is Open-Domain

Open-Domain is a wildcard-IP DNS service in the tradition of [nip.io](https://nip.io) and [sslip.io](https://sslip.io): it turns an IP address into a hostname you can point tools, browsers, and TLS certificates at. The answer is **computed from the query name itself** — there is no database, no registration, and no state anywhere. `203.0.113.10.a-i.st` resolves to `203.0.113.10` because the name *says so*, not because anyone stored a record.

The project lives at **[open-domain.com](https://open-domain.com)** and serves two suffixes:

| Suffix | Use it for |
|---|---|
| `a-i.st` | the primary form used throughout these docs |
| `a-i.sh` | an independent alternate — protects against a problem at one *registry*, not against the resolver going down |

Both are answered by the same stateless resolver, so they behave identically — and, today, they also fail identically, because there is only one of it. Separate registrations mean no single registry or registrar can take both suffixes away at once, which is a different and narrower guarantee than uptime.

The difference from the incumbents: Open-Domain is built to be consumed by **agents**. An AI agent or bot spawned in an ephemeral box has a raw public IP and no way to click through a DNS dashboard. Open-Domain gives it a real, TLS-capable address the instant it has an IP — machine-readable, zero-config, and free. **Every agent needs an address.**

## Why it exists

Address utilities like this become load-bearing infrastructure for an entire ecosystem — nip.io alone answers tens of thousands of queries per second and is referenced in the docs of Google, Oracle, IBM, and Cisco. But none of the incumbents are built or positioned for the agent era, and the single biggest fear developers have about them is service continuity (xip.io shut down and broke everyone who depended on it).

Open-Domain is our answer to both:

- **A public good, not a product.** The address layer should be free, open, and boring infrastructure that just works. There is no paywall and no plan to add one.
- **100% open source (MIT) and self-hostable.** If the hosted service ever disappears, the code is right here and you can run your own in minutes. Open source *is* the continuity guarantee.
- **Built to become redundant.** Two independent suffixes and a codebase you can run yourself. Today one resolver answers both suffixes, so they fail together; independent nameservers are the next milestone, not a shipped feature.
- **Cheap enough to keep free.** Running an authoritative nameserver costs something, but a stateless resolver on one small VPS costs very little. It is funded out of pocket today; sponsorship exists as an option, not as a plan being relied on.

## Quick start

Append `.a-i.st` to the IP your service or agent runs on. No account, no propagation you have to wait on — it resolves the moment your host has a public IP.

```
203.0.113.10.a-i.st   ->  A     203.0.113.10
```

Test it:

```sh
dig +short 203.0.113.10.a-i.st
dig +short 203.0.113.10.a-i.sh
```

## Supported formats

All formats are computed purely from the name, and every one of them works on **both** suffixes. A prefix is always allowed and always ignored, so you can namespace freely.

| Form | Example | Resolves to | Notes |
|---|---|---|---|
| Dotted IPv4 | `1.2.3.4.a-i.st` | `A` → `1.2.3.4` | the plain form |
| Dashed IPv4 | `1-2-3-4.a-i.st` | `A` → `1.2.3.4` | one label instead of four (see below) |
| Hex IPv4 | `0a000001.a-i.st` | `A` → `10.0.0.1` | 8 hex digits |
| IPv6 (dashed) | `2001-db8--1.a-i.st` | `AAAA` → `2001:db8::1` | `:` → `-`, `::` → `--` |
| Any prefix | `app.1.2.3.4.a-i.st` | `A` → `1.2.3.4` | anything before the IP is ignored |
| Apex | `a-i.st` | `SOA` / `NS` | the zone itself |
| No IP in name | `foo.bar.a-i.st` | `NXDOMAIN` | nothing to compute |
| Outside our zones | `example.com` | `REFUSED` | not authoritative |

Prefixes compose with every form, e.g. `agent1.203-0-113-10.a-i.sh` → `203.0.113.10`.

## HTTPS

Both forms work. A certificate for `5.78.141.213.a-i.st` issues exactly as easily as one for `5-78-141-213.a-i.st` — verified by issuing a real Let's Encrypt certificate covering both names at once. Use whichever you prefer.

**We do not provide a wildcard certificate**, and neither do nip.io or sslip.io. You cannot obtain one for `*.a-i.st` yourself either: Let's Encrypt only issues wildcards through the DNS-01 challenge, and that requires adding a TXT record to `a-i.st` — which nobody but us can do. So the dashed form buys you nothing on its own. It matters only if someone hands you a wildcard certificate, and nobody does.

What you get instead is an ordinary certificate for your exact hostname, which is all most people needed anyway. Let's Encrypt will not issue for a bare IP address, but it will for a hostname — and that is what this gives you.

Two practical consequences, both learned the hard way:

- **Port 80 or 443 must be reachable from the internet.** DNS-01 is impossible for these names, so HTTP-01 or TLS-ALPN-01 is your only route. If something else already owns those ports, that has to be sorted out first.
- **Do not proxy `/.well-known/acme-challenge/` to your app.** A catch-all proxy rule sends the challenge to your application, your application answers with its own page, and issuance fails with `unauthorized`. Serve that path from disk.

```nginx
server {
    listen 80;
    server_name 5-78-141-213.a-i.st;

    location /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { proxy_pass http://127.0.0.1:8090; }
}
```

```sh
certbot certonly --webroot -w /var/www/acme -d 5-78-141-213.a-i.st
```

**Certificates are rate-limited per suffix, not per user.** Let's Encrypt allows 50 new certificates per registered domain every 7 days, and `a-i.st` counts as one registered domain for everybody using it. Renewals are exempt, so this bites new names rather than existing ones. If you hit the limit, try `a-i.sh` — it has its own separate allowance.

## For AI agents

If you are an agent or an automated tool: append `.a-i.st` to your IP and use the result as your hostname. The mapping is deterministic — the hostname is a pure function of the IP, with no lookup, no state, and no registration step. Your traffic goes **straight to the target IP**; Open-Domain only answers the DNS query and nothing else. Trying the other suffix is worth a retry, but it is not failover today: one resolver answers both.

A machine-readable usage guide lives at **[`/llms.txt`](./web/llms.txt)** (served at `https://open-domain.com/llms.txt`). Point your agent's docs at it when you hand it the domain — it is a token-efficient reference, not a discovery mechanism.

**Do not** put secrets in a hostname — DNS queries are logged by resolvers along the path. And **do not** rely on the hosted service for critical production; for that, self-host (below) or use a domain you own.

## Hosted or self-hosted

Most people should use the hosted service: append the suffix and you are done. Self-hosting exists so that you are never trapped by that choice, not because you are expected to take it.

| Use the hosted service | Run your own |
|---|---|
| You want a working hostname right now, with no setup | Your environment cannot depend on a third party — air-gapped, regulated, or policy-bound |
| Development, CI, previews, demos, ephemeral boxes | You need your own domain in the name |
| Your agents need an address the moment they boot | You want guaranteed capacity and your own abuse policy |

Running your own is a standing commitment: a domain you own, a host with a static public IPv4, UDP and TCP port 53 reachable, NS delegation with glue records, and someone keeping all of it alive. The hosted service exists so you do not have to take that on. The source exists so you can, on the day that trade stops making sense for you — which is the whole point of it being open.

## Run your own

The server is zero-dependency Node — clone and run:

```sh
git clone https://github.com/kwkuh/open-domain
cd open-domain
npm test          # unit tests for the parser
npm run dev       # dev server on 127.0.0.1:5353

dig +short -p 5353 @127.0.0.1 1.2.3.4.a-i.st
```

> On macOS, port 5353 is used by Bonjour/mDNS — use `PORT=15353` locally.

One process can be authoritative for **any number of zones**. Point `ZONES` at your own domains, comma-separated:

```sh
ZONES=example.dev,example.test PORT=15353 BIND=127.0.0.1 node src/server.js
```

Each zone gets its own correct `SOA` and apex; the longest matching zone wins, so overlapping zones (`a-i.st` and `dev.a-i.st`) stay deterministic. Names outside every configured zone get `REFUSED`.

To run it as an authoritative nameserver you need a host with a **public static IPv4** and **UDP+TCP port 53** open, then delegate NS/glue records to it. Configure via env (`ZONES`, `PORT`, `BIND`, `NS_HOSTS`, `APEX_IP`, `TTL`, `DEBUG`). `ZONE` is still accepted as an alias for a single-zone setup. Full deployment steps, the `systemd` unit for binding port 53 without full root, and secondary-nameserver notes are in **[ROADMAP.md](./ROADMAP.md)** and the deploy docs. Oracle Cloud Always Free (permanent free ARM VM with a static IP and port 53) is a good place to run it.

## How it works

Every answer is a pure function of the query name. The server parses the labels, extracts an IP if one is present, and returns it — no database, no cache to warm, no per-user records to store. That statelessness is what makes it **free**: a stateless nameserver is tiny and cheap to run, and it scales horizontally by just adding more identical boxes. Nothing to back up, nothing to lose.

Internals: `src/parse.js` (name → IP, zone matching), `src/wire.js` (DNS wire format), `src/resolve.js` (answer logic), `src/server.js` (UDP + TCP listeners on :53). Zero runtime dependencies.

## Sponsor

Open-Domain is free and intends to stay free. If it saves you time — or if your agents depend on it — please consider sponsoring to keep the nameservers running for everyone. Funding options are configured in **[.github/FUNDING.yml](./.github/FUNDING.yml)**.

[![Sponsor](https://img.shields.io/badge/%E2%9D%A4-Sponsor-3ddc97.svg)](./.github/FUNDING.yml)

## Contributing & security

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — how to propose changes, run the tests, and file issues. PRs welcome.
- **[ROADMAP.md](./ROADMAP.md)** — where this is headed (redundant nameservers, deploy guides, integrations).
- **[SECURITY.md](./SECURITY.md)** — how to report a vulnerability. DNS is an attack surface; responsible disclosure is appreciated.

## Abuse

A free wildcard DNS service gets misused. Report a hostname to **[abuse@open-domain.com](mailto:abuse@open-domain.com)** and we will act on phishing, malware, and command-and-control. We aim to acknowledge within 24 hours and to act within 72.

Worth knowing before you write: we can stop an address from resolving under our suffixes, but we cannot remove content we never hosted, and we cannot say who used a name because query logs truncate the client address before writing it (see [PRIVACY.md](./PRIVACY.md)). The IP is inside the hostname — `login-example.203-0-113-10.a-i.st` is `203.0.113.10` — so the host's own provider can act where we cannot, usually faster.

Full policy in **[ABUSE.md](./ABUSE.md)** or at <https://open-domain.com/abuse.html>. Vulnerabilities in the resolver itself go to [security@open-domain.com](mailto:security@open-domain.com) instead — see [SECURITY.md](./SECURITY.md).

## A note on reliability

This is community-run infrastructure offered as a public good, with **no SLA**. It is great for development, previews, demos, CI, and giving ephemeral agents an address. It is **not** meant for critical production systems that depend on a free third party — for those, self-host from this repo or use a domain you own. Being open source and trivially self-hostable is the whole point: you are never locked in.

## License

[MIT](./LICENSE) © 2026 Kukuh Laksana
