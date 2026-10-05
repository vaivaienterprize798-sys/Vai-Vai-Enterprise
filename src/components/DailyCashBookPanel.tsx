import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Coins,
  Printer,
  Download,
  Calendar,
  RotateCcw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Building,
  Car,
  Store,
  CreditCard,
  Trash2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import {
  CompanyInfo,
  DokanPayment,
  Invoice,
  Language,
  Party,
  PettyCashExpense,
  CarExpense,
  CashBookManualEntry,
  ChinaDirectPayment,
  ThirdPartyRmbConversion,
} from '../types';
import { formatCurrency, formatDate, formatNumber } from '../lib/translations';
import { executePrint, exportElementToPdf } from '../lib/printUtils';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { CompanyLogo } from './CompanyLogo';
import { storageService } from '../lib/storage';

export interface DailyCashBookPanelProps {
  invoices: Invoice[];
  dokanPayments: DokanPayment[];
  pettyCash: PettyCashExpense[];
  carExpenses: CarExpense[];
  chinaDirectPayments?: ChinaDirectPayment[];
  conversions?: ThirdPartyRmbConversion[];
  parties?: Party[];
  lang: Language;
  companyInfo: CompanyInfo;
  onViewInvoice?: (inv: Invoice) => void;
}

export interface CashTransaction {
  id: string;
  date: string;
  createdAt?: string;
  refNo: string;
  particulars: string;
  category: 'invoice_in' | 'invoice_out' | 'dokan_pay' | 'petty_cash' | 'car_expense' | 'china_pay' | 'manual_in' | 'manual_out';
  categoryLabel: string;
  cashIn: number;
  cashOut: number;
  invoice?: Invoice;
  isManual?: boolean;
  manualId?: string;
}

export const DailyCashBookPanel: React.FC<DailyCashBookPanelProps> = ({
  invoices,
  dokanPayments,
  pettyCash,
  carExpenses,
  chinaDirectPayments = [],
  conversions = [],
  parties = [],
  lang,
  companyInfo,
  onViewInvoice,
}) => {
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  // States
  const [openingBalance, setOpeningBalance] = useState<number>(() => storageService.getCashBookOpeningBalance());
  const [manualEntries, setManualEntries] = useState<CashBookManualEntry[]>(() => storageService.getCashBookManualEntries());
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingInput, setOpeningInput] = useState<string | number>(openingBalance);

  // Manual entry modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'in' | 'out'>('in');
  const [manualDate, setManualDate] = useState(todayStr);
  const [manualAmount, setManualAmount] = useState<string | number>('');
  const [manualParticulars, setManualParticulars] = useState('');
  const [manualRefNo, setManualRefNo] = useState('');

  // Date Filter Presets
  const [filterMode, setFilterMode] = useState<'today' | 'this_month' | 'custom' | 'all'>('today');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Handle Opening Balance Save
  const handleSaveOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(openingInput) || 0;
    storageService.setCashBookOpeningBalance(val);
    setOpeningBalance(val);
    setIsOpeningModalOpen(false);
  };

  // Handle Manual Entry Save
  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(manualAmount);
    if (!amt || amt <= 0 || !manualParticulars.trim()) {
      alert(lang === 'bn' ? 'দয়া করে বিবরণ এবং সঠিক টাকার পরিমাণ লিখুন' : 'Please provide description and valid amount');
      return;
    }

    const entry: CashBookManualEntry = {
      id: `cbm-${Date.now()}`,
      date: manualDate,
      type: manualType,
      amount: amt,
      particulars: manualParticulars.trim(),
      refNo: manualRefNo.trim() || `CASH-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };

    storageService.saveCashBookManualEntry(entry);
    setManualEntries(storageService.getCashBookManualEntries());
    setIsManualModalOpen(false);
    setManualAmount('');
    setManualParticulars('');
    setManualRefNo('');
  };

  const handleDeleteManualEntry = (id: string) => {
    if (confirm(lang === 'bn' ? 'এই এন্ট্রিটি মুছে ফেলতে চান?' : 'Delete this entry?')) {
      storageService.deleteCashBookManualEntry(id);
      setManualEntries(storageService.getCashBookManualEntries());
    }
  };

  // 1. Build All Cash Transactions across all ERP modules
  const allTransactions = useMemo(() => {
    const list: CashTransaction[] = [];

    // A. Invoices with cash component
    for (const inv of invoices || []) {
      if (inv.type === 'processing') continue;
      const paid = Number(inv.paidAmount) || 0;
      if (paid <= 0) continue;

      const isReceived = inv.voucherKind ? inv.voucherKind === 'payment_received' : inv.mode === 'sales';

      list.push({
        id: `inv-${inv.id}`,
        date: inv.date,
        createdAt: inv.createdAt,
        refNo: inv.invoiceNo,
        particulars: `${isReceived ? (lang === 'bn' ? 'টাকা গ্রহণ' : 'Cash Received') : (lang === 'bn' ? 'টাকা প্রদান' : 'Cash Paid')} — ${inv.partyName || (lang === 'bn' ? 'ক্যাশ পার্টি' : 'Cash Party')}`,
        category: isReceived ? 'invoice_in' : 'invoice_out',
        categoryLabel: isReceived ? (lang === 'bn' ? 'বিক্রয় / পার্টি জমা' : 'Sales / Cash In') : (lang === 'bn' ? 'ক্রয় / পার্টি পরিশোধ' : 'Purchase / Cash Out'),
        cashIn: isReceived ? paid : 0,
        cashOut: isReceived ? 0 : paid,
        invoice: inv,
      });
    }

    // B. Dokan payments
    for (const dp of dokanPayments || []) {
      const amt = Number(dp.amount) || 0;
      if (amt <= 0) continue;
      list.push({
        id: `dp-${dp.id}`,
        date: dp.date,
        createdAt: dp.createdAt,
        refNo: dp.voucherNo || 'DOKAN-PAY',
        particulars: `${lang === 'bn' ? 'দোকানে পরিশোধ' : 'Paid to Shop'}${dp.recipientName ? ` (${dp.recipientName})` : ''}${dp.notes ? ` - ${dp.notes}` : ''}`,
        category: 'dokan_pay',
        categoryLabel: lang === 'bn' ? 'দোকান পরিশোধ' : 'Shop Payment',
        cashIn: 0,
        cashOut: amt,
      });
    }

    // C. Petty Cash Office Expenses
    for (const pc of pettyCash || []) {
      const amt = Number(pc.amount) || 0;
      if (amt <= 0) continue;
      list.push({
        id: `pc-${pc.id}`,
        date: pc.date,
        createdAt: (pc as any).createdAt || pc.date,
        refNo: pc.voucherNo || pc.receiptNo || 'EXP',
        particulars: `${lang === 'bn' ? 'অফিস খরচ' : 'Office Expense'} — ${pc.title}${pc.notes ? ` (${pc.notes})` : ''}`,
        category: 'petty_cash',
        categoryLabel: lang === 'bn' ? 'অফিস খরচ' : 'Office Expense',
        cashIn: 0,
        cashOut: amt,
      });
    }

    // D. Car Expenses
    for (const ce of carExpenses || []) {
      const amt = Number(ce.amount) || 0;
      if (amt <= 0) continue;
      list.push({
        id: `ce-${ce.id}`,
        date: ce.date,
        createdAt: (ce as any).createdAt || ce.date,
        refNo: ce.voucherNo || ce.receiptNo || 'CAR',
        particulars: `${lang === 'bn' ? 'গাড়ি খরচ' : 'Car Expense'} — ${ce.title}${ce.vehicleNo ? ` [${ce.vehicleNo}]` : ''}`,
        category: 'car_expense',
        categoryLabel: lang === 'bn' ? 'গাড়ি খরচ' : 'Car Expense',
        cashIn: 0,
        cashOut: amt,
      });
    }

    // E. China Direct Payments (if cash)
    for (const cdp of chinaDirectPayments || []) {
      if (cdp.paymentMethod === 'cash') {
        const amt = Number(cdp.amountBdt) || 0;
        if (amt > 0) {
          list.push({
            id: `cdp-${cdp.id}`,
            date: cdp.date,
            createdAt: cdp.createdAt,
            refNo: cdp.referenceNo || 'CDP-CASH',
            particulars: `${lang === 'bn' ? 'চীন অফিস ক্যাশ পেমেন্ট' : 'China Office Cash Payment'} — ${cdp.branchName}`,
            category: 'china_pay',
            categoryLabel: lang === 'bn' ? 'চীন অফিস' : 'China Office',
            cashIn: 0,
            cashOut: amt,
          });
        }
      }
    }

    // F. Manual Cash Book Entries
    for (const m of manualEntries || []) {
      const amt = Number(m.amount) || 0;
      if (amt <= 0) continue;
      const desc = m.particulars || m.title || m.notes || 'ক্যাশ এন্ট্রি';
      list.push({
        id: `man-${m.id}`,
        date: m.date,
        createdAt: m.createdAt,
        refNo: m.refNo || m.referenceNo || 'MANUAL',
        particulars: `${desc} (${lang === 'bn' ? 'ম্যানুয়াল' : 'Manual'})`,
        category: m.type === 'in' ? 'manual_in' : 'manual_out',
        categoryLabel: m.type === 'in' ? (lang === 'bn' ? 'অন্যান্য নগদ জমা' : 'Manual Cash In') : (lang === 'bn' ? 'অন্যান্য নগদ খরচ' : 'Manual Cash Out'),
        cashIn: m.type === 'in' ? amt : 0,
        cashOut: m.type === 'out' ? amt : 0,
        isManual: true,
        manualId: m.id,
      });
    }

    // Sort chronologically ascending for ledger accumulation
    list.sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    return list;
  }, [invoices, dokanPayments, pettyCash, carExpenses, chinaDirectPayments, manualEntries, lang]);

  // Set filter dates based on filterMode
  const setPreset = (mode: 'today' | 'this_month' | 'all') => {
    setFilterMode(mode);
    if (mode === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (mode === 'this_month') {
      const ym = todayStr.slice(0, 7);
      setFromDate(`${ym}-01`);
      const lastDay = new Date(Number(ym.split('-')[0]), Number(ym.split('-')[1]), 0).getDate();
      setToDate(`${ym}-${String(lastDay).padStart(2, '0')}`);
    } else if (mode === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // 2. Calculations: Prior Opening Balance (sum of opening + all transactions prior to fromDate)
  const priorCalculations = useMemo(() => {
    if (!fromDate) {
      return { priorOpening: openingBalance, priorIn: 0, priorOut: 0 };
    }
    let priorIn = 0;
    let priorOut = 0;
    for (const item of allTransactions) {
      if (item.date < fromDate) {
        priorIn += item.cashIn;
        priorOut += item.cashOut;
      }
    }
    const priorOpening = openingBalance + priorIn - priorOut;
    return { priorOpening, priorIn, priorOut };
  }, [allTransactions, fromDate, openingBalance]);

  // 3. Transactions within the current filter range
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((item) => {
      const matchFrom = !fromDate || item.date >= fromDate;
      const matchTo = !toDate || item.date <= toDate;
      const matchCat =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'in'
          ? item.cashIn > 0
          : selectedCategory === 'out'
          ? item.cashOut > 0
          : item.category === selectedCategory;

      const matchSearch =
        !searchTerm.trim() ||
        item.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.refNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase());

      return matchFrom && matchTo && matchCat && matchSearch;
    });
  }, [allTransactions, fromDate, toDate, selectedCategory, searchTerm]);

  // 4. Period totals
  const periodTotals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const item of filteredTransactions) {
      totalIn += item.cashIn;
      totalOut += item.cashOut;
    }
    const startingBal = priorCalculations.priorOpening;
    const closingBal = startingBal + totalIn - totalOut;
    return { totalIn, totalOut, startingBal, closingBal };
  }, [filteredTransactions, priorCalculations]);

  // Compute running balance for each row in the filtered view
  const rowsWithRunningBalance = useMemo(() => {
    let running = periodTotals.startingBal;
    return filteredTransactions.map((row) => {
      running += row.cashIn - row.cashOut;
      return {
        ...row,
        runningBalance: running,
      };
    });
  }, [filteredTransactions, periodTotals.startingBal]);

  // WhatsApp Share Message
  const getWhatsAppMessage = () => {
    const periodLabel = !fromDate && !toDate
      ? (lang === 'bn' ? 'সকল সময় (All Time)' : 'All Time')
      : fromDate === toDate
      ? formatDate(fromDate, lang)
      : `${formatDate(fromDate, lang)} - ${formatDate(toDate, lang)}`;

    const topItems = rowsWithRunningBalance.slice(0, 15).map(
      (r) => `▪ ${r.date} | ${r.particulars} | ${r.cashIn > 0 ? `+৳${r.cashIn.toLocaleString()}` : `-৳${r.cashOut.toLocaleString()}`}`
    ).join('\n');

    return `*${companyInfo.name} - ${lang === 'bn' ? 'দৈনিক ক্যাশ বুক' : 'Daily Cash Book'}*
📅 *তারিখ / সময়কাল:* ${periodLabel}
────────────────────────
🏦 *প্রারম্ভিক ক্যাশ (Opening B/L):* ৳${periodTotals.startingBal.toLocaleString()}
📈 *মোট ক্যাশ জমা (Cash In):* ৳${periodTotals.totalIn.toLocaleString()}
📉 *মোট ক্যাশ খরচ (Cash Out):* ৳${periodTotals.totalOut.toLocaleString()}
────────────────────────
💵 *সমাপনী নগদ ব্যালেন্স (Closing Cash):* ৳${periodTotals.closingBal.toLocaleString()}
────────────────────────
*প্রধান লেনদেনসমূহ:*
${topItems || 'কোনো লেনদেন রেকর্ড পাওয়া যায়নি'}
${rowsWithRunningBalance.length > 15 ? `\n...এবং আরও ${rowsWithRunningBalance.length - 15} টি লেনদেন` : ''}
────────────────────────
_${companyInfo.name}_`;
  };

  const handlePrint = () => {
    setIsPrinting(true);
    executePrint('rsr-daily-cashbook-print', `${companyInfo.name} - Daily Cash Book`);
    setTimeout(() => setIsPrinting(false), 800);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    await exportElementToPdf('rsr-daily-cashbook-print', `daily-cashbook-${todayStr}.pdf`);
    setIsExportingPdf(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-10 h-10" />
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'দৈনিক ক্যাশ বুক (Daily Cash Book)' : 'Daily Cash Book'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'সকল ইনভয়েস, দোকান পেমেন্ট, অফিস ও গাড়ি খরচ এবং ম্যানুয়াল লেনদেনের সমন্বিত অটো ক্যাশ বুক'
                : 'Consolidated auto cash tracking from invoices, shop payments, petty cash, and manual entries'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareDropdown
            getText={getWhatsAppMessage}
            lang={lang}
            buttonLabel={lang === 'bn' ? 'ক্যাশ বুক পাঠান' : 'Share Cash Book'}
          />

          <button
            onClick={() => {
              setOpeningInput(openingBalance);
              setIsOpeningModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            title={lang === 'bn' ? 'প্রারম্ভিক জের (Opening B/L) পরিবর্তন করুন' : 'Change Opening Balance'}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'প্রারম্ভিক জের (Opening B/L)' : 'Opening B/L'}</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ ক্যাশ এন্ট্রি' : '+ Cash Entry'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'প্রিন্ট (১-পেজ)' : 'Print (1-Page)'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>{lang === 'bn' ? 'প্রারম্ভিক ক্যাশ (Opening B/L)' : 'Opening Cash (B/L)'}</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(periodTotals.startingBal, lang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{lang === 'bn' ? 'আজকের পূর্বের ব্যালেন্স' : 'Prior to period'}</span>
            <button
              onClick={() => {
                setOpeningInput(openingBalance);
                setIsOpeningModalOpen(true);
              }}
              className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
            >
              {lang === 'bn' ? '✏️ এডিট' : '✏️ Edit'}
            </button>
          </p>
        </div>

        {/* Total Cash In */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>{lang === 'bn' ? 'মোট নগদ জমা (Cash In)' : 'Total Cash In'}</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(periodTotals.totalIn, lang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {formatNumber(filteredTransactions.filter((t) => t.cashIn > 0).length, lang)} {lang === 'bn' ? 'টি জমা এন্ট্রি' : 'cash-in records'}
          </p>
        </div>

        {/* Total Cash Out */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>{lang === 'bn' ? 'মোট নগদ খরচ (Cash Out)' : 'Total Cash Out'}</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(periodTotals.totalOut, lang)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {formatNumber(filteredTransactions.filter((t) => t.cashOut > 0).length, lang)} {lang === 'bn' ? 'টি খরচ এন্ট্রি' : 'cash-out records'}
          </p>
        </div>

        {/* Closing Cash Balance */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
            <span>{lang === 'bn' ? 'সমাপনী নগদ ব্যালেন্স (Closing)' : 'Closing Cash Balance'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
            {formatCurrency(periodTotals.closingBal, lang)}
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            {lang === 'bn' ? 'ক্যাশ বাক্সে বর্তমান মোট জমা টাকা' : 'Net cash currently in hand'}
          </p>
        </div>
      </div>

      {/* 3. Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Presets */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setPreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'আজ (Today)' : 'Today'}
            </button>
            <button
              onClick={() => setPreset('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'this_month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'চলতি মাস' : 'This Month'}
            </button>
            <button
              onClick={() => setPreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'সকল সময়' : 'All Time'}
            </button>
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">{lang === 'bn' ? 'হতে:' : 'From:'}</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setFilterMode('custom');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">{lang === 'bn' ? 'পর্যন্ত:' : 'To:'}</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setFilterMode('custom');
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'bn' ? 'বিবরণ বা ভাউচার খুঁজুন...' : 'Search particulars...'}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold mr-1">{lang === 'bn' ? 'ক্যাটাগরি:' : 'Category:'}</span>
          {[
            { key: 'all', label: lang === 'bn' ? 'সকল লেনদেন' : 'All Entries' },
            { key: 'in', label: lang === 'bn' ? 'শুধুমাত্র জমা (Cash In)' : 'Cash In Only' },
            { key: 'out', label: lang === 'bn' ? 'শুধুমাত্র খরচ (Cash Out)' : 'Cash Out Only' },
            { key: 'invoice_in', label: lang === 'bn' ? 'বিক্রয় ক্যাশ' : 'Sales Cash' },
            { key: 'invoice_out', label: lang === 'bn' ? 'ক্রয় ক্যাশ' : 'Purchase Cash' },
            { key: 'dokan_pay', label: lang === 'bn' ? 'দোকান পরিশোধ' : 'Shop Pay' },
            { key: 'petty_cash', label: lang === 'bn' ? 'অফিস খরচ' : 'Office Exp' },
            { key: 'car_expense', label: lang === 'bn' ? 'গাড়ি খরচ' : 'Car Exp' },
            { key: 'manual_in', label: lang === 'bn' ? 'ম্যানুয়াল জমা' : 'Manual In' },
            { key: 'manual_out', label: lang === 'bn' ? 'ম্যানুয়াল খরচ' : 'Manual Out' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-[11px] ${
                selectedCategory === cat.key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {lang === 'bn' ? 'ক্যাশ বুক লেজার বিবরণী' : 'Cash Book Ledger Statement'}
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {formatNumber(rowsWithRunningBalance.length, lang)} {lang === 'bn' ? 'টি লেনদেন প্রদর্শিত' : 'records shown'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border-b border-slate-950">
                <th className="py-3 px-3 w-12 text-center text-white font-bold">#</th>
                <th className="py-3 px-3 w-28 text-white font-bold">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                <th className="py-3 px-3 w-28 text-white font-bold">{lang === 'bn' ? 'ভাউচার নং' : 'Voucher/Ref'}</th>
                <th className="py-3 px-4 text-white font-bold">{lang === 'bn' ? 'বিবরণ ও পক্ষ' : 'Particulars'}</th>
                <th className="py-3 px-3 w-32 text-white font-bold">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                <th className="py-3 px-3 text-right text-emerald-300 w-32 font-bold">
                  {lang === 'bn' ? 'জমা / আয় (+)' : 'Cash In (+)'}
                </th>
                <th className="py-3 px-3 text-right text-rose-300 w-32 font-bold">
                  {lang === 'bn' ? 'খরচ / প্রদান (-)' : 'Cash Out (-)'}
                </th>
                <th className="py-3 px-3 text-right text-white w-36 font-bold">
                  {lang === 'bn' ? 'অবশিষ্ট ব্যালেন্স' : 'Balance'}
                </th>
                <th className="py-3 px-2 w-10 text-center text-white font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {/* Prior Opening Balance Row */}
              <tr className="bg-amber-50/40 dark:bg-amber-950/10 font-semibold text-amber-900 dark:text-amber-300">
                <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                <td className="py-2.5 px-3 font-mono">{fromDate ? formatDate(fromDate, lang) : '—'}</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">OPENING</td>
                <td className="py-2.5 px-4">
                  {lang === 'bn' ? 'পূর্বের প্রারম্ভিক জের (Opening Balance B/F)' : 'Opening Balance Brought Forward'}
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                    Opening B/L
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono">—</td>
                <td className="py-2.5 px-3 text-right font-mono">—</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(periodTotals.startingBal, lang)}
                </td>
                <td className="py-2.5 px-2"></td>
              </tr>

              {rowsWithRunningBalance.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {lang === 'bn' ? 'নির্বাচিত সময়কালে কোনো ক্যাশ লেনদেন পাওয়া যায়নি' : 'No cash transactions found in this period'}
                  </td>
                </tr>
              ) : (
                rowsWithRunningBalance.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {formatDate(row.date, lang)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {row.invoice && onViewInvoice ? (
                        <button
                          onClick={() => onViewInvoice(row.invoice!)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          {row.refNo}
                        </button>
                      ) : (
                        row.refNo
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {row.particulars}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.categoryLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {row.cashIn > 0 ? formatCurrency(row.cashIn, lang) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {row.cashOut > 0 ? formatCurrency(row.cashOut, lang) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(row.runningBalance, lang)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {row.isManual && row.manualId && (
                        <button
                          onClick={() => handleDeleteManualEntry(row.manualId!)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete manual entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}

              {/* Bottom Totals Row */}
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                <td colSpan={5} className="py-3 px-4 text-right">
                  {lang === 'bn' ? 'মোট লেনদেন ও সমাপনী ব্যালেন্স:' : 'Totals & Closing Balance:'}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(periodTotals.totalIn, lang)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(periodTotals.totalOut, lang)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-950 dark:text-white text-sm bg-emerald-50 dark:bg-emerald-950/30">
                  {formatCurrency(periodTotals.closingBal, lang)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Printable 1-Page Element (Hidden in regular UI, rendered for print/PDF) */}
      <div className="hidden">
        <div id="rsr-daily-cashbook-print" className="p-6 bg-white text-slate-900 font-sans text-xs max-w-4xl mx-auto space-y-4">
          <div className="border-b pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-slate-900">{companyInfo.name}</h1>
              <p className="text-xs text-slate-600">{companyInfo.address} | ফোন: {companyInfo.phones?.join(', ') || ''}</p>
              <h2 className="text-sm font-bold text-emerald-800 mt-1">দৈনিক ক্যাশ বুক স্টেটমেন্ট (Daily Cash Book)</h2>
            </div>
            <div className="text-right font-mono text-xs space-y-0.5">
              <div>তারিখ: {new Date().toISOString().split('T')[0]}</div>
              <div className="text-[11px] text-slate-600">
                সময়কাল: {!fromDate && !toDate ? 'সকল সময়' : `${fromDate || '...'} থেকে ${toDate || '...'}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 border p-3 rounded-lg bg-slate-50 text-center font-mono">
            <div>
              <div className="text-[10px] text-slate-500 font-bold">প্রারম্ভিক ক্যাশ</div>
              <div className="text-sm font-black text-amber-700">৳{periodTotals.startingBal.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold">মোট নগদ জমা (+)</div>
              <div className="text-sm font-black text-emerald-700">৳{periodTotals.totalIn.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold">মোট নগদ খরচ (-)</div>
              <div className="text-sm font-black text-rose-700">৳{periodTotals.totalOut.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold">সমাপনী ক্যাশ ব্যালেন্স</div>
              <div className="text-sm font-black text-slate-950">৳{periodTotals.closingBal.toLocaleString()}</div>
            </div>
          </div>

          <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                <th className="py-1 px-2 border-r border-slate-300">তারিখ</th>
                <th className="py-1 px-2 border-r border-slate-300">ভাউচার নং</th>
                <th className="py-1 px-2 border-r border-slate-300">বিবরণ</th>
                <th className="py-1 px-2 text-right border-r border-slate-300">জমা (৳)</th>
                <th className="py-1 px-2 text-right border-r border-slate-300">খরচ (৳)</th>
                <th className="py-1 px-2 text-right">ব্যালেন্স (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-amber-50 font-bold">
                <td className="py-1 px-2 border-r border-slate-200">{fromDate || '—'}</td>
                <td className="py-1 px-2 border-r border-slate-200">OPENING</td>
                <td className="py-1 px-2 border-r border-slate-200">প্রারম্ভিক জের (Opening Balance)</td>
                <td className="py-1 px-2 text-right border-r border-slate-200">—</td>
                <td className="py-1 px-2 text-right border-r border-slate-200">—</td>
                <td className="py-1 px-2 text-right font-mono font-bold">৳{periodTotals.startingBal.toLocaleString()}</td>
              </tr>
              {rowsWithRunningBalance.map((r) => (
                <tr key={r.id} className="border-b border-slate-200">
                  <td className="py-1 px-2 border-r border-slate-200 font-mono">{r.date}</td>
                  <td className="py-1 px-2 border-r border-slate-200 font-mono">{r.refNo}</td>
                  <td className="py-1 px-2 border-r border-slate-200">{r.particulars}</td>
                  <td className="py-1 px-2 text-right border-r border-slate-200 font-mono text-emerald-800">
                    {r.cashIn > 0 ? `৳${r.cashIn.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-1 px-2 text-right border-r border-slate-200 font-mono text-rose-800">
                    {r.cashOut > 0 ? `৳${r.cashOut.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold">৳{r.runningBalance.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="py-1.5 px-2 text-right border-r border-slate-300">মোট ও সমাপনী:</td>
                <td className="py-1.5 px-2 text-right border-r border-slate-300 font-mono text-emerald-900">৳{periodTotals.totalIn.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right border-r border-slate-300 font-mono text-rose-900">৳{periodTotals.totalOut.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right font-mono font-black">৳{periodTotals.closingBal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="pt-8 flex justify-between text-[11px] text-slate-500">
            <div>হিসাব রক্ষকের স্বাক্ষর: _________________</div>
            <div>কর্তৃপক্ষের স্বাক্ষর: _________________</div>
          </div>
        </div>
      </div>

      {/* 6. Opening Balance Modal */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'ক্যাশ বুকের প্রারম্ভিক জের (Opening B/L)' : 'Cash Book Opening Balance'}
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
                  ? 'সফটওয়্যার চালুর পূর্বে ক্যাশ বাক্সে যে প্রারম্ভিক নগদ টাকা ছিল, তা এখানে লিখুন। এটি সকল দৈনিক ক্যাশ হিসাবে স্বয়ংক্রিয়ভাবে যুক্ত হবে।'
                  : 'Enter the initial cash in hand before records started. This will automatically carry forward into all daily cash calculations.'}
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'প্রারম্ভিক নগদ জের (৳)' : 'Opening Cash Amount (৳)'}
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

      {/* 7. Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'নতুন ক্যাশ লেনদেন যুক্ত করুন' : 'Record Manual Cash Entry'}
                </h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualEntry} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'লেনদেনের ধরন' : 'Transaction Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('in')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      manualType === 'in'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'নগদ জমা (Cash In)' : 'Cash In'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('out')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      manualType === 'out'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>{lang === 'bn' ? 'নগদ খরচ (Cash Out)' : 'Cash Out'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'রেফারেন্স / ভাউচার' : 'Ref / Voucher'}
                  </label>
                  <input
                    type="text"
                    value={manualRefNo}
                    onChange={(e) => setManualRefNo(e.target.value)}
                    placeholder="e.g. CASH-01"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-black text-base text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'বিবরণ ও কারণ *' : 'Particulars / Reason *'}
                </label>
                <input
                  type="text"
                  value={manualParticulars}
                  onChange={(e) => setManualParticulars(e.target.value)}
                  placeholder="যেমন: ব্যাংক থেকে ক্যাশ উত্তোলন / চা-নাস্তা খরচ..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md"
                >
                  {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
