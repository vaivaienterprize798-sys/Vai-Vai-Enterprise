import { Invoice, InvoiceType, InvoiceMode, Language } from '../types';
import { storageService } from './storage';

/**
 * Returns the standardized prefix for an invoice based on its type and transaction mode.
 * Each invoice type maintains its own unique sequence.
 */
export const getInvoicePrefix = (type: InvoiceType, mode: InvoiceMode = 'purchase'): string => {
  if (type === 'processing') return 'VVT-PROC';
  if (type === 'commercial') return 'RSR-COM';
  if (type === 'dokan') return 'RSR-DOK';
  // General invoices maintain separate serials for Purchase and Sales
  return mode === 'purchase' ? 'RSR-PUR' : 'RSR-SAL';
};

/**
 * Returns human-readable label for the invoice category
 */
export const getInvoiceTypeLabel = (
  type: InvoiceType,
  mode: InvoiceMode = 'purchase',
  lang: Language = 'bn'
): string => {
  if (type === 'processing') {
    return lang === 'bn' ? 'প্রসেসিং চালান (5G)' : 'Processing Challan (5G)';
  }
  if (type === 'commercial') {
    return lang === 'bn' ? 'কমার্শিয়াল চালান' : 'Commercial Invoice';
  }
  if (type === 'dokan') {
    return lang === 'bn' ? 'দোকান হিসাব/ক্রয়' : 'Shop Purchase (Dokan)';
  }
  if (mode === 'sales') {
    return lang === 'bn' ? 'জেনারেল বিক্রয়' : 'General Sales';
  }
  return lang === 'bn' ? 'জেনারেল ক্রয়' : 'General Purchase';
};

/**
 * Generic sequential serial generator shared by every invoice / voucher series.
 * Format: PREFIX-001, PREFIX-002 ... (min 3 digits, grows automatically).
 * The next number is always (highest existing serial in this series) + 1, so
 * numbers never repeat and never skip. Legacy numbers in the old
 * PREFIX-YYYY-0001 format are understood and continue the same sequence.
 */
export const generateNextSerial = (prefix: string, existingNos: (string | undefined | null)[]): string => {
  const head = `${prefix.toUpperCase()}-`;
  const used = new Set<string>();
  let maxSerial = 0;
  for (const raw of existingNos) {
    const no = (raw || '').trim().toUpperCase();
    if (!no) continue;
    used.add(no);
    if (!no.startsWith(head)) continue;
    const m = no.slice(head.length).match(/^(?:\d{4}-)?(\d+)$/);
    if (m) maxSerial = Math.max(maxSerial, parseInt(m[1], 10));
  }
  let next = maxSerial + 1;
  let candidate = `${head}${String(next).padStart(3, '0')}`;
  while (used.has(candidate)) {
    next++;
    candidate = `${head}${String(next).padStart(3, '0')}`;
  }
  return candidate;
};

/** Voucher prefixes for party payments (receipts / payments given) and shop payments. */
export const PAYMENT_RECEIVED_PREFIX = 'RSR-RCV';
export const PAYMENT_GIVEN_PREFIX = 'RSR-PMT';
export const DOKAN_PAYMENT_PREFIX = 'RSR-DKP';

/**
 * Generates the next sequential unique invoice number for a given invoice type and mode.
 * Format: PREFIX-001 (e.g., RSR-PUR-001, RSR-SAL-002, VVT-PROC-003)
 */
export const generateNextInvoiceNo = (
  type: InvoiceType,
  mode: InvoiceMode = 'purchase',
  existingInvoices?: Invoice[],
  excludeId?: string
): string => {
  const invoicesList = (Array.isArray(existingInvoices) ? existingInvoices : storageService.getInvoices()).filter(
    (i) => i && i.invoiceNo && i.id !== excludeId
  );
  return generateNextSerial(getInvoicePrefix(type, mode), invoicesList.map((i) => i.invoiceNo));
};

/** Next payment voucher number (party payment received / given). */
export const generateNextPaymentVoucherNo = (direction: 'receive' | 'pay', existingInvoices?: Invoice[]): string => {
  const list = Array.isArray(existingInvoices) ? existingInvoices : storageService.getInvoices();
  return generateNextSerial(
    direction === 'receive' ? PAYMENT_RECEIVED_PREFIX : PAYMENT_GIVEN_PREFIX,
    list.map((i) => i?.invoiceNo)
  );
};

/** True when an invoice is actually a party payment voucher (no products). */
export const isPaymentVoucher = (inv: Invoice): boolean =>
  !!inv &&
  (inv.voucherKind === 'payment_received' ||
    inv.voucherKind === 'payment_given' ||
    (Number(inv.netInvoiceAmount) === 0 &&
      Number(inv.paidAmount) > 0 &&
      (inv.items || []).every((it) => it.code === 'PAY-IN' || it.code === 'PAY-OUT' || !it.total)));

/** True when another invoice (different id) already uses this number. */
export const isInvoiceNoTaken = (invoiceNo: string, invoices: Invoice[], selfId?: string): boolean => {
  const key = (invoiceNo || '').trim().toUpperCase();
  return invoices.some((i) => i && i.id !== selfId && (i.invoiceNo || '').trim().toUpperCase() === key);
};
