import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  Share2,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Invoice, Language, DEFAULT_COMPANY } from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';

interface InvoiceListProps {
  invoices: Invoice[];
  lang: Language;
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  isSuperAdmin?: boolean;
  isHeadSupervisor?: boolean;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  lang,
  onNewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onPrintInvoice,
  isSuperAdmin = true,
  isHeadSupervisor = false,
}) => {
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');

  // Month & Date Filtering (User Requirement)
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'month' | 'date'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.partyPhone && inv.partyPhone.includes(searchTerm));

      const matchType = selectedType === 'all' || inv.type === selectedType;
      const matchMode = selectedMode === 'all' || inv.mode === selectedMode;

      const matchDate =
        dateFilterMode === 'all'
          ? true
          : dateFilterMode === 'today'
          ? inv.date === todayStr
          : dateFilterMode === 'date'
          ? inv.date === selectedDate
          : !selectedMonth || inv.date.startsWith(selectedMonth);

      return matchSearch && matchType && matchMode && matchDate;
    });
  }, [invoices, searchTerm, selectedType, selectedMode, dateFilterMode, selectedDate, selectedMonth, todayStr]);

  const handleWhatsApp = (inv: Invoice) => {
    const companyHeader =
      inv.type === 'processing'
        ? DEFAULT_COMPANY.processingName
        : DEFAULT_COMPANY.name;

    const text = `*${companyHeader} - Invoice*
Invoice No: ${inv.invoiceNo}
Date: ${inv.date}
Party: ${inv.partyName}
Amount: ৳${inv.grandTotal}
Paid: ৳${inv.paidAmount ?? 0}
Due: ৳${inv.remainingDue ?? 0}
Status: ${(inv.paymentStatus || 'unpaid').toUpperCase()}`;

    const url = inv.partyPhone
      ? `https://wa.me/88${inv.partyPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            {t.invoiceManagement}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'জেনারেল, প্রসেসিং (Vai Vai Trades 5G), দোকান ও কমার্শিয়াল ইনভয়েস'
              : 'General, Processing (Vai Vai Trades 5G), Dokan, and Commercial Invoices'}
          </p>
        </div>

        <button
          onClick={onNewInvoice}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.createInvoice} (৫০টি আইটেম)</span>
        </button>
      </div>

      {/* Month & Date Filter Toolbar (User Requirement) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">
            {lang === 'bn' ? 'তারিখ বা মাস অনুযায়ী ইনভয়েস খুঁজুন:' : 'Filter Invoices by Month/Date:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 font-medium">
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সব সময় (All)' : 'All Time'}
            </button>
            <button
              onClick={() => setDateFilterMode('today')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'আজকের (Today)' : 'Today'}
            </button>
            <button
              onClick={() => setDateFilterMode('month')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilterMode === 'month'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'নির্দিষ্ট মাস (Month)' : 'Month'}
            </button>
            <button
              onClick={() => setDateFilterMode('date')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dateFilterMode === 'date'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'নির্দিষ্ট তারিখ (Date)' : 'Date'}
            </button>
          </div>

          {dateFilterMode === 'month' && (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-slate-700 text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-hidden cursor-pointer"
              />
              <button
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-slate-700 text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {dateFilterMode === 'date' && (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-hidden cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'bn' ? 'ইনভয়েস নং, পার্টি নাম বা মোবাইল দিয়ে খুঁজুন...' : 'Search by invoice no, party name, or phone...'}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-emerald-500"
          />
        </div>

        {/* 4 Invoice Types Filter */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{lang === 'bn' ? 'সব ইনভয়েস টাইপ' : 'All Invoice Types'}</option>
            <option value="general">{t.generalInvoice}</option>
            <option value="processing">{t.processingInvoice}</option>
            <option value="dokan">{t.dokanInvoice}</option>
            <option value="commercial">{t.commercialInvoice}</option>
          </select>
        </div>

        {/* Purchase / Sales Filter */}
        <div>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{lang === 'bn' ? 'ক্রয় ও বিক্রয় সব' : 'Purchase & Sales All'}</option>
            <option value="purchase">{t.purchaseMode}</option>
            <option value="sales">{t.salesMode}</option>
          </select>
        </div>
      </div>

      {/* Invoice Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold border-b border-slate-950">
              <tr>
                <th className="py-3 px-3 text-white font-bold">{t.invoiceNo}</th>
                <th className="py-3 px-3 text-white font-bold">{t.invoiceDate}</th>
                <th className="py-3 px-3 text-white font-bold">{t.invoiceType}</th>
                <th className="py-3 px-3 text-white font-bold">{t.partyName}</th>
                <th className="py-3 px-3 text-center text-white font-bold">{lang === 'bn' ? 'আইটেম' : 'Items'}</th>
                <th className="py-3 px-3 text-right text-white font-bold">{lang === 'bn' ? 'নেট বিল' : 'Net Amount'}</th>
                <th className="py-3 px-3 text-right text-white font-bold">{t.paidAmount}</th>
                <th className="py-3 px-3 text-right text-white font-bold">{t.remainingDue}</th>
                <th className="py-3 px-3 text-center text-white font-bold">{t.paymentStatus}</th>
                <th className="py-3 px-3 text-right text-white font-bold">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    {lang === 'bn' ? 'কোনো ইনভয়েস রেকর্ড পাওয়া যায়নি।' : 'No invoices found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const isProcessing = inv.type === 'processing';
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                        {formatDate(inv.date, lang)}
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
                          {isProcessing
                            ? 'Vai Vai 5G'
                            : inv.type.toUpperCase()}{' '}
                          ({inv.mode === 'purchase' ? (lang === 'bn' ? 'ক্রয়' : 'PUR') : (lang === 'bn' ? 'বিক্রয়' : 'SALE')})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {inv.partyName}
                        </div>
                        {inv.partyPhone && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {inv.partyPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(inv.items.length, lang)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(inv.netInvoiceAmount, lang)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(inv.paidAmount ?? 0, lang)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {(inv.remainingDue ?? 0) > 0 ? formatCurrency(inv.remainingDue ?? 0, lang) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : inv.paymentStatus === 'partial'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {inv.paymentStatus === 'paid'
                            ? t.paid
                            : inv.paymentStatus === 'partial'
                            ? t.partial
                            : t.unpaid}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            title={t.printInvoice}
                            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleWhatsApp(inv)}
                            title={t.shareWhatsApp}
                            className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          {isSuperAdmin && (
                            <>
                              <button
                                onClick={() => onEditInvoice(inv)}
                                title={t.editInvoice}
                                className="p-1 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(t.deleteConfirm)) {
                                    onDeleteInvoice(inv.id);
                                  }
                                }}
                                title={t.deleteInvoice}
                                className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
