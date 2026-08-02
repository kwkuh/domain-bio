// server.js — authoritative DNS server for a wildcard-IP service (like nip.io/sslip.io).
// Listens on UDP/53 (primary) and TCP/53 (fallback). Every answer is computed from the
// query name.

import dgram from 'node:dgram';
import net from 'node:net';
import { parseQuery, buildTruncated } from './wire.js';
import { resolve } from './resolve.js';
import { openList } from './blocklist.js';
import { makeLimiter } from './ratelimit.js';
import { openLog } from './querylog.js';

// ---- Configuration from the environment ----
// ZONES is a comma-separated list of the zones we serve. One process can be
// authoritative for several suffixes at once (Open-Domain runs a-i.sh AND a-i.st).
// A single ZONE is still read for backward compatibility.
const ZONES = (process.env.ZONES || process.env.ZONE || 'a-i.sh,a-i.st')
  .split(',')
  .map((s) => s.trim().toLowerCase().replace(/^\.|\.$/g, ''))
  .filter(Boolean);
const PORT = Number(process.env.PORT || 53); // locally use 5353 (ports below 1024 need root)
const BIND = process.env.BIND || '0.0.0.0';
// IPv6 address to listen on. Set BIND6="" if the machine has no IPv6.
const BIND6 = process.env.BIND6 === undefined ? '::' : process.env.BIND6;
const DEBUG = process.env.DEBUG === '1';
const BLOCKLIST = process.env.BLOCKLIST || null;                 // path to the rules file
const SELF_IP = process.env.SELF_IP || process.env.BIND || null; // A record for in-zone ns1/ns2
const SELF_IP6 = process.env.SELF_IP6 || null;                   // AAAA record for in-zone ns1/ns2
const SINKHOLE_IP = process.env.SINKHOLE_IP || null;             // if set, blocks point here instead of NXDOMAIN

// Socket receive buffer. The kernel default (208 KB) holds roughly 250 DNS packets once
// skbuff overhead is counted — a single well-meaning client can exceed it. Measured in
// production before this was fixed: of 5,000 queries sent back to back, the kernel
// DROPPED 4,443 (`receive buffer errors`) before Node ever saw them. The process itself
// was perfectly healthy — 557 in, 557 answered. What filled up was the queue, not the CPU.
const RCVBUF = Number(process.env.RCVBUF || 4 * 1024 * 1024);

// Rate limiting (RRL). Counted per address BLOCK, not per address — see ratelimit.js.
// The default of 100/s is deliberately generous: large resolvers such as Google and
// Cloudflare share a /24, so a tight limit punishes legitimate users before it touches
// an attacker. RRL_PER_SECOND=0 disables the limiter.
const RRL_PER_SECOND = Number(process.env.RRL_PER_SECOND ?? 100);
const RRL_BURST = process.env.RRL_BURST ? Number(process.env.RRL_BURST) : null;
const RRL_SLIP = Number(process.env.RRL_SLIP ?? 5);

/**
 * The SOA serial. This used to be `Date.now()/1000`, which was quietly wrong: the serial
 * jumped ON EVERY RESTART, and two nameservers would NEVER agree on a number. The moment
 * ns2 comes up, a "serials match" check goes permanently red, and third-party tools
 * (Zonemaster, dnsviz) report the zone as inconsistent.
 *
 * The date-based YYYYMMDDnn form follows RFC 1912 §2.2: identical on every machine,
 * increases sensibly, and does not change just because a process was restarted.
 * SOA_SERIAL can override it if a release process ever wants to set it explicitly.
 */
function serialForToday() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return Number(`${y}${m}${day}01`);
}
// A fixed override, or null to track the date live. Read as a getter on cfg below so it
// does not freeze at the value it had when the process booted.
const SERIAL_OVERRIDE = Number(process.env.SOA_SERIAL) || null;

// Query log. Disabled unless QUERYLOG is set.
const queryLog = openLog({
  file: process.env.QUERYLOG || null,
  full: process.env.QUERYLOG_FULL === '1',
  log: (m) => console.log(m),
});

const limiter = makeLimiter({
  perSecond: RRL_PER_SECOND,
  burst: RRL_BURST,
  slip: RRL_SLIP,
});

const blocklist = openList({ file: BLOCKLIST, log: (m) => console.log(m) });

const cfg = {
  zones: ZONES,
  // The default deliberately uses IN-ZONE names: each zone keeps one nameserver inside
  // itself (resolved through a glue record at the registry) and one in the other zone.
  // A name outside both zones would make the delegation depend on a third domain — and
  // if that domain has a problem, both zones go down with it.
  ns: (process.env.NS_HOSTS || 'ns1.a-i.sh,ns2.a-i.st').split(',').map((s) => s.trim()),
  ttl: Number(process.env.TTL || 300),
  refresh: Number(process.env.SOA_REFRESH || 3600),
  retry: Number(process.env.SOA_RETRY || 600),
  expire: Number(process.env.SOA_EXPIRE || 604800),
  minttl: Number(process.env.SOA_MINTTL || 60),
  // A getter, not a frozen number. Computed once at boot, the date-based serial went
  // stale the moment the process ran past midnight UTC: a resolver would see yesterday's
  // serial today. Worse, once ns2 exists, a box that rebooted on a different day would
  // advertise a different serial for the same zone and the "serials match" check would go
  // permanently red. Evaluating it per request keeps every nameserver on the same number.
  get serial() { return SERIAL_OVERRIDE || serialForToday(); },
  apexIp: process.env.APEX_IP || null,   // optional: an A record for the apex (landing page)
  apexIp6: process.env.APEX_IP6 || null, // and the AAAA to go with it
  selfIp: SELF_IP && SELF_IP !== '0.0.0.0' ? SELF_IP : null,
  selfIp6: SELF_IP6 && SELF_IP6 !== '::' ? SELF_IP6 : null,
  sinkholeIp: SINKHOLE_IP,
  blocklist,
};

// Types that actually show up in production, not just the ones we serve. CAA comes from
// Let's Encrypt before it issues a certificate, HTTPS/SVCB from modern browsers, the
// rest from scanners. Without names, they all appear as raw numbers in the statistics
// and nobody can tell what they mean.
const TYPE_NAME = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT',
  28: 'AAAA', 33: 'SRV', 43: 'DS', 48: 'DNSKEY', 65: 'HTTPS', 99: 'SPF',
  255: 'ANY', 257: 'CAA',
};

function handle(msg, from, v6 = false, transport = 'udp') {
  const q = parseQuery(msg); // throws on a malformed packet
  if (DEBUG) console.log(`${from} ${q.name} ${TYPE_NAME[q.qtype] || q.qtype}`);
  const res = resolve(q, cfg);
  if (queryLog.active) {
    queryLog.record({
      ip: from, v6, name: q.name, qtype: TYPE_NAME[q.qtype] || q.qtype,
      rcode: res.readUInt16BE(2) & 0x0f, outcome: 'pass', transport,
    });
  }
  return res;
}

// ---- UDP ----
// Two separate sockets rather than one dual-stack v6 socket. The reason is operational:
// dual-stack makes IPv4 client addresses arrive as "::ffff:1.2.3.4", and the exact
// behaviour differs per OS (on Linux it depends on net.ipv6.bindv6only). Two sockets
// behave identically everywhere, and losing IPv6 does not take IPv4 down with it.
function listenUdp(family, address) {
  const sock = dgram.createSocket({ type: family, ipv6Only: family === 'udp6' });
  const v6 = family === 'udp6';
  sock.on('message', (msg, rinfo) => {
    try {
      // The limiter runs BEFORE resolve: a query over the limit must not consume CPU,
      // and a 'drop' must not produce a packet at all — that packet is precisely what
      // would land on a victim if the source address were forged.
      const verdict = limiter.decide(rinfo.address, v6);
      if (verdict !== 'pass') {
        // Limited queries are still logged when logging is on. This is the most useful
        // thing to have during an incident: the "who is flooding us" pattern is only
        // visible in the queries that were REFUSED, and that is exactly what would be
        // lost if the limiter ran before the recorder.
        if (queryLog.active) {
          try {
            const q = parseQuery(msg);
            // qtype is written as its NAME here too, matching the normal path. It used to
            // go in as a raw number on this branch alone, so the same statistic was half
            // words and half integers and nothing could group it.
            queryLog.record({ ip: rinfo.address, v6, name: q.name, qtype: TYPE_NAME[q.qtype] || q.qtype, rcode: null, outcome: verdict, transport: 'udp' });
          } catch { /* malformed packet: nothing to record */ }
        }
        if (verdict === 'drop') return;
        sock.send(buildTruncated(parseQuery(msg)), rinfo.port, rinfo.address);
        return;
      }
      sock.send(handle(msg, rinfo.address, v6, 'udp'), rinfo.port, rinfo.address);
    } catch (err) {
      if (DEBUG) console.error(`${family}:`, err.message);
    }
  });
  sock.on('error', (err) => {
    // IPv4 is mandatory. IPv6 is optional: a machine without IPv6 must not fail to start
    // because of it — its v4 service is still completely useful.
    if (family === 'udp4') { console.error('udp4 fatal:', err.message); process.exit(1); }
    console.error(`udp6 unavailable (${err.message}) — continuing with IPv4 only`);
  });
  sock.bind(PORT, address, () => {
    // Ask for a large buffer, then READ BACK what was actually granted. The kernel caps
    // silently at net.core.rmem_max, and a capped request looks exactly like a granted
    // one. What goes in the log has to be the real number, not the requested number.
    let actual = null;
    try {
      sock.setRecvBufferSize(RCVBUF);
      actual = sock.getRecvBufferSize();
    } catch (err) {
      console.error(`${family}: could not set receive buffer (${err.message}) — using the kernel default`);
    }
    const capped = actual !== null && actual < RCVBUF;
    console.log(
      `UDP  ${address}:${PORT} zones=${ZONES.join(',')} ns=${cfg.ns.join(',')} ` +
      `blocklist=${BLOCKLIST ? blocklist.count + ' rules' : 'off'} ` +
      `rcvbuf=${actual === null ? '?' : Math.round(actual / 1024) + 'KB'}` +
      (capped ? ` (asked for ${Math.round(RCVBUF / 1024)}KB, capped by net.core.rmem_max)` : '') +
      ` rrl=${limiter.active ? `${RRL_PER_SECOND}/s per block, slip ${RRL_SLIP}` : 'off'}`
    );
  });
  return sock;
}
listenUdp('udp4', BIND);
if (BIND6) listenUdp('udp6', BIND6);

// ---- TCP (fallback: each message is prefixed with a 2-byte length) ----
// A bound on how many TCP connections may be open at once. TCP is deliberately NOT put
// through the per-block query limiter: completing a handshake already proves the source
// address is real, so TCP cannot be used for the reflection the UDP limiter exists to
// stop — and TCP is the very escape hatch a rate-limited UDP client is sent to (TC=1 ->
// retry over TCP), so limiting it with the same bucket would slam that door shut. The
// real TCP risk is running out of sockets, so the bound is on CONCURRENCY, not on rate.
const MAX_TCP_CONN = Number(process.env.MAX_TCP_CONN || 512);
let tcpOpen = 0;

function makeTcpServer() {
  return net.createServer((sock) => {
    if (tcpOpen >= MAX_TCP_CONN) { sock.destroy(); return; } // at capacity: drop, do not queue
    tcpOpen++;
    sock.on('close', () => { tcpOpen--; });
    let buf = Buffer.alloc(0);
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const len = buf.readUInt16BE(0);
        if (buf.length < 2 + len) break;
        const msg = buf.subarray(2, 2 + len);
        buf = buf.subarray(2 + len);
        try {
          const res = handle(msg, sock.remoteAddress, sock.remoteFamily === 'IPv6', 'tcp');
          const framed = Buffer.alloc(2 + res.length);
          framed.writeUInt16BE(res.length, 0);
          res.copy(framed, 2);
          sock.write(framed);
        } catch (err) {
          if (DEBUG) console.error('tcp:', err.message);
          sock.end();
        }
      }
    });
    sock.on('error', () => {});
    sock.setTimeout(5000, () => sock.end());
  });
}

function listenTcp(address, required) {
  const srv = makeTcpServer();
  srv.on('error', (err) => {
    if (required) { console.error('tcp fatal:', err.message); process.exit(1); }
    console.error(`tcp6 unavailable (${err.message}) — continuing with IPv4 only`);
  });
  srv.listen({ port: PORT, host: address, ipv6Only: !required }, () => console.log(`TCP  ${address}:${PORT}`));
  return srv;
}
listenTcp(BIND, true);
if (BIND6) listenTcp(BIND6, false);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
