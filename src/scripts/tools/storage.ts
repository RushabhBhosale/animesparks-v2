// Versioned, namespaced localStorage access for tools. Every read and write
// tolerates private mode, quota errors and corrupted values. Records carry
// `updatedAt` so a later account sync can merge by recency.

const PREFIX = 'animesparks:tools:v1:';

export interface StoredRecord<T> {
  value: T;
  updatedAt: string;
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StoredRecord<T>;
    return parsed && 'value' in parsed ? parsed.value : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): boolean {
  try {
    const record: StoredRecord<T> = { value, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
