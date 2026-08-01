import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery } from '../src/wire.js';
import { anonymise } from '../src/querylog.js';
import { prefixKey } from '../src/ratelimit.js';

const HEADER = (qd = 1, ar = 0) => Buffer.from([0, 1, 0x01, 0x00, 0, qd, 0, 0, 0, 0, 0, ar]);

/** Run something and assert it did not take an absurd amount of time. */
function fast(what, fn, budgetMs = 250) {
  const t0 = process.hrtime.bigint();
  try { fn(); } catch { /* throwing is fine; what is under test is the COST */ }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < budgetMs, `${what} took ${ms.toFixed(0)} ms -- should be under ${budgetMs} ms`);
}

// ---- malformed packets must never be expensive ----

test('a 12-byte packet must not consume CPU and memory', () => {
  // This was real: the header claims "one question" and then the packet ends.
  // buf[off] becomes undefined, `undefined & 0xc0` is 0 so it is not treated as a
  // pointer, `off += 1 + undefined` becomes NaN, and buf[NaN] is undefined again --
  // the loop never exits while piling up empty strings.
  // Measured before the fix: 3 seconds of CPU and 1.4 GB of memory, from 12 bytes.
  // Node is single-threaded, so 0.3 packets/second was enough to kill the service.
  fast('12-byte packet', () => parseQuery(HEADER()));
  assert.throws(() => parseQuery(HEADER()), /truncated/);
});

test('a name that ends mid-label is rejected immediately', () => {
  const buf = Buffer.concat([HEADER(), Buffer.from([5, 97, 98])]); // promises 5 octets, has 2
  fast('truncated name', () => parseQuery(buf));
  assert.throws(() => parseQuery(buf), /runs past end/);
});

test('a label longer than 63 octets is rejected (RFC 1035 section 2.3.4)', () => {
  const buf = Buffer.concat([HEADER(), Buffer.from([64]), Buffer.alloc(64, 97), Buffer.from([0, 0, 1, 0, 1])]);
  assert.throws(() => parseQuery(buf), /63 octets/);
});

test('a name longer than 255 octets is rejected rather than allowed to grow', () => {
  const many = Array(300).fill(Buffer.from([1, 97]));
  const buf = Buffer.concat([HEADER(), ...many, Buffer.from([0, 0, 1, 0, 1])]);
  fast('300-label name', () => parseQuery(buf));
  assert.throws(() => parseQuery(buf), /255 octets/);
});

test('a question with no qtype/qclass is rejected, not read past the end', () => {
  const buf = Buffer.concat([HEADER(), Buffer.from([1, 97, 0])]); // name ends, qtype missing
  assert.throws(() => parseQuery(buf), /qtype/);
});

test('a lying arcount does not send the OPT walk out of control', () => {
  const buf = Buffer.concat([HEADER(1, 0xffff), Buffer.from([1, 97, 0, 0, 1, 0, 1])]);
  fast('arcount 65535', () => parseQuery(buf));
  const q = parseQuery(buf);
  assert.equal(q.name, 'a');
  assert.equal(q.edns, null, 'there is no real OPT, so this must be null');
});

test('random garbage never hangs', () => {
  for (const n of [1, 2, 11, 13, 64, 512, 1500]) {
    fast(`${n} bytes of garbage`, () => parseQuery(Buffer.alloc(n, 0xff)));
  }
});

test('valid packets still work after all this tightening', () => {
  const name = '203.0.113.10.a-i.st';
  const labels = name.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  const q = parseQuery(Buffer.concat([HEADER(), ...labels, Buffer.from([0]), Buffer.from([0, 1, 0, 1])]));
  assert.equal(q.name, name);
  assert.equal(q.qtype, 1);
});

// ---- address anonymisation must group, not split ----

test('IPv6 spelled differently but in the same /48 -> one label', () => {
  // "2a01:4f8:0:1::1" and "2a01:4f8::1" are in the same /48. Slicing the first three
  // parts of the raw string produces "2a01:4f8:0::/48" and "2a01:4f8:::/48" -- two
  // labels for one network, plus a ":::" that is not even a valid address. That
  // destroys the single purpose of anonymisation: telling "one source flooding" apart
  // from "many people using".
  for (const [a, b] of [
    ['2a01:4f8:0:1::1', '2a01:4f8::1'],
    ['2001:db8:0:0::5', '2001:db8::5'],
    ['2606:4700:0:1::a', '2606:4700::a'],
  ]) {
    assert.equal(anonymise(a, true), anonymise(b, true), `${a} and ${b} must share one label`);
  }
});

test('an anonymised label never contains ":::"', () => {
  for (const ip of ['2a01:4f8::1', '::1', '2001:db8::', 'fe80::1']) {
    assert.ok(!anonymise(ip, true).includes(':::'), `${ip} -> ${anonymise(ip, true)}`);
  }
});

test('genuinely different /48s stay apart', () => {
  assert.notEqual(anonymise('2a01:4f8:1::1', true), anonymise('2a01:4f8:2::1', true));
});

test('anonymisation agrees with the rate limiter grouping', () => {
  // Both modules answer the same question ("which block is this") and must not
  // disagree -- if they do, the log and the limiter name different networks for the
  // same packet.
  for (const [a, b] of [['2a01:4f8:0:1::1', '2a01:4f8::1'], ['2001:db8::5', '2001:db8:0:0::5']]) {
    const sameInLog = anonymise(a, true) === anonymise(b, true);
    const sameInLimiter = prefixKey(a, true) === prefixKey(b, true);
    assert.equal(sameInLog, sameInLimiter, `${a} vs ${b}: log says ${sameInLog}, limiter says ${sameInLimiter}`);
  }
});

test('IPv4 is canonicalised, and nonsense input does not produce a fake label', () => {
  assert.equal(anonymise('203.0.113.77'), '203.0.113.0/24');
  assert.equal(anonymise('010.001.113.77'), '10.1.113.0/24', 'leading zeros are canonicalised');
  for (const bad of ['', 'not-an-address', '1.2.3', '1.2.3.999', '1.2.3.4.5']) {
    assert.equal(anonymise(bad), '?', `"${bad}" must become "?"`);
  }
});
