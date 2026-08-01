import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLimiter, prefixKey } from '../src/ratelimit.js';
import { parseQuery, buildTruncated } from '../src/wire.js';

/** Jam palsu: RRL soal waktu, dan tes yang bergantung jam asli itu tes yang rapuh. */
function jam(mulai = 1_000_000) {
  let t = mulai;
  return { now: () => t, maju: (ms) => { t += ms; } };
}

// ---- pengelompokan alamat ----

test('alamat dalam satu /24 dihitung sebagai satu blok', () => {
  const a = prefixKey('203.0.113.5');
  assert.equal(prefixKey('203.0.113.200'), a, 'tetangga se-/24 harus satu kunci');
  assert.notEqual(prefixKey('203.0.114.5'), a, '/24 sebelah harus beda kunci');
});

test('IPv6 dikelompokkan per /56', () => {
  const a = prefixKey('2a01:4f8:c015:8800::1', true);
  assert.equal(prefixKey('2a01:4f8:c015:8800:ffff::9', true), a);
  assert.notEqual(prefixKey('2a01:4f8:c015:8900::1', true), a, '/56 sebelah harus beda');
});

test('v4 dan v6 tidak pernah bertabrakan kuncinya', () => {
  assert.notEqual(prefixKey('1.2.3.4', false), prefixKey('::102:304', true));
});

// ---- perilaku token bucket ----

test('lalu lintas di bawah batas lolos semua', () => {
  const j = jam();
  const p = makeLimiter({ perSecond: 10, burst: 10, now: j.now });
  for (let i = 0; i < 10; i++) assert.equal(p.decide('203.0.113.1'), 'pass', `query ke-${i + 1}`);
});

test('melewati batas -> dibuang, dan slip menyelipkan balasan terpotong', () => {
  const j = jam();
  const p = makeLimiter({ perSecond: 10, burst: 10, slip: 5, now: j.now });
  for (let i = 0; i < 10; i++) p.decide('203.0.113.1'); // habiskan jatah

  const putusan = [];
  for (let i = 0; i < 10; i++) putusan.push(p.decide('203.0.113.1'));
  assert.deepEqual(putusan, [
    'drop', 'drop', 'drop', 'drop', 'truncate',
    'drop', 'drop', 'drop', 'drop', 'truncate',
  ], 'tiap kelebihan ke-5 harus dijawab terpotong, sisanya senyap');
});

test('jatah terisi ulang seiring waktu', () => {
  const j = jam();
  const p = makeLimiter({ perSecond: 10, burst: 10, now: j.now });
  for (let i = 0; i < 10; i++) p.decide('203.0.113.1');
  assert.equal(p.decide('203.0.113.1'), 'drop', 'jatah habis');
  j.maju(500); // 0,5 dtk pada 10/dtk = 5 token
  for (let i = 0; i < 5; i++) assert.equal(p.decide('203.0.113.1'), 'pass', `isi ulang ke-${i + 1}`);
  assert.equal(p.decide('203.0.113.1'), 'drop', 'tidak lebih dari yang terisi');
});

test('jatah tidak menumpuk melebihi kapasitas burst', () => {
  const j = jam();
  const p = makeLimiter({ perSecond: 10, burst: 10, now: j.now });
  j.maju(60_000); // menganggur satu menit
  let lolos = 0;
  for (let i = 0; i < 100; i++) if (p.decide('203.0.113.1') === 'pass') lolos++;
  assert.equal(lolos, 10, 'menganggur lama tidak boleh menabung 600 token');
});

test('satu blok yang dibanjiri TIDAK menjatuhkan blok lain', () => {
  const j = jam();
  const p = makeLimiter({ perSecond: 5, burst: 5, now: j.now });
  for (let i = 0; i < 50; i++) p.decide('203.0.113.9'); // blok A dibanjiri
  assert.equal(p.decide('198.51.100.9'), 'pass', 'blok B harus tetap dilayani');
});

test('perSecond=0 mematikan pembatas sepenuhnya', () => {
  const p = makeLimiter({ perSecond: 0 });
  assert.equal(p.active, false);
  for (let i = 0; i < 1000; i++) assert.equal(p.decide('203.0.113.1'), 'pass');
});

// ---- pembatasnya sendiri tidak boleh jadi senjata ----

test('count ember tidak tumbuh tanpa batas walau alamat sumber diacak', () => {
  const j = jam();
  const p = makeLimiter({ perSecond: 10, maxEntries: 500, now: j.now });
  // 20.000 BLOK sumber unik — persis pola serangan dengan alamat palsu.
  // Oktet terakhir sengaja tetap: dia dibuang oleh masker /24, jadi kalau cuma
  // itu yang divariasikan, semuanya jatuh ke satu ember dan tes ini tidak
  // menguji apa pun. (Versi pertama tes ini melakukan persis kesalahan itu.)
  for (let i = 0; i < 20000; i++) {
    p.decide(`10.${(i >> 8) & 255}.${i & 255}.1`);
  }
  assert.ok(p.stats.entries <= 500,
    `entri membengkak jadi ${p.stats.entries} — pembatas laju berubah jadi kebocoran memori`);
  assert.ok(p.stats.evicted > 0, 'harus ada entri yang diusir');
});

test('ember yang lama diam dibersihkan', () => {
  const j = jam();
  const p = makeLimiter({ perSecond: 10, entryTtlMs: 1000, maxEntries: 10, now: j.now });
  for (let i = 0; i < 5; i++) p.decide(`203.0.${i}.113`); // /24 yang benar-benar berbeda
  assert.equal(p.stats.entries, 5);
  j.maju(5000);
  p.sweepNow();
  assert.equal(p.stats.entries, 0, 'ember diam harus hilang, bukan menumpuk selamanya');
});

// ---- bentuk paket terpotong ----

test('balasan terpotong: TC=1, nol jawaban, dan LEBIH KECIL dari query', () => {
  const nama = 'panjang-banget-biar-kelihatan.203.0.113.10.a-i.st';
  const label = nama.split('.').map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]));
  const query = Buffer.concat([
    Buffer.from([0xab, 0xcd, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]),
    ...label, Buffer.from([0]), Buffer.from([0, 1, 0, 1]),
  ]);
  const r = buildTruncated(parseQuery(query));

  assert.equal(r.readUInt16BE(0), 0xabcd, 'id harus sama, kalau tidak klien mengabaikannya');
  assert.ok((r.readUInt16BE(2) & 0x8000) !== 0, 'QR harus menyala');
  assert.ok((r.readUInt16BE(2) & 0x0200) !== 0, 'TC harus menyala — ini seluruh gunanya');
  assert.equal(r.readUInt16BE(2) & 0x000f, 0, 'rcode NOERROR, bukan SERVFAIL');
  assert.equal(r.readUInt16BE(4), 1, 'pertanyaan tetap disalin');
  assert.equal(r.readUInt16BE(6), 0, 'nol jawaban');
  assert.ok(r.length <= query.length,
    `terpotong (${r.length}B) tidak boleh lebih besar dari query (${query.length}B) — itu malah mengamplifikasi`);
});
