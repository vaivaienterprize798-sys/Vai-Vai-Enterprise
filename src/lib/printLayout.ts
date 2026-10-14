/** Challans retain their existing fixed A4 layout; all other print targets flow normally. */
export function isChallanPrint(elementId: string): boolean {
  return elementId === 'invoice-print-area' || elementId === 'consignment-print-area';
}

export function continuousPrintStyles(): string {
  return `
@page { size: auto; margin: 6mm; }
html, body { width: 100% !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
.print-page-wrapper { width: 100% !important; max-width: none !important; height: auto !important; zoom: 1 !important; }
.print-page-wrapper > *, .print-page-wrapper .one-page-sheet { width: 100% !important; max-width: none !important; min-width: 0 !important; height: auto !important; max-height: none !important; overflow: visible !important; }
.print-page-wrapper, .print-page-wrapper * { break-before: auto !important; break-after: auto !important; break-inside: auto !important; page-break-before: auto !important; page-break-after: auto !important; page-break-inside: auto !important; }
.print-page-wrapper .sheet-freeze-wrapper, .print-page-wrapper .overflow-hidden { overflow: visible !important; max-height: none !important; }
.print-page-wrapper td, .print-page-wrapper th { white-space: normal !important; overflow-wrap: anywhere; }
.print-page-wrapper .truncate { white-space: normal !important; overflow: visible !important; text-overflow: clip !important; }
.print-page-wrapper .print-compact td, .print-page-wrapper .print-compact th { font-size: 12px !important; padding: 4px 6px !important; line-height: 1.4 !important; }
`;
}
