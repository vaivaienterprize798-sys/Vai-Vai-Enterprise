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
} from 'lucide-react';
import {
  Invoice,
  DokanPayment,
  PaymentMethod,
  Language,
  CompanyInfo,
} from '../types';
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
}) => {
  const t = translations[lang];

  // Modals and tabs
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'print'>('overview');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Payment Form States
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRecipient, setPayRecipient] = useState('');
  const [payVoucherNo, setPayVoucherNo] = useState(`DK-PAY-${Math.floor(100 + Math.random() * 900)}`);
  const [payNotes, setPayNotes] = useState('');

  // 1. Auto-filter shop purchase invoices (type === 'dokan' or purchase with Dokan in party/notes)
  const dokanInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.type === 'dokan' ||
        (inv.mode === 'purchase' &&
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

  const netBalance = totalPurchaseAmount - totalPaidAmount;
  const isDue = netBalance > 0;
  const isAdvance = netBalance < 0;

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
      voucherNo: payVoucherNo.trim() || `DK-PAY-${Date.now().toString().slice(-4)}`,
      notes: payNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSavePayment(newPayment);
    setIsPaymentModalOpen(false);
    setPayAmount('');
    setPayRecipient('');
    setPayNotes('');
    setPayVoucherNo(`DK-PAY-${Math.floor(100 + Math.random() * 900)}`);
  };

  const getDokanWhatsAppText = () => {
    return `*${companyInfo.name} - ${lang === 'bn' ? 'দোকানের হিসাব স্টেটমেন্ট' : 'Shop Account Statement'}*
📅 *তারিখ:* ${new Date().toISOString().split('T')[0]}
────────────────────────
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
    await exportElementToPdf('dokan-sheet-print', `dokan-statement-${new Date().toISOString().split('T')[0]}.pdf`);
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            {formatNumber(dokanInvoices.length, lang)} {lang === 'bn' ? 'টি দোকান ইনভয়েস থেকে অটো সংযুক্ত' : 'shop invoices auto-linked'}
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
            {formatNumber(dokanPayments.length, lang)} {lang === 'bn' ? 'টি পরিশোধ ভাউচার রেকর্ড' : 'payment records'}
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
      </div>

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
          <div className="flex flex-wrap justify-end gap-2 no-print">
            <WhatsAppShareDropdown
              getText={getDokanWhatsAppText}
              lang={lang}
              targetElementId="dokan-sheet-print"
              fileName={`dokan-statement-${new Date().toISOString().split('T')[0]}.png`}
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

          <div
            id="dokan-sheet-print"
            className="one-page-sheet max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0"
          >
            {/* Company Header */}
            <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start gap-4">
              <div className="flex items-start gap-3">
                <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-12 h-12 shrink-0" />
                <div className="space-y-1">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                    {companyInfo.name}
                  </h1>
                  <p className="text-[11px] font-medium text-slate-600">
                    {lang === 'bn' ? companyInfo.businessTypeBn : companyInfo.businessTypeEn}
                  </p>
                  <div className="text-[10px] text-slate-500">
                    <span>{companyInfo.address} &bull; {companyInfo.phones.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1 shrink-0">
                <div className="inline-block px-2.5 py-1 bg-slate-900 text-white font-bold text-xs rounded-md uppercase tracking-wider">
                  {lang === 'bn' ? 'দোকানের হিসাব স্টেটমেন্ট' : 'Shop Account Statement'}
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {lang === 'bn' ? 'তারিখ: ' : 'Date: '}
                  <strong>{formatDate(new Date().toISOString().split('T')[0], lang)}</strong>
                </div>
              </div>
            </div>

            {/* Quick Financial Summary Bar */}
            <div className="grid grid-cols-3 gap-3 my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  {lang === 'bn' ? 'মোট মাল ক্রয়' : 'Total Purchased'}
                </span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(totalPurchaseAmount, lang)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  {lang === 'bn' ? 'মোট পরিশোধ' : 'Total Paid'}
                </span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatCurrency(totalPaidAmount, lang)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  {isDue
                    ? lang === 'bn'
                      ? 'দোকানে বকেয়া (Due)'
                      : 'Net Due to Shop'
                    : isAdvance
                    ? lang === 'bn'
                      ? 'অগ্রিম জমা (Advance)'
                      : 'Advance Balance'
                    : lang === 'bn'
                    ? 'হিসাব স্ট্যাটাস'
                    : 'Account Status'}
                </span>
                <span
                  className={`font-mono font-black text-sm ${
                    isDue ? 'text-rose-700' : isAdvance ? 'text-emerald-700' : 'text-slate-800'
                  }`}
                >
                  {formatCurrency(Math.abs(netBalance), lang)}
                </span>
              </div>
            </div>

            {/* Table of Invoices */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-1">
                {lang === 'bn' ? '১. দোকান থেকে মাল ক্রয়ের তালিকা' : '1. Shop Purchases List'}
              </h4>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase text-[10px] font-bold border-b border-slate-300">
                    <th className="py-1 px-2 border-r border-slate-300 text-center w-8">ক্র.</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-28">ইনভয়েস নং</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-20">তারিখ</th>
                    <th className="py-1 px-2 border-r border-slate-300">পণ্যের বিবরণ</th>
                    <th className="py-1 px-2 text-right w-28">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody>
                  {dokanInvoices.map((inv, idx) => (
                    <tr key={inv.id} className="border-b border-slate-200">
                      <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                        {formatNumber(idx + 1, lang)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono font-bold">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono">
                        {formatDate(inv.date, lang)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200">
                        {inv.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        {formatCurrency(inv.netInvoiceAmount || inv.grandTotal, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table of Payments */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-1">
                {lang === 'bn' ? '২. দোকানে পরিশোধকৃত ভাউচার' : '2. Payments Made to Shop'}
              </h4>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 uppercase text-[10px] font-bold border-b border-slate-300">
                    <th className="py-1 px-2 border-r border-slate-300 text-center w-8">ক্র.</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-28">ভাউচার নং</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-20">তারিখ</th>
                    <th className="py-1 px-2 border-r border-slate-300 w-20">মাধ্যম</th>
                    <th className="py-1 px-2 border-r border-slate-300">গ্রহীতা / বিবরণ</th>
                    <th className="py-1 px-2 text-right w-28">পরিশোধিত টাকা</th>
                  </tr>
                </thead>
                <tbody>
                  {dokanPayments.map((p, idx) => (
                    <tr key={p.id} className="border-b border-slate-200">
                      <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                        {formatNumber(idx + 1, lang)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono font-bold">
                        {p.voucherNo || '-'}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 font-mono">
                        {formatDate(p.date, lang)}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 uppercase font-mono text-[10px]">
                        {p.paymentMethod}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200">
                        {p.recipientName} {p.notes ? `(${p.notes})` : ''}
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-emerald-800">
                        {formatCurrency(p.amount, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Statement & Signature Line */}
            <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs text-slate-700">
              <div>
                <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">
                  {lang === 'bn' ? 'দোকান ক্যাশিয়ার স্বাক্ষর' : 'Shop Cashier Signature'}
                </div>
              </div>
              <div>
                <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">
                  {lang === 'bn' ? 'মালিক / হিসাবরক্ষক স্বাক্ষর' : 'Authorized Signature'}
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
                  onChange={(e) => setPayVoucherNo(e.target.value)}
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
    </div>
  );
};
