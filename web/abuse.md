# Abuse

Reporting misuse of a-i.st and a-i.sh.

**Report to abuse@open-domain.com.** Include the full hostname. We aim to acknowledge
within 24 hours and to act within 72.

Open-Domain answers DNS queries and nothing else. Given a hostname with an IP address
inside it, it returns that IP address. It does not host websites, store files, send mail,
proxy traffic, or operate anyone's servers. That shapes what a report to us can and cannot
achieve, so it is worth being direct about both.

## What we can do

Stop an IP address, or a range of them, from resolving under our suffixes. After that,
any name pointing at it returns `NXDOMAIN` instead of an answer.

## What we cannot do

- **Remove content.** We never had it. Whatever you are looking at lives on the IP address
  in the hostname, and it will keep serving that content whether or not we answer for the name.
- **Tell you who used a name.** The logs record the name that was queried, but the client
  address is truncated to a /24 (IPv4) or /48 (IPv6) before it is written and deleted after
  14 days, so a query cannot be traced back to a specific person. See [privacy](./privacy.md).
- **Reach the same host elsewhere.** Blocking a name here does not affect the same IP under
  any other wildcard DNS service, under a domain the operator controls, or by its raw address.

## Read the hostname first

The IP address is inside the name. `login-example.203-0-113-10.a-i.st` is `203.0.113.10`;
dots and dashes are interchangeable. Whoever provides connectivity to that address can take
the content down, which is something we cannot do.

Reporting it to them is usually faster and more final than reporting it to us. Reporting it
to both is reasonable.

## What we act on

- Phishing and credential harvesting
- Malware distribution and command-and-control
- Material that is unlawful where it is hosted or where this service operates

We do not arbitrate disputes over lawful content, and we are not the right venue for
trademark or copyright complaints about a site — those belong with the host or the
registrar of the site's own domain.

## What a report should contain

- The full hostname, exactly as it appeared
- What it was doing, in one or two sentences
- A screenshot or archived copy, if you have one
- When you saw it

A hostname alone is enough to start. Everything else only helps us act faster.

## Blocking is blunt

A block applies to an IP address, not to a page. If the address is shared hosting, blocking
it removes the name for every legitimate service on that address too. We prefer the narrowest
action that stops the harm, and we would rather hear about a specific host than a wide range.

If a block has caught you unfairly, write to abuse@open-domain.com and say which address
and what runs on it.

## Security vulnerabilities

A flaw in the resolver itself is not an abuse report. Send those to security@open-domain.com
or use GitHub's [private advisory form](https://github.com/kwkuh/open-domain/security/advisories/new),
and please give us a chance to fix it before publishing.

## Who runs this

Open-Domain is community-run infrastructure offered as a public good, with no company behind
it and no SLA. Reports are read by a person, not a queue. The source is
[public](https://github.com/kwkuh/open-domain), so you can see exactly what the service does
before deciding what to report.

---

[Open-Domain](https://open-domain.com) · Source: <https://github.com/kwkuh/open-domain>
