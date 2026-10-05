import React, { useState } from 'react';
import { Printer, ArrowLeft, Phone, Mail, MapPin, Download, User } from 'lucide-react';
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
import { PaymentVoucherView, amountInWords } from './PaymentVoucherView';
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
        {/* Centralized Framed Company Header Box */}
        <div className="mb-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Top Golden Accent Bar */}
          <div className="w-full h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-t-full mb-3" />

          {/* Centralized Logo & Premium Vibrant Company Name */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 z-10">
            <div className="p-1.5 bg-white rounded-2xl shadow-md border-2 border-amber-400 shrink-0">
              <CompanyLogo customLogoUrl={company.logoUrl} className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-amber-300 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-tight leading-tight uppercase font-sans drop-shadow-md">
                {headerCompanyName}
              </h1>
              <div className="inline-block px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white text-[11px] font-extrabold tracking-wide uppercase shadow-xs">
                {lang === 'bn' ? company.businessTypeBn : company.businessTypeEn}
              </div>
            </div>
          </div>

          {/* Centralized Contact Details Ribbon */}
          <div className="text-[11px] text-slate-200 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 pt-2.5 border-t border-slate-800/80 w-full font-medium z-10">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{company.address}</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-cyan-300 font-bold">
              <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{company.phones.join(', ')}</span>
            </span>
            {company.email && (
              <span className="flex items-center gap-1 font-mono text-pink-300 font-bold">
                <Mail className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>{company.email}</span>
              </span>
            )}
          </div>

          {/* Invoice Meta Stamp Line */}
          <div className="mt-2.5 pt-2 w-full flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800 text-xs font-mono z-10">
            <div className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow-md">
              {invoice.type.toUpperCase()}{' '}
              {invoice.mode === 'purchase'
                ? lang === 'bn'
                  ? 'ক্রয় চালান (PURCHASE)'
                  : 'PURCHASE'
                : lang === 'bn'
                ? 'বিক্রয় মেমো (SALES)'
                : 'SALES'}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-200 font-bold">
              <span>{t.invoiceNo}: <strong className="text-amber-300 font-bold">{invoice.invoiceNo}</strong></span>
              <span>{t.invoiceDate}: <strong className="text-cyan-300 font-bold">{formatDate(invoice.date, lang)}</strong></span>
            </div>
          </div>
        </div>

        {/* Party Details Centralized Premium Bordered Card */}
        <div className="my-3.5 p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-blue-50/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
                  {lang === 'bn' ? 'পার্টি / গ্রাহকের বিবরণ' : 'Party / Customer Info'}
                </span>
                <span className="text-base sm:text-lg font-black text-indigo-950 uppercase tracking-tight">
                  {invoice.partyName}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 font-bold text-slate-800 text-xs">
                <span className="flex items-center gap-1 font-mono font-black text-emerald-800">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{invoice.partyPhone || (lang === 'bn' ? 'নম্বর নেই' : 'N/A')}</span>
                </span>
                {invoice.partyAddress && (
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{invoice.partyAddress}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-center sm:text-right border-t sm:border-t-0 sm:border-l sm:pl-4 border-indigo-200/80 pt-2 sm:pt-0 w-full sm:w-auto">
            <span className="text-[10px] uppercase font-black text-indigo-700 block">
              {invoice.mode === 'purchase'
                ? (lang === 'bn' ? 'সাপ্লায়ার ক্রয় হিসাব' : 'Supplier Account')
                : (lang === 'bn' ? 'কাস্টমার বিক্রয় চালান' : 'Customer Sales Memo')}
            </span>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-mono font-black text-[11px] mt-0.5">
              {invoice.invoiceNo}
            </span>
          </div>
        </div>

        {/* Product Items Table (Strictly without stock column per requirement) */}
        <div className="my-3">
          <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-950 font-bold uppercase text-[10px]">
                <th className="py-1.5 px-2 border-r border-slate-700 text-center w-8 text-white font-bold">{t.sl}</th>
                <th className="py-1.5 px-2 border-r border-slate-700 text-white font-bold">{t.itemDescription}</th>
                <th className="py-1.5 px-2 border-r border-slate-700 w-24 text-center text-white font-bold">{t.itemCode}</th>
                <th className="py-1.5 px-2 border-r border-slate-700 w-20 text-center text-white font-bold">{t.qty}</th>
                <th className="py-1.5 px-2 border-r border-slate-700 w-24 text-right text-white font-bold">{t.rate}</th>
                <th className="py-1.5 px-2 text-right w-28 text-white font-bold">{t.amount}</th>
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

        {/* Dynamic & Colorful Grand Total Banner */}
        <div className="my-3 p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs relative overflow-hidden">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
                {lang === 'bn' ? 'সর্বমোট প্রদেয় / নিট বিল' : 'Grand Total Payable'}
              </span>
              <span className="text-[11px] text-emerald-200 font-mono">
                {invoice.items.length} {lang === 'bn' ? 'টি আইটেম অন্তর্ভুক্ত' : 'items included'}
              </span>
            </div>
            <div className="text-[11px] text-slate-200 italic font-medium">
              <span className="text-amber-300 font-bold">{lang === 'bn' ? 'কথায়: ' : 'In Words: '}</span>
              {amountInWords(invoice.grandTotal || invoice.netInvoiceAmount)}
            </div>
          </div>
          <div className="text-center sm:text-right shrink-0">
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 drop-shadow-md">
              {formatCurrency(invoice.grandTotal || invoice.netInvoiceAmount, lang)}
            </div>
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
              {invoice.previousBalance !== 0 ? (lang === 'bn' ? 'পূর্বের জের সমন্বয় সহ' : 'Incl. Previous Balance') : (lang === 'bn' ? 'নিট পরিশোধযোগ্য' : 'Net Total')}
            </span>
          </div>
        </div>

        {/* Calculation Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          {/* LEFT DOWN CORNER: Party Account Statement (Compact & Multi-language) */}
          <div className="space-y-2">
            <div className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/40 border-2 border-indigo-200 rounded-xl text-[11px] leading-tight print-compact shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-indigo-200">
                <span className="font-black text-indigo-950 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                  {lang === 'bn' ? 'পার্টি অ্যাকাউন্ট লেজার স্টেটমেন্ট' : 'Party Account Statement'}
                </span>
                <span className="text-[9px] px-2 py-0.5 bg-indigo-600 text-white font-mono font-bold rounded-md uppercase">
                  {lang === 'bn' ? 'হিসাব সারসংক্ষেপ' : 'Summary'}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-700">
                  <span className="font-sans font-semibold">{lang === 'bn' ? 'পার্টির নাম:' : 'Party Name:'}</span>
                  <span className="font-sans font-black text-slate-900 truncate max-w-[160px]">
                    {invoice.partyName || (lang === 'bn' ? 'সাধারণ কাস্টমার' : 'General Customer')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span className="font-sans font-semibold">{lang === 'bn' ? 'পূর্বের বাকি/অগ্রিম:' : 'Previous Balance:'}</span>
                  <span
                    className={`font-black ${
                      invoice.previousBalance > 0
                        ? 'text-rose-700'
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

                <div className="flex justify-between text-slate-700">
                  <span className="font-sans font-semibold">{lang === 'bn' ? 'বর্তমান ইনভয়েস বিল:' : 'Current Invoice Bill:'}</span>
                  <span className="font-black text-slate-900">
                    {formatCurrency(invoice.netInvoiceAmount, lang)}
                  </span>
                </div>

                <div className="flex justify-between pt-1.5 border-t border-indigo-200 font-black text-slate-900 text-xs bg-indigo-100/50 p-1.5 rounded-lg">
                  <span className="font-sans font-bold">{lang === 'bn' ? 'ক্লোজিং জের (Net Balance):' : 'Closing Net Balance:'}</span>
                  <span className={invoice.grandTotal > 0 ? 'text-rose-700 font-black font-mono' : 'text-emerald-800 font-black font-mono'}>
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
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[10.5px] text-amber-950 font-medium">
                <strong className="text-amber-900">{lang === 'bn' ? '📝 নোট / বিবরণ: ' : '📝 Notes: '}</strong>
                {invoice.notes}
              </div>
            )}
            <div className="text-[9.5px] text-slate-500 space-y-0.5 font-medium">
              <p>{lang === 'bn' ? '• কম্পিউটার জেনারেটেড চালান, কোনো ঘষামাজা গ্রহণযোগ্য নয়।' : '• Computer generated invoice, no alteration valid.'}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-right">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600 font-bold">{t.subTotal}:</span>
              <span className="font-mono font-black text-slate-900">{formatCurrency(invoice.subtotal, lang)}</span>
            </div>

            {invoice.courierDeduction > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200 text-amber-800 font-bold">
                <span>{t.courierBillMinus}:</span>
                <span className="font-mono font-black">-{formatCurrency(invoice.courierDeduction, lang)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-2 border-indigo-500 bg-indigo-50/80 rounded-xl px-2.5 text-sm font-black text-indigo-950 shadow-2xs">
              <span>{lang === 'bn' ? 'নেট ইনভয়েস বিল (Net Invoice Amount):' : 'Net Invoice Amount:'}</span>
              <span className="font-mono text-indigo-900">{formatCurrency(invoice.netInvoiceAmount, lang)}</span>
            </div>

            {invoice.previousBalance !== 0 && invoice.type !== 'processing' && (
              <>
                <div className="flex justify-between py-1 text-slate-600 text-xs font-semibold">
                  <span>{invoice.previousBalance > 0 ? t.previousDue : t.previousAdvance}:</span>
                  <span className="font-mono font-black text-slate-800">
                    {formatCurrency(invoice.previousBalance, lang)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-2 border-emerald-500 bg-emerald-50/80 rounded-xl px-2.5 text-sm font-black text-emerald-950 shadow-2xs">
                  <span>{lang === 'bn' ? 'সর্বমোট জের (Closing Balance):' : 'Closing Balance:'}</span>
                  <span className="font-mono text-emerald-900">{formatCurrency(invoice.grandTotal, lang)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Unique Dynamic 3-Card Signature Section */}
        <div className="mt-8 pt-4 border-t-2 border-slate-300 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 flex flex-col justify-between h-22">
            <div className="w-full border-b border-dashed border-slate-300 pb-3 text-transparent select-none">.</div>
            <div className="font-black text-slate-800 text-[11px] flex items-center justify-center gap-1">
              <span>✍️ {t.customerSignature}</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 flex flex-col justify-between h-22">
            <div className="w-full border-b border-dashed border-indigo-200 pb-3 text-transparent select-none">.</div>
            <div className="font-black text-indigo-900 text-[11px] flex items-center justify-center gap-1">
              <span>📋 {t.preparedBy}</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 flex flex-col justify-between h-22">
            <div className="w-full border-b border-dashed border-emerald-200 pb-3 text-transparent select-none">.</div>
            <div className="font-black text-emerald-900 text-[11px] flex items-center justify-center gap-1">
              <span>🏛️ {t.companySealSignature}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
