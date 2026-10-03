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
