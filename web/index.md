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
| `203-0-113-10.a-i.st` | 203.0.113.10 | dash separators — one label instead of four |
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

Both forms work. A certificate for `5.78.141.213.a-i.st` issues exactly as easily as one
for `5-78-141-213.a-i.st` — verified by issuing a real Let's Encrypt certificate covering
both names at once. Use whichever you prefer.

**We do not provide a wildcard certificate**, and neither do nip.io or sslip.io. You cannot
obtain one for `*.a-i.st` yourself either: Let's Encrypt only issues wildcards through the
DNS-01 challenge, and that requires adding a TXT record to `a-i.st` — which nobody but us
can do. So the dashed form buys you nothing on its own. It matters only if someone hands
you a wildcard certificate, and nobody does.

What you get instead is an ordinary certificate for your exact hostname, which is all most
people needed anyway. Let's Encrypt will not issue for a bare IP address, but it will for a
hostname — and that is what this gives you.

Two practical consequences, both learned the hard way:

- **Port 80 or 443 must be reachable from the internet.** DNS-01 is impossible for these
  names, so HTTP-01 or TLS-ALPN-01 is your only route.
- **Do not proxy `/.well-known/acme-challenge/` to your app.** A catch-all proxy rule sends
  the challenge to your application, your application answers with its own page, and
  issuance fails with `unauthorized`. Serve that path from disk.

```
server {
    listen 80;
    server_name 5-78-141-213.a-i.st;
    location /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { proxy_pass http://127.0.0.1:8090; }
}
```

```
certbot certonly --webroot -w /var/www/acme -d 5-78-141-213.a-i.st
```

**Certificates are rate-limited per suffix, not per user.** Let's Encrypt allows 50 new
certificates per registered domain every 7 days, and `a-i.st` counts as one registered
domain for everybody using it. Renewals are exempt. If you hit the limit, try `a-i.sh` —
it has its own separate allowance.

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

ZONES=example.dev,example.test NS_HOSTS=ns1.example.dev,ns2.example.dev \
  PORT=15353 BIND=127.0.0.1 BIND6=::1 node src/server.js
dig +short -p 15353 @127.0.0.1 1.2.3.4.example.dev
```

Each zone gets its own `SOA` and apex, and the longest matching zone wins. Configuration
is all environment variables: `ZONES`, `PORT`, `BIND`, `NS_HOSTS`, `APEX_IP`, `TTL`,
`SOA_MINTTL`, `DEBUG`.

## If a name does not resolve

NXDOMAIN has three common causes. Tell them apart with `dig a-i.st SOA`: if the SOA
answers, the service is up and the problem is the name.

- **Not a valid IP encoding** — `hello.a-i.st` has no address in it. Use the dotted,
  dashed, or 8-hex-digit form.
- **Your resolver blocks private IPs** — DNS-rebinding protection refuses `10.x`,
  `192.168.x`, `127.x`. That is your resolver; nip.io and sslip.io hit it too.
- **The service is down** — the case the SOA check confirms.

## Isolation

Names under `a-i.st` are **not** isolated from each other in the browser: the suffix is
not on the Public Suffix List, so a browser treats all `*.a-i.st` names as one site for
cookies. Use them for dev, previews, and reaching a box by IP — not for separating
untrusted tenants that must not share a cookie jar.

## Reliability

Community-run infrastructure offered as a public good, with no SLA. Meant for development,
previews, demos, CI, and giving ephemeral machines an address. Not meant to sit in the
critical path of a production system that depends on a free third party — for that, run
your own from the source above, on a domain you control.

## Abuse

Report a hostname to abuse@open-domain.com. We act on phishing, malware, and
command-and-control. We can stop an address from resolving under our suffixes; we cannot
remove content we never hosted, and we cannot say who used a name because query logs truncate
the client address before writing it (see /privacy.md). No full query logs
are kept. Full policy: [/abuse.md](https://open-domain.com/abuse.md).

Security flaws in the resolver go to security@open-domain.com instead.

## Prior art

In the tradition of [nip.io](https://nip.io) and [sslip.io](https://sslip.io), which have
run this idea for over a decade. If you need the most battle-tested option today,
those are it — this project is newer and says so plainly.

---

Source: <https://github.com/kwkuh/open-domain> · MIT licensed
