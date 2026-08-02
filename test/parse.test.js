import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseName, matchZone, ipv4ToBytes, ipv6ToBytes } from '../src/parse.js';

const Z = 'a-i.sh';
const ZS = ['a-i.sh', 'a-i.st']; // Open-Domain serves two suffixes from one process

test('IPv4 dotted', () => {
  assert.deepEqual(parseName('1.2.3.4.a-i.sh', Z), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.sh' });
});

test('dotted IPv4 with an arbitrary prefix', () => {
  assert.deepEqual(parseName('app.10.0.0.1.a-i.sh', Z), { kind: 'A', ip: '10.0.0.1', zone: 'a-i.sh' });
});

test('IPv4 dashed', () => {
  assert.deepEqual(parseName('192-168-1-1.a-i.sh', Z), { kind: 'A', ip: '192.168.1.1', zone: 'a-i.sh' });
});

test('IPv4 hex', () => {
  assert.deepEqual(parseName('0a000001.a-i.sh', Z), { kind: 'A', ip: '10.0.0.1', zone: 'a-i.sh' });
});

test('IPv6 dashed', () => {
  assert.deepEqual(parseName('2001-db8--1.a-i.sh', Z), { kind: 'AAAA', ip: '2001:db8::1', zone: 'a-i.sh' });
});

test('apex', () => {
  assert.deepEqual(parseName('a-i.sh', Z), { kind: 'apex', zone: 'a-i.sh' });
});

test('inside the zone but not an IP -> nxdomain', () => {
  assert.deepEqual(parseName('foo.bar.a-i.sh', Z), { kind: 'nxdomain', zone: 'a-i.sh' });
});

test('outside the zone -> refused', () => {
  assert.deepEqual(parseName('google.com', Z), { kind: 'refused' });
});

test('an octet above 255 is rejected (falls through to nxdomain)', () => {
  assert.deepEqual(parseName('1.2.3.999.a-i.sh', Z), { kind: 'nxdomain', zone: 'a-i.sh' });
});

test('a trailing dot and upper case are normalised', () => {
  assert.deepEqual(parseName('1.2.3.4.A-I.SH.', Z), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.sh' });
});

// ---- multi-zone ----

test('multi-zone: two suffixes served by one process', () => {
  assert.deepEqual(parseName('1.2.3.4.a-i.sh', ZS), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.sh' });
  assert.deepEqual(parseName('1.2.3.4.a-i.st', ZS), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.st' });
});

test('multi-zone: each apex is read as the apex of its own zone', () => {
  assert.deepEqual(parseName('a-i.st', ZS), { kind: 'apex', zone: 'a-i.st' });
});

test('multi-zone: outside every zone -> refused', () => {
  assert.deepEqual(parseName('1.2.3.4.example.com', ZS), { kind: 'refused' });
});

test('matchZone: the longest match wins when zones nest', () => {
  assert.equal(matchZone('1.2.3.4.dev.a-i.sh', ['a-i.sh', 'dev.a-i.sh']), 'dev.a-i.sh');
  assert.equal(matchZone('1.2.3.4.a-i.sh', ['a-i.sh', 'dev.a-i.sh']), 'a-i.sh');
});

test('matchZone: a trailing dot and upper case are normalised', () => {
  assert.equal(matchZone('1.2.3.4.A-I.ST.', ZS), 'a-i.st');
  assert.equal(matchZone('nope.example.org', ZS), null);
});

test('ipv4ToBytes', () => {
  assert.deepEqual([...ipv4ToBytes('10.0.0.1')], [10, 0, 0, 1]);
});

test('ipv6ToBytes expand "::"', () => {
  assert.deepEqual([...ipv6ToBytes('2001:db8::1')],
    [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
});

// ---- a prefix joined to the address by a hyphen, inside one label ----
// The form nip.io and sslip.io have both answered for years, and the one our own front
// page documented while the server said NXDOMAIN. It is also the form that matters for
// TLS: it stays a single label, so it fits under a wildcard certificate.

test('hyphen-joined prefix: the nine name forms nip.io documents', () => {
  const cases = [
    // [name, expected ip]  — taken from the nip.io front page, suffix swapped
    ['10.0.0.1.a-i.sh', '10.0.0.1'],
    ['192-168-1-250.a-i.sh', '192.168.1.250'],
    ['0a000803.a-i.sh', '10.0.8.3'],
    ['app.10.8.0.1.a-i.sh', '10.8.0.1'],
    ['app-116-203-255-68.a-i.sh', '116.203.255.68'],
    ['app-c0a801fc.a-i.sh', '192.168.1.252'],
    ['customer1.app.10.0.0.1.a-i.sh', '10.0.0.1'],
    ['customer2-app-127-0-0-1.a-i.sh', '127.0.0.1'],
    ['customer3-app-7f000101.a-i.sh', '127.0.1.1'],
  ];
  for (const [name, ip] of cases) {
    assert.deepEqual(parseName(name, Z), { kind: 'A', ip, zone: 'a-i.sh' }, name);
  }
});

test('hyphen-joined prefix: the example printed on our own front page', () => {
  assert.deepEqual(parseName('www-192-168-0-1.a-i.sh', Z), { kind: 'A', ip: '192.168.0.1', zone: 'a-i.sh' });
});

test('hyphen-joined prefix: the address is canonicalised, so a block cannot be respelled', () => {
  // The blocklist decides on the ip value produced here. If leading zeros survived this
  // path, a block on 1.2.3.4 could be walked around by asking for app-01-02-03-04.
  assert.deepEqual(parseName('app-01-02-03-04.a-i.sh', Z), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.sh' });
  assert.deepEqual(parseName('app-001-002-003-004.a-i.sh', Z), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.sh' });
});

test('hyphen-joined prefix: a name that encodes no address is still NXDOMAIN', () => {
  // The whole contract of the service is that a name either encodes an IP or does not
  // exist. Accepting a prefix must not soften that into a catch-all.
  for (const name of [
    'hello-world.a-i.sh',
    'my-app-server.a-i.sh',
    'app-1-2-3.a-i.sh',        // three groups, not four
    'app-192-168-0-999.a-i.sh', // an octet above 255
    'app-c0a801f.a-i.sh',       // seven hex digits, not eight
    'app-c0a801fcc.a-i.sh',     // nine
  ]) {
    assert.equal(parseName(name, Z).kind, 'nxdomain', name);
  }
});

test('hyphen-joined prefix: the whole-label forms keep their old meaning', () => {
  // The new rule runs only after every whole-label rule has failed, so it can turn an
  // NXDOMAIN into an address but must never turn one address into a different address.
  assert.deepEqual(parseName('1-2-3-4.a-i.sh', Z), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.sh' });
  assert.deepEqual(parseName('0a000001.a-i.sh', Z), { kind: 'A', ip: '10.0.0.1', zone: 'a-i.sh' });
  // Still IPv6, not "prefix 1-2-3-4 plus address 5.6.7.8": every group is hex, so the
  // whole-label IPv6 rule matches first and wins.
  assert.deepEqual(parseName('1-2-3-4-5-6-7-8.a-i.sh', Z), { kind: 'AAAA', ip: '1:2:3:4:5:6:7:8', zone: 'a-i.sh' });
});

test('hyphen-joined prefix: read right-to-left, the address nearest the zone wins', () => {
  assert.deepEqual(parseName('web-10-0-0-1-192-168-0-2.a-i.sh', Z), { kind: 'A', ip: '192.168.0.2', zone: 'a-i.sh' });
  assert.deepEqual(parseName('app.web-10-0-0-5.a-i.sh', Z), { kind: 'A', ip: '10.0.0.5', zone: 'a-i.sh' });
});

test('hyphen-joined prefix: eight all-hex groups stay IPv6, they do not become prefix+IPv4', () => {
  // A genuine ambiguity in the format, pinned down here so nobody "fixes" it by accident.
  // "10-0-0-1-192-168-0-2" is eight groups that are all valid hex, so the whole-label
  // IPv6 rule matches first and it reads as an IPv6 address. Only a prefix containing a
  // non-hex character (w, s, g-z...) breaks the tie towards prefix + IPv4.
  assert.deepEqual(parseName('10-0-0-1-192-168-0-2.a-i.sh', Z),
    { kind: 'AAAA', ip: '10:0:0:1:192:168:0:2', zone: 'a-i.sh' });
  assert.deepEqual(parseName('web-10-0-0-1-192-168-0-2.a-i.sh', Z),
    { kind: 'A', ip: '192.168.0.2', zone: 'a-i.sh' });
});

test('hyphen-joined prefix: works on both suffixes', () => {
  assert.deepEqual(parseName('www-1-2-3-4.a-i.st', ZS), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.st' });
  assert.deepEqual(parseName('www-1-2-3-4.a-i.sh', ZS), { kind: 'A', ip: '1.2.3.4', zone: 'a-i.sh' });
});
