import { describe, it, expect } from 'vitest';

const mem: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = String(v); },
  removeItem: (k: string) => { delete mem[k]; },
};

describe('cloud download never removes restored local data', () => {
  it('keeps local-only records and takes cloud version for the same id', async () => {
    const { mergeById } = await import('./storage');
    const local = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }];
    const cloud = [{ id: 'a', v: 2 }];
    const out = mergeById(local, cloud);
    expect(out).toHaveLength(2);
    expect(out.find((r: any) => r.id === 'a').v).toBe(2);
    expect(out.find((r: any) => r.id === 'b').v).toBe(1);
  });
});
