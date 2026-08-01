// wire.js — just enough of the DNS packet format (RFC 1035) to do the job.
// Enough for a simple authoritative server: parse the question, build the answer.

// ---- Record types ----
export const TYPE = { A: 1, NS: 2, SOA: 6, HINFO: 13, TXT: 16, AAAA: 28, OPT: 41, ANY: 255 };
export const CLASS_IN = 1;

// ---- Header flags ----
const QR = 0x8000; // this is a response
const AA = 0x0400; // authoritative answer
const RD = 0x0100; // recursion desired (copied from the query)
const TC = 0x0200; // truncated — "this did not fit, retry over TCP"
export const RCODE = { OK: 0, FORMERR: 1, NXDOMAIN: 3, REFUSED: 5 };

/** Encode a domain name into labels ("ns1.a-i.sh" -> \x03ns1\x04a-i\x02sh\x00). */
export function encodeName(name) {
  const parts = name ? name.split('.') : [];
  const bufs = [];
  for (const p of parts) {
    const b = Buffer.from(p, 'ascii');
    if (b.length > 63) throw new Error('label too long');
    bufs.push(Buffer.from([b.length]), b);
  }
  bufs.push(Buffer.from([0]));
  return Buffer.concat(bufs);
}

// Compression pointer to offset 12 (where QNAME starts) — standard, saves bytes.
const NAME_PTR = Buffer.from([0xc0, 0x0c]);

/** Build one resource record. nameBuf is NAME_PTR or the result of encodeName(). */
function record(nameBuf, type, ttl, rdata) {
  const mid = Buffer.alloc(8);
  mid.writeUInt16BE(type, 0);
  mid.writeUInt16BE(CLASS_IN, 2);
  mid.writeUInt32BE(ttl, 4);
  const rdlen = Buffer.alloc(2);
  rdlen.writeUInt16BE(rdata.length, 0);
  return Buffer.concat([nameBuf, mid, rdlen, rdata]);
}

export const answerRecord = (type, ttl, rdata) => record(NAME_PTR, type, ttl, rdata);
export const namedRecord = (name, type, ttl, rdata) => record(encodeName(name), type, ttl, rdata);

/** RDATA for SOA. */
export function soaRdata(zone, cfg) {
  const mname = encodeName(cfg.ns[0]);
  const rname = encodeName(`hostmaster.${zone}`);
  const nums = Buffer.alloc(20);
  nums.writeUInt32BE(cfg.serial >>> 0, 0);
  nums.writeUInt32BE(cfg.refresh, 4);
  nums.writeUInt32BE(cfg.retry, 8);
  nums.writeUInt32BE(cfg.expire, 12);
  nums.writeUInt32BE(cfg.minttl, 16);
  return Buffer.concat([mname, rname, nums]);
}

/**
 * HINFO rdata: two character-strings. Used to answer ANY per RFC 8482 — the smallest
 * possible reply, so an ANY query cannot be used to amplify an attack.
 */
export function hinfoRdata(cpu = 'RFC8482', os = '') {
  const s1 = Buffer.from(cpu, 'ascii');
  const s2 = Buffer.from(os, 'ascii');
  return Buffer.concat([Buffer.from([s1.length]), s1, Buffer.from([s2.length]), s2]);
}

/**
 * Find the OPT pseudo-record (EDNS0, RFC 6891) in the additional section.
 *
 * OPT is not an ordinary record: its NAME must be the root (a single 0x00), its CLASS
 * is reused as the UDP payload size the client can accept, and the first TTL byte is
 * the extended rcode. We only need two things from it: payload size and version.
 *
 * Records are walked one at a time rather than guessing an offset — a valid packet is
 * allowed to put anything before the OPT.
 *
 * @returns {{present:boolean, payload:number, version:number, do:boolean}|null}
 */
function findOpt(buf, off, arcount) {
  for (let i = 0; i < arcount; i++) {
    if (off >= buf.length) return null;
    // Skip the NAME. Bounds are checked at every step for the same reason as in
    // parseQuery: a packet that ends mid-name must not send this walk out of control.
    if (buf[off] === 0) {
      off += 1;
    } else {
      let steps = 0;
      while (off < buf.length) {
        if (++steps > 128) return null; // no valid name is this long
        const len = buf[off];
        if (len === 0) { off += 1; break; }
        if ((len & 0xc0) === 0xc0) { off += 2; break; }
        if (len > 63) return null;
        off += 1 + len;
      }
    }
    if (!Number.isFinite(off) || off + 10 > buf.length) return null;
    const type = buf.readUInt16BE(off);
    const klass = buf.readUInt16BE(off + 2);
    const ttl = buf.readUInt32BE(off + 4);
    const rdlen = buf.readUInt16BE(off + 8);
    if (type === TYPE.OPT) {
      return {
        present: true,
        // Floor of 512: a client advertising less than the minimum DNS packet size is
        // almost always misconfigured, and honouring the number would truncate every
        // answer for no reason.
        payload: Math.max(512, klass),
        version: (ttl >> 16) & 0xff,
        do: ((ttl >> 15) & 1) === 1,
      };
    }
    off += 10 + rdlen;
  }
  return null;
}

/** Build the OPT record for a reply. We support no options, so RDATA is empty. */
export function optRecord(payload = 1232, extRcode = 0, version = 0) {
  const b = Buffer.alloc(11);
  b.writeUInt8(0, 0);                 // NAME = root
  b.writeUInt16BE(TYPE.OPT, 1);
  b.writeUInt16BE(payload, 3);        // CLASS reused: our payload size
  b.writeUInt8(extRcode, 5);          // extended rcode
  b.writeUInt8(version, 6);           // EDNS version
  b.writeUInt16BE(0, 7);              // flags — DO stays off: no DNSSEC yet
  b.writeUInt16BE(0, 9);              // RDLENGTH = 0
  return b;
}

/** Parse a query: id, flags, the first question name, qtype, and the raw question bytes. */
export function parseQuery(buf) {
  if (buf.length < 12) throw new Error('packet too short');
  const id = buf.readUInt16BE(0);
  const flags = buf.readUInt16BE(2);
  const qdcount = buf.readUInt16BE(4);
  const arcount = buf.readUInt16BE(10);
  if (qdcount < 1) throw new Error('no question');

  // 🚨 Every read MUST check its bounds first.
  //
  // An earlier version did not, and that made it possible to kill the server remotely
  // with 12 bytes. A packet claiming "one question" that then ends leaves buf[off]
  // undefined; `undefined & 0xc0` is 0 so it is not treated as a pointer,
  // `off += 1 + undefined` becomes NaN, and buf[NaN] is undefined again — the loop
  // never exits while pushing empty strings into an array forever.
  //
  // Measured: 12 bytes in -> 3 seconds of CPU and 1.4 GB of memory before it finally
  // threw. Node is single-threaded, so 0.3 packets per second was enough to take the
  // service down, and a UDP source address can be forged, so a per-block rate limiter
  // does not help.
  let off = 12;
  const labels = [];
  let nameLength = 0;
  while (true) {
    if (off >= buf.length) throw new Error('name truncated');
    const len = buf[off];
    if (len === 0) { off += 1; break; }
    if ((len & 0xc0) === 0xc0) { // compression pointer — not valid in a question
      if (off + 2 > buf.length) throw new Error('pointer truncated');
      off += 2;
      break;
    }
    if (len > 63) throw new Error('label longer than 63 octets');  // RFC 1035 §2.3.4
    nameLength += len + 1;
    if (nameLength > 255) throw new Error('name longer than 255 octets'); // RFC 1035 §2.3.4
    if (off + 1 + len > buf.length) throw new Error('label runs past end of packet');
    labels.push(buf.toString('ascii', off + 1, off + 1 + len));
    off += 1 + len;
  }
  if (off + 4 > buf.length) throw new Error('question has no qtype/qclass');
  const qtype = buf.readUInt16BE(off);
  off += 4; // skip qtype + qclass
  const questionSection = buf.subarray(12, off);

  // What follows the question is answer + authority + additional. We only care about
  // additional, but qdcount>1 is unsupported and ancount/nscount are always 0 in a
  // valid query — so walking from here is safe.
  const edns = findOpt(buf, off, arcount);
  return { id, flags, name: labels.join('.'), qtype, questionSection, edns };
}

/**
 * A TRUNCATED reply with no content: it copies the question back and sets TC=1.
 *
 * Used by the rate limiter as the escape hatch for legitimate clients. A correct client
 * reads TC=1 and retries over TCP; an attacker forging their source address never
 * receives this packet and cannot follow up. It is also smaller than the query itself,
 * so it cannot be used to amplify anything.
 */
export function buildTruncated({ id, flags, questionSection, edns }) {
  // Keep the OPT if the query had one: a client that sends EDNS and gets a reply
  // without OPT may conclude the server does not understand EDNS and stop using it —
  // when in fact this was only a momentary rate limit.
  const additional = edns && edns.present ? [optRecord(OUR_PAYLOAD)] : [];
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(QR | AA | TC | (flags & RD) | RCODE.OK, 2);
  header.writeUInt16BE(1, 4); // qdcount
  header.writeUInt16BE(0, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(additional.length, 10);
  return Buffer.concat([header, questionSection, ...additional]);
}

// The UDP payload size we advertise. 1232 is the DNS Flag Day 2020 recommendation:
// it fits inside a 1280-byte MTU (the IPv6 minimum) without IP fragmentation. DNS
// fragments are easy to lose and easy to spoof, so it is better to push a client to
// TCP than to send a packet that will be broken up.
export const OUR_PAYLOAD = 1232;

/**
 * Build a complete response buffer.
 *
 * If the query carried an OPT, the reply MUST carry one too (RFC 6891 §6.1.1). Common
 * resolvers still forgive its absence, but it is a prerequisite for DNSSEC, and some
 * resolvers mark a server without OPT as "does not support EDNS" and stop trying
 * anything that needs it.
 *
 * An EDNS version we do not know is answered with BADVERS (extended rcode 16) and an
 * OPT of version 0 — not ignored, because ignoring it makes the client think the packet
 * was lost and retry forever.
 */
export function buildResponse({ id, flags, questionSection, edns }, { rcode = RCODE.OK, answers = [], authority = [] }) {
  const useOpt = !!(edns && edns.present);
  const badVersion = useOpt && edns.version > 0;

  const body = badVersion ? [] : answers;
  const auth = badVersion ? [] : authority;
  const additional = useOpt
    ? [optRecord(OUR_PAYLOAD, badVersion ? 1 : 0, 0)] // extRcode high byte 1 => BADVERS (16)
    : [];

  const header = Buffer.alloc(12);
  const rd = flags & RD;
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(QR | AA | rd | (badVersion ? 0 : rcode), 2);
  header.writeUInt16BE(1, 4); // qdcount
  header.writeUInt16BE(body.length, 6);
  header.writeUInt16BE(auth.length, 8);
  header.writeUInt16BE(additional.length, 10);
  return Buffer.concat([header, questionSection, ...body, ...auth, ...additional]);
}
