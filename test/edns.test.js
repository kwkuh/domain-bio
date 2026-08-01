import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPE, RCODE, parseQuery, buildResponse, buildTruncated, OUR_PAYLOAD } from '../src/wire.js';
import { resolve } from '../src/resolve.js';
import { anonymise } from '../src/querylog.js';

const baseCfg = {
  zones: ['a-i.st', 'a-i.sh'], ns: ['ns1.a-i.sh', 'ns2.a-i.st'], ttl: 3600,
  refresh: 3600, retry: 600, expire: 604800, minttl: 180, serial: 2026080101,
};

/** Build a query, optionally with an OPT (EDNS0) in the additional section. */
function buildQuery(nama, qtype = TYPE.A, opt = null) {
  const label = nama.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  const bagian = [
    Buffer.from([0x11, 0x22, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, opt ? 1 : 0]),
    ...label, Buffer.from([0]), Buffer.from([0, qtype, 0, 1]),
  ];
  if (opt) {
    const o = Buffer.alloc(11);
    o.writeUInt8(0, 0);
    o.writeUInt16BE(TYPE.OPT, 1);
    o.writeUInt16BE(opt.payload ?? 4096, 3);
    o.writeUInt8(0, 5);
    o.writeUInt8(opt.version ?? 0, 6);
    o.writeUInt16BE(opt.do ? 0x8000 : 0, 7);
    o.writeUInt16BE(0, 9);
    bagian.push(o);
  }
  return Buffer.concat(bagian);
}

const arcount = (b) => b.readUInt16BE(10);
const ancount = (b) => b.readUInt16BE(6);
const rcode = (b) => b.readUInt16BE(2) & 0x0f;

// ---- reading OPT out of a query ----

test('a query with no OPT: edns is not detected', () => {
  assert.equal(parseQuery(buildQuery('1.2.3.4.a-i.st')).edns, null);
});

test('a query with OPT: payload and version are read', () => {
  const q = parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, { payload: 4096 }));
  assert.equal(q.edns.present, true);
  assert.equal(q.edns.payload, 4096);
  assert.equal(q.edns.version, 0);
});

test('an advertised payload below the floor is raised to 512', () => {
  const q = parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, { payload: 42 }));
  assert.equal(q.edns.payload, 512, 'honouring an absurd number would truncate every answer for no reason');
});

test('the DO flag is read (for later, if DNSSEC is ever added)', () => {
  assert.equal(parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, { do: true })).edns.do, true);
  assert.equal(parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, { do: false })).edns.do, false);
});

// ---- membalas OPT ----

test('a query with EDNS0 is answered WITH an OPT (RFC 6891 section 6.1.1)', () => {
  const r = resolve(parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, {})), baseCfg);
  assert.equal(arcount(r), 1, 'the reply must carry an OPT -- this is a DNSSEC prerequisite');
  assert.equal(ancount(r), 1, 'the answer itself must not disappear');
  assert.equal(rcode(r), RCODE.OK);
});

test('a query without EDNS0 is answered WITHOUT an OPT', () => {
  const r = resolve(parseQuery(buildQuery('1.2.3.4.a-i.st')), baseCfg);
  assert.equal(arcount(r), 0, 'do not slip an OPT to a client that did not ask for one');
});

test('the reply OPT advertises 1232 (DNS Flag Day 2020, fits the minimum IPv6 MTU)', () => {
  const r = resolve(parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, {})), baseCfg);
  // The OPT is at the end: the last 11 bytes. CLASS = payload size.
  const opt = r.subarray(r.length - 11);
  assert.equal(opt.readUInt8(0), 0, 'the OPT NAME must be the root');
  assert.equal(opt.readUInt16BE(1), TYPE.OPT);
  assert.equal(opt.readUInt16BE(3), OUR_PAYLOAD);
  assert.equal(OUR_PAYLOAD, 1232);
  assert.equal(opt.readUInt16BE(9), 0, 'RDLENGTH 0 -- we send no options at all');
});

test('an unknown EDNS version -> BADVERS, not silence', () => {
  const r = resolve(parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, { version: 1 })), baseCfg);
  assert.equal(arcount(r), 1, 'still reply: silence makes the client think the packet was lost and retry forever');
  assert.equal(ancount(r), 0, 'BADVERS must carry no answers');
  const opt = r.subarray(r.length - 11);
  assert.equal(opt.readUInt8(5), 1, 'extended rcode high byte 1 => BADVERS (16)');
  assert.equal(opt.readUInt8(6), 0, 'we reply with version 0, the version we support');
});

test('a truncated reply carries an OPT when the query did', () => {
  const dgnOpt = buildTruncated(parseQuery(buildQuery('1.2.3.4.a-i.st', TYPE.A, {})));
  const tanpaOpt = buildTruncated(parseQuery(buildQuery('1.2.3.4.a-i.st')));
  assert.equal(arcount(dgnOpt), 1);
  assert.equal(arcount(tanpaOpt), 0);
  assert.ok((dgnOpt.readUInt16BE(2) & 0x0200) !== 0, 'TC must still be set');
});

test('OPT breaks neither the NXDOMAIN nor the REFUSED path', () => {
  const nx = resolve(parseQuery(buildQuery('foo.bar.a-i.st', TYPE.A, {})), baseCfg);
  assert.equal(rcode(nx), RCODE.NXDOMAIN);
  assert.equal(arcount(nx), 1, 'the OPT is still carried on NXDOMAIN');
  const ref = resolve(parseQuery(buildQuery('google.com', TYPE.A, {})), baseCfg);
  assert.equal(rcode(ref), RCODE.REFUSED);
});

test('ANY with EDNS0 stays minimal (anti-amplification must not leak through OPT)', () => {
  const any = resolve(parseQuery(buildQuery('a-i.st', TYPE.ANY, {})), baseCfg);
  const soa = resolve(parseQuery(buildQuery('a-i.st', TYPE.SOA, {})), baseCfg);
  assert.equal(ancount(any), 1);
  assert.ok(any.length < soa.length, `ANY (${any.length}B) must stay smaller than SOA (${soa.length}B)`);
});

// ---- penyamaran alamat di catatan query ----

test('the client address is reduced to a block, not stored whole', () => {
  assert.equal(anonymise('203.0.113.77'), '203.0.113.0/24');
  // Expanded first, so the shape is always full four-hex groups -- see
  // test/malformed-packets.test.js for the reasoning.
  assert.equal(anonymise('2a01:4f8:c015:8800::1', true), '2a01:04f8:c015::/48');
});

test('two addresses in one block become the same record -- that is the point', () => {
  assert.equal(anonymise('198.51.100.1'), anonymise('198.51.100.254'));
  assert.notEqual(anonymise('198.51.100.1'), anonymise('198.51.101.1'));
});

test('odd input does not produce a misleading record', () => {
  assert.equal(anonymise(''), '?');
  assert.equal(anonymise('bukan-alamat'), '?');
});
