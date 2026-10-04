import React, { useState } from 'react';
import { Printer, ArrowLeft, Phone, Mail, MapPin, Download, CheckCircle2 } from 'lucide-react';
import { Invoice, Language, PaymentMethod } from '../types';
import { formatCurrency, formatDate } from '../lib/translations';
import { storageService } from '../lib/storage';
import { executePrint, exportElementToPdf } from '../lib/printUtils';
import { CompanyLogo } from './CompanyLogo';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

interface PaymentVoucherViewProps {
  invoice: Invoice;
  lang: Language;
  onBack: () => void;
}

export const paymentMethodLabel = (m: PaymentMethod | undefined, lang: Language): string => {
  const map: Record<string, [string, string]> = {
    cash: ['নগদ (Cash)', 'Cash'],
    bank: ['ব্যাংক ট্রান্সফার (Bank Transfer)', 'Bank Transfer'],
    bKash: ['বিকাশ (MFS - bKash)', 'MFS - bKash'],
    nagad: ['নগদ (MFS - Nagad)', 'MFS - Nagad'],
    rocket: ['রকেট (MFS - Rocket)', 'MFS - Rocket'],
    mfs: ['মোবাইল ব্যাংকিং (MFS)', 'Mobile Financial Service (MFS)'],
    courier_cod: ['কুরিয়ার কন্ডিশন (COD)', 'Courier COD'],
  };
  const v = map[m || 'cash'] || map.cash;
  return lang === 'bn' ? v[0] : v[1];
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const twoDigits = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`);
const threeDigits = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
};
/** Amount in words using the South-Asian system (Crore / Lakh / Thousand). */
export const amountInWords = (amount: number): string => {
  let n = Math.floor(Math.abs(amount));
  const paisa = Math.round((Math.abs(amount) - n) * 100);
  if (n === 0 && paisa === 0) return 'Zero Taka Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  let words = `${parts.join(' ') || 'Zero'} Taka`;
  if (paisa) words += ` and ${twoDigits(paisa)} Paisa`;
  return `${words} Only`;
};

export const PaymentVoucherView: React.FC<PaymentVoucherViewProps> = ({ invoice, lang, onBack }) => {
  const company = storageService.getCompanyInfo();
  // Dynamic binding: always show the latest party details from the party directory
  const party = storageService
    .getParties()
    .find((p) => (invoice.partyId ? p.id === invoice.partyId : p.name.trim().toLowerCase() === (invoice.partyName || '').trim().toLowerCase()));
  const partyName = party?.name || invoice.partyName;
  const partyPhone = party?.phone || invoice.partyPhone;
  const partyAddress = party?.address || invoice.partyAddress;

  const isReceived = invoice.voucherKind ? invoice.voucherKind === 'payment_received' : invoice.mode === 'sales';
  const paid = Number(invoice.paidAmount) || 0;
  const prev = Number(invoice.previousBalance) || 0;
  const remaining = invoice.remainingDue !== undefined ? Number(invoice.remainingDue) : prev - paid;

  const title = isReceived
    ? lang === 'bn' ? 'মানি রিসিট (টাকা গ্রহণের রশিদ)' : 'OFFICIAL RECEIPT'
    : lang === 'bn' ? 'পেমেন্ট ভাউচার (টাকা প্রদান)' : 'PAYMENT VOUCHER';
  const subTitle = isReceived ? 'Money Receipt' : 'Debit Voucher';

  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const balanceLabel = (v: number) =>
    v > 0 ? (lang === 'bn' ? 'বাকি (Due)' : 'Due') : v < 0 ? (lang === 'bn' ? 'অগ্রিম (Advance)' : 'Advance') : (lang === 'bn' ? 'পরিশোধিত' : 'Settled');

  const handlePrint = () => {
    setIsPrinting(true);
    executePrint('payment-voucher-print-area', `${company.name} - ${invoice.invoiceNo}`);
    setTimeout(() => setIsPrinting(false), 800);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    await exportElementToPdf('payment-voucher-print-area', `voucher-${invoice.invoiceNo}.pdf`);
    setIsExportingPdf(false);
  };

  const getWhatsAppText = () => `*${company.name} - ${isReceived ? 'Money Receipt' : 'Payment Voucher'}*
🧾 *ভাউচার নং:* ${invoice.invoiceNo}
📅 *তারিখ:* ${invoice.date}
👤 *পার্টি:* ${partyName}
📞 *মোবাইল:* ${partyPhone || 'N/A'}
────────────────────────
💳 *মাধ্যম:* ${paymentMethodLabel(invoice.paymentMethod, lang)}
${invoice.transactionRef ? `🔖 *রেফারেন্স:* ${invoice.transactionRef}\n` : ''}↪️ *পূর্বের ${balanceLabel(prev)}:* ৳${Math.abs(prev).toLocaleString()}
💵 *${isReceived ? 'গৃহীত' : 'প্রদত্ত'} টাকা:* ৳${paid.toLocaleString()}
📌 *অবশিষ্ট ${balanceLabel(remaining)}:* ৳${Math.abs(remaining).toLocaleString()}
${invoice.notes ? `📝 *মন্তব্য:* ${invoice.notes}\n` : ''}────────────────────────
_${company.name}_`;

  const Row = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-baseline gap-2 py-1.5 border-b border-dashed border-slate-300">
      <span className="text-[11px] text-slate-500 w-40 shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-4">
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
            getText={getWhatsAppText}
            lang={lang}
            targetElementId="payment-voucher-print-area"
            fileName={`voucher-${invoice.invoiceNo}.png`}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'Share on WhatsApp'}
          />
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? '...' : 'PDF'}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? 'প্রিন্ট করুন' : 'Print'}</span>
          </button>
        </div>
      </div>

      <div
        id="payment-voucher-print-area"
        className="one-page-sheet max-w-3xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0"
      >
        <div className="border-4 border-double border-slate-800 rounded-lg p-5 relative">
          {/* Header */}
          <div className="flex justify-between items-start gap-4 pb-3 border-b-2 border-slate-800">
            <div className="flex items-start gap-3">
              <CompanyLogo customLogoUrl={company.logoUrl} className="w-14 h-14 shrink-0" />
              <div className="space-y-0.5">
                <h1 className="text-xl font-black tracking-tight leading-tight">{company.name}</h1>
                <p className="text-[11px] font-medium text-slate-700">{lang === 'bn' ? company.businessTypeBn : company.businessTypeEn}</p>
                <div className="text-[10px] text-slate-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{company.address}</div>
                <div className="text-[10px] text-slate-600 flex flex-wrap gap-3 font-mono">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{company.phones.join(', ')}</span>
                  {company.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{company.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{lang === 'bn' ? 'ভাউচার নং' : 'Voucher No.'}</div>
              <div className="font-mono font-black text-base">{invoice.invoiceNo}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 pt-1">{lang === 'bn' ? 'তারিখ' : 'Date'}</div>
              <div className="font-mono font-bold text-sm">{formatDate(invoice.date, lang)}</div>
            </div>
          </div>

          {/* Title band */}
          <div className="text-center my-4">
            <div className="inline-block px-6 py-1.5 bg-slate-900 text-white rounded-md">
              <div className="text-base font-black tracking-wider">{title}</div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-1">{subTitle}</div>
          </div>

          {/* Party details */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1">
              {isReceived
                ? lang === 'bn' ? 'যার নিকট হতে গ্রহণ করা হলো' : 'Received with thanks from'
                : lang === 'bn' ? 'যাকে প্রদান করা হলো' : 'Paid to'}
            </div>
            <Row label={lang === 'bn' ? 'পার্টির নাম' : 'Party Name'} value={partyName} />
            <Row label={lang === 'bn' ? 'ঠিকানা' : 'Address'} value={partyAddress} />
            <Row label={lang === 'bn' ? 'মোবাইল' : 'Contact'} value={partyPhone} mono />
          </div>

          {/* Payment details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mb-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1">{lang === 'bn' ? 'পেমেন্ট বিবরণ' : 'Payment Details'}</div>
              <Row label={lang === 'bn' ? 'পেমেন্টের তারিখ' : 'Payment Date'} value={formatDate(invoice.date, lang)} mono />
              <Row label={lang === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Method'} value={paymentMethodLabel(invoice.paymentMethod, lang)} />
              <Row label={lang === 'bn' ? 'ট্রানজেকশন রেফ. আইডি' : 'Transaction Ref. ID'} value={invoice.transactionRef} mono />
              <Row label={lang === 'bn' ? 'মন্তব্য' : 'Remarks / Notes'} value={invoice.notes} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1">{lang === 'bn' ? 'হিসাব সারসংক্ষেপ' : 'Account Summary'}</div>
              <div className="rounded-lg border border-slate-300 overflow-hidden text-sm">
                <div className="flex justify-between px-3 py-2 bg-slate-50">
                  <span>{lang === 'bn' ? 'পূর্বের' : 'Previous'} {balanceLabel(prev)}</span>
                  <span className="font-mono font-bold">{formatCurrency(Math.abs(prev), lang)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 border-t border-slate-300">
                  <span>{isReceived ? (lang === 'bn' ? 'গৃহীত টাকা' : 'Amount Received') : (lang === 'bn' ? 'প্রদত্ত টাকা' : 'Amount Paid')}</span>
                  <span className="font-mono font-bold text-emerald-700">− {formatCurrency(paid, lang)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 border-t-2 border-slate-800 bg-slate-100 font-black">
                  <span>{lang === 'bn' ? 'অবশিষ্ট' : 'Remaining'} {balanceLabel(remaining)}</span>
                  <span className="font-mono">{formatCurrency(Math.abs(remaining), lang)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount box */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-slate-900 rounded-lg">
              <span className="text-xs font-bold">{lang === 'bn' ? 'টাকা' : 'Taka'}</span>
              <span className="font-mono text-2xl font-black">{formatCurrency(paid, lang)}</span>
            </div>
            <div className="flex-1 px-4 py-3 border border-dashed border-slate-400 rounded-lg">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{lang === 'bn' ? 'কথায়' : 'In Words'}</div>
              <div className="text-sm font-semibold italic">{amountInWords(paid)}</div>
            </div>
          </div>

          {/* Paid stamp */}
          <div className="absolute right-8 top-1/2 -rotate-12 opacity-15 pointer-events-none select-none">
            <div className="flex items-center gap-2 border-4 border-emerald-700 text-emerald-700 rounded-xl px-4 py-1 text-3xl font-black">
              <CheckCircle2 className="w-8 h-8" /> {isReceived ? 'RECEIVED' : 'PAID'}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-10 text-center text-[11px] text-slate-600">
            <div className="border-t border-slate-500 pt-1">{isReceived ? (lang === 'bn' ? 'প্রদানকারীর স্বাক্ষর' : 'Payer Signature') : (lang === 'bn' ? 'গ্রহীতার স্বাক্ষর' : 'Receiver Signature')}</div>
            <div className="border-t border-slate-500 pt-1">{lang === 'bn' ? 'হিসাবরক্ষক' : 'Accountant'}</div>
            <div className="border-t border-slate-500 pt-1">{lang === 'bn' ? 'অনুমোদনকারী' : 'Authorised Signature'}</div>
          </div>
        </div>
        <p className="text-center text-[9px] text-slate-400 mt-2">
          {lang === 'bn' ? 'এটি কম্পিউটারে তৈরি রশিদ।' : 'This is a computer generated voucher.'}
        </p>
      </div>
    </div>
  );
};
