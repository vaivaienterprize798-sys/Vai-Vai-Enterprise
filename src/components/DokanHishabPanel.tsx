import React, { useState, useMemo } from 'react';
import {
  Store,
  Plus,
  Printer,
  Calendar,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Receipt,
  FileText,
  DollarSign,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Coins,
  MapPin,
  Phone,
} from 'lucide-react';
import {
  Invoice,
  DokanPayment,
  PaymentMethod,
  Language,
  CompanyInfo,
  Party,
  PettyCashExpense,
  CarExpense,
} from '../types';
import { PartyLedgerStatement, DailyCashBook } from './LedgerStatementPanel';
import { generateNextSerial, DOKAN_PAYMENT_PREFIX } from '../lib/invoiceUtils';
import { storageService } from '../lib/storage';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';
import { executePrint, exportElementToPdf } from '../lib/printUtils';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { CompanyLogo } from './CompanyLogo';

interface DokanHishabPanelProps {
  invoices: Invoice[];
  dokanPayments: DokanPayment[];
  onSavePayment: (payment: DokanPayment) => void;
  onDeletePayment: (id: string) => void;
  onOpenNewDokanInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  lang: Language;
  companyInfo: CompanyInfo;
  parties?: Party[];
  pettyCashExpenses?: PettyCashExpense[];
  carExpenses?: CarExpense[];
}

export const DokanHishabPanel: React.FC<DokanHishabPanelProps> = ({
  invoices,
  dokanPayments,
  onSavePayment,
  onDeletePayment,
  onOpenNewDokanInvoice,
  onViewInvoice,
  lang,
  companyInfo,
  parties = [],
  pettyCashExpenses = [],
  carExpenses = [],
}) => {
  const t = translations[lang];

  // Modals and tabs
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'print' | 'ledger'>('overview');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Opening Balance state
  const [openingBalance, setOpeningBalance] = useState<number>(() => storageService.getDokanOpeningBalance());
  const [openingInput, setOpeningInput] = useState<number | string>(openingBalance);

  const handleSaveOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(openingInput) || 0;
    storageService.setDokanOpeningBalance(val);
    setOpeningBalance(val);
    setIsOpeningModalOpen(false);
  };

  // Payment Form States
  const [payDate, setPayDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRecipient, setPayRecipient] = useState('');
  const nextDokanVoucherNo = () => generateNextSerial(DOKAN_PAYMENT_PREFIX, dokanPayments.map((p) => p.voucherNo));
  const [payVoucherNo, setPayVoucherNo] = useState(nextDokanVoucherNo);
  React.useEffect(() => {
    if (isPaymentModalOpen) setPayVoucherNo(nextDokanVoucherNo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentModalOpen, dokanPayments]);
  const [payNotes, setPayNotes] = useState('');

  // 1. Auto-filter shop purchase invoices (type === 'dokan' or purchase with Dokan in party/notes)
  const dokanInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.type === 'dokan' ||
        (inv.mode === 'purchase' &&
          inv.type !== 'processing' &&
          !inv.partyId &&
          (inv.partyName.toLowerCase().includes('দোকান') ||
            inv.partyName.toLowerCase().includes('dokan') ||
            inv.partyName.toLowerCase().includes('counter') ||
            inv.invoiceNo.toLowerCase().includes('dok')))
    );
  }, [invoices]);

  // Calculations
  const totalPurchaseAmount = useMemo(() => {
    return dokanInvoices.reduce((sum, inv) => sum + (inv.netInvoiceAmount || inv.grandTotal || 0), 0);
  }, [dokanInvoices]);

  const totalPaidAmount = useMemo(() => {
    return dokanPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [dokanPayments]);

  const netBalance = openingBalance + totalPurchaseAmount - totalPaidAmount;
  const isDue = netBalance > 0;
  const isAdvance = netBalance < 0;

  // Date-wise statement (print / WhatsApp): only records inside the selected date range
  const [printFrom, setPrintFrom] = useState<string>('');
  const [printTo, setPrintTo] = useState<string>('');
  const inRange = (d: string) => (!printFrom || d >= printFrom) && (!printTo || d <= printTo);
  const byDate = <T extends { date: string; createdAt?: string }>(a: T, b: T) =>
    a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || '');
  const printInvoices = useMemo(() => dokanInvoices.filter((i) => inRange(i.date)).sort(byDate), [dokanInvoices, printFrom, printTo]);
  const printPayments = useMemo(() => dokanPayments.filter((p) => inRange(p.date)).sort(byDate), [dokanPayments, printFrom, printTo]);
  const printPurchaseTotal = printInvoices.reduce((s2, inv) => s2 + (inv.netInvoiceAmount || inv.grandTotal || 0), 0);
  const printPaidTotal = printPayments.reduce((s2, p) => s2 + p.amount, 0);
  // Balance carried in from before the start date (including opening balance)
  const printOpening = printFrom
    ? openingBalance +
      dokanInvoices.filter((i) => i.date < printFrom).reduce((s2, inv) => s2 + (inv.netInvoiceAmount || inv.grandTotal || 0), 0) -
      dokanPayments.filter((p) => p.date < printFrom).reduce((s2, p) => s2 + p.amount, 0)
    : openingBalance;
  const printClosing = printOpening + printPurchaseTotal - printPaidTotal;
  const printIsDue = printClosing > 0;
  const printIsAdvance = printClosing < 0;
  const printPeriodLabel = !printFrom && !printTo
    ? (lang === 'bn' ? 'সকল তারিখ' : 'All dates')
    : printFrom === printTo
    ? formatDate(printFrom, lang)
    : `${printFrom ? formatDate(printFrom, lang) : '...'} - ${printTo ? formatDate(printTo, lang) : '...'}`;

  const getDokanPrintWhatsAppText = () => {
    const dates = Array.from(new Set([...printInvoices.map((i) => i.date), ...printPayments.map((p) => p.date)])).sort();
    const daily = dates
      .map((d) => {
        const buy = printInvoices.filter((i) => i.date === d).reduce((s2, inv) => s2 + (inv.netInvoiceAmount || inv.grandTotal || 0), 0);
        const pay = printPayments.filter((p) => p.date === d).reduce((s2, p) => s2 + p.amount, 0);
        return `📅 ${d}: ক্রয় ৳${buy.toLocaleString()} | পরিশোধ ৳${pay.toLocaleString()}`;
      })
      .join('\n');
    return `*${companyInfo.name} - ${lang === 'bn' ? 'দোকানের হিসাব স্টেটমেন্ট' : 'Shop Account Statement'}*
📅 *সময়:* ${printPeriodLabel}
────────────────────────
↪️ *প্রারম্ভিক জের (Opening B/L):* ৳${printOpening.toLocaleString()}
🛒 *মোট ক্রয়:* ৳${printPurchaseTotal.toLocaleString()} (${printInvoices.length} টি ইনভয়েস)
💵 *মোট পরিশোধ:* ৳${printPaidTotal.toLocaleString()} (${printPayments.length} টি পেমেন্ট)
────────────────────────
${daily || 'এই সময়ে কোনো লেনদেন নেই'}
────────────────────────
${
  printIsDue
    ? `🔴 *দোকানে বাকি (Due):* ৳${Math.abs(printClosing).toLocaleString()}`
    : printIsAdvance
    ? `🟢 *অগ্রিম জমা (Advance):* ৳${Math.abs(printClosing).toLocaleString()}`
    : `⚪ *হিসাব সম্পূর্ণ পরিশোধিত (Settled)*`
}
────────────────────────
_${companyInfo.name}_`;
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert(lang === 'bn' ? 'পরিশোধের পরিমাণ আবশ্যক' : 'Valid payment amount is required');
      return;
    }

    const newPayment: DokanPayment = {
      id: `dp-${Date.now()}`,
      date: payDate,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      recipientName: payRecipient.trim() || (lang === 'bn' ? 'দোকান ক্যাশ' : 'Shop Counter'),
      voucherNo: nextDokanVoucherNo(),
      notes: payNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePayment(newPayment);
    setIsPaymentModalOpen(false);
    setPayAmount('');
    setPayRecipient('');
    setPayNotes('');
  };

  const getDokanWhatsAppText = () => {
    return `*${companyInfo.name} - ${lang === 'bn' ? 'দোকানের হিসাব স্টেটমেন্ট' : 'Shop Account Statement'}*
📅 *তারিখ:* ${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
────────────────────────
🏦 *প্রারম্ভিক জের (Opening B/L):* ৳${openingBalance.toLocaleString()}
🛒 *দোকান থেকে মোট ক্রয়:* ৳${totalPurchaseAmount.toLocaleString()} (${dokanInvoices.length} টি ইনভয়েস)
💵 *দোকানে মোট পরিশোধ/জমা:* ৳${totalPaidAmount.toLocaleString()} (${dokanPayments.length} টি পেমেন্ট)
────────────────────────
${
  isDue
    ? `🔴 *দোকানে মোট বাকি (Due):* ৳${Math.abs(netBalance).toLocaleString()}`
    : isAdvance
    ? `🟢 *দোকানে অগ্রিম জমা (Advance):* ৳${Math.abs(netBalance).toLocaleString()}`
    : `⚪ *দোকান হিসাব সম্পূর্ণ পরিশোধিত (Settled)*`
}
────────────────────────
_আরএসআর ভাই ভাই এন্টারপ্রাইজ_`;
  };

  const handlePrintDokanStatement = () => {
    setIsPrinting(true);
    executePrint('dokan-sheet-print', `${companyInfo.name} - ${lang === 'bn' ? 'দোকানের হিসাব' : 'Shop Account'}`);
    setTimeout(() => setIsPrinting(false), 800);
  };

  const handleDownloadDokanPdf = async () => {
    setIsExportingPdf(true);
    await exportElementToPdf('dokan-sheet-print', `dokan-statement-${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}.pdf`);
    setIsExportingPdf(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Fast Actions with Company Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-10 h-10" />
          <div>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'দোকানের হিসাব (Dokan Hishab)' : 'Shop Account (Dokan Hishab)'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'দোকান থেকে মাল ক্রয়ের অটো ইনভয়েস ট্র্যাকিং, পরিশোধ হিসাব এবং বর্তমান বাকি/অগ্রিম ব্যালেন্স'
                : 'Auto shop purchase tracking from invoices, payments ledger, and net due/advance balance'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareDropdown
            getText={getDokanWhatsAppText}
            lang={lang}
            buttonLabel={lang === 'bn' ? 'দোকান হিসাব পাঠান' : 'Share on WhatsApp'}
          />

          <button
            onClick={() => {
              setOpeningInput(openingBalance);
              setIsOpeningModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            title={lang === 'bn' ? 'দোকানের পূর্বের প্রারম্ভিক জের (Opening B/L) সেট করুন' : 'Set Shop Opening Balance'}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'bn' ? 'প্রারম্ভিক জের (Opening B/L)' : 'Opening B/L'}</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'print' ? 'overview' : 'print')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? '১-পেজ দোকান স্টেটমেন্ট' : '1-Page Statement'}</span>
          </button>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ দোকানে টাকা প্রদান' : '+ Record Payment'}</span>
          </button>

          <button
            onClick={onOpenNewDokanInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ দোকান ইনভয়েস' : '+ Dokan Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Opening Balance Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{lang === 'bn' ? 'প্রারম্ভিক জের (Opening B/L)' : 'Opening Balance'}</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(openingBalance, lang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            <button
              onClick={() => {
                setOpeningInput(openingBalance);
                setIsOpeningModalOpen(true);
              }}
              className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-semibold"
            >
              {lang === 'bn' ? '✏️ জের পরিবর্তন করুন' : '✏️ Edit Opening B/L'}
            </button>
          </p>
        </div>

        {/* Total Purchase Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{lang === 'bn' ? 'দোকান থেকে মোট ক্রয়' : 'Total Shop Purchases'}</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalPurchaseAmount, lang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {formatNumber(dokanInvoices.length, lang)} {lang === 'bn' ? 'টি দোকান ইনভয়েস' : 'shop invoices'}
          </p>
        </div>

        {/* Total Paid Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{lang === 'bn' ? 'দোকানে মোট পরিশোধ' : 'Total Payments to Shop'}</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaidAmount, lang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {formatNumber(dokanPayments.length, lang)} {lang === 'bn' ? 'টি পরিশোধ ভাউচার' : 'payment records'}
          </p>
        </div>

        {/* Net Status Card */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            isDue
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
              : isAdvance
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span
              className={
                isDue
                  ? 'text-rose-700 dark:text-rose-300'
                  : isAdvance
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }
            >
              {isDue
                ? lang === 'bn'
                  ? 'দোকানে অবশিষ্ট বকেয়া (Due)'
                  : 'Net Due to Shop'
                : isAdvance
                ? lang === 'bn'
                  ? 'দোকানে অগ্রিম জমা (Advance)'
                  : 'Net Advance with Shop'
                : lang === 'bn'
                ? 'হিসাব পরিশোধিত (Settled)'
                : 'Account Settled'}
            </span>
            {isDue ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : isAdvance ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              isDue
                ? 'text-rose-600 dark:text-rose-400'
                : isAdvance
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {formatCurrency(Math.abs(netBalance), lang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isDue
              ? lang === 'bn'
                ? 'দোকানদারকে এখনো এই পরিমাণ টাকা দেওয়া বাকি আছে'
                : 'Payable balance remaining to shop'
              : isAdvance
              ? lang === 'bn'
                ? 'দোকানে বাড়তি অগ্রিম টাকা জমা আছে'
                : 'Credit balance available for next purchases'
              : lang === 'bn'
              ? 'ক্রয় এবং পরিশোধের পরিমাণ সম্পূর্ণ সমান'
              : 'Exact balance zero'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {lang === 'bn' ? 'সমন্বিত লেজার হিসাব' : 'Combined Ledger'}
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {lang === 'bn' ? 'দোকান ইনভয়েস সমূহ' : 'Shop Invoices'} ({formatNumber(dokanInvoices.length, lang)})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {lang === 'bn' ? 'পরিশোধের তালিকা' : 'Payment Records'} ({formatNumber(dokanPayments.length, lang)})
        </button>
        <button
          onClick={() => setActiveTab('print')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'print'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {lang === 'bn' ? '১-পেজ প্রিন্ট প্রিভিউ' : '1-Page Print View'}
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {lang === 'bn' ? 'পার্টি লেজার / স্টেটমেন্ট' : 'Party Ledger / Statement'}
        </button>
      </div>

      {activeTab === 'ledger' && (
        <PartyLedgerStatement
          parties={parties}
          invoices={invoices}
          dokanInvoices={dokanInvoices}
          dokanPayments={dokanPayments}
          lang={lang}
          companyInfo={companyInfo}
          onViewInvoice={onViewInvoice}
        />
      )}


      {/* TAB 1: OVERVIEW COMBINED LEDGER */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices from Shop */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>{lang === 'bn' ? 'দোকান থেকে মাল ক্রয়ের তালিকা' : 'Recent Purchases from Shop'}</span>
              </h3>
              <button
                onClick={onOpenNewDokanInvoice}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                {lang === 'bn' ? '+ নতুন ইনভয়েস' : '+ New Invoice'}
              </button>
            </div>

            {dokanInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {lang === 'bn' ? 'দোকান ক্রয়ের কোনো ইনভয়েস নেই' : 'No shop purchase invoices recorded yet'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                {dokanInvoices.slice(0, 10).map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{inv.invoiceNo}</span>
                        <span className="text-[10px] font-normal text-slate-500">{formatDate(inv.date, lang)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                        {inv.items.map((i) => i.name).join(', ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inv.netInvoiceAmount || inv.grandTotal, lang)}
                      </div>
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer mt-0.5"
                      >
                        {lang === 'bn' ? 'দেখুন' : 'View'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments Made to Shop */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'bn' ? 'দোকানে পরিশোধের তালিকা' : 'Recent Payments Made'}</span>
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                {lang === 'bn' ? '+ টাকা পরিশোধ করুন' : '+ Make Payment'}
              </button>
            </div>

            {dokanPayments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {lang === 'bn' ? 'দোকানে কোনো টাকা পরিশোধের রেকর্ড নেই' : 'No payments recorded yet'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                {dokanPayments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{p.voucherNo || 'VOUCHER'}</span>
                        <span className="text-[10px] font-normal text-slate-500">{formatDate(p.date, lang)}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-600 dark:text-slate-300">
                          {p.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {p.recipientName && <span>গ্রহীতা: {p.recipientName}</span>}
                        {p.notes && <span> &bull; {p.notes}</span>}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amount, lang)}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(lang === 'bn' ? 'এই পেমেন্ট রেকর্ডটি মুছে ফেলতে চান?' : 'Delete payment?')) {
                            onDeletePayment(p.id);
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES FULL TABLE */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'bn' ? 'দোকান সংক্রান্ত ইনভয়েস তালিকা' : 'Dokan Invoices List'}
            </span>
            <button
              onClick={onOpenNewDokanInvoice}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              {lang === 'bn' ? '+ নতুন ইনভয়েস' : '+ New Invoice'}
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3">{t.invoiceNo}</th>
                <th className="py-2.5 px-3">{t.invoiceDate}</th>
                <th className="py-2.5 px-3">{lang === 'bn' ? 'দোকান / কাউন্টার' : 'Shop / Counter'}</th>
                <th className="py-2.5 px-3">{t.itemDescription}</th>
                <th className="py-2.5 px-3 text-right">{t.amount}</th>
                <th className="py-2.5 px-3 text-right">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dokanInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {inv.invoiceNo}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {formatDate(inv.date, lang)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {inv.partyName || (lang === 'bn' ? 'দোকান কাউন্টার' : 'Shop Counter')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-slate-700 dark:text-slate-300">
                      {inv.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(inv.netInvoiceAmount || inv.grandTotal, lang)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onViewInvoice(inv)}
                      className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'প্রিন্ট / বিস্তারিত' : 'Print / View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: PAYMENTS FULL TABLE */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {lang === 'bn' ? 'দোকানে পরিশোধিত টাকার তালিকা' : 'Payments Made to Shop'}
            </span>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              {lang === 'bn' ? '+ নতুন পেমেন্ট প্রদান' : '+ Record Payment'}
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3">ভাউচার নং</th>
                <th className="py-2.5 px-3">তারিখ</th>
                <th className="py-2.5 px-3">পরিশোধ মাধ্যম</th>
                <th className="py-2.5 px-3">গ্রহীতার নাম</th>
                <th className="py-2.5 px-3">বিবরণ / নোট</th>
                <th className="py-2.5 px-3 text-right">পরিশোধের পরিমাণ</th>
                <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dokanPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {p.voucherNo || 'DK-VOUCHER'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {formatDate(p.date, lang)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold uppercase text-[10px]">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {p.recipientName || 'দোকান ক্যাশ'}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                    {p.notes || '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(p.amount, lang)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(lang === 'bn' ? 'মুছে ফেলতে চান?' : 'Delete payment?')) {
                          onDeletePayment(p.id);
                        }
                      }}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: 1-PAGE PRINTABLE STATEMENT (A4 FIT) */}
      {activeTab === 'print' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 no-print">
            <div className="flex flex-wrap items-end gap-2 text-xs">
              <label className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-600 dark:text-slate-400">{lang === 'bn' ? 'শুরুর তারিখ' : 'From'}</span>
                <input type="date" value={printFrom} onChange={(e) => setPrintFrom(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-600 dark:text-slate-400">{lang === 'bn' ? 'শেষ তারিখ' : 'To'}</span>
                <input type="date" value={printTo} onChange={(e) => setPrintTo(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </label>
              <button type="button" onClick={() => { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]; setPrintFrom(d); setPrintTo(d); }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                {lang === 'bn' ? 'আজ' : 'Today'}
              </button>
              <button type="button" onClick={() => { setPrintFrom(''); setPrintTo(''); }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                {lang === 'bn' ? 'সব তারিখ' : 'All dates'}
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
            <WhatsAppShareDropdown
              getText={getDokanPrintWhatsAppText}
              lang={lang}
              targetElementId="dokan-sheet-print"
              fileName={`dokan-statement-${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}.png`}
              buttonLabel={lang === 'bn' ? 'দোকান হিসাব পাঠান' : 'Share on WhatsApp'}
            />
            <button
              onClick={handleDownloadDokanPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title={lang === 'bn' ? '১-পেজ A4 PDF ডাউনলোড করুন' : 'Download 1-Page A4 PDF'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? (lang === 'bn' ? 'পিডিএফ তৈরি...' : 'Exporting...') : (lang === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF')}</span>
            </button>
            <button
              onClick={handlePrintDokanStatement}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? (lang === 'bn' ? 'প্রিন্ট ডায়ালগ খুলছে...' : 'Opening...') : (lang === 'bn' ? 'প্রিন্ট করুন (১-পেজ A4)' : 'Print (1-Page A4)')}</span>
            </button>
            </div>
          </div>

          <div
            id="dokan-sheet-print"
            className="one-page-sheet max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0"
          >
            {/* Centralized Framed Company Header Box */}
            <div className="mb-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              {/* Top Golden Accent Bar */}
              <div className="w-full h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-t-full mb-3" />

              {/* Centralized Logo & Premium Vibrant Company Name */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 z-10">
                <div className="p-1.5 bg-white rounded-2xl shadow-md border-2 border-amber-400 shrink-0">
                  <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-black text-amber-300 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-tight leading-tight uppercase font-sans drop-shadow-md">
                    {companyInfo.name}
                  </h1>
                  <div className="inline-block px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white text-[11px] font-extrabold tracking-wide uppercase shadow-xs">
                    {lang === 'bn' ? companyInfo.businessTypeBn : companyInfo.businessTypeEn}
                  </div>
                </div>
              </div>

              {/* Centralized Contact Details Ribbon */}
              <div className="text-[11px] text-slate-200 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 pt-2.5 border-t border-slate-800/80 w-full font-medium z-10">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{companyInfo.address}</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-cyan-300 font-bold">
                  <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{companyInfo.phones.join(', ')}</span>
                </span>
              </div>

              {/* Statement Badge & Date Line */}
              <div className="mt-2.5 pt-2 w-full flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800 text-xs font-mono z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300 font-semibold">{lang === 'bn' ? 'রিপোর্ট বিষয়:' : 'Statement:'}</span>
                  <span className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow-md">
                    {lang === 'bn' ? 'দোকানের হিসাব স্টেটমেন্ট' : 'Shop Account Statement'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-bold">
                  {lang === 'bn' ? 'সময় / তারিখ: ' : 'Period/Date: '}
                  <strong className="text-cyan-300 font-bold">{printPeriodLabel}</strong>
                </div>
              </div>
            </div>

            {/* Quick Financial Summary Bar (Dynamic & Colorful) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5 text-center text-xs">
              <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 shadow-2xs">
                <span className="text-[10px] text-amber-800 uppercase font-extrabold block">
                  {lang === 'bn' ? 'প্রারম্ভিক জের (Opening)' : 'Opening B/L'}
                </span>
                <span className="font-mono font-black text-sm text-amber-900 mt-0.5 block">
                  {formatCurrency(printOpening, lang)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-blue-300 bg-blue-50/90 text-blue-950 shadow-2xs">
                <span className="text-[10px] text-blue-800 uppercase font-extrabold block">
                  {lang === 'bn' ? 'মোট মাল ক্রয়' : 'Total Purchased'}
                </span>
                <span className="font-mono font-black text-sm text-blue-900 mt-0.5 block">
                  {formatCurrency(printPurchaseTotal, lang)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 text-emerald-950 shadow-2xs">
                <span className="text-[10px] text-emerald-800 uppercase font-extrabold block">
                  {lang === 'bn' ? 'মোট পরিশোধ' : 'Total Paid'}
                </span>
                <span className="font-mono font-black text-sm text-emerald-900 mt-0.5 block">
                  {formatCurrency(printPaidTotal, lang)}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border-2 shadow-2xs ${printIsDue ? 'border-rose-400 bg-rose-50 text-rose-950' : printIsAdvance ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-slate-300 bg-slate-50 text-slate-800'}`}>
                <span className="text-[10px] uppercase font-black block">
                  {printIsDue
                    ? lang === 'bn'
                      ? 'দোকানে বকেয়া (Due)'
                      : 'Net Due to Shop'
                    : printIsAdvance
                    ? lang === 'bn'
                      ? 'অগ্রিম জমা (Advance)'
                      : 'Advance Balance'
                    : lang === 'bn'
                    ? 'হিসাব স্ট্যাটাস'
                    : 'Account Status'}
                </span>
                <span
                  className={`font-mono font-black text-base mt-0.5 block ${
                    printIsDue ? 'text-rose-700' : printIsAdvance ? 'text-emerald-700' : 'text-slate-800'
                  }`}
                >
                  {formatCurrency(Math.abs(printClosing), lang)}
                </span>
              </div>
            </div>

            {/* Table of Invoices */}
            <div className="mb-4">
              <h4 className="text-xs font-black text-indigo-950 uppercase mb-1 flex items-center gap-1.5">
                <span>🛒</span> {lang === 'bn' ? '১. দোকান থেকে মাল ক্রয়ের তালিকা (Purchases)' : '1. Shop Purchases List'}
              </h4>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold border-b-2 border-slate-950 shadow-xs">
                    <th className="py-2 px-2 border-r border-slate-700 text-center w-8 text-white font-bold">#</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-28 text-white font-bold">ইনভয়েস নং</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-24 text-white font-bold">তারিখ</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-white font-bold">পণ্যের বিবরণ</th>
                    <th className="py-2 px-2 text-right w-28 text-white font-bold">মোট বিল (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {printOpening !== 0 && (
                    <tr className="bg-amber-100/90 font-black border-b border-indigo-200 text-amber-950">
                      <td className="py-1.5 px-2 border-r border-indigo-200 text-center font-mono text-slate-500">
                        —
                      </td>
                      <td className="py-1.5 px-2 border-r border-indigo-200 font-mono font-black text-amber-900">
                        OPENING
                      </td>
                      <td className="py-1.5 px-2 border-r border-indigo-200 font-mono text-amber-900 font-bold">
                        {printFrom ? formatDate(printFrom, lang) : '—'}
                      </td>
                      <td className="py-1.5 px-2 border-r border-indigo-200 text-amber-950 font-black italic">
                        {lang === 'bn' ? 'পূর্বের প্রারম্ভিক জের (Opening Balance B/F)' : 'Opening Balance (brought forward)'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-amber-950">
                        {formatCurrency(printOpening, lang)}
                      </td>
                    </tr>
                  )}
                  {printInvoices.map((inv, idx) => (
                    <tr key={inv.id} className="border-b border-indigo-100 hover:bg-indigo-50/40">
                      <td className="py-1.5 px-2 border-r border-indigo-100 text-center font-mono text-slate-500">
                        {formatNumber(idx + 1, lang)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-indigo-100 font-mono font-black text-slate-900">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-1.5 px-2 border-r border-indigo-100 font-mono font-semibold text-slate-700">
                        {formatDate(inv.date, lang)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-indigo-100 font-medium text-slate-900">
                        {inv.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-indigo-950">
                        {formatCurrency(inv.netInvoiceAmount || inv.grandTotal, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table of Payments */}
            <div className="mb-6">
              <h4 className="text-xs font-black text-purple-950 uppercase mb-1 flex items-center gap-1.5">
                <span>💵</span> {lang === 'bn' ? '২. দোকানে পরিশোধকৃত ভাউচার তালিকা (Payments)' : '2. Payments Made to Shop'}
              </h4>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-bold border-b-2 border-slate-950 shadow-xs">
                    <th className="py-2 px-2 border-r border-slate-700 text-center w-8 text-white font-bold">#</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-28 text-white font-bold">ভাউচার নং</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-24 text-white font-bold">তারিখ</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-20 text-center text-white font-bold">মাধ্যম</th>
                    <th className="py-2 px-2 border-r border-slate-700 text-white font-bold">গ্রহীতা / বিবরণ</th>
                    <th className="py-2 px-2 text-right w-28 text-white font-bold">পরিশোধিত টাকা (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {printPayments.map((p, idx) => (
                    <tr key={p.id} className="border-b border-purple-100 hover:bg-purple-50/40">
                      <td className="py-1.5 px-2 border-r border-purple-100 text-center font-mono text-slate-500">
                        {formatNumber(idx + 1, lang)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-purple-100 font-mono font-black text-slate-900">
                        {p.voucherNo || '-'}
                      </td>
                      <td className="py-1.5 px-2 border-r border-purple-100 font-mono font-semibold text-slate-700">
                        {formatDate(p.date, lang)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-purple-100 uppercase font-mono text-[10px] text-center font-bold text-slate-700">
                        {p.paymentMethod}
                      </td>
                      <td className="py-1.5 px-2 border-r border-purple-100 font-medium text-slate-900">
                        {p.recipientName} {p.notes ? `(${p.notes})` : ''}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-emerald-800">
                        {formatCurrency(p.amount, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Statement & Unique Dynamic Signatures */}
            <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t-2 border-slate-300 text-center text-xs">
              <div className="p-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 flex flex-col justify-between h-20">
                <div className="w-full border-b border-dashed border-slate-300 pb-3 text-transparent select-none">.</div>
                <div className="font-black text-slate-800 text-[11px] flex items-center justify-center gap-1">
                  <span>✍️ {lang === 'bn' ? 'দোকান ক্যাশিয়ার স্বাক্ষর' : 'Shop Cashier Signature'}</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 flex flex-col justify-between h-20">
                <div className="w-full border-b border-dashed border-indigo-200 pb-3 text-transparent select-none">.</div>
                <div className="font-black text-indigo-900 text-[11px] flex items-center justify-center gap-1">
                  <span>🏛️ {lang === 'bn' ? 'মালিক / হিসাবরক্ষক স্বাক্ষর' : 'Authorized Signature'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <span>{lang === 'bn' ? 'দোকানে টাকা পরিশোধ করুন' : 'Record Payment to Shop'}</span>
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'পরিশোধের পরিমাণ (টাকা)*' : 'Amount (৳)*'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="cash">{t.cash}</option>
                    <option value="bKash">{t.bKash}</option>
                    <option value="nagad">{t.nagad}</option>
                    <option value="bank">{t.bank}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'bn' ? 'গ্রহীতার নাম / কার কাছে দেওয়া হয়েছে' : 'Recipient Name / Paid To'}
                </label>
                <input
                  type="text"
                  value={payRecipient}
                  onChange={(e) => setPayRecipient(e.target.value)}
                  placeholder="যেমন: দোকান ক্যাশ / মোবারক ভাই"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'bn' ? 'ভাউচার / মেমো নং' : 'Voucher / Memo No'}
                </label>
                <input
                  type="text"
                  value={payVoucherNo}
                  readOnly
                  tabIndex={-1}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'bn' ? 'নোট / বিবরণ' : 'Notes'}
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="যেমন: পুরাতন মাদারবোর্ড ক্রয়ের বিল পরিশোধ"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md"
                >
                  {lang === 'bn' ? 'পেমেন্ট সংরক্ষণ করুন' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opening Balance Modal */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'দোকানের প্রারম্ভিক জের (Opening B/L)' : 'Shop Opening Balance (Opening B/L)'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpeningModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="space-y-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'bn'
                  ? 'সফটওয়্যার চালুর পূর্বে দোকানদারের কাছে যদি কোনো আগের বকেয়া থাকে বা বাড়তি অগ্রিম টাকা জমা থাকে, তা এখানে লিখুন (+ মান বাকি, - মান অগ্রিম)।'
                  : 'Enter the pre-existing balance with the shop before system records (+ for Due, - for Advance).'}
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'প্রারম্ভিক জের পরিমাণ (৳)' : 'Opening Balance Amount (৳)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={openingInput}
                  onChange={(e) => setOpeningInput(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-base font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shadow-md"
                >
                  {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Opening B/L'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
