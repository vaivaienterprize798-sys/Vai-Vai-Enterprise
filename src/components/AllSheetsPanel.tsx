import React, { useState, useMemo } from 'react';
import {
  Printer,
  Calendar,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Users,
  Wallet,
  Coins,
  Receipt,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  StockItem,
  Party,
  Staff,
  AttendanceRecord,
  Expense,
  Language,
  Invoice,
  StatementType,
  BranchConsignment,
  BranchRmbRemittance,
  ThirdPartyRmbConversion,
  WorkerTaskRecord,
  ThirdParty,
  ChinaDirectPayment,
} from '../types';
import { translations, formatNumber, formatDate, formatCurrency } from '../lib/translations';
import { PrintStatements } from './PrintStatements';
import { CompanyLogo } from './CompanyLogo';
import { storageService } from '../lib/storage';

export interface AllSheetsPanelProps {
  lang: Language;
  stock: StockItem[];
  invoices?: Invoice[];
  parties: Party[];
  staff: Staff[];
  attendance: AttendanceRecord[];
  expenses: Expense[];
  branchConsignments?: BranchConsignment[];
  branchRemittances?: BranchRmbRemittance[];
  rmbConversions?: ThirdPartyRmbConversion[];
  thirdParties?: ThirdParty[];
  chinaDirectPayments?: ChinaDirectPayment[];
  workerTasks?: WorkerTaskRecord[];
  initialType?: StatementType;
}

export type PeriodFilterMode = 'month' | 'date' | 'range' | 'all';

export const AllSheetsPanel: React.FC<AllSheetsPanelProps> = ({
  lang,
  stock,
  invoices = [],
  parties,
  staff,
  attendance,
  expenses,
  branchConsignments = [],
  branchRemittances = [],
  rmbConversions = [],
  workerTasks = [],
  initialType = 'stock',
}) => {
  const t = translations[lang];
  const companyInfo = storageService.getCompanyInfo();
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);

  // Active Sheet Tab State
  const [activeSheetType, setActiveSheetType] = useState<StatementType>(initialType);

  // Date and Month Filter States (User Requirement)
  const [filterMode, setFilterMode] = useState<PeriodFilterMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000 - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Helper to check if a record date is within the selected filter period
  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    if (filterMode === 'all') return true;
    if (filterMode === 'date') return dateStr === selectedDate;
    if (filterMode === 'month') return dateStr.startsWith(selectedMonth);
    if (filterMode === 'range') return dateStr >= startDate && dateStr <= endDate;
    return true;
  };

  // Quick Preset Handlers
  const handleSetToday = () => {
    setFilterMode('date');
    setSelectedDate(todayStr);
  };

  const handleSetCurrentMonth = () => {
    setFilterMode('month');
    setSelectedMonth(currentMonthStr);
  };

  const handleSetLastMonth = () => {
    setFilterMode('month');
    const [y, m] = currentMonthStr.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleSetAllTime = () => {
    setFilterMode('all');
  };

  // Dynamically Filter All Records Based on Date/Month Selector
  const filteredInvoices = useMemo(() => {
    return (invoices.length > 0 ? invoices : storageService.getInvoices()).filter((inv) =>
      isDateInPeriod(inv.date)
    );
  }, [invoices, filterMode, selectedMonth, selectedDate, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInPeriod(e.date));
  }, [expenses, filterMode, selectedMonth, selectedDate, startDate, endDate]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => isDateInPeriod(a.date));
  }, [attendance, filterMode, selectedMonth, selectedDate, startDate, endDate]);

  const filteredBranchConsignments = useMemo(() => {
    const list = branchConsignments.length > 0 ? branchConsignments : storageService.getBranchConsignments();
    return list.filter((c) => isDateInPeriod(c.date));
  }, [branchConsignments, filterMode, selectedMonth, selectedDate, startDate, endDate]);

  const filteredWorkerTasks = useMemo(() => {
    const list = workerTasks.length > 0 ? workerTasks : storageService.getWorkerTasks();
    return list.filter((t) => isDateInPeriod(t.date));
  }, [workerTasks, filterMode, selectedMonth, selectedDate, startDate, endDate]);

  // Sheets Metadata
  const sheetTabs: {
    type: StatementType;
    labelBn: string;
    labelEn: string;
    icon: React.ElementType;
    badgeBn: string;
    badgeEn: string;
    color: string;
  }[] = [
    {
      type: 'stock',
      labelBn: '১. স্টক ইনভেন্টরি স্টেটমেন্ট',
      labelEn: '1. Stock Inventory Sheet',
      icon: Boxes,
      badgeBn: 'স্টক ও গোডাউন',
      badgeEn: 'Stock Inventory',
      color: 'bg-emerald-600',
    },
    {
      type: 'party',
      labelBn: '২. পার্টি ডিউ ও অ্যাডভান্স স্টেটমেন্ট',
      labelEn: '2. Party Dues & Ledger Sheet',
      icon: Coins,
      badgeBn: 'পার্টি খাতা',
      badgeEn: 'Party Dues',
      color: 'bg-blue-600',
    },
    {
      type: 'payroll',
      labelBn: '৩. স্টাফ হাজিরা ও পেরোল পে-স্লিপ',
      labelEn: '3. Staff Attendance & Payslip Sheet',
      icon: Users,
      badgeBn: 'বেতন ও হাজিরা',
      badgeEn: 'HR Payroll',
      color: 'bg-purple-600',
    },
    {
      type: 'expense',
      labelBn: '৪. অফিস পেটি ক্যাশ ও খরচ স্টেটমেন্ট',
      labelEn: '4. Office Petty Cash & Expense Sheet',
      icon: Receipt,
      badgeBn: 'পেটি ক্যাশ ও খরচ',
      badgeEn: 'Petty Expenses',
      color: 'bg-amber-600',
    },
    {
      type: 'financial',
      labelBn: '৫. ফাইন্যান্সিয়াল P&L ও ROI স্টেটমেন্ট',
      labelEn: '5. Financial P&L & ROI Sheet',
      icon: BarChart3,
      badgeBn: 'P&L ও ROI',
      badgeEn: 'Financial P&L',
      color: 'bg-teal-600',
    },
    {
      type: 'worker_tracking',
      labelBn: '৬. প্রসেসিং কর্মী কাজ ও ড্যামেজ শিট',
      labelEn: '6. Worker Output & Damage Sheet',
      icon: Clock,
      badgeBn: 'প্রসেসিং ও ড্যামেজ',
      badgeEn: 'Worker Tasks',
      color: 'bg-rose-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Panel */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-12 h-12 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'অল শিট প্যানেল ও প্রিন্ট সেন্টার (All Sheet Panel)' : 'All Sheet Panel & Smart Print Center'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'তারিখ ও মাস ভিত্তিক ফিল্টারিং করে সকল হিসাবের ১-পেজ A4 স্টেটমেন্ট দেখুন, প্রিন্ট করুন ও হোয়াটসঅ্যাপে পাঠান'
                : 'Filter all business ledger sheets date & month-wise for 1-Page printer-ready A4 export'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {lang === 'bn' ? 'ফিল্টারকৃত ইনভয়েস:' : 'Invoices:'}{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">{filteredInvoices.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {lang === 'bn' ? 'খরচ এন্ট্রি:' : 'Expenses:'}{' '}
            <strong className="text-amber-600 dark:text-amber-400">{filteredExpenses.length}</strong>
          </span>
        </div>
      </div>

      {/* Clean Date & Month Filter Selector Toolbar (User's primary requirement) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-indigo-800/60 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>
              {lang === 'bn' ? 'তারিখ ও মাস ফিল্টারিং সিস্টেম (Date & Month Filter Toolbar):' : 'Date & Month Filtering System:'}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-400 text-[11px] mr-1">{lang === 'bn' ? 'দ্রুত ফিল্টার:' : 'Presets:'}</span>
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'date' && selectedDate === todayStr
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {lang === 'bn' ? 'আজ' : 'Today'}
            </button>
            <button
              type="button"
              onClick={handleSetCurrentMonth}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'month' && selectedMonth === currentMonthStr
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {lang === 'bn' ? 'চলতি মাস' : 'Current Month'}
            </button>
            <button
              type="button"
              onClick={handleSetLastMonth}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              {lang === 'bn' ? 'গত মাস' : 'Last Month'}
            </button>
            <button
              type="button"
              onClick={handleSetAllTime}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {lang === 'bn' ? 'সবসময়' : 'All Time'}
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 text-xs">
          {/* Mode Segmented Controls */}
          <div className="inline-flex rounded-xl bg-white/10 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filterMode === 'month' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'মাসভিত্তিক (Month)' : 'Month Mode'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('date')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filterMode === 'date' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'তারিখভিত্তিক (Date)' : 'Single Date'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filterMode === 'range' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'তারিখ সীমা (Range)' : 'Date Range'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                filterMode === 'all' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সবসময় (All)' : 'All Records'}
            </button>
          </div>

          {/* Dynamic Filter Controls */}
          {filterMode === 'month' && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
              <span className="text-slate-300 font-semibold">{lang === 'bn' ? 'মাস নির্বাচন:' : 'Select Month:'}</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {filterMode === 'date' && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
              <span className="text-slate-300 font-semibold">{lang === 'bn' ? 'তারিখ নির্বাচন:' : 'Select Date:'}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {filterMode === 'range' && (
            <div className="flex flex-wrap items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
              <span className="text-slate-300 font-semibold">{lang === 'bn' ? 'হতে:' : 'From:'}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
              />
              <span className="text-slate-400 font-bold">&rarr;</span>
              <span className="text-slate-300 font-semibold">{lang === 'bn' ? 'পর্যন্ত:' : 'To:'}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white font-bold font-mono focus:outline-none cursor-pointer"
              />
            </div>
          )}

          <div className="ml-auto font-mono text-cyan-300 text-xs font-bold">
            {filterMode === 'month' && `📅 ${selectedMonth}`}
            {filterMode === 'date' && `📆 ${formatDate(selectedDate, lang)}`}
            {filterMode === 'range' && `🗓️ ${formatDate(startDate, lang)} - ${formatDate(endDate, lang)}`}
            {filterMode === 'all' && `🌐 ${lang === 'bn' ? 'সকল হিসাব রেকর্ড' : 'All Historical Dues'}`}
          </div>
        </div>
      </div>

      {/* Sheet Type Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {sheetTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSheetType === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveSheetType(tab.type)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-800 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/40'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`p-1.5 rounded-lg text-white ${tab.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {lang === 'bn' ? tab.badgeBn : tab.badgeEn}
                </span>
              </div>
              <div>
                <span className="font-bold text-xs block leading-tight">
                  {lang === 'bn' ? tab.labelBn : tab.labelEn}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Embedded 1-Page Printable Statement View for the Active Sheet */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-2 sm:p-4 shadow-sm">
        <PrintStatements
          type={activeSheetType}
          lang={lang}
          stock={stock}
          invoices={filteredInvoices}
          parties={parties}
          staff={staff}
          attendance={filteredAttendance}
          expenses={filteredExpenses}
          branchConsignments={filteredBranchConsignments}
          workerTasks={filteredWorkerTasks}
          onBack={() => {}}
          initialMonth={selectedMonth}
          filterMode={filterMode}
          selectedDate={selectedDate}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
};
