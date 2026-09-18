// Adapter localStorage aman (TR-001). Tidak ada komponen React yang boleh
// memanggil localStorage langsung; semua lewat modul ini.

export const NS = 'fintrack:v1';

export const KEYS = {
  meta: `${NS}:meta`,
  accounts: `${NS}:accounts`,
  categories: `${NS}:categories`,
  transactions: `${NS}:transactions`,
  ledgerEntries: `${NS}:ledger_entries`,
  attachments: `${NS}:attachments`,
  reconciliations: `${NS}:reconciliations`,
  settings: `${NS}:settings`,
  theme: `${NS}:theme`,
} as const;

export const ALL_KEYS: string[] = Object.values(KEYS);

export const QUOTA_BYTES = 5 * 1024 * 1024;

function getStore(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    // Probe: beberapa browser melempar saat storage diblokir.
    const probe = `${NS}:__probe__`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function readCollection<T>(key: string): T[] {
  const store = getStore();
  if (!store) return [];
  try {
    const raw = store.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeCollection<T>(key: string, rows: T[]): void {
  const store = getStore();
  if (!store) return;
  store.setItem(key, JSON.stringify(rows));
}

export function readObject<T>(key: string, fallback: T): T {
  const store = getStore();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeObject<T>(key: string, value: T): void {
  const store = getStore();
  if (!store) return;
  store.setItem(key, JSON.stringify(value));
}

export function hasKey(key: string): boolean {
  const store = getStore();
  if (!store) return false;
  try {
    return store.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* diabaikan: storage tidak tersedia */
  }
}

/** Snapshot seluruh kunci bernamespace untuk keperluan rollback. */
export function snapshot(): Record<string, string | null> {
  const store = getStore();
  const snap: Record<string, string | null> = {};
  if (!store) return snap;
  for (const key of ALL_KEYS) {
    try {
      snap[key] = store.getItem(key);
    } catch {
      snap[key] = null;
    }
  }
  return snap;
}

export function restore(snap: Record<string, string | null>): void {
  const store = getStore();
  if (!store) return;
  for (const [key, value] of Object.entries(snap)) {
    try {
      if (value === null) store.removeItem(key);
      else store.setItem(key, value);
    } catch {
      /* upaya pemulihan terbaik; kegagalan di sini tidak boleh menutupi error asli */
    }
  }
}

export function estimateUsage(): { bytes: number; ratio: number } {
  const store = getStore();
  if (!store) return { bytes: 0, ratio: 0 };
  let bytes = 0;
  for (const key of ALL_KEYS) {
    try {
      const raw = store.getItem(key);
      if (raw !== null) bytes += key.length + raw.length;
    } catch {
      /* lewati kunci yang tidak terbaca */
    }
  }
  return { bytes, ratio: bytes / QUOTA_BYTES };
}
