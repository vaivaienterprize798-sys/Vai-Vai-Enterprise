import React, { useState } from 'react';
import { Printer, ArrowLeft, Phone, Mail, MapPin, Download } from 'lucide-react';
import { Invoice, Language } from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';
import { storageService } from '../lib/storage';
import { executePrint, exportElementToPdf } from '../lib/printUtils';
import { CompanyLogo } from './CompanyLogo';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { PaymentVoucherView } from './PaymentVoucherView';
import { isPaymentVoucher } from '../lib/invoiceUtils';

interface InvoicePrintViewProps {
  invoice: Invoice;
  lang: Language;
  onBack: () => void;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = (props) => {
  // Payment entries get their own voucher / receipt layout (no product table)
  if (isPaymentVoucher(props.invoice)) return <PaymentVoucherView {...props} />;
  return <ProductInvoicePrintView {...props} />;
};

const ProductInvoicePrintView: React.FC<InvoicePrintViewProps> = ({
  invoice,
  lang,
  onBack,
}) => {
  const t = translations[lang];
  const company = storageService.getCompanyInfo();
  const isProcessing = invoice.type === 'processing';
  const headerCompanyName = isProcessing ? company.processingName : company.name;

  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    executePrint('invoice-print-area', `${headerCompanyName} - ${invoice.invoiceNo}`);
    setTimeout(() => setIsPrinting(false), 800);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    await exportElementToPdf('invoice-print-area', `invoice-${invoice.invoiceNo}.pdf`);
    setIsExportingPdf(false);
  };

  const getInvoiceWhatsAppText = () => {
    return `*${headerCompanyName} - ${invoice.mode === 'purchase' ? 'ক্রয় রশিদ (Purchase Invoice)' : 'বিক্রয় চালান (Sales Invoice)'}*
📄 *ইনভয়েস নং:* ${invoice.invoiceNo}
📅 *তারিখ:* ${invoice.date}
👤 *পার্টি:* ${invoice.partyName}
📞 *মোবাইল:* ${invoice.partyPhone || 'N/A'}
📍 *ঠিকানা:* ${invoice.partyAddress || 'N/A'}
────────────────────────
*পণ্য বিবরণী:*
${invoice.items.map((it, i) => `${i + 1}. ${it.name} | ${it.quantity} ${it.unit} @ ৳${it.unitPrice} = ৳${it.total.toLocaleString()}`).join('\n')}
────────────────────────
💰 *মোট বিল (Subtotal):* ৳${invoice.subtotal.toLocaleString()}
${invoice.courierDeduction > 0 ? `📦 *কুরিয়ার বাদ:* -৳${invoice.courierDeduction.toLocaleString()}\n` : ''}💵 *নেট বিল:* ৳${invoice.netInvoiceAmount.toLocaleString()}
${invoice.previousBalance !== 0 ? `⏳ *পূর্বের ${invoice.previousBalance > 0 ? 'বাকি' : 'জমা'}:* ৳${Math.abs(invoice.previousBalance).toLocaleString()}\n` : ''}🏁 *সর্বমোট প্রদেয় (Grand Total):* ৳${invoice.grandTotal.toLocaleString()}
${invoice.notes ? `📝 *নোট:* ${invoice.notes}\n` : ''}
_আরএসআর ভাই ভাই এন্টারপ্রাইজ_`;
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareDropdown
            getText={getInvoiceWhatsAppText}
            lang={lang}
            targetElementId="invoice-print-area"
            fileName={`invoice-${invoice.invoiceNo}.png`}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান (ছবি/টেক্সট)' : 'Share on WhatsApp'}
          />

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title={lang === 'bn' ? '১-পেজ A4 PDF ডাউনলোড করুন' : 'Download 1-Page A4 PDF'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? (lang === 'bn' ? 'পিডিএফ তৈরি...' : 'Exporting...') : (lang === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF')}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? (lang === 'bn' ? 'প্রিন্ট ডায়ালগ খুলছে...' : 'Opening...') : `${t.printNow} (1-Page A4)`}</span>
          </button>
        </div>
      </div>

      {/* 1-Page Printable Sheet (A4 Fit) */}
      <div
        id="invoice-print-area"
        className="one-page-sheet max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0"
      >
        {/* Company Header with Logo */}
        <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start gap-4">
          <div className="flex items-start gap-3">
            <CompanyLogo customLogoUrl={company.logoUrl} className="w-14 h-14 shrink-0" />
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                {headerCompanyName}
              </h1>
              <p className="text-xs font-medium text-slate-700">
                {lang === 'bn' ? company.businessTypeBn : company.businessTypeEn}
              </p>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{company.address}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    {company.phones.join(', ')}
                  </span>
                  {company.email && (
                    <span className="flex items-center gap-1 font-mono">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      {company.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Meta Stamp */}
          <div className="text-right space-y-1 shrink-0">
            <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-md font-mono font-bold text-xs uppercase">
              {invoice.type.toUpperCase()}{' '}
              {invoice.mode === 'purchase'
                ? lang === 'bn'
                  ? 'ক্রয় চালান'
                  : 'PURCHASE'
                : lang === 'bn'
                ? 'বিক্রয় মেমো'
                : 'SALES'}
            </div>
            <div className="text-xs">
              <span className="text-slate-500">{t.invoiceNo}: </span>
              <span className="font-mono font-bold text-slate-900">{invoice.invoiceNo}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500">{t.invoiceDate}: </span>
              <span className="font-mono font-medium">{formatDate(invoice.date, lang)}</span>
            </div>
          </div>
        </div>

        {/* Party Details Box */}
        <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              {t.partyName}:
            </span>
            <span className="font-bold text-slate-900 text-sm">{invoice.partyName}</span>
            {invoice.partyAddress && (
              <p className="text-[11px] text-slate-600 mt-0.5">{invoice.partyAddress}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              {t.partyPhone}:
            </span>
            <span className="font-mono font-semibold text-slate-900">{invoice.partyPhone || 'N/A'}</span>
          </div>
        </div>

        {/* Product Items Table (Strictly without stock column per requirement) */}
        <div className="my-3">
          <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[10px]">
                <th className="py-1.5 px-2 border-r border-slate-300 text-center w-8">{t.sl}</th>
                <th className="py-1.5 px-2 border-r border-slate-300">{t.itemDescription}</th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-24 text-center">{t.itemCode}</th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-20 text-center">{t.qty}</th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-24 text-right">{t.rate}</th>
                <th className="py-1.5 px-2 text-right w-28">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, idx) => (
                <tr key={it.id || idx} className="border-b border-slate-200">
                  <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                    {formatNumber(idx + 1, lang)}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200 font-medium">
                    {it.name}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-600">
                    {it.code || '-'}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold">
                    {it.unit === 'gm' ? (
                      <span>{formatNumber(it.quantity, lang)} {lang === 'bn' ? 'গ্রাম' : 'gm'}</span>
                    ) : it.inputGrams ? (
                      <span>
                        {formatNumber(it.quantity, lang)} {it.unit}
                        <span className="block text-[9px] text-slate-500 font-normal font-sans">({formatNumber(it.inputGrams, lang)} {lang === 'bn' ? 'গ্রাম' : 'gm'})</span>
                      </span>
                    ) : (
                      <span>{formatNumber(it.quantity, lang)} {it.unit}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono">
                    {formatCurrency(it.unitPrice, lang)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold">
                    {formatCurrency(it.total, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary & Notes */}
        <div className="grid grid-cols-2 gap-4 text-xs pt-1">
          {/* LEFT DOWN CORNER: Party Account Statement (Compact & Multi-language) */}
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] leading-tight print-compact">
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                  {lang === 'bn' ? 'পার্টি অ্যাকাউন্ট স্টেটমেন্ট' : 'Party Account Statement'}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-700 font-mono rounded">
                  {lang === 'bn' ? 'লেজার সংক্ষেপ' : 'Ledger Summary'}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">{lang === 'bn' ? 'পার্টির নাম:' : 'Party Name:'}</span>
                  <span className="font-sans font-bold text-slate-900 truncate max-w-[150px]">
                    {invoice.partyName || (lang === 'bn' ? 'সাধারণ কাস্টমার' : 'General Customer')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">{lang === 'bn' ? 'পূর্বের বাকি/অগ্রিম:' : 'Previous Balance:'}</span>
                  <span
                    className={`font-bold ${
                      invoice.previousBalance > 0
                        ? 'text-amber-700'
                        : invoice.previousBalance < 0
                        ? 'text-blue-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {invoice.previousBalance === 0
                      ? lang === 'bn'
                        ? '০ (পরিশোধিত)'
                        : '0 (Clear)'
                      : formatCurrency(invoice.previousBalance, lang)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">{lang === 'bn' ? 'বর্তমান ইনভয়েস বিল:' : 'Current Invoice Bill:'}</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(invoice.netInvoiceAmount, lang)}
                  </span>
                </div>

                <div className="flex justify-between pt-1 border-t border-slate-300 font-black text-slate-900 text-[11px]">
                  <span className="font-sans">{lang === 'bn' ? 'ক্লোজিং জের (Net Balance):' : 'Closing Net Balance:'}</span>
                  <span className="text-emerald-800">
                    {formatCurrency(invoice.grandTotal, lang)}
                  </span>
                </div>

                <div className="text-[9px] font-sans text-slate-500 pt-0.5 italic">
                  {invoice.grandTotal > 0
                    ? lang === 'bn'
                      ? '* সর্বমোট বাকি বা প্রদেয় পরিমাণ।'
                      : '* Total due or payable balance.'
                    : lang === 'bn'
                    ? '* সম্পূর্ণ পরিশোধিত বা অগ্রিম জমা।'
                    : '* Fully settled or advance credit.'}
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10.5px] text-slate-700">
                <strong>{lang === 'bn' ? 'নোট / বিবরণ: ' : 'Notes: '}</strong>
                {invoice.notes}
              </div>
            )}
            <div className="text-[9.5px] text-slate-500 space-y-0.5">
              <p>{lang === 'bn' ? '* ক্রয়কৃত সার্কিট বা মাদারবোর্ডের হিসাব তাৎক্ষণিক মেলানো আবশ্যক।' : '* Goods received must be verified on delivery.'}</p>
              <p>{lang === 'bn' ? '* কম্পিউটার জেনারেটেড ইনভয়েস, কোনো ঘষামাজা গ্রহণযোগ্য নয়।' : '* Computer generated statement, no alteration valid.'}</p>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-600">{t.subTotal}:</span>
              <span className="font-mono font-semibold">{formatCurrency(invoice.subtotal, lang)}</span>
            </div>

            {invoice.courierDeduction > 0 && (
              <div className="flex justify-between py-0.5 border-b border-slate-200 text-amber-700">
                <span>{t.courierBillMinus}:</span>
                <span className="font-mono font-semibold">-{formatCurrency(invoice.courierDeduction, lang)}</span>
              </div>
            )}

            <div className="flex justify-between py-1.5 border-y-2 border-slate-800 text-sm font-black bg-slate-50 px-1">
              <span>{lang === 'bn' ? 'নেট ইনভয়েস বিল (Net Invoice Amount):' : 'Net Invoice Amount:'}</span>
              <span className="font-mono text-emerald-800">{formatCurrency(invoice.netInvoiceAmount, lang)}</span>
            </div>

            {invoice.previousBalance !== 0 && invoice.type !== 'processing' && (
              <>
                <div className="flex justify-between py-0.5 pt-1 text-slate-600 text-[10.5px]">
                  <span>{invoice.previousBalance > 0 ? t.previousDue : t.previousAdvance}:</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(invoice.previousBalance, lang)}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-700 text-[11px] font-bold border-t border-dashed border-slate-300">
                  <span>{lang === 'bn' ? 'সর্বমোট জের (Closing Ledger Balance):' : 'Closing Ledger Balance:'}</span>
                  <span className="font-mono">{formatCurrency(invoice.grandTotal, lang)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 1-Page Signatures Line */}
        <div className="mt-12 pt-4 border-t border-slate-300 grid grid-cols-3 text-center text-xs text-slate-700">
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold">
              {t.customerSignature}
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold">
              {t.preparedBy}
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold">
              {t.companySealSignature}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
