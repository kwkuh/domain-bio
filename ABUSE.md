# Reporting abuse

**Email [abuse@open-domain.com](mailto:abuse@open-domain.com) with the full hostname.**
We aim to acknowledge within 24 hours and to act within 72.

The full policy, including what a DNS operator can and cannot do about a report, is at
**<https://open-domain.com/abuse.html>**. The short version is below.

## What we can do

Stop an IP address, or a range of them, from resolving under `a-i.st` and `a-i.sh`.
Names pointing at it then return `NXDOMAIN`.

## What we cannot do

- **Remove content.** We never had it. It lives on the IP address inside the hostname
  and keeps serving whether or not we answer.
- **Say who used a name.** The logs record the queried name, but the client address is
  truncated to a /24 (IPv4) or /48 (IPv6) before writing and deleted after 14 days, so a
  query cannot be traced back to a specific person. See PRIVACY.md.
- **Reach the host elsewhere.** A block here does not affect the same IP under another
  service, under the operator's own domain, or by its raw address.

## Read the hostname first

The IP is in the name: `login-example.203-0-113-10.a-i.st` is `203.0.113.10`.
Whoever provides connectivity to that address can take the content down, which we cannot.
Reporting it to them is usually faster and more final.

## What we act on

Phishing and credential harvesting · malware distribution and command-and-control ·
material unlawful where it is hosted or where this service operates.

We do not arbitrate disputes over lawful content, and trademark or copyright complaints
about a site belong with its host or its own registrar.

## Blocking is blunt

A block applies to an address, not a page. On shared hosting it removes the name for every
legitimate service at that address too, so we prefer the narrowest action that stops the harm.
Caught unfairly? Write to abuse@open-domain.com with the address and what runs on it.

## Not abuse: security vulnerabilities

A flaw in the resolver itself goes to [security@open-domain.com](mailto:security@open-domain.com)
or GitHub's [private advisory form](https://github.com/kwkuh/open-domain/security/advisories/new).
See [SECURITY.md](./SECURITY.md).
