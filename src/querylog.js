// querylog.js — the minimum record needed to act on an abuse report.
//
// 🚨 What gets logged is decided by THE QUESTION THAT HAS TO BE ANSWERED, not by
// whatever happens to be available.
//
// An abuse report reads: "bank.203.0.113.10.a-i.st was used for phishing." What we
// need to establish is that we served that name, since when, and how often. All of
// that lives in THE NAME. None of it requires knowing WHO asked.
//
// So the client address is truncated to a /24 (v4) and /48 (v6) by default. That is
// enough to tell "one source flooding" from "many people using", and not enough to
// follow anyone around. This server sits in Germany: under GDPR a full IP address is
// personal data, and keeping what we do not need adds obligation without adding
// capability.
//
// QUERYLOG_FULL=1 turns that truncation off. It is deliberately a separate switch that
// has to be thrown on purpose, not a side effect of enabling logging — and it is
// deliberately not used in production.
//
// Lines are written as plain JSON Lines so logrotate can truncate the file without
// having to tell this process anything.

import fs from 'node:fs';
import { expandV6 } from './parse.js';

/**
 * Reduce an address to a block: enough for patterns, not enough for tracking.
 *
 * 🚨 IPv6 MUST be expanded first, never sliced from its raw string. The spelling is
 * not unique: "2a01:4f8:0:1::1" and "2a01:4f8::1" can be the same /48, yet slicing the
 * first three parts of the raw text yields "2a01:4f8:0::/48" and "2a01:4f8:::/48" —
 * two labels for one network, plus a ":::" that is not even a valid address.
 *
 * That destroys the single thing this is for: separating "one source flooding" from
 * "many people using". An attacker would only have to change how they spell their
 * address to appear as several different networks.
 */
export function anonymise(ip, v6 = false) {
  if (!ip) return '?';
  if (v6) {
    if (!String(ip).includes(':')) return '?';
    const g = expandV6(ip);
    return `${g[0]}:${g[1]}:${g[2]}::/48`;
  }
  const o = String(ip).split('.');
  if (o.length !== 4 || o.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) return '?';
  return `${Number(o[0])}.${Number(o[1])}.${Number(o[2])}.0/24`;
}

/**
 * @param {object} opts
 * @param {string|null} opts.file  path to the log file; null/empty disables logging
 * @param {boolean} opts.full      true keeps full client addresses (do not use in production)
 */
export function openLog({ file = null, full = false, log = () => {} } = {}) {
  if (!file) {
    return { active: false, record() {}, close() {} };
  }

  let stream;
  try {
    stream = fs.createWriteStream(file, { flags: 'a' });
  } catch (err) {
    // A log that cannot be opened must NOT take the DNS service down with it.
    // Answering queries is the job; recording them is support.
    log(`querylog failed to open (${err.message}) — continuing without a log`);
    return { active: false, record() {}, close() {} };
  }
  stream.on('error', (err) => log(`querylog write error: ${err.message}`));
  log(`querylog active: ${file}${full ? ' (FULL ADDRESSES — not for production)' : ' (addresses truncated)'}`);

  return {
    active: true,
    /**
     * @param {object} e { ip, v6, name, qtype, rcode, outcome, transport }
     */
    record(e) {
      stream.write(JSON.stringify({
        t: new Date().toISOString(),
        c: full ? e.ip : anonymise(e.ip, e.v6),
        n: e.name,
        q: e.qtype,
        r: e.rcode,
        h: e.outcome,      // 'pass' | 'truncate' | 'drop' | 'blocked'
        x: e.transport,    // 'udp' | 'tcp'
      }) + '\n');
    },
    close() { try { stream.end(); } catch { /* already closed */ } },
  };
}
