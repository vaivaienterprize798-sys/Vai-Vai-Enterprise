import React, { useState, useMemo, useRef } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Save,
  Printer,
  Share2,
  Search,
  Filter,
  Layers,
  Sparkles,
  Calendar,
  Building,
  Phone,
  MapPin,
  X,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Download,
  Copy,
  Clock,
  Coins,
} from 'lucide-react';
import {
  PriceList,
  PriceListItem,
  CompanyInfo,
  Language,
  StockItem,
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/translations';
import { CompanyLogo } from './CompanyLogo';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { WeChatShareDropdown } from './WeChatShareDropdown';
import { executePrint } from '../lib/printUtils';

interface PriceListPanelProps {
  priceLists: PriceList[];
  stock: StockItem[];
  companyInfo: CompanyInfo;
  lang: Language;
  onSavePriceList: (priceList: PriceList) => void;
  onDeletePriceList: (id: string) => void;
  isSuperAdmin?: boolean;
}

export const PriceListPanel: React.FC<PriceListPanelProps> = ({
  priceLists,
  stock,
  companyInfo,
  lang,
  onSavePriceList,
  onDeletePriceList,
  isSuperAdmin = true,
}) => {
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  // Active Selected Price List (or latest)
  const [selectedListId, setSelectedListId] = useState<string>(() => {
    return priceLists[0]?.id || 'default-list';
  });

  const activeList = useMemo(() => {
    const found = priceLists.find((pl) => pl.id === selectedListId);
    if (found) return found;
    if (priceLists.length > 0) return priceLists[0];
    
    // Seed an initial active list if empty
    return {
      id: 'default-list',
      title: lang === 'bn' ? 'আজকের বাজার দর তালিকা' : "Today's Market Price List",
      date: todayStr,
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      companyPhones: companyInfo.phones || [],
      companyLogoUrl: companyInfo.logoUrl,
      status: 'active' as const,
      items: [
        {
          id: 'item-1',
          productName: 'Android 4G/5G Mainboard (রানিং বোর্ড)',
          category: 'android',
          unit: 'pcs' as const,
          cashPrice: 320,
          dailyPaymentPrice: 340,
          monthlyCreditPrice: 370,
          notes: 'ভালো কোয়ালিটি',
        },
        {
          id: 'item-2',
          productName: 'Button Set Board (বাটন বোর্ড)',
          category: 'pcs_blank',
          unit: 'pcs' as const,
          cashPrice: 45,
          dailyPaymentPrice: 50,
          monthlyCreditPrice: 55,
          notes: 'মিক্সড বাটন',
        },
        {
          id: 'item-3',
          productName: 'CPU IC Board (কোড মাদারবোর্ড)',
          category: 'code',
          unit: 'pcs' as const,
          cashPrice: 450,
          dailyPaymentPrice: 480,
          monthlyCreditPrice: 520,
          notes: 'সিপিইউ সহ',
        },
        {
          id: 'item-4',
          productName: 'মাদারবোর্ড স্ক্র্যাপ কেজি (Scrap Board)',
          category: 'kg',
          unit: 'kg' as const,
          cashPrice: 1350,
          dailyPaymentPrice: 1420,
          monthlyCreditPrice: 1500,
          notes: 'প্রতি কেজি রেট',
        },
      ],
      notes: lang === 'bn' 
        ? 'বিশেষ দ্রষ্টব্য: আন্তর্জাতিক বাজার দর ও ডলার/RMB এর ওঠানামার উপর ভিত্তি করে দর পরিবর্তনশীল।' 
        : 'Note: Prices are subject to daily international currency and metal scrap market fluctuations.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [priceLists, selectedListId, companyInfo, lang, todayStr]);

  // Search & Filter within active price list
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);

  // New List Modal State
  const [newListTitle, setNewListTitle] = useState(lang === 'bn' ? 'আজকের বাজার দর তালিকা' : "Today's Price List");
  const [newListDate, setNewListDate] = useState(todayStr);

  // Company Details Edit for Active Price List
  const [compName, setCompName] = useState(activeList.companyName || companyInfo.name);
  const [compAddress, setCompAddress] = useState(activeList.companyAddress || companyInfo.address);
  const [compPhones, setCompPhones] = useState(activeList.companyPhones?.join(', ') || companyInfo.phones?.join(', ') || '');
  const [compLogoUrl, setCompLogoUrl] = useState(activeList.companyLogoUrl || companyInfo.logoUrl || '');
  const [listNotes, setListNotes] = useState(activeList.notes || '');

  // Item Modal State
  const [formItemName, setFormItemName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState<'pcs' | 'kg'>('pcs');
  const [formCashPrice, setFormCashPrice] = useState<number>(0);
  const [formDailyPrice, setFormDailyPrice] = useState<number>(0);
  const [formMonthlyPrice, setFormMonthlyPrice] = useState<number>(0);
  const [formItemNotes, setFormItemNotes] = useState('');

  // Filtered Items for Display
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return activeList.items || [];
    const term = searchTerm.toLowerCase();
    return (activeList.items || []).filter(
      (item) =>
        item.productName.toLowerCase().includes(term) ||
        (item.notes && item.notes.toLowerCase().includes(term))
    );
  }, [activeList.items, searchTerm]);

  // Handle Save New Price List
  const handleCreateNewPriceList = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `pl-${Date.now()}`;
    const newList: PriceList = {
      id,
      title: newListTitle.trim() || (lang === 'bn' ? 'নতুন দর তালিকা' : 'New Price List'),
      date: newListDate || todayStr,
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      companyPhones: companyInfo.phones || [],
      companyLogoUrl: companyInfo.logoUrl,
      items: activeList.items.map((it) => ({
        ...it,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      })),
      notes: activeList.notes,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSavePriceList(newList);
    setSelectedListId(id);
    setIsNewListModalOpen(false);
  };

  // Handle Import from Stock Products
  const handleImportFromStock = () => {
    if (stock.length === 0) {
      alert(lang === 'bn' ? 'স্টকে কোনো মাল পাওয়া যায়নি!' : 'No stock items found in inventory!');
      return;
    }
    const importedItems: PriceListItem[] = stock.map((stk) => {
      const baseRate = stk.purchaseRate || stk.purchaseAvgRate || 200;
      // Suggested baseline retail prices with 3 columns:
      const cash = Math.round(baseRate * 1.15); // +15% cash margin
      const daily = Math.round(baseRate * 1.25); // +25% daily installment
      const monthly = Math.round(baseRate * 1.35); // +35% monthly credit
      return {
        id: `pl-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productName: stk.nameBn || stk.nameEn,
        category: stk.category,
        code: stk.code,
        unit: stk.unit || 'pcs',
        cashPrice: cash,
        dailyPaymentPrice: daily,
        monthlyCreditPrice: monthly,
        notes: stk.code ? `কোড: ${stk.code}` : '',
      };
    });

    const updated: PriceList = {
      ...activeList,
      items: importedItems,
      updatedAt: new Date().toISOString(),
    };
    onSavePriceList(updated);
    alert(
      lang === 'bn'
        ? `স্টক থেকে ${stock.length} টি পণ্য সফলভাবে মূল্য তালিকায় যুক্ত হয়েছে!`
        : `Successfully imported ${stock.length} products from stock into price list!`
    );
  };

  // Open Item Modal
  const openNewItemModal = () => {
    setEditingItem(null);
    setFormItemName('');
    setFormCategory('android');
    setFormUnit('pcs');
    setFormCashPrice(300);
    setFormDailyPrice(320);
    setFormMonthlyPrice(350);
    setFormItemNotes('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: PriceListItem) => {
    setEditingItem(item);
    setFormItemName(item.productName);
    setFormCategory(item.category || '');
    setFormUnit(item.unit || 'pcs');
    setFormCashPrice(item.cashPrice || 0);
    setFormDailyPrice(item.dailyPaymentPrice || 0);
    setFormMonthlyPrice(item.monthlyCreditPrice || 0);
    setFormItemNotes(item.notes || '');
    setIsItemModalOpen(true);
  };

  // Save Item in Active List
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName.trim()) {
      alert(lang === 'bn' ? 'পণ্যের নাম দিন' : 'Product name is required');
      return;
    }

    let updatedItems: PriceListItem[];
    if (editingItem) {
      updatedItems = activeList.items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              productName: formItemName.trim(),
              category: formCategory,
              unit: formUnit,
              cashPrice: Number(formCashPrice) || 0,
              dailyPaymentPrice: Number(formDailyPrice) || 0,
              monthlyCreditPrice: Number(formMonthlyPrice) || 0,
              notes: formItemNotes.trim(),
            }
          : i
      );
    } else {
      const newItem: PriceListItem = {
        id: `item-${Date.now()}`,
        productName: formItemName.trim(),
        category: formCategory,
        unit: formUnit,
        cashPrice: Number(formCashPrice) || 0,
        dailyPaymentPrice: Number(formDailyPrice) || 0,
        monthlyCreditPrice: Number(formMonthlyPrice) || 0,
        notes: formItemNotes.trim(),
      };
      updatedItems = [...activeList.items, newItem];
    }

    const updatedList: PriceList = {
      ...activeList,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    onSavePriceList(updatedList);
    setIsItemModalOpen(false);
  };

  // Delete Item
  const handleDeleteItem = (itemId: string) => {
    if (!confirm(lang === 'bn' ? 'পণ্যটি দর তালিকা থেকে মুছে ফেলতে চান?' : 'Remove product from price list?')) return;
    const updated: PriceList = {
      ...activeList,
      items: activeList.items.filter((i) => i.id !== itemId),
      updatedAt: new Date().toISOString(),
    };
    onSavePriceList(updated);
  };

  // Save Company Header Settings for Price List
  const handleSaveCompanyHeader = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PriceList = {
      ...activeList,
      companyName: compName.trim() || companyInfo.name,
      companyAddress: compAddress.trim() || companyInfo.address,
      companyPhones: compPhones
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      companyLogoUrl: compLogoUrl.trim(),
      notes: listNotes.trim(),
      updatedAt: new Date().toISOString(),
    };
    onSavePriceList(updated);
    setIsEditCompanyModalOpen(false);
  };

  // Generate WhatsApp Structured Text Summary
  const getWhatsAppPriceListText = () => {
    const header = `*${activeList.companyName || companyInfo.name}*
📋 *${activeList.title}*
📅 তারিখ: ${activeList.date}
📍 ${activeList.companyAddress || companyInfo.address}
📞 মোবাইল: ${(activeList.companyPhones || companyInfo.phones || []).join(', ')}
━━━━━━━━━━━━━━━━━━━━
*পণ্যের বাজার দর তালিকা (৩ ধরনের মূল্য):*`;

    const itemsText = (activeList.items || [])
      .map((it, idx) => {
        return `\n${idx + 1}. *${it.productName}* (${it.unit})
   💵 ১০০% নগদ মূল্য: ৳${it.cashPrice}
   📅 প্রতিদিন ১টি করে পেমেন্ট: ৳${it.dailyPaymentPrice}
   ⏳ ১ মাসের বাকি পেমেন্ট: ৳${it.monthlyCreditPrice}${it.notes ? `\n   ℹ️ ${it.notes}` : ''}`;
      })
      .join('\n');

    const footer = `\n━━━━━━━━━━━━━━━━━━━━
${activeList.notes ? `*শর্তাবলী / নোট:* ${activeList.notes}\n` : ''}ধন্যবাদান্তে,
${activeList.companyName || companyInfo.name}`;

    return `${header}\n${itemsText}\n${footer}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-amber-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Tag className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'বাজার দর ওঠানামা ও নির্ধারিত মূল্য' : 'Daily Market Price List'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {lang === 'bn' ? 'দর তালিকা তৈরি ও ব্যবস্থাপনা' : 'Price List Make & Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            {lang === 'bn'
              ? 'সার্কিট ও মাদারবোর্ডের নিত্যদিনের বাজার দর নির্ধারণ। ৩টি নির্দিষ্ট কলাম: ১০০% নগদ মূল্য, প্রতিদিন ১টি করে পেমেন্ট দর, এবং ১ মাসের বাকি মূল্য।'
              : 'Create dynamic market price sheets with 3 specific payment tiers: 100% Cash Price, Daily Installment Price, and 1-Month Credit Price.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsNewListModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ নতুন দর তালিকা' : '+ New Price List'}</span>
          </button>

          <button
            onClick={handleImportFromStock}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
            title="ইনভেন্টরি স্টক থেকে স্বয়ংক্রিয়ভাবে সব পণ্য লোড করুন"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{lang === 'bn' ? 'স্টক থেকে ইম্পোর্ট' : 'Import Stock'}</span>
          </button>

          <button
            onClick={() => {
              setCompName(activeList.companyName || companyInfo.name);
              setCompAddress(activeList.companyAddress || companyInfo.address);
              setCompPhones(activeList.companyPhones?.join(', ') || companyInfo.phones?.join(', ') || '');
              setCompLogoUrl(activeList.companyLogoUrl || companyInfo.logoUrl || '');
              setListNotes(activeList.notes || '');
              setIsEditCompanyModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs cursor-pointer border border-white/10"
          >
            <Building className="w-4 h-4 text-amber-300" />
            <span>{lang === 'bn' ? 'কোম্পানি ও শর্তাবলী' : 'Company & Header'}</span>
          </button>

          <button
            onClick={() => executePrint('rsr-price-list-print')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? '১-পেজ A4 প্রিন্ট' : '1-Page A4 Print'}</span>
          </button>

          <WhatsAppShareDropdown
            getText={getWhatsAppPriceListText}
            lang={lang}
            targetElementId="rsr-price-list-print"
            fileName={`price-list-${activeList.date}.png`}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}
          />

          <WeChatShareDropdown
            getText={getWhatsAppPriceListText}
            lang={lang}
            targetElementId="rsr-price-list-print"
            fileName={`wechat-price-list-${activeList.date}.png`}
            buttonLabel={lang === 'bn' ? 'উইচ্যাট' : 'WeChat'}
          />
        </div>
      </div>

      {/* Selector & KPI Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'তালিকা নির্বাচন:' : 'Select List:'}
            </span>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer"
            >
              {priceLists.length === 0 ? (
                <option value="default-list">{activeList.title} ({activeList.date})</option>
              ) : (
                priceLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.title} — {pl.date} ({pl.items?.length || 0} টি পণ্য)
                  </option>
                ))
              )}
            </select>
          </div>

          {priceLists.length > 1 && isSuperAdmin && (
            <button
              onClick={() => {
                if (confirm(lang === 'bn' ? 'এই তালিকাটি ডিলিট করতে চান?' : 'Delete this price list?')) {
                  onDeletePriceList(activeList.id);
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              title="ডিলিট করুন"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'bn' ? 'পণ্য খুঁজুন...' : 'Search product...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={openNewItemModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? '+ পণ্য যোগ করুন' : '+ Add Item'}</span>
          </button>
        </div>
      </div>

      {/* 3 Price Columns Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1: 100% Cash Price */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>১. ১০০% নগদ মূল্য (100% Cash)</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
              সম্পূর্ণ ক্যাশ পেমেন্ট বা তাত্ক্ষণিক লেনদেন
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              সবচেয়ে সাশ্রয়ী নগদ ক্রয়-বিক্রয় রেট
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
            100%
          </div>
        </div>

        {/* Tier 2: Daily Installment Price */}
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>২. প্রতিদিন ১টি করে পেমেন্ট</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
              দৈনিক কিস্তি ভিত্তিক পরিশোধ পদ্ধতি
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              প্রতিদিন ১টি করে পণ্যমূল্য পরিশোধের বিশেষ সুবিধা
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
            1/Day
          </div>
        </div>

        {/* Tier 3: 1 Month Credit Price */}
        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>৩. ১ মাসের বাকি পেমেন্ট</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
              ৩০ দিনের ক্রেডিট / বকেয়া মূল্য
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              পূর্ণ ১ মাস মেয়াদি বাকিতে ক্রয়ের জন্য নির্ধারিত রেট
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
            30D
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {activeList.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeList.companyName || companyInfo.name} • তারিখ: {activeList.date} • মোট {activeList.items?.length || 0} টি পণ্য
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold rounded-full">
            বাজার ওঠানামা রেট শিট
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 w-12 text-center text-white font-bold">নং</th>
                <th className="p-3 text-white font-bold">পণ্যের বিবরণ / মডেল</th>
                <th className="p-3 text-center text-white font-bold">একক</th>
                {/* 3 Mandatory Price Columns */}
                <th className="p-3 text-right text-emerald-300 font-bold">
                  ১. ১০০% নগদ মূল্য (৳)
                </th>
                <th className="p-3 text-right text-cyan-300 font-bold">
                  ২. প্রতিদিন ১টি করে পেমেন্ট (৳)
                </th>
                <th className="p-3 text-right text-purple-300 font-bold">
                  ৩. ১ মাসের বাকি পেমেন্ট (৳)
                </th>
                <th className="p-3 text-white font-bold">মন্তব্য / বিবরণ</th>
                <th className="p-3 text-center text-white font-bold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {lang === 'bn'
                      ? 'দর তালিকায় কোনো পণ্য পাওয়া যায়নি। "+ পণ্য যোগ করুন" বা "স্টক থেকে ইম্পোর্ট" বাটনে চাপ দিন।'
                      : 'No products in price list. Click "+ Add Item" or "Import Stock".'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      <div>{item.productName}</div>
                      {item.code && (
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          কোড: {item.code}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.unit === 'kg' ? 'কেজি' : 'পিস'}
                      </span>
                    </td>
                    {/* Price Column 1 */}
                    <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50/20 dark:bg-emerald-950/10">
                      ৳{Number(item.cashPrice).toLocaleString()}
                    </td>
                    {/* Price Column 2 */}
                    <td className="p-3 text-right font-mono font-black text-blue-600 dark:text-blue-400 text-sm bg-blue-50/20 dark:bg-blue-950/10">
                      ৳{Number(item.dailyPaymentPrice).toLocaleString()}
                    </td>
                    {/* Price Column 3 */}
                    <td className="p-3 text-right font-mono font-black text-purple-600 dark:text-purple-400 text-sm bg-purple-50/20 dark:bg-purple-950/10">
                      ৳{Number(item.monthlyCreditPrice).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {item.notes || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                          title="এডিট করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable 1-Page A4 Sheet (Target for Print, WhatsApp & WeChat High-def Image Capture) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 1, pointerEvents: 'none', zIndex: -100 }}>
        <div
          id="rsr-price-list-print"
          style={{
            width: '794px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '36px',
            boxSizing: 'border-box',
            fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
            fontSize: '12px',
            lineHeight: 1.4,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <CompanyLogo customLogoUrl={activeList.companyLogoUrl || companyInfo.logoUrl} className="w-16 h-16" />
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  {activeList.companyName || companyInfo.name}
                </h1>
                <p style={{ margin: '2px 0', fontSize: '11px', color: '#475569' }}>
                  {companyInfo.businessTypeBn}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                  {activeList.companyAddress || companyInfo.address}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 600, color: '#0369a1' }}>
                  মোবাইল: {(activeList.companyPhones || companyInfo.phones || []).join(', ')}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                অফিসিয়াল দর তালিকা
              </div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {activeList.title}
              </h2>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                তারিখ: <strong>{activeList.date}</strong>
              </div>
            </div>
          </div>

          {/* Pricing Explanatory Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ borderLeft: '3px solid #059669', paddingLeft: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>১. ১০০% নগদ মূল্য</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>সম্পূর্ণ ক্যাশ পেমেন্ট রেট</div>
            </div>
            <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>২. প্রতিদিন ১টি করে পেমেন্ট</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>দৈনিক কিস্তি ভিত্তিক পরিশোধ</div>
            </div>
            <div style={{ borderLeft: '3px solid #7c3aed', paddingLeft: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>৩. ১ মাসের বাকি পেমেন্ট</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>৩০ দিনের ক্রেডিট দর</div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', fontSize: '11px' }}>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '36px', border: '1px solid #334155' }}>নং</th>
                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #334155' }}>পণ্যের নাম / মডেল</th>
                <th style={{ padding: '8px', textAlign: 'center', width: '48px', border: '1px solid #334155' }}>একক</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '110px', backgroundColor: '#064e3b', border: '1px solid #334155' }}>
                  ১. নগদ মূল্য (৳)
                </th>
                <th style={{ padding: '8px', textAlign: 'right', width: '120px', backgroundColor: '#1e3a8a', border: '1px solid #334155' }}>
                  ২. প্রতিদিন ১টি (৳)
                </th>
                <th style={{ padding: '8px', textAlign: 'right', width: '120px', backgroundColor: '#4c1d95', border: '1px solid #334155' }}>
                  ৩. ১ মাস বাকি (৳)
                </th>
                <th style={{ padding: '8px', textAlign: 'left', width: '110px', border: '1px solid #334155' }}>মন্তব্য</th>
              </tr>
            </thead>
            <tbody>
              {activeList.items?.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    fontSize: '11px',
                  }}
                >
                  <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                    {item.productName}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                    {item.unit === 'kg' ? 'কেজি' : 'পিস'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#065f46', border: '1px solid #cbd5e1' }}>
                    ৳{Number(item.cashPrice).toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1e40af', border: '1px solid #cbd5e1' }}>
                    ৳{Number(item.dailyPaymentPrice).toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#5b21b6', border: '1px solid #cbd5e1' }}>
                    ৳{Number(item.monthlyCreditPrice).toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#64748b', fontSize: '10px', border: '1px solid #cbd5e1' }}>
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Notes and Terms */}
          {activeList.notes && (
            <div style={{ border: '1px dashed #cbd5e1', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#f8fafc', marginBottom: '40px' }}>
              <strong style={{ color: '#0f172a', fontSize: '11px' }}>শর্তাবলী / নোট: </strong>
              <span style={{ color: '#475569', fontSize: '11px' }}>{activeList.notes}</span>
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px', paddingTop: '20px' }}>
            <div style={{ textAlign: 'center', width: '180px' }}>
              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '6px', fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                হিসাবরক্ষক / প্রস্তুতকারী
              </div>
            </div>

            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px', fontSize: '12px', color: '#0f172a', fontWeight: 700 }}>
                কর্তৃপক্ষের স্বাক্ষর ও সিলমোহর
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                {activeList.companyName || companyInfo.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Add/Edit Price List Item */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>{editingItem ? 'পণ্য ও মূল্য সংশোধন' : 'নতুন পণ্য ও ৩ ধরনের মূল্য যোগ'}</span>
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  পণ্যের বিবরণ ও মডেল নাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: Android 4G/5G Mainboard"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    ক্যাটাগরি
                  </label>
                  <input
                    type="text"
                    placeholder="android / code / kg / button"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    একক (Unit)
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as 'pcs' | 'kg')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <option value="pcs">পিস (PCS)</option>
                    <option value="kg">কেজি (KG)</option>
                  </select>
                </div>
              </div>

              {/* 3 Price Columns Input Fields */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  ৩টি নির্দিষ্ট মূল্য নির্ধারণ:
                </div>

                <div>
                  <label className="block font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    ১. ১০০% নগদ মূল্য (100% Cash Price) ৳ *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formCashPrice}
                    onChange={(e) => setFormCashPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-blue-700 dark:text-blue-400 mb-1">
                    ২. প্রতিদিন ১টি করে পেমেন্ট (Daily Payment Price) ৳ *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formDailyPrice}
                    onChange={(e) => setFormDailyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-purple-700 dark:text-purple-400 mb-1">
                    ৩. ১ মাসের বাকি পেমেন্ট (1 Month Credit Price) ৳ *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formMonthlyPrice}
                    onChange={(e) => setFormMonthlyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  মন্তব্য / বিবরণ
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ফ্রেশ বোর্ড, ফ্রেম সহ"
                  value={formItemNotes}
                  onChange={(e) => setFormItemNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create New Price List */}
      {isNewListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>নতুন দর তালিকা তৈরি</span>
              </h3>
              <button
                onClick={() => setIsNewListModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPriceList} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  তালিকার শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  তারিখ
                </label>
                <input
                  type="date"
                  value={newListDate}
                  onChange={(e) => setNewListDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                টিপস: নতুন তালিকা তৈরি করার পর আগের আইটেমগুলো স্বয়ংক্রিয় কপি থাকবে এবং প্রয়োজনমতো এডিট করা যাবে।
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewListModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Company Header & Terms Customization */}
      {isEditCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-500" />
                <span>দর তালিকার কোম্পানি ও হেডার তথ্য</span>
              </h3>
              <button
                onClick={() => setIsEditCompanyModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyHeader} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  কোম্পানির নাম (Company Name)
                </label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  ঠিকানা (Address)
                </label>
                <input
                  type="text"
                  value={compAddress}
                  onChange={(e) => setCompAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  মোবাইল নাম্বার (কমা দিয়ে একাধিক দিতে পারেন)
                </label>
                <input
                  type="text"
                  value={compPhones}
                  onChange={(e) => setCompPhones(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  কোম্পানি লোগো URL (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="https://... বা ফাঁকা রাখুন"
                  value={compLogoUrl}
                  onChange={(e) => setCompLogoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  দর তালিকার বিশেষ নোট ও শর্তাবলী
                </label>
                <textarea
                  rows={3}
                  value={listNotes}
                  onChange={(e) => setListNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  হেডার আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
