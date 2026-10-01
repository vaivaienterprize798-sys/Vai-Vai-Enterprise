import React, { useState, useMemo } from 'react';
import {
  Printer,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  Receipt,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  Clock,
  DollarSign,
  Briefcase,
  Download,
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
  WorkerTaskRecord,
} from '../types';

export type { StatementType };
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

export type PeriodFilterMode = 'month' | 'date' | 'range' | 'all';

interface PrintStatementsProps {
  type: StatementType;
  lang: Language;
  stock: StockItem[];
  invoices?: Invoice[];
  parties: Party[];
  staff: Staff[];
  attendance?: AttendanceRecord[];
  expenses?: Expense[];
  branchConsignments?: BranchConsignment[];
  workerTasks?: WorkerTaskRecord[];
  onBack: () => void;
  initialStaffId?: string | null;
  initialPartyId?: string | null;
  initialMonth?: string | null;
  filterMode?: PeriodFilterMode;
  selectedDate?: string;
  startDate?: string;
  endDate?: string;
}

export const PrintStatements: React.FC<PrintStatementsProps> = ({
  type,
  lang,
  stock,
  invoices,
  parties,
  staff,
  attendance,
  expenses,
  branchConsignments,
  workerTasks,
  onBack,
  initialStaffId,
  initialPartyId,
  initialMonth,
  filterMode: propFilterMode,
  selectedDate: propSelectedDate,
  startDate: propStartDate,
  endDate: propEndDate,
}) => {
  const t = translations[lang];
  const company = storageService.getCompanyInfo();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || currentMonthStr);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId || 'all');
  const [filterMode, setFilterMode] = useState<PeriodFilterMode>(propFilterMode || 'month');
  const [selectedDate, setSelectedDate] = useState<string>(propSelectedDate || todayStr);
  const [startDate, setStartDate] = useState<string>(propStartDate || todayStr);
  const [endDate, setEndDate] = useState<string>(propEndDate || todayStr);

  React.useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth);
    }
  }, [initialMonth]);

  React.useEffect(() => {
    if (initialPartyId) {
      setSelectedPartyId(initialPartyId);
    }
  }, [initialPartyId]);

  React.useEffect(() => {
    if (propFilterMode) setFilterMode(propFilterMode);
    if (propSelectedDate) setSelectedDate(propSelectedDate);
    if (propStartDate) setStartDate(propStartDate);
    if (propEndDate) setEndDate(propEndDate);
  }, [propFilterMode, propSelectedDate, propStartDate, propEndDate]);

  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    if (filterMode === 'all') return true;
    if (filterMode === 'date') return dateStr === selectedDate;
    if (filterMode === 'month') return dateStr.startsWith(selectedMonth);
    if (filterMode === 'range') return dateStr >= startDate && dateStr <= endDate;
    return true;
  };

  const getPeriodBounds = () => {
    if (filterMode === 'date') {
      return { start: selectedDate, end: selectedDate };
    }
    if (filterMode === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const start = `${selectedMonth}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      return { start, end };
    }
    if (filterMode === 'range') {
      return { start: startDate, end: endDate };
    }
    return { start: '', end: '' };
  };

  const baseInvoices = invoices !== undefined ? invoices : (storageService.getInvoices() || []);
  const activeInvoices = baseInvoices.filter((inv) => isDateInPeriod(inv.date));

  const baseExpenses = expenses !== undefined ? expenses : (storageService.getExpenses() || []);
  const activeExpenses = baseExpenses.filter((e) => isDateInPeriod(e.date));

  const baseAttendance = attendance !== undefined ? attendance : (storageService.getAttendance() || []);
  const activeAttendance = baseAttendance.filter((a) => isDateInPeriod(a.date));

  const baseBranchConsignments = branchConsignments !== undefined ? branchConsignments : (storageService.getBranchConsignments() || []);
  const activeBranchConsignments = baseBranchConsignments.filter((c) => isDateInPeriod(c.date));

  const baseWorkerTasks = workerTasks !== undefined ? workerTasks : (storageService.getWorkerTasks() || []);
  const activeWorkerTasks = baseWorkerTasks.filter((t) => isDateInPeriod(t.date));

  const allInvoices = activeInvoices;

  const isFriday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDay() === 5;
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

  // Helper to dynamically calculate Today's Purchase (Stock In) and Today's Sale (Stock Out) per item
  const getTodayItemStats = (itemCode: string, itemNameBn: string, itemNameEn: string) => {
    let todayIn = 0;
    let todayOut = 0;

    const todayInvoices = allInvoices.filter((inv) => inv.date === todayStr);

    todayInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        const codeMatch = it.code && itemCode && it.code.trim().toUpperCase() === itemCode.trim().toUpperCase();
        const nameMatch =
          (it.name && itemNameBn && it.name.trim().toLowerCase() === itemNameBn.trim().toLowerCase()) ||
          (it.name && itemNameEn && it.name.trim().toLowerCase() === itemNameEn.trim().toLowerCase());

        if (codeMatch || nameMatch) {
          if (inv.mode === 'purchase') {
            todayIn += Number(it.quantity) || 0;
          } else if (inv.mode === 'sales') {
            todayOut += Number(it.quantity) || 0;
          }
        }
      });
    });

    return { todayIn, todayOut };
  };

  const { todayTotalIn, todayTotalOut } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    const todayInvoices = allInvoices.filter((inv) => inv.date === todayStr);
    todayInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        if (inv.mode === 'purchase') inSum += Number(it.quantity) || 0;
        else if (inv.mode === 'sales') outSum += Number(it.quantity) || 0;
      });
    });
    return { todayTotalIn: inSum, todayTotalOut: outSum };
  }, [allInvoices, todayStr]);

  // Individual staff payroll selection state
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId || 'all');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handlePrint = () => {
    setIsPrinting(true);
    executePrint('statement-print-area', `${company.name} - ${getTitle()}`);
    setTimeout(() => setIsPrinting(false), 800);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    const pdfName = `statement-${type}-${selectedStaffId !== 'all' ? selectedStaffId : 'all'}-${todayStr}.pdf`;
    await exportElementToPdf('statement-print-area', pdfName);
    setIsExportingPdf(false);
  };

  const selectedStaffMember = staff.find((s) => s.id === selectedStaffId);
  const selectedPartyMember = parties.find((p) => p.id === selectedPartyId);

  const getTitle = () => {
    switch (type) {
      case 'stock':
        return t.stockStatement1Page;
      case 'party':
        if (selectedPartyMember) {
          return lang === 'bn'
            ? `পার্টি লেজার ও চালান বিবরণী (${selectedPartyMember.name})`
            : `Party Ledger Statement (${selectedPartyMember.name})`;
        }
        return t.partyStatement1Page;
      case 'payroll':
        if (selectedStaffMember) {
          return lang === 'bn'
            ? `স্টাফ পে-স্লিপ ও বেতন বিবরণী (${selectedStaffMember.name})`
            : `Staff Payslip & Payroll (${selectedStaffMember.name})`;
        }
        return t.payrollStatement1Page;
      case 'expense':
        return t.expenseStatement1Page;
      case 'financial':
        return t.financialAnalyticsStatement1Page;
      case 'worker_tracking':
        return lang === 'bn'
          ? 'প্রসেসিং কর্মীভিত্তিক ওয়ার্কার ট্র্যাকিং ও ড্যামেজ হিসাব বিবরণী'
          : 'Processing Worker Task & Damage Statement';
    }
  };

  const getWhatsAppSummaryText = () => {
    let summaryText = `*${company.name}*\n📄 *${getTitle()}* - ${todayStr}\n────────────────────────\n`;

    if (type === 'stock') {
      const totalQty = stock.reduce((s, it) => s + it.quantity, 0);
      const totalVal = stock.reduce(
        (s, it) => s + it.quantity * (it.purchaseRate || it.purchaseAvgRate || 0),
        0
      );
      summaryText += `📦 মোট পণ্য: ${stock.length} টি\n🔢 মোট স্টক পরিমাণ: ${totalQty}\n💰 মোট মজুদ স্টক মূল্য: ৳${totalVal.toLocaleString()}\n`;
    } else if (type === 'party') {
      if (selectedPartyMember) {
        const partyInvoices = allInvoices.filter(
          (inv) =>
            inv.partyName?.toLowerCase() === selectedPartyMember.name.toLowerCase() ||
            inv.partyId === selectedPartyMember.id
        );
        const totalSales = partyInvoices
          .filter((inv) => inv.mode === 'sales')
          .reduce((sum, inv) => sum + (Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0), 0);
        const totalPurchases = partyInvoices
          .filter((inv) => inv.mode === 'purchase')
          .reduce((sum, inv) => sum + (Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0), 0);
        const totalPaid = partyInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
        const totalDue = selectedPartyMember.currentDue;
        const totalAdv = selectedPartyMember.currentAdvance;

        summaryText += `👤 *পার্টি:* ${selectedPartyMember.name} (${selectedPartyMember.type})\n📞 *মোবাইল:* ${selectedPartyMember.phone || '-'}\n📍 *ঠিকানা:* ${selectedPartyMember.address || '-'}\n────────────────────────\n📝 মোট চালান: ${partyInvoices.length} টি\n🛒 ক্রয় (Purchases): ৳${totalPurchases.toLocaleString()}\n🛍️ বিক্রয় (Sales): ৳${totalSales.toLocaleString()}\n💵 মোট পরিশোধ: ৳${totalPaid.toLocaleString()}\n⚠️ বর্তমান পাওনা বাকি (Due): ৳${totalDue.toLocaleString()}\n`;
        if (totalAdv > 0) {
          summaryText += `🟢 অগ্রিম জমা (Advance): ৳${totalAdv.toLocaleString()}\n`;
        }
      } else {
        const totalDue = parties.reduce((s, p) => s + p.currentDue, 0);
        const totalAdv = parties.reduce((s, p) => s + p.currentAdvance, 0);
        summaryText += `👥 মোট পার্টি: ${parties.length} জন\n🔴 মোট পাওনা বকেয়া (Receivable Due): ৳${totalDue.toLocaleString()}\n🟢 মোট অগ্রিম জমা (Party Advance): ৳${totalAdv.toLocaleString()}\n`;
      }
    } else if (type === 'financial') {
      const monthLabel = formatMonthDisplay(selectedMonth);
      const periodInvoices = activeInvoices;
      const periodConsignments = activeBranchConsignments;
      const allChinaDirect = storageService.getChinaDirectPayments() || [];
      const periodChinaDirect = allChinaDirect.filter((p) => isDateInPeriod(p.date));
      const totalChinaDirect = periodChinaDirect.reduce((s, p) => s + (Number(p.amountBdt) || 0), 0);
      const totalChinaExport = periodConsignments.reduce((sum, c) => sum + (Number(c.totalBdtValue) || 0), 0);
      const domesticSales = periodInvoices.filter((inv) => inv.mode === 'sales' || !inv.mode).reduce((s, i) => s + (i.netInvoiceAmount || i.subtotal || 0), 0);
      const totalSales = domesticSales + totalChinaExport + totalChinaDirect;
      const totalPurchases = periodInvoices.filter((inv) => inv.mode === 'purchase').reduce((s, i) => s + (i.netInvoiceAmount || i.subtotal || 0), 0);
      const partyPaymentsPaid = periodInvoices.filter((inv) => inv.mode === 'purchase').reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
      const periodExpenses = activeExpenses.filter((e) => e.type !== 'in').reduce((s, e) => s + e.amount, 0);
      
      let totalPaidSal = 0;
      staff.forEach((stf) => {
        if (storageService.getStaffPaymentStatus(selectedMonth, stf.id) === 'Paid') {
          const isOffice = stf.category === 'office';
          const records = activeAttendance.filter((a) => a.staffId === stf.id);
          const daysPresent = records.filter((a) => a.status === 'present' || a.status === 'late').length;
          const leaveDays = records.filter((a) => a.status === 'full_day_leave' || a.status === 'half_day_leave' || a.status === 'leave' || a.status === 'holiday').length;
          const daysBase = isOffice ? 30 : 26;
          const absentDays = records.length === 0 ? 0 : Math.max(0, daysBase - (daysPresent + leaveDays));
          const totalOt = isOffice ? 0 : records.reduce((s, a) => s + (a.otHours || 0), 0);
          const otAmount = isOffice ? 0 : records.reduce((s, a) => s + (a.otAmount !== undefined ? a.otAmount : (a.otHours || 0) * 60), 0);
          const totalAdv = records.reduce((s, a) => s + (a.advanceDeduction || 0), 0);
          const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(stf.id, selectedMonth);
          const dailyRate = Math.round(Number(stf.baseSalary || 0) / daysBase);
          const absentDeduction = absentDays * dailyRate;
          totalPaidSal += Math.max(0, stf.baseSalary - absentDeduction + otAmount - totalAdv - damageDeduction);
        }
      });

      const totalCostBase = totalPurchases + periodExpenses + totalPaidSal;
      const netProf = totalSales - totalCostBase;
      const roiPct = totalCostBase > 0 ? (netProf / totalCostBase) * 100 : 0;

      summaryText += `📅 *বেতনের/হিসাবের মাস:* ${monthLabel}
📈 *মোট বিক্রয় ও রপ্তানি আয় (Turnover):* ৳${totalSales.toLocaleString()}
   • লোকাল বিক্রয়: ৳${domesticSales.toLocaleString()}
   • চীন শাখা রপ্তানি: ৳${totalChinaExport.toLocaleString()}
   • চীন সরাসরি BDT: ৳${totalChinaDirect.toLocaleString()}
📉 *মোট ক্রয় খরচ (Purchases):* ৳${totalPurchases.toLocaleString()} (পরিশোধ: ৳${partyPaymentsPaid.toLocaleString()})
💸 *অফিস ও পরিচালন খরচ:* ৳${periodExpenses.toLocaleString()}
👔 *পরিশোধিত স্টাফ বেতন:* ৳${totalPaidSal.toLocaleString()}
💸 *মোট সার্বিক বিনিয়োগ (Total Outflow):* ৳${totalCostBase.toLocaleString()}
────────────────────────
💰 *নিট লাভ / ক্ষতি (Net P&L):* ৳${netProf.toLocaleString()} [${netProf >= 0 ? '🟢 PROFIT' : '🔴 LOSS'}]
📊 *রিটার্ন অন ইনভেস্টমেন্ট (ROI):* ${roiPct.toFixed(1)}%
`;
    } else if (type === 'payroll') {
      const monthLabel = formatMonthDisplay(selectedMonth);
      summaryText += `📅 *বেতনের মাস:* ${monthLabel}\n`;

      if (selectedStaffMember) {
        const isOffice = selectedStaffMember.category === 'office';
        const records = activeAttendance.filter((a) => a.staffId === selectedStaffMember.id);
        const totalOt = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otHours || 0), 0);
        const otMoney = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otAmount !== undefined ? a.otAmount : (a.otHours || 0) * 60), 0);
        const totalAdv = records.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
        const totalLateMinutes = isOffice ? 0 : records.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
        const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(selectedStaffMember.id, selectedMonth);
        const presentDays = records.filter((a) => a.status === 'present' || a.status === 'late').length;
        const leaveDays = records.filter((a) => a.status === 'full_day_leave' || a.status === 'half_day_leave' || a.status === 'leave' || a.status === 'holiday').length;
        const daysBase = isOffice ? 30 : 26;
        const absentDays = records.length === 0 ? 0 : Math.max(0, daysBase - (presentDays + leaveDays));
        const dailyRate = Math.round(Number(selectedStaffMember.baseSalary || 0) / daysBase);
        const lateDeduction = Math.round((totalLateMinutes / 60) * (dailyRate / 10));
        const absentDeduction = absentDays * dailyRate;
        const net = Math.max(0, selectedStaffMember.baseSalary - absentDeduction + otMoney - totalAdv - damageDeduction - lateDeduction);
        const paymentStatus = storageService.getStaffPaymentStatus(selectedMonth, selectedStaffMember.id);

        summaryText += `👤 স্টাফ: ${selectedStaffMember.name} (${selectedStaffMember.designation})\n📞 ফোন: ${selectedStaffMember.phone}\n📂 ক্যাটাগরি: ${isOffice ? 'Office (৩০ দিন বেসিস, নো ওটি/লেট)' : 'Processing (২৬ দিন বেসিস, শুক্রবার ওটি)'}\n💵 মূল বেতন: ৳${selectedStaffMember.baseSalary.toLocaleString()} (দৈনিক: ৳${dailyRate}/${isOffice ? '৩০' : '২৬'} দিন)\n📅 মোট উপস্থিত: ${presentDays} দিন\n⏱️ ওভারটাইম: ${isOffice ? 'প্রযোজ্য নয় (০)' : `${totalOt} ঘণ্টা (৳${otMoney.toLocaleString()})`}\n🔻 অগ্রিম কর্তন: ৳${totalAdv.toLocaleString()}${lateDeduction > 0 ? `\n⚠️ লেট কর্তন: ৳${lateDeduction.toLocaleString()} (${totalLateMinutes} মিনিট)` : ''}\n💰 প্রদেয় নেট বেতন: ৳${net.toLocaleString()}\n📌 পেমেন্ট স্ট্যাটাস: ${paymentStatus === 'Paid' ? '✅ পরিশোধিত (Paid)' : '⏳ বকেয়া (Unpaid)'}\n`;
      } else {
        const staffComputed = staff.map((st) => {
          const isOffice = st.category === 'office';
          const records = activeAttendance.filter((a) => a.staffId === st.id);
          const totalOt = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otHours || 0), 0);
          const otMoney = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otAmount !== undefined ? a.otAmount : (a.otHours || 0) * 60), 0);
          const totalAdv = records.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
          const totalLateMinutes = isOffice ? 0 : records.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
          const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(st.id, selectedMonth);
          const presentDays = records.filter((a) => a.status === 'present' || a.status === 'late').length;
          const leaveDays = records.filter((a) => a.status === 'full_day_leave' || a.status === 'half_day_leave' || a.status === 'leave' || a.status === 'holiday').length;
          const daysBase = isOffice ? 30 : 26;
          const absentDays = records.length === 0 ? 0 : Math.max(0, daysBase - (presentDays + leaveDays));
          const dailyRate = Math.round(Number(st.baseSalary || 0) / daysBase);
          const lateDeduction = Math.round((totalLateMinutes / 60) * (dailyRate / 10));
          const absentDeduction = absentDays * dailyRate;
          const net = Math.max(0, st.baseSalary - absentDeduction + otMoney - totalAdv - damageDeduction - lateDeduction);
          const paymentStatus = storageService.getStaffPaymentStatus(selectedMonth, st.id);
          return { ...st, net, paymentStatus };
        });

        const totalSalary = staffComputed.reduce((s, st) => s + st.net, 0);
        const totalPaid = staffComputed.filter((s) => s.paymentStatus === 'Paid').reduce((s, st) => s + st.net, 0);
        const totalUnpaid = staffComputed.filter((s) => s.paymentStatus === 'Unpaid').reduce((s, st) => s + st.net, 0);

        summaryText += `👔 মোট স্টাফ: ${staff.length} জন (অফিস: ৩০ দিন, প্রসেসিং: ২৬ দিন)\n💵 সর্বমোট নিট পে-রোল: ৳${totalSalary.toLocaleString()}\n✅ মোট পরিশোধিত (Paid): ৳${totalPaid.toLocaleString()}\n⏳ মোট অপরিশোধিত (Unpaid): ৳${totalUnpaid.toLocaleString()}\n\n*স্টাফ তালিকা ও স্ট্যাটাস:*\n`;
        staffComputed.forEach((st, idx) => {
          summaryText += `${idx + 1}. ${st.name} (${st.designation}): ৳${st.net.toLocaleString()} [${st.paymentStatus === 'Paid' ? '✅ Paid' : '⏳ Unpaid'}]\n`;
        });
      }
    } else if (type === 'expense') {
      const totalExp = activeExpenses.reduce((s, e) => s + e.amount, 0);
      summaryText += `💸 মোট অফিস খরচ: ৳${totalExp.toLocaleString()}\n📝 মোট এন্ট্রি: ${activeExpenses.length} টি\n`;
    } else if (type === 'worker_tracking') {
      const workerTasks = activeWorkerTasks;
      const totalGiven = workerTasks.reduce((s, t) => s + t.givenPcs, 0);
      const totalCompleted = workerTasks.reduce((s, t) => s + t.completedPcs, 0);
      const totalDamaged = workerTasks.reduce((s, t) => s + t.damagedPcs, 0);
      const totalRemaining = Math.max(0, totalGiven - totalCompleted - totalDamaged);
      const rate = totalGiven > 0 ? ((totalDamaged / totalGiven) * 100).toFixed(1) : '0';

      summaryText += `👷‍♂️ মোট প্রসেসিং কর্মী কাজ: ${workerTasks.length} টি\n📦 মোট প্রদত্ত মাল (Given): ${totalGiven.toLocaleString()} PCS\n✅ মোট সম্পন্ন কাজ (Delivered): ${totalCompleted.toLocaleString()} PCS\n⏳ মোট বকেয়া কাজ (Remaining): ${totalRemaining.toLocaleString()} PCS\n⚠️ মোট নষ্ট / ড্যামেজ: ${totalDamaged.toLocaleString()} PCS (${rate}%)\n`;
    }
    summaryText += `────────────────────────\n_আরএসআর ভাই ভাই এন্টারপ্রাইজ_`;
    return summaryText;
  };

  const displayedStaff = selectedStaffId === 'all'
    ? staff
    : staff.filter((s) => s.id === selectedStaffId);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs no-print">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
          </button>

          {/* Month & Staff Selectors for All Statements */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {lang === 'bn' ? 'হিসাবের মাস:' : 'Month:'}
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="bg-transparent text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
            </div>

            {type === 'payroll' && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'bn' ? 'স্টাফ:' : 'Staff:'}</span>
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-emerald-500 cursor-pointer"
                >
                  <option value="all">
                    {lang === 'bn' ? '📋 সকল স্টাফের তালিকা (একত্রে)' : '📋 All Staff Members (Global)'}
                  </option>
                  {staff.map((st) => (
                    <option key={st.id} value={st.id}>
                      👤 {st.name} - {st.designation} ({st.category === 'office' ? 'Office' : 'Processing'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {type === 'party' && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'bn' ? 'পার্টি নির্বাচন:' : 'Party:'}</span>
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-emerald-500 cursor-pointer"
                >
                  <option value="all">
                    {lang === 'bn' ? '👥 সকল পার্টির তালিকা (একত্রে)' : '👥 All Parties (Global)'}
                  </option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      👤 {p.name} ({p.type}) - বাকি: ৳{p.currentDue.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareDropdown
            getText={getWhatsAppSummaryText}
            lang={lang}
            targetElementId="statement-print-area"
            fileName={`statement-${type}-${type === 'party' ? (selectedPartyId !== 'all' ? selectedPartyId : 'all') : (selectedStaffId !== 'all' ? selectedStaffId : 'all')}-${todayStr}.png`}
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
            <span>
              {isPrinting
                ? (lang === 'bn' ? 'প্রিন্ট ডায়ালগ খুলছে...' : 'Opening Print...')
                : selectedPartyMember
                ? (lang === 'bn' ? 'পার্টি বিবরণী প্রিন্ট (1-Page A4)' : 'Print Party Ledger (1-Page A4)')
                : selectedStaffMember
                ? (lang === 'bn' ? 'পে-স্লিপ প্রিন্ট করুন (1-Page A4)' : 'Print Payslip (1-Page A4)')
                : `${t.printNow} (1-Page A4 Sheet)`}
            </span>
          </button>
        </div>
      </div>

      {/* 1-Page Printable Statement Container with Company Logo */}
      <div
        id="statement-print-area"
        className="one-page-sheet max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0"
      >
        {/* Company Header with Logo */}
        <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start gap-4">
          <div className="flex items-start gap-3">
            <CompanyLogo customLogoUrl={company.logoUrl} className="w-12 h-12 shrink-0" />
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {company.name}
              </h1>
              <p className="text-[11px] font-medium text-slate-600">
                {lang === 'bn' ? company.businessTypeBn : company.businessTypeEn}
              </p>
              <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {company.address}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  {company.phones.join(', ')}
                </span>
                {company.email && (
                  <span className="flex items-center gap-1 font-mono">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    {company.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right space-y-1 shrink-0">
            <div className="inline-block px-2.5 py-1 bg-slate-900 text-white font-bold text-xs rounded-md uppercase tracking-wider">
              {getTitle()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {lang === 'bn' ? 'তারিখ: ' : 'Date: '}
              <strong className="text-slate-800">{formatDate(todayStr, lang)}</strong>
            </div>
          </div>
        </div>

        {/* 1. STOCK STATEMENT SHEET */}
        {type === 'stock' && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-100 rounded border border-slate-200">
                <span className="block text-[10px] uppercase text-slate-500 font-bold">{t.codeItem}</span>
                <span className="font-mono font-bold">
                  {formatNumber(stock.filter((s) => s.category === 'code').length, lang)} {lang === 'bn' ? 'আইটেম' : 'Items'}
                </span>
              </div>
              <div className="p-2 bg-slate-100 rounded border border-slate-200">
                <span className="block text-[10px] uppercase text-slate-500 font-bold">{t.androidItem}</span>
                <span className="font-mono font-bold">
                  {formatNumber(stock.filter((s) => s.category === 'android').length, lang)} {lang === 'bn' ? 'আইটেম' : 'Items'}
                </span>
              </div>
              <div className="p-2 bg-slate-100 rounded border border-slate-200">
                <span className="block text-[10px] uppercase text-slate-500 font-bold">{t.kgItem}</span>
                <span className="font-mono font-bold">
                  {formatNumber(stock.filter((s) => s.category === 'kg').length, lang)} {lang === 'bn' ? 'আইটেম' : 'Items'}
                </span>
              </div>
              <div className="p-2 bg-slate-100 rounded border border-slate-200">
                <span className="block text-[10px] uppercase text-slate-500 font-bold">{t.pcsBlankItem}</span>
                <span className="font-mono font-bold">
                  {formatNumber(stock.filter((s) => s.category === 'pcs_blank').length, lang)} {lang === 'bn' ? 'আইটেম' : 'Items'}
                </span>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                <span className="block text-[10px] uppercase text-emerald-800 font-bold">{t.todayStockInTotal}</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatNumber(todayTotalIn, lang)}
                </span>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <span className="block text-[10px] uppercase text-blue-800 font-bold">{t.todayStockOutTotal}</span>
                <span className="font-mono font-bold text-blue-700">
                  -{formatNumber(todayTotalOut, lang)}
                </span>
              </div>
            </div>

            <div className="sheet-freeze-wrapper">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] font-bold border-b border-slate-300">
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center w-7 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.sl}</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.itemCode}</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.itemDescription}</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 w-16 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">{t.category}</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center w-20 bg-emerald-100 text-emerald-900 font-bold sticky top-0">
                      {t.todayPurchase}
                    </th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center w-20 bg-blue-100 text-blue-900 font-bold sticky top-0">
                      {t.todaySale}
                    </th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center w-20 font-bold sticky top-0 bg-slate-100 dark:bg-slate-800">{t.inStock}</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-right w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.purchaseRate}</th>
                    <th className="py-1 px-1.5 text-right w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'মোট মজুদ মূল্য' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((it, idx) => {
                    const effectiveRate = it.purchaseRate || it.purchaseAvgRate || 0;
                    const { todayIn, todayOut } = getTodayItemStats(it.code, it.nameBn, it.nameEn);
                    return (
                      <tr key={it.id} className="border-b border-slate-200">
                        <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono text-[11px]">
                          {formatNumber(idx + 1, lang)}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 font-mono font-bold text-[11px]">
                          {it.code}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 font-medium">
                          {lang === 'bn' ? it.nameBn : it.nameEn}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-center capitalize text-[10px]">
                          {it.category}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {todayIn > 0 ? `+${formatNumber(todayIn, lang)} ${it.unit}` : '-'}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono font-bold text-blue-800 bg-blue-50/40">
                          {todayOut > 0 ? `-${formatNumber(todayOut, lang)} ${it.unit}` : '-'}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono font-bold">
                          {formatNumber(it.quantity, lang)} {it.unit}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono">
                          {formatCurrency(effectiveRate, lang)}
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold">
                          {formatCurrency(it.quantity * effectiveRate, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-800">
                    <td colSpan={4} className="py-1.5 px-2 text-right uppercase border-r border-slate-300">
                      {lang === 'bn' ? 'সর্বমোট স্টক ও ক্রয়-বিক্রয়:' : 'Total Stock & Today In/Out:'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono text-emerald-900 border-r border-slate-300">
                      {todayTotalIn > 0 ? `+${formatNumber(todayTotalIn, lang)}` : '-'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono text-blue-900 border-r border-slate-300">
                      {todayTotalOut > 0 ? `-${formatNumber(todayTotalOut, lang)}` : '-'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono border-r border-slate-300">
                      {formatNumber(stock.reduce((s, it) => s + it.quantity, 0), lang)}
                    </td>
                    <td className="border-r border-slate-300"></td>
                    <td className="py-1.5 px-1.5 text-right font-mono text-emerald-800">
                      {formatCurrency(
                        stock.reduce(
                          (s, it) => s + it.quantity * (it.purchaseRate || it.purchaseAvgRate || 0),
                          0
                        ),
                        lang
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* 2. PARTY STATEMENT SHEET / INDIVIDUAL PARTY LEDGER (User Requirement) */}
        {type === 'party' && (
          <div className="mt-4 space-y-4">
            {selectedPartyMember ? (
              (() => {
                const partyInvoices = allInvoices.filter(
                  (inv) =>
                    inv.partyName?.toLowerCase() === selectedPartyMember.name.toLowerCase() ||
                    inv.partyId === selectedPartyMember.id
                );
                const totalSales = partyInvoices
                  .filter((inv) => inv.mode === 'sales')
                  .reduce((sum, inv) => sum + (Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0), 0);
                const totalPurchases = partyInvoices
                  .filter((inv) => inv.mode === 'purchase')
                  .reduce((sum, inv) => sum + (Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0), 0);
                const totalInvoiced = partyInvoices.reduce(
                  (sum, inv) => sum + (Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0),
                  0
                );
                const totalPaid = partyInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
                const currentDue = selectedPartyMember.currentDue;
                const currentAdvance = selectedPartyMember.currentAdvance;

                return (
                  <div className="space-y-4">
                    {/* Party Profile Header Box */}
                    <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-700">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black uppercase tracking-wider text-emerald-400 text-sm sm:text-base">
                            {selectedPartyMember.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 uppercase">
                            {selectedPartyMember.type === 'supplier'
                              ? 'সাপ্লায়ার (Supplier)'
                              : selectedPartyMember.type === 'buyer'
                              ? 'ক্রেতা (Buyer)'
                              : 'উভয় (Both)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          📞 মোবা: <strong className="text-white font-mono">{selectedPartyMember.phone || '-'}</strong>
                          {selectedPartyMember.address ? ` • 📍 ঠিকানা: ${selectedPartyMember.address}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">বর্তমান পাওনা বাকি</span>
                          <span className="text-lg font-black font-mono text-rose-400">
                            {formatCurrency(currentDue, lang)}
                          </span>
                        </div>
                        {currentAdvance > 0 && (
                          <div className="text-right pl-3 border-l border-white/20">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">অগ্রিম জমা</span>
                            <span className="text-lg font-black font-mono text-cyan-300">
                              {formatCurrency(currentAdvance, lang)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary Ribbon */}
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block font-sans">মোট ক্রয় (Purchase)</span>
                        <strong className="text-emerald-700">{formatCurrency(totalPurchases, lang)}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block font-sans">মোট বিক্রয় (Sales)</span>
                        <strong className="text-blue-700">{formatCurrency(totalSales, lang)}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block font-sans">মোট পরিশোধিত (Paid)</span>
                        <strong className="text-purple-700">{formatCurrency(totalPaid, lang)}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800">
                        <span className="text-[9px] uppercase font-bold text-rose-600 block font-sans">বর্তমান নিট বাকি (Due)</span>
                        <strong className="text-rose-700">{formatCurrency(currentDue, lang)}</strong>
                      </div>
                    </div>

                    {/* Itemized Invoices / Transaction Table */}
                    <div className="sheet-freeze-wrapper">
                      <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                        <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] font-bold border-b border-slate-300">
                            <th className="py-1 px-2 border-r border-slate-300 text-center w-8 sticky top-0 bg-slate-100 dark:bg-slate-800">#</th>
                            <th className="py-1 px-2 border-r border-slate-300 w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">তারিখ</th>
                            <th className="py-1 px-2 border-r border-slate-300 w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">চালান নং</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-center w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">ধরন</th>
                            <th className="py-1 px-2 border-r border-slate-300 sticky top-0 bg-slate-100 dark:bg-slate-800">মালের বিবরণ ও পরিমাণ</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-right w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">মোট বিল (৳)</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-right w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">পরিশোধ (৳)</th>
                            <th className="py-1 px-2 text-right w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">অবশিষ্ট বাকি</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partyInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-400">
                                নির্বাচিত সময়ে এই পার্টির কোনো লেনদেন বা চালান পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            partyInvoices.map((inv, idx) => {
                              const isPur = inv.mode === 'purchase';
                              const isPaymentOnly = (Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0) === 0 && (Number(inv.paidAmount) || 0) > 0;
                              const billAmt = Number(inv.netInvoiceAmount) || Number(inv.subtotal) || 0;
                              const paidAmt = Number(inv.paidAmount) || 0;
                              const dueAmt = Number(inv.remainingDue) || 0;

                              return (
                                <tr key={inv.id || idx} className={`border-b border-slate-200 ${isPaymentOnly ? 'bg-purple-50/40' : ''}`}>
                                  <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                                  <td className="py-1 px-2 border-r border-slate-200 font-mono text-[11px]">{inv.date}</td>
                                  <td className="py-1 px-2 border-r border-slate-200 font-mono font-bold">{inv.invoiceNo}</td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-center text-[10px] font-bold uppercase">
                                    {isPaymentOnly ? (
                                      <span className="text-purple-700 font-black">
                                        {inv.mode === 'sales' ? (lang === 'bn' ? 'টাকা গ্রহণ' : 'Received') : (lang === 'bn' ? 'টাকা পরিশোধ' : 'Payment')}
                                      </span>
                                    ) : (
                                      <span className={isPur ? 'text-emerald-700' : 'text-blue-700'}>
                                        {isPur ? (lang === 'bn' ? 'ক্রয়' : 'Pur') : (lang === 'bn' ? 'বিক্রয়' : 'Sale')}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-[11px]">
                                    {isPaymentOnly
                                      ? (inv.notes || (inv.mode === 'sales' ? (lang === 'bn' ? 'নগদ/ব্যাংক টাকা গ্রহণ (পেমেন্ট)' : 'Payment Received') : (lang === 'bn' ? 'পার্টি বিল পরিশোধ (টাকা প্রদান)' : 'Payment Given')))
                                      : (inv.items?.map((it) => `${it.name} (${it.quantity}${it.unit || ''})`).join(', ') || '-')}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold">
                                    {isPaymentOnly ? '-' : formatCurrency(billAmt, lang)}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                                    {formatCurrency(paidAmt, lang)}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono font-bold text-rose-700">
                                    {dueAmt > 0 ? formatCurrency(dueAmt, lang) : (inv.remainingDue === 0 ? (lang === 'bn' ? '০ (পরিশোধিত)' : '0') : '-')}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-800">
                            <td colSpan={5} className="py-1.5 px-2 text-right uppercase border-r border-slate-300">
                              মোট চালান যোগফল:
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono border-r border-slate-300">
                              {formatCurrency(totalInvoiced, lang)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-emerald-800 border-r border-slate-300">
                              {formatCurrency(totalPaid, lang)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-rose-800">
                              {formatCurrency(currentDue, lang)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end pt-12 text-xs">
                      <div className="border-t border-slate-400 pt-1 text-center w-40 font-bold">
                        গ্রাহক / পার্টির স্বাক্ষর
                      </div>
                      <div className="border-t border-slate-400 pt-1 text-center w-48 font-bold">
                        কর্তৃপক্ষের স্বাক্ষর ও সিলমোহর
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Global All Parties Summary Table */
              <div className="sheet-freeze-wrapper">
                <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                  <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] font-bold border-b border-slate-300">
                      <th className="py-1 px-2 border-r border-slate-300 text-center w-8 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.sl}</th>
                      <th className="py-1 px-2 border-r border-slate-300 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.partyName}</th>
                      <th className="py-1 px-2 border-r border-slate-300 w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.partyPhone}</th>
                      <th className="py-1 px-2 border-r border-slate-300 w-20 text-center sticky top-0 bg-slate-100 dark:bg-slate-800">{t.partyType}</th>
                      <th className="py-1 px-2 border-r border-slate-300 text-right w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.totalDueReceivable}</th>
                      <th className="py-1 px-2 border-r border-slate-300 text-right w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.totalAdvancePayable}</th>
                      <th className="py-1 px-2 text-center w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parties.map((p, idx) => (
                      <tr key={p.id} className="border-b border-slate-200">
                        <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                          {formatNumber(idx + 1, lang)}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 font-bold">
                          {p.name}
                          {p.address && <span className="block text-[10px] text-slate-500 font-normal">{p.address}</span>}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 font-mono text-[11px]">
                          {p.phone || '-'}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 text-center uppercase text-[10px]">
                          {p.type}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold text-rose-700">
                          {p.currentDue > 0 ? formatCurrency(p.currentDue, lang) : '-'}
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold text-blue-700">
                          {p.currentAdvance > 0 ? formatCurrency(p.currentAdvance, lang) : '-'}
                        </td>
                        <td className="py-1 px-2 text-center text-[10px] font-semibold">
                          {p.currentDue > 0 ? 'বাকি' : p.currentAdvance > 0 ? 'জমা' : 'ক্লিয়ার'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-800">
                      <td colSpan={4} className="py-1.5 px-2 text-right uppercase border-r border-slate-300">
                        {lang === 'bn' ? 'মোট হিসাব সমষ্টী:' : 'Total Summary:'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-rose-800 border-r border-slate-300">
                        {formatCurrency(parties.reduce((s, p) => s + p.currentDue, 0), lang)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-blue-800 border-r border-slate-300">
                        {formatCurrency(parties.reduce((s, p) => s + p.currentAdvance, 0), lang)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. PAYROLL STATEMENT SHEET / INDIVIDUAL STAFF PAYSLIP */}
        {type === 'payroll' && (
          <div className="mt-4 space-y-4">
            {/* If Single Staff Selected: Dedicated Beautiful 1-Page Payslip */}
            {selectedStaffMember ? (
              (() => {
                const stf = selectedStaffMember;
                const records = activeAttendance.filter(
                  (a) => a.staffId === stf.id
                );
                const isOffice = stf.category === 'office';
                const totalOtHours = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otHours || 0), 0);
                const totalOtMoney = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otAmount !== undefined ? a.otAmount : (a.otHours || 0) * 60), 0);
                const totalAdv = records.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
                const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(stf.id, selectedMonth);
                const presentDays = records.filter((a) => a.status === 'present' || a.status === 'late').length;
                const leaveDays = records.filter((a) => a.status === 'full_day_leave' || a.status === 'half_day_leave' || a.status === 'leave' || a.status === 'holiday').length;
                const lateDays = isOffice ? 0 : records.filter((a) => a.status === 'late').length;
                const totalLateMinutes = isOffice ? 0 : records.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
                const absentDays = records.length === 0 ? 0 : Math.max(0, (isOffice ? 30 : 26) - (presentDays + leaveDays));
                const daysBase = isOffice ? 30 : 26;
                const dailyRate = Math.round(Number(stf.baseSalary || 0) / daysBase);
                const lateDeduction = Math.round((totalLateMinutes / 60) * (dailyRate / 10));
                const absentDeduction = absentDays * dailyRate;
                const netPayable = Math.max(0, stf.baseSalary - absentDeduction + totalOtMoney - totalAdv - damageDeduction - lateDeduction);
                const paymentStatus = storageService.getStaffPaymentStatus(selectedMonth, stf.id);

                return (
                  <div className="space-y-4">
                    {/* Header Banner */}
                    <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold uppercase tracking-wider text-emerald-400">
                          {lang === 'bn' ? 'ব্যক্তিগত স্টাফ পে-স্লিপ ও বেতন রসিদ' : 'Individual Staff Payslip & Salary Voucher'}
                        </span>
                        <p className="text-[11px] text-slate-300">
                          {lang === 'bn' ? `বেতনের মাস: ${formatMonthDisplay(selectedMonth)} (${isOffice ? '৩০ দিন বেসিস, নো ওটি/লেট' : '২৬ দিন বেসিস, শুক্রবার ওটি'})` : `Salary Period: ${formatMonthDisplay(selectedMonth)} (${isOffice ? '30-Day Basis' : '26-Day Basis'})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-[11px] px-2.5 py-0.5 rounded-full border ${
                            paymentStatus === 'Paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {paymentStatus === 'Paid'
                            ? lang === 'bn' ? '✓ পরিশোধিত (PAID)' : '✓ PAID'
                            : lang === 'bn' ? '⏳ বকেয়া (UNPAID)' : '⏳ UNPAID'}
                        </span>
                        <span className="font-mono text-xs bg-emerald-700/60 px-2 py-0.5 rounded border border-emerald-500/40">
                          ID: {stf.loginCode || stf.id}
                        </span>
                      </div>
                    </div>

                    {/* Staff Profile Card */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'স্টাফের নাম:' : 'Staff Name:'}</span>
                        <strong className="text-slate-900 text-sm">{stf.name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'পদবী ও শাখা:' : 'Designation & Dept:'}</span>
                        <strong className="text-slate-800">{stf.designation} ({stf.category === 'office' ? 'Office' : 'Processing'})</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'মোবাইল নম্বর:' : 'Phone:'}</span>
                        <strong className="text-slate-800 font-mono">{stf.phone}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? `দৈনিক রেট (${isOffice ? '৩০ দিন' : '২৬ দিন'}):` : `Daily Rate (${isOffice ? '30d' : '26d'}):`}</span>
                        <strong className="text-slate-800 font-mono">৳{dailyRate.toLocaleString()} / দিন</strong>
                      </div>
                    </div>

                    {/* Summary Metric Boxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <span className="text-[10px] text-slate-500 block">{t.baseSalary}</span>
                        <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                          {formatCurrency(stf.baseSalary, lang)}
                        </div>
                        {absentDays > 0 ? (
                          <span className="text-[9px] text-rose-600 block">
                            {lang === 'bn' ? `অনুপস্থিত ${absentDays} দিন (-৳${absentDeduction.toLocaleString()})` : `Absent ${absentDays}d (-৳${absentDeduction})`}
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-600 block">
                            {lang === 'bn' ? `পূর্ণ বেতন (${isOffice ? '৩০ দিন' : '২৬ দিন'} বেসিস)` : `Full (${isOffice ? '30' : '26'} Days Basis)`}
                          </span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/50">
                        <span className="text-[10px] text-teal-800 block">
                          {lang === 'bn' ? (isOffice ? 'ওভারটাইম (প্রযোজ্য নয়)' : 'ওভারটাইম আয় (৬০৳/ঘণ্টা)') : (isOffice ? 'OT (N/A)' : 'OT Earnings (60৳/hr)')}
                        </span>
                        <div className="text-base font-black font-mono text-teal-700 mt-0.5">
                          {isOffice ? '-' : totalOtMoney > 0 ? `+${formatCurrency(totalOtMoney, lang)}` : '-'}
                        </div>
                        <span className="text-[9px] text-teal-600 block">
                          {isOffice
                            ? (lang === 'bn' ? 'অফিস স্টাফে ওটি নেই' : 'No OT for office staff')
                            : totalOtHours > 0
                            ? `${formatNumber(totalOtHours, lang)} ${lang === 'bn' ? 'ঘণ্টা ওটি' : 'hrs total OT'}`
                            : (lang === 'bn' ? 'কোনো ওটি নেই' : 'No OT recorded')}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50">
                        <span className="text-[10px] text-rose-800 block">
                          {lang === 'bn' ? 'অগ্রিম ও লেট কর্তন' : 'Advance & Late Deductions'}
                        </span>
                        <div className="text-base font-black font-mono text-rose-700 mt-0.5">
                          -{formatCurrency(totalAdv + lateDeduction, lang)}
                        </div>
                        <span className="text-[9px] text-rose-600 block">
                          {lateDeduction > 0
                            ? (lang === 'bn' ? `অগ্রিম: ৳${totalAdv}, লেট: ৳${lateDeduction}` : `Adv: ৳${totalAdv}, Late: ৳${lateDeduction}`)
                            : totalAdv > 0
                            ? (lang === 'bn' ? 'অগ্রিম কর্তন' : 'Advance deducted')
                            : (lang === 'bn' ? 'কোনো কর্তন নেই' : 'No dues')}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50">
                        <span className="text-[10px] text-emerald-900 font-bold block">
                          {lang === 'bn' ? 'প্রদেয় নিট বেতন (Net Payable)' : 'Net Payable Salary'}
                        </span>
                        <div className="text-lg font-black font-mono text-emerald-800 mt-0.5">
                          {formatCurrency(netPayable, lang)}
                        </div>
                        <span className="text-[9px] text-emerald-700 font-semibold block">
                          {paymentStatus === 'Paid'
                            ? lang === 'bn' ? '✅ পরিশোধ সম্পন্ন' : '✅ Paid in Full'
                            : lang === 'bn' ? '⏳ পরিশোধযোগ্য বকেয়া' : '⏳ Pending Payment'}
                        </span>
                      </div>
                    </div>

                    {/* Attendance Logs Table for this specific staff */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-slate-800">
                          {lang === 'bn' ? `${formatMonthDisplay(selectedMonth)} বিস্তারিত হাজিরার তালিকা:` : `${formatMonthDisplay(selectedMonth)} Detailed Attendance Log:`}
                        </strong>
                        <span className="text-[11px] text-slate-600 font-medium">
                          {lang === 'bn'
                            ? `উপস্থিত: ${presentDays} দিন | ছুটি (পেইড): ${leaveDays} দিন | অনুপস্থিত: ${absentDays} দিন`
                            : `Present: ${presentDays}d | Leave (Paid): ${leaveDays}d | Absent: ${absentDays}d`}
                        </span>
                      </div>

                      <div className="sheet-freeze-wrapper">
                        <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] font-bold border-b border-slate-300">
                              <th className="py-1 px-2 border-r border-slate-300 text-center w-8 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.sl}</th>
                              <th className="py-1 px-2 border-r border-slate-300 w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.invoiceDate}</th>
                              <th className="py-1 px-2 border-r border-slate-300 text-center w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.attendanceStatus}</th>
                              <th className="py-1 px-2 border-r border-slate-300 text-center w-16 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.inTime}</th>
                              <th className="py-1 px-2 border-r border-slate-300 text-center w-16 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.outTime}</th>
                              <th className="py-1 px-2 border-r border-slate-300 text-center w-16 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.lateMinutes}</th>
                              <th className="py-1 px-2 border-r border-slate-300 text-center w-14 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.otHours}</th>
                              <th className="py-1 px-2 border-r border-slate-300 text-right w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'ওটি টাকা (৬০x)' : 'OT Amount'}</th>
                              <th className="py-1 px-2 border-r border-slate-300 text-right w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'অগ্রিম' : 'Advance'}</th>
                              <th className="py-1 px-2 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'মন্তব্য' : 'Notes'}</th>
                            </tr>
                          </thead>
                        <tbody>
                          {records.length > 0 ? (
                            records.map((rec, rIdx) => {
                              const isLeave =
                                rec.status === 'full_day_leave' ||
                                rec.status === 'half_day_leave' ||
                                rec.status === 'leave' ||
                                rec.status === 'holiday';

                              return (
                                <tr key={rec.id} className="border-b border-slate-200">
                                  <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                                    {formatNumber(rIdx + 1, lang)}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 font-mono text-[11px]">
                                    {formatDate(rec.date, lang)}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-center font-semibold text-[10px]">
                                    {rec.status === 'present'
                                      ? (lang === 'bn' ? 'উপস্থিত' : 'Present')
                                      : rec.status === 'full_day_leave'
                                      ? (lang === 'bn' ? 'ফুল ডে ছুটি (পেইড)' : 'Full Day Leave (Paid)')
                                      : rec.status === 'half_day_leave'
                                      ? (lang === 'bn' ? 'হাফ ডে ছুটি (পেইড)' : 'Half Day Leave (Paid)')
                                      : rec.status === 'leave'
                                      ? (lang === 'bn' ? 'ছুটি (পেইড)' : 'Leave (Paid)')
                                      : rec.status === 'holiday'
                                      ? (lang === 'bn' ? 'ছুটি (সাপ্তাহিক)' : 'Weekly Holiday')
                                      : rec.status === 'absent'
                                      ? (lang === 'bn' ? 'অনুপস্থিত' : 'Absent')
                                      : rec.status === 'late'
                                      ? (lang === 'bn' ? 'বিলম্ব (লেট)' : 'Late')
                                      : rec.status}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                                    {isLeave || rec.status === 'absent' ? '-' : rec.inTime || '-'}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                                    {isLeave || rec.status === 'absent' ? '-' : rec.outTime || '-'}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-center font-mono text-[10px]">
                                    {isOffice ? '-' : rec.lateMinutes > 0 ? `${rec.lateMinutes}m` : '0'}
                                  </td>
                                   <td className="py-1 px-2 border-r border-slate-200 text-center font-mono font-bold text-teal-700">
                                    {rec.otHours > 0 ? `${rec.otHours}h` : '-'}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-800">
                                    {rec.otAmount > 0 ? formatCurrency(rec.otAmount, lang) : '-'}
                                  </td>
                                  <td className="py-1 px-2 border-r border-slate-200 text-right font-mono text-rose-700">
                                    {rec.advanceDeduction > 0 ? `-${formatCurrency(rec.advanceDeduction, lang)}` : '-'}
                                  </td>
                                  <td className="py-1 px-2 text-[10px] text-slate-500 truncate max-w-[120px]">
                                    {rec.notes || '-'}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={10} className="py-4 text-center text-slate-400 text-xs">
                                {lang === 'bn' ? `${formatMonthDisplay(selectedMonth)} এ কোনো হাজিরার রেকর্ড নেই` : 'No attendance logs recorded for this month'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-800">
                            <td colSpan={6} className="py-1.5 px-2 text-right uppercase border-r border-slate-300">
                              {lang === 'bn' ? 'মোট উপার্জিত ও কর্তন:' : 'Total OT & Deductions:'}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-teal-800 border-r border-slate-300">
                              {totalOtHours > 0 ? `${formatNumber(totalOtHours, lang)} hrs` : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-emerald-800 border-r border-slate-300 font-bold">
                              {totalOtMoney > 0 ? formatCurrency(totalOtMoney, lang) : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-rose-800 border-r border-slate-300 font-bold">
                              {totalAdv > 0 ? `-${formatCurrency(totalAdv, lang)}` : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-emerald-900 font-black font-mono">
                              = {formatCurrency(netPayable, lang)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
                );
              })()
            ) : (
              /* All Staff Members Table with Executive Summary */
              (() => {
                const staffComputedList = displayedStaff.map((stf) => {
                  const isOffice = stf.category === 'office';
                  const records = activeAttendance.filter(
                    (a) => a.staffId === stf.id
                  );
                  const totalOt = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otHours || 0), 0);
                  const otMoney = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otAmount !== undefined ? a.otAmount : (a.otHours || 0) * 60), 0);
                  const totalAdv = records.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
                  const totalLateMinutes = isOffice ? 0 : records.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
                  const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(stf.id, selectedMonth);
                  const presentDays = records.filter((a) => a.status === 'present' || a.status === 'late').length;
                  const leaveDays = records.filter((a) => a.status === 'full_day_leave' || a.status === 'half_day_leave' || a.status === 'leave' || a.status === 'holiday').length;
                  const absentDays = records.length === 0 ? 0 : Math.max(0, (isOffice ? 30 : 26) - (presentDays + leaveDays));
                  const daysBase = isOffice ? 30 : 26;
                  const dailyRate = Math.round(Number(stf.baseSalary || 0) / daysBase);
                  const lateDeduction = Math.round((totalLateMinutes / 60) * (dailyRate / 10));
                  const absentDeduction = absentDays * dailyRate;
                  const net = Math.max(0, stf.baseSalary - absentDeduction + otMoney - totalAdv - damageDeduction - lateDeduction);
                  const paymentStatus = storageService.getStaffPaymentStatus(selectedMonth, stf.id);

                  return {
                    ...stf,
                    dailyRate,
                    totalOt,
                    otMoney,
                    totalAdv,
                    totalLateMinutes,
                    lateDeduction,
                    damageDeduction,
                    absentDays,
                    absentDeduction,
                    net,
                    paymentStatus,
                  };
                });

                const totalPayroll = staffComputedList.reduce((s, st) => s + st.net, 0);
                const totalPaid = staffComputedList
                  .filter((st) => st.paymentStatus === 'Paid')
                  .reduce((s, st) => s + st.net, 0);
                const totalUnpaid = staffComputedList
                  .filter((st) => st.paymentStatus === 'Unpaid')
                  .reduce((s, st) => s + st.net, 0);
                const paidCount = staffComputedList.filter((st) => st.paymentStatus === 'Paid').length;
                const unpaidCount = staffComputedList.filter((st) => st.paymentStatus === 'Unpaid').length;

                return (
                  <>
                    {/* Header Banner with Month */}
                    <div className="p-2.5 bg-slate-900 text-white rounded-lg text-xs flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          {lang === 'bn' ? `বেতনের মাস: ${formatMonthDisplay(selectedMonth)}` : `Salary Month: ${formatMonthDisplay(selectedMonth)}`}
                        </span>
                        <span className="text-[10px] text-slate-300">
                          ({staffComputedList.length} {lang === 'bn' ? 'জন স্টাফ' : 'staff'})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-300">
                        {t.otRateNotice} | অফিস: ১০AM-১০PM, প্রসেসিং: ৯AM-৭PM
                      </span>
                    </div>

                    {/* Executive Summary Cards on Print Sheet */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-2 rounded-lg border border-slate-300 bg-slate-50 text-xs">
                        <span className="text-[10px] text-slate-600 block">
                          {lang === 'bn' ? 'মোট পে-রোল বিল (Net Salary):' : 'Total Net Payroll:'}
                        </span>
                        <strong className="text-sm font-mono text-slate-900 block">
                          {formatCurrency(totalPayroll, lang)}
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg border border-emerald-300 bg-emerald-50 text-xs">
                        <span className="text-[10px] text-emerald-800 block">
                          {lang === 'bn' ? `মোট পরিশোধিত (${paidCount} জন):` : `Total Paid (${paidCount} staff):`}
                        </span>
                        <strong className="text-sm font-mono text-emerald-800 block">
                          {formatCurrency(totalPaid, lang)}
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg border border-amber-300 bg-amber-50 text-xs">
                        <span className="text-[10px] text-amber-800 block">
                          {lang === 'bn' ? `মোট বকেয়া (${unpaidCount} জন):` : `Total Unpaid (${unpaidCount} staff):`}
                        </span>
                        <strong className="text-sm font-mono text-amber-800 block">
                          {formatCurrency(totalUnpaid, lang)}
                        </strong>
                      </div>
                    </div>

                    <div className="sheet-freeze-wrapper">
                      <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                        <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] font-bold border-b border-slate-300">
                            <th className="py-1 px-2 border-r border-slate-300 text-center w-8 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.sl}</th>
                            <th className="py-1 px-2 border-r border-slate-300 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.staffName}</th>
                            <th className="py-1 px-2 border-r border-slate-300 w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.category}</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-right w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.baseSalary}</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-center w-14 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.otHours}</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-right w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'ওটি টাকা' : 'OT (60x)'}</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-right w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'অগ্রিম/লেট কর্তন' : 'Adv / Late'}</th>
                            <th className="py-1 px-2 border-r border-slate-300 text-right w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.netSalary}</th>
                            <th className="py-1 px-2 text-center w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                          </tr>
                        </thead>
                      <tbody>
                        {staffComputedList.map((stf, idx) => {
                          const isOffice = stf.category === 'office';

                          return (
                            <tr key={stf.id} className="border-b border-slate-200">
                              <td className="py-1 px-2 border-r border-slate-200 text-center font-mono">
                                {formatNumber(idx + 1, lang)}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200 font-bold">
                                {stf.name}
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  {stf.designation} ({stf.phone}) • ID: <strong className="text-slate-700 dark:text-slate-300">{stf.loginCode || stf.id}</strong>
                                </span>
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200 capitalize text-[10px]">
                                {stf.category}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200 text-right font-mono">
                                {formatCurrency(stf.baseSalary, lang)}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200 text-center font-mono font-bold text-teal-700">
                                {stf.totalOt > 0 ? `${formatNumber(stf.totalOt, lang)} hrs` : '-'}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-800">
                                {stf.otMoney > 0 ? formatCurrency(stf.otMoney, lang) : '-'}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200 text-right font-mono text-rose-700">
                                {(stf.totalAdv > 0 || stf.lateDeduction > 0)
                                  ? `-${formatCurrency(stf.totalAdv + stf.lateDeduction, lang)}`
                                  : '-'}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-black text-slate-900">
                                {formatCurrency(stf.net, lang)}
                              </td>
                              <td className="py-1 px-2 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    stf.paymentStatus === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {stf.paymentStatus === 'Paid'
                                    ? lang === 'bn' ? '✓ Paid' : '✓ Paid'
                                    : lang === 'bn' ? '⏳ Unpaid' : '⏳ Unpaid'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-800">
                          <td colSpan={3} className="py-1.5 px-2 text-right uppercase border-r border-slate-300">
                            {lang === 'bn' ? 'মোট পে-রোল বিল:' : 'Total Payroll:'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono border-r border-slate-300">
                            {formatCurrency(staffComputedList.reduce((s, st) => s + st.baseSalary, 0), lang)}
                          </td>
                          <td colSpan={3} className="border-r border-slate-300"></td>
                          <td className="py-1.5 px-2 text-right font-mono text-emerald-800 font-black border-r border-slate-300">
                            {formatCurrency(totalPayroll, lang)}
                          </td>
                          <td className="py-1.5 px-2 text-center text-[10px] font-mono text-slate-700">
                            {paidCount}P / {unpaidCount}U
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  </>
                );
              })()
            )}
          </div>
        )}

        {/* 4. EXPENSE STATEMENT SHEET */}
        {type === 'expense' && (
          <div className="mt-4 space-y-4">
            {(() => {
              const monthExpenses = activeExpenses;
              const { start: periodStart } = getPeriodBounds();
              const openingBalance = periodStart
                ? (storageService.getPettyCashExpenses() || []).reduce((bal, e) => {
                    if (e.date && e.date < periodStart) {
                      return e.type === 'in' ? bal + e.amount : bal - e.amount;
                    }
                    return bal;
                  }, 0)
                : 0;

              const cashInList = monthExpenses.filter((e) => e.type === 'in');
              const cashOutList = monthExpenses.filter((e) => e.type !== 'in');
              const totalCashIn = cashInList.reduce((s, e) => s + e.amount, 0);
              const totalCashOut = cashOutList.reduce((s, e) => s + e.amount, 0);
              const closingBalance = openingBalance + totalCashIn - totalCashOut;

              return (
                <div className="space-y-4">
                  {/* Executive Header Banner */}
                  <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-amber-400 text-sm block">
                        {lang === 'bn' ? 'অফিস পেটি ক্যাশ ও পরিচালন খরচ বিবরণী' : 'Office Petty Cash & Expense Statement'}
                      </span>
                      <p className="text-[11px] text-slate-300">
                        {lang === 'bn' ? `হিসাবের মাস/সময়কাল: ${formatMonthDisplay(selectedMonth)}` : `Statement Period: ${formatMonthDisplay(selectedMonth)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs bg-white/10 px-3 py-1 rounded-lg border border-white/20">
                        {lang === 'bn' ? 'মোট এন্ট্রি:' : 'Total Entries:'} {monthExpenses.length}
                      </span>
                    </div>
                  </div>

                  {/* 4 Executive Summary KPI Cards (Opening, In, Out, Closing) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs">
                      <span className="text-[10px] text-slate-700 font-bold block">
                        {lang === 'bn' ? 'প্রারম্ভিক ব্যালেন্স (Opening O/B)' : 'Opening Balance (O/B)'}
                      </span>
                      <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                        {formatCurrency(openingBalance, lang)}
                      </div>
                      <span className="text-[9px] text-slate-500">
                        {lang === 'bn' ? 'শুরুর স্থিতি' : 'Start of period'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-teal-300 bg-teal-50 text-xs">
                      <span className="text-[10px] text-teal-800 font-semibold block">
                        {lang === 'bn' ? 'ফান্ড জমা (Cash In)' : 'Cash In (+)'}
                      </span>
                      <div className="text-base font-black font-mono text-teal-900 mt-0.5">
                        +{formatCurrency(totalCashIn, lang)}
                      </div>
                      <span className="text-[9px] text-teal-700">
                        {lang === 'bn' ? 'মেয়াদকালীন জমা' : 'Period refill'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-rose-300 bg-rose-50 text-xs">
                      <span className="text-[10px] text-rose-800 font-bold block">
                        {lang === 'bn' ? 'অফিস খরচ (Cash Out)' : 'Cash Out (-)'}
                      </span>
                      <div className="text-base font-black font-mono text-rose-900 mt-0.5">
                        -{formatCurrency(totalCashOut, lang)}
                      </div>
                      <span className="text-[9px] text-rose-700">
                        {lang === 'bn' ? 'মেয়াদকালীন খরচ' : 'Period expenses'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-xs ${closingBalance >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-rose-400 bg-rose-100'}`}>
                      <span className="text-[10px] font-bold block text-slate-700">
                        {lang === 'bn' ? 'সমাপনী ব্যালেন্স (Closing C/B)' : 'Closing Balance (C/B)'}
                      </span>
                      <div className={`text-base font-black font-mono mt-0.5 ${closingBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                        {formatCurrency(closingBalance, lang)}
                      </div>
                      <span className={`text-[9px] ${closingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {closingBalance >= 0 ? (lang === 'bn' ? 'উদ্বৃত্ত ক্যাশ' : 'Net balance') : (lang === 'bn' ? 'ঘাটতি' : 'Deficit')}
                      </span>
                    </div>
                  </div>

                  {/* Expense Ledger Table */}
                  <div className="sheet-freeze-wrapper">
                    <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                      <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase text-[10px] font-bold border-b border-slate-300">
                          <th className="py-1.5 px-2 border-r border-slate-300 text-center w-8 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.sl}</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-24 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.invoiceDate}</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 text-center w-20 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'ধরন' : 'Type'}</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">{t.category}</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'খরচ / জমার বিবরণ' : 'Description / Title'}</th>
                          <th className="py-1.5 px-2 border-r border-slate-300 w-28 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'গ্রহীতা / পেয়ি' : 'Paid To'}</th>
                          <th className="py-1.5 px-2 text-right w-32 sticky top-0 bg-slate-100 dark:bg-slate-800">{lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}</th>
                        </tr>
                      </thead>
                    <tbody>
                      {monthExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            {lang === 'bn' ? 'এই মাসে কোনো খরচের রেকর্ড নেই' : 'No expense records found for this period'}
                          </td>
                        </tr>
                      ) : (
                        monthExpenses.map((e, idx) => {
                          const isCashIn = e.type === 'in';
                          return (
                            <tr key={e.id} className="border-b border-slate-200">
                              <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                                {formatNumber(idx + 1, lang)}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-[11px]">
                                {formatDate(e.date, lang)}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isCashIn ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  {isCashIn ? (lang === 'bn' ? 'জমা (+)' : 'IN (+)') : (lang === 'bn' ? 'খরচ (-)' : 'OUT (-)')}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 capitalize text-[10px]">
                                {e.category === 'tea_snacks' || e.category === 'food_tea' || e.category === 'tea_food'
                                  ? (lang === 'bn' ? 'চা ও নাস্তা' : 'Tea & Snacks')
                                  : e.category === 'courier_bill'
                                  ? (lang === 'bn' ? 'কুরিয়ার বিল' : 'Courier Bill')
                                  : e.category === 'transport_allowance' || e.category === 'transport'
                                  ? (lang === 'bn' ? 'যাতায়াত ও ভাড়া' : 'Transport Allowance')
                                  : e.category === 'service_charge'
                                  ? (lang === 'bn' ? 'সার্ভিস চার্জ ও ফি' : 'Service Charge')
                                  : e.category === 'stationery'
                                  ? (lang === 'bn' ? 'স্টেশনারি' : 'Stationery')
                                  : e.category === 'utility' || e.category === 'utility_bills' || e.category === 'electricity'
                                  ? (lang === 'bn' ? 'বিদ্যুৎ/বিল' : 'Utility')
                                  : e.category === 'maintenance' || e.category === 'repair' || e.category === 'cleaning_maint'
                                  ? (lang === 'bn' ? 'মেরামত' : 'Maintenance')
                                  : e.category === 'entertainment'
                                  ? (lang === 'bn' ? 'আপ্যায়ন' : 'Entertainment')
                                  : e.category === 'labor' || e.category === 'labour_coolie' || e.category === 'coolie_labor'
                                  ? (lang === 'bn' ? 'কুলি ও লেবার' : 'Labor')
                                  : e.category === 'rent'
                                  ? (lang === 'bn' ? 'দোকান/অফিস ভাড়া' : 'Rent')
                                  : (lang === 'bn' ? 'অন্যান্য' : 'Other')}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 font-medium">
                                <div>{e.title}</div>
                                {e.notes && <div className="text-[10px] text-slate-500 italic">{e.notes}</div>}
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-200 text-slate-700">
                                {e.paidTo || '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold">
                                <span className={isCashIn ? 'text-teal-700' : 'text-rose-700'}>
                                  {isCashIn ? '+' : '-'}{formatCurrency(e.amount, lang)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-800">
                        <td colSpan={4} className="py-1.5 px-2 text-right uppercase border-r border-slate-300">
                          {lang === 'bn' ? 'মোট হিসাব বিবরণী:' : 'Total Statement Summary:'}
                        </td>
                        <td colSpan={2} className="py-1.5 px-2 border-r border-slate-300 text-slate-700 text-[11px]">
                          <span>{lang === 'bn' ? 'ফান্ড জমা:' : 'Cash In:'} <strong className="text-teal-700 font-mono">+{formatCurrency(totalCashIn, lang)}</strong></span>
                          {' | '}
                          <span>{lang === 'bn' ? 'প্রকৃত মোট খরচ:' : 'Total Expense:'} <strong className="text-rose-700 font-mono">-{formatCurrency(totalCashOut, lang)}</strong></span>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-sm font-black">
                          <span className={closingBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                            = {formatCurrency(closingBalance, lang)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 5. FINANCIAL ANALYTICS, P&L & ROI STATEMENT SHEET */}
        {type === 'financial' && (
          <div className="mt-4 space-y-4">
            {(() => {
              const periodInvoices = activeInvoices;
              const periodConsignments = activeBranchConsignments;
              const allChinaDirect = storageService.getChinaDirectPayments() || [];
              const periodChinaDirect = allChinaDirect.filter((p) => isDateInPeriod(p.date));
              const totalChinaDirect = periodChinaDirect.reduce((s, p) => s + (Number(p.amountBdt) || 0), 0);
              const totalChinaExportRevenue = periodConsignments.reduce((sum, c) => sum + (Number(c.totalBdtValue) || 0), 0);
              const domesticSales = periodInvoices.filter((inv) => inv.mode === 'sales' || !inv.mode).reduce((s, i) => s + (i.netInvoiceAmount || i.subtotal || 0), 0);
              const totalSales = domesticSales + totalChinaExportRevenue + totalChinaDirect;
              const totalPurchases = periodInvoices.filter((inv) => inv.mode === 'purchase').reduce((s, i) => s + (i.netInvoiceAmount || i.subtotal || 0), 0);
              const partyPaymentsPaid = periodInvoices.filter((inv) => inv.mode === 'purchase').reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
              const partyDuePayable = periodInvoices.filter((inv) => inv.mode === 'purchase').reduce((s, i) => s + (Number(i.remainingDue) || 0), 0);
              const grossMargin = totalSales - totalPurchases;
              
              // All time China remaining balance (b/l receivables)
              const allConsignments = storageService.getBranchConsignments() || [];
              const allConversions = storageService.getRmbConversions() || [];
              const chinaTotalSent = allConsignments.reduce((s, c) => s + (Number(c.totalBdtValue) || 0), 0);
              const chinaTotalConverted = allConversions.reduce((s, cv) => s + (Number(cv.expectedBdtAmount || cv.receivedBdtAmount) || 0), 0);
              const chinaTotalDirectAll = allChinaDirect.reduce((s, p) => s + (Number(p.amountBdt) || 0), 0);
              const chinaRemainingBal = Math.max(0, chinaTotalSent - (chinaTotalConverted + chinaTotalDirectAll));

              const periodPettyCash = activeExpenses.filter((e) => e.type !== 'in').reduce((s, e) => s + e.amount, 0);
              
              let totalPaidSal = 0;
              staff.forEach((stf) => {
                if (storageService.getStaffPaymentStatus(selectedMonth, stf.id) === 'Paid') {
                  const records = activeAttendance.filter((a) => a.staffId === stf.id);
                  const absentDays = records.filter((a) => a.status === 'absent').length;
                  const totalOt = stf.category === 'office' ? 0 : records.reduce((s, a) => s + (a.otHours || 0), 0);
                  const otAmount = totalOt * 60;
                  const totalAdv = records.reduce((s, a) => s + (a.advanceDeduction || 0), 0);
                  const absentDeduction = absentDays * stf.dailyRate;
                  totalPaidSal += Math.max(0, stf.baseSalary - absentDeduction + otAmount - totalAdv);
                }
              });

              const totalInvestmentOutflow = totalPurchases + periodPettyCash + totalPaidSal;
              const netProf = totalSales - totalInvestmentOutflow;
              const isProf = netProf >= 0;
              const roiPct = totalInvestmentOutflow > 0 ? (netProf / totalInvestmentOutflow) * 100 : 0;
              const profitMarginPct = totalSales > 0 ? (netProf / totalSales) * 100 : 0;
              const stockValuation = stock.reduce((s, st) => s + st.quantity * (st.purchaseRate || st.purchaseAvgRate || 0), 0);

              return (
                <div className="space-y-4">
                  {/* Banner */}
                  <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-emerald-400 text-sm block">
                        {lang === 'bn' ? 'আর্থিক হিসাব বিবরণী, লাভ-ক্ষতি (P&L) ও ROI রিপোর্ট' : 'Financial Statement, P&L & ROI Report'}
                      </span>
                      <p className="text-[11px] text-slate-300">
                        {lang === 'bn' ? `হিসাবের সময়কাল: ${formatMonthDisplay(selectedMonth)}` : `Accounting Month: ${formatMonthDisplay(selectedMonth)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold text-xs px-3 py-1 rounded-full border ${
                          isProf
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-rose-600 text-white border-rose-400'
                        }`}
                      >
                        {isProf
                          ? lang === 'bn' ? '🟢 নিট লাভজনক (NET PROFIT)' : '🟢 NET PROFIT'
                          : lang === 'bn' ? '🔴 নিট লোকসান (NET LOSS)' : '🔴 NET LOSS'}
                      </span>
                    </div>
                  </div>

                  {/* 4 Executive KPI Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs">
                      <span className="text-[10px] text-emerald-800 font-semibold block">{t.totalSalesRevenue}</span>
                      <div className="text-base font-black font-mono text-emerald-900 mt-0.5">
                        {formatCurrency(totalSales, lang)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border border-blue-300 bg-blue-50 text-xs">
                      <span className="text-[10px] text-blue-800 font-semibold block">{t.totalPurchaseCost}</span>
                      <div className="text-base font-black font-mono text-blue-900 mt-0.5">
                        {formatCurrency(totalPurchases, lang)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-xs">
                      <span className="text-[10px] text-amber-800 font-semibold block">{lang === 'bn' ? 'মোট পরিচালন ব্যয় (Outflow)' : 'Total Outflow'}</span>
                      <div className="text-base font-black font-mono text-amber-900 mt-0.5">
                        {formatCurrency(totalInvestmentOutflow, lang)}
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-xs ${isProf ? 'border-emerald-400 bg-emerald-100' : 'border-rose-400 bg-rose-100'}`}>
                      <span className="text-[10px] font-bold block text-slate-800">{t.netProfitLoss}</span>
                      <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                        {formatCurrency(netProf, lang)}
                      </div>
                    </div>
                  </div>

                  {/* Detailed P&L Ledger Breakdown Table */}
                  <div className="space-y-1.5 pt-1">
                    <strong className="text-xs text-slate-800 block">
                      {lang === 'bn' ? 'লাভ-ক্ষতি (P&L) বিস্তারিত হিসাব বিবরণী:' : 'Detailed Profit & Loss (P&L) Ledger Waterfall:'}
                    </strong>

                    <table className="w-full text-left border-collapse border border-slate-300 text-xs print-compact">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 uppercase text-[10px] font-bold border-b border-slate-300">
                          <th className="py-1 px-2 border-r border-slate-300">{lang === 'bn' ? 'হিসাবের খাত / বিবরণ' : 'Financial Revenue & Expense Head'}</th>
                          <th className="py-1 px-2 border-r border-slate-300 text-center w-28">{lang === 'bn' ? 'ধরন' : 'Type'}</th>
                          <th className="py-1 px-2 text-right w-36">{lang === 'bn' ? 'টাকা (পরিমাণ)' : 'Amount (BDT)'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-emerald-800">
                            (+) {lang === 'bn' ? 'মোট বিক্রয়, চীন শাখা রপ্তানি ও প্রাপ্তি আয়' : 'Total Sales & China Export Turnover'}
                            <div className="text-[10px] text-emerald-700 font-normal space-y-0.5 mt-0.5">
                              <div>• {lang === 'bn' ? 'লোকাল ইনভয়েস বিক্রয়:' : 'Local Invoices:'} {formatCurrency(domesticSales, lang)}</div>
                              {totalChinaExportRevenue > 0 && (
                                <div>• {lang === 'bn' ? 'চীন শাখা রপ্তানি চালান:' : 'China Export:'} {formatCurrency(totalChinaExportRevenue, lang)}</div>
                              )}
                              {totalChinaDirect > 0 && (
                                <div>• {lang === 'bn' ? 'চীন অফিস সরাসরি BDT পেমেন্ট:' : 'China Direct BDT:'} {formatCurrency(totalChinaDirect, lang)}</div>
                              )}
                              {chinaRemainingBal > 0 && (
                                <div className="font-semibold text-indigo-700">• {lang === 'bn' ? 'চীন অফিস অবশিষ্ট পাওনা (B/L):' : 'China Office Balance (B/L):'} {formatCurrency(chinaRemainingBal, lang)}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center text-emerald-700 font-semibold text-[10px]">
                            {lang === 'bn' ? 'আয় (Revenue)' : 'Revenue'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800">
                            {formatCurrency(totalSales, lang)}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200">
                          <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-blue-800">
                            (-) {lang === 'bn' ? 'মোট সার্কিট ও মাদারবোর্ড ক্রয় খরচ (Cost of Goods Purchased)' : 'Total Cost of Goods Purchased'}
                            <div className="text-[10px] text-blue-700 font-normal space-y-0.5 mt-0.5">
                              <div>• {lang === 'bn' ? 'পার্টি পরিশোধিত বিল (Paid):' : 'Party Bills Paid:'} {formatCurrency(partyPaymentsPaid, lang)}</div>
                              {partyDuePayable > 0 && (
                                <div>• {lang === 'bn' ? 'বকেয়া বিল পাওনা (Due):' : 'Pending Due Payables:'} {formatCurrency(partyDuePayable, lang)}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center text-rose-700 font-semibold text-[10px]">
                            {lang === 'bn' ? 'ক্রয় খরচ' : 'Purchase Cost'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-700">
                            -{formatCurrency(totalPurchases, lang)}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold">
                          <td className="py-1.5 px-2 border-r border-slate-200 text-purple-900">
                            (=) {lang === 'bn' ? 'গ্রস পারচেজ ও সেলস মার্জিন (Gross Sales Balance)' : 'Gross Sales Margin'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center text-[10px] text-purple-800">
                            {lang === 'bn' ? 'গ্রস মার্জিন' : 'Gross Margin'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-purple-900">
                            = {formatCurrency(grossMargin, lang)}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200">
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            (-) {lang === 'bn' ? 'মোট দৈনন্দিন অফিস ও গাড়ি খরচ (Petty Cash & Transport)' : 'Office Petty Cash & Vehicle Transport Expenses'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center text-amber-700 text-[10px]">
                            {lang === 'bn' ? 'অফিস খরচ' : 'Office Expense'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-rose-700">
                            -{formatCurrency(periodPettyCash, lang)}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200">
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            (-) {lang === 'bn' ? 'পরিশোধিত স্টাফ বেতন (Total Paid Staff Salary)' : 'Total Paid Staff Salary'}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center text-indigo-700 text-[10px]">
                            {lang === 'bn' ? 'পে-রোল খরচ' : 'Payroll Expense'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-rose-700">
                            -{formatCurrency(totalPaidSal, lang)}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className={`font-black text-xs border-t-2 ${isProf ? 'bg-emerald-100 text-emerald-900 border-emerald-800' : 'bg-rose-100 text-rose-900 border-rose-800'}`}>
                          <td colSpan={2} className="py-2 px-2 text-right uppercase border-r border-slate-400">
                            (=) {t.netProfitLoss} (NET PROFIT / LOSS):
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-sm font-black">
                            {formatCurrency(netProf, lang)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Company ROI & Asset Valuation Summary Box */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t.roiPercentage}</span>
                      <strong className={`text-sm font-mono block ${roiPct >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {roiPct >= 0 ? `+${roiPct.toFixed(1)}%` : `${roiPct.toFixed(1)}%`}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">{t.profitMargin}</span>
                      <strong className="text-sm font-mono block text-slate-900">
                        {profitMarginPct.toFixed(1)}%
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'বর্তমান মজুদ মাল মূল্য:' : 'Current Stock Asset Value:'}</span>
                      <strong className="text-sm font-mono block text-indigo-800">
                        {formatCurrency(stockValuation, lang)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 6. Processing Worker Tracking & Damage Statement */}
        {type === 'worker_tracking' && (
          <div className="space-y-4">
            {(() => {
              const workerTasks = activeWorkerTasks;
              const totalGiven = workerTasks.reduce((s, t) => s + t.givenPcs, 0);
              const totalCompleted = workerTasks.reduce((s, t) => s + t.completedPcs, 0);
              const totalDamaged = workerTasks.reduce((s, t) => s + t.damagedPcs, 0);
              const totalRemaining = Math.max(0, totalGiven - totalCompleted - totalDamaged);
              const rate = totalGiven > 0 ? ((totalDamaged / totalGiven) * 100).toFixed(1) : '0';

              return (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 border border-slate-300 rounded-lg bg-blue-50/50">
                      <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'মোট মাল দেওয়া (Given)' : 'Total Given'}</span>
                      <strong className="text-sm font-mono text-blue-900">{formatNumber(totalGiven, lang)} PCS</strong>
                    </div>
                    <div className="p-2 border border-slate-300 rounded-lg bg-emerald-50/50">
                      <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'মোট কাজ সম্পন্ন (Delivered)' : 'Total Completed'}</span>
                      <strong className="text-sm font-mono text-emerald-900">{formatNumber(totalCompleted, lang)} PCS</strong>
                    </div>
                    <div className="p-2 border border-slate-300 rounded-lg bg-amber-50/50">
                      <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'বকেয়া কাজ (Remaining)' : 'Total Remaining'}</span>
                      <strong className="text-sm font-mono text-amber-900">{formatNumber(totalRemaining, lang)} PCS</strong>
                    </div>
                    <div className="p-2 border border-slate-300 rounded-lg bg-rose-50/50">
                      <span className="text-[10px] text-slate-500 block">{lang === 'bn' ? 'নষ্ট / ড্যামেজ (Damage)' : 'Total Damaged'}</span>
                      <strong className="text-sm font-mono text-rose-900">{formatNumber(totalDamaged, lang)} PCS ({rate}%)</strong>
                    </div>
                  </div>

                  {/* Worker Breakdown Table */}
                  <table className="w-full text-xs border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr className="border-b border-slate-300 text-left">
                        <th className="py-1.5 px-2 border-r border-slate-300">#</th>
                        <th className="py-1.5 px-2 border-r border-slate-300">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                        <th className="py-1.5 px-2 border-r border-slate-300">{lang === 'bn' ? 'কর্মী (Worker)' : 'Worker'}</th>
                        <th className="py-1.5 px-2 border-r border-slate-300">{lang === 'bn' ? 'পণ্যের বিবরণ / ব্যাচ' : 'Product / Batch'}</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-right">{lang === 'bn' ? 'মাল প্রদান (Given)' : 'Given'}</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-right">{lang === 'bn' ? 'ডেলিভারি (Delivered)' : 'Delivered'}</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-right">{lang === 'bn' ? 'বাকি (Remaining)' : 'Remaining'}</th>
                        <th className="py-1.5 px-2 border-r border-slate-300 text-right">{lang === 'bn' ? 'ড্যামেজ (Damaged)' : 'Damaged'}</th>
                        <th className="py-1.5 px-2 text-center">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerTasks.map((t, idx) => {
                        const rem = Math.max(0, t.givenPcs - t.completedPcs - t.damagedPcs);
                        return (
                          <tr key={t.id || idx} className="border-b border-slate-200">
                            <td className="py-1.5 px-2 border-r border-slate-200 text-slate-500">{idx + 1}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200">{formatDate(t.date, lang)}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 font-semibold">{t.workerName}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200">
                              <span className="font-semibold">{t.productName}</span>
                              {t.batchNo && <span className="text-[10px] text-slate-500 block">Batch: {t.batchNo}</span>}
                              {t.extractedItems && t.extractedItems.length > 0 ? (
                                <div className="text-[9px] text-emerald-800 font-semibold mt-0.5">
                                  ➔ {t.extractedItems.map((it) => `${it.name}: ${it.quantity} ${it.unit}`).join(', ')}
                                </div>
                              ) : t.extractedProductSummary ? (
                                <div className="text-[9px] text-emerald-800 font-semibold mt-0.5">
                                  ➔ {t.extractedProductSummary}
                                </div>
                              ) : null}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-semibold">{t.givenPcs}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-emerald-700 font-semibold">{t.completedPcs}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-amber-700 font-semibold">{rem}</td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-rose-700 font-semibold">{t.damagedPcs}</td>
                            <td className="py-1.5 px-2 text-center">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                      <tr>
                        <td colSpan={4} className="py-1.5 px-2 text-right border-r border-slate-300 uppercase">
                          {lang === 'bn' ? 'মোট:' : 'Total:'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono border-r border-slate-300">{totalGiven}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700 border-r border-slate-300">{totalCompleted}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-amber-700 border-r border-slate-300">{totalRemaining}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-rose-700 border-r border-slate-300">{totalDamaged}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* 1-Page Signatures */}
        <div className="mt-14 pt-4 border-t border-slate-300 grid grid-cols-3 text-center text-xs text-slate-700">
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold">
              {t.preparedBy}
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold">
              {lang === 'bn' ? 'অডিট অফিসার' : 'Audit Officer'}
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-semibold">
              {t.companySealSignature}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
