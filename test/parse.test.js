import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseName, matchZone, ipv4ToBytes, ipv6ToBytes } from '../src/parse.js';

const Z = 'a-i.sh';
const ZS = ['a-i.sh', 'a-i.st']; // Open-Domain jalan di dua suffix sekaligus

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

test('dalam zone tapi bukan IP -> nxdomain', () => {
  assert.deepEqual(parseName('foo.bar.a-i.sh', Z), { kind: 'nxdomain', zone: 'a-i.sh' });
});

test('di luar zone -> refused', () => {
  assert.deepEqual(parseName('google.com', Z), { kind: 'refused' });
});

test('octet > 255 ditolak (jatuh ke nxdomain)', () => {
  assert.deepEqual(parseName('1.2.3.999.a-i.sh', Z), { kind: 'nxdomain', zone: 'a-i.sh' });
});

test('trailing dot & huruf besar dinormalisasi', () => {
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

test('matchZone: titik di ujung & huruf besar dinormalisasi', () => {
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
