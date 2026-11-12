// Заместител на Google „Utilities" — синхронни SHA-256/HMAC (същите байтове
// като в Apps Script, за да останат валидни паролите и токените), дати в София.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

function sha256(bytes) {
  const l = bytes.length, bitLen = l * 8;
  const n = ((l + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(n); m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 4, bitLen >>> 0); dv.setUint32(n - 8, Math.floor(bitLen / 0x100000000));
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15], b = W[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32), odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i]);
  return out;
}
const enc = new TextEncoder();
const utf8 = (s) => enc.encode(String(s));
function hmac256(msg, key) {
  let k = utf8(key);
  if (k.length > 64) k = sha256(k);
  const ip = new Uint8Array(64 + 0), op = new Uint8Array(64);
  for (let i = 0; i < 64; i++) { ip[i] = (k[i] || 0) ^ 0x36; op[i] = (k[i] || 0) ^ 0x5c; }
  const m = utf8(msg);
  const inner = new Uint8Array(64 + m.length); inner.set(ip); inner.set(m, 64);
  const ih = sha256(inner);
  const outer = new Uint8Array(96); outer.set(op); outer.set(ih, 64);
  return sha256(outer);
}
function b64(bytes) {
  let s = '';
  const u = Uint8Array.from(bytes, (x) => x & 255);
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

// Части на дата в дадена часова зона
const dtfCache = {};
function partsIn(d, tz) {
  const f = dtfCache[tz] || (dtfCache[tz] = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short' }));
  const o = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  const dow = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[o.weekday];
  return { yyyy: o.year, MM: o.month, dd: o.day, HH: o.hour === '24' ? '00' : o.hour, mm: o.minute, ss: o.second, u: String(dow) };
}
function formatDate(d, tz, pattern) {
  const p = partsIn(d, tz || 'UTC');
  let out = '', i = 0;
  while (i < pattern.length) {
    if (pattern[i] === "'") { const j = pattern.indexOf("'", i + 1); out += pattern.slice(i + 1, j); i = j + 1; continue; }
    const tok = ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss'].find((t) => pattern.startsWith(t, i));
    if (tok) { out += p[tok]; i += tok.length; continue; }
    if (pattern[i] === 'u') { out += p.u; i++; continue; }
    out += pattern[i++];
  }
  return out;
}

export const Utilities = {
  getUuid: () => crypto.randomUUID(),
  formatDate,
  computeDigest: (_alg, s) => Array.from(sha256(utf8(s))),
  computeHmacSha256Signature: (msg, key) => Array.from(hmac256(msg, key)),
  base64Encode: (b) => b64(b),
  base64EncodeWebSafe: (b) => b64(b).replace(/\+/g, '-').replace(/\//g, '_'),
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  Charset: { UTF_8: 'UTF_8' },
};
export { sha256, hmac256, partsIn };
