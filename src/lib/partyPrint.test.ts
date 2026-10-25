import { describe, it, expect } from 'vitest';
import { partiesWithBalance } from './partyPrint';

describe('party list print', () => {
  it('keeps parties with due or advance and hides zero-balance parties', () => {
    const out = partiesWithBalance([
      { id: 'a', currentDue: 500, currentAdvance: 0 },
      { id: 'b', currentDue: 0, currentAdvance: 200 },
      { id: 'c', currentDue: 0, currentAdvance: 0 },
    ]);
    expect(out.map((p) => p.id)).toEqual(['a', 'b']);
  });
});
