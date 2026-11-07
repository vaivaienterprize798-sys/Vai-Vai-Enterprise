import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Printer,
  Calendar,
  DollarSign,
  Coffee,
  FileSpreadsheet,
  Zap,
  Sparkles,
  Trash2,
  Save,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Car,
  Users,
  PieChart,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
} from 'lucide-react';
import { PettyCashExpense, CarExpense, Staff, AttendanceRecord, Language } from '../types';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatSheetNumber,
  formatSheetDecimal,
} from '../lib/translations';
import { CompanyLogo } from './CompanyLogo';
import { storageService } from '../lib/storage';
import { computeStaffPayroll } from '../lib/payrollCalc';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

export type PeriodFilterMode = 'month' | 'date' | 'range' | 'all';

interface PettyCashPanelProps {
  expenses: PettyCashExpense[];
  carExpenses?: CarExpense[];
  staff?: Staff[];
  attendance?: AttendanceRecord[];
  lang: Language;
  onSaveExpense: (exp: PettyCashExpense) => void;
  onDeleteExpense: (id: string) => void;
  onPrintStatement: (filters: { filterMode: PeriodFilterMode; selectedMonth: string; selectedDate: string; startDate: string; endDate: string }) => void;
  onPrintMonthlyExpense?: (month: string) => void;
}

export const PettyCashPanel: React.FC<PettyCashPanelProps> = ({
  expenses,
  carExpenses = [],
  staff = [],
  attendance = [],
  lang,
  onSaveExpense,
  onDeleteExpense,
  onPrintStatement,
  onPrintMonthlyExpense,
}) => {
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const companyInfo = storageService.getCompanyInfo();

  const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilterMode, setDateFilterMode] = useState<PeriodFilterMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000 - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formType, setFormType] = useState<'in' | 'out'>('out');
  const [formCategory, setFormCategory] = useState<PettyCashExpense['category']>('tea_snacks');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState(todayStr);
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formReceiptNo, setFormReceiptNo] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openNewModal = (type: 'in' | 'out') => {
    setFormType(type);
    setFormCategory(type === 'in' ? 'other' : 'tea_snacks');
    setFormTitle(type === 'in' ? (lang === 'bn' ? 'অফিস ফান্ড জমা' : 'Petty cash refill') : '');
    setFormAmount(0);
    setFormDate(todayStr);
    setFormPaidTo('');
    setFormReceiptNo(`PC-${Date.now().toString().slice(-4)}`);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmount <= 0) {
      alert(lang === 'bn' ? 'খরচ/জমার বিবরণ ও সঠিক টাকার অঙ্ক দিন' : 'Enter valid title and amount');
      return;
    }

    const newExp: PettyCashExpense = {
      id: `pc-${Date.now()}`,
      type: formType,
      category: formCategory,
      title: formTitle.trim(),
      amount: Number(formAmount),
      date: formDate,
      paidTo: formPaidTo.trim(),
      receiptNo: formReceiptNo.trim(),
      notes: formNotes.trim(),
    };

    onSaveExpense(newExp);
    setIsModalOpen(false);
  };

  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    if (dateFilterMode === 'all') return true;
    if (dateFilterMode === 'date') return dateStr === selectedDate;
    if (dateFilterMode === 'month') return dateStr.startsWith(selectedMonth);
    if (dateFilterMode === 'range') return dateStr >= startDate && dateStr <= endDate;
    return true;
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchType = selectedType === 'all' || e.type === selectedType;
      const matchCat =
        selectedCategory === 'all' ||
        e.category === selectedCategory ||
        (selectedCategory === 'rent' && (e.category === 'rent' || e.category === 'godown_rent')) ||
        (selectedCategory === 'coolie_labor' && (e.category === 'coolie_labor' || e.category === 'labor'));
      const matchDate = isDateInPeriod(e.date);
      const titleStr = (e.title || '').toLowerCase();
      const matchSearch =
        titleStr.includes(searchTerm.toLowerCase()) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.receiptNo && e.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchCat && matchDate && matchSearch;
    });
  }, [expenses, selectedType, selectedCategory, dateFilterMode, selectedMonth, selectedDate, startDate, endDate, searchTerm]);

  // Aggregate stats (All time)
  const totalIn = useMemo(() => {
    return expenses.filter((e: PettyCashExpense) => e.type === 'in').reduce((sum: number, e: PettyCashExpense) => sum + e.amount, 0);
  }, [expenses]);

  const totalOut = useMemo(() => {
    return expenses.filter((e: PettyCashExpense) => e.type === 'out' || !e.type).reduce((sum: number, e: PettyCashExpense) => sum + e.amount, 0);
  }, [expenses]);

  const currentBalance = totalIn - totalOut;

  // Filtered period stats
  const filteredIn = useMemo(() => {
    return filteredExpenses.filter((e: PettyCashExpense) => e.type === 'in').reduce((sum: number, e: PettyCashExpense) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const filteredOut = useMemo(() => {
    return filteredExpenses.filter((e: PettyCashExpense) => e.type === 'out' || !e.type).reduce((sum: number, e: PettyCashExpense) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly_consolidated'>('daily');

  // Month-wise Consolidated Expense Breakdown calculations (Office Petty Cash + Car Expense + Staff Salary)
  const monthExpenseSummary = useMemo(() => {
    const selMonth = selectedMonth || todayStr.slice(0, 7);

    // 1. Office Petty Cash Expenses for selectedMonth
    const monthlyPettyCashOut = expenses
      .filter((e) => (e.type === 'out' || !e.type) && e.date && e.date.startsWith(selMonth))
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const monthlyPettyCashIn = expenses
      .filter((e) => e.type === 'in' && e.date && e.date.startsWith(selMonth))
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    // 2. Car Expenses for selectedMonth
    const monthlyCarOut = (carExpenses || [])
      .filter((c) => c.date && c.date.startsWith(selMonth))
      .reduce((s, c) => s + Number(c.amount || 0), 0);

    // 3. Staff Salary Payroll for selectedMonth (Gross Salary = Earned Base + OT Amount)
    let monthlyStaffSalaryOut = 0;
    const staffSalaryList = (staff || []).map((stf) => {
      const calc = computeStaffPayroll(stf, attendance || [], selMonth);
      const grossSalary = (Number(calc.earnedBase) || 0) + (Number(calc.totalOtAmount) || 0);
      monthlyStaffSalaryOut += grossSalary;
      return {
        id: stf.id,
        name: stf.name,
        designation: stf.designation,
        category: stf.category,
        netPayable: calc.netPayable,
        earnedBase: calc.earnedBase,
        totalOtAmount: calc.totalOtAmount,
        advanceDeduction: calc.totalAdvance,
      };
    });

    // 4. Grand Total Monthly Expense
    const grandTotalCost = monthlyPettyCashOut + monthlyCarOut + monthlyStaffSalaryOut;

    // Percentages
    const pettyPct = grandTotalCost > 0 ? Math.round((monthlyPettyCashOut / grandTotalCost) * 100) : 0;
    const carPct = grandTotalCost > 0 ? Math.round((monthlyCarOut / grandTotalCost) * 100) : 0;
    const staffPct = grandTotalCost > 0 ? Math.round((monthlyStaffSalaryOut / grandTotalCost) * 100) : 0;

    // Itemized Petty Cash Categories
    const pettyCatTotals: Record<string, number> = {};
    expenses
      .filter((e) => (e.type === 'out' || !e.type) && e.date && e.date.startsWith(selMonth))
      .forEach((e) => {
        const cat = e.category || 'other';
        pettyCatTotals[cat] = (pettyCatTotals[cat] || 0) + Number(e.amount || 0);
      });

    // Itemized Car Categories
    const carCatTotals: Record<string, number> = {};
    (carExpenses || [])
      .filter((c) => c.date && c.date.startsWith(selMonth))
      .forEach((c) => {
        const cat = c.category || 'other';
        carCatTotals[cat] = (carCatTotals[cat] || 0) + Number(c.amount || 0);
      });

    return {
      selMonth,
      monthlyPettyCashOut,
      monthlyPettyCashIn,
      monthlyCarOut,
      monthlyStaffSalaryOut,
      grandTotalCost,
      pettyPct,
      carPct,
      staffPct,
      pettyCatTotals,
      carCatTotals,
      staffSalaryList,
    };
  }, [expenses, carExpenses, staff, attendance, selectedMonth, todayStr]);

  const filteredNet = filteredIn - filteredOut;

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-10 h-10" />
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'অফিস পেটি ক্যাশ ও খরচ ব্যবস্থাপনা' : 'Office Petty Cash & Expense Management'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'দৈনিক চা-নাস্তা, অতিথি আপ্যায়ন, স্টেশনারি ও অফিসের খুচরা খরচের সার্বক্ষণিক ক্যাশ বুক'
                : 'Daily petty cash balance, tea & snacks, office maintenance and entertainment tracking'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপ রিপোর্ট' : 'Share WhatsApp'}
            getText={() => {
              if (activeTab === 'monthly_consolidated') {
                return `*${companyInfo.name} - মাসভিত্তিক সর্বমোট খরচের হিসাব*\n📅 মাস: ${monthExpenseSummary.selMonth}\n────────────────────────\n☕ অফিস পেটি ক্যাশ: ৳${monthExpenseSummary.monthlyPettyCashOut.toLocaleString()} (${monthExpenseSummary.pettyPct}%)\n🚗 গাড়ি ও পরিবহন খরচ: ৳${monthExpenseSummary.monthlyCarOut.toLocaleString()} (${monthExpenseSummary.carPct}%)\n👥 স্টাফ মাসিক বেতন বিল: ৳${monthExpenseSummary.monthlyStaffSalaryOut.toLocaleString()} (${monthExpenseSummary.staffPct}%)\n────────────────────────\n🔴 *সর্বমোট মাসভিত্তিক কোম্পানির খরচ:* ৳${monthExpenseSummary.grandTotalCost.toLocaleString()}\n────────────────────────\n_${companyInfo.name}_`;
              }
              return `*${companyInfo.name} - অফিস পেটি ক্যাশ সামারি*\n📅 মাস: ${selectedMonth}\n────────────────────────\n📥 মোট ক্যাশ ইন: ৳${totalIn.toLocaleString()}\n📤 মোট ক্যাশ আউট: ৳${totalOut.toLocaleString()}\n💼 অবশিষ্ট ক্যাশ ব্যালেন্স: ৳${currentBalance.toLocaleString()}\n────────────────────────\n_${companyInfo.name}_`;
            }}
          />

          {activeTab === 'monthly_consolidated' && (
            <button
              type="button"
              onClick={() => onPrintMonthlyExpense && onPrintMonthlyExpense(monthExpenseSummary.selMonth)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'মাসিক খরচ প্রিন্ট (1-Page A4)' : 'Print Monthly Expense'}</span>
            </button>
          )}

          <button
            onClick={() => onPrintStatement({ filterMode: dateFilterMode, selectedMonth, selectedDate, startDate, endDate })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'পেটি ক্যাশ স্টেটমেন্ট' : 'Print Statement'}</span>
          </button>

          <button
            onClick={() => openNewModal('in')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ ফান্ড জমা (Cash In)' : '+ Cash In'}</span>
          </button>

          <button
            onClick={() => openNewModal('out')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ খরচ এন্ট্রি (Cash Out)' : '+ Add Expense'}</span>
          </button>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>
            {lang === 'bn'
              ? '📖 অফিস পেটি ক্যাশ রেজিস্টার (দৈনিক খাতা)'
              : 'Daily Petty Cash Register'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monthly_consolidated')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'monthly_consolidated'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>
            {lang === 'bn'
              ? '📊 মাসভিত্তিক সর্বমোট খরচের হিসাব (Petty Cash + Car + Staff Salary)'
              : 'Month-wise Total Cost Accounting'}
          </span>
        </button>
      </div>

      {/* RENDER MONTHLY CONSOLIDATED ACCOUNTING VIEW */}
      {activeTab === 'monthly_consolidated' && (
        <div className="space-y-6">
          {/* Month Selector & Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-purple-500/40 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-pink-400" />
                <h3 className="text-lg font-black text-white">
                  {lang === 'bn' ? 'মাসভিত্তিক সর্বমোট কোম্পানির পরিচালন খরচ' : 'Monthly Consolidated Company Expenses'}
                </h3>
              </div>
              <p className="text-xs text-purple-200 mt-1">
                {lang === 'bn'
                  ? 'অফিস পেটি ক্যাশ, গাড়ি ও পরিবহন খরচ এবং স্টাফদের মাসিক নিট বেতন বিলের সংকলিত হিসাব'
                  : 'Combined cost analysis covering office petty cash, vehicle expenses, and staff monthly payroll'}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = (selectedMonth || todayStr.slice(0, 7)).split('-').map(Number);
                  const prevDate = new Date(y, m - 2, 1);
                  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(prevMonthStr);
                }}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
                title={lang === 'bn' ? 'পূর্ববর্তী মাস' : 'Previous Month'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={selectedMonth || todayStr.slice(0, 7)}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none px-2 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const [y, m] = (selectedMonth || todayStr.slice(0, 7)).split('-').map(Number);
                  const nextDate = new Date(y, m, 1);
                  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(nextMonthStr);
                }}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
                title={lang === 'bn' ? 'পরবর্তী মাস' : 'Next Month'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Petty Cash */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-500" />
                  {lang === 'bn' ? '১. অফিস পেটি ক্যাশ' : '1. Office Petty Cash'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                  {monthExpenseSummary.pettyPct}%
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(monthExpenseSummary.monthlyPettyCashOut, lang)}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {lang === 'bn' ? 'চা-নাস্তা, স্টেশনারি ও খাতা খরচ' : 'Office petty expenses'}
              </p>
            </div>

            {/* Car Expenses */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-sky-500 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-sky-500" />
                  {lang === 'bn' ? '২. গাড়ি ও পরিবহন খরচ' : '2. Car Expenses'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-bold">
                  {monthExpenseSummary.carPct}%
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                {formatCurrency(monthExpenseSummary.monthlyCarOut, lang)}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {lang === 'bn' ? 'জ্বালানি, টোল ও পরিবহন খরচ' : 'Vehicle fuel & toll expenses'}
              </p>
            </div>

            {/* Staff Salary Payroll */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-purple-500 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-500" />
                  {lang === 'bn' ? '৩. স্টাফ মাসিক বেতন বিল' : '3. Staff Salary Payroll'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
                  {monthExpenseSummary.staffPct}%
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                {formatCurrency(monthExpenseSummary.monthlyStaffSalaryOut, lang)}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {lang === 'bn' ? `${staff.length} জন স্টাফের নিট বেতন` : `Net salary for ${staff.length} staff`}
              </p>
            </div>

            {/* Grand Total Cost */}
            <div className="bg-gradient-to-br from-rose-900 to-rose-950 text-white p-4 rounded-2xl border border-rose-700 shadow-md">
              <div className="flex justify-between items-center text-xs text-rose-200 font-semibold">
                <span>{lang === 'bn' ? 'সর্বমোট মাসভিত্তিক খরচ' : 'Grand Total Cost'}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black">
                  100%
                </span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-white">
                {formatCurrency(monthExpenseSummary.grandTotalCost, lang)}
              </div>
              <p className="mt-1 text-[11px] text-rose-200">
                {lang === 'bn' ? `মাস: ${monthExpenseSummary.selMonth}` : `Month: ${monthExpenseSummary.selMonth}`}
              </p>
            </div>
          </div>

          {/* Visual Percentage Share Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>{lang === 'bn' ? 'মাসিক খরচের অনুপাত বিশ্লেষণ (Expense Share)' : 'Expense Share Breakdown'}</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-black">
                {formatCurrency(monthExpenseSummary.grandTotalCost, lang)}
              </span>
            </div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${monthExpenseSummary.pettyPct}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Petty Cash: ${monthExpenseSummary.pettyPct}%`}
              />
              <div
                style={{ width: `${monthExpenseSummary.carPct}%` }}
                className="bg-sky-500 h-full transition-all"
                title={`Car Expense: ${monthExpenseSummary.carPct}%`}
              />
              <div
                style={{ width: `${monthExpenseSummary.staffPct}%` }}
                className="bg-purple-600 h-full transition-all"
                title={`Staff Salary: ${monthExpenseSummary.staffPct}%`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span>{lang === 'bn' ? 'পেটি ক্যাশ:' : 'Petty Cash:'} {monthExpenseSummary.pettyPct}%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                <span>{lang === 'bn' ? 'গাড়ি ও পরিবহন:' : 'Car:'} {monthExpenseSummary.carPct}%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
                <span>{lang === 'bn' ? 'স্টাফ বেতন:' : 'Staff Salary:'} {monthExpenseSummary.staffPct}%</span>
              </span>
            </div>
          </div>

          {/* Itemized Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Petty Cash Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Coffee className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'অফিস পেটি ক্যাশ খাতসমুহ' : 'Office Petty Cash Categories'}</span>
                </h4>
                <span className="font-mono text-xs font-bold text-amber-600">
                  {formatCurrency(monthExpenseSummary.monthlyPettyCashOut, lang)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {Object.keys(monthExpenseSummary.pettyCatTotals).length === 0 ? (
                  <p className="text-slate-400 text-center py-4">{lang === 'bn' ? 'এই মাসে কোনো খরচের এন্ট্রি নেই' : 'No petty cash expense'}</p>
                ) : (
                  Object.entries(monthExpenseSummary.pettyCatTotals).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-700 dark:text-slate-300 capitalize font-medium">
                        {cat === 'tea_snacks' || cat === 'tea_food' ? (lang === 'bn' ? 'চা ও নাস্তা' : 'Tea & Snacks') :
                         cat === 'rent' || cat === 'godown_rent' ? (lang === 'bn' ? 'বাড়ি / গোডাউন ভাড়া' : 'House / Godown Rent') :
                         cat === 'courier_bill' ? (lang === 'bn' ? 'কুরিয়ার বিল' : 'Courier Bill') :
                         cat === 'transport_allowance' ? (lang === 'bn' ? 'যাতায়াত ও ভাড়া' : 'Transport') :
                         cat === 'coolie_labor' || cat === 'labor' ? (lang === 'bn' ? 'কুলি ও লেবার মজুরি' : 'Coolie & Labor') :
                         cat === 'service_charge' ? (lang === 'bn' ? 'সার্ভিস চার্জ ও ফি' : 'Service Charge') :
                         cat === 'utility' || cat === 'utility_bills' ? (lang === 'bn' ? 'বিদ্যুৎ/বিল' : 'Utility') :
                         cat === 'stationery' ? (lang === 'bn' ? 'স্টেশনারি' : 'Stationery') :
                         cat === 'maintenance' || cat === 'cleaning_maint' ? (lang === 'bn' ? 'মেরামত/ক্লিনার' : 'Maintenance') :
                         cat === 'entertainment' ? (lang === 'bn' ? 'আপ্যায়ন' : 'Entertainment') : cat}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(amt as number, lang)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Car Expense Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-bold text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Car className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'গাড়ি ও পরিবহন খাতসমুহ' : 'Car Expense Categories'}</span>
                </h4>
                <span className="font-mono text-xs font-bold text-sky-600">
                  {formatCurrency(monthExpenseSummary.monthlyCarOut, lang)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {Object.keys(monthExpenseSummary.carCatTotals).length === 0 ? (
                  <p className="text-slate-400 text-center py-4">{lang === 'bn' ? 'এই মাসে কোনো গাড়ি খরচ নেই' : 'No car expense'}</p>
                ) : (
                  Object.entries(monthExpenseSummary.carCatTotals).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
                      <span className="text-slate-700 dark:text-slate-300 capitalize font-medium">
                        {cat === 'fuel' ? (lang === 'bn' ? 'জ্বালানি তেল' : 'Fuel') :
                         cat === 'maintenance' ? (lang === 'bn' ? 'গাড়ি মেরামত' : 'Maintenance') :
                         cat === 'toll' ? (lang === 'bn' ? 'টোল ও পার্কিং' : 'Toll & Parking') :
                         cat === 'driver_allowance' ? (lang === 'bn' ? 'ড্রাইভার ভাতাদি' : 'Driver Allowance') : cat}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(amt as number, lang)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Staff Salary Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-bold text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'স্টাফ মাসিক বেতন তালিকা' : 'Staff Monthly Net Payroll'}</span>
                </h4>
                <span className="font-mono text-xs font-bold text-purple-600">
                  {formatCurrency(monthExpenseSummary.monthlyStaffSalaryOut, lang)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {monthExpenseSummary.staffSalaryList.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">{lang === 'bn' ? 'কোনো স্টাফ তথ্য নেই' : 'No staff payroll'}</p>
                ) : (
                  monthExpenseSummary.staffSalaryList.map((stf: any) => (
                    <div key={stf.id} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-800/50">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{stf.name}</div>
                        <div className="text-[10px] text-slate-500">{stf.designation}</div>
                      </div>
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(stf.netPayable, lang)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DAILY PETTY CASH REGISTER VIEW */}
      {activeTab === 'daily' && (
        <>
          {/* 3 Main Petty Cash KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total In */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-teal-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'মোট ফান্ড গ্রহণ (Cash In)' : 'Total Cash In'}
            </span>
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
            {formatCurrency(totalIn, lang)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {lang === 'bn' ? 'মালিক বা ক্যাশ থেকে পেটি ক্যাশে প্রাপ্ত ফান্ড' : 'Received cash fund'}
          </p>
        </div>

        {/* Total Out */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'মোট অফিস খরচ (Cash Out)' : 'Total Office Expenses'}
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(totalOut, lang)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {lang === 'bn' ? 'চা, নাস্তা ও খুচরা বাবদ মোট পরিশোধ' : 'Disbursed petty expenses'}
          </p>
        </div>

        {/* Available Balance */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'হাতে নগদ পেটি ক্যাশ ব্যালেন্স' : 'Current Petty Cash Balance'}
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
            {formatCurrency(currentBalance, lang)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {currentBalance >= 0
              ? (lang === 'bn' ? 'ড্রয়ারে উপস্থিত উদ্বৃত্ত ক্যাশ' : 'Cash on hand in drawer')
              : (lang === 'bn' ? 'ঘাটতি / অতিরিক্ত খরচ' : 'Cash deficit')}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'bn' ? 'বিবরণ, রিসিট বা গ্রহীতা দিয়ে খুঁজুন...' : 'Search by title, receipt or payee...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="all">{lang === 'bn' ? 'সব লেনদেন' : 'All Types'}</option>
            <option value="in">{lang === 'bn' ? 'জমা (Cash In)' : 'Cash In'}</option>
            <option value="out">{lang === 'bn' ? 'খরচ (Cash Out)' : 'Cash Out'}</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="all">{lang === 'bn' ? 'সকল খাত' : 'All Categories'}</option>
            <option value="tea_snacks">{lang === 'bn' ? 'চা ও নাস্তা' : 'Tea & Snacks'}</option>
            <option value="rent">{lang === 'bn' ? 'বাড়ি / গোডাউন ভাড়া' : 'House / Godown Rent'}</option>
            <option value="courier_bill">{lang === 'bn' ? 'কুরিয়ার বিল' : 'Courier Bill'}</option>
            <option value="transport_allowance">{lang === 'bn' ? 'যাতায়াত ও ভাড়া' : 'Transport Allowance'}</option>
            <option value="coolie_labor">{lang === 'bn' ? 'কুলি ও লেবার মজুরি' : 'Coolie & Labor'}</option>
            <option value="service_charge">{lang === 'bn' ? 'সার্ভিস চার্জ ও ফি' : 'Service Charge'}</option>
            <option value="stationery">{lang === 'bn' ? 'স্টেশনারি ও খাতা' : 'Stationery'}</option>
            <option value="utility">{lang === 'bn' ? 'বিদ্যুৎ/ওয়াইফাই বিল' : 'Utility & Bills'}</option>
            <option value="maintenance">{lang === 'bn' ? 'অফিস মেরামত/ক্লিনার' : 'Maintenance'}</option>
            <option value="entertainment">{lang === 'bn' ? 'অতিথি আপ্যায়ন' : 'Guest Entertainment'}</option>
            <option value="other">{lang === 'bn' ? 'অন্যান্য' : 'Other'}</option>
          </select>

          {/* Month/Date Mode Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setDateFilterMode('month')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] ${
                dateFilterMode === 'month'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'bn' ? 'মাস' : 'Month'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('date')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] ${
                dateFilterMode === 'date'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'bn' ? 'তারিখ' : 'Date'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('range')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] ${
                dateFilterMode === 'range'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'bn' ? 'সীমা' : 'Range'}
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode('all')}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] ${
                dateFilterMode === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {lang === 'bn' ? 'সব' : 'All'}
            </button>
          </div>

          {dateFilterMode === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium"
            />
          )}

          {dateFilterMode === 'date' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium"
            />
          )}

          {dateFilterMode === 'range' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
              />
              <span>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold border-b border-slate-950">
              <tr>
                <th className="py-3 px-3 w-8 text-center text-white font-bold">{lang === 'bn' ? 'নং' : 'SL'}</th>
                <th className="py-3 px-3 w-28 text-white font-bold">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                <th className="py-3 px-3 w-24 text-center text-white font-bold">{lang === 'bn' ? 'টাইপ' : 'Type'}</th>
                <th className="py-3 px-3 w-32 text-white font-bold">{lang === 'bn' ? 'খাত' : 'Category'}</th>
                <th className="py-3 px-3 text-white font-bold">{lang === 'bn' ? 'খরচের বিবরণ' : 'Description'}</th>
                <th className="py-3 px-3 w-28 text-white font-bold">{lang === 'bn' ? 'গ্রহীতা' : 'Paid To'}</th>
                <th className="py-3 px-3 text-right w-28 text-white font-bold">{lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}</th>
                <th className="py-3 px-3 text-right w-16 text-white font-bold">{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {lang === 'bn' ? 'কোনো পেটি ক্যাশ রেকর্ড পাওয়া যায়নি' : 'No petty cash records found'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((it: PettyCashExpense, idx: number) => (
                  <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {formatNumber(idx + 1, lang)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {formatDate(it.date, lang)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          it.type === 'in'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {it.type === 'in' ? (lang === 'bn' ? 'জমা' : 'IN') : (lang === 'bn' ? 'খরচ' : 'OUT')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {it.category === 'tea_snacks' || it.category === 'tea_food'
                          ? (lang === 'bn' ? 'চা ও নাস্তা' : 'Tea & Snacks')
                          : it.category === 'courier_bill'
                          ? (lang === 'bn' ? 'কুরিয়ার বিল' : 'Courier Bill')
                          : it.category === 'transport_allowance'
                          ? (lang === 'bn' ? 'যাতায়াত ও ভাড়া' : 'Transport Allowance')
                          : it.category === 'service_charge'
                          ? (lang === 'bn' ? 'সার্ভিস চার্জ ও ফি' : 'Service Charge')
                          : it.category === 'stationery'
                          ? (lang === 'bn' ? 'স্টেশনারি' : 'Stationery')
                          : it.category === 'utility' || it.category === 'utility_bills'
                          ? (lang === 'bn' ? 'বিদ্যুৎ/বিল' : 'Utility')
                          : it.category === 'maintenance' || it.category === 'cleaning_maint'
                          ? (lang === 'bn' ? 'মেরামত/ক্লিনার' : 'Maintenance')
                          : it.category === 'entertainment'
                          ? (lang === 'bn' ? 'আপ্যায়ন' : 'Entertainment')
                          : it.category === 'labor' || it.category === 'coolie_labor'
                          ? (lang === 'bn' ? 'কুলি ও লেবার' : 'Labor / Coolie')
                          : it.category === 'rent' || it.category === 'godown_rent'
                          ? (lang === 'bn' ? 'বাড়ি / গোডাউন ভাড়া' : 'House / Godown Rent')
                          : (lang === 'bn' ? 'অন্যান্য' : 'Other')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {it.title}
                      </div>
                      {it.notes && (
                        <div className="text-[11px] text-slate-500 italic">{it.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {it.paidTo || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={it.type === 'in' ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}>
                        {it.type === 'in' ? '+' : '-'}{formatCurrency(it.amount, lang)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(lang === 'bn' ? 'আপনি কি এটি মুছে ফেলতে চান?' : 'Delete this record?')) {
                            onDeleteExpense(it.id);
                          }
                        }}
                        className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-end gap-4 text-[11px]">
                      <span>
                        {lang === 'bn' ? 'মোট ফান্ড জমা (Cash In):' : 'Total Cash In:'}{' '}
                        <strong className="text-teal-600 dark:text-teal-400 font-mono">+{formatCurrency(filteredIn, lang)}</strong>
                      </span>
                      <span>|</span>
                      <span>
                        {lang === 'bn' ? 'মোট অফিস খরচ (Cash Out):' : 'Total Office Expense:'}{' '}
                        <strong className="text-rose-600 dark:text-rose-400 font-mono">-{formatCurrency(filteredOut, lang)}</strong>
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-200">
                    {lang === 'bn' ? 'অবশিষ্ট ব্যালেন্স:' : 'Net Balance:'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm">
                    <span className={filteredNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatCurrency(filteredNet, lang)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
        </>
      )}

      {/* Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className={`p-4 text-white flex items-center justify-between ${formType === 'in' ? 'bg-teal-700' : 'bg-rose-700'}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {formType === 'in'
                  ? (lang === 'bn' ? 'পেটি ক্যাশে ফান্ড জমা (Cash In)' : 'Petty Cash In')
                  : (lang === 'bn' ? 'অফিস খরচ এন্ট্রি (Cash Out)' : 'Office Petty Expense')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'খাত' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="tea_snacks">{lang === 'bn' ? 'চা ও নাস্তা' : 'Tea & Snacks'}</option>
                    <option value="rent">{lang === 'bn' ? 'বাড়ি / গোডাউন ভাড়া' : 'House / Godown Rent'}</option>
                    <option value="courier_bill">{lang === 'bn' ? 'কুরিয়ার বিল' : 'Courier Bill'}</option>
                    <option value="transport_allowance">{lang === 'bn' ? 'যাতায়াত ও ভাড়া' : 'Transport Allowance'}</option>
                    <option value="coolie_labor">{lang === 'bn' ? 'কুলি ও লেবার মজুরি' : 'Coolie & Labor'}</option>
                    <option value="service_charge">{lang === 'bn' ? 'সার্ভিস চার্জ ও ফি' : 'Service Charge'}</option>
                    <option value="stationery">{lang === 'bn' ? 'স্টেশনারি ও খাতা' : 'Stationery'}</option>
                    <option value="utility">{lang === 'bn' ? 'বিদ্যুৎ/ওয়াইফাই বিল' : 'Utility & Bills'}</option>
                    <option value="maintenance">{lang === 'bn' ? 'অফিস মেরামত/ক্লিনার' : 'Maintenance'}</option>
                    <option value="entertainment">{lang === 'bn' ? 'অতিথি আপ্যায়ন' : 'Guest Entertainment'}</option>
                    <option value="other">{lang === 'bn' ? 'অন্যান্য' : 'Other'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'খরচের শিরোনাম / বিবরণ' : 'Title / Description'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: সারাদিনের চা-বিস্কুট ও দুপুরের নাস্তা' : 'e.g. Daily tea and breakfast for staff'}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'গ্রহণকারী / দোকানদার' : 'Paid To / Payee'}
                  </label>
                  <input
                    type="text"
                    value={formPaidTo}
                    onChange={(e) => setFormPaidTo(e.target.value)}
                    placeholder={lang === 'bn' ? 'দোকানের নাম / কারিগর' : 'Name of shop / payee'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'নোট / মন্তব্য' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={lang === 'bn' ? 'প্রয়োজনীয় মন্তব্য বা ভাউচার বিবরণ...' : 'Any remarks or memo notes...'}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold cursor-pointer ${formType === 'in' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-rose-600 hover:bg-rose-500'}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
