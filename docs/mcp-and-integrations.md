# Open-Domain — MCP server & integration snippets

> **Status:** the integration snippets below are ready to use today. The **MCP
> server is planned, not built yet** (see ROADMAP.md → "Next"); its interface is
> sketched here so the design is on record. Do not expect to `npm install` it yet.

**Open-Domain** turns any IP address into a working hostname. Append a suffix —
`.a-i.st` or `.a-i.sh`, they behave identically — to an IP and it resolves
straight back to that IP: no signup, no API key, no config, no human in the loop.
The examples below use `a-i.sh`; every one of them works the same with `a-i.st`.

```
203.0.113.10.a-i.sh    -> A     203.0.113.10
203-0-113-10.a-i.sh    -> A     203.0.113.10   (dashed — one label, not four)
0a000001.a-i.sh        -> A     10.0.0.1       (8-hex)
2001-db8--1.a-i.sh     -> AAAA  2001:db8::1    (":" -> "-", "::" -> "--")
agent1.203.0.113.10.a-i.sh -> A 203.0.113.10   (any prefix is ignored)
```

The name is a **pure function of the IP** — stateless, deterministic, resolves
the moment your host has a public IP. That property is what makes it agent-native:
an ephemeral box that only knows its own raw IP can compute its own public
hostname locally, with zero API calls.

This document has two parts:

1. **MCP server** — an optional Model Context Protocol server so an agent can
   ask for hostnames as a tool call.
2. **Copy-paste integration snippets** — curl, Node, Python, LangChain/CrewAI,
   Docker/Traefik/Caddy, and Kubernetes.

> **You do not need the MCP server to use a-i.sh.** The mapping is pure string
> math (see the "no-dependency" snippets below). The MCP server exists only for
> agents that already speak MCP and prefer a typed tool over string formatting.

---

## 1. MCP server

A tiny [Model Context Protocol](https://modelcontextprotocol.io) server that
exposes a-i.sh as three tools. It performs **no network calls for
`hostname_for_ip`** — that tool is pure local computation. `resolve` and
`whoami` do touch the network (DNS / a metadata lookup).

### Tools

| Tool | Input | Output | Network? |
|---|---|---|---|
| `hostname_for_ip` | `ip` (string), `dashed` (bool, default `false`), `prefix` (string, optional) | The `.a-i.sh` hostname for that IP | No — pure computation |
| `resolve` | `hostname` (string) | The IP a given `*.a-i.sh` hostname resolves to (parsed locally; optionally DNS-verified) | Optional |
| `whoami` | none | This host's own public IP and its `.a-i.sh` hostname | Yes — public-IP lookup |

#### `hostname_for_ip`

Turn an IP into its hostname. This is the tool an agent calls to get its own
address.

- **Input**
  - `ip` — an IPv4 (`203.0.113.10`) or IPv6 (`2001:db8::1`) address.
  - `dashed` — if `true`, emit the dashed form (`203-0-113-10.a-i.sh`): one
    label instead of four. Any form gets a normal per-name certificate via
    HTTP-01; there is no `*.a-i.sh` wildcard cert and there cannot be one. The
    dashed form only helps a wildcard on a domain YOU own.
  - `prefix` — optional label prepended as `<prefix>.<ip>.a-i.sh`
    (e.g. `prefix="agent1"` → `agent1.203.0.113.10.a-i.sh`). The prefix is
    ignored by resolution; it just gives the agent a readable, unique name.
- **Output** — the hostname string, e.g. `203.0.113.10.a-i.sh`.

#### `resolve`

The inverse: given a `*.a-i.sh` hostname, return the IP it maps to. Parsing is
local (deterministic). If you want a live check, the server can also issue a
real DNS query and report whether the answer matches.

- **Input** — `hostname`, e.g. `app.203-0-113-10.a-i.sh`.
- **Output** — the target IP, e.g. `203.0.113.10`.

#### `whoami`

Convenience for an agent that does not know its own public IP: the server looks
up the host's public IP and returns both the IP and the ready-to-use hostname.

- **Input** — none.
- **Output** — `{ ip, hostname, hostname_dashed }`.

### Reference implementation (Node, MCP SDK)

Minimal, dependency-light stdio server. The pure string logic mirrors
`src/parse.js` in this repo — keep the two in sync if you change the format.

```js
// mcp-server.mjs
// npm i @modelcontextprotocol/sdk
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ZONE = "a-i.sh";

// --- pure helpers (no network) ---
function hostnameForIp(ip, { dashed = false, prefix } = {}) {
  let label;
  if (ip.includes(":")) {
    // IPv6: ":" -> "-", "::" -> "--"
    label = ip.replaceAll("::", "--").replaceAll(":", "-");
  } else if (dashed) {
    label = ip.replaceAll(".", "-"); // 203-0-113-10  (wildcard-TLS friendly)
  } else {
    label = ip; // 203.0.113.10 (dotted)
  }
  const host = `${label}.${ZONE}`;
  return prefix ? `${prefix}.${host}` : host;
}

function resolveHostname(hostname) {
  // strip zone + any prefix labels, take the IP-bearing label
  const bare = hostname.replace(new RegExp(`\\.${ZONE.replace(/\./g, "\\.")}$`), "");
  const label = bare.split(".").pop(); // last label before the zone
  // Dotted IPv4 lives across the LAST FOUR labels, not one: "203.0.113.10" would
  // otherwise return just "10". Take the four nearest the zone when they are octets.
  const labels = bare.split(".");
  if (labels.length >= 4 && labels.slice(-4).every((o) => /^\d{1,3}$/.test(o) && +o <= 255)) {
    return labels.slice(-4).join(".");
  }
  if (/^[0-9a-f]{8}$/i.test(label)) {
    // 8-hex form
    const n = parseInt(label, 16);
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }
  if (label.includes("-")) {
    if (/^\d+(-\d+){3}$/.test(label)) return label.replaceAll("-", "."); // IPv4 dashed
    return label.replaceAll("--", "::").replaceAll("-", ":"); // IPv6 dashed
  }
  return label; // already dotted IPv4
}

const server = new McpServer({ name: "a-i-sh", version: "0.1.0" });

server.tool(
  "hostname_for_ip",
  "Return the a-i.sh hostname for an IP address (pure, no network).",
  {
    ip: z.string().describe("IPv4 or IPv6 address"),
    dashed: z.boolean().default(false).describe("Dashed form: one label instead of four"),
    prefix: z.string().optional().describe("Optional readable label prefix"),
  },
  async ({ ip, dashed, prefix }) => ({
    content: [{ type: "text", text: hostnameForIp(ip, { dashed, prefix }) }],
  })
);

server.tool(
  "resolve",
  "Return the IP a *.a-i.sh hostname maps to (parsed locally).",
  { hostname: z.string() },
  async ({ hostname }) => ({
    content: [{ type: "text", text: resolveHostname(hostname) }],
  })
);

server.tool(
  "whoami",
  "Return this host's public IP and its a-i.sh hostname.",
  {},
  async () => {
    const ip = (await (await fetch("https://api.ipify.org")).text()).trim();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ip,
          hostname: hostnameForIp(ip),
          hostname_dashed: hostnameForIp(ip, { dashed: true }),
        }),
      }],
    };
  }
);

await server.connect(new StdioServerTransport());
```

`whoami` uses a third-party public-IP endpoint (`api.ipify.org`) as an example;
swap it for your cloud's instance-metadata endpoint if you have one.

### Registering the server

**Claude Code / any MCP client** (`.mcp.json` or client config):

```json
{
  "mcpServers": {
    "a-i-sh": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server.mjs"]
    }
  }
}
```

Then an agent can call `hostname_for_ip({ ip: "203.0.113.10", dashed: true })`
and get back `203-0-113-10.a-i.sh`.

---

## 2. Integration snippets (copy-paste)

None of these require the MCP server. a-i.sh is just DNS.

### curl — hit a box by its IP-hostname

```sh
# talk to 203.0.113.10 over HTTPS using a wildcard-TLS-friendly name
curl https://203-0-113-10.a-i.sh/health
```

### Shell — compute your own hostname, no dependencies

```sh
IP=$(curl -s https://api.ipify.org)
echo "dotted : ${IP}.a-i.sh"
echo "dashed : ${IP//./-}.a-i.sh"   # use the dashed one for HTTPS
```

### Node — pure, no dependency

```js
const ip = "203.0.113.10";
const dotted = `${ip}.a-i.sh`;              // 203.0.113.10.a-i.sh
const dashed = `${ip.replaceAll(".", "-")}.a-i.sh`; // 203-0-113-10.a-i.sh  (TLS)
```

### Python — pure, no dependency

```python
ip = "203.0.113.10"
dotted = f"{ip}.a-i.sh"                 # 203.0.113.10.a-i.sh
dashed = f'{ip.replace(".", "-")}.a-i.sh'  # 203-0-113-10.a-i.sh  (TLS)
```

### Give an agent its address — LangChain

Expose a-i.sh as a tool so the agent can name itself:

```python
from langchain_core.tools import tool

@tool
def hostname_for_ip(ip: str, dashed: bool = False) -> str:
    """Return the public a-i.sh hostname for an IP. Set dashed=True for HTTPS."""
    label = ip.replace(".", "-") if dashed else ip
    return f"{label}.a-i.sh"

# tools=[hostname_for_ip] -> the agent can now expose itself at a real hostname
```

### Give an agent its address — CrewAI

```python
from crewai.tools import tool

@tool("hostname_for_ip")
def hostname_for_ip(ip: str, dashed: bool = False) -> str:
    """Return the public a-i.sh hostname for an IP. dashed=True gives one label instead of four."""
    label = ip.replace(".", "-") if dashed else ip
    return f"{label}.a-i.sh"
```

Typical flow: the agent (or your orchestrator) discovers the box's public IP,
calls the tool, and hands the resulting hostname to whoever needs to reach it —
no DNS dashboard, no human.

### Docker + Traefik — routing labels

Route by an a-i.sh hostname. Each name gets its own certificate via HTTP-01.

```yaml
services:
  app:
    image: your/app
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`203-0-113-10.a-i.sh`)"
      - "traefik.http.routers.app.tls=true"
```

### Caddy — automatic HTTPS

```
203-0-113-10.a-i.sh {
    reverse_proxy localhost:8080
}
```

Caddy will fetch a certificate for the exact name over ACME. (If your box's IP
is dynamic, template the hostname from `$IP` at startup.)

### Kubernetes — Ingress host

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app
spec:
  rules:
    - host: 203-0-113-10.a-i.sh   # one label; cert-manager issues a per-name cert via HTTP-01
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 80
```

This is the same pattern platforms like Knative use with nip.io out of the box —
a ready hostname for a cluster IP with no external DNS setup.

---

## Cautions

- **Do not put secrets in a hostname.** DNS queries are logged by resolvers
  along the path.
- **Do not use for critical production.** It depends on this free service. For
  production, delegate a domain you own (you can self-host this exact server —
  it is MIT-licensed and in this repo).
- **HTTPS:** any form gets a normal per-name certificate via HTTP-01. There is no
  `*.a-i.sh` wildcard certificate and there cannot be one (wildcards need DNS-01,
  and these names are generated, not stored). The dashed form is just one label —
  useful only for a wildcard on a domain you own.

## Status & placeholders

- Public deployment is **live since 2026-08-01**: `a-i.st` and `a-i.sh` are both
  delegated to `ns1.a-i.sh` + `ns2.a-i.st` and answer through the public hierarchy.
  One resolver on one machine, so both suffixes fail together — a second nameserver
  is still outstanding. Self-hosting under your own zone remains supported; see the
  repo README.
- Adoption metrics are intentionally omitted — do not cite numbers here.
  Fill in only when measured: `[TODO: query volume]`, `[TODO: integrations]`.
- Canonical repo: `github.com/kwkuh/open-domain` (GitHub user `kwkuh`).
