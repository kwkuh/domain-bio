import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLimiter, prefixKey } from '../src/ratelimit.js';
import { parseQuery, buildTruncated } from '../src/wire.js';

/** Fake clock: RRL is about time, and a test that depends on the real clock is a flaky test. */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

// ---- address grouping ----

test('addresses in the same /24 count as one block', () => {
  const a = prefixKey('203.0.113.5');
  assert.equal(prefixKey('203.0.113.200'), a, 'neighbours in a /24 must share a key');
  assert.notEqual(prefixKey('203.0.114.5'), a, 'the next /24 must get a different key');
});

test('IPv6 is grouped per /56', () => {
  const a = prefixKey('2a01:4f8:c015:8800::1', true);
  assert.equal(prefixKey('2a01:4f8:c015:8800:ffff::9', true), a);
  assert.notEqual(prefixKey('2a01:4f8:c015:8900::1', true), a, 'the next /56 must differ');
});

test('v4 and v6 keys never collide', () => {
  assert.notEqual(prefixKey('1.2.3.4', false), prefixKey('::102:304', true));
});

// ---- token bucket behaviour ----

test('traffic under the limit all passes', () => {
  const c = clock();
  const l = makeLimiter({ perSecond: 10, burst: 10, now: c.now });
  for (let i = 0; i < 10; i++) assert.equal(l.decide('203.0.113.1'), 'pass', `query ${i + 1}`);
});

test('over the limit -> dropped, with slip letting a truncated reply through', () => {
  const c = clock();
  const l = makeLimiter({ perSecond: 10, burst: 10, slip: 5, now: c.now });
  for (let i = 0; i < 10; i++) l.decide('203.0.113.1'); // spend the allowance

  const verdicts = [];
  for (let i = 0; i < 10; i++) verdicts.push(l.decide('203.0.113.1'));
  assert.deepEqual(verdicts, [
    'drop', 'drop', 'drop', 'drop', 'truncate',
    'drop', 'drop', 'drop', 'drop', 'truncate',
  ], 'every 5th excess reply must be truncated, the rest silent');
});

test('the allowance refills over time', () => {
  const c = clock();
  const l = makeLimiter({ perSecond: 10, burst: 10, now: c.now });
  for (let i = 0; i < 10; i++) l.decide('203.0.113.1');
  assert.equal(l.decide('203.0.113.1'), 'drop', 'allowance spent');
  c.advance(500); // 0.5s at 10/s = 5 tokens
  for (let i = 0; i < 5; i++) assert.equal(l.decide('203.0.113.1'), 'pass', `refill ${i + 1}`);
  assert.equal(l.decide('203.0.113.1'), 'drop', 'no more than what refilled');
});

test('idle time does not accumulate beyond the burst capacity', () => {
  const c = clock();
  const l = makeLimiter({ perSecond: 10, burst: 10, now: c.now });
  c.advance(60_000); // idle for a minute
  let passed = 0;
  for (let i = 0; i < 100; i++) if (l.decide('203.0.113.1') === 'pass') passed++;
  assert.equal(passed, 10, 'a long idle period must not bank 600 tokens');
});

test('one flooded block does NOT take other blocks down with it', () => {
  const c = clock();
  const l = makeLimiter({ perSecond: 5, burst: 5, now: c.now });
  for (let i = 0; i < 50; i++) l.decide('203.0.113.9'); // block A floods
  assert.equal(l.decide('198.51.100.9'), 'pass', 'block B must still be served');
});

test('perSecond=0 disables the limiter entirely', () => {
  const l = makeLimiter({ perSecond: 0 });
  assert.equal(l.active, false);
  for (let i = 0; i < 1000; i++) assert.equal(l.decide('203.0.113.1'), 'pass');
});

// ---- the limiter must not become a weapon itself ----

test('bucket count stays bounded even with randomised source addresses', () => {
  const c = clock();
  const l = makeLimiter({ perSecond: 10, maxEntries: 500, now: c.now });
  // 20,000 unique source BLOCKS -- exactly the shape of a spoofed-source attack.
  // The last octet is deliberately fixed: the /24 mask discards it, so varying only
  // that would put everything in one bucket and this test would prove nothing.
  // (The first version of this test made precisely that mistake.)
  for (let i = 0; i < 20000; i++) {
    l.decide(`10.${(i >> 8) & 255}.${i & 255}.1`);
  }
  assert.ok(l.stats.entries <= 500,
    `entries grew to ${l.stats.entries} -- the rate limiter became a memory leak`);
  assert.ok(l.stats.evicted > 0, 'some entries should have been evicted');
});

test('buckets that have been idle a long time are swept away', () => {
  const c = clock();
  const l = makeLimiter({ perSecond: 10, entryTtlMs: 1000, maxEntries: 10, now: c.now });
  for (let i = 0; i < 5; i++) l.decide(`203.0.${i}.113`); // genuinely different /24s
  assert.equal(l.stats.entries, 5);
  c.advance(5000);
  l.sweepNow();
  assert.equal(l.stats.entries, 0, 'idle buckets must disappear, not pile up forever');
});

// ---- shape of the truncated reply ----

test('truncated reply: TC=1, zero answers, and SMALLER than the query', () => {
  const name = 'a-deliberately-long-prefix.203.0.113.10.a-i.st';
  const labels = name.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  const query = Buffer.concat([
    Buffer.from([0xab, 0xcd, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]),
    ...labels, Buffer.from([0]), Buffer.from([0, 1, 0, 1]),
  ]);
  const r = buildTruncated(parseQuery(query));

  assert.equal(r.readUInt16BE(0), 0xabcd, 'the id must match or the client ignores the reply');
  assert.ok((r.readUInt16BE(2) & 0x8000) !== 0, 'QR must be set');
  assert.ok((r.readUInt16BE(2) & 0x0200) !== 0, 'TC must be set -- this is the entire point');
  assert.equal(r.readUInt16BE(2) & 0x000f, 0, 'rcode NOERROR, not SERVFAIL');
  assert.equal(r.readUInt16BE(4), 1, 'the question is still echoed');
  assert.equal(r.readUInt16BE(6), 0, 'zero answers');
  assert.ok(r.length <= query.length,
    `truncated (${r.length}B) must not exceed the query (${query.length}B) -- that would amplify`);
});
