import { describe, expect, test } from 'bun:test';
import { buildRolledLedger, chinaNetProfit, periodBounds, signedBranchOpening } from './rollover';

const mv = [
  { id: '1', date: '2026-09-05', particulars: 'goods', dr: 1000, cr: 0 },
  { id: '2', date: '2026-09-20', particulars: 'cash', dr: 0, cr: 300 },
  { id: '3', date: '2026-10-02', particulars: 'goods', dr: 500, cr: 0 },
];

describe('rollover', () => {
  test("last month's closing becomes this month's opening", () => {
    const sep = buildRolledLedger(200, mv, '2026-09-01', '2026-09-31');
    const oct = buildRolledLedger(200, mv, '2026-10-01', '2026-10-31');
    expect(sep.closing).toBe(900);
    expect(oct.opening).toBe(sep.closing);
    expect(oct.closing).toBe(1400);
  });
  test('net profit = closing - (party payments + other costs)', () => {
    expect(chinaNetProfit(10000, 6000, 1500)).toBe(2500);
  });
  test('advance opening is negative', () => {
    expect(signedBranchOpening({ amount: 500, side: 'cr' })).toBe(-500);
  });
  test('month bounds', () => {
    expect(periodBounds('month', { selectedMonth: '2026-10' })).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });
});
