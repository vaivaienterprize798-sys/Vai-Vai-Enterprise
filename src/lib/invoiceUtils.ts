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
  existingInvoices?: Invoice[]
): string => {
  const invoicesList =
    existingInvoices !== undefined && Array.isArray(existingInvoices)
      ? existingInvoices
      : storageService.getInvoices();

  const prefix = getInvoicePrefix(type, mode);
  const currentYear = new Date().getFullYear();

  // Filter invoices that belong to this category
  const matching = invoicesList.filter((inv) => {
    if (!inv || !inv.invoiceNo) return false;
    const invNoUpper = inv.invoiceNo.trim().toUpperCase();
    if (invNoUpper.startsWith(prefix.toUpperCase())) return true;
    if (type === 'general') {
      return inv.type === 'general' && inv.mode === mode;
    }
    return inv.type === type;
  });

  // Extract serial numbers.
  // Check if any matching invoice already uses a 4-digit serial (e.g. 0001, 0002)
  let maxSerial = 0;
  let hasFormattedSerial = false;

  for (const inv of matching) {
    const invNo = inv.invoiceNo.trim();
    // Match patterns like PREFIX-YYYY-NNNN or PREFIX-NNNN
    const parts = invNo.split('-');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (/^\d+$/.test(lastPart)) {
        const parsed = parseInt(lastPart, 10);
        if (!isNaN(parsed) && parsed > 0) {
          // If 4+ digits with leading zero or explicit sequence
          if (lastPart.length >= 4 || lastPart.startsWith('0')) {
            hasFormattedSerial = true;
            if (parsed > maxSerial) {
              maxSerial = parsed;
            }
          } else if (!hasFormattedSerial && parsed < 1900) {
            if (parsed > maxSerial) {
              maxSerial = parsed;
            }
          }
        }
      }
    }
  }

  // Determine starting serial
  let nextSerial = hasFormattedSerial ? maxSerial + 1 : Math.max(1, matching.length + 1);

  // Construct candidate invoice number
  let candidate = `${prefix}-${currentYear}-${String(nextSerial).padStart(4, '0')}`;

  // Ensure absolute uniqueness across all existing invoices
  const allExistingNos = new Set(
    invoicesList.map((i) => i.invoiceNo?.trim().toUpperCase()).filter(Boolean)
  );

  while (allExistingNos.has(candidate.toUpperCase())) {
    nextSerial++;
    candidate = `${prefix}-${currentYear}-${String(nextSerial).padStart(4, '0')}`;
  }

  return candidate;
};
