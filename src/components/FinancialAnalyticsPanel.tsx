import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Coins,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  PieChart,
  BarChart3,
  Percent,
  Wallet,
  Car,
  Users,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  Language,
  Invoice,
  StockItem,
  Staff,
  AttendanceRecord,
  PettyCashExpense,
  CarExpense,
  BranchConsignment,
  BranchRmbRemittance,
  ThirdPartyRmbConversion,
  ChinaDirectPayment,
  Party,
} from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';
import { storageService } from '../lib/storage';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

export type DateFilterMode = 'today' | 'month' | 'range' | 'all';

interface FinancialAnalyticsPanelProps {
  lang: Language;
  invoices: Invoice[];
  stock: StockItem[];
  staff: Staff[];
  attendance: AttendanceRecord[];
  pettyCashExpenses: PettyCashExpense[];
  carExpenses: CarExpense[];
  branchConsignments?: BranchConsignment[];
  branchRemittances?: BranchRmbRemittance[];
  rmbConversions?: ThirdPartyRmbConversion[];
  chinaDirectPayments?: ChinaDirectPayment[];
  parties?: Party[];
  onPrintFinancialStatement: (
    mode: DateFilterMode,
    selectedDate: string,
    selectedMonth: string,
    startDate: string,
    endDate: string
  ) => void;
}

export const FinancialAnalyticsPanel: React.FC<FinancialAnalyticsPanelProps> = ({
  lang,
  invoices,
  stock,
  staff,
  attendance,
  pettyCashExpenses,
  carExpenses,
  branchConsignments,
  branchRemittances,
  rmbConversions,
  chinaDirectPayments,
  parties = [],
  onPrintFinancialStatement,
}) => {
  const t = translations[lang];

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);

  // Date Filter States
  const [filterMode, setFilterMode] = useState<DateFilterMode>('month');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const formatMonthDisplay = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    if (isNaN(date.getTime())) return monthStr;

    if (lang === 'bn') {
      const bnMonths = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      return `${bnMonths[m - 1]} ${y}`;
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Date Check Helper
  const isDateInPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    if (filterMode === 'all') return true;
    if (filterMode === 'today') return dateStr === selectedDate;
    if (filterMode === 'month') return dateStr.startsWith(selectedMonth);
    if (filterMode === 'range') {
      return dateStr >= startDate && dateStr <= endDate;
    }
    return true;
  };

  // 1. Filtered Invoices & Metrics
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => isDateInPeriod(inv.date));
  }, [invoices, filterMode, selectedDate, selectedMonth, startDate, endDate]);

  // Helper to reliably compute net revenue/cost for an invoice
  const getInvoiceAmount = (inv: any): number => {
    if (typeof inv.netInvoiceAmount === 'number' && inv.netInvoiceAmount > 0) {
      return inv.netInvoiceAmount;
    }
    if (typeof inv.subtotal === 'number' && inv.subtotal > 0) {
      return Math.max(0, inv.subtotal - (Number(inv.discount) || 0) - (Number(inv.courierDeduction) || 0));
    }
    if (typeof inv.grandTotal === 'number' && inv.grandTotal > 0) {
      const prev = Number(inv.previousBalance) || 0;
      return Math.max(0, inv.grandTotal - prev);
    }
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      return inv.items.reduce((s: number, it: any) => s + (Number(it.total) || 0), 0);
    }
    return 0;
  };

  // China Branch Export Consignments Integration (User Requirement: include China branch consignments in sales revenue)
  const filteredConsignments = useMemo(() => {
    const list = branchConsignments && branchConsignments.length > 0
      ? branchConsignments
      : storageService.getBranchConsignments();
    return (list || []).filter((c) => isDateInPeriod(c.date));
  }, [branchConsignments, filterMode, selectedDate, selectedMonth, startDate, endDate]);

  const totalChinaExportRevenue = useMemo(() => {
    return filteredConsignments.reduce((sum, c) => sum + (Number(c.totalBdtValue) || 0), 0);
  }, [filteredConsignments]);

  const filteredChinaDirectPayments = useMemo(() => {
    const list = chinaDirectPayments && chinaDirectPayments.length > 0
      ? chinaDirectPayments
      : storageService.getChinaDirectPayments();
    return (list || []).filter((p) => isDateInPeriod(p.date));
  }, [chinaDirectPayments, filterMode, selectedDate, selectedMonth, startDate, endDate]);

  const totalChinaDirectPayments = useMemo(() => {
    return filteredChinaDirectPayments.reduce((sum, p) => sum + (Number(p.amountBdt) || 0), 0);
  }, [filteredChinaDirectPayments]);

  const totalDomesticSalesRevenue = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.mode === 'sales' || !inv.mode)
      .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
  }, [filteredInvoices]);

  // Combined Total Sales Turnover = Invoiced Sales + China Export Consignments + China Direct BDT Payments
  const totalSalesRevenue = totalDomesticSalesRevenue + totalChinaExportRevenue + totalChinaDirectPayments;

  // China Office All-Time / Active Receivables Balance (b/l)
  const allConsignments = useMemo(() => {
    return branchConsignments && branchConsignments.length > 0
      ? branchConsignments
      : storageService.getBranchConsignments();
  }, [branchConsignments]);

  const allConversions = useMemo(() => {
    return rmbConversions && rmbConversions.length > 0
      ? rmbConversions
      : storageService.getRmbConversions();
  }, [rmbConversions]);

  const allChinaDirect = useMemo(() => {
    return chinaDirectPayments && chinaDirectPayments.length > 0
      ? chinaDirectPayments
      : storageService.getChinaDirectPayments();
  }, [chinaDirectPayments]);

  const chinaTotalSentBdt = useMemo(() => {
    return allConsignments.reduce((s, c) => s + (Number(c.totalBdtValue) || 0), 0);
  }, [allConsignments]);

  const chinaTotalRmbConvertedBdt = useMemo(() => {
    return allConversions.reduce((s, cv) => s + (Number(cv.expectedBdtAmount || cv.receivedBdtAmount) || 0), 0);
  }, [allConversions]);

  const chinaTotalDirectBdt = useMemo(() => {
    return allChinaDirect.reduce((s, p) => s + (Number(p.amountBdt) || 0), 0);
  }, [allChinaDirect]);

  const chinaRemainingBalanceBdt = Math.max(0, chinaTotalSentBdt - (chinaTotalRmbConvertedBdt + chinaTotalDirectBdt));

  const totalPurchaseCost = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.mode === 'purchase')
      .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0);
  }, [filteredInvoices]);

  // Party-wise Procurement Payments and Outstanding Bill Dues
  const totalPartyBillPayments = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.mode === 'purchase')
      .reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  }, [filteredInvoices]);

  const totalPartyPurchaseDue = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.mode === 'purchase')
      .reduce((sum, inv) => sum + (Number(inv.remainingDue) || 0), 0);
  }, [filteredInvoices]);

  // Individual Party Procurement & Bill Payment Breakdown
  const partyProcurementBreakdown = useMemo(() => {
    const map: { [partyName: string]: { partyName: string; count: number; totalBill: number; paidAmount: number; remainingDue: number } } = {};
    filteredInvoices
      .filter((inv) => inv.mode === 'purchase')
      .forEach((inv) => {
        const pName = (inv.partyName || 'Unknown Supplier').trim();
        if (!map[pName]) {
          map[pName] = { partyName: pName, count: 0, totalBill: 0, paidAmount: 0, remainingDue: 0 };
        }
        map[pName].count += 1;
        map[pName].totalBill += getInvoiceAmount(inv);
        map[pName].paidAmount += Number(inv.paidAmount) || 0;
        map[pName].remainingDue += Number(inv.remainingDue) || 0;
      });
    return Object.values(map).sort((a, b) => b.totalBill - a.totalBill);
  }, [filteredInvoices]);

  const grossSalesBalance = totalSalesRevenue - totalPurchaseCost;

  // 2. Expenses
  // 2. Expenses (Excludes cash deposits / cash-in additions per financial accounting standards)
  const filteredPettyCash = useMemo(() => {
    return pettyCashExpenses.filter((e) => isDateInPeriod(e.date) && e.type !== 'in');
  }, [pettyCashExpenses, filterMode, selectedDate, selectedMonth, startDate, endDate]);

  const totalPettyCashAmount = useMemo(() => {
    return filteredPettyCash.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredPettyCash]);

  const filteredCarExpenses = useMemo(() => {
    return carExpenses.filter((e) => isDateInPeriod(e.date));
  }, [carExpenses, filterMode, selectedDate, selectedMonth, startDate, endDate]);

  const totalCarExpenseAmount = useMemo(() => {
    return filteredCarExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredCarExpenses]);

  const totalOperationalExpenses = totalPettyCashAmount + totalCarExpenseAmount;

  // 3. Paid Staff Salaries
  // Computes paid salary in selected period
  const totalPaidStaffSalary = useMemo(() => {
    let activeMonths = [selectedMonth];
    if (filterMode === 'today') {
      activeMonths = [selectedDate.slice(0, 7)];
    } else if (filterMode === 'range') {
      const m1 = startDate.slice(0, 7);
      const m2 = endDate.slice(0, 7);
      activeMonths = m1 === m2 ? [m1] : [m1, m2];
    } else if (filterMode === 'all') {
      const monthSet = new Set(attendance.map((a) => a.date.slice(0, 7)));
      monthSet.add(currentMonthStr);
      activeMonths = Array.from(monthSet);
    }

    let sumPaidSalary = 0;

    activeMonths.forEach((m) => {
      const monthAtt = attendance.filter((a) => a.date && a.date.startsWith(m));
      staff.forEach((stf) => {
        const status = storageService.getStaffPaymentStatus(m, stf.id);
        if (status === 'Paid') {
          const records = monthAtt.filter((a) => a.staffId === stf.id);
          const absentDays = records.filter((a) => a.status === 'absent').length;
          const totalOt = stf.category === 'office' ? 0 : records.reduce((s, a) => s + (a.otHours || 0), 0);
          const otAmount = totalOt * 60;
          const totalAdv = records.reduce((s, a) => s + (a.advanceDeduction || 0), 0);
          const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(stf.id, m);
          const absentDeduction = absentDays * stf.dailyRate;
          const net = Math.max(0, stf.baseSalary - absentDeduction + otAmount - totalAdv - damageDeduction);
          sumPaidSalary += net;
        }
      });
    });

    return sumPaidSalary;
  }, [staff, attendance, filterMode, selectedDate, selectedMonth, startDate, endDate]);

  // 4. Net Profit & Loss Calculation (Accurate Standard Waterfall)
  // Gross Profit = Total Sales Revenue - Total Purchase Cost
  // Operating Expenses = Petty Cash + Car Expense + Paid Staff Salaries
  // Net Profit = Gross Profit - Operating Expenses
  const netProfitLoss = totalSalesRevenue - (totalPurchaseCost + totalOperationalExpenses + totalPaidStaffSalary);
  const isProfitable = netProfitLoss >= 0;

  // 5. Total Company Investment / Operational Outflow & ROI
  const totalInvestmentOutflow = totalPurchaseCost + totalOperationalExpenses + totalPaidStaffSalary;
  const currentStockValuation = useMemo(() => {
    return stock.reduce((sum, item) => {
      const rate = item.purchaseRate || item.purchaseAvgRate || 0;
      return sum + item.quantity * rate;
    }, 0);
  }, [stock]);

  const roiPercentage = totalInvestmentOutflow > 0
    ? (netProfitLoss / totalInvestmentOutflow) * 100
    : 0;

  const profitMarginPercentage = totalSalesRevenue > 0
    ? (netProfitLoss / totalSalesRevenue) * 100
    : 0;

  const expenseRatioPercentage = totalSalesRevenue > 0
    ? ((totalOperationalExpenses + totalPaidStaffSalary) / totalSalesRevenue) * 100
    : 0;

  // Category-wise Breakdown
  const categoryBreakdown = useMemo(() => {
    const cats: { [key: string]: { code: string; labelBn: string; labelEn: string; sales: number; purchase: number } } = {
      code: { code: 'code', labelBn: 'কোড আইসি সার্কিট', labelEn: 'Code IC Circuit', sales: 0, purchase: 0 },
      android: { code: 'android', labelBn: 'অ্যান্ড্রয়েড লট পিসিবি', labelEn: 'Android Lot PCB', sales: 0, purchase: 0 },
      kg: { code: 'kg', labelBn: 'কেজি ওজন সার্কিট', labelEn: 'KG Weight Circuit', sales: 0, purchase: 0 },
      pcs_blank: { code: 'pcs_blank', labelBn: 'পিস ও ব্ল্যাঙ্ক বোর্ড', labelEn: 'Pcs & Blank Board', sales: 0, purchase: 0 },
    };

    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        const key = it.category || 'code';
        if (cats[key]) {
          if (inv.mode === 'sales') {
            cats[key].sales += Number(it.total) || 0;
          } else if (inv.mode === 'purchase') {
            cats[key].purchase += Number(it.total) || 0;
          }
        }
      });
    });

    if (totalChinaExportRevenue > 0) {
      cats['china_export'] = {
        code: 'china_export',
        labelBn: 'চীন শাখা অফিস রপ্তানি চালান',
        labelEn: 'China Branch Export Consignments',
        sales: totalChinaExportRevenue,
        purchase: 0,
      };
    }

    if (totalChinaDirectPayments > 0) {
      cats['china_direct'] = {
        code: 'china_direct',
        labelBn: 'চীন অফিস সরাসরি BDT পেমেন্ট',
        labelEn: 'China Office Direct BDT Inflow',
        sales: totalChinaDirectPayments,
        purchase: 0,
      };
    }

    return Object.values(cats);
  }, [filteredInvoices, totalChinaExportRevenue, totalChinaDirectPayments]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {t.financialAnalyticsTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'বিক্রয় আয়, ক্রয় খরচ, অফিস ও গাড়ি খরচ, স্টাফ বেতন, নিট লাভ-ক্ষতি (P&L) এবং ROI ট্র্যাকিং'
              : 'Sales Revenue, Purchase Cost, Office Expenses, Paid Salaries, Net P&L and ROI Tracking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপ রিপোর্ট' : 'Share WhatsApp'}
            getText={() => {
              const companyInfo = storageService.getCompanyInfo();
              return `*${companyInfo.name} - লাভ-ক্ষতি (P&L) ও ROI সামারি*\n────────────────────────\n💵 বিক্রয় আয়: ৳${totalSalesRevenue.toLocaleString()}\n📦 ক্রয় খরচ: ৳${totalPurchaseCost.toLocaleString()}\n💰 মোট বাণিজ্যিক মুনাফা (Gross): ৳${grossSalesBalance.toLocaleString()}\n🏢 অফিস ও পেটিক্যাশ: ৳${totalPettyCashAmount.toLocaleString()}\n🚗 গাড়ি ও পরিবহন: ৳${totalCarExpenseAmount.toLocaleString()}\n👥 স্টাফ বেতন: ৳${totalPaidStaffSalary.toLocaleString()}\n────────────────────────\n📈 নিট প্রফিট: ৳${netProfitLoss.toLocaleString()}\n🎯 ROI: ${roiPercentage.toFixed(1)}%\n_${companyInfo.name}_`;
            }}
          />

          <button
            onClick={() =>
              onPrintFinancialStatement(
                filterMode,
                selectedDate,
                selectedMonth,
                startDate,
                endDate
              )
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? '১-পেজ P&L ও ROI স্টেটমেন্ট প্রিন্ট' : 'Print 1-Page P&L Statement'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Date Filter Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {lang === 'bn' ? 'সময়কাল নির্বাচন (Date Filter)' : 'Select Accounting Period'}
            </span>
          </div>

          {/* Filter Preset Switcher */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setFilterMode('today')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'আজকের (Daily)' : 'Daily'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'মাসিক (Monthly)' : 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'range'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'তারিখ রেঞ্জ (Range)' : 'Range'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সবসময় (All)' : 'All Time'}
            </button>
          </div>
        </div>

        {/* Filter Input Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {filterMode === 'today' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">{lang === 'bn' ? 'তারিখ:' : 'Date:'}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-xl font-mono focus:outline-emerald-500 cursor-pointer"
              />
            </div>
          )}

          {filterMode === 'month' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-xl font-mono focus:outline-emerald-500 cursor-pointer"
              />
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-bold text-emerald-400 ml-2">
                {formatMonthDisplay(selectedMonth)}
              </span>
            </div>
          )}

          {filterMode === 'range' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{lang === 'bn' ? 'শুরু:' : 'From:'}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-xl font-mono focus:outline-emerald-500 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{lang === 'bn' ? 'শেষ:' : 'To:'}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-xl font-mono focus:outline-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {filterMode === 'all' && (
            <span className="text-slate-400 font-mono">
              {lang === 'bn' ? 'সর্বমোট রেকর্ড হিসাব করা হচ্ছে' : 'Calculating entire database history'}
            </span>
          )}

          <div className="text-slate-400 text-[11px] font-mono">
            {filteredInvoices.length} {lang === 'bn' ? 'টি ইনভয়েস ট্র্যাকিং' : 'invoices tracked'}
          </div>
        </div>
      </div>

      {/* 1. Daily & Monthly Purchase vs Sales KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales Revenue */}
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              {lang === 'bn' ? 'মোট বিক্রয় ও শাখা রপ্তানি আয়' : 'Total Sales & Export Revenue'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-300">
            {formatCurrency(totalSalesRevenue, lang)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40 font-mono">
            <div className="flex justify-between">
              <span>{lang === 'bn' ? 'লোকাল ইনভয়েস বিক্রয়:' : 'Local Invoices:'}</span>
              <strong className="text-slate-900 dark:text-white">{formatCurrency(totalDomesticSalesRevenue, lang)}</strong>
            </div>
            {totalChinaExportRevenue > 0 && (
              <div className="flex justify-between text-cyan-800 dark:text-cyan-300">
                <span>{lang === 'bn' ? 'চীন শাখা রপ্তানি চালান:' : 'China Export Consignments:'}</span>
                <strong>{formatCurrency(totalChinaExportRevenue, lang)} ({filteredConsignments.length})</strong>
              </div>
            )}
            {totalChinaDirectPayments > 0 && (
              <div className="flex justify-between text-teal-800 dark:text-teal-300">
                <span>{lang === 'bn' ? 'চীন অফিস সরাসরি BDT পেমেন্ট:' : 'China Office Direct BDT:'}</span>
                <strong>{formatCurrency(totalChinaDirectPayments, lang)} ({filteredChinaDirectPayments.length})</strong>
              </div>
            )}
            {chinaRemainingBalanceBdt > 0 && (
              <div className="flex justify-between text-indigo-800 dark:text-indigo-300 font-semibold bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                <span>{lang === 'bn' ? 'চীন অফিস অবশিষ্ট পাওনা (B/L):' : 'China Office Balance (B/L):'}</span>
                <strong>{formatCurrency(chinaRemainingBalanceBdt, lang)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Total Purchase Cost */}
        <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              {t.totalPurchaseCost}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-blue-900 dark:text-blue-300">
            {formatCurrency(totalPurchaseCost, lang)}
          </div>
          <div className="text-[11px] text-blue-700 dark:text-blue-400 space-y-1 pt-1 border-t border-blue-200/60 dark:border-blue-800/40 font-mono">
            <div className="flex justify-between">
              <span>{lang === 'bn' ? 'পার্টি বিল পরিশোধ (Paid):' : 'Party Bills Paid:'}</span>
              <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(totalPartyBillPayments, lang)}</strong>
            </div>
            {totalPartyPurchaseDue > 0 && (
              <div className="flex justify-between text-rose-700 dark:text-rose-400">
                <span>{lang === 'bn' ? 'ক্রয় বাবদ বকেয়া বাকি (Due):' : 'Purchase Bill Due:'}</span>
                <strong>{formatCurrency(totalPartyPurchaseDue, lang)}</strong>
              </div>
            )}
            <div className="text-[10px] text-slate-500 font-sans">
              {lang === 'bn' ? 'মহাজন ও পার্টির ক্রয় খরচ ও বিল পরিশোধ' : 'Procurement bills & party payments'}
            </div>
          </div>
        </div>

        {/* Gross Sales Balance */}
        <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
              {t.grossSalesBalance}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-purple-900 dark:text-purple-300">
            {formatCurrency(grossSalesBalance, lang)}
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-400">
            {lang === 'bn' ? 'বিক্রয় আয় - সরাসরি ক্রয় খরচ (খরচ ও বেতন বাদ দেওয়ার আগে)' : 'Sales Revenue minus Purchase Cost'}
          </p>
        </div>
      </div>

      {/* 2. Prominent Net Profit & Loss (P&L) Status Card & Waterfall Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prominent Profit / Loss Status Card */}
        <div
          className={`p-6 rounded-3xl border shadow-lg space-y-4 lg:col-span-1 flex flex-col justify-between ${
            isProfitable
              ? 'bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 text-white border-emerald-500/50'
              : 'bg-gradient-to-br from-rose-900 via-rose-950 to-slate-950 text-white border-rose-500/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                {t.netProfitLoss}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isProfitable
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {isProfitable ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'লাভজনক (PROFIT)' : 'PROFIT'}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'লোকসান (LOSS)' : 'LOSS'}</span>
                  </>
                )}
              </span>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black font-mono">
                {formatCurrency(netProfitLoss, lang)}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isProfitable
                  ? lang === 'bn'
                    ? 'সব খরচ ও বেতন পরিশোধের পর কোম্পানির অবশিষ্ট আসল লাভ'
                    : 'Net earnings after deducting all purchases, expenses & staff salaries'
                  : lang === 'bn'
                    ? 'পরিচালন ব্যয় আয়ের চেয়ে বেশি হওয়ায় লোকসান চিহ্নিত হয়েছে'
                    : 'Operating costs exceeded revenues for the selected period'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">{t.profitMargin}:</span>
              <strong className="font-mono text-sm text-white">
                {profitMarginPercentage.toFixed(1)}%
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">{lang === 'bn' ? 'ব্যবসায়িক স্ট্যাটাস:' : 'Business Health:'}</span>
              <strong className={isProfitable ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                {isProfitable ? t.profitableStatus : t.lossStatus}
              </strong>
            </div>
          </div>
        </div>

        {/* P&L Formula Waterfall Table */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'bn' ? 'লাভ-ক্ষতি (P&L) হিসাব বিবরণী' : 'Profit & Loss (P&L) Ledger Waterfall'}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Net Profit = Total Sales Revenue - (Total Purchase + Total Expenses + Total Paid Salaries)
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {/* Combined Sales & Export Turnover */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>(+) {lang === 'bn' ? 'মোট বিক্রয়, চীন শাখা রপ্তানি ও প্রাপ্তি আয়' : 'Total Sales & China Export Turnover'}</span>
                </span>
                <span className="font-mono text-emerald-800 dark:text-emerald-300 font-black">
                  {formatCurrency(totalSalesRevenue, lang)}
                </span>
              </div>
              <div className="pl-6 text-[11px] text-slate-500 font-mono space-y-0.5">
                <div className="flex justify-between">
                  <span>• {lang === 'bn' ? 'লোকাল ইনভয়েস বিক্রয় আয়' : 'Local Invoice Sales'}:</span>
                  <span>{formatCurrency(totalDomesticSalesRevenue, lang)}</span>
                </div>
                {totalChinaExportRevenue > 0 && (
                  <div className="flex justify-between text-cyan-700 dark:text-cyan-300 font-semibold">
                    <span>• {lang === 'bn' ? 'চীন শাখা অফিসে প্রেরিত চালান (রপ্তানি ভলিউম)' : 'China Branch Export Consignments'}:</span>
                    <span>{formatCurrency(totalChinaExportRevenue, lang)} ({filteredConsignments.length} {lang === 'bn' ? 'টি চালান' : 'challans'})</span>
                  </div>
                )}
                {totalChinaDirectPayments > 0 && (
                  <div className="flex justify-between text-teal-700 dark:text-teal-300 font-semibold">
                    <span>• {lang === 'bn' ? 'চীন অফিস সরাসরি BDT পেমেন্ট' : 'China Office Direct BDT Payments'}:</span>
                    <span>{formatCurrency(totalChinaDirectPayments, lang)} ({filteredChinaDirectPayments.length} {lang === 'bn' ? 'টি' : 'records'})</span>
                  </div>
                )}
                {chinaRemainingBalanceBdt > 0 && (
                  <div className="flex justify-between text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    <span>• {lang === 'bn' ? 'চীন অফিস অবশিষ্ট পাওনা ব্যালেন্স (B/L Receivables)' : 'China Office Balance (B/L Receivables)'}:</span>
                    <span>{formatCurrency(chinaRemainingBalanceBdt, lang)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Purchases & Party Bill Payments */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>(-) {t.totalPurchaseCost}</span>
                </span>
                <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                  -{formatCurrency(totalPurchaseCost, lang)}
                </span>
              </div>
              <div className="pl-6 text-[11px] text-slate-500 font-mono space-y-0.5">
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>• {lang === 'bn' ? 'পার্টি বিল পরিশোধকৃত অংশ (Paid)' : 'Party Bills Paid'}:</span>
                  <span>{formatCurrency(totalPartyBillPayments, lang)}</span>
                </div>
                {totalPartyPurchaseDue > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>• {lang === 'bn' ? 'ক্রয় বিল বকেয়া বাকি (Due Payables)' : 'Purchase Bill Due Payables'}:</span>
                    <span>{formatCurrency(totalPartyPurchaseDue, lang)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gross Balance */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 font-bold">
              <span className="text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span>(=) {t.grossSalesBalance} (গ্রস মার্জিন)</span>
              </span>
              <span className="font-mono text-purple-900 dark:text-purple-200">
                {formatCurrency(grossSalesBalance, lang)}
              </span>
            </div>

            {/* Petty Cash */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
              <span className="text-teal-700 dark:text-teal-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                <span>(-) {lang === 'bn' ? 'অফিস পেটি ক্যাশ খরচ' : 'Office Petty Cash Expenses'}</span>
              </span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                -{formatCurrency(totalPettyCashAmount, lang)}
              </span>
            </div>

            {/* Car Expenses */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
              <span className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <Car className="w-4 h-4" />
                <span>(-) {lang === 'bn' ? 'গাড়ির তেল ও রক্ষণাবেক্ষণ খরচ' : 'Vehicle Maintenance & Fuel'}</span>
              </span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                -{formatCurrency(totalCarExpenseAmount, lang)}
              </span>
            </div>

            {/* Paid Salaries */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-semibold">
              <span className="text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>(-) {t.paidSalaries}</span>
              </span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                -{formatCurrency(totalPaidStaffSalary, lang)}
              </span>
            </div>

            {/* Final Net Profit */}
            <div
              className={`flex items-center justify-between p-3 rounded-2xl font-black text-sm border ${
                isProfitable
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-700'
              }`}
            >
              <span>(=) {t.netProfitLoss}</span>
              <span className="font-mono text-base">
                {formatCurrency(netProfitLoss, lang)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROI (Return on Investment) & Company Performance Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span>{lang === 'bn' ? 'রিটার্ন অন ইনভেস্টমেন্ট (ROI) ও ব্যবসায়িক পারফরম্যান্স' : 'Return on Investment (ROI) & Financial Health'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              ROI = (Net Profit / Total Investment Outflow) × 100
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <span>{lang === 'bn' ? 'মোট মজুদ স্টক মূল্য:' : 'Current Stock Assets:'}</span>
            <span className="font-mono">{formatCurrency(currentStockValuation, lang)}</span>
          </div>
        </div>

        {/* ROI Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card A: ROI % */}
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase">
                {t.roiPercentage}
              </span>
              <Percent className="w-4 h-4 text-indigo-600" />
            </div>
            <div
              className={`text-2xl font-black font-mono ${
                roiPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {roiPercentage > 0 ? `+${roiPercentage.toFixed(1)}%` : `${roiPercentage.toFixed(1)}%`}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'bn' ? 'মোট বিনিয়োগকৃত খরচের বিপরীতে শতকরা লাভ' : 'Return per unit of operating outflow'}
            </p>
          </div>

          {/* Card B: Total Investment & Outflow */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                {t.totalInvestmentCost}
              </span>
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {formatCurrency(totalInvestmentOutflow, lang)}
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'bn' ? 'ক্রয় + অফিস খরচ + গাড়ি খরচ + পে-রোল' : 'Purchases + Expenses + Salaries'}
            </p>
          </div>

          {/* Card C: Profit Margin % */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                {t.profitMargin}
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              {profitMarginPercentage.toFixed(1)}%
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              {lang === 'bn' ? 'মোট বিক্রয় আয়ের শতকরা নিট লাভ' : 'Net profit percentage on total sales'}
            </p>
          </div>

          {/* Card D: Expense-to-Revenue Ratio */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">
                {t.expenseRatio}
              </span>
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-800 dark:text-amber-300">
              {expenseRatioPercentage.toFixed(1)}%
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {lang === 'bn' ? 'আয়ের তুলনায় পরিচালন খরচের অনুপাত' : 'Operating costs relative to revenue'}
            </p>
          </div>
        </div>

        {/* Category Contribution Table */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'bn' ? 'ক্যাটাগরি-ভিত্তিক বিক্রয় ও ক্রয় সমষ্টী' : 'Category-wise Sales & Purchase Summary'}</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'মোট বিক্রয় (Sales)' : 'Sales Turnover'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'মোট ক্রয় (Purchase)' : 'Purchase Cost'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'গ্রস ব্যবধান' : 'Gross Margin'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categoryBreakdown.map((cat) => {
                  const gross = cat.sales - cat.purchase;
                  return (
                    <tr key={cat.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {lang === 'bn' ? cat.labelBn : cat.labelEn}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(cat.sales, lang)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                        {formatCurrency(cat.purchase, lang)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-black ${
                          gross >= 0
                            ? 'text-slate-900 dark:text-white'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(gross, lang)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {/* Party-wise Procurement & Bill Payment Breakdown */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{lang === 'bn' ? 'পার্টি-ভিত্তিক ক্রয় খরচ ও বিল পরিশোধ তালিকা' : 'Party-wise Procurement & Bill Payment Breakdown'}</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {partyProcurementBreakdown.length} {lang === 'bn' ? 'টি মহাজন/পার্টি' : 'parties'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{lang === 'bn' ? 'পার্টি / মহাজনের নাম' : 'Party / Supplier Name'}</th>
                  <th className="py-2.5 px-3 text-center">{lang === 'bn' ? 'চালান সংখ্যা' : 'Invoices'}</th>
                  <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'মোট ক্রয় বিল (Procurement)' : 'Total Bill'}</th>
                  <th className="py-2.5 px-3 text-right text-emerald-600">{lang === 'bn' ? 'পরিশোধিত (Paid)' : 'Paid Amount'}</th>
                  <th className="py-2.5 px-3 text-right text-rose-600">{lang === 'bn' ? 'বকেয়া বাকি (Due)' : 'Due Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {partyProcurementBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      {lang === 'bn' ? 'নির্বাচিত সময়ে কোনো পার্টি ক্রয় চালান নেই।' : 'No procurement invoices in this period.'}
                    </td>
                  </tr>
                ) : (
                  partyProcurementBreakdown.map((p, idx) => (
                    <tr key={p.partyName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {p.partyName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {p.count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(p.totalBill, lang)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.paidAmount, lang)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        {p.remainingDue > 0 ? formatCurrency(p.remainingDue, lang) : '০'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {partyProcurementBreakdown.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t border-slate-300 dark:border-slate-700">
                    <td colSpan={3} className="py-2 px-3 text-right uppercase">
                      {lang === 'bn' ? 'সর্বমোট ক্রয় ও পার্টি পরিশোধ:' : 'Total Procurement & Paid:'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-700 dark:text-blue-300">
                      {formatCurrency(totalPurchaseCost, lang)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(totalPartyBillPayments, lang)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700 dark:text-rose-300">
                      {formatCurrency(totalPartyPurchaseDue, lang)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
