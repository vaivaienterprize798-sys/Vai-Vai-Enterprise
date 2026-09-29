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
} from 'lucide-react';
import { PettyCashExpense, Language } from '../types';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatSheetNumber,
  formatSheetDecimal,
} from '../lib/translations';
import { CompanyLogo } from './CompanyLogo';
import { storageService } from '../lib/storage';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

interface PettyCashPanelProps {
  expenses: PettyCashExpense[];
  lang: Language;
  onSaveExpense: (exp: PettyCashExpense) => void;
  onDeleteExpense: (id: string) => void;
  onPrintStatement: () => void;
}

export const PettyCashPanel: React.FC<PettyCashPanelProps> = ({
  expenses,
  lang,
  onSaveExpense,
  onDeleteExpense,
  onPrintStatement,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const companyInfo = storageService.getCompanyInfo();

  const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilterMode, setDateFilterMode] = useState<'month' | 'date' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchType = selectedType === 'all' || e.type === selectedType;
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchDate =
        dateFilterMode === 'all'
          ? true
          : dateFilterMode === 'date'
          ? e.date === selectedDate
          : !selectedMonth || e.date.startsWith(selectedMonth);
      const titleStr = (e.title || '').toLowerCase();
      const matchSearch =
        titleStr.includes(searchTerm.toLowerCase()) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.receiptNo && e.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchCat && matchDate && matchSearch;
    });
  }, [expenses, selectedType, selectedCategory, dateFilterMode, selectedMonth, selectedDate, searchTerm]);

  // Aggregate stats
  const totalIn = useMemo(() => {
    return expenses.filter((e) => e.type === 'in').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalOut = useMemo(() => {
    return expenses.filter((e) => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const currentBalance = totalIn - totalOut;

  const monthOut = useMemo(() => {
    return filteredExpenses.filter((e) => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

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
              return `*${companyInfo.name} - অফিস পেটি ক্যাশ সামারি*\n📅 মাস: ${selectedMonth}\n────────────────────────\n📥 মোট ক্যাশ ইন: ৳${totalIn.toLocaleString()}\n📤 মোট ক্যাশ আউট: ৳${totalOut.toLocaleString()}\n💼 অবশিষ্ট ক্যাশ ব্যালেন্স: ৳${currentBalance.toLocaleString()}\n────────────────────────\n_${companyInfo.name}_`;
            }}
          />

          <button
            onClick={onPrintStatement}
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
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 w-8 text-center">{lang === 'bn' ? 'নং' : 'SL'}</th>
                <th className="py-3 px-3 w-28">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                <th className="py-3 px-3 w-24 text-center">{lang === 'bn' ? 'টাইপ' : 'Type'}</th>
                <th className="py-3 px-3 w-32">{lang === 'bn' ? 'খাত' : 'Category'}</th>
                <th className="py-3 px-3">{lang === 'bn' ? 'খরচের বিবরণ' : 'Description'}</th>
                <th className="py-3 px-3 w-28">{lang === 'bn' ? 'গ্রহীতা' : 'Paid To'}</th>
                <th className="py-3 px-3 text-right w-28">{lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}</th>
                <th className="py-3 px-3 text-right w-16">{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
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
                filteredExpenses.map((it, idx) => (
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
                        {it.category === 'tea_snacks'
                          ? (lang === 'bn' ? 'চা ও নাস্তা' : 'Tea & Snacks')
                          : it.category === 'stationery'
                          ? (lang === 'bn' ? 'স্টেশনারি' : 'Stationery')
                          : it.category === 'utility'
                          ? (lang === 'bn' ? 'বিদ্যুৎ/বিল' : 'Utility')
                          : it.category === 'maintenance'
                          ? (lang === 'bn' ? 'মেরামত/ক্লিনার' : 'Maintenance')
                          : it.category === 'entertainment'
                          ? (lang === 'bn' ? 'আপ্যায়ন' : 'Entertainment')
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
          </table>
        </div>
      </div>

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
                    <option value="stationery">{lang === 'bn' ? 'স্টেশনারি ও খাতা' : 'Stationery'}</option>
                    <option value="utility">{lang === 'bn' ? 'বিদ্যুৎ/ওয়াইফাই বিল' : 'Utility'}</option>
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
