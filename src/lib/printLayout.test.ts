import { describe, expect, test } from 'bun:test';
import { isChallanPrint } from './printLayout';

describe('print layout selection', () => {
  test('sales and processing challans retain fixed A4 printing', () => {
    expect(isChallanPrint('invoice-print-area')).toBe(true);
  });
  test('consignment challans retain fixed A4 printing', () => {
    expect(isChallanPrint('consignment-print-area')).toBe(true);
  });
  test('all other print pages use continuous full-width printing', () => {
    for (const id of ['payment-voucher-print-area', 'statement-print-area', 'dokan-sheet-print',
      'rsr-daily-cashbook-print', 'rsr-price-list-print', 'worker-conversions-print',
      'party-ledger-print', 'cash-book-print', 'rsr-branch-office-ledger',
      'rsr-3rd-party-rmb-statement', 'rsr-china-consignments-statement',
      'rsr-china-remittances-statement', 'rsr-branch-office-statement', 'printable-area']) {
      expect(isChallanPrint(id)).toBe(false);
    }
  });
});
