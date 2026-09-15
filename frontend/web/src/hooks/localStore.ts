import { emptyLocalData, parseLocalData, STORAGE_KEY } from './localData';
import type { LocalData } from './localData';

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
/** One store per app instance; writes happen outside React state updaters. */
export function createLocalStore(storage: StorageAccess) {
  let data = emptyLocalData();
  let storageAvailable = true;
  try {
    data = parseLocalData(storage.getItem(STORAGE_KEY));
  } catch {
    storageAvailable = false;
  }
  let snapshot = { data, storageAvailable };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update: (change: (previous: LocalData) => LocalData): void => {
      data = change(snapshot.data);
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
        storageAvailable = true;
      } catch {
        storageAvailable = false;
      }
      snapshot = { data, storageAvailable };
      listeners.forEach((listener) => listener());
    },
  };
}
