import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Printer,
  Share2,
  Save,
  Building,
  Truck,
  ArrowRight,
} from 'lucide-react';
import {
  Language,
  Invoice,
  InvoiceItem,
  InvoiceType,
  InvoiceMode,
  StockCategory,
  Party,
  StockItem,
} from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
} from '../lib/translations';
import { storageService } from '../lib/storage';
import { CompanyLogo } from './CompanyLogo';

interface InvoiceModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  parties: Party[];
  stock: StockItem[];
  existingInvoice?: Invoice | null;
  onPrint: (invoice: Invoice) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  lang,
  isOpen,
  onClose,
  onSave,
  parties,
  stock,
  existingInvoice,
  onPrint,
}) => {
  const t = translations[lang];
  const companyInfo = storageService.getCompanyInfo();

  // Invoice Fields
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('general');
  const [mode, setMode] = useState<InvoiceMode>('purchase');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Party Fields
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('');
  const [partyPhone, setPartyPhone] = useState<string>('');
  const [partyAddress, setPartyAddress] = useState<string>('');
  const [previousBalance, setPreviousBalance] = useState<number>(0);

  // Items (Up to 40 items supported)
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Financials - Only Courier deduction and notes (Discount, Paid/Cash, Payment method removed per requirement)
  const [courierDeduction, setCourierDeduction] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Initializer / Reset
  useEffect(() => {
    if (existingInvoice) {
      setInvoiceType(existingInvoice.type);
      setMode(existingInvoice.mode);
      setInvoiceNo(existingInvoice.invoiceNo);
      setDate(existingInvoice.date);
      setSelectedPartyId(existingInvoice.partyId || '');
      setPartyName(existingInvoice.partyName);
      setPartyPhone(existingInvoice.partyPhone || '');
      setPartyAddress(existingInvoice.partyAddress || '');
      setPreviousBalance(existingInvoice.previousBalance || 0);
      setItems(existingInvoice.items);
      setCourierDeduction(existingInvoice.courierDeduction || 0);
      setNotes(existingInvoice.notes || '');
    } else {
      // Auto-generate sequence number based on type and mode
      const prefix =
        invoiceType === 'processing'
          ? 'VVT-PROC'
          : invoiceType === 'commercial'
          ? 'RSR-COM'
          : invoiceType === 'dokan'
          ? 'RSR-DOK'
          : mode === 'purchase'
          ? 'RSR-PUR'
          : 'RSR-SAL';
      const seq = Math.floor(100 + Math.random() * 900);
      setInvoiceNo(`${prefix}-${new Date().getFullYear()}-${seq}`);
      setDate(new Date().toISOString().split('T')[0]);
      setItems([
        {
          id: `item-${Date.now()}-1`,
          category: 'android',
          name: '',
          code: '',
          quantity: 0,
          unit: 'pcs',
          unitPrice: 0,
          total: 0,
        },
      ]);
      setCourierDeduction(0);
      setNotes('');
      setSelectedPartyId('');
      setPartyName('');
      setPartyPhone('');
      setPartyAddress('');
      setPreviousBalance(0);
    }
  }, [existingInvoice, isOpen]);

  // When invoiceType changes to Processing, update header notice
  useEffect(() => {
    if (invoiceType === 'processing') {
      if (!partyName) {
        setPartyName('প্রসেসিং সেকশন চালান (Vai Vai Trades 5G)');
      }
      if (!existingInvoice) {
        const seq = Math.floor(100 + Math.random() * 900);
        setInvoiceNo(`VVT-PROC-${new Date().getFullYear()}-${seq}`);
      }
    }
  }, [invoiceType]);

  // When Party is selected from dropdown
  const handlePartySelect = (partyId: string) => {
    setSelectedPartyId(partyId);
    if (!partyId) {
      setPreviousBalance(0);
      return;
    }
    const found = parties.find((p) => p.id === partyId);
    if (found) {
      setPartyName(found.name);
      setPartyPhone(found.phone);
      setPartyAddress(found.address);
      const netPrev = (found.currentDue || 0) - (found.currentAdvance || 0);
      setPreviousBalance(netPrev);
    }
  };

  // Item Calculations
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    const q = field === 'quantity' ? Number(value) : current.quantity;
    const r = field === 'unitPrice' ? Number(value) : current.unitPrice;
    const u = field === 'unit' ? value : current.unit;
    const basis = field === 'rateBasis' ? value : (current.rateBasis || (u === 'gm' ? 'per_kg' : 'per_unit'));

    if (u === 'gm' && basis === 'per_kg') {
      current.total = Math.round(((q || 0) / 1000) * (r || 0));
    } else {
      current.total = Math.round((q || 0) * (r || 0));
    }
    current.rateBasis = basis;
    updated[index] = current;
    setItems(updated);
  };

  // Direct Gram Input Helper (e.g. entering 60 grams avoids typing 0.06)
  const updateItemGrams = (index: number, gramsVal: number) => {
    const updated = [...items];
    const current = { ...updated[index] };
    current.inputGrams = gramsVal;

    if (current.unit === 'gm') {
      current.quantity = gramsVal;
      const basis = current.rateBasis || 'per_kg';
      if (basis === 'per_kg') {
        current.total = Math.round(((gramsVal || 0) / 1000) * (current.unitPrice || 0));
      } else {
        current.total = Math.round((gramsVal || 0) * (current.unitPrice || 0));
      }
    } else {
      // Unit is KG: Automatically converts grams to kg (e.g. 60 gm -> 0.06 kg)
      const kgVal = Math.round((gramsVal / 1000) * 1000) / 1000;
      current.quantity = kgVal;
      current.total = Math.round((kgVal || 0) * (current.unitPrice || 0));
    }
    updated[index] = current;
    setItems(updated);
  };

  // Quick preset item selector: Sets name, code, category, unit; Qty and Rate are intentionally left BLANK per requirement!
  const handleApplyPresetStockItem = (index: number, stockId: string) => {
    const st = stock.find((s) => s.id === stockId);
    if (!st) return;
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      name: lang === 'bn' ? st.nameBn : st.nameEn,
      code: st.code,
      category: st.category,
      unit: st.unit,
      quantity: 0, // blank per requirement: "invoice e product select korle qty & rate er ghor faka thakbe"
      unitPrice: 0, // blank per requirement
      total: 0,
    };
    setItems(updated);

    // Automatically focus the quantity cell so user can type immediately
    setTimeout(() => {
      const qtyInput = document.querySelector<HTMLInputElement>(`[data-cell="${index}-2"]`);
      qtyInput?.focus();
      qtyInput?.select();
    }, 60);
  };

  // Lookup in-stock quantity for an item (displayed in UI only, omitted from print)
  const getStockForItem = (it: InvoiceItem) => {
    if (!it.code && !it.name) return null;
    return stock.find(
      (s) =>
        (it.code && s.code.toLowerCase() === it.code.toLowerCase()) ||
        s.nameBn.toLowerCase() === it.name.toLowerCase() ||
        s.nameEn.toLowerCase() === it.name.toLowerCase()
    );
  };

  // Keyboard Enter key navigation: Moves focus from cell to next cell; on last cell of row, adds/moves to next row!
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Columns: 0: name, 1: category, 2: qty, 3: unit, 4: rate
      if (colIndex < 4) {
        const nextCell = document.querySelector<HTMLElement>(`[data-cell="${rowIndex}-${colIndex + 1}"]`);
        nextCell?.focus();
      } else {
        // Last cell in row (rate)
        if (rowIndex === items.length - 1) {
          if (items.length < 40) {
            handleAddRow();
            setTimeout(() => {
              const newRowName = document.querySelector<HTMLElement>(`[data-cell="${rowIndex + 1}-0"]`);
              newRowName?.focus();
            }, 60);
          }
        } else {
          const nextRowName = document.querySelector<HTMLElement>(`[data-cell="${rowIndex + 1}-0"]`);
          nextRowName?.focus();
        }
      }
    }
  };

  // Add Row (Up to 40 items)
  const handleAddRow = () => {
    if (items.length >= 40) {
      alert(lang === 'bn' ? 'সর্বোচ্চ ৪০ টি পণ্য একসাথে যুক্ত করা যাবে!' : 'Maximum 40 products allowed per invoice!');
      return;
    }
    setItems([
      ...items,
      {
        id: `it-${Date.now()}-${items.length + 1}`,
        category: 'android',
        name: '',
        code: '',
        quantity: 0,
        unit: 'pcs',
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  // Remove Row
  const handleRemoveRow = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial Totals: Subtotal - Courier Deduction + Previous Balance
  const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const netInvoiceAmount = Math.max(0, subtotal - courierDeduction);
  const grandTotal = netInvoiceAmount + (invoiceType !== 'processing' ? previousBalance : 0);

  const buildInvoiceObject = (): Invoice | null => {
    if (!partyName.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে পার্টির নাম দিন' : 'Please provide party name');
      return null;
    }

    if (items.length === 0 || !items[0].name.trim()) {
      alert(lang === 'bn' ? 'কমপক্ষে একটি পণ্যের বিবরণ লিখুন' : 'Please add at least one product');
      return null;
    }

    return {
      id: existingInvoice ? existingInvoice.id : `inv-${Date.now()}`,
      invoiceNo: invoiceNo.trim() || `INV-${Date.now()}`,
      type: invoiceType,
      mode,
      partyId: invoiceType !== 'processing' ? selectedPartyId : undefined,
      partyName,
      partyPhone,
      partyAddress,
      date,
      items,
      subtotal,
      courierDeduction,
      discount: 0,
      netInvoiceAmount,
      previousBalance: invoiceType !== 'processing' ? previousBalance : 0,
      grandTotal,
      paidAmount: 0,
      remainingDue: grandTotal,
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
      notes,
      createdAt: existingInvoice ? existingInvoice.createdAt : new Date().toISOString(),
    };
  };

  // Save Invoice
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newInvoice = buildInvoiceObject();
    if (!newInvoice) return;
    onSave(newInvoice);
    onClose();
  };

  // Save & Print Invoice immediately
  const handleSaveAndPrint = () => {
    const newInvoice = buildInvoiceObject();
    if (!newInvoice) return;
    onSave(newInvoice);
    onPrint(newInvoice);
    onClose();
  };

  // Direct WhatsApp Share
  const handleWhatsAppShare = () => {
    const companyHeader =
      invoiceType === 'processing'
        ? companyInfo.processingName
        : companyInfo.name;

    const message = `*${companyHeader} - Invoice*
Invoice No: ${invoiceNo}
Date: ${date}
Type: ${invoiceType.toUpperCase()} (${mode.toUpperCase()})
Party: ${partyName}
Phone: ${partyPhone}
---------------------------
Items (${items.length}):
${items
  .slice(0, 5)
  .map(
    (it, i) =>
      `${i + 1}. ${it.name} - ${it.quantity} ${it.unit} @ ৳${it.unitPrice} = ৳${it.total}`
  )
  .join('\n')}
${items.length > 5 ? `... and ${items.length - 5} more items` : ''}
---------------------------
Subtotal: ৳${subtotal}
${courierDeduction > 0 ? `Courier Bill (-): ৳${courierDeduction}\n` : ''}Net Amount: ৳${netInvoiceAmount}
${previousBalance !== 0 ? `Previous Balance: ৳${previousBalance}\n` : ''}Grand Total: ৳${grandTotal}
---------------------------
Thank you for doing business with us!`;

    const encoded = encodeURIComponent(message);
    const url = partyPhone
      ? `https://wa.me/88${partyPhone.replace(/[^0-9]/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Bar with Dynamic Branding & Logo */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between text-white transition-colors ${
            invoiceType === 'processing'
              ? 'bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 border-purple-700'
              : 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  {invoiceType === 'processing'
                    ? companyInfo.processingName
                    : companyInfo.name}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    invoiceType === 'processing'
                      ? 'bg-purple-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {invoiceType.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {invoiceType === 'processing'
                  ? lang === 'bn'
                    ? 'প্রসেসিং ইনভয়েস (পার্টি লেজারের সাথে সরাসরি যুক্ত নয়)'
                    : 'Processing Invoice (Independent / unlinked from party ledger)'
                  : companyInfo.businessTypeBn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Top Options: 4 Invoice Types & Purchase/Sales Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* 4 Invoice Types */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.invoiceType} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'general', label: lang === 'bn' ? 'জেনারেল' : 'General' },
                    { id: 'processing', label: lang === 'bn' ? 'প্রসেসিং (5G)' : 'Processing' },
                    { id: 'dokan', label: lang === 'bn' ? 'দোকান' : 'Dokan' },
                    { id: 'commercial', label: lang === 'bn' ? 'কমার্শিয়াল' : 'Commercial' },
                  ] as const
                ).map((typeOpt) => (
                  <button
                    key={typeOpt.id}
                    type="button"
                    onClick={() => setInvoiceType(typeOpt.id)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${
                      invoiceType === typeOpt.id
                        ? typeOpt.id === 'processing'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {typeOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Mode: Purchase (Primary) / Sales */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.invoiceMode} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('purchase')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'purchase'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                  {t.purchaseMode}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sales')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === 'sales'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                  {t.salesMode}
                </button>
              </div>
            </div>
          </div>

          {/* Party Details & Sequence Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.invoiceNo}
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs font-bold text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.invoiceDate}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            {/* Select Registered Party (Unless processing invoice) */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.selectParty}
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => handlePartySelect(e.target.value)}
                disabled={invoiceType === 'processing'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 disabled:opacity-50"
              >
                <option value="">{t.selectParty}...</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.partyName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="পার্টি / মহাজনের নাম..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.partyPhone}
              </label>
              <input
                type="text"
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t.partyAddress}
              </label>
              <input
                type="text"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                placeholder="ঠিকানা (গুলিস্তান / ধোলাইখাল ইত্যাদি)"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Previous Balance auto-sync display */}
            <div className="sm:col-span-2 flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
              <span className="font-medium text-amber-900 dark:text-amber-200">
                {t.partyPrevBalance}:
              </span>
              <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                {invoiceType === 'processing'
                  ? lang === 'bn'
                    ? '০ (প্রসেসিং ইনভয়েসে প্রযোজ্য নয়)'
                    : '0 (Not applicable for processing)'
                  : previousBalance > 0
                  ? `${t.previousDue}: ৳${previousBalance}`
                  : previousBalance < 0
                  ? `${t.previousAdvance}: ৳${Math.abs(previousBalance)}`
                  : t.cleanAccount}
              </span>
            </div>
          </div>

          {/* Product Items Table (Up to 40 items supported with Keyboard Enter Navigation) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{t.productItems}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono">
                    {formatNumber(items.length, lang)} / {formatNumber(40, lang)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium hidden sm:inline-flex items-center gap-1">
                    <span>Enter কী চাপলে কার্সার পরবর্তী ঘরে যাবে</span>
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn'
                    ? 'দর বা রেট নিজে লিখে সেট করুন। প্রিসেট আইটেম বেছে নিলে স্টক মজুদ দেখতে পাবেন।'
                    : 'Enter rates manually as needed. In-stock quantity shown for preview only.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                disabled={items.length >= 40}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addProductRow}</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2 w-8 text-center">{t.sl}</th>
                    <th className="py-2.5 px-2 w-40">{lang === 'bn' ? 'স্টক প্রিসেট' : 'Stock Preset'}</th>
                    <th className="py-2.5 px-2">{t.itemDescription}</th>
                    <th className="py-2.5 px-2 w-24 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                      {lang === 'bn' ? 'মজুদ স্টক' : 'In Stock'}
                      <span className="block text-[8px] font-normal lowercase">(প্রিন্টে আসবে না)</span>
                    </th>
                    <th className="py-2.5 px-2 w-24">{t.category}</th>
                    <th className="py-2.5 px-2 w-20 text-center">{t.qty}</th>
                    <th className="py-2.5 px-2 w-16 text-center">{t.unit}</th>
                    <th className="py-2.5 px-2 w-24 text-right">{t.rate} (৳)</th>
                    <th className="py-2.5 px-2 w-28 text-right">{t.amount}</th>
                    <th className="py-2.5 px-2 w-10 text-center">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {items.map((it, idx) => {
                    const matchedStock = getStockForItem(it);
                    return (
                      <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-2 text-center font-mono font-medium text-slate-500">
                          {formatNumber(idx + 1, lang)}
                        </td>
                        {/* Preset Picker */}
                        <td className="py-2 px-2">
                          <select
                            onChange={(e) => handleApplyPresetStockItem(idx, e.target.value)}
                            className="w-full py-1 px-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
                            defaultValue=""
                          >
                            <option value="">{lang === 'bn' ? 'প্রিসেট বাছাই...' : 'Select item...'}</option>
                            {stock.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.code} - {lang === 'bn' ? s.nameBn : s.nameEn}
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* Name / Description - Cell 0 */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            data-cell={`${idx}-0`}
                            value={it.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 0)}
                            placeholder="মালের নাম..."
                            className="w-full py-1 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                            required
                          />
                        </td>
                        {/* Current In-Stock Display (Excluded from Print) */}
                        <td className="py-2 px-2 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          {matchedStock ? (
                            <div className="flex flex-col items-center">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  matchedStock.quantity <= 0
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : matchedStock.quantity <= matchedStock.minAlertQty
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                                title={
                                  lang === 'bn'
                                    ? `গড় ক্রয় দর: ৳${matchedStock.purchaseAvgRate || matchedStock.purchaseRate}`
                                    : `Avg Rate: ৳${matchedStock.purchaseAvgRate || matchedStock.purchaseRate}`
                                }
                              >
                                {formatNumber(matchedStock.quantity, lang)} {matchedStock.unit}
                              </span>
                              {matchedStock.purchaseAvgRate ? (
                                <span className="text-[9px] text-slate-400 font-mono">
                                  গড়: ৳{matchedStock.purchaseAvgRate}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        {/* Category - Cell 1 */}
                        <td className="py-2 px-2">
                          <select
                            data-cell={`${idx}-1`}
                            value={it.category}
                            onChange={(e) => updateItem(idx, 'category', e.target.value as StockCategory)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 1)}
                            className="w-full py-1 px-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          >
                            <option value="code">{t.codeItem}</option>
                            <option value="android">{t.androidItem}</option>
                            <option value="kg">{t.kgItem}</option>
                            <option value="pcs_blank">{t.pcsBlankItem}</option>
                          </select>
                        </td>
                        {/* Quantity - Cell 2 */}
                        <td className="py-2 px-2 text-center min-w-[130px]">
                          <div className="space-y-1">
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                data-cell={`${idx}-2`}
                                value={it.quantity === 0 ? '' : it.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => handleCellKeyDown(e, idx, 2)}
                                placeholder={it.unit === 'gm' ? (lang === 'bn' ? 'গ্রাম...' : 'Grams...') : (lang === 'bn' ? 'পরিমাণ...' : 'Qty...')}
                                className="w-full py-1 px-1.5 text-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden text-xs"
                              />
                              {it.unit === 'gm' && (
                                <span className="absolute right-1.5 top-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 font-mono pointer-events-none">
                                  {lang === 'bn' ? 'গ্রাম' : 'gm'}
                                </span>
                              )}
                            </div>

                            {/* Grams Quick Input for KG/GM: Avoid typing 0.06 or decimals */}
                            {(it.unit === 'kg' || it.unit === 'gm') && (
                              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 text-[10px]">
                                <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 shrink-0">
                                  {lang === 'bn' ? '⚖️ গ্রাম:' : '⚖️ Gm:'}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={it.inputGrams || (it.unit === 'gm' ? (it.quantity || '') : (it.quantity ? Math.round(it.quantity * 1000) : ''))}
                                  onChange={(e) => updateItemGrams(idx, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                  placeholder={lang === 'bn' ? 'যেমন: ৬০' : 'e.g. 60'}
                                  className="w-full text-center bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded px-1 py-0.5 font-mono text-[10px] text-amber-900 dark:text-amber-200 focus:outline-hidden"
                                  title={lang === 'bn' ? 'এখানে সরাসরি গ্রাম লিখুন (যেমন: ৬০ দিলে স্বয়ংক্রিয় ০.০৬ কেজি হবে)' : 'Enter grams directly without typing decimals'}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Unit - Cell 3 */}
                        <td className="py-2 px-2 text-center min-w-[85px]">
                          <select
                            data-cell={`${idx}-3`}
                            value={it.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 3)}
                            className="w-full py-1 px-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          >
                            <option value="pcs">Pcs (পিস)</option>
                            <option value="kg">KG (কেজি)</option>
                            <option value="gm">GM (গ্রাম)</option>
                            <option value="lot">Lot (লট)</option>
                          </select>
                        </td>
                        {/* Rate (Manually Entered) - Cell 4 */}
                        <td className="py-2 px-2 text-right min-w-[110px]">
                          <div className="space-y-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              data-cell={`${idx}-4`}
                              value={it.unitPrice === 0 ? '' : it.unitPrice}
                              onChange={(e) => updateItem(idx, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => handleCellKeyDown(e, idx, 4)}
                              placeholder={lang === 'bn' ? 'দর...' : 'Rate...'}
                              className="w-full py-1 px-1.5 text-right rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden placeholder:text-slate-400 placeholder:font-normal text-xs"
                            />
                            {it.unit === 'gm' && (
                              <button
                                type="button"
                                onClick={() => updateItem(idx, 'rateBasis', it.rateBasis === 'per_gm' ? 'per_kg' : 'per_gm')}
                                className="w-full text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer hover:bg-slate-200"
                                title="দর মোড পরিবর্তন করতে ক্লিক করুন"
                              >
                                {it.rateBasis === 'per_gm'
                                  ? (lang === 'bn' ? 'দর: ৳/গ্রাম' : 'Rate: ৳/gm')
                                  : (lang === 'bn' ? 'দর: ৳/কেজি' : 'Rate: ৳/kg')}
                              </button>
                            )}
                          </div>
                        </td>
                        {/* Row Total */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ৳{it.total.toLocaleString()}
                        </td>
                        {/* Action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={items.length === 1}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-30 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Financial Deductions & Settlement (Simplified: Discount, Paid/Cash, Payment Method removed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Left: Notes & Courier Deduction */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t.courierBillMinus}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={courierDeduction || ''}
                    onChange={(e) => setCourierDeduction(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs"
                  />
                  <span className="text-xs text-slate-500 font-mono">BDT</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'bn'
                    ? 'কুরিয়ার দিয়ে মাল আসলে মোট টাকা থেকে কুরিয়ার চার্জ স্বয়ংক্রিয়ভাবে বাদ যাবে।'
                    : 'Deducted directly from net payable invoice amount.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  নোট / পরিবহন শর্তাবলী (Notes)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="পরিবহন, শর্ত বা বিশেষ মন্তব্য..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            {/* Right: Totals Breakdown */}
            <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{t.subTotal}:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ৳{subtotal.toLocaleString()}
                </span>
              </div>

              {courierDeduction > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-medium">
                  <span>{t.courierBillMinus}:</span>
                  <span className="font-mono font-bold">-৳{courierDeduction.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t.netBill}:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ৳{netInvoiceAmount.toLocaleString()}
                </span>
              </div>

              {invoiceType !== 'processing' && previousBalance !== 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-amber-700 dark:text-amber-400">
                  <span>{previousBalance > 0 ? t.previousDue : t.previousAdvance}:</span>
                  <span className="font-mono font-bold">
                    {previousBalance > 0 ? `+৳${previousBalance}` : `-৳${Math.abs(previousBalance)}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 border-slate-800 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white">
                <span>{t.grandTotal}:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  ৳{grandTotal.toLocaleString()}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 pt-1">
                {lang === 'bn'
                  ? 'এই ইনভয়েসটি চূড়ান্ত মোট বিল হিসেবে পার্টির লেজার ও স্টকে স্বয়ংক্রিয়ভাবে সমন্বয় হবে।'
                  : 'This invoice will update party ledger and inventory automatically.'}
              </div>
            </div>
          </div>

          {/* Modal Action Footer: Save, Save & Print, WhatsApp */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t.shareWhatsApp}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs cursor-pointer"
              >
                {t.cancel}
              </button>

              {/* Save & Print Button next to Save Invoice */}
              <button
                type="button"
                onClick={handleSaveAndPrint}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'bn' ? 'সেভ ও প্রিন্ট করুন' : 'Save & Print'}</span>
              </button>

              {/* Save Invoice Button */}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{t.saveInvoice}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
