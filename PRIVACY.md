# Privacy

**Effective 1 August 2026.** Plain language on purpose. Not legal advice.

Open-Domain has no accounts, no cookies, no analytics, no tracking pixels, and no
third-party scripts. There is nothing to log into, so there is nothing tying a
query to a person.

The nameservers run in Falkenstein, Germany.

## What is written down

One line per DNS query, containing:

| Field | Example | Why |
|---|---|---|
| timestamp | `2026-08-01T11:02:26.043Z` | when |
| client address block | `74.63.19.0/24` | to tell "one source flooding" from "many people using" |
| queried name | `203.0.113.10.a-i.st` | this is what an abuse report is about |
| query type | `A` | |
| result code | `0` | whether it was answered, refused, or blocked |
| outcome | `lolos` | answered / truncated / dropped / blocked |
| transport | `udp` | |

**Client addresses are truncated before they are written.** IPv4 keeps the first
three octets (`/24`); IPv6 keeps the first three groups (`/48`). The full address
is never stored.

That is deliberate, and it comes from asking what the log is actually for. An abuse
report says *"`bank.203.0.113.10.a-i.st` was used for phishing."* Answering it
requires knowing that the name was served, when, and how often — all of which live
in **the name**. None of it requires knowing **who asked**. Under GDPR a full IP
address is personal data, so keeping one we do not need would add obligation
without adding capability.

## What is not written down

- Full client IP addresses.
- Anything linking queries to each other or to a person.
- Anything about what runs at the address you point a name at. The service answers
  a DNS question and never contacts that address.

## Retention

**14 days**, then deleted by log rotation. Abuse reports arrive within days, not
years.

## Sharing

Logs are not sold, rented, or shared. They may be disclosed if required by a valid
legal order, or quoted in narrow excerpt when responding to an abuse report about a
specific name — and even then, the addresses in them are already truncated.

## The website

<https://open-domain.com> is a static page on GitHub Pages. No cookies, no scripts,
no fonts or assets fetched from anywhere else. GitHub sees the request as the party
serving it; their practices are theirs, not ours.

Email to `abuse@` and `security@` is routed by Cloudflare Email Routing and
forwarded to the operator's mailbox.

## Your rights

If you are in the EU/EEA/UK you have rights of access, rectification, erasure, and
complaint. In practice there is very little to exercise them against: with the
client address truncated at write time, a query cannot be traced back to you, and
we cannot identify your records even if you ask us to.

## Contact

<abuse@open-domain.com>.
