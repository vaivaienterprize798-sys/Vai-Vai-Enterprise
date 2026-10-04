/**
 * Carry-forward (rollover) helpers.
 *
 * Every running balance in the app follows the same rule:
 *   Opening of a period = Closing of everything before that period.
 *   Closing of a period = Opening + Dr - Cr of entries inside the period.
 * Nothing has to be typed in by hand each day or month.
 */

export interface LedgerMovement {
  id: string;
  date: string; // YYYY-MM-DD
  particulars: string;
  dr: number;
  cr: number;
}

export interface LedgerLine extends LedgerMovement {
  balance: number;
}

export interface RolledLedger {
  opening: number;
  rows: LedgerLine[];
  totalDr: number;
  totalCr: number;
  closing: number;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build a ledger for [periodStart, periodEnd] (inclusive, YYYY-MM-DD).
 * Pass '' as periodStart for "from the beginning" and '' as periodEnd for "until now".
 * initialOpening is the one-time setup balance (positive = Dr side).
 */
export function buildRolledLedger(
  initialOpening: number,
  movements: LedgerMovement[],
  periodStart = '',
  periodEnd = ''
): RolledLedger {
  const sorted = [...movements]
    .filter((m) => m && m.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let opening = num(initialOpening);
  for (const m of sorted) {
    if (periodStart && m.date < periodStart) opening += num(m.dr) - num(m.cr);
  }
  opening = round2(opening);

  let running = opening;
  let totalDr = 0;
  let totalCr = 0;
  const rows: LedgerLine[] = [];
  for (const m of sorted) {
    if (periodStart && m.date < periodStart) continue;
    if (periodEnd && m.date > periodEnd) continue;
    running = round2(running + num(m.dr) - num(m.cr));
    totalDr += num(m.dr);
    totalCr += num(m.cr);
    rows.push({ ...m, dr: num(m.dr), cr: num(m.cr), balance: running });
  }
  return { opening, rows, totalDr: round2(totalDr), totalCr: round2(totalCr), closing: running };
}

export type PeriodMode = 'today' | 'month' | 'date' | 'range' | 'all';

/** Convert the app's period filter into an inclusive [start, end] date window. */
export function periodBounds(
  mode: PeriodMode,
  opts: { today?: string; selectedDate?: string; selectedMonth?: string; startDate?: string; endDate?: string }
): { start: string; end: string } {
  switch (mode) {
    case 'today':
      return { start: opts.today || '', end: opts.today || '' };
    case 'date':
      return { start: opts.selectedDate || '', end: opts.selectedDate || '' };
    case 'month':
      return opts.selectedMonth
        ? { start: `${opts.selectedMonth}-01`, end: `${opts.selectedMonth}-31` }
        : { start: '', end: '' };
    case 'range':
      return { start: opts.startDate || '', end: opts.endDate || '' };
    default:
      return { start: '', end: '' };
  }
}

/** China Office Net Profit/Loss = Closing Balance - (Party Payments + Other Costs). */
export function chinaNetProfit(chinaClosing: number, partyPayments: number, otherCosts: number): number {
  return round2(num(chinaClosing) - (num(partyPayments) + num(otherCosts)));
}

export interface BranchOpeningBalance {
  amount: number;
  side: 'dr' | 'cr'; // dr = China Office owes us, cr = we owe China Office (advance)
  date?: string;
}

export const signedBranchOpening = (o?: BranchOpeningBalance | null) =>
  o ? (o.side === 'cr' ? -1 : 1) * num(o.amount) : 0;

/**
 * China / Branch Office ledger.
 *   Dr = value of goods sent to China Office (consignments)
 *   Cr = direct cash sent from China Office + RMB converted to BDT
 */
export function chinaOfficeMovements(
  consignments: { id: string; date: string; consignmentNo?: string; totalBdtValue?: number }[],
  conversions: { id: string; date: string; voucherNo?: string; partyName?: string; expectedBdtAmount?: number; receivedBdtAmount?: number }[],
  directs: { id: string; date: string; referenceNo?: string; amountBdt?: number }[],
  lang: 'bn' | 'en' = 'bn'
): LedgerMovement[] {
  const bn = lang === 'bn';
  return [
    ...consignments.map((c) => ({
      id: `bc-${c.id}`,
      date: c.date,
      particulars: `${bn ? 'মাল প্রেরণ চালান' : 'Goods sent'} ${c.consignmentNo || ''}`.trim(),
      dr: num(c.totalBdtValue),
      cr: 0,
    })),
    ...directs.map((d) => ({
      id: `cd-${d.id}`,
      date: d.date,
      particulars: `${bn ? 'চীন অফিস থেকে সরাসরি টাকা' : 'Direct cash from China Office'} ${d.referenceNo || ''}`.trim(),
      dr: 0,
      cr: num(d.amountBdt),
    })),
    ...conversions.map((cv) => ({
      id: `cv-${cv.id}`,
      date: cv.date,
      particulars: `${bn ? 'RMB → টাকা কনভার্শন' : 'RMB converted to BDT'} ${cv.voucherNo || ''}${cv.partyName ? ` (${cv.partyName})` : ''}`.trim(),
      dr: 0,
      cr: num(cv.expectedBdtAmount || cv.receivedBdtAmount),
    })),
  ];
}
