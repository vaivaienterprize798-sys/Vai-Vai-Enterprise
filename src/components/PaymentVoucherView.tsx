import React, { useState } from 'react';
import { Printer, ArrowLeft, Phone, Mail, MapPin, Download, CheckCircle2 } from 'lucide-react';
import { Invoice, Language, PaymentMethod } from '../types';
import { formatCurrency, formatDate } from '../lib/translations';
import { storageService } from '../lib/storage';
import { computePartyLedger, signedToNatural } from '../lib/ledger';
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

  // Dynamically calculate party ledger up to this payment voucher to eliminate old/stale data
  const dynamicBalances = React.useMemo(() => {
    if (!party) {
      const prevVal = Number(invoice.previousBalance) || 0;
      const remVal = invoice.remainingDue !== undefined ? Number(invoice.remainingDue) : prevVal - paid;
      return { prev: prevVal, remaining: remVal, currentDue: 0, currentAdvance: 0 };
    }

    const allInvoices = storageService.getInvoices();
    const ledger = computePartyLedger(party, allInvoices);

    // Find this invoice in chronological rows
    const rowIndex = ledger.rows.findIndex(
      (r) => r.invoice.id === invoice.id || (invoice.invoiceNo && r.invoice.invoiceNo === invoice.invoiceNo)
    );

    if (rowIndex >= 0) {
      const signedBefore = rowIndex === 0 ? ledger.openingSigned : ledger.rows[rowIndex - 1].balance;
      const signedAfter = ledger.rows[rowIndex].balance;
      return {
        prev: signedToNatural(party, signedBefore),
        remaining: signedToNatural(party, signedAfter),
        currentDue: ledger.currentDue,
        currentAdvance: ledger.currentAdvance,
      };
    }

    // If new or not indexed yet, calculate from ledger
    const isReceiveDir = invoice.voucherKind ? invoice.voucherKind === 'payment_received' : invoice.mode === 'sales';
    const signedBefore = ledger.closingSigned;
    const signedAfter = signedBefore + (isReceiveDir ? -paid : paid);

    return {
      prev: signedToNatural(party, signedBefore),
      remaining: signedToNatural(party, signedAfter),
      currentDue: ledger.currentDue,
      currentAdvance: ledger.currentAdvance,
    };
  }, [party, invoice, paid]);

  const prev = dynamicBalances.prev;
  const remaining = dynamicBalances.remaining;

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
                  {company.name}
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

            {/* Voucher Meta Line */}
            <div className="mt-2.5 pt-2 w-full flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800 text-xs font-mono z-10">
              <div className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow-md">
                {title} ({subTitle})
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-200 font-bold">
                <span>{lang === 'bn' ? 'ভাউচার নং: ' : 'Voucher No: '}<strong className="text-amber-300 font-bold">{invoice.invoiceNo}</strong></span>
                <span>{lang === 'bn' ? 'তারিখ: ' : 'Date: '}<strong className="text-cyan-300 font-bold">{formatDate(invoice.date, lang)}</strong></span>
              </div>
            </div>
          </div>

          {/* Party details Centralized Premium Bordered Card */}
          <div className="my-4 p-4 rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-blue-50/90 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-indigo-200">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
                {isReceived
                  ? (lang === 'bn' ? 'যার নিকট হতে টাকা গ্রহণ করা হলো (Received From)' : 'Received with thanks from')
                  : (lang === 'bn' ? 'যাকে টাকা প্রদান করা হলো (Paid To)' : 'Paid To')}
              </span>
              {partyPhone && (
                <span className="flex items-center gap-1 font-mono font-black text-emerald-800 text-xs">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{partyPhone}</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">{lang === 'bn' ? 'পার্টির নাম:' : 'Party Name:'}</span>
                <span className="text-base sm:text-lg font-black text-indigo-950 uppercase">{partyName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">{lang === 'bn' ? 'ঠিকানা ও অবস্থান:' : 'Address:'}</span>
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{partyAddress || (lang === 'bn' ? 'ঠিকানা প্রযোজ্য নয়' : 'N/A')}</span>
                </span>
              </div>
            </div>
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

          {/* Dynamic & Colorful Amount Box */}
          <div className="my-4 p-4 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  {isReceived ? (lang === 'bn' ? 'মোট গৃহীত টাকা' : 'Total Received') : (lang === 'bn' ? 'মোট পরিশোধিত টাকা' : 'Total Paid')}
                </span>
                <span className="text-emerald-200 font-mono text-[11px]">
                  {paymentMethodLabel(invoice.paymentMethod, lang)}
                </span>
              </div>
              <div className="text-[11px] text-slate-200 italic font-medium">
                <span className="text-amber-300 font-bold">{lang === 'bn' ? 'কথায়: ' : 'In Words: '}</span>
                {amountInWords(paid)}
              </div>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 drop-shadow-md">
                {formatCurrency(paid, lang)}
              </div>
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                {isReceived ? (lang === 'bn' ? 'নগদ / ডিজিটাল গ্রহণ' : 'Cash / Digital Received') : (lang === 'bn' ? 'সম্পূর্ণ প্রদান' : 'Paid in Full')}
              </span>
            </div>
          </div>

          {/* Paid stamp */}
          <div className="absolute right-8 top-1/2 -rotate-12 opacity-15 pointer-events-none select-none">
            <div className="flex items-center gap-2 border-4 border-emerald-700 text-emerald-700 rounded-xl px-4 py-1 text-3xl font-black">
              <CheckCircle2 className="w-8 h-8" /> {isReceived ? 'RECEIVED' : 'PAID'}
            </div>
          </div>

          {/* Unique Dynamic 3-Card Signature Section */}
          <div className="mt-8 pt-4 border-t-2 border-slate-300 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 flex flex-col justify-between h-22">
              <div className="w-full border-b border-dashed border-slate-300 pb-3 text-transparent select-none">.</div>
              <div className="font-black text-slate-800 text-[11px] flex items-center justify-center gap-1">
                <span>✍️ {isReceived ? (lang === 'bn' ? 'প্রদানকারীর স্বাক্ষর' : 'Payer Signature') : (lang === 'bn' ? 'গ্রহীতার স্বাক্ষর' : 'Receiver Signature')}</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 flex flex-col justify-between h-22">
              <div className="w-full border-b border-dashed border-indigo-200 pb-3 text-transparent select-none">.</div>
              <div className="font-black text-indigo-900 text-[11px] flex items-center justify-center gap-1">
                <span>📋 {lang === 'bn' ? 'হিসাবরক্ষক' : 'Accountant'}</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 flex flex-col justify-between h-22">
              <div className="w-full border-b border-dashed border-emerald-200 pb-3 text-transparent select-none">.</div>
              <div className="font-black text-emerald-900 text-[11px] flex items-center justify-center gap-1">
                <span>🏛️ {lang === 'bn' ? 'অনুমোদনকারী ও সিল' : 'Authorised Seal'}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-[9px] text-slate-400 mt-2">
          {lang === 'bn' ? 'এটি কম্পিউটারে তৈরি রশিদ।' : 'This is a computer generated voucher.'}
        </p>
      </div>
    </div>
  );
};
