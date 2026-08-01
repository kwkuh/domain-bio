# Open-Domain

Wildcard DNS for IP addresses. Free, stateless, open source.

> **Serving since 1 August 2026.** Both suffixes resolve through the public DNS
> hierarchy. One caveat, stated plainly: they are answered by *one* resolver on *one*
> machine, so a failure there takes both down at once. A second nameserver in a separate
> location is the next piece of work. If your use is production-critical today,
> [nip.io](https://nip.io) and [sslip.io](https://sslip.io) have run this for over a
> decade on more machines than we have.

Open-Domain is a DNS service that, when queried with a hostname that has an IP address
embedded in it, returns that IP address. Append `.a-i.st` to an IP and you have a working
hostname — no signup, no API key, no dashboard, and nothing to wait for.

Every answer is computed from the query name itself. There is no database and no stored
record: `203.0.113.10.a-i.st` resolves to `203.0.113.10` because the name says so.

The service is designed around two domains, **a-i.st** and **a-i.sh**, which are
interchangeable — the same name works under either. They are separate registrations, so a
problem at one registry or registrar does not reach the other.

That protects against a registry problem and nothing else. Both suffixes are answered by
*one* resolver on *one* machine today, so they fail together. Independent nameservers in
separate locations are the next piece of work.

## Examples

| Hostname | Resolves to | Notes |
|---|---|---|
| `203.0.113.10.a-i.st` | 203.0.113.10 | dot separators (IPv4) |
| `203-0-113-10.a-i.st` | 203.0.113.10 | dash separators — use this for wildcard TLS |
| `203.0.113.10.a-i.sh` | 203.0.113.10 | the other domain, same answer |
| `www.192.168.0.1.a-i.st` | 192.168.0.1 | any prefix is ignored |
| `www-192-168-0-1.a-i.st` | 192.168.0.1 | prefix + dashes |
| `0a000001.a-i.st` | 10.0.0.1 | hexadecimal notation (8 digits) |
| `2001-db8--1.a-i.st` | 2001:db8::1 | IPv6 — always dashes, never dots |
| `foo.bar.a-i.st` | NXDOMAIN | no IP address in the name |
| `example.com` | REFUSED | outside our zones |

Try it:

```sh
dig +short 203.0.113.10.a-i.st
dig +short 203.0.113.10.a-i.sh
```

## HTTPS

A dotted name such as `1.2.3.4.a-i.st` has too many labels for a single `*.a-i.st`
wildcard certificate to cover. The dashed form collapses the IP into one label, so
`1-2-3-4.a-i.st` is matched by an ordinary wildcard certificate and HTTPS works normally.
Let's Encrypt will not issue a certificate for a bare IP address, but it will for a
hostname — which is what this gives you.

## For agents and automated tools

The hostname is a pure function of the IP: no lookup, no state, no registration step.
An agent that has just been handed a public IP can construct its own address without
asking anyone. A complete machine-readable reference is at
[/llms-full.txt](https://open-domain.com/llms-full.txt); the short index is at
[/llms.txt](https://open-domain.com/llms.txt).

Two cautions. Do not put secrets in a hostname — every resolver along the path can log
the names it sees. Trying the other suffix is worth a retry, but it is not failover: one
resolver answers both today, so when one is down the other is down with it.

## Hosted or self-hosted

Most people should use the hosted service: append the suffix and you are done.
Self-hosting exists so that you are never trapped by that choice, not because you are
expected to take it.

| Use the hosted service | Run your own |
|---|---|
| You want a working hostname right now, with no setup | Your environment cannot depend on a third party |
| Development, CI, previews, demos, ephemeral boxes | You need your own domain in the name |
| Your agents need an address the moment they boot | You want guaranteed capacity and your own abuse policy |

Running your own is a standing commitment: a domain you own, a host with a static public
IPv4, UDP and TCP port 53 reachable, NS delegation with glue records, and someone keeping
all of it alive.

## Run your own

```sh
git clone https://github.com/kwkuh/open-domain
cd open-domain
npm test

ZONES=example.dev,example.test PORT=15353 BIND=127.0.0.1 node src/server.js
dig +short -p 15353 @127.0.0.1 1.2.3.4.example.dev
```

Each zone gets its own `SOA` and apex, and the longest matching zone wins. Configuration
is all environment variables: `ZONES`, `PORT`, `BIND`, `NS_HOSTS`, `APEX_IP`, `TTL`,
`SOA_MINTTL`, `DEBUG`.

## Reliability

Community-run infrastructure offered as a public good, with no SLA. Meant for development,
previews, demos, CI, and giving ephemeral machines an address. Not meant to sit in the
critical path of a production system that depends on a free third party — for that, run
your own from the source above, on a domain you control.

## Abuse

Report a hostname to abuse@open-domain.com. We act on phishing, malware, and
command-and-control. We can stop an address from resolving under our suffixes; we cannot
remove content we never hosted, and we cannot say who used a name because no query logs
are kept. Full policy: [/abuse.md](https://open-domain.com/abuse.md).

Security flaws in the resolver go to security@open-domain.com instead.

## Prior art

In the tradition of [nip.io](https://nip.io) and [sslip.io](https://sslip.io), which have
run this idea for over a decade. If you need the most battle-tested option today,
those are it — this project is newer and says so plainly.

---

Source: <https://github.com/kwkuh/open-domain> · MIT licensed
