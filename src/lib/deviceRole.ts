/**
 * Device role rules (মূল ডিভাইস / অতিরিক্ত ডিভাইস)
 *
 * - The device that already had business data when this rule shipped is the MAIN device.
 * - Any NEW device that logs in later becomes a SECONDARY device and remembers the moment
 *   it joined (`joinedAt`). It never receives old data (no seed file, no full download):
 *   it only receives cloud records written/updated AFTER it joined.
 * - Every cloud write is stamped with `_syncedAt` (ms). Records without a stamp, or stamped
 *   before `joinedAt`, are ignored on a secondary device. When the main device edits an old
 *   record, it gets a fresh stamp and therefore appears on the secondary device too.
 */
export type DeviceRole = 'main' | 'secondary';

const ROLE_KEY = 'vv_device_role';
const JOINED_KEY = 'vv_device_joined_at';

/** Collections every device needs regardless of age (logins / settings). */
const ALWAYS_SYNC = new Set(['staff', 'appSettings', 'company']);

const DATA_KEYS = ['rsr_invoices_v1', 'rsr_stock_v1', 'rsr_parties_v1', 'rsr_staff_v1'];

function ls(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

function hasExistingData(s: Storage): boolean {
  if (s.getItem('rsr_auto_uploaded_v1')) return true;
  return DATA_KEYS.some((k) => {
    try { const v = JSON.parse(s.getItem(k) || 'null'); return Array.isArray(v) && v.length > 0; } catch { return false; }
  });
}

/** Decide (once, permanently) the role of this device. Must run before any seed/restore. */
export function initDeviceRole(now: number = Date.now()): DeviceRole {
  const s = ls();
  if (!s) return 'main';
  const saved = s.getItem(ROLE_KEY) as DeviceRole | null;
  if (saved === 'main' || saved === 'secondary') return saved;
  const role: DeviceRole = hasExistingData(s) ? 'main' : 'secondary';
  s.setItem(ROLE_KEY, role);
  if (role === 'secondary') s.setItem(JOINED_KEY, String(now));
  return role;
}

export function getDeviceRole(): DeviceRole {
  return (ls()?.getItem(ROLE_KEY) as DeviceRole) || initDeviceRole();
}
export const isMainDevice = () => getDeviceRole() === 'main';
export function getJoinedAt(): number {
  return Number(ls()?.getItem(JOINED_KEY) || 0) || 0;
}

/** Manually promote this device to main (it will then see everything). */
export function setDeviceRole(role: DeviceRole): void {
  const s = ls(); if (!s) return;
  s.setItem(ROLE_KEY, role);
  if (role === 'secondary') s.setItem(JOINED_KEY, String(Date.now()));
  else s.removeItem(JOINED_KEY);
}

/** Add the sync stamp to an outgoing cloud record. */
export function stampForCloud<T extends object>(item: T, now: number = Date.now()): T & { _syncedAt: number } {
  return { ...(item as any), _syncedAt: now };
}

/** Keep only records this device is allowed to receive. */
export function filterForDevice<T>(collectionName: string, items: T[]): T[] {
  if (ALWAYS_SYNC.has(collectionName) || getDeviceRole() === 'main') return items;
  const joinedAt = getJoinedAt();
  return items.filter((it: any) => it && Number(it._syncedAt || 0) >= joinedAt);
}
