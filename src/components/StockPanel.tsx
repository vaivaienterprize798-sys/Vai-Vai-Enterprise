import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  Printer,
  Edit2,
  Trash2,
  Save,
  X,
  PackageCheck,
  TrendingDown,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StockItem, StockCategory, Language, Invoice } from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
  formatSheetNumber,
  formatSheetDecimal,
} from '../lib/translations';
import { storageService } from '../lib/storage';
import { CompanyLogo } from './CompanyLogo';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

interface StockPanelProps {
  stock: StockItem[];
  invoices?: Invoice[];
  lang: Language;
  onSaveItem: (item: StockItem) => void;
  onDeleteItem: (id: string) => void;
  onPrintStockStatement: () => void;
  isSuperAdmin?: boolean;
}

export const StockPanel: React.FC<StockPanelProps> = ({
  stock,
  invoices,
  lang,
  onSaveItem,
  onDeleteItem,
  onPrintStockStatement,
  isSuperAdmin = true,
}) => {
  const t = translations[lang];
  const companyInfo = storageService.getCompanyInfo();
  const allInvoices = invoices || storageService.getInvoices();
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  // Month & Date Filtering Options for Stock Sheet
  const [filterPeriodMode, setFilterPeriodMode] = useState<'today' | 'month' | 'date' | 'all'>('today');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7));
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

  const isInvoiceInPeriod = (invDate: string) => {
    if (!invDate) return false;
    if (filterPeriodMode === 'all') return true;
    if (filterPeriodMode === 'today') return invDate === todayStr;
    if (filterPeriodMode === 'date') return invDate === selectedDate;
    if (filterPeriodMode === 'month') return invDate.startsWith(selectedMonth);
    return true;
  };

  const periodInvoices = useMemo(() => {
    return allInvoices.filter((inv) => isInvoiceInPeriod(inv.date));
  }, [allInvoices, filterPeriodMode, selectedMonth, selectedDate, todayStr]);

  // Helper to dynamically calculate Purchase (Stock In) and Sale (Stock Out) per item for selected period
  const getItemStats = (itemCode: string, itemNameBn: string, itemNameEn: string) => {
    let stockIn = 0;
    let stockOut = 0;

    periodInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        const codeMatch = it.code && itemCode && it.code.trim().toUpperCase() === itemCode.trim().toUpperCase();
        const nameMatch =
          (it.name && itemNameBn && it.name.trim().toLowerCase() === itemNameBn.trim().toLowerCase()) ||
          (it.name && itemNameEn && it.name.trim().toLowerCase() === itemNameEn.trim().toLowerCase());

        if (codeMatch || nameMatch) {
          if (inv.mode === 'purchase') {
            stockIn += Number(it.quantity) || 0;
          } else if (inv.mode === 'sales') {
            stockOut += Number(it.quantity) || 0;
          }
        }
      });
    });

    return { stockIn, stockOut };
  };

  // Aggregated totals across all items for selected period
  const { periodTotalIn, periodTotalOut } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    periodInvoices.forEach((inv) => {
      inv.items?.forEach((it) => {
        if (inv.mode === 'purchase') inSum += Number(it.quantity) || 0;
        else if (inv.mode === 'sales') outSum += Number(it.quantity) || 0;
      });
    });
    return { periodTotalIn: inSum, periodTotalOut: outSum };
  }, [periodInvoices]);

  // Helper to determine category code abbreviation prefix
  const getCategoryPrefix = (cat: StockCategory): string => {
    switch (cat) {
      case 'android':
        return 'AND';
      case 'pcs_blank':
        return 'BTN'; // বাটন সেট / বাটন বোর্ড
      case 'code':
        return 'COD'; // কোড মাদারবোর্ড
      case 'kg':
        return 'KG'; // কেজি মাদারবোর্ড স্ক্র্যাপ
      default:
        return 'ITM';
    }
  };

  // Helper to calculate the next sequential serial number starting from 001, 002, 003...
  const getNextItemCode = (cat: StockCategory, currentStock: StockItem[]): string => {
    const prefix = getCategoryPrefix(cat);
    const matchingItems = currentStock.filter(
      (item) => item.category === cat || item.code.toUpperCase().startsWith(`${prefix}-`)
    );

    let maxSerial = 0;
    matchingItems.forEach((item) => {
      const match = item.code.match(/(?:-|\s|^)(\d+)$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSerial) {
          maxSerial = num;
        }
      }
    });

    const nextSerial = maxSerial + 1;
    const padded = String(nextSerial).padStart(3, '0');
    return `${prefix}-${padded}`;
  };

  // Form State - saleRate removed per requirement: "stock e sale rate dorker nai purchase avg rate show hobe"
  const [formCategory, setFormCategory] = useState<StockCategory>('android');
  const [formNameBn, setFormNameBn] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formOpeningQty, setFormOpeningQty] = useState<number>(0);
  const [formQuantity, setFormQuantity] = useState<number>(0);
  const [formUnit, setFormUnit] = useState<'pcs' | 'kg'>('pcs');
  const [formPurchaseRate, setFormPurchaseRate] = useState<number>(0);
  const [formMinAlert, setFormMinAlert] = useState<number>(50);

  const openNewItemModal = () => {
    setEditingItem(null);
    const targetCat = (activeCategory !== 'all' ? activeCategory : 'android') as StockCategory;
    setFormCategory(targetCat);
    setFormNameBn('');
    setFormNameEn('');
    setFormCode(getNextItemCode(targetCat, stock));
    setFormOpeningQty(0);
    setFormQuantity(100);
    setFormUnit(targetCat === 'kg' ? 'kg' : 'pcs');
    setFormPurchaseRate(targetCat === 'kg' ? 1200 : 300);
    setFormMinAlert(50);
    setIsModalOpen(true);
  };

  const handleCategoryChange = (newCat: StockCategory) => {
    setFormCategory(newCat);
    // If creating a new item, automatically generate the abbreviation prefix and next serial number (001, 002, ...)
    if (!editingItem) {
      setFormCode(getNextItemCode(newCat, stock));
      if (newCat === 'kg') {
        setFormUnit('kg');
      } else {
        setFormUnit('pcs');
      }
    }
  };

  const applyPresetProduct = (nameBn: string, nameEn: string, cat: StockCategory, unit: 'pcs' | 'kg', rate: number) => {
    setFormCategory(cat);
    setFormNameBn(nameBn);
    setFormNameEn(nameEn);
    setFormCode(getNextItemCode(cat, stock));
    setFormUnit(unit);
    setFormPurchaseRate(rate);
  };

  const openEditItemModal = (item: StockItem) => {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormNameBn(item.nameBn);
    setFormNameEn(item.nameEn);
    setFormCode(item.code);
    setFormOpeningQty(item.openingQty || 0);
    setFormQuantity(item.quantity);
    setFormUnit(item.unit);
    setFormPurchaseRate(item.purchaseAvgRate || item.purchaseRate || 0);
    setFormMinAlert(item.minAlertQty);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameBn.trim()) {
      alert(lang === 'bn' ? 'মালের নাম আবশ্যক' : 'Item name is required');
      return;
    }

    const newItem: StockItem = {
      id: editingItem ? editingItem.id : `stk-${Date.now()}`,
      category: formCategory,
      nameBn: formNameBn,
      nameEn: formNameEn || formNameBn,
      code: formCode.trim() || `ITM-${Date.now().toString().slice(-4)}`,
      openingQty: Number(formOpeningQty) || 0,
      quantity: Number(formQuantity) || 0,
      unit: formUnit,
      purchaseRate: Number(formPurchaseRate) || 0,
      purchaseAvgRate: Number(formPurchaseRate) || 0,
      saleRate: 0,
      minAlertQty: Number(formMinAlert) || 10,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    onSaveItem(newItem);
    setIsModalOpen(false);
  };

  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        item.nameBn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [stock, activeCategory, searchTerm]);

  // Overall totals based on Purchase Rate
  const totalValuation = useMemo(() => {
    return stock.reduce(
      (acc, it) => acc + it.quantity * (it.purchaseRate || it.purchaseAvgRate || 0),
      0
    );
  }, [stock]);

  const lowStockCount = useMemo(() => {
    return stock.filter((s) => s.quantity <= s.minAlertQty).length;
  }, [stock]);

  return (
    <div className="space-y-6">
      {/* Header and Fast Actions with Company Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-10 h-10" />
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t.stockManagement}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? '৪টি নির্দিষ্ট ক্যাটাগরিতে অটো স্টক ও ক্রয় গড় দর (ইনভয়েস সেভ করলেই স্টক ও গড় রেট স্বয়ংক্রিয়ভাবে আপডেট হয়)'
                : 'Auto stock & weighted average purchase rate tracking across 4 designated scrap categories'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={t.shareWhatsApp}
            getText={() => {
              const totalQty = stock.reduce((s, it) => s + it.quantity, 0);
              const totalVal = stock.reduce(
                (s, it) => s + it.quantity * (it.purchaseRate || it.purchaseAvgRate || 0),
                0
              );
              return `*${companyInfo.name} - স্টক রিপোর্ট*\n📅 তারিখ: ${new Date().toISOString().split('T')[0]}\n────────────────────────\n📦 মোট পণ্য: ${stock.length} টি\n🔢 মোট স্টক কোয়ান্টিটি: ${totalQty}\n💰 মোট মজুদ মূল্য: ৳${totalVal.toLocaleString()}\n────────────────────────\n_RSR Enterprise_`;
            }}
          />

          <button
            onClick={onPrintStockStatement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.stockStatement1Page}</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={openNewItemModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'bn' ? '+ নতুন মাল যোগ করুন' : '+ Add Stock Item'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Category Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-500 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold">{t.all}</div>
          <div className="text-lg font-bold font-mono mt-0.5">
            {formatNumber(stock.length, lang)}
          </div>
        </button>

        <button
          onClick={() => setActiveCategory('code')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
            activeCategory === 'code'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold">{t.codeItem}</div>
          <div className="text-lg font-bold font-mono mt-0.5">
            {formatNumber(stock.filter((s) => s.category === 'code').length, lang)}
          </div>
        </button>

        <button
          onClick={() => setActiveCategory('android')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
            activeCategory === 'android'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold">{t.androidItem}</div>
          <div className="text-lg font-bold font-mono mt-0.5">
            {formatNumber(stock.filter((s) => s.category === 'android').length, lang)}
          </div>
        </button>

        <button
          onClick={() => setActiveCategory('kg')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
            activeCategory === 'kg'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold">{t.kgItem}</div>
          <div className="text-lg font-bold font-mono mt-0.5">
            {formatNumber(stock.filter((s) => s.category === 'kg').length, lang)}
          </div>
        </button>

        <button
          onClick={() => setActiveCategory('pcs_blank')}
          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
            activeCategory === 'pcs_blank'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="text-xs font-semibold">{t.pcsBlankItem}</div>
          <div className="text-lg font-bold font-mono mt-0.5">
            {formatNumber(stock.filter((s) => s.category === 'pcs_blank').length, lang)}
          </div>
        </button>
      </div>

      {/* Month & Date Filter Toolbar for Stock Sheet (User Requirement) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200">
            {lang === 'bn' ? 'স্টক ইন/আউট হিসাবের তারিখ বা মাস নির্বাচন:' : 'Filter Stock In/Out by Month/Date:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 font-medium">
            <button
              onClick={() => setFilterPeriodMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'all'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সব সময় (All)' : 'All Time'}
            </button>
            <button
              onClick={() => setFilterPeriodMode('today')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'today'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'আজকের (Today)' : 'Today'}
            </button>
            <button
              onClick={() => setFilterPeriodMode('month')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'month'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'নির্দিষ্ট মাস (Month)' : 'Month'}
            </button>
            <button
              onClick={() => setFilterPeriodMode('date')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'date'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'নির্দিষ্ট তারিখ (Date)' : 'Date'}
            </button>
          </div>

          {filterPeriodMode === 'month' && (
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

          {filterPeriodMode === 'date' && (
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

      {/* Stock Search & Valuation Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'bn' ? 'মালের নাম বা কোড দিয়ে খুঁজুন...' : 'Search items by name or code...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
            <span>{filterPeriodMode === 'today' ? t.todayStockInTotal : (lang === 'bn' ? 'মোট মাল স্টক ইন:' : 'Stock In:')}:</span>
            <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              +{formatSheetNumber(periodTotalIn, lang)}
            </strong>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-semibold">
            <span>{filterPeriodMode === 'today' ? t.todayStockOutTotal : (lang === 'bn' ? 'মোট মাল স্টক আউট:' : 'Stock Out:')}:</span>
            <strong className="font-mono text-blue-700 dark:text-blue-400 font-bold">
              -{formatSheetNumber(periodTotalOut, lang)}
            </strong>
          </div>

          <span className="font-semibold text-slate-600 dark:text-slate-400 pl-1">
            {lang === 'bn' ? 'মোট মজুদ মূল্য' : 'Valuation'}:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm font-bold">
              {formatCurrency(totalValuation, lang)}
            </strong>
          </span>

          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              {formatNumber(lowStockCount, lang)} {lang === 'bn' ? 'টি আইটেম কম' : 'Low Stock'}
            </span>
          )}
        </div>
      </div>

      {/* Stock Table (includes Today's In and Today's Out per item) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 w-8 text-center">{t.sl}</th>
                <th className="py-3 px-3 w-28">{t.itemCode}</th>
                <th className="py-3 px-3">{t.itemDescription}</th>
                <th className="py-3 px-3 w-28">{t.category}</th>
                <th className="py-3 px-3 text-center w-24 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold">
                  {t.todayPurchase}
                </th>
                <th className="py-3 px-3 text-center w-24 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold">
                  {t.todaySale}
                </th>
                <th className="py-3 px-3 text-center w-28">{t.inStock}</th>
                <th className="py-3 px-3 text-right w-28">{t.purchaseRate}</th>
                <th className="py-3 px-3 text-right w-32">{lang === 'bn' ? 'মোট মজুদ মূল্য' : 'Stock Value'}</th>
                <th className="py-3 px-3 text-right w-20">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStock.map((it, idx) => {
                const isLow = it.quantity <= it.minAlertQty;
                const effectiveAvgRate = it.purchaseAvgRate || it.purchaseRate || 0;
                const rowValuation = it.quantity * effectiveAvgRate;
                const { stockIn, stockOut } = getItemStats(it.code, it.nameBn, it.nameEn);

                return (
                  <tr
                    key={it.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isLow ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {formatNumber(idx + 1, lang)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {it.code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {lang === 'bn' ? it.nameBn : it.nameEn}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {lang === 'bn' ? it.nameEn : it.nameBn}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          it.category === 'code'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : it.category === 'android'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : it.category === 'kg'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {it.category === 'code'
                          ? t.codeItem
                          : it.category === 'android'
                          ? t.androidItem
                          : it.category === 'kg'
                          ? t.kgItem
                          : t.pcsBlankItem}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center bg-emerald-50/30 dark:bg-emerald-950/20 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {stockIn > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                          +{formatSheetNumber(stockIn, lang)} {it.unit}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">০</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-blue-50/30 dark:bg-blue-950/20 font-mono font-bold text-blue-700 dark:text-blue-400">
                      {stockOut > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                          -{formatSheetNumber(stockOut, lang)} {it.unit}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">০</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {formatSheetNumber(it.quantity, lang)}{' '}
                        <span className="text-xs font-normal text-slate-500">{it.unit}</span>
                      </div>
                      {isLow && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                          {t.stockAlert} (&le;{formatSheetNumber(it.minAlertQty, lang)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                      {formatCurrency(it.purchaseRate || 0, lang)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(rowValuation, lang)}
                    </td>
                    {isSuperAdmin ? (
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditItemModal(it)}
                            className="p-1 rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t.deleteConfirm)) {
                                onDeleteItem(it.id);
                              }
                            }}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="py-3 px-3 text-right text-slate-400 text-[10px]">
                        {lang === 'bn' ? 'শুধুমাত্র দৃশ্যমান' : 'View Only'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Item Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                {editingItem
                  ? lang === 'bn'
                    ? 'স্টক আইটেম সম্পাদনা'
                    : 'Edit Stock Item'
                  : lang === 'bn'
                  ? 'নতুন স্টক আইটেম যুক্তকরণ'
                  : 'Add New Stock Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              {/* Quick Preset Selector for Easy Adding */}
              {!editingItem && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {lang === 'bn' ? '⚡ দ্রুত আইটেম ও কোড সিলেক্ট করুন:' : '⚡ Quick Product Preset:'}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        applyPresetProduct(
                          lang === 'bn' ? 'অ্যান্ড্রয়েড বোর্ড' : 'Android Board',
                          'Android Logic Board',
                          'android',
                          'pcs',
                          0
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg text-left bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold cursor-pointer transition-all flex items-center justify-between"
                    >
                      <span>📱 অ্যান্ড্রয়েড বোর্ড</span>
                      <span className="font-mono text-[10px] bg-emerald-200 dark:bg-emerald-800 px-1 py-0.2 rounded font-bold">AND</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        applyPresetProduct(
                          lang === 'bn' ? 'বাটন সার্কিট' : 'Button Circuit',
                          'Button Phone Circuit Scrap',
                          'pcs_blank',
                          'pcs',
                          0
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg text-left bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-semibold cursor-pointer transition-all flex items-center justify-between"
                    >
                      <span>🔘 বাটন সেট সার্কিট</span>
                      <span className="font-mono text-[10px] bg-purple-200 dark:bg-purple-800 px-1 py-0.2 rounded font-bold">BTN</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        applyPresetProduct(
                          lang === 'bn' ? 'কোড মাদারবোর্ড' : 'Code Motherboard',
                          'Code IC Motherboard',
                          'code',
                          'pcs',
                          0
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg text-left bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-semibold cursor-pointer transition-all flex items-center justify-between"
                    >
                      <span>📟 কোড মাদারবোর্ড</span>
                      <span className="font-mono text-[10px] bg-blue-200 dark:bg-blue-800 px-1 py-0.2 rounded font-bold">COD</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        applyPresetProduct(
                          lang === 'bn' ? 'কেজি স্ক্র্যাপ বোর্ড' : 'KG Scrap Board',
                          'Mixed Scrap Board (KG)',
                          'kg',
                          'kg',
                          0
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg text-left bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold cursor-pointer transition-all flex items-center justify-between"
                    >
                      <span>⚖️ কেজি স্ক্র্যাপ বোর্ড</span>
                      <span className="font-mono text-[10px] bg-amber-200 dark:bg-amber-800 px-1 py-0.2 rounded font-bold">KG</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.category}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as StockCategory)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="android">{t.androidItem} (AND)</option>
                    <option value="pcs_blank">{t.pcsBlankItem} (BTN)</option>
                    <option value="code">{t.codeItem} (COD)</option>
                    <option value="kg">{t.kgItem} (KG)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      {t.itemCode}
                    </label>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {lang === 'bn' ? 'স্বয়ংক্রিয় সিরিয়াল' : 'Auto Serial'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. AND-001, BTN-001"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 tracking-wider"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {lang === 'bn' ? `সংক্ষেপ: ${getCategoryPrefix(formCategory)} + সিরিয়াল 001, 002...` : `Prefix: ${getCategoryPrefix(formCategory)} + sequential number`}
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  মালের নাম (বাংলা)
                </label>
                <input
                  type="text"
                  value={formNameBn}
                  onChange={(e) => setFormNameBn(e.target.value)}
                  placeholder={lang === 'bn' ? "আইটেমের নাম লিখুন (বাংলা)" : "Enter item name (Bangla)"}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Item Name (English)
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder={lang === 'bn' ? "আইটেমের নাম লিখুন (ইংরেজি)" : "Enter item name (English)"}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'বর্তমান মজুদ (Current Stock)' : t.inStock}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formQuantity || ''}
                    onChange={(e) => setFormQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.unit}
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as 'pcs' | 'kg')}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                  >
                    <option value="pcs">Pcs (পিস)</option>
                    <option value="kg">KG (কেজি)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'ক্রয় দর / গড় ক্রয় দর (৳)' : 'Purchase / Avg Rate (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formPurchaseRate || ''}
                    onChange={(e) => setFormPurchaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.stockAlert}
                  </label>
                  <input
                    type="number"
                    value={formMinAlert || ''}
                    onChange={(e) => setFormMinAlert(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
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
    </div>
  );
};
