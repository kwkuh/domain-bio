// protocol.test.js — the header-level rules that are easy to get subtly wrong and were,
// until an audit walked the raw packets: OPCODE, QCLASS, QR, and ANY for a name we do
// not serve. Each of these had the server answering NOERROR+AA when the honest answer
// was "not me" or "not implemented".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from '../src/resolve.js';
import { TYPE, RCODE, CLASS_IN, parseQuery } from '../src/wire.js';

const ZONES = ['a-i.st', 'a-i.sh'];
const baseCfg = {
  zones: ZONES, ns: ['ns1.a-i.sh', 'ns2.a-i.st'], ttl: 3600,
  refresh: 3600, retry: 600, expire: 604800, minttl: 180, serial: 1,
};

// A raw query builder with every header field we want to bend on purpose.
// opcode occupies bits 11-14, QR is bit 15.
function raw(name, { qtype = TYPE.A, qclass = CLASS_IN, opcode = 0, qr = false } = {}) {
  const flags = (qr ? 0x8000 : 0) | ((opcode & 0x0f) << 11) | 0x0100 /* RD */;
  const labels = name === ''
    ? [Buffer.from([0])]
    : [...name.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)])), Buffer.from([0])];
  const head = Buffer.alloc(12);
  head.writeUInt16BE(0x1234, 0);
  head.writeUInt16BE(flags, 2);
  head.writeUInt16BE(1, 4); // qdcount
  const tail = Buffer.alloc(4);
  tail.writeUInt16BE(qtype, 0);
  tail.writeUInt16BE(qclass, 2);
  return Buffer.concat([head, ...labels, tail]);
}
const ask = (name, opts) => parseQuery(raw(name, opts));
const rcode = (buf) => buf.readUInt16BE(2) & 0x0f;
const opcodeOf = (buf) => (buf.readUInt16BE(2) >> 11) & 0x0f;
const answerCount = (buf) => buf.readUInt16BE(6);
const qrSet = (buf) => (buf.readUInt16BE(2) & 0x8000) !== 0;

// ---- QR ----

test('a packet with QR=1 is a response and must be dropped, not answered', () => {
  // Answering a response lets two servers (or one, with a forged source) bounce the same
  // packet forever. parseQuery throws so the caller sends nothing at all.
  assert.throws(() => ask('1.2.3.4.a-i.st', { qr: true }), /QR/);
});

// ---- OPCODE ----

test('a non-zero OPCODE is answered NOTIMP, with the opcode echoed back', () => {
  for (const [name, opcode] of [['UPDATE', 5], ['NOTIFY', 4], ['STATUS', 2]]) {
    const r = resolve(ask('1.2.3.4.a-i.st', { opcode }), baseCfg);
    assert.equal(rcode(r), RCODE.NOTIMP, `${name}: NOTIMP`);
    assert.equal(opcodeOf(r), opcode, `${name}: opcode echoed, not rewritten to 0`);
    assert.equal(qrSet(r), true, `${name}: QR set`);
    assert.equal(answerCount(r), 0, `${name}: no answer section — we did not do it`);
  }
});

test('a standard query (opcode 0) is unaffected', () => {
  const r = resolve(ask('1.2.3.4.a-i.st', { opcode: 0 }), baseCfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(answerCount(r), 1);
});

// ---- QCLASS ----

test('a class other than IN is REFUSED, not answered with an IN record', () => {
  for (const [name, qclass] of [['CHAOS', 3], ['HESIOD', 4], ['class 255', 255]]) {
    const r = resolve(ask('1.2.3.4.a-i.st', { qclass }), baseCfg);
    assert.equal(rcode(r), RCODE.REFUSED, `${name}: REFUSED`);
    assert.equal(answerCount(r), 0, `${name}: no answer`);
  }
});

test('class IN is served normally', () => {
  const r = resolve(ask('1.2.3.4.a-i.st', { qclass: CLASS_IN }), baseCfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(answerCount(r), 1);
});

// ---- ANY for a name we do not serve ----

test('ANY for a name outside our zones is REFUSED, not a cheerful HINFO', () => {
  // The bug: the ANY shortcut ran before the out-of-zone check, so `google.com ANY` got
  // NOERROR + AA + HINFO — us claiming to be authoritative for a domain that is not ours.
  const r = resolve(ask('google.com', { qtype: TYPE.ANY }), baseCfg);
  assert.equal(rcode(r), RCODE.REFUSED);
  assert.equal(answerCount(r), 0);
});

test('ANY for the root is REFUSED too', () => {
  const r = resolve(ask('', { qtype: TYPE.ANY }), baseCfg);
  assert.equal(rcode(r), RCODE.REFUSED);
});

test('ANY for a name we DO serve still gets the minimal HINFO (RFC 8482)', () => {
  // Regression guard: fixing the out-of-zone case must not disable the anti-amplification
  // answer for names that are ours.
  const r = resolve(ask('1.2.3.4.a-i.st', { qtype: TYPE.ANY }), baseCfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(answerCount(r), 1, 'exactly one record: HINFO');
});

test('a plain type for an out-of-zone name is still REFUSED (unchanged)', () => {
  assert.equal(rcode(resolve(ask('google.com', { qtype: TYPE.A }), baseCfg)), RCODE.REFUSED);
});
