import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringkas } from '../monitor/stats.js';

const baris = (o) => JSON.stringify({ t: '2026-08-01T11:00:00Z', c: '8.8.8.0/24', q: 'A', r: 0, h: 'pass', x: 'udp', ...o });

// ---- penggolongan: bagian yang menentukan angka boleh dipercaya atau tidak ----

test('cuma nama yang menghasilkan alamat yang dihitung sebagai pemakaian', () => {
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st' }),
    baris({ n: '5-6-7-8.a-i.sh' }),
    baris({ n: '0a000001.a-i.st' }),
    baris({ n: '2001-db8--1.a-i.st' }),
  ]);
  assert.equal(r.golongan.layanan, 4);
  assert.equal(r.golongan.infrastruktur, 0);
});

test('🚨 pencarian ns1/ns2 TIDAK boleh dihitung sebagai pemakaian', () => {
  // Terukur di hari pertama produksi: 1.378 dari 3.772 query cuma resolver mencari
  // alamat nameserver kita. Kalau ini ikut dihitung, angka "pemakaian" naik sendiri
  // setiap kali ada yang me-resolve zone-nya — tanpa satu pun orang memakainya.
  const r = ringkas([
    baris({ n: 'ns1.a-i.sh' }),
    baris({ n: 'ns2.a-i.st', q: 'AAAA' }),
    baris({ n: 'a-i.st', q: 'SOA' }),
    baris({ n: 'a-i.sh', q: 'NS' }),
    baris({ n: '1.2.3.4.a-i.st' }),
  ]);
  assert.equal(r.golongan.infrastruktur, 4);
  assert.equal(r.golongan.layanan, 1);
  assert.equal(r.tujuanUnik, 1, 'alamat tujuan cuma dihitung dari golongan layanan');
});

test('pemindai dan errors ketik masuk derau, bukan pemakaian', () => {
  const r = ringkas([
    baris({ n: 'login.a-i.st' }),
    baris({ n: 'fileshare.a-i.sh' }),
    baris({ n: 'foo.bar.a-i.st' }),
  ]);
  assert.equal(r.golongan.derau, 3);
  assert.equal(r.golongan.layanan, 0);
  assert.equal(r.tujuanUnik, 0);
});

test('nama di luar zone masuk golongan ditolak', () => {
  const r = ringkas([baris({ n: 'google.com' }), baris({ n: 'example.org' })]);
  assert.equal(r.golongan.ditolak, 2);
  assert.equal(r.golongan.layanan, 0);
});

// ---- lalu lintas sendiri ----

test('🚨 lalu lintas kita sendiri dibuang sebelum dihitung', () => {
  // Monitor jalan tiap 30 menit dengan alamat acak. Tanpa saringan ini, grafiknya
  // naik terus selamanya tanpa satu pun pengguna nyata — grafik yang naik cuma
  // karena kita menatapnya.
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st', c: '5.78.141.0/24' }),
    baris({ n: '9.9.9.9.a-i.st', c: '5.78.141.0/24' }),
    baris({ n: '8.8.8.8.a-i.st', c: '1.1.1.0/24' }),
  ], { abaikanBlok: ['5.78.141.'] });
  assert.equal(r.diabaikan, 2);
  assert.equal(r.query, 1);
  assert.equal(r.tujuanUnik, 1, 'alamat dari lalu lintas sendiri tidak boleh ikut terhitung');
});

// ---- alamat tujuan unik: penanda pertumbuhan ----

test('alamat yang sama lewat ejaan berbeda dihitung SEKALI', () => {
  // 1.2.3.4 dan 1-2-3-4 dan 01020304 menunjuk mesin yang sama. Menghitungnya tiga
  // kali membuat pertumbuhan terlihat tiga kali lipat dari yang sebenarnya.
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st' }),
    baris({ n: '1-2-3-4.a-i.sh' }),
    baris({ n: '01020304.a-i.st' }),
    baris({ n: 'app.1.2.3.4.a-i.st' }),
  ]);
  assert.equal(r.golongan.layanan, 4);
  assert.equal(r.tujuanUnik, 1, 'empat ejaan, satu mesin');
});

test('alamat berbeda dihitung terpisah', () => {
  const r = ringkas([
    baris({ n: '1.2.3.4.a-i.st' }),
    baris({ n: '5.6.7.8.a-i.st' }),
    baris({ n: '2001-db8--1.a-i.st', q: 'AAAA' }),
  ]);
  assert.equal(r.tujuanUnik, 3);
});

// ---- keluaran tidak boleh membocorkan apa pun ----

test('🚨 keluaran cuma berisi angka — nol nama, nol alamat, nol blok', () => {
  const r = ringkas([
    baris({ n: 'rahasia-banget.203.0.113.77.a-i.st', c: '198.51.100.0/24' }),
    baris({ n: 'ns1.a-i.sh', c: '2001:db8::/48' }),
  ]);
  const teks = JSON.stringify(r);
  assert.ok(!teks.includes('rahasia-banget'), 'nama query bocor ke ringkasan');
  assert.ok(!teks.includes('203.0.113.77'), 'alamat tujuan bocor ke ringkasan');
  assert.ok(!teks.includes('198.51.100'), 'blok resolver bocor ke ringkasan');
  assert.ok(!teks.includes('2001:db8'), 'blok resolver v6 bocor ke ringkasan');
  // Yang boleh ada cuma jumlahnya.
  assert.equal(r.tujuanUnik, 1);
  assert.equal(r.blokResolver, 1);
});

test('baris rusak dihitung terpisah, tidak menjatuhkan sisanya', () => {
  const r = ringkas(['{bukan json', baris({ n: '1.2.3.4.a-i.st' }), '', '{}']);
  assert.equal(r.query, 1);
  assert.equal(r.rusak, 2, 'baris rusak dan baris tanpa nama sama-sama dicatat rusak');
});
