import { describe, it, expect, beforeEach } from 'vitest';
import { initDeviceRole, filterForDevice, stampForCloud, getDeviceRole } from './deviceRole';

const mem: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = String(v); },
  removeItem: (k: string) => { delete mem[k]; },
};

describe('device role rules', () => {
  beforeEach(() => { Object.keys(mem).forEach((k) => delete mem[k]); });

  it('device with existing data becomes main and sees all old records', () => {
    mem['rsr_invoices_v1'] = JSON.stringify([{ id: 'a' }]);
    expect(initDeviceRole(1000)).toBe('main');
    expect(filterForDevice('invoices', [{ id: 'old' }])).toHaveLength(1);
  });

  it('new device never receives records from before it joined', () => {
    expect(initDeviceRole(5000)).toBe('secondary');
    const out = filterForDevice('invoices', [{ id: 'old' }, { id: 'older', _syncedAt: 4999 }]);
    expect(out).toHaveLength(0);
  });

  it('new device receives updates made after it joined', () => {
    initDeviceRole(5000);
    const out = filterForDevice('invoices', [stampForCloud({ id: 'new' }, 6000)]);
    expect(out.map((x: any) => x.id)).toEqual(['new']);
  });

  it('staff list always syncs so staff can log in on a new device', () => {
    initDeviceRole(5000);
    expect(getDeviceRole()).toBe('secondary');
    expect(filterForDevice('staff', [{ id: 's1' }])).toHaveLength(1);
  });
});
