// Unit-of-work: emulasi BEGIN/COMMIT/ROLLBACK di atas localStorage
// (20_DATABASE.md bagian 6, TR-002).

import { KEYS, restore, snapshot, writeCollection, writeObject } from './storage';

type StagedValue = { kind: 'collection'; rows: unknown[] } | { kind: 'object'; value: unknown };

// Urutan flush tetap agar kegagalan di tengah dapat dipulihkan deterministik.
const FLUSH_ORDER: string[] = [
  KEYS.accounts,
  KEYS.categories,
  KEYS.transactions,
  KEYS.ledgerEntries,
  KEYS.attachments,
  KEYS.reconciliations,
  KEYS.settings,
  KEYS.theme,
  KEYS.meta,
];

export interface UnitOfWork {
  stage<T>(key: string, rows: T[]): UnitOfWork;
  stageObject<T>(key: string, value: T): UnitOfWork;
  validate(fn: () => void): UnitOfWork;
  commit(): void;
}

export function createUnitOfWork(): UnitOfWork {
  const staged = new Map<string, StagedValue>();
  const validators: Array<() => void> = [];

  const uow: UnitOfWork = {
    stage<T>(key: string, rows: T[]) {
      staged.set(key, { kind: 'collection', rows: rows as unknown[] });
      return uow;
    },
    stageObject<T>(key: string, value: T) {
      staged.set(key, { kind: 'object', value });
      return uow;
    },
    validate(fn: () => void) {
      validators.push(fn);
      return uow;
    },
    commit(): void {
      // Validate — belum menyentuh localStorage sama sekali.
      for (const fn of validators) fn();

      const snap = snapshot();
      const ordered = [
        ...FLUSH_ORDER.filter((k) => staged.has(k)),
        ...[...staged.keys()].filter((k) => !FLUSH_ORDER.includes(k)),
      ];

      try {
        for (const key of ordered) {
          const entry = staged.get(key) as StagedValue;
          if (entry.kind === 'collection') writeCollection(key, entry.rows);
          else writeObject(key, entry.value);
        }
      } catch (err) {
        restore(snap);
        throw err;
      }
    },
  };

  return uow;
}
