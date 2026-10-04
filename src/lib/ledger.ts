import { Invoice, Party } from '../types';

/**
 * Party ledger engine.
 *
 * Internally every party balance is a single signed number from OUR side:
 *   positive  = party owes us   (receivable)
 *   negative  = we owe party    (payable)
 *
 * Effect of each entry (processed in chronological order):
 *   sales invoice      : +netInvoiceAmount  - paidAmount (cash they gave us)
 *   purchase invoice   : -netInvoiceAmount  + paidAmount (cash we gave them)
 *   payment received   : saved as a sales entry with net 0  -> -paidAmount
 *   payment given      : saved as a purchase entry with net 0 -> +paidAmount
 *
 * The "previousBalance / grandTotal / remainingDue" fields on an invoice are
 * display snapshots only and are NEVER added to the balance (that caused
 * the old double counting).
 *
 * Opening balance is entered as a positive "due" number:
 *   supplier       -> we owe them  (payable)
 *   buyer / both   -> they owe us  (receivable)
 *   a negative opening value means an opening advance.
 *
 * currentDue / currentAdvance are then expressed in the party's natural
 * direction: for a supplier "due" = what we owe them, for a buyer "due" =
 * what they owe us; the opposite direction is "advance".
 */

export interface LedgerRow {
  invoice: Invoice;
  debit: number; // increases receivable (sales bill / payment given)
  credit: number; // decreases receivable (purchase bill / payment received)
  balance: number; // running signed balance after this row
}

export interface PartyLedger {
  openingSigned: number;
  rows: LedgerRow[];
  closingSigned: number;
  currentDue: number;
  currentAdvance: number;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Direction multiplier: +1 when "due" means party owes us, -1 when we owe party. */
export const partyDirection = (party: Pick<Party, 'type'>) => (party.type === 'supplier' ? -1 : 1);

export const openingToSigned = (party: Pick<Party, 'type' | 'openingBalance'>) =>
  num(party.openingBalance) * partyDirection(party);

export const signedToDueAdvance = (party: Pick<Party, 'type'>, signed: number) => {
  const natural = round2(signed * partyDirection(party));
  return {
    currentDue: natural > 0 ? natural : 0,
    currentAdvance: natural < 0 ? -natural : 0,
  };
};

/** Display value of a signed balance in the party's natural direction (+ = due, - = advance). */
export const signedToNatural = (party: Pick<Party, 'type'>, signed: number) =>
  round2(signed * partyDirection(party));

export const invoiceEffect = (inv: Invoice) => {
  const net = num(inv.netInvoiceAmount);
  const paid = num(inv.paidAmount);
  if (inv.mode === 'purchase') {
    return { debit: paid, credit: net };
  }
  return { debit: net, credit: paid };
};

export const invoiceBelongsToParty = (inv: Invoice, party: Pick<Party, 'id' | 'name'>) => {
  if (!inv || inv.type === 'processing') return false;
  if (inv.partyId) return inv.partyId === party.id;
  return (inv.partyName || '').trim().toLowerCase() === (party.name || '').trim().toLowerCase();
};

export const sortChronological = (a: Invoice, b: Invoice) => {
  const d = (a.date || '').localeCompare(b.date || '');
  if (d !== 0) return d;
  return (a.createdAt || '').localeCompare(b.createdAt || '');
};

export const computePartyLedger = (party: Party, invoices: Invoice[]): PartyLedger => {
  const openingSigned = openingToSigned(party);
  const list = (invoices || []).filter((inv) => invoiceBelongsToParty(inv, party)).sort(sortChronological);
  let running = openingSigned;
  const rows: LedgerRow[] = list.map((invoice) => {
    const { debit, credit } = invoiceEffect(invoice);
    running = round2(running + debit - credit);
    return { invoice, debit, credit, balance: running };
  });
  return {
    openingSigned,
    rows,
    closingSigned: running,
    ...signedToDueAdvance(party, running),
  };
};

/** Signed balance of a party just before a given date (exclusive). */
export const balanceBefore = (party: Party, invoices: Invoice[], date: string) => {
  const ledger = computePartyLedger(party, invoices);
  let bal = ledger.openingSigned;
  for (const r of ledger.rows) {
    if ((r.invoice.date || '') < date) bal = r.balance;
    else break;
  }
  return bal;
};

export const withComputedBalance = (party: Party, invoices: Invoice[]): Party => {
  const ledger = computePartyLedger(party, invoices);
  return {
    ...party,
    currentDue: ledger.currentDue,
    currentAdvance: ledger.currentAdvance,
    totalTransactions: ledger.rows.length,
  };
};

export const withComputedBalances = (parties: Party[], invoices: Invoice[]): Party[] =>
  (parties || []).filter(Boolean).map((p) => withComputedBalance(p, invoices));

/* ------------------------------------------------------------------ *
 * Period statements with automatic opening / closing carry-forward.   *
 * ------------------------------------------------------------------ *
 * Every statement (party ledger, shop account, cash book) is built from
 * a flat list of dated entries. For any period [from, to]:
 *   opening = base opening + net of every entry dated BEFORE `from`
 *   closing = opening + Dr - Cr of the entries inside the period
 * So yesterday's closing is always today's opening, and last month's
 * closing is always this month's opening - nothing is entered by hand.
 */

export interface StatementEntry {
  id: string;
  date: string;
  createdAt?: string;
  refNo: string;
  particulars: string;
  dr: number;
  cr: number;
  invoice?: Invoice;
}

export interface StatementRow extends StatementEntry {
  balance: number;
}

export interface PeriodStatement {
  opening: number;
  rows: StatementRow[];
  totalDr: number;
  totalCr: number;
  closing: number;
}

const byDateThenCreated = (a: { date: string; createdAt?: string }, b: { date: string; createdAt?: string }) =>
  (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '');

export const buildPeriodStatement = (
  entries: StatementEntry[],
  baseOpening: number,
  from?: string,
  to?: string
): PeriodStatement => {
  const sorted = [...(entries || [])].sort(byDateThenCreated);
  let opening = num(baseOpening);
  for (const e of sorted) {
    if (from && (e.date || '') < from) opening = round2(opening + num(e.dr) - num(e.cr));
  }
  let running = opening;
  let totalDr = 0;
  let totalCr = 0;
  const rows: StatementRow[] = [];
  for (const e of sorted) {
    const d = e.date || '';
    if (from && d < from) continue;
    if (to && d > to) continue;
    totalDr = round2(totalDr + num(e.dr));
    totalCr = round2(totalCr + num(e.cr));
    running = round2(running + num(e.dr) - num(e.cr));
    rows.push({ ...e, balance: running });
  }
  return { opening, rows, totalDr, totalCr, closing: running };
};

/** Opening balance of a given day = closing balance of the previous day. */
export const openingForDate = (entries: StatementEntry[], baseOpening: number, date: string) =>
  buildPeriodStatement(entries, baseOpening, date, date).opening;

/** Opening balance of a month (YYYY-MM) = closing balance of the previous month. */
export const openingForMonth = (entries: StatementEntry[], baseOpening: number, month: string) =>
  buildPeriodStatement(entries, baseOpening, `${month}-01`, `${month}-31`).opening;

const isPaymentInv = (inv: Invoice) =>
  inv.voucherKind === 'payment_received' ||
  inv.voucherKind === 'payment_given' ||
  (num(inv.netInvoiceAmount) === 0 && num(inv.paidAmount) > 0);

export const invoiceParticulars = (inv: Invoice, lang: 'bn' | 'en' = 'bn') => {
  if (isPaymentInv(inv)) {
    const received = inv.voucherKind ? inv.voucherKind === 'payment_received' : inv.mode === 'sales';
    return received
      ? lang === 'bn' ? 'পেমেন্ট গ্রহণ (Payment Received)' : 'Payment Received'
      : lang === 'bn' ? 'পেমেন্ট প্রদান (Payment Given)' : 'Payment Given';
  }
  if (inv.type === 'dokan') return lang === 'bn' ? 'দোকান ক্রয় ইনভয়েস' : 'Shop Purchase Invoice';
  return inv.mode === 'sales'
    ? lang === 'bn' ? 'বিক্রয় ইনভয়েস (Sales Invoice)' : 'Sales Invoice'
    : lang === 'bn' ? 'ক্রয় ইনভয়েস (Purchase Invoice)' : 'Purchase Invoice';
};

/**
 * Party ledger entries in the party's natural direction:
 *   Dr = invoice bill total (increases due), Cr = payments (decreases due).
 *   Balance > 0 = Due, Balance < 0 = Advance.
 */
export const partyStatementEntries = (party: Party, invoices: Invoice[], lang: 'bn' | 'en' = 'bn'): StatementEntry[] => {
  const dir = partyDirection(party);
  return (invoices || [])
    .filter((inv) => invoiceBelongsToParty(inv, party))
    .map((inv) => {
      const { debit, credit } = invoiceEffect(inv);
      const dr = dir === 1 ? debit : credit;
      const cr = dir === 1 ? credit : debit;
      return {
        id: inv.id,
        date: inv.date,
        createdAt: inv.createdAt,
        refNo: inv.invoiceNo,
        particulars: invoiceParticulars(inv, lang),
        dr: round2(dr),
        cr: round2(cr),
        invoice: inv,
      };
    });
};

/** Natural opening balance of a party (+ = Due, - = Advance). */
export const partyNaturalOpening = (party: Party) => num(party.openingBalance);

/** Full period statement for a party with carry-forward opening. */
export const partyPeriodStatement = (party: Party, invoices: Invoice[], from?: string, to?: string, lang: 'bn' | 'en' = 'bn') =>
  buildPeriodStatement(partyStatementEntries(party, invoices, lang), partyNaturalOpening(party), from, to);
