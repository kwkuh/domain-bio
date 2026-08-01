import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringkas } from '../monitor/stats.js';

const baris = (o) => JSON.stringify({ t: '2026-08-01T11:00:00Z', c: '8.8.8.0/24', q: 'A', r: 0, h: 'pass', x: 'udp', ...o });

// ---- classification: what decides whether the numbers can be trusted ----

test('only names that produce an address count as usage', () => {
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st' }),
    baris({ n: '5-6-7-8.a-i.sh' }),
    baris({ n: '0a000001.a-i.st' }),
    baris({ n: '2001-db8--1.a-i.st' }),
  ]);
  assert.equal(r.golongan.layanan, 4);
  assert.equal(r.golongan.infrastruktur, 0);
});

test('lookups of ns1/ns2 must NOT count as usage', () => {
  // Measured on the first day in production: 1,378 of 3,772 queries were only
  // resolvers looking up our nameserver addresses. Counting those makes "usage"
  // climb every time someone resolves the zone -- with nobody using the service.
  const r = ringkas([
    baris({ n: 'ns1.a-i.sh' }),
    baris({ n: 'ns2.a-i.st', q: 'AAAA' }),
    baris({ n: 'a-i.st', q: 'SOA' }),
    baris({ n: 'a-i.sh', q: 'NS' }),
    baris({ n: '1.2.3.4.a-i.st' }),
  ]);
  assert.equal(r.golongan.infrastruktur, 4);
  assert.equal(r.golongan.layanan, 1);
  assert.equal(r.tujuanUnik, 1, 'target addresses are counted from the service class only');
});

test('pemindai dan errors ketik masuk derau, bukan pemakaian', () => {
  const r = ringkas([
    baris({ n: 'login.a-i.st' }),
    baris({ n: 'fileshare.a-i.sh' }),
    baris({ n: 'foo.bar.a-i.st' }),
  ]);
  assert.equal(r.golongan.derau, 3);
  assert.equal(r.golongan.layanan, 0);
  assert.equal(r.tujuanUnik, 0);
});

test('names outside the zone are classified as refused', () => {
  const r = ringkas([baris({ n: 'google.com' }), baris({ n: 'example.org' })]);
  assert.equal(r.golongan.ditolak, 2);
  assert.equal(r.golongan.layanan, 0);
});

// ---- lalu lintas sendiri ----

test('our own traffic is discarded before counting', () => {
  // The monitor runs every 30 minutes with random addresses. Without this filter
  // the graph climbs forever with no real users -- a graph that goes up only
  // because we are looking at it.
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st', c: '5.78.141.0/24' }),
    baris({ n: '9.9.9.9.a-i.st', c: '5.78.141.0/24' }),
    baris({ n: '8.8.8.8.a-i.st', c: '1.1.1.0/24' }),
  ], { abaikanBlok: ['5.78.141.'] });
  assert.equal(r.diabaikan, 2);
  assert.equal(r.query, 1);
  assert.equal(r.tujuanUnik, 1, 'addresses from our own traffic must not be counted');
});

// ---- alamat tujuan unik: penanda pertumbuhan ----

test('the same address in different spellings counts ONCE', () => {
  // 1.2.3.4 and 1-2-3-4 and 01020304 name the same machine. Counting it three
  // times makes growth look three times larger than it is.
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st' }),
    baris({ n: '1-2-3-4.a-i.sh' }),
    baris({ n: '01020304.a-i.st' }),
    baris({ n: 'app.1.2.3.4.a-i.st' }),
  ]);
  assert.equal(r.golongan.layanan, 4);
  assert.equal(r.tujuanUnik, 1, 'four spellings, one machine');
});

test('different addresses count separately', () => {
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st' }),
    baris({ n: '5.6.7.8.a-i.st' }),
    baris({ n: '2001-db8--1.a-i.st', q: 'AAAA' }),
  ]);
  assert.equal(r.tujuanUnik, 3);
});

// ---- the output must never leak anything ----

test('the output is numbers only -- no names, no addresses, no blocks', () => {
  const r = ringkas([
    baris({ n: 'rahasia-banget.203.0.113.77.a-i.st', c: '198.51.100.0/24' }),
    baris({ n: 'ns1.a-i.sh', c: '2001:db8::/48' }),
  ]);
  const teks = JSON.stringify(r);
  assert.ok(!teks.includes('rahasia-banget'), 'the query name leaked into the summary');
  assert.ok(!teks.includes('203.0.113.77'), 'the target address leaked into the summary');
  assert.ok(!teks.includes('198.51.100'), 'the resolver block leaked into the summary');
  assert.ok(!teks.includes('2001:db8'), 'the v6 resolver block leaked into the summary');
  // Only the counts are allowed through.
  assert.equal(r.tujuanUnik, 1);
  assert.equal(r.blokResolver, 1);
});

test('broken lines are counted separately and do not drop the rest', () => {
  const r = ringkas(['{bukan json', baris({ n: '1.2.3.4.a-i.st' }), '', '{}']);
  assert.equal(r.query, 1);
  assert.equal(r.rusak, 2, 'broken lines and nameless lines both count as broken');
});
