import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRules } from '../src/blocklist.js';
import { parseName } from '../src/parse.js';
import { resolve } from '../src/resolve.js';
import { TYPE, RCODE, parseQuery } from '../src/wire.js';

const ZONES = ['a-i.st', 'a-i.sh'];

// ---- lapisan aturan ----

test('ip: exact match', () => {
  const d = parseRules('ip 203.0.113.10');
  assert.equal(d.isBlocked('203.0.113.10'), true);
  assert.equal(d.isBlocked('203.0.113.11'), false);
});

test('cidr: block boundaries are respected', () => {
  const d = parseRules('cidr 203.0.113.0/24');
  assert.equal(d.isBlocked('203.0.113.0'), true);
  assert.equal(d.isBlocked('203.0.113.255'), true);
  assert.equal(d.isBlocked('203.0.114.0'), false);
});

test('cidr /32 and /0', () => {
  assert.equal(parseRules('cidr 1.2.3.4/32').isBlocked('1.2.3.4'), true);
  assert.equal(parseRules('cidr 1.2.3.4/32').isBlocked('1.2.3.5'), false);
  assert.equal(parseRules('cidr 0.0.0.0/0').isBlocked('8.8.8.8'), true);
});

test('allow always beats block', () => {
  const d = parseRules('cidr 203.0.113.0/24\nallow 203.0.113.5');
  assert.equal(d.isBlocked('203.0.113.4'), true);
  assert.equal(d.isBlocked('203.0.113.5'), false);
});

test('IPv6: ip and cidr', () => {
  assert.equal(parseRules('ip 2001:db8::1').isBlocked('2001:db8::1', true), true);
  assert.equal(parseRules('ip 2001:db8::1').isBlocked('2001:db8::2', true), false);
  assert.equal(parseRules('cidr 2001:db8::/32').isBlocked('2001:db8:ffff::9', true), true);
  assert.equal(parseRules('cidr 2001:db8::/32').isBlocked('2001:dead::9', true), false);
});

test('IPv4 and IPv6 never contaminate each other', () => {
  const d = parseRules('cidr 0.0.0.0/0');
  assert.equal(d.isBlocked('1.2.3.4', false), true);
  assert.equal(d.isBlocked('2001:db8::1', true), false);
});

test('comments, blank lines and broken lines are ignored without dropping the rest', () => {
  const d = parseRules(`
# komentar
ip 1.2.3.4      # komentar di ujung baris

ngawur 9.9.9.9
ip bukan-alamat
cidr 5.6.7.0/24
`);
  assert.equal(d.count, 2, 'both valid rules are still used');
  assert.equal(d.errors.length, 2, 'dua baris rusak dicatat');
  assert.equal(d.isBlocked('1.2.3.4'), true);
  assert.equal(d.isBlocked('5.6.7.8'), true);
});

// ---- the layer that actually matters: no way around it through spelling ----

test('EVERY spelling of the same address is blocked too', () => {
  const d = parseRules('ip 1.2.3.4');
  const spellings = [
    '1.2.3.4.a-i.st',            // titik
    '01.02.03.04.a-i.st',        // nol di depan
    '001.002.003.004.a-i.st',    // nol lebih banyak
    '1.02.003.4.a-i.st',         // campur
    '1-2-3-4.a-i.st',            // garis
    '01-02-03-04.a-i.st',        // garis + nol depan
    '01020304.a-i.st',           // heksa 8 digit -> 1.2.3.4
    'apa-aja.1.2.3.4.a-i.st',    // prefix
    'x.y.z.1-2-3-4.a-i.st',      // prefix bertingkat
    '1.2.3.4.A-I.ST',            // huruf besar
    '1.2.3.4.a-i.st.',           // titik di ujung
    '1.2.3.4.a-i.sh',            // the other zone
  ];
  for (const name of spellings) {
    const p = parseName(name, ZONES);
    assert.equal(p.kind, 'A', `${name} must parse as an A`);
    assert.equal(p.ip, '1.2.3.4', `${name} must canonicalise to 1.2.3.4`);
    assert.equal(d.isBlocked(p.ip), true, `${name} must be blocked too`);
  }
});

test('a similar neighbouring address is NOT caught', () => {
  const d = parseRules('ip 1.2.3.4');
  for (const name of ['1.2.3.40.a-i.st', '1.2.3.5.a-i.st', '11.2.3.4.a-i.st']) {
    const p = parseName(name, ZONES);
    assert.equal(d.isBlocked(p.ip), false, `${name} must not be caught`);
  }
});

// ---- lapisan jawaban DNS ----

const baseCfg = {
  zones: ZONES, ns: ['ns1.a-i.sh', 'ns2.a-i.st'], ttl: 3600,
  refresh: 3600, retry: 600, expire: 604800, minttl: 180, serial: 1,
};
const ask = (nama, qtype = TYPE.A) => {
  const label = nama.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  const q = Buffer.concat([Buffer.from([0x11, 0x22, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]),
    ...label, Buffer.from([0]), Buffer.from([0, qtype, 0, 1])]);
  return parseQuery(q);
};
const rcode = (buf) => buf.readUInt16BE(2) & 0x0f;
const answerCount = (buf) => buf.readUInt16BE(6);

test('a blocked name -> NXDOMAIN, never the address', () => {
  const cfg = { ...baseCfg, blocklist: parseRules('ip 9.9.9.9') };
  assert.equal(rcode(resolve(ask('9.9.9.9.a-i.st'), cfg)), RCODE.NXDOMAIN);
  assert.equal(rcode(resolve(ask('9-9-9-9.a-i.sh'), cfg)), RCODE.NXDOMAIN, 'bentuk garis juga');
  assert.equal(rcode(resolve(ask('8.8.8.8.a-i.st'), cfg)), RCODE.OK, 'everything else stays normal');
});

test('sinkhole: when set, a block points at an explanation address', () => {
  const cfg = { ...baseCfg, blocklist: parseRules('ip 9.9.9.9'), sinkholeIp: '192.0.2.1' };
  const r = resolve(ask('9.9.9.9.a-i.st'), cfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(answerCount(r), 1);
});

test('with no blocklist, the previous behaviour is unchanged', () => {
  const r = resolve(ask('9.9.9.9.a-i.st'), baseCfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(answerCount(r), 1);
});

test('ANY is answered with a minimal HINFO (RFC 8482, anti-amplification)', () => {
  const apexAny = resolve(ask('a-i.st', TYPE.ANY), baseCfg);
  assert.equal(answerCount(apexAny), 1, 'one record only, not SOA+NS+A');
  const fullSoa = resolve(ask('a-i.st', TYPE.SOA), baseCfg);
  assert.ok(apexAny.length < fullSoa.length,
    `the ANY reply (${apexAny.length}B) must be smaller than a plain SOA (${fullSoa.length}B)`);
});

test('an in-zone nameserver has its own A record (without it the delegation deadlocks)', () => {
  const cfg = { ...baseCfg, selfIp: '167.235.234.220' };
  const r = resolve(ask('ns1.a-i.sh'), cfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(answerCount(r), 1);
  // without selfIp that name is not an IP pattern -> NXDOMAIN
  assert.equal(rcode(resolve(ask('ns1.a-i.sh'), baseCfg)), RCODE.NXDOMAIN);
});

test('an in-zone nameserver also has an AAAA (IPv6-only clients need a way in)', () => {
  const cfg = { ...baseCfg, selfIp: '167.235.234.220', selfIp6: '2a01:4f8:c015:8800::1' };
  for (const ns of ['ns1.a-i.sh', 'ns2.a-i.st']) {
    const r = resolve(ask(ns, TYPE.AAAA), cfg);
    assert.equal(rcode(r), RCODE.OK, `${ns} AAAA must be NOERROR`);
    assert.equal(answerCount(r), 1, `${ns} must have exactly one AAAA`);
  }
});

test('a type the nameserver does not have -> NODATA, not NXDOMAIN', () => {
  // NXDOMAIN would be dangerous here: a resolver caches "this name does not exist"
  // negatively and may stop asking for its A/AAAA as well.
  const cfg = { ...baseCfg, selfIp: '167.235.234.220' };
  const r = resolve(ask('ns1.a-i.sh', TYPE.TXT), cfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(answerCount(r), 0);
});

test('the nameserver AAAA does not appear when selfIp6 is unset', () => {
  const cfg = { ...baseCfg, selfIp: '167.235.234.220' };
  const r = resolve(ask('ns1.a-i.sh', TYPE.AAAA), cfg);
  assert.equal(rcode(r), RCODE.OK, 'tetap NODATA, bukan NXDOMAIN');
  assert.equal(answerCount(r), 0);
});
