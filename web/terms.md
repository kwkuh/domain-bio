# Terms of Use

**Effective 1 August 2026.** Plain language on purpose. Not legal advice, and not
drafted by a lawyer — if you need certainty for a regulated or commercial use, get
your own.

Open-Domain is `a-i.st` and `a-i.sh`, operated by an individual as a free service.
Home: <https://open-domain.com>. Source: <https://github.com/kwkuh/open-domain> (MIT).

## 1. What the service does

Query a hostname with an IP address embedded in it, get that IP back. Every answer
is computed from the query name. There is no database, no account, no signup, and
nothing stored about you.

## 2. No warranty, no SLA

The service is provided **as is** and **as available**, with no warranty of any
kind — express or implied — including merchantability, fitness for a particular
purpose, and non-infringement.

Specifics worth stating plainly, because they are true today:

- **Both suffixes are answered by one resolver on one machine.** They fail
  together. There is no redundancy.
- There is **no uptime commitment**, no support commitment, and no response-time
  commitment.
- The service may change, break, be suspended, or be shut down **at any time,
  without notice**.
- Names may stop resolving at any moment. Do not build anything on the assumption
  that a name will keep working.

If your use is production-critical, use something with more machines behind it.
[nip.io](https://nip.io) and [sslip.io](https://sslip.io) have run this for over
a decade.

## 3. Limitation of liability

To the maximum extent permitted by law, the operator is not liable for any damages
arising from use of, or inability to use, the service — including lost profits,
lost data, service interruption, or any indirect, incidental, special,
consequential, or punitive damages, even if advised of the possibility.

You use this service at your own risk.

## 4. Acceptable use

Do not use Open-Domain to:

- conduct phishing, fraud, or impersonation;
- distribute malware, or operate command-and-control infrastructure;
- attack, overload, or probe systems you do not own or have permission to test;
- send unsolicited bulk email, or evade an email or domain block;
- evade a lawful takedown, block, or court order;
- disguise the destination of traffic in order to defeat someone's security
  controls.

**Names are computed, not registered.** Nobody owns a name under these suffixes,
and creating one grants no rights. A name resolving does not mean the operator has
reviewed, endorsed, or has any connection to what is running at that address.

## 5. Blocking

Addresses may be blocked at the operator's discretion — typically in response to a
credible abuse report, but no reason is required and no notice will be given.
Blocking is by **destination address**, so blocking one address blocks every way of
spelling it.

Blocking a destination is the only enforcement available. The operator does not
control, host, or have access to whatever runs at the address you point at.

## 6. Rate limiting

Responses are rate-limited per client address block. Legitimate clients that hit
the limit receive a truncated response and can retry over TCP. This is anti-abuse
machinery, not a quota you can buy out of.

## 7. Reporting abuse

<abuse@open-domain.com> — see [the abuse page](./abuse.md) for what to include and what
happens next. Security issues: <security@open-domain.com>, see
[SECURITY.md](https://github.com/kwkuh/open-domain/blob/main/SECURITY.md).

## 8. Privacy

See [the privacy page](./privacy.md). Short version: no accounts, no cookies, no
tracking, and client IP addresses are truncated before anything is written down.

## 9. Changes

These terms may change. The effective date at the top will change with them, and
the history is public in the git repository — every revision is a commit.

## 10. Contact

<abuse@open-domain.com> for abuse, <security@open-domain.com> for security. For
anything else, open an issue at
<https://github.com/kwkuh/open-domain/issues>.
