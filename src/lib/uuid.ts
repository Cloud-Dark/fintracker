// UUIDv7 (time-ordered) murni TypeScript — tanpa pustaka eksternal.
// Layout: 48 bit timestamp ms | 4 bit versi (7) | 12 bit rand_a
//         | 2 bit variant (10) | 62 bit rand_b

const HEX = '0123456789abcdef';

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i] as number;
    out += HEX[(b >>> 4) & 0x0f];
    out += HEX[b & 0x0f];
  }
  return out;
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  const c: Crypto | undefined = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(buf);
    return buf;
  }
  // Fallback non-kriptografis; hanya terpakai pada lingkungan tanpa Web Crypto.
  for (let i = 0; i < n; i += 1) buf[i] = Math.floor(Math.random() * 256);
  return buf;
}

// Penjaga monotonic dalam satu milidetik yang sama: counter 12 bit pada rand_a.
let lastMs = -1;
let lastSeq = 0;

export function uuidv7(): string {
  const bytes = randomBytes(16);
  let ms = Date.now();

  if (ms === lastMs) {
    lastSeq += 1;
    if (lastSeq > 0x0fff) {
      // Counter habis: dorong ke milidetik berikutnya agar tetap terurut.
      ms += 1;
      lastMs = ms;
      lastSeq = 0;
    }
  } else if (ms < lastMs) {
    // Jam mundur: pertahankan monotonic dengan melanjutkan dari lastMs.
    ms = lastMs;
    lastSeq += 1;
  } else {
    lastMs = ms;
    lastSeq = 0;
  }
  lastMs = ms;
  const seq = lastSeq & 0x0fff;

  // 48 bit timestamp big-endian.
  bytes[0] = Math.floor(ms / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(ms / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(ms / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(ms / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;

  // versi 7 + 12 bit counter
  bytes[6] = 0x70 | ((seq >>> 8) & 0x0f);
  bytes[7] = seq & 0xff;

  // variant RFC 4122 (10xxxxxx)
  bytes[8] = 0x80 | ((bytes[8] as number) & 0x3f);

  const h = toHex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return typeof v === 'string' && UUID_RE.test(v);
}
