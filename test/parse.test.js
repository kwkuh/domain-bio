import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseName, ipv4ToBytes, ipv6ToBytes } from '../src/parse.js';

const Z = 'a-i.sh';

test('IPv4 dotted', () => {
  assert.deepEqual(parseName('1.2.3.4.a-i.sh', Z), { kind: 'A', ip: '1.2.3.4' });
});

test('IPv4 dotted dengan prefix bebas', () => {
  assert.deepEqual(parseName('app.10.0.0.1.a-i.sh', Z), { kind: 'A', ip: '10.0.0.1' });
});

test('IPv4 dashed', () => {
  assert.deepEqual(parseName('192-168-1-1.a-i.sh', Z), { kind: 'A', ip: '192.168.1.1' });
});

test('IPv4 hex', () => {
  assert.deepEqual(parseName('0a000001.a-i.sh', Z), { kind: 'A', ip: '10.0.0.1' });
});

test('IPv6 dashed', () => {
  assert.deepEqual(parseName('2001-db8--1.a-i.sh', Z), { kind: 'AAAA', ip: '2001:db8::1' });
});

test('apex', () => {
  assert.deepEqual(parseName('a-i.sh', Z), { kind: 'apex' });
});

test('dalam zone tapi bukan IP -> nxdomain', () => {
  assert.deepEqual(parseName('foo.bar.a-i.sh', Z), { kind: 'nxdomain' });
});

test('di luar zone -> refused', () => {
  assert.deepEqual(parseName('google.com', Z), { kind: 'refused' });
});

test('octet > 255 ditolak (jatuh ke nxdomain)', () => {
  assert.deepEqual(parseName('1.2.3.999.a-i.sh', Z), { kind: 'nxdomain' });
});

test('trailing dot & huruf besar dinormalisasi', () => {
  assert.deepEqual(parseName('1.2.3.4.A-I.SH.', Z), { kind: 'A', ip: '1.2.3.4' });
});

test('ipv4ToBytes', () => {
  assert.deepEqual([...ipv4ToBytes('10.0.0.1')], [10, 0, 0, 1]);
});

test('ipv6ToBytes expand "::"', () => {
  assert.deepEqual([...ipv6ToBytes('2001:db8::1')],
    [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
});
