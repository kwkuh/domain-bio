import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuery } from '../src/wire.js';
import { anonymise } from '../src/querylog.js';
import { prefixKey } from '../src/ratelimit.js';

const HEADER = (qd = 1, ar = 0) => Buffer.from([0, 1, 0x01, 0x00, 0, qd, 0, 0, 0, 0, 0, ar]);

/** Jalankan sesuatu dan pastikan tidak memakan waktu absurd. */
function cepat(judul, fn, batasMs = 250) {
  const t0 = process.hrtime.bigint();
  try { fn(); } catch { /* melempar itu wajar; yang diuji BIAYANYA */ }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < batasMs, `${judul} makan ${ms.toFixed(0)} ms — harusnya di bawah ${batasMs} ms`);
}

// ---- 🚨 paket rusak tidak boleh mahal ----

test('🚨 paket 12 byte tidak boleh menyita CPU dan memori', () => {
  // Ini pernah nyata: header bilang "ada 1 pertanyaan" lalu paketnya habis.
  // buf[off] jadi undefined, `undefined & 0xc0` bernilai 0 sehingga bukan pointer,
  // `off += 1 + undefined` jadi NaN, dan buf[NaN] undefined lagi — perulangannya
  // tidak pernah keluar sambil terus menumpuk string kosong.
  // Terukur sebelum ditambal: 3 detik CPU dan 1,4 GB memori dari 12 byte.
  // Node satu utas, jadi 0,3 paket/detik sudah cukup mematikan layanan.
  cepat('paket 12 byte', () => parseQuery(HEADER()));
  assert.throws(() => parseQuery(HEADER()), /truncated/);
});

test('nama yang habis di tengah ditolak seketika', () => {
  const buf = Buffer.concat([HEADER(), Buffer.from([5, 97, 98])]); // janji 5 oktet, cuma ada 2
  cepat('nama kepotong', () => parseQuery(buf));
  assert.throws(() => parseQuery(buf), /runs past end/);
});

test('label lebih dari 63 oktet ditolak (RFC 1035 §2.3.4)', () => {
  const buf = Buffer.concat([HEADER(), Buffer.from([64]), Buffer.alloc(64, 97), Buffer.from([0, 0, 1, 0, 1])]);
  assert.throws(() => parseQuery(buf), /63 octets/);
});

test('nama lebih dari 255 oktet ditolak, tidak dibiarkan tumbuh', () => {
  const banyak = Array(300).fill(Buffer.from([1, 97]));
  const buf = Buffer.concat([HEADER(), ...banyak, Buffer.from([0, 0, 1, 0, 1])]);
  cepat('nama 300 label', () => parseQuery(buf));
  assert.throws(() => parseQuery(buf), /255 octets/);
});

test('pertanyaan tanpa qtype/qclass ditolak, bukan baca lewat ujung', () => {
  const buf = Buffer.concat([HEADER(), Buffer.from([1, 97, 0])]); // nama beres, qtype hilang
  assert.throws(() => parseQuery(buf), /qtype/);
});

test('arcount bohong tidak membuat penelusuran OPT berjalan liar', () => {
  const buf = Buffer.concat([HEADER(1, 0xffff), Buffer.from([1, 97, 0, 0, 1, 0, 1])]);
  cepat('arcount 65535', () => parseQuery(buf));
  const q = parseQuery(buf);
  assert.equal(q.name, 'a');
  assert.equal(q.edns, null, 'tidak ada OPT sungguhan, jadi harus null');
});

test('sampah acak tidak pernah menggantung', () => {
  for (const n of [1, 2, 11, 13, 64, 512, 1500]) {
    cepat(`sampah ${n} byte`, () => parseQuery(Buffer.alloc(n, 0xff)));
  }
});

test('paket sah tetap jalan sesudah semua pengetatan ini', () => {
  const nama = '203.0.113.10.a-i.st';
  const lbl = nama.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  const q = parseQuery(Buffer.concat([HEADER(), ...lbl, Buffer.from([0]), Buffer.from([0, 1, 0, 1])]));
  assert.equal(q.name, nama);
  assert.equal(q.qtype, 1);
});

// ---- 🚨 penyamaran alamat harus mengelompokkan, bukan memecah ----

test('🚨 IPv6 dengan ejaan berbeda tapi /48 sama -> satu label', () => {
  // "2a01:4f8:0:1::1" dan "2a01:4f8::1" berada di /48 yang sama. Memotong tiga
  // bagian pertama dari string mentahnya menghasilkan "2a01:4f8:0::/48" dan
  // "2a01:4f8:::/48" — dua label untuk satu jaringan, plus ":::" yang bahkan bukan
  // alamat sah. Itu menghancurkan satu-satunya guna penyamaran: memisahkan
  // "satu sumber membanjiri" dari "banyak orang memakai".
  for (const [a, b] of [
    ['2a01:4f8:0:1::1', '2a01:4f8::1'],
    ['2001:db8:0:0::5', '2001:db8::5'],
    ['2606:4700:0:1::a', '2606:4700::a'],
  ]) {
    assert.equal(anonymise(a, true), anonymise(b, true), `${a} dan ${b} harus jadi satu label`);
  }
});

test('label penyamaran tidak pernah mengandung ":::"', () => {
  for (const ip of ['2a01:4f8::1', '::1', '2001:db8::', 'fe80::1']) {
    assert.ok(!anonymise(ip, true).includes(':::'), `${ip} -> ${anonymise(ip, true)}`);
  }
});

test('/48 yang benar-benar berbeda tetap terpisah', () => {
  assert.notEqual(anonymise('2a01:4f8:1::1', true), anonymise('2a01:4f8:2::1', true));
});

test('penyamaran sepakat dengan pengelompokan rate limiter', () => {
  // Dua modul ini menjawab pertanyaan yang sama ("blok mana ini") dan tidak boleh
  // berbeda pendapat — kalau berbeda, log dan pembatas menunjuk jaringan berbeda
  // untuk paket yang sama.
  for (const [a, b] of [['2a01:4f8:0:1::1', '2a01:4f8::1'], ['2001:db8::5', '2001:db8:0:0::5']]) {
    const samaDiLog = anonymise(a, true) === anonymise(b, true);
    const samaDiBatas = prefixKey(a, true) === prefixKey(b, true);
    assert.equal(samaDiLog, samaDiBatas, `${a} vs ${b}: log bilang ${samaDiLog}, pembatas bilang ${samaDiBatas}`);
  }
});

test('IPv4 dibakukan, dan masukan ngawur tidak melahirkan label palsu', () => {
  assert.equal(anonymise('203.0.113.77'), '203.0.113.0/24');
  assert.equal(anonymise('010.001.113.77'), '10.1.113.0/24', 'nol di depan dibakukan');
  for (const buruk of ['', 'bukan-alamat', '1.2.3', '1.2.3.999', '1.2.3.4.5']) {
    assert.equal(anonymise(buruk), '?', `"${buruk}" harus jadi "?"`);
  }
});
