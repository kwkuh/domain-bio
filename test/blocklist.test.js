import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bacaAturan } from '../src/blocklist.js';
import { parseName } from '../src/parse.js';
import { resolve } from '../src/resolve.js';
import { TYPE, RCODE, parseQuery } from '../src/wire.js';

const ZONES = ['a-i.st', 'a-i.sh'];

// ---- lapisan aturan ----

test('ip: cocok persis', () => {
  const d = bacaAturan('ip 203.0.113.10');
  assert.equal(d.diblokir('203.0.113.10'), true);
  assert.equal(d.diblokir('203.0.113.11'), false);
});

test('cidr: batas blok dihormati', () => {
  const d = bacaAturan('cidr 203.0.113.0/24');
  assert.equal(d.diblokir('203.0.113.0'), true);
  assert.equal(d.diblokir('203.0.113.255'), true);
  assert.equal(d.diblokir('203.0.114.0'), false);
});

test('cidr /32 dan /0', () => {
  assert.equal(bacaAturan('cidr 1.2.3.4/32').diblokir('1.2.3.4'), true);
  assert.equal(bacaAturan('cidr 1.2.3.4/32').diblokir('1.2.3.5'), false);
  assert.equal(bacaAturan('cidr 0.0.0.0/0').diblokir('8.8.8.8'), true);
});

test('allow selalu menang atas blokir', () => {
  const d = bacaAturan('cidr 203.0.113.0/24\nallow 203.0.113.5');
  assert.equal(d.diblokir('203.0.113.4'), true);
  assert.equal(d.diblokir('203.0.113.5'), false);
});

test('IPv6: ip dan cidr', () => {
  assert.equal(bacaAturan('ip 2001:db8::1').diblokir('2001:db8::1', true), true);
  assert.equal(bacaAturan('ip 2001:db8::1').diblokir('2001:db8::2', true), false);
  assert.equal(bacaAturan('cidr 2001:db8::/32').diblokir('2001:db8:ffff::9', true), true);
  assert.equal(bacaAturan('cidr 2001:db8::/32').diblokir('2001:dead::9', true), false);
});

test('IPv4 dan IPv6 tidak saling mencemari', () => {
  const d = bacaAturan('cidr 0.0.0.0/0');
  assert.equal(d.diblokir('1.2.3.4', false), true);
  assert.equal(d.diblokir('2001:db8::1', true), false);
});

test('komentar, baris kosong, dan baris rusak diabaikan tanpa menjatuhkan sisanya', () => {
  const d = bacaAturan(`
# komentar
ip 1.2.3.4      # komentar di ujung baris

ngawur 9.9.9.9
ip bukan-alamat
cidr 5.6.7.0/24
`);
  assert.equal(d.jumlah, 2, 'dua aturan sah tetap terpakai');
  assert.equal(d.salah.length, 2, 'dua baris rusak dicatat');
  assert.equal(d.diblokir('1.2.3.4'), true);
  assert.equal(d.diblokir('5.6.7.8'), true);
});

// ---- lapisan yang sebenarnya penting: tidak bisa ditembus lewat cara mengetik ----

test('SEMUA bentuk penulisan alamat yang sama ikut terblokir', () => {
  const d = bacaAturan('ip 1.2.3.4');
  const bentuk = [
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
    '1.2.3.4.a-i.sh',            // zone yang satunya
  ];
  for (const nama of bentuk) {
    const p = parseName(nama, ZONES);
    assert.equal(p.kind, 'A', `${nama} harus terbaca sebagai A`);
    assert.equal(p.ip, '1.2.3.4', `${nama} harus dibakukan jadi 1.2.3.4`);
    assert.equal(d.diblokir(p.ip), true, `${nama} harus ikut terblokir`);
  }
});

test('alamat tetangga yang mirip TIDAK ikut terblokir', () => {
  const d = bacaAturan('ip 1.2.3.4');
  for (const nama of ['1.2.3.40.a-i.st', '1.2.3.5.a-i.st', '11.2.3.4.a-i.st']) {
    const p = parseName(nama, ZONES);
    assert.equal(d.diblokir(p.ip), false, `${nama} tidak boleh kena`);
  }
});

// ---- lapisan jawaban DNS ----

const cfgDasar = {
  zones: ZONES, ns: ['ns1.a-i.sh', 'ns2.a-i.st'], ttl: 3600,
  refresh: 3600, retry: 600, expire: 604800, minttl: 180, serial: 1,
};
const tanya = (nama, qtype = TYPE.A) => {
  const label = nama.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  const q = Buffer.concat([Buffer.from([0x11, 0x22, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]),
    ...label, Buffer.from([0]), Buffer.from([0, qtype, 0, 1])]);
  return parseQuery(q);
};
const rcode = (buf) => buf.readUInt16BE(2) & 0x0f;
const jumlahJawaban = (buf) => buf.readUInt16BE(6);

test('nama yang diblokir -> NXDOMAIN, bukan alamatnya', () => {
  const cfg = { ...cfgDasar, blocklist: bacaAturan('ip 9.9.9.9') };
  assert.equal(rcode(resolve(tanya('9.9.9.9.a-i.st'), cfg)), RCODE.NXDOMAIN);
  assert.equal(rcode(resolve(tanya('9-9-9-9.a-i.sh'), cfg)), RCODE.NXDOMAIN, 'bentuk garis juga');
  assert.equal(rcode(resolve(tanya('8.8.8.8.a-i.st'), cfg)), RCODE.OK, 'yang lain tetap normal');
});

test('sinkhole: kalau diisi, blokir mengarah ke alamat penjelasan', () => {
  const cfg = { ...cfgDasar, blocklist: bacaAturan('ip 9.9.9.9'), sinkholeIp: '192.0.2.1' };
  const r = resolve(tanya('9.9.9.9.a-i.st'), cfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(jumlahJawaban(r), 1);
});

test('tanpa blocklist, perilaku lama tidak berubah', () => {
  const r = resolve(tanya('9.9.9.9.a-i.st'), cfgDasar);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(jumlahJawaban(r), 1);
});

test('ANY dijawab minimal HINFO (RFC 8482, anti amplifikasi)', () => {
  const apexAny = resolve(tanya('a-i.st', TYPE.ANY), cfgDasar);
  assert.equal(jumlahJawaban(apexAny), 1, 'cuma satu record, bukan SOA+NS+A');
  const soaPenuh = resolve(tanya('a-i.st', TYPE.SOA), cfgDasar);
  assert.ok(apexAny.length < soaPenuh.length,
    `balasan ANY (${apexAny.length}B) harus lebih kecil dari SOA biasa (${soaPenuh.length}B)`);
});

test('nameserver in-zone punya A record sendiri (kalau tidak, delegasi buntu)', () => {
  const cfg = { ...cfgDasar, selfIp: '167.235.234.220' };
  const r = resolve(tanya('ns1.a-i.sh'), cfg);
  assert.equal(rcode(r), RCODE.OK);
  assert.equal(jumlahJawaban(r), 1);
  // tanpa selfIp, nama itu bukan pola IP -> NXDOMAIN
  assert.equal(rcode(resolve(tanya('ns1.a-i.sh'), cfgDasar)), RCODE.NXDOMAIN);
});
