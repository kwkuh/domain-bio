import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarise } from '../monitor/stats.js';

const line = (o) => JSON.stringify({ t: '2026-08-01T11:00:00Z', c: '8.8.8.0/24', q: 'A', r: 0, h: 'pass', x: 'udp', ...o });

// ---- classification: what decides whether the numbers can be trusted ----

test('only names that produce an address count as usage', () => {
  const r = summarise([
    line({ n: '1.2.3.4.a-i.st' }),
    line({ n: '5-6-7-8.a-i.sh' }),
    line({ n: '0a000001.a-i.st' }),
    line({ n: '2001-db8--1.a-i.st' }),
  ]);
  assert.equal(r.classes.service, 4);
  assert.equal(r.classes.infrastructure, 0);
});

test('lookups of ns1/ns2 must NOT count as usage', () => {
  // Measured on the first day in production: 1,378 of 3,772 queries were only
  // resolvers looking up our nameserver addresses. Counting those makes "usage"
  // climb every time someone resolves the zone -- with nobody using the service.
  const r = summarise([
    line({ n: 'ns1.a-i.sh' }),
    line({ n: 'ns2.a-i.st', q: 'AAAA' }),
    line({ n: 'a-i.st', q: 'SOA' }),
    line({ n: 'a-i.sh', q: 'NS' }),
    line({ n: '1.2.3.4.a-i.st' }),
  ]);
  assert.equal(r.classes.infrastructure, 4);
  assert.equal(r.classes.service, 1);
  assert.equal(r.distinctTargets, 1, 'target addresses are counted from the service class only');
});

test('scanners and typos are noise, not usage', () => {
  const r = summarise([
    line({ n: 'login.a-i.st' }),
    line({ n: 'fileshare.a-i.sh' }),
    line({ n: 'foo.bar.a-i.st' }),
  ]);
  assert.equal(r.classes.noise, 3);
  assert.equal(r.classes.service, 0);
  assert.equal(r.distinctTargets, 0);
});

test('names outside the zone are classified as refused', () => {
  const r = summarise([line({ n: 'google.com' }), line({ n: 'example.org' })]);
  assert.equal(r.classes.refused, 2);
  assert.equal(r.classes.service, 0);
});

// ---- our own traffic ----

test('our own traffic is discarded before counting', () => {
  // The monitor runs every 30 minutes with random addresses. Without this filter
  // the graph climbs forever with no real users -- a graph that goes up only
  // because we are looking at it.
  const r = summarise([
    line({ n: '1.2.3.4.a-i.st', c: '5.78.141.0/24' }),
    line({ n: '9.9.9.9.a-i.st', c: '5.78.141.0/24' }),
    line({ n: '8.8.8.8.a-i.st', c: '1.1.1.0/24' }),
  ], { ignoreBlocks: ['5.78.141.'] });
  assert.equal(r.ignored, 2);
  assert.equal(r.queries, 1);
  assert.equal(r.distinctTargets, 1, 'addresses from our own traffic must not be counted');
});

// ---- distinct target addresses: the growth signal ----

test('the same address in different spellings counts ONCE', () => {
  // 1.2.3.4 and 1-2-3-4 and 01020304 name the same machine. Counting it three
  // times makes growth look three times larger than it is.
  const r = summarise([
    line({ n: '1.2.3.4.a-i.st' }),
    line({ n: '1-2-3-4.a-i.sh' }),
    line({ n: '01020304.a-i.st' }),
    line({ n: 'app.1.2.3.4.a-i.st' }),
  ]);
  assert.equal(r.classes.service, 4);
  assert.equal(r.distinctTargets, 1, 'four spellings, one machine');
});

test('different addresses count separately', () => {
  const r = summarise([
    line({ n: '1.2.3.4.a-i.st' }),
    line({ n: '5.6.7.8.a-i.st' }),
    line({ n: '2001-db8--1.a-i.st', q: 'AAAA' }),
  ]);
  assert.equal(r.distinctTargets, 3);
});

// ---- the output must never leak anything ----

test('the output is numbers only -- no names, no addresses, no blocks', () => {
  const r = summarise([
    line({ n: 'very-secret.203.0.113.77.a-i.st', c: '198.51.100.0/24' }),
    line({ n: 'ns1.a-i.sh', c: '2001:db8::/48' }),
  ]);
  const text = JSON.stringify(r);
  assert.ok(!text.includes('very-secret'), 'the query name leaked into the summary');
  assert.ok(!text.includes('203.0.113.77'), 'the target address leaked into the summary');
  assert.ok(!text.includes('198.51.100'), 'the resolver block leaked into the summary');
  assert.ok(!text.includes('2001:db8'), 'the v6 resolver block leaked into the summary');
  // Only the counts are allowed through.
  assert.equal(r.distinctTargets, 1);
  assert.equal(r.resolverBlocks, 1);
});

test('broken lines are counted separately and do not drop the rest', () => {
  const r = summarise(['{not json', line({ n: '1.2.3.4.a-i.st' }), '', '{}']);
  assert.equal(r.queries, 1);
  assert.equal(r.malformed, 2, 'broken lines and nameless lines both count as broken');
});
