# Security Policy

`a-i-dns` is the authoritative DNS server behind `a-i.sh`, a stateless
wildcard-IP resolver in the spirit of [nip.io](https://nip.io) /
[sslip.io](https://sslip.io). It stores no data: every answer is computed
directly from the query name. This document explains how to report
vulnerabilities and the privacy properties you should assume when using the
service.

## Reporting a Vulnerability

If you believe you have found a security vulnerability, please report it
privately. **Do not open a public GitHub issue for security problems.**

- **Email:** [TODO: security contact]
- **GitHub:** Use [Private vulnerability reporting](https://github.com/kwkuh/open-domain/security/advisories/new)
  on the repository (Security tab → Report a vulnerability).

Please include:

- A clear description of the issue and its impact.
- Steps to reproduce (a proof-of-concept query, packet, or command is ideal).
- The version, commit, or deployment endpoint affected.
- Your assessment of severity, if you have one.

We will acknowledge your report, investigate, and keep you informed of
progress. We ask that you give us a reasonable opportunity to release a fix
before any public disclosure, and that you avoid privacy violations, service
degradation, or data destruction while testing. We appreciate coordinated
disclosure and will credit reporters who wish to be named.

Target response times (best-effort for a volunteer-maintained project):

- **Acknowledgement:** [TODO: e.g. within 3 business days]
- **Initial assessment / triage:** [TODO: e.g. within 7 business days]

## Scope

**In scope**

- The DNS server code in this repository (`src/`): request parsing, wire
  encoding/decoding, and answer resolution.
- Correctness and safety of the name-to-address computation (e.g. parser
  crashes, malformed-packet handling, resource exhaustion, response spoofing
  vectors).
- The project's public assets (`web/`, `docs/`).

**Out of scope**

- The content that a resolved IP address points to. `a-i.sh` only maps a
  hostname to the IP encoded in it; it does not host, proxy, or control
  anything at that IP. Abuse of a destination IP is not a vulnerability in this
  project.
- Denial-of-service from traffic volume against a specific public deployment
  (report operational abuse to the operator, not as a code vulnerability),
  unless it stems from an algorithmic flaw in the code itself.
- Third-party infrastructure (registrar, hosting provider, upstream resolvers).

## Important: Privacy and Safe Use

`a-i.sh` is a **public, unauthenticated DNS service**. Please understand the
following before using it:

- **Never put secrets in a hostname.** Anything you place in a DNS query name
  — tokens, keys, passwords, internal identifiers — travels in cleartext and is
  routinely logged and cached by recursive resolvers, ISPs, and other
  intermediaries far outside this project's control. Treat every hostname you
  resolve as public information.
- **Do not encode PII.** Do not embed personal data in query names for the same
  reason. The only values that belong in an `a-i.sh` hostname are the IP
  address you want returned (plus an optional non-sensitive label prefix).
- **Private/internal IPs are allowed but not private.** You can resolve names
  like `10.0.0.1.a-i.sh` or `192-168-1-1.a-i.sh`, which is useful for local
  development and TLS. The IP itself is not reachable from the public internet,
  but the fact that you queried it is still visible to the resolvers in the
  path. The mapping is public; the destination is not proxied.
- **No confidentiality guarantees.** Because the service is stateless and
  computes answers from the name alone, it offers no authentication,
  encryption, or access control at the DNS layer. Use DNS-over-TLS/HTTPS to
  your own resolver if query privacy matters to you.

## Supported Versions

This project is pre-1.0 and moves fast. Security fixes are applied to the
`main` branch. If you run a pinned version, please upgrade to the latest
`main` before reporting to confirm the issue still reproduces.

---

*If in doubt about whether something is a security issue, err on the side of
reporting it privately using the contact above.*
