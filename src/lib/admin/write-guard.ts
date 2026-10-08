/**
 * Write-safety guard for the admin CMS.
 *
 * ALL mutation endpoints must call checkWritesEnabled() before performing any
 * MongoDB write or R2 write. If ADMIN_WRITES_ENABLED is not explicitly "true",
 * the request is rejected with 403.
 *
 * This provides a deliberate safety switch: the CMS is read-only by default.
 * Writes are only enabled after the admin UI and editor serialization have been
 * reviewed and explicitly authorized.
 */

import { forbidden } from './auth';

export interface EnvWithWrites {
  ADMIN_WRITES_ENABLED?: string;
  [key: string]: unknown;
}

export function isWritesEnabled(env: EnvWithWrites): boolean {
  return (env.ADMIN_WRITES_ENABLED || 'false').toLowerCase() === 'true';
}

/**
 * Checks if writes are enabled. Returns a 403 Response if not, or null if OK.
 * Usage: const guard = checkWritesEnabled(env); if (guard) return guard;
 */
export function checkWritesEnabled(env: EnvWithWrites): Response | null {
  if (!isWritesEnabled(env)) {
    return forbidden('Admin writes are currently disabled. Set ADMIN_WRITES_ENABLED=true to enable mutations.');
  }
  return null;
}
