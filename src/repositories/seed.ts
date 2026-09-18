// Seed Chart of Accounts & kategori default (22_ACCOUNTING_SPEC.md bagian 3,
// 20_DATABASE.md bagian 10).

import { uuidv7 } from '@/lib/uuid'
import type { Account, AccountType, Category, CategoryType } from '@/types'

export interface CoaDefinition {
  code: string
  name: string
  type: AccountType
  /** Kelompok laporan sesuai dokumen: COGS/HPP dan OPEX keduanya bertipe EXPENSE. */
  group: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS/HPP' | 'OPEX'
  normalBalance: 'DEBET' | 'KREDIT'
}

export const CHART_OF_ACCOUNTS: readonly CoaDefinition[] = [
  {
    code: '10100',
    name: 'Kas Tunai / Petty Cash',
    type: 'ASSET',
    group: 'ASSET',
    normalBalance: 'DEBET',
  },
  {
    code: '10200',
    name: 'Kas di Bank (Operasional & Payroll)',
    type: 'ASSET',
    group: 'ASSET',
    normalBalance: 'DEBET',
  },
  {
    code: '10300',
    name: 'E-Wallet / Payment Gateway Escrow',
    type: 'ASSET',
    group: 'ASSET',
    normalBalance: 'DEBET',
  },
  {
    code: '10400',
    name: 'Piutang Usaha (Accounts Receivable)',
    type: 'ASSET',
    group: 'ASSET',
    normalBalance: 'DEBET',
  },
  {
    code: '20100',
    name: 'Utang Usaha (Accounts Payable)',
    type: 'LIABILITY',
    group: 'LIABILITY',
    normalBalance: 'KREDIT',
  },
  {
    code: '20200',
    name: 'Utang Pajak & Beban Akrual',
    type: 'LIABILITY',
    group: 'LIABILITY',
    normalBalance: 'KREDIT',
  },
  {
    code: '30100',
    name: 'Modal Disetor',
    type: 'EQUITY',
    group: 'EQUITY',
    normalBalance: 'KREDIT',
  },
  {
    code: '30200',
    name: 'Laba Ditahan (Retained Earnings)',
    type: 'EQUITY',
    group: 'EQUITY',
    normalBalance: 'KREDIT',
  },
  {
    code: '40100',
    name: 'Pendapatan Operasional / Penjualan',
    type: 'REVENUE',
    group: 'REVENUE',
    normalBalance: 'KREDIT',
  },
  {
    code: '40200',
    name: 'Pendapatan Non-Operasional / Bunga',
    type: 'REVENUE',
    group: 'REVENUE',
    normalBalance: 'KREDIT',
  },
  {
    code: '50100',
    name: 'Biaya Pokok Jasa & Subkontraktor',
    type: 'EXPENSE',
    group: 'COGS/HPP',
    normalBalance: 'DEBET',
  },
  {
    code: '50200',
    name: 'Biaya Server & Dedicated Client Infrastructure',
    type: 'EXPENSE',
    group: 'COGS/HPP',
    normalBalance: 'DEBET',
  },
  {
    code: '60100',
    name: 'Gaji & Upah Tim',
    type: 'EXPENSE',
    group: 'OPEX',
    normalBalance: 'DEBET',
  },
  {
    code: '60200',
    name: 'Marketing & Customer Acquisition',
    type: 'EXPENSE',
    group: 'OPEX',
    normalBalance: 'DEBET',
  },
  {
    code: '60300',
    name: 'Software, Cloud Tools & Administrasi',
    type: 'EXPENSE',
    group: 'OPEX',
    normalBalance: 'DEBET',
  },
]

interface CategoryDefinition {
  name: string
  type: CategoryType
  defaultAccountCode: string
}

export const DEFAULT_CATEGORIES: readonly CategoryDefinition[] = [
  { name: 'Penjualan Jasa', type: 'INCOME', defaultAccountCode: '40100' },
  { name: 'Penjualan Produk', type: 'INCOME', defaultAccountCode: '40100' },
  { name: 'Pendapatan Bunga', type: 'INCOME', defaultAccountCode: '40200' },
  { name: 'Pendapatan Lain-lain', type: 'INCOME', defaultAccountCode: '40200' },
  { name: 'Subkontraktor & Freelancer', type: 'EXPENSE', defaultAccountCode: '50100' },
  { name: 'Server & Infrastruktur Klien', type: 'EXPENSE', defaultAccountCode: '50200' },
  { name: 'Gaji & Upah Tim', type: 'EXPENSE', defaultAccountCode: '60100' },
  { name: 'Marketing & Customer Acquisition', type: 'EXPENSE', defaultAccountCode: '60200' },
  { name: 'Software & Cloud Tools', type: 'EXPENSE', defaultAccountCode: '60300' },
  { name: 'Administrasi & Umum', type: 'EXPENSE', defaultAccountCode: '60300' },
  { name: 'Pajak & Beban Akrual', type: 'EXPENSE', defaultAccountCode: '20200' },
]

export function seedAccounts(): Account[] {
  const now = new Date().toISOString()
  return CHART_OF_ACCOUNTS.map((def) => ({
    id: uuidv7(),
    code: def.code,
    name: def.name,
    type: def.type,
    currency: 'IDR' as const,
    currentBalance: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }))
}

export function seedCategories(): Category[] {
  const now = new Date().toISOString()
  return DEFAULT_CATEGORIES.map((def) => ({
    id: uuidv7(),
    name: def.name,
    type: def.type,
    parentId: null,
    defaultAccountCode: def.defaultAccountCode,
    isActive: true,
    updatedAt: now,
  }))
}
