/**
 * Robust cross-browser and iframe-safe printing and PDF export utility for RSR Vai Vai Enterprise
 * Uses modern html-to-image rasterization to support all CSS features (including OKLCH, Tailwind v4, Flexbox, Grid)
 * with zero parser errors and exact 1-Page A4 print-layout fidelity.
 */

import { toBlob, toPng } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * WhatsApp phone targets
 */
export const WHATSAPP_NUMBERS = {
  phone1: '01725550002',
  phone1Display: '01725-550002',
  phone2: '01746383825',
  phone2Display: '01746-383825',
};

/**
 * Execute 1-Page A4 Print seamlessly across all browsers and preview environments.
 * Opens a dedicated full-page print window with all A4 CSS styles and triggers the native print dialog.
 * The window and print dialog remain open until the user finishes printing (no auto-closing timeouts).
 */
export function executePrint(targetElementId?: string, documentTitle?: string): void {
  const docTitle = documentTitle || 'Print Document - RSR Vai Vai Enterprise';
  const elementId = targetElementId || 'printable-area';
  const targetEl = document.getElementById(elementId);

  if (!targetEl) {
    console.warn(`executePrint: Target element "${elementId}" not found`);
    return;
  }

  // Clone element content without buttons or interactive controls
  const clonedContent = targetEl.cloneNode(true) as HTMLElement;
  clonedContent.querySelectorAll('button, .no-print, .no-capture').forEach((el) => el.remove());

  // Collect all main document styles and link tags
  let styleTags = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((tag) => {
    styleTags += tag.outerHTML + '\n';
  });

  const printDocumentHtml = `
    <!DOCTYPE html>
    <html lang="bn">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${docTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
        ${styleTags}
        <style>
          @page {
            size: A4 portrait !important;
            margin: 6mm 8mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #f8fafc !important;
            color: #0f172a !important;
            font-family: 'Hind Siliguri', 'Outfit', system-ui, -apple-system, sans-serif !important;
          }
          .print-toolbar {
            position: sticky;
            top: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: #0f172a;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-family: system-ui, sans-serif;
          }
          .print-toolbar-title {
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-toolbar-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .print-btn {
            background: #10b981;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: background 0.15s ease;
          }
          .print-btn:hover {
            background: #059669;
          }
          .close-btn {
            background: #334155;
            color: #ffffff;
            border: none;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s ease;
          }
          .close-btn:hover {
            background: #475569;
          }
          .print-page-wrapper {
            max-width: 210mm;
            margin: 20px auto;
            padding: 16px;
            background: #ffffff;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
            border-radius: 12px;
          }
          .one-page-sheet {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          @media print {
            .print-toolbar, .no-print {
              display: none !important;
            }
            html, body {
              background: #ffffff !important;
            }
            .print-page-wrapper {
              margin: 0 !important;
              padding: 0 !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar no-print">
          <div class="print-toolbar-title">
            <span>📄 ${docTitle}</span>
          </div>
          <div class="print-toolbar-actions">
            <button class="print-btn" onclick="window.print()">
              🖨️ প্রিন্ট করুন (Print Now)
            </button>
            <button class="close-btn" onclick="window.close()">
              ✕ বন্ধ করুন
            </button>
          </div>
        </div>
        <div class="print-page-wrapper">
          ${clonedContent.outerHTML}
        </div>
      </body>
    </html>
  `;

  // Strategy 1: Open a dedicated full-page print window (Most reliable across all iframes and popups)
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank');
  } catch (openErr) {
    console.warn('window.open was blocked, falling back to direct window.print:', openErr);
  }

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(printDocumentHtml);
      printWindow.document.close();

      // Trigger print dialog once loaded
      printWindow.onload = () => {
        try {
          printWindow?.focus();
          printWindow?.print();
        } catch (printErr) {
          console.warn('Dedicated window print trigger error:', printErr);
        }
      };

      // Fallback trigger in case onload was already fired
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        } catch (e) {
          console.warn('Delayed dedicated print trigger error:', e);
        }
      }, 350);

      return;
    } catch (writeErr) {
      console.warn('Failed writing to dedicated print window:', writeErr);
    }
  }

  // Strategy 2: Direct Main-Window Print Fallback (if popups are blocked by browser)
  try {
    const originalTitle = document.title;
    document.title = docTitle;

    const existingStyle = document.getElementById('__rsr_print_override_styles__');
    if (existingStyle && existingStyle.parentNode) {
      existingStyle.parentNode.removeChild(existingStyle);
    }

    const fallbackStyleEl = document.createElement('style');
    fallbackStyleEl.id = '__rsr_print_override_styles__';
    fallbackStyleEl.innerHTML = `
      @media print {
        @page {
          size: A4 portrait !important;
          margin: 6mm 8mm !important;
        }
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          background: #ffffff !important;
          color: #0f172a !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          height: auto !important;
          font-family: 'Hind Siliguri', 'Outfit', system-ui, sans-serif !important;
        }
        .no-print, header, nav, aside, button, footer, .modal-backdrop {
          display: none !important;
        }
        body * {
          visibility: hidden !important;
        }
        #${elementId}, #${elementId} * {
          visibility: visible !important;
        }
        #${elementId} {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 210mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: #ffffff !important;
          color: #0f172a !important;
          display: block !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: avoid !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(fallbackStyleEl);

    const cleanup = () => {
      try {
        if (fallbackStyleEl && fallbackStyleEl.parentNode) {
          fallbackStyleEl.parentNode.removeChild(fallbackStyleEl);
        }
        document.title = originalTitle;
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.focus();
    window.print();
  } catch (mainPrintErr) {
    console.error('Direct window.print fallback error:', mainPrintErr);
  }
}

/**
 * Send text report directly to WhatsApp (Group, Phone 1, Phone 2, or custom phone)
 */
export function sendToWhatsApp(
  text: string,
  target: 'phone1' | 'phone2' | 'group' = 'group',
  customPhone?: string
): void {
  let phone = '';
  if (customPhone) {
    phone = customPhone.replace(/[^0-9]/g, '');
  } else if (target === 'phone1') {
    phone = WHATSAPP_NUMBERS.phone1;
  } else if (target === 'phone2') {
    phone = WHATSAPP_NUMBERS.phone2;
  }

  let url = '';
  if (phone) {
    // If not starting with country code, prepend 88 for Bangladesh
    const fullPhone = phone.startsWith('88') ? phone : `88${phone}`;
    url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  } else {
    // Group / Any Contact picker
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.error('Failed to open WhatsApp window:', e);
  }
}

/**
 * Fallback Canvas Generator in case DOM rasterization fails
 */
function createFallbackCanvas(element: HTMLElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1588; // 2x A4 width (794 * 2)
  canvas.height = 2246; // 2x A4 height (1123 * 2)
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Crisp White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border Frame
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('RSR VAI VAI ENTERPRISE', 80, 120);

  ctx.fillStyle = '#475569';
  ctx.font = '22px sans-serif';
  ctx.fillText('Authorized Business 1-Page Statement & Voucher', 80, 165);
  ctx.fillText(`Date: ${new Date().toLocaleDateString('bn-BD')}`, 80, 200);

  // Separator line
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 230);
  ctx.lineTo(canvas.width - 80, 230);
  ctx.stroke();

  // Content text extraction
  const lines = (element.innerText || element.textContent || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let y = 290;
  ctx.fillStyle = '#1e293b';
  ctx.font = '22px monospace';

  for (let i = 0; i < Math.min(lines.length, 55); i++) {
    const line = lines[i];
    if (y > canvas.height - 120) break;
    ctx.fillText(line.substring(0, 95), 80, y);
    y += 32;
  }

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 18px sans-serif';
  ctx.fillText('RSR Vai Vai Enterprise • 1-Page Smart Print & PDF System', 80, canvas.height - 60);

  return canvas;
}

/**
 * Capture DOM element (Invoice or Statement) and render as EXACT 1-Page A4 Sheet Image
 * Uses native svg/html-to-image rasterization supporting OKLCH, Tailwind v4 and modern CSS.
 */
export async function captureElementToBlob(elementId: string): Promise<Blob | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`captureElementToBlob: Element with id "${elementId}" not found`);
    return null;
  }

  try {
    const blob = await toBlob(element, {
      quality: 0.98,
      pixelRatio: 2, // 2x HD scaling for ultra crisp typography
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          return (
            !node.classList.contains('no-print') &&
            !node.classList.contains('no-capture') &&
            node.tagName !== 'BUTTON'
          );
        }
        return true;
      },
      style: {
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderRadius: '0px',
        boxShadow: 'none',
        margin: '0 auto',
      },
    });

    if (blob) return blob;

    // Fallback if toBlob returned null
    const fallbackCanvas = createFallbackCanvas(element);
    return new Promise<Blob | null>((resolve) => {
      fallbackCanvas.toBlob((fBlob) => resolve(fBlob), 'image/png', 0.95);
    });
  } catch (err) {
    console.warn('html-to-image error, using fallback canvas:', err);
    try {
      const fallbackCanvas = createFallbackCanvas(element);
      return new Promise<Blob | null>((resolve) => {
        fallbackCanvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
      });
    } catch (fallbackErr) {
      console.error('Fallback canvas generation failed:', fallbackErr);
      return null;
    }
  }
}

/**
 * Capture DOM element directly as high-resolution Data URL (Base64 PNG)
 */
export async function captureElementToDataUrl(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`captureElementToDataUrl: Element with id "${elementId}" not found`);
    return null;
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          return (
            !node.classList.contains('no-print') &&
            !node.classList.contains('no-capture') &&
            node.tagName !== 'BUTTON'
          );
        }
        return true;
      },
      style: {
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderRadius: '0px',
        boxShadow: 'none',
        margin: '0 auto',
      },
    });

    if (dataUrl) return dataUrl;
  } catch (err) {
    console.warn('toPng error, falling back to canvas:', err);
  }

  const blob = await captureElementToBlob(elementId);
  if (!blob) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Capture DOM element and export as clean, professional 1-Page A4 PDF file and auto-save/download
 */
export async function exportElementToPdf(
  elementId: string,
  fileName: string = 'document.pdf'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`exportElementToPdf: Element "${elementId}" not found`);
    return false;
  }

  try {
    const imgDataUrl = await captureElementToDataUrl(elementId);
    if (!imgDataUrl) {
      console.warn('Could not generate data URL for PDF export');
      return false;
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // 6mm margin for standard A4 document
    const margin = 6;
    const contentWidth = pdfWidth - margin * 2;

    // Create Image to measure dimensions
    const img = new Image();
    img.src = imgDataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const imgAspect = (img.height || 1400) / (img.width || 1000);
    const contentHeight = contentWidth * imgAspect;

    if (contentHeight <= pdfHeight - margin * 2) {
      pdf.addImage(imgDataUrl, 'PNG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    } else {
      // If content slightly exceeds single page, scale to fit 1-Page A4 precisely
      const scaledHeight = pdfHeight - margin * 2;
      const scaledWidth = scaledHeight / imgAspect;
      const xOffset = Math.max(margin, (pdfWidth - scaledWidth) / 2);
      pdf.addImage(imgDataUrl, 'PNG', xOffset, margin, scaledWidth, scaledHeight, undefined, 'FAST');
    }

    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(safeFileName);
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    return false;
  }
}

/**
 * Share invoice / sheet element directly as an image page to WhatsApp!
 * Also auto-saves PDF if requested.
 */
export async function sharePageAsImage(
  targetElementId: string,
  fileName: string = 'rsr-invoice.png',
  caption: string = '',
  target: 'phone1' | 'phone2' | 'group' = 'group',
  customPhone?: string,
  autoSavePdf: boolean = true
): Promise<{ success: boolean; method: string; message: string; blob?: Blob; file?: File; dataUrl?: string }> {
  try {
    const blob = await captureElementToBlob(targetElementId);
    if (!blob) {
      sendToWhatsApp(caption, target, customPhone);
      return {
        success: false,
        method: 'text-fallback',
        message: 'পেইজের ছবি তৈরি করা যায়নি, টেক্সট রিপোর্ট পাঠানো হয়েছে।',
      };
    }

    // Auto-save PDF document alongside image
    if (autoSavePdf) {
      const pdfName = fileName.replace(/\.(png|jpg|jpeg)$/i, '') + '.pdf';
      exportElementToPdf(targetElementId, pdfName).catch((err) =>
        console.warn('Auto PDF export failed:', err)
      );
    }

    const file = new File([blob], fileName, { type: 'image/png' });

    // 1. Try Native Web Share API with image file first (mobile/tablet/modern browser)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
          text: caption,
        });
        return {
          success: true,
          method: 'web-share',
          message: 'সরাসরি হোয়াটসঅ্যাপে পেইজ ছবি ও পিডিএফ শেয়ার করা হয়েছে!',
          blob,
          file,
        };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: true, method: 'aborted', message: 'শেয়ার বাতিল করা হয়েছে', blob, file };
        }
        console.warn('Navigator share error, falling back to download & WhatsApp open:', err);
      }
    }

    // 2. Clipboard copy (instant Ctrl+V into WhatsApp Web / Desktop)
    let copiedToClipboard = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        copiedToClipboard = true;
      } catch (clipErr) {
        console.warn('Clipboard write image failed:', clipErr);
      }
    }

    // 3. Auto-download PNG image file so user has it immediately
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (downloadErr) {
      console.warn('Image download link click failed:', downloadErr);
    }

    // 4. Open WhatsApp with formatted text
    const waText = caption
      ? `${caption}\n────────────────────────\n📄 [পৃষ্ঠার আসল ছবি ও PDF অটো-সেভ হয়েছে! চ্যাটে Ctrl+V চেপে পেস্ট করুন অথবা 📎 চেপে ফাইল পাঠান]`
      : '📄 [পৃষ্ঠার আসল ছবি ও PDF অটো-সেভ হয়েছে! চ্যাটে Ctrl+V চেপে পেস্ট করুন অথবা 📎 চেপে ফাইল পাঠান]';

    sendToWhatsApp(waText, target, customPhone);

    return {
      success: true,
      method: copiedToClipboard ? 'clipboard-and-download' : 'download-only',
      message: copiedToClipboard
        ? 'পেইজের ছবি কপি ও PDF ডাউনলোড হয়েছে! হোয়াটসঅ্যাপ চ্যাটে গিয়ে সরাসরি পেস্ট (Ctrl+V) করুন।'
        : 'পেইজের ছবি ও PDF ফাইল সেভ হয়েছে। হোয়াটসঅ্যাপ চ্যাটে পেপারক্লিপ (📎) চেপে পাঠান।',
      blob,
      file,
    };
  } catch (error) {
    console.error('Error sharing page image:', error);
    sendToWhatsApp(caption, target, customPhone);
    return {
      success: false,
      method: 'text-fallback',
      message: 'টেক্সট রিপোর্ট হোয়াটসঅ্যাপে পাঠানো হয়েছে।',
    };
  }
}
