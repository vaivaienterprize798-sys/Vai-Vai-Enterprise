import React, { useState, useMemo } from 'react';
import {
  Car,
  Truck,
  Plus,
  Search,
  Filter,
  Printer,
  Calendar,
  DollarSign,
  Fuel,
  Wrench,
  ShieldAlert,
  FileCheck,
  Building,
  UserCheck,
  Trash2,
  Save,
  X,
  MapPin,
  TrendingDown,
} from 'lucide-react';
import { CarExpense, Language } from '../types';
import {
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';
import { CompanyLogo } from './CompanyLogo';
import { storageService } from '../lib/storage';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

interface CarExpensePanelProps {
  expenses: CarExpense[];
  lang: Language;
  onSaveExpense: (exp: CarExpense) => void;
  onDeleteExpense: (id: string) => void;
  onPrintStatement: () => void;
}

export const CarExpensePanel: React.FC<CarExpensePanelProps> = ({
  expenses,
  lang,
  onSaveExpense,
  onDeleteExpense,
  onPrintStatement,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const companyInfo = storageService.getCompanyInfo();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayStr.slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formVehicleNo, setFormVehicleNo] = useState('ঢাকা মেট্রো-ন ১১-২২৩৩');
  const [formDriverName, setFormDriverName] = useState('রফিক ড্রাইভার');
  const [formCategory, setFormCategory] = useState<CarExpense['category']>('fuel');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState(todayStr);
  const [formKilometers, setFormKilometers] = useState<number>(0);
  const [formLiter, setFormLiter] = useState<number>(0);
  const [formTripRoute, setFormTripRoute] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openNewModal = () => {
    setFormVehicleNo('ঢাকা মেট্রো-ন ১১-২২৩৩');
    setFormDriverName('রফিক ড্রাইভার');
    setFormCategory('fuel');
    setFormTitle('');
    setFormAmount(0);
    setFormDate(todayStr);
    setFormKilometers(0);
    setFormLiter(0);
    setFormTripRoute('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmount <= 0) {
      alert(lang === 'bn' ? 'গাড়ি খরচের বিবরণ ও সঠিক টাকার অঙ্ক দিন' : 'Enter valid title and amount');
      return;
    }

    const newExp: CarExpense = {
      id: `car-${Date.now()}`,
      vehicleNo: formVehicleNo.trim(),
      driverName: formDriverName.trim(),
      category: formCategory,
      title: formTitle.trim(),
      amount: Number(formAmount),
      date: formDate,
      kilometers: formKilometers ? Number(formKilometers) : undefined,
      liter: formLiter ? Number(formLiter) : undefined,
      tripRoute: formTripRoute.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    onSaveExpense(newExp);
    setIsModalOpen(false);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchVeh = selectedVehicle === 'all' || e.vehicleNo === selectedVehicle;
      const matchMonth = !selectedMonth || e.date.startsWith(selectedMonth);
      const titleStr = (e.title || '').toLowerCase();
      const matchSearch =
        titleStr.includes(searchTerm.toLowerCase()) ||
        (e.vehicleNo ? e.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
        (e.driverName && e.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.tripRoute && e.tripRoute.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchVeh && matchMonth && matchSearch;
    });
  }, [expenses, selectedCategory, selectedVehicle, selectedMonth, searchTerm]);

  // Aggregate stats
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const fuelTotal = useMemo(() => {
    return filteredExpenses.filter((e) => e.category === 'fuel').reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const maintenanceTotal = useMemo(() => {
    return filteredExpenses.filter((e) => e.category === 'maintenance').reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const driverTotal = useMemo(() => {
    return filteredExpenses.filter((e) => e.category === 'driver_salary').reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const uniqueVehicles = useMemo(() => {
    const set = new Set(expenses.map((e) => e.vehicleNo).filter(Boolean));
    return Array.from(set);
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-10 h-10" />
          <div>
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'গাড়ি ও পরিবহন খরচ ব্যবস্থাপনা' : 'Vehicle & Car Expense Management'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'পিকআপ ভ্যান, গাড়ি ও মালের পরিবহনে জ্বালানি (তেল/গ্যাস), ড্রাইভার বেতন, টোল ও মেরামতের পূর্ণাঙ্গ হিসাব'
                : 'Complete expense log for fuel, driver salary, toll plaza, oil change, and garage maintenance'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপ রিপোর্ট' : 'Share WhatsApp'}
            getText={() => {
              return `*${companyInfo.name} - গাড়ি ও পরিবহন খরচ সামারি*\n📅 মাস: ${selectedMonth}\n────────────────────────\n🚗 মোট গাড়ি খরচ: ৳${totalAmount.toLocaleString()}\n⛽ জ্বালানি (তেল/গ্যাস): ৳${fuelTotal.toLocaleString()}\n🔧 গ্যারেজ মেরামত: ৳${maintenanceTotal.toLocaleString()}\n────────────────────────\n_${companyInfo.name}_`;
            }}
          />

          <button
            onClick={onPrintStatement}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'গাড়ি খরচ স্টেটমেন্ট' : 'Print Statement'}</span>
          </button>

          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ নতুন গাড়ি খরচ যুক্ত করুন' : '+ Add Car Expense'}</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Car Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-blue-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'মোট গাড়ি খরচ' : 'Total Vehicle Expense'}
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
              <Car className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {formatCurrency(totalAmount, lang)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {formatNumber(filteredExpenses.length, lang)} {lang === 'bn' ? 'টি এন্ট্রি' : 'records'}
          </p>
        </div>

        {/* Fuel Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-amber-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'জ্বালানি (ডিজেল/সিএনজি)' : 'Fuel Expenses'}
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600">
              <Fuel className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(fuelTotal, lang)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {lang === 'bn' ? 'অকটেন, ডিজেল ও সিএনজি ফিলিং' : 'Octane, Diesel & Gas'}
          </p>
        </div>

        {/* Maintenance Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-rose-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'মেরামত ও মবিল' : 'Repairs & Servicing'}
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(maintenanceTotal, lang)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {lang === 'bn' ? 'ইঞ্জিন অয়েল, টায়ার ও গ্যারেজ কাজ' : 'Engine oil, tyres & spare parts'}
          </p>
        </div>

        {/* Driver Salary & Bata */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-l-4 border-l-emerald-600 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'bn' ? 'ড্রাইভার খোরাকি ও টোল' : 'Driver & Toll Plaza'}
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(driverTotal, lang)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {lang === 'bn' ? 'ড্রাইভারের ট্রিপ বাটা ও হাইওয়ে টোল' : 'Trip allowances & road tolls'}
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
            placeholder={lang === 'bn' ? 'গাড়ির নম্বর, রুট বা ড্রাইভার দিয়ে খুঁজুন...' : 'Search by vehicle, route or driver...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Vehicle Filter */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="all">{lang === 'bn' ? 'সকল গাড়ি / ভ্যান' : 'All Vehicles'}</option>
            {uniqueVehicles.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="all">{lang === 'bn' ? 'সকল খাতের খরচ' : 'All Categories'}</option>
            <option value="fuel">{lang === 'bn' ? 'তেল / জ্বালানি (Fuel)' : 'Fuel'}</option>
            <option value="maintenance">{lang === 'bn' ? 'মেরামত ও মবিল (Servicing)' : 'Maintenance'}</option>
            <option value="driver_salary">{lang === 'bn' ? 'ড্রাইভার খোরাকি / বেতন' : 'Driver Salary'}</option>
            <option value="toll">{lang === 'bn' ? 'টোল ও পার্কিং ফি' : 'Toll Plaza'}</option>
            <option value="papers">{lang === 'bn' ? 'পুলিশ ও কাগজপত্র' : 'Papers & Police'}</option>
            <option value="garage">{lang === 'bn' ? 'গ্যারেজ ভাড়া' : 'Garage Rent'}</option>
            <option value="other">{lang === 'bn' ? 'অন্যান্য খরচ' : 'Other'}</option>
          </select>

          {/* Month Filter */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium"
          />
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
                <th className="py-3 px-3 w-36">{lang === 'bn' ? 'গাড়ির নম্বর' : 'Vehicle No'}</th>
                <th className="py-3 px-3 w-32">{lang === 'bn' ? 'খরচের খাত' : 'Category'}</th>
                <th className="py-3 px-3">{lang === 'bn' ? 'বিবরণ ও ট্রিপ রুট' : 'Description & Trip'}</th>
                <th className="py-3 px-3 w-28">{lang === 'bn' ? 'ড্রাইভার' : 'Driver'}</th>
                <th className="py-3 px-3 text-center w-24">{lang === 'bn' ? 'লিটার / কিমি' : 'Qty / KM'}</th>
                <th className="py-3 px-3 text-right w-28">{lang === 'bn' ? 'টাকার পরিমাণ' : 'Amount'}</th>
                <th className="py-3 px-3 text-right w-16">{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {lang === 'bn' ? 'কোনো গাড়ি খরচের রেকর্ড পাওয়া যায়নি' : 'No vehicle expenses found'}
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
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {it.vehicleNo}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {it.category === 'fuel'
                          ? (lang === 'bn' ? 'জ্বালানি' : 'Fuel')
                          : it.category === 'maintenance'
                          ? (lang === 'bn' ? 'মেরামত/মবিল' : 'Servicing')
                          : it.category === 'driver_salary'
                          ? (lang === 'bn' ? 'ড্রাইভার খোরাকি' : 'Driver')
                          : it.category === 'toll'
                          ? (lang === 'bn' ? 'টোল ফি' : 'Toll')
                          : it.category === 'papers'
                          ? (lang === 'bn' ? 'কাগজপত্র' : 'Papers')
                          : it.category === 'garage'
                          ? (lang === 'bn' ? 'গ্যারেজ ভাড়া' : 'Garage')
                          : (lang === 'bn' ? 'অন্যান্য' : 'Other')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {it.title}
                      </div>
                      {it.tripRoute && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          <span>{it.tripRoute}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {it.driverName || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                      {it.liter ? `${it.liter} Ltr` : ''}
                      {it.liter && it.kilometers ? ' | ' : ''}
                      {it.kilometers ? `${it.kilometers} KM` : ''}
                      {!it.liter && !it.kilometers ? '-' : ''}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(it.amount, lang)}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 bg-blue-700 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Car className="w-4 h-4" />
                {lang === 'bn' ? 'নতুন গাড়ি / পরিবহন খরচ এন্ট্রি' : 'Add Vehicle / Transport Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'গাড়ির নম্বর' : 'Vehicle No'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formVehicleNo}
                    onChange={(e) => setFormVehicleNo(e.target.value)}
                    placeholder="ঢাকা মেট্রো-ন ১১-২২৩৩"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'ড্রাইভারের নাম' : 'Driver Name'}
                  </label>
                  <input
                    type="text"
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    placeholder="রফিক ড্রাইভার"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'তারিখ' : 'Date'} <span className="text-red-500">*</span>
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
                    {lang === 'bn' ? 'খরচের খাত' : 'Category'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="fuel">{lang === 'bn' ? 'তেল / জ্বালানি (Fuel)' : 'Fuel'}</option>
                    <option value="maintenance">{lang === 'bn' ? 'মেরামত ও মবিল (Servicing)' : 'Maintenance'}</option>
                    <option value="driver_salary">{lang === 'bn' ? 'ড্রাইভার খোরাকি / বেতন' : 'Driver Salary'}</option>
                    <option value="toll">{lang === 'bn' ? 'টোল ও পার্কিং ফি' : 'Toll Plaza'}</option>
                    <option value="papers">{lang === 'bn' ? 'পুলিশ ও কাগজপত্র' : 'Papers & Police'}</option>
                    <option value="garage">{lang === 'bn' ? 'গ্যারেজ ভাড়া' : 'Garage Rent'}</option>
                    <option value="other">{lang === 'bn' ? 'অন্যান্য খরচ' : 'Other'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'খরচের বিবরণ' : 'Description / Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: ২০ লিটার ডিজেল ফিলিং ও মবিল টপআপ' : 'e.g. 20 Liters diesel filling'}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                    {lang === 'bn' ? 'জ্বালানি লিটার' : 'Fuel Liters'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formLiter || ''}
                    onChange={(e) => setFormLiter(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'কিলোমিটার রিডিং' : 'KM Reading'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formKilometers || ''}
                    onChange={(e) => setFormKilometers(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'ট্রিপ রুট / যাতায়াত এলাকা' : 'Trip Route / Area'}
                </label>
                <input
                  type="text"
                  value={formTripRoute}
                  onChange={(e) => setFormTripRoute(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: সিদ্ধিরগঞ্জ - গুলিস্তান - বাবুবাজার - সিদ্ধিরগঞ্জ' : 'e.g. Narayanganj - Dhaka - Narayanganj'}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'নোট / মন্তব্য' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={lang === 'bn' ? 'পাম্পের নাম বা মেমোর বিবরণ...' : 'Pump name, memo or extra notes...'}
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
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
