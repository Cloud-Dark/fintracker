import { describe, expect, it } from 'vitest';
import { isUuid, uuidv7 } from '@/lib/uuid';
import { GENESIS_HASH, computeEntryHash, sha256Hex, sha256HexSync } from '@/lib/hash';
import { assertPositiveInt, formatCompact, formatIDR, parseIDR } from '@/lib/money';
import {
  daysBetween,
  endOfMonth,
  formatDateID,
  hoursBetween,
  monthKey,
  startOfMonth,
  toISODate,
} from '@/lib/date';

describe('uuidv7', () => {
  it('menghasilkan format kanonik 8-4-4-4-12', () => {
    const id = uuidv7();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(isUuid(id)).toBe(true);
  });

  it('menyetel versi 7 dan variant RFC 4122', () => {
    for (let i = 0; i < 50; i += 1) {
      const id = uuidv7();
      expect(id[14]).toBe('7');
      expect('89ab').toContain(id[19] as string);
    }
  });

  it('time-ordered: monotonic naik secara leksikografis', () => {
    const ids = Array.from({ length: 500 }, () => uuidv7());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('isUuid menolak string non-UUID', () => {
    expect(isUuid('bukan-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

describe('hash', () => {
  it('GENESIS_HASH adalah 64 karakter nol', () => {
    expect(GENESIS_HASH).toHaveLength(64);
    expect(GENESIS_HASH).toBe('0'.repeat(64));
  });

  it('sha256Hex mengembalikan 64 hex lowercase dan deterministik', async () => {
    const a = await sha256Hex('fintrack');
    const b = await sha256Hex('fintrack');
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(await sha256Hex('fintrackk')).not.toBe(a);
  });

  it('sha256Hex cocok dengan vektor uji resmi', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('sha256HexSync identik dengan versi async', async () => {
    const input = 'baris ledger|1|2|DEBIT|500000|101';
    expect(sha256HexSync(input)).toBe(await sha256Hex(input));
    expect(sha256HexSync('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('computeEntryHash deterministik dan sensitif terhadap perubahan field', async () => {
    const base = {
      prevHash: GENESIS_HASH,
      transactionId: 'tx-1',
      accountId: 'acc-1',
      entryType: 'DEBIT',
      amount: 500_000,
      sequenceNum: 1,
      createdAt: '2026-09-19T00:00:00.000Z',
    };
    const h1 = await computeEntryHash(base);
    const h2 = await computeEntryHash({ ...base });
    expect(h1).toHaveLength(64);
    expect(h1).toBe(h2);
    expect(await computeEntryHash({ ...base, amount: 500_001 })).not.toBe(h1);
    expect(await computeEntryHash({ ...base, entryType: 'CREDIT' })).not.toBe(h1);
    expect(h1).toBe(
      await sha256Hex(`${GENESIS_HASH}|tx-1|acc-1|DEBIT|500000|1|2026-09-19T00:00:00.000Z`),
    );
  });
});

describe('money', () => {
  it('formatIDR memformat gaya id-ID tanpa desimal', () => {
    expect(formatIDR(0)).toBe('Rp 0');
    expect(formatIDR(1000)).toBe('Rp 1.000');
    expect(formatIDR(5_000_000)).toBe('Rp 5.000.000');
  });

  it('formatIDR memakai kurung untuk nilai negatif', () => {
    expect(formatIDR(-1000)).toBe('(Rp 1.000)');
    expect(formatIDR(-1_200_000)).toBe('(Rp 1.200.000)');
  });

  it('formatIDR opsi sign menambahkan + pada nilai positif', () => {
    expect(formatIDR(1000, { sign: true })).toBe('+Rp 1.000');
    expect(formatIDR(0, { sign: true })).toBe('Rp 0');
  });

  it('formatCompact meringkas nominal besar', () => {
    expect(formatCompact(1_200_000)).toBe('Rp 1,2 jt');
    expect(formatCompact(850_000)).toBe('Rp 850 rb');
    expect(formatCompact(999)).toBe('Rp 999');
    expect(formatCompact(-1_200_000)).toBe('(Rp 1,2 jt)');
  });

  it('parseIDR membuang pemisah ribuan', () => {
    expect(parseIDR('1.000')).toBe(1000);
    expect(parseIDR('Rp 1.250.000')).toBe(1_250_000);
    expect(parseIDR('  5000 ')).toBe(5000);
    expect(parseIDR('(Rp 1.000)')).toBe(-1000);
    expect(parseIDR('-2.000')).toBe(-2000);
  });

  it('parseIDR mengembalikan NaN untuk input tidak valid', () => {
    expect(Number.isNaN(parseIDR('abc'))).toBe(true);
    expect(Number.isNaN(parseIDR(''))).toBe(true);
    expect(Number.isNaN(parseIDR('12,5'))).toBe(true);
  });

  it('assertPositiveInt melempar bila bukan integer positif', () => {
    expect(() => assertPositiveInt(1, 'amount')).not.toThrow();
    expect(() => assertPositiveInt(0, 'amount')).toThrow(/amount/);
    expect(() => assertPositiveInt(-5, 'amount')).toThrow(/amount/);
    expect(() => assertPositiveInt(1.5, 'amount')).toThrow(/amount/);
    expect(() => assertPositiveInt(Number.NaN, 'amount')).toThrow(/amount/);
  });
});

describe('date', () => {
  it('toISODate memakai komponen tanggal lokal', () => {
    expect(toISODate(new Date(2026, 8, 19))).toBe('2026-09-19');
    expect(toISODate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('startOfMonth dan endOfMonth', () => {
    const d = new Date(2026, 1, 14, 10, 30);
    expect(toISODate(startOfMonth(d))).toBe('2026-02-01');
    expect(toISODate(endOfMonth(d))).toBe('2026-02-28');
    expect(toISODate(endOfMonth(new Date(2024, 1, 5)))).toBe('2024-02-29');
  });

  it('monthKey mengambil YYYY-MM', () => {
    expect(monthKey('2026-09-19')).toBe('2026-09');
    expect(monthKey('2026-09-19T08:00:00.000Z')).toBe('2026-09');
  });

  it('daysBetween menghitung selisih hari', () => {
    expect(daysBetween('2026-09-01', '2026-09-30')).toBe(29);
    expect(daysBetween('2026-09-19', '2026-09-19')).toBe(0);
    expect(daysBetween('2026-09-30', '2026-09-01')).toBe(-29);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });

  it('hoursBetween menghitung selisih jam', () => {
    expect(
      hoursBetween('2026-09-19T00:00:00.000Z', '2026-09-19T12:00:00.000Z'),
    ).toBe(12);
    expect(
      hoursBetween('2026-09-19T00:00:00.000Z', '2026-09-21T00:00:00.000Z'),
    ).toBe(48);
    expect(
      hoursBetween('2026-09-19T12:00:00.000Z', '2026-09-19T00:00:00.000Z'),
    ).toBe(-12);
  });

  it('formatDateID memformat gaya Indonesia', () => {
    expect(formatDateID('2026-09-19')).toBe('19 Sep 2026');
    expect(formatDateID('2026-05-01T10:00:00.000Z')).toBe('1 Mei 2026');
  });
});
