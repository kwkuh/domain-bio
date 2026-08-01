// blocklist.js — addresses that must not be answered.
//
// Why this exists: a free wildcard-IP service WILL be used for phishing. Without a way
// to act on an abuse report, the "act within 72 hours" line in ABUSE.md is only a
// sentence, and a registrar can suspend the domain over it — that is an availability
// risk, not merely a reputational one.
//
// The principle that makes this impossible to walk around:
//   Decisions are made on the RESULTING ADDRESS, never on the name string.
// parse.js has already canonicalised every spelling, so 1.2.3.4 / 01.02.03.04 /
// 1-2-3-4 / 0a000001 / anything.1.2.3.4 all arrive here as "1.2.3.4". There is no
// detour available through creative typing.
//
// File format (one rule per line, "#" starts a comment):
//   ip     203.0.113.10          block one address
//   cidr   203.0.113.0/24        block one block
//   allow  203.0.113.5           exception — ALWAYS wins over a block
//
// Reload without a restart: send SIGHUP, or let the periodic mtime check notice.
// If the file is broken or missing at reload time, the PREVIOUS rules are kept —
// a failed load must never quietly unblock everything that was blocked.

import fs from 'node:fs';
import net from 'node:net';

/** IPv4 "1.2.3.4" -> 32-bit number */
const v4ToInt = (ip) => ip.split('.').reduce((n, o) => (n * 256) + (Number(o) & 255), 0);

/** IPv6 -> 128-bit BigInt (accepts the "::" form) */
function v6ToBig(ip) {
  const [head, tail] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined ? (tail ? tail.split(':') : []) : null;
  const groups = t === null ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 16n) | BigInt(parseInt(groups[i] || '0', 16) & 0xffff);
  return n;
}

/** Turn one line into a matcher. Returns null if the line is not understood. */
function makeMatcher(kind, value) {
  if (kind === 'ip') {
    if (net.isIPv4(value)) { const a = v4ToInt(value); return (ip, v6) => !v6 && v4ToInt(ip) === a; }
    if (net.isIPv6(value)) { const a = v6ToBig(value); return (ip, v6) => v6 && v6ToBig(ip) === a; }
    return null;
  }
  if (kind === 'cidr') {
    const [addr, bitsRaw] = value.split('/');
    const bits = Number(bitsRaw);
    if (!Number.isInteger(bits)) return null;
    if (net.isIPv4(addr) && bits >= 0 && bits <= 32) {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      const network = (v4ToInt(addr) & mask) >>> 0;
      return (ip, v6) => !v6 && ((v4ToInt(ip) & mask) >>> 0) === network;
    }
    if (net.isIPv6(addr) && bits >= 0 && bits <= 128) {
      const mask = bits === 0 ? 0n : (~0n << BigInt(128 - bits)) & ((1n << 128n) - 1n);
      const network = v6ToBig(addr) & mask;
      return (ip, v6) => v6 && (v6ToBig(ip) & mask) === network;
    }
    return null;
  }
  return null;
}

/** Read rule text into a snapshot that never changes once built. */
export function parseRules(text) {
  const blocks = [];
  const allows = [];
  const errors = [];
  const lines = String(text).split(/\r?\n/);

  lines.forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) return;
    const parts = line.split(/\s+/);
    const word = parts[0].toLowerCase();
    const value = parts[1];
    if (!value) { errors.push(`line ${i + 1}: "${line}" has no value`); return; }

    if (word === 'allow') {
      const m = makeMatcher(value.includes('/') ? 'cidr' : 'ip', value);
      if (m) allows.push(m); else errors.push(`line ${i + 1}: allow "${value}" not understood`);
      return;
    }
    if (word === 'ip' || word === 'cidr') {
      const m = makeMatcher(word, value);
      if (m) blocks.push(m); else errors.push(`line ${i + 1}: ${word} "${value}" not understood`);
      return;
    }
    errors.push(`line ${i + 1}: unknown rule type "${word}"`);
  });

  return {
    count: blocks.length,
    allowCount: allows.length,
    errors,
    /** @returns {boolean} true if this address must be refused */
    isBlocked(ip, v6 = false) {
      for (const m of allows) if (m(ip, v6)) return false; // exceptions win first
      for (const m of blocks) if (m(ip, v6)) return true;
      return false;
    },
  };
}

const EMPTY = parseRules('');

/**
 * A list that can be reloaded while running.
 * The snapshot is swapped whole (atomic from a reader's point of view) — there is
 * never a moment where the list is half-populated.
 */
export function openList({ file, checkIntervalMs = 15000, log = () => {} } = {}) {
  let current = EMPTY;
  let lastMtime = 0;
  let timer = null;

  function load(reason) {
    if (!file) return;
    try {
      const st = fs.statSync(file);
      if (st.mtimeMs === lastMtime) return;
      const next = parseRules(fs.readFileSync(file, 'utf8'));
      lastMtime = st.mtimeMs;
      current = next;
      log(`blocklist loaded (${reason}): ${next.count} blocks, ${next.allowCount} allows` +
          (next.errors.length ? `, ${next.errors.length} lines ignored` : ''));
      for (const e of next.errors) log(`  blocklist ${e}`);
    } catch (err) {
      // Deliberately NOT emptying the list: a missing or broken file is far more
      // likely to be a typo than an instruction to unblock everything.
      log(`blocklist FAILED to load (${reason}): ${err.message} — keeping previous rules (${current.count})`);
    }
  }

  load('startup');
  if (file && checkIntervalMs > 0) {
    timer = setInterval(() => load('file changed'), checkIntervalMs);
    timer.unref?.();
  }
  process.on('SIGHUP', () => { lastMtime = 0; load('SIGHUP'); });

  return {
    isBlocked: (ip, v6) => current.isBlocked(ip, v6),
    get count() { return current.count; },
    reload: () => { lastMtime = 0; load('manual'); },
    close: () => timer && clearInterval(timer),
  };
}
