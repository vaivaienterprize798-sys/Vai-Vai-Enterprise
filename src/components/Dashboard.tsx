import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Coins,
  Package,
  Users,
  Clock,
  Receipt,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  FileText,
  Plus,
  Share2,
  Wallet,
  Cloud,
  CloudCheck,
  Globe,
} from 'lucide-react';
import {
  Language,
  Invoice,
  StockItem,
  Party,
  AttendanceRecord,
  OfficeExpense,
  Staff,
  BranchConsignment,
  BranchRmbRemittance,
  ThirdPartyRmbConversion,
  ChinaDirectPayment,
} from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDashboardCurrency,
} from '../lib/translations';
import { storageService } from '../lib/storage';
import { CompanyLogo } from './CompanyLogo';

interface DashboardProps {
  lang: Language;
  invoices: Invoice[];
  stock: StockItem[];
  parties: Party[];
  attendance: AttendanceRecord[];
  expenses: OfficeExpense[];
  onOpenNewInvoice: () => void;
  onOpenStatementsModal: () => void;
  onSelectTab: (tab: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  staff?: Staff[];
  isCloudConnected?: boolean;
  onOpenCloudSyncModal?: () => void;
  branchConsignments?: BranchConsignment[];
  branchRemittances?: BranchRmbRemittance[];
  rmbConversions?: ThirdPartyRmbConversion[];
  chinaDirectPayments?: ChinaDirectPayment[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  lang,
  invoices,
  stock,
  parties,
  attendance,
  expenses,
  onOpenNewInvoice,
  onOpenStatementsModal,
  onSelectTab,
  onViewInvoice,
  staff = [],
  isCloudConnected = false,
  onOpenCloudSyncModal,
  branchConsignments = [],
  branchRemittances = [],
  rmbConversions = [],
  chinaDirectPayments = [],
}) => {
  const t = translations[lang];
  const companyInfo = storageService.getCompanyInfo();

  // Part-to-part filter state
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  // Filtered Invoices
  const [salaryMonth, setSalaryMonth] = useState<string>(() => todayStr.slice(0, 7));

  // Staff Payroll & Advance Metrics for Dashboard
  const { totalStaffMonthlySalary, totalStaffAdvance, allTimeStaffAdvance } = useMemo(() => {
    const monthRecords = attendance.filter((a) => a.date && a.date.startsWith(salaryMonth));
    const staffSalarySum = staff.reduce((total, stf) => {
      const isOffice = stf.category === 'office';
      const records = monthRecords.filter((a) => a.staffId === stf.id);
      const presentDays = records.filter((a) => a.status === 'present' || a.status === 'late').length;
      const leaveDays = records.filter(
        (a) =>
          a.status === 'full_day_leave' ||
          a.status === 'half_day_leave' ||
          a.status === 'leave' ||
          a.status === 'holiday'
      ).length;
      const daysBase = isOffice ? 30 : 26;
      const dailyRate = Math.round(Number(stf.baseSalary || 0) / daysBase);
      const absentDays = records.length === 0 ? 0 : Math.max(0, daysBase - (presentDays + leaveDays));
      const absentDeduction = absentDays * dailyRate;
      const totalOtMoney = isOffice
        ? 0
        : records.reduce((sum, a) => sum + (a.otAmount !== undefined ? a.otAmount : (a.otHours || 0) * 60), 0);
      const totalAdv = records.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
      const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(stf.id, salaryMonth);
      const totalLateMinutes = isOffice ? 0 : records.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
      const lateDeduction = Math.round((totalLateMinutes / 60) * (dailyRate / 10));
      const netSalary = Math.max(0, stf.baseSalary - absentDeduction + totalOtMoney - totalAdv - damageDeduction - lateDeduction);
      return total + netSalary;
    }, 0);

    const monthAdv = monthRecords.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
    const allAdv = attendance.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);

    return {
      totalStaffMonthlySalary: staffSalarySum,
      totalStaffAdvance: monthAdv,
      allTimeStaffAdvance: allAdv,
    };
  }, [staff, attendance, salaryMonth]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (dateFilter === 'today' && inv.date !== todayStr) return false;
      if (dateFilter === 'week') {
        const invDate = new Date(inv.date).getTime();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (invDate < weekAgo) return false;
      }
      if (dateFilter === 'month') {
        const invMonth = inv.date.slice(0, 7);
        const curMonth = todayStr.slice(0, 7);
        if (invMonth !== curMonth) return false;
      }
      if (selectedCategory !== 'all') {
        const hasCat = inv.items.some((it) => it.category === selectedCategory);
        if (!hasCat) return false;
      }
      return true;
    });
  }, [invoices, dateFilter, selectedCategory, todayStr]);

  // Aggregated Metrics
  const totalPurchase = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.mode === 'purchase')
      .reduce((acc, inv) => acc + inv.netInvoiceAmount, 0);
  }, [filteredInvoices]);

  const totalSales = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.mode === 'sales')
      .reduce((acc, inv) => acc + inv.netInvoiceAmount, 0);
  }, [filteredInvoices]);

  // Total Stock Value using weighted average purchase rate
  const totalStockValue = useMemo(() => {
    return stock.reduce(
      (sum, item) => sum + item.quantity * (item.purchaseAvgRate || item.purchaseRate || 0),
      0
    );
  }, [stock]);

  const totalDueReceivable = useMemo(() => {
    return parties.reduce((sum, p) => sum + (p.currentDue > 0 ? p.currentDue : 0), 0);
  }, [parties]);

  // Total Advance (as explicitly requested: "dashboard e total advance show hobe")
  const totalAdvanceAmount = useMemo(() => {
    return parties.reduce((sum, p) => sum + (p.currentAdvance > 0 ? p.currentAdvance : 0), 0);
  }, [parties]);

  const todayExpensesAmount = useMemo(() => {
    return expenses
      .filter((e) => e.date === todayStr && e.type !== 'in')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, todayStr]);

  // Staff Attendance Metrics
  const todayAttendanceStats = useMemo(() => {
    const todayRecords = attendance.filter((a) => a.date === todayStr);
    const present = todayRecords.filter((a) => a.status === 'present' || a.status === 'late').length;
    const late = todayRecords.filter((a) => a.status === 'late').length;
    const otHours = todayRecords.reduce((sum, a) => sum + a.otHours, 0);
    const otAmount = todayRecords.reduce((sum, a) => sum + a.otAmount, 0);
    return { present, late, otHours, otAmount, total: todayRecords.length };
  }, [attendance, todayStr]);

  // Category-wise Stock Counts
  const categoryStats = useMemo(() => {
    const categories = [
      { key: 'code', label: t.codeItem, color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' },
      { key: 'android', label: t.androidItem, color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' },
      { key: 'kg', label: t.kgItem, color: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' },
      { key: 'pcs_blank', label: t.pcsBlankItem, color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400' },
    ];

    return categories.map((cat) => {
      const items = stock.filter((s) => s.category === cat.key);
      const totalQty = items.reduce((sum, s) => sum + s.quantity, 0);
      const val = items.reduce(
        (sum, s) => sum + s.quantity * (s.purchaseAvgRate || s.purchaseRate || 0),
        0
      );
      const alertItems = items.filter((s) => s.quantity <= s.minAlertQty).length;
      return { ...cat, totalQty, val, count: items.length, alertItems };
    });
  }, [stock, t]);

  // China Office Stock & Due Status (এক নজরে চায়না অফিস থেকে মোট আর কত টাকা পাওয়ার বাকি আছে বা হিসাবের বর্তমান অবস্থা)
  const chinaMetrics = useMemo(() => {
    const totalSentBdt = (branchConsignments || []).reduce((acc, c) => acc + (Number(c.totalBdtValue) || 0), 0);
    const totalEstRmbSent = (branchConsignments || []).reduce((acc, c) => acc + (Number(c.totalRmbEstimated) || 0), 0);
    const totalRmbRemitted = (branchRemittances || []).reduce((acc, r) => acc + (Number(r.rmbAmount) || 0), 0);
    const totalConvertedBdt = (rmbConversions || []).reduce((acc, cv) => acc + (Number(cv.receivedBdtAmount) || 0), 0);
    const totalConvertedRmb = (rmbConversions || []).reduce((acc, cv) => acc + (Number(cv.rmbAmountGiven) || 0), 0);
    const totalChinaDirectBdt = (chinaDirectPayments || []).reduce((acc, p) => acc + (Number(p.amountBdt) || 0), 0);
    const remainingDueBdt = Math.max(0, totalSentBdt - (totalConvertedBdt + totalChinaDirectBdt));
    const rmbBalanceInHand = Math.max(0, totalRmbRemitted - totalConvertedRmb);

    return {
      totalSentBdt,
      totalEstRmbSent,
      totalRmbRemitted,
      totalConvertedBdt,
      totalConvertedRmb,
      totalChinaDirectBdt,
      remainingDueBdt,
      rmbBalanceInHand,
    };
  }, [branchConsignments, branchRemittances, rmbConversions, chinaDirectPayments]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Company Header with Logo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-12 h-12 shrink-0" />
          <div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              {t.atAGlance}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {companyInfo.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'bn' ? companyInfo.businessTypeBn : companyInfo.businessTypeEn}
            </p>
          </div>
        </div>

        {/* Part-to-part dynamic filters & Quick CTA */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'সব সময়' : 'All Time'}
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'আজকের' : 'Today'}
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'এই সপ্তাহ' : 'This Week'}
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilter === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lang === 'bn' ? 'চলতি মাস' : 'This Month'}
            </button>
          </div>

          {/* Quick 1-Page Statements CTA */}
          <button
            onClick={onOpenStatementsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.statements}</span>
          </button>
        </div>
      </div>

      {/* Dynamic & Colorful Quick Action Dock */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          onClick={onOpenNewInvoice}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'bn' ? '+ নতুন চালান' : '+ New Invoice'}</span>
        </button>

        <button
          onClick={() => onSelectTab('stock')}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Package className="w-4 h-4" />
          <span>{lang === 'bn' ? '📦 মাল স্টক' : '📦 Stock In'}</span>
        </button>

        <button
          onClick={() => onSelectTab('dokan_hishab')}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Receipt className="w-4 h-4" />
          <span>{lang === 'bn' ? '🏪 দোকান হিসাব' : '🏪 Shop Ledger'}</span>
        </button>

        <button
          onClick={() => onSelectTab('branch')}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Globe className="w-4 h-4 text-cyan-200" />
          <span>{lang === 'bn' ? '🌐 শাখা ও RMB' : '🌐 Branch & RMB'}</span>
        </button>

        <button
          onClick={() => onSelectTab('payroll')}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'bn' ? '👥 স্টাফ ও হাজিরা' : '👥 Staff & HR'}</span>
        </button>

        <button
          onClick={onOpenStatementsModal}
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border border-slate-700/50"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>{lang === 'bn' ? '🖨️ ১-পৃষ্ঠা প্রিন্ট' : '🖨️ 1-Page Print'}</span>
        </button>
      </div>

      {/* Primary KPI Grid (7 High-Contrast Cards - Total Advance Included Prominently) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {/* 1. Total Purchase */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.totalPurchase}
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatDashboardCurrency(totalPurchase, lang)}
          </div>
          <div className="mt-1 flex items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center mr-1">
              <ArrowDownLeft className="w-3 h-3" />
              {lang === 'bn' ? 'মাদারবোর্ড ক্রয়' : 'Purchases'}
            </span>
            <span>({formatNumber(filteredInvoices.filter((i) => i.mode === 'purchase').length, lang)})</span>
          </div>
        </div>

        {/* 2. Total Sales */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-blue-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.totalSales}
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-blue-600 dark:text-blue-400 tracking-tight">
            {formatDashboardCurrency(totalSales, lang)}
          </div>
          <div className="mt-1 flex items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center mr-1">
              <ArrowUpRight className="w-3 h-3" />
              {lang === 'bn' ? 'স্ক্র্যাপ পাইকারি' : 'Sales'}
            </span>
            <span>({formatNumber(filteredInvoices.filter((i) => i.mode === 'sales').length, lang)})</span>
          </div>
        </div>

        {/* 3. Current Stock Value */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-indigo-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.currentStockValue}
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
            {formatDashboardCurrency(totalStockValue, lang)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{lang === 'bn' ? 'গড় ক্রয় দরে' : 'Avg Rate'}</span>
            <button
              onClick={() => onSelectTab('stock')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              {lang === 'bn' ? 'স্টক' : 'Stock'}
            </button>
          </div>
        </div>

        {/* 4. Total Due Receivable */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-amber-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.totalDueReceivable}
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
            {formatDashboardCurrency(totalDueReceivable, lang)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{lang === 'bn' ? 'পার্টিদের বাকি পাওনা' : 'Party Due'}</span>
            <button
              onClick={() => onSelectTab('parties')}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
            >
              {lang === 'bn' ? 'খাতা' : 'Ledger'}
            </button>
          </div>
        </div>

        {/* 5. Total Advance (Explicitly requested by user) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-cyan-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'bn' ? 'মোট অগ্রিম (Advance)' : 'Total Advance'}
            </span>
            <span className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 tracking-tight">
            {formatDashboardCurrency(totalAdvanceAmount, lang)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{lang === 'bn' ? 'পার্টির অগ্রিম জমা' : 'Party Advances'}</span>
            <button
              onClick={() => onSelectTab('parties')}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
            >
              {lang === 'bn' ? 'বিস্তারিত' : 'Details'}
            </button>
          </div>
        </div>

        {/* 6. Today's Expense */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.todayExpense}
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {formatDashboardCurrency(todayExpensesAmount, lang)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{lang === 'bn' ? 'পেটি ক্যাশ ও গাড়ি' : 'Petty & Car'}</span>
            <button
              onClick={() => onSelectTab('petty_cash')}
              className="text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
            >
              {lang === 'bn' ? 'লগ' : 'Log'}
            </button>
          </div>
        </div>

        {/* 7. Staff Total Advance Card (Requirement 4) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {lang === 'bn' ? 'স্টাফ মোট অগ্রিম (Advance)' : 'Staff Total Advance'}
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {formatDashboardCurrency(totalStaffAdvance, lang)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{lang === 'bn' ? 'চলতি মাসের কর্তন' : 'Monthly Advance'}</span>
            <button
              onClick={() => onSelectTab('payroll')}
              className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
            >
              {lang === 'bn' ? 'স্টাফ খাতা' : 'Payroll'}
            </button>
          </div>
        </div>
      </div>

      {/* 👥 STAFF TOTAL SALARY & HR OVERVIEW (Requirement 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Staff Salary Card with Clean Monthly Selector */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'মোট স্টাফ মাসিক বেতন (Total Staff Salary)' : 'Total Staff Monthly Salary'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'মাস ভিত্তিক ফিল্টার করে মোট বেতন হিসাব দেখুন' : 'Filtered monthly payroll total'}
                </p>
              </div>
            </div>

            {/* Clean Monthly Selector Link/Control */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = salaryMonth.split('-').map(Number);
                  const prev = new Date(y, m - 2, 1);
                  setSalaryMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                title={lang === 'bn' ? 'পূর্ববর্তী মাস' : 'Previous Month'}
              >
                &larr;
              </button>
              <input
                type="month"
                value={salaryMonth}
                onChange={(e) => {
                  if (e.target.value) setSalaryMonth(e.target.value);
                }}
                className="bg-transparent text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const [y, m] = salaryMonth.split('-').map(Number);
                  const next = new Date(y, m, 1);
                  setSalaryMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                title={lang === 'bn' ? 'পরবর্তী মাস' : 'Next Month'}
              >
                &rarr;
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">
                {lang === 'bn' ? 'নির্বাচিত মাসের নিট পে-রোল বিল:' : 'Net Payable Payroll:'}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatDashboardCurrency(totalStaffMonthlySalary, lang)}
              </div>
            </div>

            <button
              onClick={() => onSelectTab('payroll')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'পে-রোল প্যানেল ➔' : 'Payroll Panel ➔'}
            </button>
          </div>
        </div>

        {/* Staff Attendance & Advance Combined Overview */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'স্টাফ অগ্রিম ও হাজিরা পরিস্থিতি' : 'Staff Advances & Attendance'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'মাসিক ও সার্বিক অগ্রিম এবং আজকের উপস্থিতি' : 'Monthly/total advance & today presence'}
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
              {formatNumber(todayAttendanceStats.present, lang)} / {formatNumber(staff.length || 4, lang)} {lang === 'bn' ? 'উপস্থিত' : 'Present'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block uppercase">
                {lang === 'bn' ? 'মাসের মোট অগ্রিম' : 'Monthly Advance'}
              </span>
              <div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">
                {formatDashboardCurrency(totalStaffAdvance, lang)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                {lang === 'bn' ? 'সার্বিক মোট অগ্রিম' : 'All-Time Advance'}
              </span>
              <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatDashboardCurrency(allTimeStaffAdvance, lang)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🇨🇳 CHINA OFFICE OVERVIEW & BALANCE DUE STATUS (User Requirement: এক নজরে চায়না অফিস থেকে মোট আর কত টাকা পাওয়ার বাকি আছে বা হিসাবের বর্তমান অবস্থা) */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 text-white p-5 rounded-3xl border border-sky-800/60 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-800/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-cyan-300 border border-sky-400/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400">
                  {lang === 'bn' ? 'চীন শাখা অফিস ব্যালেন্স' : 'China Branch Office'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-200 border border-sky-400/30 font-mono">
                  {lang === 'bn' ? 'স্টক ও বাকি স্থিতি' : 'Stock & Due Status'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                {lang === 'bn' ? 'চীন অফিস থেকে অবশিষ্টাংশ পাওনা / হিসাবের বর্তমান অবস্থা' : 'China Office Remaining Stock & Balance Due'}
              </h3>
            </div>
          </div>

          <button
            onClick={() => onSelectTab('branch')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shrink-0 shadow-md"
          >
            <span>{lang === 'bn' ? 'শাখা খাতা দেখুন ➔' : 'View Branch Ledger ➔'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Card A: China Office Remaining Due BDT (User's primary requirement!) */}
          <div className="p-4 rounded-2xl bg-white/5 border border-sky-500/30 backdrop-blur-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {lang === 'bn' ? 'চায়না অফিস বাকি / পাওনা BDT' : 'China Remaining Due (BDT)'}
            </span>
            <div className="text-2xl font-black font-mono text-cyan-300">
              {formatDashboardCurrency(chinaMetrics.remainingDueBdt, lang)}
            </div>
            <p className="text-[10px] text-slate-300 font-mono">
              = {lang === 'bn' ? 'স্টক' : 'Stock'} {formatDashboardCurrency(chinaMetrics.totalSentBdt, lang)} - {lang === 'bn' ? 'RMB BDT' : 'RMB'} {formatDashboardCurrency(chinaMetrics.totalConvertedBdt, lang)}
              {chinaMetrics.totalChinaDirectBdt > 0 && ` - ${lang === 'bn' ? 'সরাসরি BDT' : 'Direct'} ${formatDashboardCurrency(chinaMetrics.totalChinaDirectBdt, lang)}`}
            </p>
          </div>

          {/* Card B: Total Stock Sent BDT */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {lang === 'bn' ? 'শাখা অফিসে পাঠানো মোট স্টক' : 'Total Stock Sent (BDT)'}
            </span>
            <div className="text-2xl font-black font-mono text-white">
              {formatDashboardCurrency(chinaMetrics.totalSentBdt, lang)}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              ≈ ¥ {Math.round(chinaMetrics.totalEstRmbSent).toLocaleString()} ({(branchConsignments || []).length} {lang === 'bn' ? 'টি চালান' : 'challans'})
            </p>
          </div>

          {/* Card C: Total RMB Converted to BDT */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              {lang === 'bn' ? 'RMB হতে মোট প্রাপ্ত টাকা (BDT)' : 'RMB Converted BDT'}
            </span>
            <div className="text-2xl font-black font-mono text-emerald-300">
              {formatDashboardCurrency(chinaMetrics.totalConvertedBdt, lang)}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {lang === 'bn' ? 'কনভার্ট RMB:' : 'Converted:'} ¥ {Math.round(chinaMetrics.totalConvertedRmb).toLocaleString()}
            </p>
          </div>

          {/* Card D: Total RMB Remitted & In Hand */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              {lang === 'bn' ? 'শাখা অফিস RMB প্রাপ্তি ও উদ্বৃত্ত' : 'RMB Remitted & In-Hand'}
            </span>
            <div className="text-2xl font-black font-mono text-amber-300">
              ¥ {Math.round(chinaMetrics.totalRmbRemitted).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {lang === 'bn' ? 'হাতে অবশিষ্ট RMB:' : 'In Hand:'} <span className="font-bold text-emerald-400">¥ {Math.round(chinaMetrics.rmbBalanceInHand).toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Auto Stock Status: 4-Category Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              {t.categoryWiseStock}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'bn'
                ? 'ইনভয়েস সেভ হওয়ার সাথে সাথে অটো স্টক ও গড় ক্রয় দর আপডেট হয়'
                : 'Stock & weighted average purchase rate updates automatically on invoice saving'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('stock')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
            >
              {lang === 'bn' ? 'পূর্ণাঙ্গ স্টক প্যানেল' : 'Full Stock Panel'} &rarr;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryStats.map((cat) => (
            <div
              key={cat.key}
              onClick={() => onSelectTab('stock')}
              className={`p-4 rounded-xl border ${cat.color} transition-all hover:scale-[1.02] cursor-pointer`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider">{cat.label}</span>
                {cat.alertItems > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">
                    <AlertTriangle className="w-3 h-3" />
                    {formatNumber(cat.alertItems, lang)}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {formatNumber(Math.round(cat.totalQty), lang)}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {cat.key === 'kg' ? (lang === 'bn' ? 'কেজি মজুদ' : 'KG in stock') : (lang === 'bn' ? 'পিস মজুদ' : 'Pcs in stock')}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                    {formatDashboardCurrency(cat.val, lang)}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatNumber(cat.count, lang)} {lang === 'bn' ? 'আইটেম' : 'items'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Lower Section: Recent Invoices & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                {t.recentInvoices} ({formatNumber(filteredInvoices.length, lang)})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn'
                  ? 'জেনারেল, প্রসেসিং (৫জি), দোকান ও কমার্শিয়াল ইনভয়েস হিস্টোরি'
                  : '4-type invoice history with one-click print & WhatsApp share'}
              </p>
            </div>
            <button
              onClick={() => onSelectTab('invoices')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
            >
              {lang === 'bn' ? 'সব ইনভয়েস দেখুন' : 'View All Invoices'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">{t.invoiceNo}</th>
                  <th className="py-2.5 px-3">{t.invoiceType}</th>
                  <th className="py-2.5 px-3">{t.partyName}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'নেট বিল' : 'Net Amount'}</th>
                  <th className="py-2.5 px-3 text-right">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.slice(0, 5).map((inv) => {
                  const isProcessing = inv.type === 'processing';
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isProcessing
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : inv.type === 'commercial'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : inv.type === 'dokan'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {isProcessing ? 'Vai Vai 5G' : inv.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                          {inv.partyName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatDate(inv.date, lang)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatDashboardCurrency(inv.netInvoiceAmount, lang)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          {lang === 'bn' ? 'দেখুন' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations & Shortcuts */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              {t.quickActions}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'bn'
                ? 'এক ক্লিকে ইনভয়েস তৈরি, প্রিন্ট ও পার্টি শেয়ার'
                : 'One-click invoice generation, 1-page reports, and party shares'}
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={onOpenNewInvoice}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t.createInvoice} (৪০টি আইটেম পর্যন্ত)
              </span>
              <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-full">
                {lang === 'bn' ? 'নতুন' : 'New'}
              </span>
            </button>

            <button
              onClick={onOpenStatementsModal}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-500" />
                {t.statements} (A4 ফিট)
              </span>
              <span className="text-[10px] text-slate-500">1-Page</span>
            </button>

            <button
              onClick={() => onSelectTab('payroll')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                {t.recordAttendance}
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold font-mono">
                OT: ৳৬০/ঘণ্টা
              </span>
            </button>

            <button
              onClick={() => onSelectTab('parties')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                {t.partyManagement}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {formatNumber(parties.length, lang)} {lang === 'bn' ? 'পার্টি' : 'parties'}
              </span>
            </button>
          </div>

          {/* Quick Business Specs Footer with Logo */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-300 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-6 h-6" />
              <div className="flex-1 truncate">{companyInfo.name}</div>
              <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
                PRO 5G
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {companyInfo.address}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
