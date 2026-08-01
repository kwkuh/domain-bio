// ratelimit.js — Response Rate Limiting (RRL) for an authoritative DNS server.
//
// What this is for, and what it is NOT for:
//
// It is not "stop the server getting overwhelmed". This server answers UDP with no
// handshake, so the source address can be forged. An attacker sends queries with the
// VICTIM's address as the source, and our replies land on the victim. We become
// someone else's weapon, and the address in the victim's logs is ours. RFC 8482 already
// pushed ANY amplification down to 1.88x, but 1.88x times thousands of packets is still
// an attack — one our bandwidth pays for.
//
// So the limit is counted per ADDRESS BLOCK, not per address: a spoofing attack
// randomises the source, so a per-IP limiter never sees a repeat and never fires.
// /24 (v4) and /56 (v6) follow BIND's RRL practice.
//
// 🚨 SLIP — the part that separates RRL from "just drop it".
// Dropping silently also kills legitimate users who happen to share a block with an
// attacker (one office, one large resolver). So every Nth reply over the limit is not
// dropped but answered TRUNCATED (TC=1, no answers). A well-behaved client reads TC=1
// and retries over TCP — and TCP cannot be spoofed, so they still get served. An
// attacker forging their source never receives that packet and cannot follow up.
//
// Only applies to UDP. TCP has already proved its address through the handshake.

import { expandV6 } from './parse.js';

/** Reduce an address to the block key it belongs to. */
export function prefixKey(ip, v6 = false, bitsV4 = 24, bitsV6 = 56) {
  if (!v6) {
    const o = ip.split('.');
    if (o.length !== 4) return ip; // odd shape: use as-is rather than letting it through
    const n = ((Number(o[0]) << 24) | (Number(o[1]) << 16) | (Number(o[2]) << 8) | Number(o[3])) >>> 0;
    const mask = bitsV4 === 0 ? 0 : (~0 << (32 - bitsV4)) >>> 0;
    return String((n & mask) >>> 0);
  }
  // IPv6: take the first `bitsV6` bits. A nibble is 4 bits, so slicing the expanded
  // form is enough — and it must be the EXPANDED form, since "::" makes the raw
  // string an unreliable thing to slice.
  const nibbles = Math.ceil(bitsV6 / 4);
  return 'v6:' + expandV6(ip).join('').slice(0, nibbles);
}

/**
 * @param {object} opts
 * @param {number} opts.perSecond   replies per second per address block (0 disables the limiter)
 * @param {number} opts.burst       idle allowance that may accumulate (token bucket)
 * @param {number} opts.slip        every Nth reply over the limit is answered TC=1; 0 means never
 * @param {number} opts.maxEntries  hard cap on bucket count — the limiter must not become a leak
 * @param {number} opts.entryTtlMs  buckets idle for this long are discarded
 */
export function makeLimiter({
  perSecond = 0,
  burst = null,
  slip = 5,
  bitsV4 = 24,
  bitsV6 = 56,
  maxEntries = 50000,
  entryTtlMs = 60000,
  now = () => Date.now(),
} = {}) {
  const capacity = burst ?? Math.max(perSecond * 2, perSecond);
  const buckets = new Map();
  let dropped = 0;
  let truncated = 0;
  let evicted = 0;

  /**
   * 🚨 The bucket map is itself an attack surface. Forged source addresses are random,
   * so every packet can create a new entry. Without a hard cap, a rate limiter turns
   * into an externally triggered memory leak — a cure worse than the disease.
   */
  function sweep(t) {
    for (const [k, e] of buckets) if (t - e.lastSeen > entryTtlMs) buckets.delete(k);
    if (buckets.size < maxEntries) return;
    // Still full: evict the least recently created. JS Maps preserve insertion order,
    // and entries that stay busy keep their original position — so this is not a true
    // LRU, but it is enough: whatever gets evicted is certainly an old entry.
    const toDrop = Math.max(1, Math.floor(buckets.size * 0.2));
    let n = 0;
    for (const k of buckets.keys()) { buckets.delete(k); if (++n >= toDrop) break; }
    evicted += n;
  }

  return {
    /**
     * @returns {'pass'|'drop'|'truncate'}
     *   pass     = answer normally
     *   drop     = send nothing at all (this is the whole point of anti-reflection)
     *   truncate = reply TC=1 with no answers, so legitimate clients move to TCP
     */
    decide(ip, v6 = false) {
      if (perSecond <= 0) return 'pass'; // limiter disabled
      const t = now();
      const k = prefixKey(ip, v6, bitsV4, bitsV6);
      let e = buckets.get(k);
      if (!e) {
        if (buckets.size >= maxEntries) sweep(t);
        e = { tokens: capacity, lastSeen: t, over: 0 };
        buckets.set(k, e);
      }
      // Refill in proportion to elapsed time.
      const refill = ((t - e.lastSeen) / 1000) * perSecond;
      if (refill > 0) e.tokens = Math.min(capacity, e.tokens + refill);
      e.lastSeen = t;

      if (e.tokens >= 1) { e.tokens -= 1; e.over = 0; return 'pass'; }

      e.over += 1;
      if (slip > 0 && e.over % slip === 0) { truncated += 1; return 'truncate'; }
      dropped += 1;
      return 'drop';
    },
    sweepNow: () => sweep(now()),
    get stats() { return { entries: buckets.size, dropped, truncated, evicted }; },
    get active() { return perSecond > 0; },
  };
}
