# Let's Encrypt rate limit adjustment request

**Form:** https://isrg.formstack.com/forms/rate_limit_adjustment_request (11 pages)
**Status:** not submitted — the final fill-in and the Submit button are the operator's call.

## Why this matters, and why it has to happen now

People use wildcard-IP DNS precisely so they can get HTTPS. The Let's Encrypt limit
**"New Certificates per Registered Domain" is 50 per 7 days**, refilling one every
202 minutes. What counts as the "registered domain" is `a-i.st` as **a single entity** —
not per user. So the 51st user in a week fails, and they will conclude the service is
broken, not that a quota ran out.

`a-i.st` and `a-i.sh` are **not on the Public Suffix List**, and that route is closed:
the PSL rejects wildcard-IP services (issue #335 was closed in 16 minutes).

The precedent works in our favour: **sslip.io was raised from 50 to 250,000**, and their
request for 500,000 was declined. So the path is real and has been granted before, for a
service of exactly this shape.

⏳ **Lead time:** the form is reviewed weekly, adjustments are pushed to production twice
a month, and they state explicitly *"we cannot guarantee any timeline"*. This is the one
piece of work that cannot be caught up later.

💡 Renewals are **exempt** from this limit. What consumes the quota is certificates for
new names — and on this service, every new user is a new name.

## Ready-to-paste answers

| # | Question | Answer |
|---|---|---|
| 1 | Have you read the Integration Guide? | ✅ tick |
| 2 | Have you read the Rate Limits Documentation? | ✅ tick |
| 3 | Are you receiving a rate limit message? | **No, I am proactively reaching out** |
| 4 | For which rate limit do you need an override? | **Certificates per Registered Domain** |
| 5 | Apply to Account ID or Domains? | **Domain(s)** |
| 6 | Domains (max 3, eTLD+1) | `a-i.st` and `a-i.sh` |
| 7 | Largest new certs/week, **ignoring** renewals | **300 – 1,000** — see the note below |
| 8 | Largest new certs/week, **including** renewals | **300 – 1,000** |
| 9 | Organization / Company Name | `Open-Domain` |
| 10 | Organization / Company Website | `https://open-domain.com` |
| 11 | What ACME client do you use? | see the text below |
| 12 | Your Email Address | the operator's main address |
| 13 | First / Last Name | fill in yourself |
| 14 | Privacy Policy acknowledgement | ✅ tick |
| 15 | Technical Email Updates | **Opt In** — if the limits change, we want to hear first |
| 16 | Monthly newsletter | your choice |
| 17 | Financially supporting Let's Encrypt? | **Not at this time** |

### A note on the numbers (questions 7 and 8)

The lowest option on the form is **100 – 300**, and even that is already 2–6x the default.

- **300 – 1,000** is the recommendation. Roughly 43–143 new names per day. Enough for a
  first year of adoption without sounding invented.
- **10,000+** triggers a follow-up question asking for an exact figure and demands
  justification. With traction still at zero, that makes rejection more likely, not less.
- You can apply again later if it is genuinely being used. Raising a request backed by
  measured usage is far easier than defending a number that was made up.

⚠️ **Do not invent numbers.** Open-Domain's traction today is zero. What is being asked
is future need, so 300–1,000 is an honest projection — not a claim about the present.

### Text for "Tell us about the service(s) or product(s)"

> Open-Domain is a free wildcard-IP DNS service on the suffixes a-i.st and a-i.sh.
> Appending a suffix to any IP address returns that IP: 203.0.113.10.a-i.st resolves
> to 203.0.113.10. Every answer is computed from the query name, so there is no
> database, no signup, no API key, and no account. It is the same shape of service
> as nip.io and sslip.io, and the source is MIT-licensed at
> https://github.com/kwkuh/open-domain
>
> Subscribers use it to obtain certificates for machines that have an IP address but
> no domain name: local development, homelab services, CI runners, ephemeral preview
> environments, and agent-to-agent addressing. Each such subscriber needs a
> certificate for a distinct hostname under a-i.st or a-i.sh.
>
> Because the entire service lives under two registered domains, every subscriber
> draws from the same per-registered-domain bucket. The default of 50 certificates
> per week is therefore shared across all users of the service rather than being per
> user, which is why we are asking proactively rather than after subscribers start
> failing.
>
> We understand nip.io and sslip.io were granted an adjustment for the same
> structural reason. Our expected volume is far smaller; we are asking for headroom
> for early adoption, not for their scale.

### Text for "What ACME client do you use?"

> Not applicable to us directly — we operate the DNS layer only and do not request
> certificates ourselves. Our subscribers run their own ACME clients against their
> own machines; in practice that is Certbot, acme.sh, Caddy, Traefik, and
> cert-manager. We do not proxy, batch, or intermediate their requests.

## After submitting

- They notify by email when the application is processed.
- While waiting, the front page **must not** promise smooth HTTPS. State plainly that
  the certificate quota is shared until the adjustment lands.
- If rejected: cite the number of real users by then and apply again. A request backed
  by measured usage is far stronger than a projection.
