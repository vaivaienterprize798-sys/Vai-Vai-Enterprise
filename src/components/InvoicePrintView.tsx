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
        {/* Clean Company Header */}
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
          <div className="flex items-center justify-center gap-3 mb-1">
            <CompanyLogo customLogoUrl={company.logoUrl} className="w-10 h-10" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              {headerCompanyName}
            </h1>
          </div>
          <p className="text-[11px] font-semibold text-slate-700">
            {lang === 'bn' ? company.businessTypeBn : company.businessTypeEn}
          </p>
          <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {company.address}
            </span>
            <span className="flex items-center gap-1 font-mono font-semibold">
              <Phone className="w-3 h-3 shrink-0" />
              {company.phones.join(', ')}
            </span>
            {company.email && (
              <span className="flex items-center gap-1 font-mono font-semibold">
                <Mail className="w-3 h-3 shrink-0" />
                {company.email}
              </span>
            )}
          </div>
        </div>

        {/* Invoice Type & Meta */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3 text-xs">
          <div className="font-black text-slate-900 uppercase tracking-wide">
            {invoice.type.toUpperCase()}{' '}
            {invoice.mode === 'purchase'
              ? lang === 'bn'
                ? 'ক্রয় চালান (PURCHASE)'
                : 'PURCHASE'
              : lang === 'bn'
              ? 'বিক্রয় মেমো (SALES)'
              : 'SALES'}
          </div>
          <div className="flex items-center gap-4 font-bold text-slate-700">
            <span>{t.invoiceNo}: <strong className="text-slate-900">{invoice.invoiceNo}</strong></span>
            <span>{t.invoiceDate}: <strong className="text-slate-900">{formatDate(invoice.date, lang)}</strong></span>
          </div>
        </div>

        {/* Party Details — Clean Bordered Section */}
        <div className="border border-slate-400 mb-3 text-xs">
          <div className="bg-slate-100 border-b border-slate-400 px-3 py-1 font-black text-slate-800 uppercase text-[10px] tracking-wide">
            {lang === 'bn' ? 'পার্টি / গ্রাহকের বিবরণ' : 'Party / Customer Info'}
          </div>
          <div className="px-3 py-2 space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-black text-slate-900 text-sm uppercase">{invoice.partyName}</span>
              <span className="font-mono font-semibold text-slate-700 flex items-center gap-1">
                <Phone className="w-3 h-3 shrink-0" />
                {invoice.partyPhone || (lang === 'bn' ? 'নম্বর নেই' : 'N/A')}
              </span>
              {invoice.partyAddress && (
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {invoice.partyAddress}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <div className="mb-3">
          <table className="w-full text-left border-collapse border border-slate-400 text-xs print-compact">
            <thead>
              <tr className="bg-slate-200 text-slate-900 border-b border-slate-400 font-bold uppercase text-[10px]">
                <th className="py-1.5 px-2 border-r border-slate-400 text-center w-8">{t.sl}</th>
                <th className="py-1.5 px-2 border-r border-slate-400">{t.itemDescription}</th>
                <th className="py-1.5 px-2 border-r border-slate-400 w-24 text-center">{t.itemCode}</th>
                <th className="py-1.5 px-2 border-r border-slate-400 w-20 text-center">{t.qty}</th>
                <th className="py-1.5 px-2 border-r border-slate-400 w-24 text-right">{t.rate}</th>
                <th className="py-1.5 px-2 text-right w-28">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, idx) => (
                <tr key={it.id || idx} className="border-b border-slate-300">
                  <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono">
                    {formatNumber(idx + 1, lang)}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 font-medium">
                    {it.name}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono text-[11px] text-slate-600">
                    {it.code || '-'}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono font-bold">
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
                  <td className="py-1.5 px-2 border-r border-slate-300 text-right font-mono">
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

        {/* Totals & Party Summary — Clean Two-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Left: Party Account Summary */}
          <div className="space-y-2">
            <div className="border border-slate-400 text-[11px] leading-tight print-compact">
              <div className="bg-slate-100 border-b border-slate-400 px-3 py-1 font-black text-slate-800 uppercase text-[10px] tracking-wide">
                {lang === 'bn' ? 'পার্টি অ্যাকাউন্ট সারসংক্ষেপ' : 'Party Account Summary'}
              </div>
              <div className="px-3 py-2 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-700">
                  <span className="font-sans font-semibold">{lang === 'bn' ? 'পার্টির নাম:' : 'Party Name:'}</span>
                  <span className="font-sans font-black text-slate-900 truncate max-w-[160px]">
                    {invoice.partyName || (lang === 'bn' ? 'সাধারণ কাস্টমার' : 'General Customer')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-sans font-semibold">{lang === 'bn' ? 'পূর্বের বাকি/অগ্রিম:' : 'Previous Balance:'}</span>
                  <span className={`font-black ${invoice.previousBalance > 0 ? 'text-rose-700' : invoice.previousBalance < 0 ? 'text-blue-700' : 'text-slate-700'}`}>
                    {invoice.previousBalance === 0
                      ? lang === 'bn' ? '০ (পরিশোধিত)' : '0 (Clear)'
                      : formatCurrency(invoice.previousBalance, lang)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-sans font-semibold">{lang === 'bn' ? 'বর্তমান ইনভয়েস বিল:' : 'Current Invoice Bill:'}</span>
                  <span className="font-black text-slate-900">{formatCurrency(invoice.netInvoiceAmount, lang)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-300 font-black text-slate-900 text-xs">
                  <span className="font-sans font-bold">{lang === 'bn' ? 'ক্লোজিং জের (Net Balance):' : 'Closing Net Balance:'}</span>
                  <span className={invoice.grandTotal > 0 ? 'text-rose-700 font-mono' : 'text-emerald-800 font-mono'}>
                    {formatCurrency(invoice.grandTotal, lang)}
                  </span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="border border-slate-300 px-3 py-2 text-[10.5px] text-slate-800 font-medium">
                <strong className="text-slate-900">{lang === 'bn' ? 'নোট / বিবরণ: ' : 'Notes: '}</strong>
                {invoice.notes}
              </div>
            )}
            <div className="text-[9.5px] text-slate-500 font-medium">
              <p>{lang === 'bn' ? '• কম্পিউটার জেনারেটেড চালান, কোনো ঘষামাজা গ্রহণযোগ্য নয়।' : '• Computer generated invoice, no alteration valid.'}</p>
            </div>
          </div>

          {/* Right: Calculation Summary */}
          <div className="space-y-1 text-right">
            <div className="flex justify-between py-1 border-b border-slate-300">
              <span className="text-slate-600 font-bold">{t.subTotal}:</span>
              <span className="font-mono font-black text-slate-900">{formatCurrency(invoice.subtotal, lang)}</span>
            </div>
            {invoice.courierDeduction > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-300 text-slate-700 font-bold">
                <span>{t.courierBillMinus}:</span>
                <span className="font-mono font-black">-{formatCurrency(invoice.courierDeduction, lang)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-y border-slate-400 text-sm font-black text-slate-900">
              <span>{lang === 'bn' ? 'নেট ইনভয়েস বিল:' : 'Net Invoice Amount:'}</span>
              <span className="font-mono">{formatCurrency(invoice.netInvoiceAmount, lang)}</span>
            </div>
            {invoice.previousBalance !== 0 && invoice.type !== 'processing' && (
              <>
                <div className="flex justify-between py-1 text-slate-600 text-xs font-semibold">
                  <span>{invoice.previousBalance > 0 ? t.previousDue : t.previousAdvance}:</span>
                  <span className="font-mono font-black text-slate-800">{formatCurrency(invoice.previousBalance, lang)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-y-2 border-slate-900 text-sm font-black text-slate-900">
                  <span>{lang === 'bn' ? 'সর্বমোট জের (Closing Balance):' : 'Closing Balance:'}</span>
                  <span className="font-mono">{formatCurrency(invoice.grandTotal, lang)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Grand Total & Amount in Words */}
        <div className="mt-3 border-t border-slate-400 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="text-[11px] italic text-slate-700 font-medium text-center sm:text-left">
            <span className="font-bold text-slate-900">{lang === 'bn' ? 'কথায়: ' : 'In Words: '}</span>
            {amountInWords(invoice.grandTotal || invoice.netInvoiceAmount)}
          </div>
          <div className="text-center sm:text-right">
            <span className="text-[10px] font-bold text-slate-600 uppercase block">
              {lang === 'bn' ? 'সর্বমোট প্রদেয়' : 'Grand Total'}
            </span>
            <span className="text-lg font-black font-mono text-slate-900">
              {formatCurrency(invoice.grandTotal || invoice.netInvoiceAmount, lang)}
            </span>
          </div>
        </div>

        {/* Signature Lines — Clean Standard Format */}
        <div className="mt-10 pt-3 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="border-t border-slate-500 mb-1" />
            <div className="font-bold text-slate-700 text-[11px]">{t.customerSignature}</div>
          </div>
          <div>
            <div className="border-t border-slate-500 mb-1" />
            <div className="font-bold text-slate-700 text-[11px]">{t.preparedBy}</div>
          </div>
          <div>
            <div className="border-t border-slate-500 mb-1" />
            <div className="font-bold text-slate-700 text-[11px]">{t.companySealSignature}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
