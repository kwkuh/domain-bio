// wire.js — encoder/decoder format paket DNS (RFC 1035) seperlunya.
// Cukup buat authoritative server sederhana: parse pertanyaan, susun jawaban.

// ---- Tipe record ----
export const TYPE = { A: 1, NS: 2, SOA: 6, TXT: 16, AAAA: 28, ANY: 255 };
export const CLASS_IN = 1;

// ---- Flag header ----
const QR = 0x8000; // ini response
const AA = 0x0400; // authoritative answer
const RD = 0x0100; // recursion desired (di-copy dari query)
export const RCODE = { OK: 0, FORMERR: 1, NXDOMAIN: 3, REFUSED: 5 };

/** Encode nama domain jadi label-label (mis. "ns1.a-i.sh" -> \x03ns1\x04a-i\x02sh\x00). */
export function encodeName(name) {
  const parts = name ? name.split('.') : [];
  const bufs = [];
  for (const p of parts) {
    const b = Buffer.from(p, 'ascii');
    if (b.length > 63) throw new Error('label kepanjangan');
    bufs.push(Buffer.from([b.length]), b);
  }
  bufs.push(Buffer.from([0]));
  return Buffer.concat(bufs);
}

// Pointer kompresi ke offset 12 (awal QNAME di pertanyaan) — hemat byte, standar.
const NAME_PTR = Buffer.from([0xc0, 0x0c]);

/** Susun satu resource record. nameBuf = NAME_PTR atau hasil encodeName(). */
function record(nameBuf, type, ttl, rdata) {
  const mid = Buffer.alloc(8);
  mid.writeUInt16BE(type, 0);
  mid.writeUInt16BE(CLASS_IN, 2);
  mid.writeUInt32BE(ttl, 4);
  const rdlen = Buffer.alloc(2);
  rdlen.writeUInt16BE(rdata.length, 0);
  return Buffer.concat([nameBuf, mid, rdlen, rdata]);
}

export const answerRecord = (type, ttl, rdata) => record(NAME_PTR, type, ttl, rdata);
export const namedRecord = (name, type, ttl, rdata) => record(encodeName(name), type, ttl, rdata);

/** RDATA buat SOA. */
export function soaRdata(zone, cfg) {
  const mname = encodeName(cfg.ns[0]);
  const rname = encodeName(`hostmaster.${zone}`);
  const nums = Buffer.alloc(20);
  nums.writeUInt32BE(cfg.serial >>> 0, 0);
  nums.writeUInt32BE(cfg.refresh, 4);
  nums.writeUInt32BE(cfg.retry, 8);
  nums.writeUInt32BE(cfg.expire, 12);
  nums.writeUInt32BE(cfg.minttl, 16);
  return Buffer.concat([mname, rname, nums]);
}

/** Parse query: ambil id, flags, nama pertanyaan pertama, qtype, plus byte pertanyaan mentah. */
export function parseQuery(buf) {
  if (buf.length < 12) throw new Error('paket kependekan');
  const id = buf.readUInt16BE(0);
  const flags = buf.readUInt16BE(2);
  const qdcount = buf.readUInt16BE(4);
  if (qdcount < 1) throw new Error('tanpa pertanyaan');

  let off = 12;
  const labels = [];
  while (true) {
    const len = buf[off];
    if (len === 0) { off += 1; break; }
    if ((len & 0xc0) === 0xc0) { off += 2; break; } // pointer (harusnya nggak ada di pertanyaan)
    labels.push(buf.toString('ascii', off + 1, off + 1 + len));
    off += 1 + len;
  }
  const qtype = buf.readUInt16BE(off);
  off += 4; // lewati qtype + qclass
  return { id, flags, name: labels.join('.'), qtype, questionSection: buf.subarray(12, off) };
}

/** Susun buffer response lengkap. */
export function buildResponse({ id, flags, questionSection }, { rcode = RCODE.OK, answers = [], authority = [] }) {
  const header = Buffer.alloc(12);
  const rd = flags & RD;
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(QR | AA | rd | rcode, 2);
  header.writeUInt16BE(1, 4); // qdcount
  header.writeUInt16BE(answers.length, 6);
  header.writeUInt16BE(authority.length, 8);
  header.writeUInt16BE(0, 10); // arcount
  return Buffer.concat([header, questionSection, ...answers, ...authority]);
}
