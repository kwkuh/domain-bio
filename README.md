# Open-Domain

**A free, stateless address layer for the open agent ecosystem.** Append `.a-i.st` or `.a-i.sh` to any IP address and it resolves right back to that IP — no signup, no API key, no dashboard, no human in the loop.

[![License: MIT](https://img.shields.io/badge/license-MIT-3ddc97.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3ddc97.svg)](./CONTRIBUTING.md)
![GitHub stars](https://img.shields.io/badge/stars-%5BTODO%5D-lightgrey.svg)
![Sponsors](https://img.shields.io/badge/sponsors-%5BTODO%5D-lightgrey.svg)

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
| `a-i.sh` | an independent alternate — if one zone has a problem, the other is a drop-in swap |

Both are answered by the same stateless resolver, so they behave identically. Two suffixes on separate domains means no single registry or registrar outage takes the whole address layer down with it — which is exactly the failure mode that made `xip.io`'s shutdown so painful for everyone who depended on it.

The difference from the incumbents: Open-Domain is built to be consumed by **agents**. An AI agent or bot spawned in an ephemeral box has a raw public IP and no way to click through a DNS dashboard. Open-Domain gives it a real, TLS-capable address the instant it has an IP — machine-readable, zero-config, and free. **Every agent needs an address.**

## Why it exists

Address utilities like this become load-bearing infrastructure for an entire ecosystem — nip.io alone answers tens of thousands of queries per second and is referenced in the docs of Google, Oracle, IBM, and Cisco. But none of the incumbents are built or positioned for the agent era, and the single biggest fear developers have about them is service continuity (xip.io shut down and broke everyone who depended on it).

Open-Domain is our answer to both:

- **A public good, not a product.** The address layer should be free, open, and boring infrastructure that just works. There is no paywall and no plan to add one.
- **100% open source (MIT) and self-hostable.** If the hosted service ever disappears, the code is right here and you can run your own in minutes. Open source *is* the continuity guarantee.
- **Redundant by design.** Two independent suffixes, one stateless resolver, and a codebase you can run yourself.
- **Community-funded.** Running an authoritative nameserver for the world costs something. We keep it free by keeping it cheap (stateless, tiny) and letting sponsors cover the rest. See [Sponsor](#sponsor).

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
| Dashed IPv4 | `1-2-3-4.a-i.st` | `A` → `1.2.3.4` | **use this for wildcard TLS** (see below) |
| Hex IPv4 | `0a000001.a-i.st` | `A` → `10.0.0.1` | 8 hex digits |
| IPv6 (dashed) | `2001-db8--1.a-i.st` | `AAAA` → `2001:db8::1` | `:` → `-`, `::` → `--` |
| Any prefix | `app.1.2.3.4.a-i.st` | `A` → `1.2.3.4` | anything before the IP is ignored |
| Apex | `a-i.st` | `SOA` / `NS` | the zone itself |
| No IP in name | `foo.bar.a-i.st` | `NXDOMAIN` | nothing to compute |
| Outside our zones | `example.com` | `REFUSED` | not authoritative |

Prefixes compose with every form, e.g. `agent1.203-0-113-10.a-i.sh` → `203.0.113.10`.

## HTTPS via the dashed form

A dotted name like `1.2.3.4.a-i.st` has too many labels for a single `*.a-i.st` wildcard certificate to cover. The **dashed form** collapses the IP into one label:

```
1-2-3-4.a-i.st
```

Now a single `*.a-i.st` wildcard TLS certificate matches the name, so HTTPS just works — ideal for local dev, preview environments, and ephemeral agent boxes that need a valid cert without provisioning one per host.

## For AI agents

If you are an agent or an automated tool: append `.a-i.st` to your IP and use the result as your hostname. The mapping is deterministic — the hostname is a pure function of the IP, with no lookup, no state, and no registration step. Your traffic goes **straight to the target IP**; Open-Domain only answers the DNS query and nothing else. If `a-i.st` ever fails to resolve for you, retry the identical name under `a-i.sh`.

A machine-readable usage guide lives at **[`/llms.txt`](./web/llms.txt)** (served at `https://open-domain.com/llms.txt`). Point your agent's docs at it when you hand it the domain — it is a token-efficient reference, not a discovery mechanism.

**Do not** put secrets in a hostname — DNS queries are logged by resolvers along the path. And **do not** rely on the hosted service for critical production; for that, self-host (below) or use a domain you own.

## Self-host your own

The whole point of open source here is that you never have to depend on us. The server is zero-dependency Node — clone and run:

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

## A note on reliability

This is community-run infrastructure offered as a public good, with **no SLA**. It is great for development, previews, demos, CI, and giving ephemeral agents an address. It is **not** meant for critical production systems that depend on a free third party — for those, self-host from this repo or use a domain you own. Being open source and trivially self-hostable is the whole point: you are never locked in.

## License

[MIT](./LICENSE) © 2026 Kukuh Adi Laksana Rahman
