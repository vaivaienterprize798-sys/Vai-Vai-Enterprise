import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Printer,
  Calendar,
  DollarSign,
  Coffee,
  Truck,
  Zap,
  Users2,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMethod, Language, DEFAULT_COMPANY } from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';

interface ExpensePanelProps {
  expenses: Expense[];
  lang: Language;
  onSaveExpense: (exp: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onPrintExpenseStatement: () => void;
}

export const ExpensePanel: React.FC<ExpensePanelProps> = ({
  expenses,
  lang,
  onSaveExpense,
  onDeleteExpense,
  onPrintExpenseStatement,
}) => {
  const t = translations[lang];

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('food_tea');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState(todayStr);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('cash');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openNewExpenseModal = () => {
    setFormCategory('food_tea');
    setFormTitle('');
    setFormAmount(0);
    setFormDate(todayStr);
    setFormPaymentMethod('cash');
    setFormPaidTo('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmount <= 0) {
      alert(lang === 'bn' ? 'খরচের বিবরণ ও সঠিক টাকার অঙ্ক দিন' : 'Enter expense title and valid amount');
      return;
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      category: formCategory,
      title: formTitle.trim(),
      description: formTitle.trim(),
      amount: Number(formAmount),
      date: formDate,
      paymentMethod: formPaymentMethod,
      paidTo: formPaidTo.trim(),
      notes: formNotes.trim(),
    };

    onSaveExpense(newExp);
    setIsModalOpen(false);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.type === 'in') return false; // Strictly actual outgoing expenses only
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchMonth = !selectedMonth || e.date.startsWith(selectedMonth);
      const titleStr = (e.title || e.description || '').toLowerCase();
      const matchSearch =
        titleStr.includes(searchTerm.toLowerCase()) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchMonth && matchSearch;
    });
  }, [expenses, selectedCategory, selectedMonth, searchTerm]);

  // Aggregate stats
  const totalAmountSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter((e) => e.type !== 'in').forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Top Header & Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t.officeExpenses}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'চা-নাস্তা, কুলি/লেবার, গাড়ি ভাড়া ও অফিসের যাবতীয় খরচের ক্যাটাগরিভিত্তিক হিসাব'
              : 'Category-wise tracking for daily tea, food, labour/coolie, transport, and utilities'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrintExpenseStatement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.expenseStatement1Page}</span>
          </button>

          <button
            onClick={openNewExpenseModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addExpense}</span>
          </button>
        </div>
      </div>

      {/* Category Wise Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
            <Coffee className="w-3.5 h-3.5" />
            <span>{t.foodTea}</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-900 dark:text-amber-300 mt-1">
            {formatCurrency(categoryTotals['food_tea'] || 0, lang)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-400">
            <Users2 className="w-3.5 h-3.5" />
            <span>{t.labourCoolie}</span>
          </div>
          <div className="text-lg font-bold font-mono text-blue-900 dark:text-blue-300 mt-1">
            {formatCurrency(categoryTotals['labour_coolie'] || 0, lang)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-800 dark:text-purple-400">
            <Truck className="w-3.5 h-3.5" />
            <span>{t.transport}</span>
          </div>
          <div className="text-lg font-bold font-mono text-purple-900 dark:text-purple-300 mt-1">
            {formatCurrency(categoryTotals['transport'] || 0, lang)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>{t.utilityBills} & অন্যান্য</span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-900 dark:text-emerald-300 mt-1">
            {formatCurrency(
              (categoryTotals['bills'] || 0) + (categoryTotals['other'] || 0),
              lang
            )}
          </div>
        </div>
      </div>

      {/* Filter and Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'bn' ? 'খরচের বিবরণ বা গ্রাহকের নাম...' : 'Search expense title or recipient...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
          >
            <option value="all">{lang === 'bn' ? 'সব খরচ ক্যাটাগরি' : 'All Categories'}</option>
            <option value="food_tea">{t.foodTea}</option>
            <option value="labour_coolie">{t.labourCoolie}</option>
            <option value="transport">{t.transport}</option>
            <option value="bills">{t.utilityBills}</option>
            <option value="other">{t.otherExpense}</option>
          </select>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
          <span>
            {lang === 'bn' ? 'বাছাইকৃত খরচের তালিকা' : 'Filtered Expenses List'} ({formatNumber(filteredExpenses.length, lang)} {lang === 'bn' ? 'টি' : 'records'})
          </span>
          <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm">
            {lang === 'bn' ? 'মোট খরচ: ' : 'Total: '} {formatCurrency(totalAmountSum, lang)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">{t.sl}</th>
                <th className="py-2.5 px-3 w-28">{t.invoiceDate}</th>
                <th className="py-2.5 px-3 w-32">{t.category}</th>
                <th className="py-2.5 px-3">{t.expenseTitle}</th>
                <th className="py-2.5 px-3 w-32">{lang === 'bn' ? 'প্রাপক' : 'Paid To'}</th>
                <th className="py-2.5 px-3 w-24 text-center">{t.paymentMethod}</th>
                <th className="py-2.5 px-3 w-28 text-right">{t.amount}</th>
                <th className="py-2.5 px-3 w-16 text-right">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    {lang === 'bn' ? 'কোনো খরচের রেকর্ড পাওয়া যায়নি।' : 'No expense records found.'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {formatNumber(idx + 1, lang)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {formatDate(exp.date, lang)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {exp.category === 'food_tea'
                          ? t.foodTea
                          : exp.category === 'labour_coolie'
                          ? t.labourCoolie
                          : exp.category === 'transport'
                          ? t.transport
                          : exp.category === 'bills'
                          ? t.utilityBills
                          : t.otherExpense}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {exp.title}
                      {exp.notes && (
                        <span className="block text-[10px] text-slate-500">{exp.notes}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {exp.paidTo || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center uppercase font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(exp.amount, lang)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(t.deleteConfirm)) {
                            onDeleteExpense(exp.id);
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

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                {t.addExpense}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.category}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="food_tea">{t.foodTea}</option>
                    <option value="labour_coolie">{t.labourCoolie}</option>
                    <option value="transport">{t.transport}</option>
                    <option value="bills">{t.utilityBills}</option>
                    <option value="other">{t.otherExpense}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.invoiceDate}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.expenseTitle} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="যেমন: আজকের নাস্তা ও চা বিল, বা ভ্যান ভাড়া"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.amount} (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.paymentMethod}
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    <option value="cash">Cash (নগদ)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="nagad">Nagad (নগদ একাউন্ট)</option>
                    <option value="bank">Bank (ব্যাংক ট্রান্সফার)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  কার নিকট পরিশোধিত (Paid To)
                </label>
                <input
                  type="text"
                  value={formPaidTo}
                  onChange={(e) => setFormPaidTo(e.target.value)}
                  placeholder="যেমন: করিম ভাই (লেবার সর্দার) / দোকানদার"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  মন্তব্য বা নোট
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="অতিরিক্ত তথ্য..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
