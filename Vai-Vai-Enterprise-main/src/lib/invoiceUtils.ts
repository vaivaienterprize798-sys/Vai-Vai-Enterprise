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
 * Generates the next sequential unique invoice number for a given invoice type and mode.
 * Format: PREFIX-YYYY-0001 (e.g., RSR-PUR-2026-0001, RSR-SAL-2026-0001, VVT-PROC-2026-0001)
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
  const prefix = getInvoicePrefix(type, mode).toUpperCase();
  const currentYear = new Date().getFullYear();
  const seriesHead = `${prefix}-${currentYear}-`;

  // Highest serial already used in this type's series for the current year
  let maxSerial = 0;
  for (const inv of invoicesList) {
    const no = inv.invoiceNo.trim().toUpperCase();
    if (!no.startsWith(seriesHead)) continue;
    const tail = no.slice(seriesHead.length);
    if (/^\d+$/.test(tail)) maxSerial = Math.max(maxSerial, parseInt(tail, 10));
  }

  const allExistingNos = new Set(invoicesList.map((i) => i.invoiceNo.trim().toUpperCase()));
  let nextSerial = maxSerial + 1;
  let candidate = `${seriesHead}${String(nextSerial).padStart(4, '0')}`;
  while (allExistingNos.has(candidate)) {
    nextSerial++;
    candidate = `${seriesHead}${String(nextSerial).padStart(4, '0')}`;
  }
  return candidate;
};

/** True when another invoice (different id) already uses this number. */
export const isInvoiceNoTaken = (invoiceNo: string, invoices: Invoice[], selfId?: string): boolean => {
  const key = (invoiceNo || '').trim().toUpperCase();
  return invoices.some((i) => i && i.id !== selfId && (i.invoiceNo || '').trim().toUpperCase() === key);
};
