// The apex — a bare "a-i.st" with nothing in front of it — is the one name in the zone
// a human types by hand. Everything else is machine-generated. These tests pin down the
// rule that it may carry an address without that address leaking into the wildcard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from '../src/resolve.js';
import { TYPE, RCODE, parseQuery } from '../src/wire.js';

const ZONES = ['a-i.st', 'a-i.sh'];
const baseCfg = {
  zones: ZONES, ns: ['ns1.a-i.sh', 'ns2.a-i.st'], ttl: 3600,
  refresh: 3600, retry: 600, expire: 604800, minttl: 180, serial: 1,
};
const withApex = {
  ...baseCfg,
  apexIp: '167.235.234.220',
  apexIp6: '2a01:4f8:c015:8800::1',
};

const ask = (name, qtype = TYPE.A) => {
  const label = name.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  // qtype is written as a real 16-bit big-endian field. Writing it as a single byte
  // happens to work for every type below 256 and then silently truncates: CAA (257)
  // becomes 1, so a test meant to ask for CAA quietly asks for A and passes for the
  // wrong reason.
  const tail = Buffer.alloc(4);
  tail.writeUInt16BE(qtype, 0);
  tail.writeUInt16BE(1, 2); // class IN
  const q = Buffer.concat([Buffer.from([0x11, 0x22, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]),
    ...label, Buffer.from([0]), tail]);
  return parseQuery(q);
};
const rcode = (buf) => buf.readUInt16BE(2) & 0x0f;
const answerCount = (buf) => buf.readUInt16BE(6);
const authorityCount = (buf) => buf.readUInt16BE(8);

test('without APEX_IP the apex answers NODATA, not an address', () => {
  for (const zone of ZONES) {
    const r = resolve(ask(zone, TYPE.A), baseCfg);
    assert.equal(rcode(r), RCODE.OK, `${zone}: NOERROR`);
    assert.equal(answerCount(r), 0, `${zone}: no address invented out of nothing`);
    assert.equal(authorityCount(r), 1, `${zone}: SOA in authority so the miss is cacheable`);
  }
});

test('with APEX_IP set, the apex answers A', () => {
  for (const zone of ZONES) {
    const r = resolve(ask(zone, TYPE.A), withApex);
    assert.equal(rcode(r), RCODE.OK);
    assert.equal(answerCount(r), 1, `${zone}: exactly one A`);
    // The address is the last four octets of the record.
    assert.deepEqual([...r.subarray(r.length - 4)], [167, 235, 234, 220]);
  }
});

test('with APEX_IP6 set, the apex answers AAAA', () => {
  // The one that was missing. An IPv6-only visitor typing the bare name got a silent
  // NODATA while an IPv4 visitor got a working site — the failure looks like a dead
  // domain, and only to the half of the internet least likely to report it.
  for (const zone of ZONES) {
    const r = resolve(ask(zone, TYPE.AAAA), withApex);
    assert.equal(rcode(r), RCODE.OK);
    assert.equal(answerCount(r), 1, `${zone}: exactly one AAAA`);
    assert.equal(r.length - 16 > 0, true);
    const rdata = r.subarray(r.length - 16);
    assert.equal(rdata.readUInt16BE(0), 0x2a01);
    assert.equal(rdata.readUInt16BE(1 * 2), 0x4f8);
    assert.equal(rdata.readUInt16BE(7 * 2), 0x0001);
  }
});

test('an apex address does not turn every miss into that address', () => {
  // The whole contract of the service is that a name either encodes an IP or does not
  // exist. Giving the apex an address must not soften that into a catch-all.
  const r = resolve(ask('shop.a-i.st', TYPE.A), withApex);
  assert.equal(rcode(r), RCODE.NXDOMAIN, 'a non-IP name stays NXDOMAIN');
  assert.equal(answerCount(r), 0);
});

test('the apex address does not override an encoded IP', () => {
  const r = resolve(ask('192.0.2.7.a-i.st', TYPE.A), withApex);
  assert.equal(answerCount(r), 1);
  assert.deepEqual([...r.subarray(r.length - 4)], [192, 0, 2, 7], 'the name still wins');
});

test('apex SOA and NS are unaffected by the address records', () => {
  const soa = resolve(ask('a-i.st', TYPE.SOA), withApex);
  assert.equal(answerCount(soa), 1);
  const ns = resolve(ask('a-i.st', TYPE.NS), withApex);
  assert.equal(answerCount(ns), 2, 'both nameservers');
});

test('apex ANY stays minimal even once the apex has addresses', () => {
  // Adding A and AAAA to the apex is exactly the kind of change that quietly re-opens
  // an amplification hole, because ANY is usually implemented as "return everything".
  const any = resolve(ask('a-i.st', TYPE.ANY), withApex);
  assert.equal(answerCount(any), 1, 'HINFO only — not SOA + NS + A + AAAA');
  const soa = resolve(ask('a-i.st', TYPE.SOA), withApex);
  assert.ok(any.length < soa.length, `ANY (${any.length}B) must stay smaller than SOA (${soa.length}B)`);
});

test('a type we do not serve at the apex is NODATA, not NXDOMAIN', () => {
  // CAA is the one that matters in practice: Let's Encrypt asks for it before issuing.
  // NXDOMAIN here would tell the CA the name does not exist and refuse the certificate.
  const r = resolve(ask('a-i.st', 257), withApex);
  assert.equal(rcode(r), RCODE.OK, 'NOERROR');
  assert.equal(answerCount(r), 0);
  assert.equal(authorityCount(r), 1, 'SOA in authority');
});
