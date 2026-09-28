import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Printer,
  Edit2,
  Save,
  X,
  CreditCard,
  MessageCircle,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Eye,
  Filter,
} from 'lucide-react';
import { Party, PartyType, Language, DEFAULT_COMPANY, Invoice } from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

interface PartyPanelProps {
  parties: Party[];
  invoices?: Invoice[];
  lang: Language;
  onSaveParty: (party: Party) => void;
  onPrintPartyStatement: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
  isSuperAdmin?: boolean;
}

type TimeBreakdown = 'day' | 'month' | 'year';

export const PartyPanel: React.FC<PartyPanelProps> = ({
  parties,
  invoices = [],
  lang,
  onSaveParty,
  onPrintPartyStatement,
  onViewInvoice,
  isSuperAdmin = true,
}) => {
  const t = translations[lang];

  // Active Main Sub-Tab: 'parties' (Directory & Dues) vs 'transactions' (Ledger Explorer)
  const [activeTab, setActiveTab] = useState<'parties' | 'transactions'>('parties');

  // Party Directory Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState<PartyType>('supplier');
  const [formOpeningBalance, setFormOpeningBalance] = useState<number>(0);
  const [formCurrentDue, setFormCurrentDue] = useState<number>(0);
  const [formCurrentAdvance, setFormCurrentAdvance] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');

  // Payment Quick Adjust Modal
  const [payModalParty, setPayModalParty] = useState<Party | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'receive' | 'pay'>('receive');

  // Transaction Ledger Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // e.g. "2026-09"
  const currentYearStr = todayStr.slice(0, 4); // e.g. "2026"

  const [selectedPartyId, setSelectedPartyId] = useState<string>('all');
  const [timeBreakdown, setTimeBreakdown] = useState<TimeBreakdown>('month');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [transactionSearch, setTransactionSearch] = useState<string>('');

  const openNewPartyModal = () => {
    setEditingParty(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormType('supplier');
    setFormOpeningBalance(0);
    setFormCurrentDue(0);
    setFormCurrentAdvance(0);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditPartyModal = (p: Party) => {
    setEditingParty(p);
    setFormName(p.name);
    setFormPhone(p.phone);
    setFormAddress(p.address);
    setFormType(p.type);
    setFormOpeningBalance(p.openingBalance);
    setFormCurrentDue(p.currentDue);
    setFormCurrentAdvance(p.currentAdvance);
    setFormNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert(lang === 'bn' ? 'পার্টির নাম দিন' : 'Party name is required');
      return;
    }

    const newParty: Party = {
      id: editingParty ? editingParty.id : `pty-${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      type: formType,
      openingBalance: Number(formOpeningBalance) || 0,
      currentDue: Number(formCurrentDue) || 0,
      currentAdvance: Number(formCurrentAdvance) || 0,
      totalTransactions: editingParty ? editingParty.totalTransactions : 0,
      notes: formNotes.trim(),
    };

    onSaveParty(newParty);
    setIsModalOpen(false);
  };

  // Quick Payment collection / settlement
  const handlePaymentAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalParty || adjustAmount <= 0) return;

    let updatedDue = payModalParty.currentDue;
    let updatedAdvance = payModalParty.currentAdvance;

    if (adjustType === 'receive') {
      if (updatedDue >= adjustAmount) {
        updatedDue -= adjustAmount;
      } else {
        const excess = adjustAmount - updatedDue;
        updatedDue = 0;
        updatedAdvance += excess;
      }
    } else {
      if (updatedDue > 0) {
        updatedDue = Math.max(0, updatedDue - adjustAmount);
      } else {
        updatedAdvance += adjustAmount;
      }
    }

    const updated: Party = {
      ...payModalParty,
      currentDue: updatedDue,
      currentAdvance: updatedAdvance,
      totalTransactions: payModalParty.totalTransactions + 1,
    };

    onSaveParty(updated);
    setPayModalParty(null);
    setAdjustAmount(0);
  };

  // Direct WhatsApp Reminder Link
  const handleWhatsAppReminder = (party: Party) => {
    const text = `*${DEFAULT_COMPANY.name} - হিসাব তাগাদা*
সম্মানিত ${party.name},
আপনার নিকট আমাদের মোট বাকি পাওনা: ৳${party.currentDue.toLocaleString()}
অনুগ্রহ করে দ্রুত হিসাব পরিষ্কার করার জন্য যোগাযোগ করুন।
যোগাযোগ: ${DEFAULT_COMPANY.phones.join(', ')}
ধন্যবাদান্তে,
${DEFAULT_COMPANY.name}`;

    const url = party.phone
      ? `https://wa.me/88${party.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      const matchType = filterType === 'all' || p.type === filterType;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [parties, filterType, searchTerm]);

  // Totals
  const totalDueSum = useMemo(() => {
    return parties.reduce((sum, p) => sum + p.currentDue, 0);
  }, [parties]);

  const totalAdvanceSum = useMemo(() => {
    return parties.reduce((sum, p) => sum + p.currentAdvance, 0);
  }, [parties]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Format month text in Bengali / English
  const formatMonthDisplay = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    if (isNaN(date.getTime())) return monthStr;

    if (lang === 'bn') {
      const bnMonths = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
      ];
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const bnYear = y.toString().replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
      return `${bnMonths[m - 1]} ${bnYear}`;
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filtered Transactions from Invoices
  const filteredTransactions = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Party Filter
      if (selectedPartyId !== 'all') {
        const party = parties.find((p) => p.id === selectedPartyId);
        const matchId = inv.partyId === selectedPartyId;
        const matchName = party ? inv.partyName.trim().toLowerCase() === party.name.trim().toLowerCase() : false;
        if (!matchId && !matchName) return false;
      }

      // 2. Time Breakdown Filter (Day-wise, Month-wise, Year-wise)
      if (timeBreakdown === 'day') {
        if (inv.date !== selectedDate) return false;
      } else if (timeBreakdown === 'month') {
        if (!inv.date.startsWith(selectedMonth)) return false;
      } else if (timeBreakdown === 'year') {
        if (!inv.date.startsWith(selectedYear)) return false;
      }

      // 3. Search text
      if (transactionSearch.trim()) {
        const q = transactionSearch.toLowerCase();
        const matchInv = inv.invoiceNo.toLowerCase().includes(q);
        const matchParty = inv.partyName.toLowerCase().includes(q);
        const matchPhone = (inv.partyPhone || '').includes(q);
        const matchItem = inv.items.some((it) => it.name.toLowerCase().includes(q) || (it.code || '').toLowerCase().includes(q));
        if (!matchInv && !matchParty && !matchPhone && !matchItem) return false;
      }

      return true;
    });
  }, [invoices, parties, selectedPartyId, timeBreakdown, selectedDate, selectedMonth, selectedYear, transactionSearch]);

  // Aggregated Transaction Metrics
  const transactionMetrics = useMemo(() => {
    let totalPurchases = 0;
    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;

    filteredTransactions.forEach((inv) => {
      if (inv.mode === 'purchase') {
        totalPurchases += inv.netInvoiceAmount;
      } else {
        totalSales += inv.netInvoiceAmount;
      }
      totalPaid += inv.paidAmount || 0;
      totalDue += inv.remainingDue || 0;
    });

    return {
      totalPurchases,
      totalSales,
      totalPaid,
      totalDue,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Year-wise 12 Months Summary (When year view is active)
  const yearMonthlyBreakdown = useMemo(() => {
    if (timeBreakdown !== 'year') return [];

    const months = Array.from({ length: 12 }, (_, i) => {
      const mStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      return mStr;
    });

    return months.map((mStr) => {
      const monthInvoices = invoices.filter((inv) => {
        if (!inv.date.startsWith(mStr)) return false;
        if (selectedPartyId !== 'all') {
          const party = parties.find((p) => p.id === selectedPartyId);
          const matchId = inv.partyId === selectedPartyId;
          const matchName = party ? inv.partyName.trim().toLowerCase() === party.name.trim().toLowerCase() : false;
          if (!matchId && !matchName) return false;
        }
        return true;
      });

      const purchases = monthInvoices.filter((i) => i.mode === 'purchase').reduce((s, i) => s + i.netInvoiceAmount, 0);
      const sales = monthInvoices.filter((i) => i.mode === 'sales').reduce((s, i) => s + i.netInvoiceAmount, 0);
      const paid = monthInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
      const due = monthInvoices.reduce((s, i) => s + (i.remainingDue || 0), 0);

      return {
        monthStr: mStr,
        label: formatMonthDisplay(mStr),
        count: monthInvoices.length,
        purchases,
        sales,
        paid,
        due,
      };
    });
  }, [invoices, parties, selectedPartyId, selectedYear, timeBreakdown, lang]);

  const selectedPartyObj = useMemo(() => {
    if (selectedPartyId === 'all') return null;
    return parties.find((p) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t.partyManagement}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'মহাজন, সাপ্লায়ার ও পাইকার পার্টির লেনদেন, লেজার ও দিন/মাস/বছর ভিত্তিক খাতা'
              : 'Supplier & Buyer transaction ledger, Day/Month/Year filters, and due tracking'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={t.shareWhatsApp}
            getText={() => {
              if (activeTab === 'transactions' && selectedPartyObj) {
                return `*${DEFAULT_COMPANY.name} - ${selectedPartyObj.name} লেজার বিবরণী*\n📅 সময়: ${timeBreakdown === 'day' ? selectedDate : timeBreakdown === 'month' ? formatMonthDisplay(selectedMonth) : selectedYear}\n────────────────────────\n📦 মোট লেনদেন: ${transactionMetrics.count} টি\n🛒 ক্রয়: ৳${transactionMetrics.totalPurchases.toLocaleString()}\n🏷️ বিক্রয়: ৳${transactionMetrics.totalSales.toLocaleString()}\n💵 মোট পরিশোধ: ৳${transactionMetrics.totalPaid.toLocaleString()}\n💸 বর্তমান বাকি: ৳${selectedPartyObj.currentDue.toLocaleString()}\n────────────────────────\n_${DEFAULT_COMPANY.name}_`;
              }
              return `*${DEFAULT_COMPANY.name} - পার্টি লেজার বিবরণী*\n📅 তারিখ: ${new Date().toISOString().split('T')[0]}\n────────────────────────\n👥 মোট পার্টি: ${parties.length} জন\n💸 মোট অনাদায়ী বাকি: ৳${totalDueSum.toLocaleString()}\n💳 মোট অগ্রিম জমা: ৳${totalAdvanceSum.toLocaleString()}\n────────────────────────\n_RSR Enterprise_`;
            }}
          />

          <button
            onClick={onPrintPartyStatement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.partyStatement1Page}</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={openNewPartyModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addParty}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Tabs: Directory vs Transactions Explorer */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('parties')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'parties'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'bn' ? 'পার্টি তালিকা ও ব্যালেন্স' : 'Party Directory & Balances'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {parties.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{lang === 'bn' ? 'পার্টি লেনদেন ও লেজার খাতা (দিন/মাস/বছর)' : 'Party Transactions & Ledger (Day/Month/Year)'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
            {invoices.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: Party Directory & Cards */}
      {activeTab === 'parties' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Aggregate KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs font-semibold text-slate-500">{t.totalItems}</div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatNumber(parties.length, lang)} {lang === 'bn' ? 'টি পার্টি' : 'Parties'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {formatNumber(parties.filter((p) => p.type === 'supplier').length, lang)} {lang === 'bn' ? 'সাপ্লায়ার' : 'Suppliers'},{' '}
                {formatNumber(parties.filter((p) => p.type === 'buyer').length, lang)} {lang === 'bn' ? 'ক্রেতা' : 'Buyers'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-400">{t.totalDueReceivable}</div>
              <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
                {formatCurrency(totalDueSum, lang)}
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                {lang === 'bn' ? 'পার্টিদের নিকট মোট অনাদায়ী বাকি' : 'Total outstanding receivable dues'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="text-xs font-semibold text-blue-800 dark:text-blue-400">{t.totalAdvancePayable}</div>
              <div className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrency(totalAdvanceSum, lang)}
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                {lang === 'bn' ? 'পার্টিদের জমা বা অগ্রিম টাকা' : 'Total party advances on ledger'}
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'bn' ? 'পার্টির নাম, ফোন বা ঠিকানা দিয়ে খুঁজুন...' : 'Search parties by name, phone or address...'}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              {(
                [
                  { id: 'all', label: t.all },
                  { id: 'supplier', label: t.supplier },
                  { id: 'buyer', label: t.buyer },
                  { id: 'both', label: t.both },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parties List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map((p) => {
              const hasDue = p.currentDue > 0;
              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{p.phone || 'N/A'}</span>
                      </div>
                      {p.address && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{p.address}</span>
                        </div>
                      )}
                    </div>

                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        p.type === 'supplier'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.type === 'buyer'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {p.type === 'supplier' ? t.supplier : p.type === 'buyer' ? t.buyer : t.both}
                    </span>
                  </div>

                  {/* Due / Advance Balance Display */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                        {hasDue ? t.totalDueReceivable : t.totalAdvancePayable}
                      </span>
                      <div
                        className={`text-base font-bold font-mono ${
                          hasDue
                            ? 'text-rose-600 dark:text-rose-400'
                            : p.currentAdvance > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {hasDue
                          ? formatCurrency(p.currentDue, lang)
                          : p.currentAdvance > 0
                          ? formatCurrency(p.currentAdvance, lang)
                          : t.cleanAccount}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        {lang === 'bn' ? 'মোট লেনদেন' : 'Transactions'}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                        {formatNumber(p.totalTransactions, lang)} {lang === 'bn' ? 'টি' : 'bills'}
                      </span>
                    </div>
                  </div>

                  {/* Opening Balance Indicator */}
                  <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-slate-100/60 dark:bg-slate-800/40 rounded-lg text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{lang === 'bn' ? 'প্রারম্ভিক জের (Opening Bal):' : 'Opening Balance:'}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(p.openingBalance || 0, lang)}
                    </span>
                  </div>

                  {p.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                      {p.notes}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 gap-1.5 text-xs">
                    <button
                      onClick={() => {
                        setPayModalParty(p);
                        setAdjustType('receive');
                        setAdjustAmount(p.currentDue > 0 ? p.currentDue : 0);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{t.receivePayment}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPartyId(p.id);
                        setActiveTab('transactions');
                      }}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-semibold cursor-pointer text-[11px]"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'লেনদেন দেখুন' : 'Ledger'}</span>
                    </button>

                    {hasDue && (
                      <button
                        onClick={() => handleWhatsAppReminder(p)}
                        title={lang === 'bn' ? 'হিসাব তাগাদা পাঠান' : 'Send Payment Reminder'}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    <button
                      onClick={() => openEditPartyModal(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title={t.editInvoice}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: Party Transactions & Ledger (Day/Month/Year-wise) */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Filter Controls Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Party Name Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'পার্টির নাম ফিল্টার:' : 'Filter by Party Name:'}
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="all">{lang === 'bn' ? '👥 সকল পার্টি (All Parties)' : '👥 All Parties'}</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type === 'supplier' ? 'সাপ্লায়ার' : p.type === 'buyer' ? 'ক্রেতা' : 'উভয়'} - বাকি: ৳{p.currentDue.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Time Filter Mode (Day-wise / Month-wise / Year-wise) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'সময় নির্বাচন ধরন:' : 'Time Frequency:'}
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    onClick={() => setTimeBreakdown('day')}
                    className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                      timeBreakdown === 'day'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'bn' ? 'দিন-ভিত্তিক' : 'Day-wise'}
                  </button>
                  <button
                    onClick={() => setTimeBreakdown('month')}
                    className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                      timeBreakdown === 'month'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'bn' ? 'মাস-ভিত্তিক' : 'Month-wise'}
                  </button>
                  <button
                    onClick={() => setTimeBreakdown('year')}
                    className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
                      timeBreakdown === 'year'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'bn' ? 'বছর-ভিত্তিক' : 'Year-wise'}
                  </button>
                </div>
              </div>

              {/* 3. Specific Date/Month/Year Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {timeBreakdown === 'day'
                    ? (lang === 'bn' ? 'নির্দিষ্ট দিন:' : 'Select Date:')
                    : timeBreakdown === 'month'
                    ? (lang === 'bn' ? 'নির্দিষ্ট মাস:' : 'Select Month:')
                    : (lang === 'bn' ? 'নির্দিষ্ট বছর:' : 'Select Year:')}
                </label>

                {timeBreakdown === 'day' && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  />
                )}

                {timeBreakdown === 'month' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={handleNextMonth}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {timeBreakdown === 'year' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {['2024', '2025', '2026', '2027', '2028'].map((y) => (
                      <option key={y} value={y}>
                        {y} {lang === 'bn' ? 'সাল' : 'Year'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4. Instant Search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'চালান নং / আইটেম সার্চ:' : 'Search Invoice/Item:'}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                    placeholder={lang === 'bn' ? 'চালান নং, আইটেম বা কোড...' : 'Invoice #, item name...'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Aggregated Filter Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {lang === 'bn' ? 'মোট ক্রয় (Purchases)' : 'Total Purchases'}
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(transactionMetrics.totalPurchases, lang)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {lang === 'bn' ? 'মোট বিক্রয় (Sales)' : 'Total Sales'}
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {formatCurrency(transactionMetrics.totalSales, lang)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 block">
                {lang === 'bn' ? 'নগদ/পেমেন্ট পরিশোধ' : 'Total Paid'}
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                {formatCurrency(transactionMetrics.totalPaid, lang)}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 block">
                {lang === 'bn' ? 'বকেয়া / বাকি (Outstanding Due)' : 'Outstanding Due'}
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(transactionMetrics.totalDue, lang)}
              </div>
            </div>
          </div>

          {/* Year-wise 12 Month Summary Table (If year view selected) */}
          {timeBreakdown === 'year' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>
                    {selectedYear} {lang === 'bn' ? 'সালের ১২ মাসের সামারি ও লেনদেন মেট্রিক্স' : 'Yearly 12-Month Breakdown Matrix'}
                  </span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">মাস (Month)</th>
                      <th className="p-3 text-center">চালান সংখ্যা</th>
                      <th className="p-3 text-right">ক্রয় (৳)</th>
                      <th className="p-3 text-right">বিক্রয় (৳)</th>
                      <th className="p-3 text-right">পরিশোধ (৳)</th>
                      <th className="p-3 text-right">বকেয়া (৳)</th>
                      <th className="p-3 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {yearMonthlyBreakdown.map((row) => (
                      <tr key={row.monthStr} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-semibold">{row.label}</td>
                        <td className="p-3 text-center font-mono">{formatNumber(row.count, lang)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.purchases, lang)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                          {formatCurrency(row.sales, lang)}
                        </td>
                        <td className="p-3 text-right font-mono text-purple-600 dark:text-purple-400">
                          {formatCurrency(row.paid, lang)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.due, lang)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedMonth(row.monthStr);
                              setTimeBreakdown('month');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer"
                          >
                            {lang === 'bn' ? 'মাসিক বিস্তারিত' : 'View Month'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Itemized Transactions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>
                  {selectedPartyObj ? selectedPartyObj.name : (lang === 'bn' ? 'সকল পার্টির' : 'All Parties')}{' '}
                  {timeBreakdown === 'day'
                    ? `${formatDate(selectedDate, lang)} এর লেনদেন`
                    : timeBreakdown === 'month'
                    ? `${formatMonthDisplay(selectedMonth)} এর লেনদেন`
                    : `${selectedYear} সালের লেনদেন তালিকা`}
                </span>
              </h3>
              <span className="text-xs font-mono text-slate-500 font-bold">
                {formatNumber(filteredTransactions.length, lang)} {lang === 'bn' ? 'টি চালান' : 'Invoices'}
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <Receipt className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs">
                  {lang === 'bn'
                    ? 'নির্বাচিত ফিল্টারে কোনো লেনদেন বা চালান পাওয়া যায়নি।'
                    : 'No transactions found for the selected party and date range.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                      <th className="p-3">{t.invoiceNo}</th>
                      <th className="p-3">{lang === 'bn' ? 'পার্টি' : 'Party'}</th>
                      <th className="p-3">{lang === 'bn' ? 'লেনদেনের ধরন' : 'Type'}</th>
                      <th className="p-3">{lang === 'bn' ? 'মালের বিবরণ / আইটেম' : 'Items'}</th>
                      <th className="p-3 text-right">মোট বিল (৳)</th>
                      <th className="p-3 text-right">পরিশোধ (৳)</th>
                      <th className="p-3 text-right">বকেয়া (৳)</th>
                      <th className="p-3 text-center">{t.paymentStatus}</th>
                      <th className="p-3 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {/* Opening Balance / Starting Due Row */}
                    {selectedPartyObj && selectedPartyObj.openingBalance !== 0 && (
                      <tr className="bg-amber-50/70 dark:bg-amber-950/30 border-b-2 border-amber-300 dark:border-amber-800">
                        <td className="p-3 font-mono font-bold text-amber-800 dark:text-amber-300">
                          {lang === 'bn' ? 'প্রারম্ভিক' : 'Starting'}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                          OPENING-BAL
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {selectedPartyObj.name}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                            {lang === 'bn' ? 'প্রারম্ভিক জের' : 'Opening Balance'}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 italic">
                          {lang === 'bn' ? 'সফটওয়্যার শুরুর পূর্ববর্তী হিসাব ও বকেয়া' : 'Initial opening balance before ERP transactions'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(selectedPartyObj.openingBalance, lang)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">-</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(selectedPartyObj.openingBalance, lang)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                            {lang === 'bn' ? 'প্রারম্ভিক' : 'Opening'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-400 font-mono text-[10px]">-</td>
                      </tr>
                    )}
                    {filteredTransactions.map((inv) => {
                      const isPurchase = inv.mode === 'purchase';
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono">{formatDate(inv.date, lang)}</td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {inv.invoiceNo}
                          </td>
                          <td className="p-3 font-semibold">
                            <div>{inv.partyName}</div>
                            {inv.partyPhone && (
                              <div className="text-[10px] text-slate-400 font-mono">{inv.partyPhone}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPurchase
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {isPurchase ? (lang === 'bn' ? 'ক্রয় (Purchase)' : 'Purchase') : (lang === 'bn' ? 'বিক্রয় (Sales)' : 'Sales')}
                            </span>
                          </td>
                          <td className="p-3 max-w-xs truncate text-[11px] text-slate-600 dark:text-slate-400">
                            {inv.items.map((it) => `${it.name} (${it.quantity}${it.unit})`).join(', ')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatCurrency(inv.netInvoiceAmount, lang)}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(inv.paidAmount || 0, lang)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(inv.remainingDue || 0, lang)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : inv.paymentStatus === 'partial'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {inv.paymentStatus === 'paid' ? t.paid : inv.paymentStatus === 'partial' ? t.partial : t.unpaid}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {onViewInvoice && (
                              <button
                                onClick={() => onViewInvoice(inv)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                title={lang === 'bn' ? 'চালান ভিউ ও প্রিন্ট' : 'View Invoice'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Party Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                {editingParty ? (lang === 'bn' ? 'পার্টি তথ্য সম্পাদনা' : 'Edit Party') : t.addParty}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.partyName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={lang === 'bn' ? "যেমন: জনৈক টেলিকম (ঢাকা)" : "e.g. Someone Telecom (Dhaka)"}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.partyPhone} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="017XX-XXXXXX"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.partyAddress}
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="যেমন: গুলিস্তান, ঢাকা"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.partyType}
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as PartyType)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="supplier">{t.supplier}</option>
                  <option value="buyer">{t.buyer}</option>
                  <option value="both">{t.both}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    বর্তমান বাকি (৳)
                  </label>
                  <input
                    type="number"
                    value={formCurrentDue}
                    onChange={(e) => setFormCurrentDue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    অগ্রিম জমা (৳)
                  </label>
                  <input
                    type="number"
                    value={formCurrentAdvance}
                    onChange={(e) => setFormCurrentAdvance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'মন্তব্য / নোট' : 'Notes'}
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  placeholder="অন্যান্য তথ্য..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {payModalParty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                {t.receivePayment} / পরিশোধ
              </h3>
              <button onClick={() => setPayModalParty(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{payModalParty.name}</div>
              <div className="text-slate-500 font-mono text-[11px]">{payModalParty.phone}</div>
              <div className="text-xs pt-1 flex justify-between">
                <span>বর্তমান বাকি:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(payModalParty.currentDue, lang)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaymentAdjust} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  লেনদেনের ধরন
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('receive')}
                    className={`py-1.5 rounded-lg font-bold text-center cursor-pointer ${
                      adjustType === 'receive'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    টাকা জমা গ্রহণ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('pay')}
                    className={`py-1.5 rounded-lg font-bold text-center cursor-pointer ${
                      adjustType === 'pay'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    টাকা পরিশোধ
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  টাকার পরিমাণ (৳)
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustAmount || ''}
                  onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalParty(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
