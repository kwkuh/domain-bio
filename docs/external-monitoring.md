# Open-Domain external monitoring

How we know `a-i.st` and `a-i.sh` are **genuinely alive** from the outside, continuously,
without waiting for someone to complain.

The unit tests in `test/` only say "the logic is correct". This document is about
something else: **does the production nameserver answer, today, this hour, from the real
internet** — and, just as importantly, **can the instrument taking that measurement be
trusted at all**.

---

## 1. What is checked against the production nameservers

Every check aims **straight at one nameserver's IP**, never through a recursive resolver,
and is repeated for **each transport (UDP and TCP)** and **each address family (IPv4 and
IPv6)**. Every tested name is **randomised each time**, so no cache anywhere can make a
dead server look alive.

Source: `monitor/lib/cases.js`.

### Apex

| Check | Expected | Why it matters |
|---|---|---|
| `SOA` at the zone apex | `NOERROR`, `AA=1`, exactly 1 SOA, serial > 0, sane MNAME, `minimum` 1–86400 | the SOA is the zone's identity; `minimum` is the negative-cache TTL, and if it is too large one wrong answer sticks around for a long time |
| `NS` at the zone apex | `NOERROR`, `AA=1`, at least 2 NS | one nameserver is one point of failure |

### The core of the service (answers computed from the name)

| Name form | Example | Expected |
|---|---|---|
| dotted IPv4 | `203.0.113.10.a-i.sh` | `A 203.0.113.10` |
| dashed IPv4 | `203-0-113-10.a-i.sh` | `A 203.0.113.10` (the single-label form) |
| hex IPv4 | `cb00710a.a-i.sh` | `A 203.0.113.10` |
| dashed IPv6 | `2001-db8-1234-5678--9.a-i.sh` | `AAAA 2001:db8:1234:5678::9` (compared as **bytes**, so `::` spelling never matters) |
| arbitrary prefix | `api.staging.203-0-113-10.a-i.sh` | `A 203.0.113.10` |
| UPPERCASE | `203-0-113-10.A-I.SH` | identical to the lowercase form |

### Negative answers — just as important as positive ones

| Case | Expected | If it is wrong |
|---|---|---|
| a name inside the zone that is not an IP | `NXDOMAIN` + **SOA in authority** | without the SOA, resolvers cannot cache the negative answer and query load climbs forever |
| a name outside every zone (`x.example.com`) | `REFUSED`, no answers, `RA=0` | answering it makes us an **open resolver**, and immediately ammunition for amplification attacks |
| `AAAA` on an IPv4 name | `NOERROR` + 0 answers + SOA authority (**NODATA**) | answering `NXDOMAIN` makes resolvers conclude the whole name does not exist — the `A` disappears with it |

### Protocol health

| Check | Why |
|---|---|
| header on every answer: `QR=1`, `AA=1`, `RA=0`, `TC=0` | `AA=0` or `RA=1` means we are talking to a resolver or a hijacker, not to our own nameserver |
| the query ID is echoed unchanged and the question section is echoed exactly | basic defence against injected answers; checked on **every** query, not once |
| a query carrying **EDNS0** (an OPT record) is still answered correctly | modern resolvers almost always send EDNS0; if the server replies `FORMERR`, the zone is effectively dead in the real world |
| response time under 1500 ms | a rough threshold, to smell a route going bad before it breaks outright |
| **TCP** answers the same as UDP | resolvers escalate to TCP when an answer is truncated; a dead TCP path is a silent failure discovered too late |

### Fleet consistency (zone level)

| Check | Why |
|---|---|
| the parent delegation lists at least 2 nameservers | one nameserver is one point of failure |
| every nameserver in the delegation has an address | a nameserver without an address cannot be asked anything |
| every nameserver in the delegation has an **IPv6** address | IPv6-only clients have no other way to reach us |
| the apex NS set matches the parent delegation exactly | a mismatch means the delegation and the zone disagree about who serves it |
| the SOA serial is identical on every nameserver | different serials make a resolver treat one copy of the zone as stale |

---

## 2. Testing each nameserver individually

Checks never go through a recursive resolver. If `ns2` is down while `ns1` is up, a
resolver hides that from you — it simply asks the one that works. Aiming at each
nameserver's own address is the only way one dead server shows up as one red result
instead of silence.

---

## 3. The nameserver list discovers itself

The list of nameservers is **not written into the test**. The moment `ns2` (or `ns3`)
comes up on another continent, the checks cover it without a single line changing.

The source of truth is the **delegation in the parent zone**, not the NS set at our own
apex. The apex NS is an answer from the very server under test — if it is misconfigured
it can claim anything. What decides who is entitled to answer the world is the NS record
in the parent, so discovery walks down from the root:

    root  ->  .sh servers  ->  the a-i.sh delegation (+ glue A/AAAA)

A mismatch between the parent delegation and the apex NS is itself one of the checks.

Three modes, chosen automatically, forceable via `TEMUKAN=induk|doh|env`:

| Mode | When it is used |
|---|---|
| `induk` | normal — walk down from the root over real DNS |
| `doh` | networks that block port 53. Ask a public resolver over HTTPS. **Only to FIND nameservers, never to JUDGE them** — judging always requires querying the server directly |
| `env` | `NAMESERVERS="ns3.example@198.51.100.7"` — for testing a nameserver **before** it is delegated |
| `auto` | try `induk`, fall back to `doh` (the reason is recorded in the trace) |

---

## 4. Schedule, and what happens on failure

Runs every 30 minutes via GitHub Actions, and can be triggered by hand.

Exit codes are deliberately distinct:

| Code | Meaning | Consequence |
|---|---|---|
| 0 | everything passed | badge green, any open incident issue is closed |
| 1 | a check failed | **this is an incident** — issue opened or refreshed, notification sent |
| 2 | could not start | discovery failed or misconfiguration |
| 3 | **result invalid** | the runner's own network is dirty. **Not an incident** — nobody is paged, because this is an instrument problem, not a service problem |

The incident issue is looked up **by title, not by label**. If the labelling step ever
fails, a label filter would leave the issue open forever — a ghost incident that never
closes.

---

## 5. Can a GitHub runner send DNS over UDP to port 53?

Today, yes. But that is proven on every run rather than trusted: `monitor/capability.js`
runs first and reports outbound UDP/53, outbound TCP/53, outbound IPv6, DoH, and whether
port 53 is being hijacked.

If GitHub — or an egress filter such as harden-runner — ever closes port 53, that step
goes red first and says why, instead of the monitoring falsely accusing the nameserver
of being down.

GitHub-hosted runners have **no outbound IPv6**. `IPV6=auto` therefore skips the v6
checks with the reason recorded, rather than counting them as failures. Switch to
`IPV6=on` on a runner that genuinely has IPv6.

---

## 6. Running it by hand from a laptop — and the danger of mobile networks

```sh
npm run kemampuan      # is this machine fit to measure at all?
npm run monitor        # a report for human eyes
npm run monitor:test   # TAP form (node:test), same content
npm run monitor -- --json > result.json

# testing a nameserver that is not delegated yet
NAMESERVERS="ns3.example@198.51.100.7" npm run monitor
```

### Hard warning: some mobile carriers hijack port 53

Verified repeatedly during development on an Indonesian mobile network: **outbound UDP
53 is intercepted**. Every DNS query is answered by the carrier's own resolver, whatever
destination address you aimed at.

That produces two different lies, and both look convincing:

- a **pass** while our nameserver is dead (the hijacker answered), or
- a **failure** while our nameserver is healthy (the hijacker returned NXDOMAIN for our name).

This is why the preflight exists, and why a dirty path produces `INVALID` rather than a
pass or a fail. Ways out, easiest first:

1. change network, then retry;
2. bring up a VPN that carries its own DNS;
3. borrow another server's eyes: `npm run monitor:jauh -- <ssh-host>`;
4. run it from CI: `gh workflow run nameservers.yml`.

DoH/DoT does not help here. Both can only talk to a recursive resolver, whereas the whole
point is to query each authoritative nameserver individually.

---

## 7. Files

| File | Contents |
|---|---|
| `monitor/lib/dns.js` | a tiny DNS client: one query to one server, UDP/TCP, v4/v6, header + RR parsing |
| `monitor/lib/path.js` | the anti-hijack preflight and its warning text |
| `monitor/lib/discover.js` | nameserver discovery: walk down from the root, DoH, env |
| `monitor/lib/cases.js` | the list of checks (§1) — shared by the CLI and the test form |
| `monitor/check.js` | the human-facing CLI plus exit codes 0/1/2/3 |
| `monitor/production.test.js` | a `node:test` wrapper for CI |
| `monitor/capability.js` | fitness report for the measuring network |
| `monitor/stats.js` | reduce the query log to numbers (see the privacy note inside the file) |
| `monitor/remote.sh` | run the monitor from another SSH host |
| `.github/workflows/nameservers.yml` | schedule, badge, incident issue, notification |

`npm test` runs only `test/**/*.test.js` (unit, offline, milliseconds). Production
monitoring is invoked separately — the same split sslip.io uses (`spec/` kept apart from
unit tests).

---

## 8. Verified state (2 August 2026)

Run from a clean network against the production nameservers: **218 checks pass, 0 fail.**

Everything that was previously red has been fixed:

| Finding | State |
|---|---|
| Delegation still pointing at the old provider | ✅ **fixed** — both zones now delegate to `ns1.a-i.sh` + `ns2.a-i.st`, with glue at both registries |
| Nameserver names depending on a third domain | ✅ **fixed** — names moved in-zone, so a problem with the website domain no longer takes resolution down with it |
| ns1 not listening on IPv6 | ✅ **fixed** — separate udp4 and udp6 sockets, plus AAAA records for the nameservers |
| SOA serial from `Date.now()` | ✅ **fixed** — now `YYYYMMDDnn` (RFC 1912 §2.2), identical on every machine and stable across restarts |
| EDNS0 OPT not echoed | ✅ **fixed** — OPT is echoed, advertising 1232 (DNS Flag Day 2020); an unknown EDNS version gets BADVERS rather than silence |

Still open:

- **a second nameserver on another continent.** Measured cost of having only one: cold
  lookups from Asia and the US are several times slower through some resolvers. Once it
  is delegated, monitoring picks it up with no code change.
- `IPV6=on` on a runner that actually has IPv6.
