import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPE, RCODE, parseQuery, buildResponse, buildTruncated, PAYLOAD_KAMI } from '../src/wire.js';
import { resolve } from '../src/resolve.js';
import { samarkan } from '../src/querylog.js';

const cfgDasar = {
  zones: ['a-i.st', 'a-i.sh'], ns: ['ns1.a-i.sh', 'ns2.a-i.st'], ttl: 3600,
  refresh: 3600, retry: 600, expire: 604800, minttl: 180, serial: 2026080101,
};

/** Susun query, opsional dengan OPT (EDNS0) di bagian additional. */
function bikinQuery(nama, qtype = TYPE.A, opt = null) {
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
    o.writeUInt8(opt.versi ?? 0, 6);
    o.writeUInt16BE(opt.do ? 0x8000 : 0, 7);
    o.writeUInt16BE(0, 9);
    bagian.push(o);
  }
  return Buffer.concat(bagian);
}

const arcount = (b) => b.readUInt16BE(10);
const ancount = (b) => b.readUInt16BE(6);
const rcode = (b) => b.readUInt16BE(2) & 0x0f;

// ---- membaca OPT dari query ----

test('query tanpa OPT: edns tidak terdeteksi', () => {
  assert.equal(parseQuery(bikinQuery('1.2.3.4.a-i.st')).edns, null);
});

test('query dengan OPT: payload dan versi terbaca', () => {
  const q = parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, { payload: 4096 }));
  assert.equal(q.edns.ada, true);
  assert.equal(q.edns.payload, 4096);
  assert.equal(q.edns.versi, 0);
});

test('payload yang diiklankan terlalu kecil dinaikkan ke lantai 512', () => {
  const q = parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, { payload: 42 }));
  assert.equal(q.edns.payload, 512, 'menuruti angka absurd bikin semua jawaban terpotong tanpa alasan');
});

test('flag DO terbaca (dipakai nanti kalau DNSSEC dipasang)', () => {
  assert.equal(parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, { do: true })).edns.do, true);
  assert.equal(parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, { do: false })).edns.do, false);
});

// ---- membalas OPT ----

test('🚨 query ber-EDNS0 dibalas DENGAN OPT (RFC 6891 §6.1.1)', () => {
  const r = resolve(parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, {})), cfgDasar);
  assert.equal(arcount(r), 1, 'balasan wajib membawa OPT — ini prasyarat DNSSEC');
  assert.equal(ancount(r), 1, 'jawabannya sendiri tidak boleh hilang');
  assert.equal(rcode(r), RCODE.OK);
});

test('query tanpa EDNS0 dibalas TANPA OPT', () => {
  const r = resolve(parseQuery(bikinQuery('1.2.3.4.a-i.st')), cfgDasar);
  assert.equal(arcount(r), 0, 'jangan menyelipkan OPT ke klien yang tidak memintanya');
});

test('OPT balasan mengiklankan 1232 (DNS Flag Day 2020, muat di MTU IPv6 minimum)', () => {
  const r = resolve(parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, {})), cfgDasar);
  // OPT ada di ujung: 11 byte terakhir. CLASS = ukuran payload.
  const opt = r.subarray(r.length - 11);
  assert.equal(opt.readUInt8(0), 0, 'NAME OPT wajib akar');
  assert.equal(opt.readUInt16BE(1), TYPE.OPT);
  assert.equal(opt.readUInt16BE(3), PAYLOAD_KAMI);
  assert.equal(PAYLOAD_KAMI, 1232);
  assert.equal(opt.readUInt16BE(9), 0, 'RDLENGTH 0 — kita tidak mengirim opsi apa pun');
});

test('versi EDNS yang tidak dikenal -> BADVERS, bukan didiamkan', () => {
  const r = resolve(parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, { versi: 1 })), cfgDasar);
  assert.equal(arcount(r), 1, 'tetap balas, kalau didiamkan klien mengira paketnya hilang lalu mengulang terus');
  assert.equal(ancount(r), 0, 'BADVERS tidak boleh membawa jawaban');
  const opt = r.subarray(r.length - 11);
  assert.equal(opt.readUInt8(5), 1, 'extended rcode hi-byte 1 => BADVERS (16)');
  assert.equal(opt.readUInt8(6), 0, 'kita balas dengan versi 0, versi yang kita dukung');
});

test('balasan terpotong ikut membawa OPT kalau query membawanya', () => {
  const dgnOpt = buildTruncated(parseQuery(bikinQuery('1.2.3.4.a-i.st', TYPE.A, {})));
  const tanpaOpt = buildTruncated(parseQuery(bikinQuery('1.2.3.4.a-i.st')));
  assert.equal(arcount(dgnOpt), 1);
  assert.equal(arcount(tanpaOpt), 0);
  assert.ok((dgnOpt.readUInt16BE(2) & 0x0200) !== 0, 'TC harus tetap menyala');
});

test('OPT tidak merusak jalur NXDOMAIN maupun REFUSED', () => {
  const nx = resolve(parseQuery(bikinQuery('foo.bar.a-i.st', TYPE.A, {})), cfgDasar);
  assert.equal(rcode(nx), RCODE.NXDOMAIN);
  assert.equal(arcount(nx), 1, 'OPT tetap dibawa di NXDOMAIN');
  const ref = resolve(parseQuery(bikinQuery('google.com', TYPE.A, {})), cfgDasar);
  assert.equal(rcode(ref), RCODE.REFUSED);
});

test('ANY ber-EDNS0 tetap minimal (anti amplifikasi tidak boleh bocor lewat OPT)', () => {
  const any = resolve(parseQuery(bikinQuery('a-i.st', TYPE.ANY, {})), cfgDasar);
  const soa = resolve(parseQuery(bikinQuery('a-i.st', TYPE.SOA, {})), cfgDasar);
  assert.equal(ancount(any), 1);
  assert.ok(any.length < soa.length, `ANY (${any.length}B) harus tetap lebih kecil dari SOA (${soa.length}B)`);
});

// ---- penyamaran alamat di catatan query ----

test('alamat klien disamarkan ke blok, bukan disimpan utuh', () => {
  assert.equal(samarkan('203.0.113.77'), '203.0.113.0/24');
  // Dipanjangkan dulu, jadi bentuknya selalu empat-heksa penuh — lihat
  // test/paket-rusak.test.js untuk alasannya.
  assert.equal(samarkan('2a01:4f8:c015:8800::1', true), '2a01:04f8:c015::/48');
});

test('dua alamat dalam satu blok jadi catatan yang sama — itu memang tujuannya', () => {
  assert.equal(samarkan('198.51.100.1'), samarkan('198.51.100.254'));
  assert.notEqual(samarkan('198.51.100.1'), samarkan('198.51.101.1'));
});

test('masukan aneh tidak melahirkan catatan yang menyesatkan', () => {
  assert.equal(samarkan(''), '?');
  assert.equal(samarkan('bukan-alamat'), '?');
});
