# Contributing to a-i-dns

Thanks for your interest in `a-i-dns` — the authoritative wildcard-IP DNS server
behind [Open-Domain](https://open-domain.com). It encodes an IP address in the hostname
(like [nip.io](https://nip.io) / [sslip.io](https://sslip.io)) and computes every
answer from the query name. It is **stateless** (no database), **zero-dependency**
(Node built-ins only), and MIT licensed.

This guide covers how to run it, how the project is laid out, and how to send a
change that lands.

## Quick start

Requires **Node >= 18**. No `npm install` step — there are no dependencies.

```sh
git clone https://github.com/kwkuh/open-domain
cd open-domain     # or wherever you cloned it
npm test           # run the unit tests
npm run dev        # start a local dev server
```

### Running the tests

```sh
npm test
```

This runs the built-in Node test runner (`node --test`) over `test/*.test.js`.
Every change should keep the suite green; new behaviour should come with new
tests (see [Making a change](#making-a-change)).

### Running a local dev server

```sh
npm run dev
```

`npm run dev` binds to `127.0.0.1:5353` with debug logging on
(`PORT=5353 BIND=127.0.0.1 DEBUG=1`).

> **macOS note:** port `53` needs privilege and port `5353` is used by
> Bonjour/mDNS. If `5353` conflicts on your machine, pick another high port:
>
> ```sh
> PORT=15353 BIND=127.0.0.1 DEBUG=1 node src/server.js
> ```

Query it with `dig`, pointing at whichever port you chose:

```sh
dig +short -p 5353 @127.0.0.1 1.2.3.4.a-i.sh        # -> 1.2.3.4
dig +short -p 5353 @127.0.0.1 192-168-1-1.a-i.sh    # -> 192.168.1.1
dig +short -p 5353 @127.0.0.1 2001-db8--1.a-i.sh AAAA
```

All runtime config is via environment variables (`ZONE`, `PORT`, `BIND`,
`NS_HOSTS`, `APEX_IP`, `TTL`, `DEBUG`) — see the table in the
[README](README.md#config-env).

## Project layout

The code is split into small single-purpose modules under `src/`, each of which
does one part of the request lifecycle:

| File | Responsibility |
|---|---|
| `src/parse.js`   | Parse a hostname into an IP. Handles the dotted, dashed, hex, and IPv6 formats plus free prefixes (`app.1.2.3.4.a-i.sh`). This is the heart of the project. |
| `src/wire.js`    | Encode/decode DNS wire format — read a query packet, write a response packet. |
| `src/resolve.js` | Decide what to answer for a given query name + type (A / AAAA / SOA / NS / NXDOMAIN / REFUSED). Glues `parse` to the zone rules. |
| `src/server.js`  | UDP + TCP listeners on port 53, env config, logging, entrypoint (`bin`). |
| `test/parse.test.js` | Unit tests for the parser. |

Data flows: `server.js` receives a packet → `wire.js` decodes it → `resolve.js`
figures out the answer (calling `parse.js` for IP extraction) → `wire.js`
encodes the response → `server.js` sends it back.

If you are adding a new IP format, you almost certainly want `src/parse.js` plus
tests in `test/`.

## Making a change

1. **Open an issue first** for anything non-trivial (new format, protocol
   behaviour, refactor) so we can agree on the approach before you spend time on
   it. Small fixes (typos, docs, obvious bugs) can go straight to a PR.
2. **Branch** off `main`.
3. **Write the change plus tests.** Parser and resolver changes must come with
   unit tests covering the new cases *and* the rejection cases (bad input should
   not resolve).
4. **Run `npm test`** and make sure it passes.
5. **Verify against a real resolver** with `dig` (see above) if you touched wire
   format or server behaviour — a green unit test isn't proof the packet is
   valid on the wire.
6. **Open a pull request** with a clear description: what changed, why, and how
   you tested it. Keep one logical change per PR.

## Code style

Match the surrounding code — that is the whole style guide.

- Modern ES modules (`import` / `export`, `type: module`).
- **Zero runtime dependencies.** Node built-ins only. A PR that adds an npm
  dependency will almost always be declined; the no-dependency property is a
  feature, not an accident.
- Keep it small and readable: plain functions, early returns, no cleverness that
  a future reader has to decode.
- Stay stateless — answers are computed from the query name, never stored.
- Two-space indent, semicolons, and the naming already in the files.

## Sign-off (DCO)

Contributions are accepted under the [MIT License](LICENSE), and we use the
[Developer Certificate of Origin](https://developercertificate.org/): by signing
off you certify you wrote the change (or have the right to submit it) and are
okay with it being distributed under the project's license.

Add a `Signed-off-by` line to each commit — `git commit -s` does this for you:

```
Signed-off-by: Your Name <you@example.com>
```

Use your real name and an email you can be reached at.

## Good first issues

Some genuinely useful ways to start:

- **More IP formats.** Add support for another accepted encoding in
  `src/parse.js` (with tests), e.g. zero-padded octets, mixed
  dotted/dashed input, or IPv6 zone handling — as long as it stays unambiguous.
- **Docs.** Improve the README or these guidelines, add worked `dig` examples,
  or document a real deployment (systemd, Oracle Cloud, firewall rules).
- **Integrations.** Write a short recipe showing `a-i.sh` used as the wildcard
  DNS in a real tool (reverse proxy, local dev / preview env with wildcard TLS,
  an ephemeral agent sandbox). These are the most valuable contributions —
  they help other people adopt the project.
- **Test coverage.** Broaden `test/` — malformed inputs, edge cases in the wire
  encoder, EDNS0/OPT handling.
- **Protocol niceties.** EDNS0/OPT is not yet echoed back (see the README
  notes); implementing it is a well-scoped, self-contained task.

## Reporting bugs / security

For ordinary bugs, open a GitHub issue with the exact query, the expected
answer, and what you got (a `dig` transcript is ideal).

For anything security-sensitive (this is a DNS server — it's an attack surface),
please **do not** open a public issue; contact the maintainer privately at
[TODO: security contact email].

---

Maintained by Kukuh Adi Laksana Rahman ([@kwkuh](https://github.com/kwkuh)).
Licensed MIT.
