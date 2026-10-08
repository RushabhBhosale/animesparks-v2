import { createHash } from 'node:crypto';

function canonicalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

export function contentFingerprint(snapshot) {
  const canonical = JSON.stringify(canonicalize(snapshot));
  return createHash('sha256').update(canonical).digest('hex');
}
