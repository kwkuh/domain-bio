# a-i.sh — Launch Copy

Ready-to-post launch assets for **a-i.sh**, the agent-native wildcard DNS service.
Everything here is honest, non-spammy, and credits the prior art it stands on
(nip.io / sslip.io). Fill every `[TODO: ...]` before posting — do **not** invent
metrics, star counts, or usage numbers.

**One-line pitch:** Every agent needs an address. `1.2.3.4.a-i.sh` resolves to
`1.2.3.4` — no signup, no dashboard, no human in the loop.

**Core differentiators to lead with (all verifiable today):**
- **Agent-native positioning** — built for ephemeral agent/bot boxes that only
  have a raw IP and can't click a DNS dashboard. No incumbent
  (nip.io/sslip.io/traefik.me/backname.io) targets this.
- **Machine-readable `llms.txt`** — usage an agent can consume once it's pointed
  at the domain. (Honest framing: this is token-ergonomics *after* discovery,
  not a discovery/SEO channel. Don't claim agents "auto-find" us.)
- **100% open-source (MIT) + self-hostable** — directly answers the #1 fear with
  these services (xip.io shut down). Zero-dependency Node, ~[TODO: LOC] lines.
- **Stands on nip.io/sslip.io** — same dead-simple wildcard-IP idea, credited
  openly. The new thing is the agent framing + `llms.txt` + dashed wildcard-TLS.

**Honesty guardrails (apply everywhere):**
- No adoption/usage numbers unless real. Use `[TODO]` placeholders.
- Don't say "AI agents discover us via llms.txt" — unsupported.
- GitHub username is `kwkuh`; repo is `github.com/kwkuh/open-domain`.
- Not yet deployed at launch time — see the deploy `[TODO]` below before posting
  anything that tells people to run a live `dig`.

> **PRE-LAUNCH BLOCKER:** `[TODO: a-i.sh must be deployed and answering on a
> public IP + port 53 before posting.]` Every asset below assumes a working live
> service. Verify with `dig +short 1.2.3.4.a-i.sh` returns `1.2.3.4` first.

---

## 1. Show HN

**Title options (pick one):**
- `Show HN: a-i.sh – wildcard DNS that gives every AI agent a public address`
- `Show HN: a-i.sh – nip.io for AI agents (open-source, MIT, self-hostable)`

**Body:**

```
Hi HN. a-i.sh is a wildcard DNS service in the tradition of nip.io and sslip.io:
append .a-i.sh to any IP and it resolves straight back to that IP.

  1.2.3.4.a-i.sh          -> A     1.2.3.4
  203-0-113-10.a-i.sh     -> A     203.0.113.10   (dashed form, for wildcard TLS)
  0a000001.a-i.sh         -> A     10.0.0.1       (hex)
  2001-db8--1.a-i.sh      -> AAAA  2001:db8::1     (IPv6)
  app.1.2.3.4.a-i.sh      -> A     1.2.3.4        (any prefix ignored)

It's stateless: the answer is a pure function of the hostname, computed on the
fly. No database, no registration, no API key, no dashboard.

The reason I built another one: I keep spawning AI agents and bots in ephemeral
boxes that come up with nothing but a raw public IP. There's no human around to
click a DNS panel, and the agent itself needs a real hostname to get a TLS cert
and be reachable. nip.io/sslip.io solve the wildcard-DNS part beautifully, so
this is squarely built on their idea — I'm not claiming to have invented the
trick. What's different is the framing and the extras aimed at that use case:

- Agent-native by design: "every agent needs an address." No human in the loop.
- An llms.txt with the usage rules, so when a coding agent is handed the domain
  it can read how to use it without burning tokens guessing. (To be clear: this
  is ergonomics once you point an agent at the domain, not some magic discovery
  channel — crawlers basically don't fetch llms.txt and I'm not pretending they
  do.)
- Dashed form (203-0-113-10.a-i.sh) so a single *.a-i.sh cert covers HTTPS.

It's MIT-licensed and the whole DNS server is zero-dependency Node, so you can
self-host it for your own domain in a few minutes. That matters to me because
the biggest, most legitimate worry with these services is "what if the operator
turns it off one day" (RIP xip.io) — open-source + self-host is the honest
answer to that.

Repo: https://github.com/kwkuh/open-domain
Landing + interactive converter: https://a-i.sh
llms.txt: https://a-i.sh/llms.txt

Caveats, stated plainly: don't put secrets in hostnames (resolvers log DNS
queries), and don't use it for critical production — it's a free service; for
that, run your own domain (the code's right there). Feedback very welcome,
especially from people running agent sandboxes / PaaS / reverse proxies.
```

**First-comment (post yourself, right after submitting):**

```
Some things I deliberately did NOT do / open questions:

- I'm not making adoption claims. This just launched and I'd rather show the
  design than inflate numbers. [TODO: after real usage exists, can share query
  volume honestly.]
- Prior art credit: this is nip.io/sslip.io's idea. If you just want plain
  wildcard DNS with no agent angle, those are battle-tested (sslip.io has run
  10+ years). Use whichever you trust.
- Would love pointers on where a default TLS-friendly wildcard resolver would
  actually help in agent tooling (sandboxes, devcontainers, reverse proxies).
```

---

## 2. Reddit variants

Each subreddit gets its own angle. One post per sub, no cross-post blasting.
Read each sub's self-promo rules before posting; engage in comments, don't
drive-by.

### r/selfhosted

**Title:** `a-i.sh — open-source wildcard-IP DNS (nip.io-style) you can self-host in minutes`

```
Built a small wildcard DNS service: append .a-i.sh to an IP and it resolves back
to that IP (1.2.3.4.a-i.sh -> 1.2.3.4). Same core idea as nip.io/sslip.io — full
credit to them, this stands on their shoulders.

Why post it here: the whole thing is MIT and zero-dependency Node, so the point
for r/selfhosted is you can run it on your own domain. The server computes every
answer from the hostname (no DB, no state), so self-hosting is literally: point
NS records at a box, run one Node process on :53, done.

- Dashed form (192-168-1-1.a-i.sh) gives you a single *.yourdomain cert for
  wildcard TLS on your LAN/homelab services.
- IPv6 + hex forms supported too.
- I run the hosted a-i.sh instance for convenience, but the honest reason to
  self-host is service continuity — no "what if they shut it down" (xip.io did).

Repo: https://github.com/kwkuh/open-domain
Would love homelab TLS setups it could slot into.
```

### r/devops

**Title:** `a-i.sh — deterministic wildcard DNS for ephemeral boxes (dashed form = wildcard TLS)`

```
Sharing a wildcard-IP DNS service in the nip.io/sslip.io lineage (credit to
them). Append .a-i.sh to an IP, resolves straight back. Stateless — the answer
is a pure function of the name, so there's nothing to provision.

Where it earns its keep in a pipeline:
- Preview/ephemeral environments that come up with only a public IP and need a
  real hostname immediately (no DNS propagation you have to wait on / control).
- Wildcard TLS: 203-0-113-10.a-i.sh (dashed) means one *.a-i.sh cert covers the
  name, so HTTPS on throwaway envs "just works."
- No API, no signup, no rate-limited control plane in your critical path.

MIT + zero-dependency Node, so if you don't want a hard dependency on a free
service (fair — see xip.io), self-host it for a domain you own. That's the
intended prod story; the hosted instance is for dev/preview.

Repo: https://github.com/kwkuh/open-domain
Interested in whether this fits your CI preview-env flow.
```

### r/LocalLLaMA

**Title:** `Give your local/agent box a public hostname + TLS with one DNS trick (a-i.sh, open-source)`

```
If you run agents or model servers on boxes that only have a raw IP, this might
save you a chore. a-i.sh turns any IP into a hostname: 1.2.3.4.a-i.sh -> 1.2.3.4.
It's the nip.io/sslip.io idea (credit to them), but I built it around the
agent use case specifically.

Why it matters for local/agent setups:
- Your agent's ephemeral box gets a working hostname the instant it has a public
  IP — no dashboard, no human clicking through a DNS panel.
- Dashed form -> one *.a-i.sh cert -> real HTTPS for your model/agent endpoint.
- There's an llms.txt so if you hand a coding agent the domain, it can read the
  usage rules without guessing. (Being honest: that's for when the agent is
  already pointed at it — it's not a discovery/SEO thing.)

MIT, zero-dependency Node, self-hostable. Don't put secrets in hostnames (DNS is
logged) and don't lean on the free instance for anything critical — run your own
for that.

Repo: https://github.com/kwkuh/open-domain
```

### r/AI_Agents

**Title:** `Every agent needs an address — a-i.sh gives an ephemeral agent box a hostname + TLS, no human in the loop`

```
An agent spun up in a sandbox usually has a raw public IP and no way to get a
real hostname — it can't click a DNS dashboard, and it needs a name to get a TLS
cert and be reachable. a-i.sh fixes exactly that: append .a-i.sh to the IP and it
resolves back.

  <agent-ip>.a-i.sh          -> that IP
  <agent-ip-dashed>.a-i.sh   -> same IP, but now a *.a-i.sh cert gives it HTTPS

It's the nip.io/sslip.io wildcard-DNS idea (full credit) — the difference is it's
aimed at the "agent with no human operator" scenario, and it ships an llms.txt
so an agent handed the domain can read how to use it. Stateless, no signup, no
API key.

Open-source (MIT), zero-dependency Node, self-hostable, so you're not betting
your infra on a free service you don't control.

Honest caveats: don't encode secrets in hostnames (resolvers log queries); the
free instance is for dev, self-host for anything you actually depend on.

Repo: https://github.com/kwkuh/open-domain
Curious how folks are handling addressing/TLS for agent sandboxes today.
```

---

## 3. X / Twitter thread

Keep it tight. No fake metrics.

```
1/ Every AI agent needs an address.

Spin one up in an ephemeral box and it has... a raw IP. No hostname, no TLS, no
human around to click a DNS dashboard.

a-i.sh fixes that. Append .a-i.sh to an IP, it resolves back:

  1.2.3.4.a-i.sh -> 1.2.3.4

Open-source, MIT. 🧵
```

```
2/ It's the nip.io / sslip.io trick — full credit to them, this is built on
their idea.

What's different: it's aimed at agents with no human operator, and it ships an
llms.txt so an agent handed the domain can read how to use it.
```

```
3/ Formats:

  1.2.3.4.a-i.sh        dotted
  1-2-3-4.a-i.sh        dashed → one *.a-i.sh cert = wildcard TLS
  0a000001.a-i.sh       hex
  2001-db8--1.a-i.sh    IPv6
  app.1.2.3.4.a-i.sh    any prefix ignored

Stateless. Answer is computed from the name. No DB, no signup, no API key.
```

```
4/ The honest part:

The biggest fear with these services is "what if it gets shut down" (RIP xip.io).

So a-i.sh is MIT + zero-dependency Node + self-hostable. Run your own for a
domain you own. The free instance is for dev.
```

```
5/ Don't put secrets in hostnames (DNS gets logged), and don't lean on the free
instance for critical prod.

Repo + interactive converter:
https://github.com/kwkuh/open-domain
https://a-i.sh

Feedback welcome, esp. from folks building agent sandboxes.
```

---

## 4. dev.to article outline

**Working title:** `Give Your AI Agent a Public Address`
**Alt titles:** `nip.io for AI Agents` / `Every Agent Needs an Address`
**Tags:** `#ai` `#devops` `#opensource` `#webdev`
**Canonical:** set canonical URL to the a-i.sh blog/repo if cross-posted.

**Outline:**

1. **The hook — the missing address**
   - A concrete scene: agent/bot spawns in an ephemeral box, comes up with a raw
     public IP, no hostname, no TLS, no human to configure DNS.
   - Why "just use the IP" fails: no HTTPS cert for a bare IP, hard to pass
     around, no clean per-agent naming.

2. **Prior art (credit up front)**
   - nip.io / sslip.io: the wildcard-IP-in-hostname pattern. How it works, why
     it's beloved, ~10+ years of sslip.io. State plainly this is their idea.
   - What was missing for *my* use case → segue to agents.

3. **What a-i.sh is**
   - Append `.a-i.sh` to an IP → resolves back. The 5 formats table (dotted,
     dashed, hex, IPv6, prefix).
   - Stateless: answer = pure function of the hostname. No DB, no signup.

4. **The agent angle (the actual differentiator)**
   - "Every agent needs an address." No human in the loop.
   - The dashed form + one `*.a-i.sh` cert → instant HTTPS on a throwaway box.
   - `llms.txt`: usage rules an agent can read once handed the domain.
     **Honesty note in the article:** this is token-ergonomics after the agent
     is pointed at the domain — NOT a discovery/SEO mechanism. Crawlers don't
     meaningfully fetch llms.txt; don't imply otherwise.

5. **Walkthrough — do it live**
   - `dig +short 1.2.3.4.a-i.sh` → `1.2.3.4`.
   - Minimal example: agent box gets its IP, forms `<dashed-ip>.a-i.sh`, gets a
     wildcard cert, serves HTTPS. `[TODO: paste a real working snippet once
     deployed.]`

6. **Self-hosting (the trust story)**
   - The #1 fear: operator shuts it down (xip.io). Answer: MIT + zero-dependency
     Node. Point NS records at a box, run one process on :53.
   - Config table (ZONE / PORT / NS_HOSTS / etc.) from the README.

7. **When NOT to use it**
   - No secrets in hostnames (resolvers log queries).
   - Not for critical prod on the free instance — own your domain for that.

8. **Close**
   - It's open-source and I want it to be public infra for the open agent
     ecosystem. Links: repo (`github.com/kwkuh/open-domain`), landing, llms.txt.
   - Ask: where would a default wildcard resolver help in agent tooling?

**Placeholders to fill before publishing:**
- `[TODO: live dig output + working HTTPS snippet once deployed]`
- `[TODO: repo LOC / test count if you want to cite them — 12 unit tests exist]`
- `[TODO: any real adoption note — otherwise omit, do not fabricate]`
