import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  FileText,
  Boxes,
  Users,
  Clock,
  Printer,
  Moon,
  Sun,
  PlusCircle,
  Database,
  Phone,
  Wallet,
  Car,
  Settings,
  Store,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Cloud,
  Layers,
  LogOut,
  UserCheck,
  Globe,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { Language, ThemeMode, StockItem, Staff, AttendanceRecord, Invoice, UserSession, CompanyInfo } from '../types';
import { translations } from '../lib/translations';
import { storageService } from '../lib/storage';
import { CompanyLogo } from './CompanyLogo';
import { DesktopInstallButton } from './DesktopInstallButton';
import { NotificationCenter } from './NotificationCenter';
import { CURRENT_APP_VERSION, forceUpdateAndReloadApp } from '../lib/appUpdate';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  onOpenNewInvoice: () => void;
  onOpenStatementsModal: () => void;
  onOpenBackupModal: () => void;
  onOpenCloudSyncModal?: () => void;
  isCloudConnected?: boolean;
  isOnline: boolean;
  companyInfo: CompanyInfo;
  stock?: StockItem[];
  staff?: Staff[];
  attendance?: AttendanceRecord[];
  invoices?: Invoice[];
  userSession?: UserSession | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  theme,
  toggleTheme,
  onOpenNewInvoice,
  onOpenStatementsModal,
  onOpenBackupModal,
  onOpenCloudSyncModal,
  isCloudConnected = false,
  isOnline,
  companyInfo,
  stock = [],
  staff = [],
  attendance = [],
  invoices = [],
  userSession,
  onLogout,
}) => {
  const t = translations[lang];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    await forceUpdateAndReloadApp();
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const currentStaffMember = staff.find(
    (s) => s.id === userSession?.staffId || s.loginCode?.toLowerCase() === userSession?.loginId?.toLowerCase()
  );
  const isSuperAdmin = userSession?.role === 'admin';
  const isHeadSupervisor =
    isSuperAdmin ||
    Boolean(
      currentStaffMember?.isSupervisor ||
        userSession?.designation?.toLowerCase().includes('supervisor') ||
        userSession?.designation?.toLowerCase().includes('lead')
    );

  const rawNavItems = [
    {
      id: 'dashboard',
      label: t.dashboard,
      subLabel: lang === 'bn' ? 'সার্বিক ব্যবসায়িক চিত্র' : 'Business Overview',
      icon: Building2,
      color: 'text-blue-500',
    },
    {
      id: 'invoices',
      label: t.invoices,
      subLabel: lang === 'bn' ? '৪ ধরনের ইনভয়েস ম্যানেজমেন্ট' : '4 Types of Invoices',
      icon: FileText,
      color: 'text-indigo-500',
    },
    {
      id: 'dokan_hishab',
      label: lang === 'bn' ? 'দোকানের হিসাব' : 'Shop Account (Dokan)',
      subLabel: lang === 'bn' ? 'ক্রয়, পরিশোধ ও বাকি/অগ্রিম' : 'Purchases, Payments & Due',
      icon: Store,
      color: 'text-emerald-500',
      badge: lang === 'bn' ? 'নতুন প্যানেল' : 'NEW',
    },
    {
      id: 'stock',
      label: t.stock,
      subLabel: lang === 'bn' ? 'মাদারবোর্ড ও সার্কিট মজুদ' : 'Motherboard Inventory',
      icon: Boxes,
      color: 'text-amber-500',
    },
    {
      id: 'price_list',
      label: lang === 'bn' ? 'দর তালিকা তৈরি' : 'Price List Make',
      subLabel: lang === 'bn' ? 'বাজার দর উঠানামা ও ৩টি পেমেন্ট কলাম' : 'Market Price & 3 Payment Columns',
      icon: Tag,
      color: 'text-amber-600',
      badge: lang === 'bn' ? 'দর তালিকা' : 'PRICE',
    },
    {
      id: 'parties',
      label: t.parties,
      subLabel: lang === 'bn' ? 'পার্টি খাতা ও বাকি/জমা লেজার' : 'Party Due & Advance Ledger',
      icon: Users,
      color: 'text-purple-500',
    },
    {
      id: 'payroll',
      label: t.payroll,
      subLabel: lang === 'bn' ? 'হাজিরা ও ওভারটাইম হিসাব' : 'Staff Attendance & OT',
      icon: Clock,
      color: 'text-sky-500',
    },
    {
      id: 'worker_tracking',
      label: lang === 'bn' ? 'ওয়ার্কার ট্র্যাকিং ও ড্যামেজ' : 'Worker Tracking & Damage',
      subLabel: lang === 'bn' ? 'প্রসেসিং কর্মীভিত্তিক কাজ ও ড্যামেজ' : 'Processing Worker PCS & Damage',
      icon: Layers,
      color: 'text-rose-500',
      badge: lang === 'bn' ? 'প্রসেসিং স্টাফ' : 'Processing Staff',
    },
    {
      id: 'petty_cash',
      label: lang === 'bn' ? 'অফিস পেটি ক্যাশ' : 'Office Petty Cash',
      subLabel: lang === 'bn' ? 'দৈনন্দিন অফিস খরচ ভাউচার' : 'Daily Office Expenses',
      icon: Wallet,
      color: 'text-teal-500',
    },
    {
      id: 'car_expenses',
      label: lang === 'bn' ? 'গাড়ি খরচ' : 'Car Expense',
      subLabel: lang === 'bn' ? 'গাড়ির তেল ও রক্ষণাবেক্ষণ' : 'Fuel & Vehicle Maintenance',
      icon: Car,
      color: 'text-orange-500',
    },
    {
      id: 'financial',
      label: lang === 'bn' ? 'ফাইনান্সিয়াল অ্যানালিটিক্স & ROI' : 'Financial Analytics & ROI',
      subLabel: lang === 'bn' ? 'লাভ-ক্ষতি (P&L), আয়-ব্যয় ও ROI ড্যাশবোর্ড' : 'P&L, Revenue & ROI Dashboard',
      icon: TrendingUp,
      color: 'text-emerald-500',
      badge: lang === 'bn' ? 'P&L & ROI' : 'P&L & ROI',
    },
    {
      id: 'branch',
      label: lang === 'bn' ? 'শাখা অফিস ও RMB হিসাব' : 'Branch Office & RMB Account',
      subLabel: lang === 'bn' ? 'চীন শাখা, মালামাল ও ৩য়-পক্ষ RMB টু টাকা' : 'Branch Inventory, Remittances & 3rd-Party RMB/BDT',
      icon: Globe,
      color: 'text-blue-600',
      badge: lang === 'bn' ? 'RMB/BDT' : 'RMB/BDT',
    },
    {
      id: 'statements',
      label: t.statements,
      subLabel: lang === 'bn' ? '১-পেজ A4 ও হোয়াটসঅ্যাপ' : '1-Page A4 & WhatsApp Reports',
      icon: Printer,
      color: 'text-rose-500',
    },
    {
      id: 'cloud_sync',
      label: lang === 'bn' ? 'ক্লাউড সিঙ্ক ও মাল্টি-ডিভাইস' : 'Cloud Sync & Multi-Device',
      subLabel: lang === 'bn' ? 'ল্যাপটপ ও ফোনে লাইভ ডেটা সিঙ্ক' : 'Live sync across laptops & phones',
      icon: Cloud,
      color: 'text-cyan-500',
      badge: lang === 'bn' ? 'রিয়েলটাইম' : 'LIVE',
    },
    {
      id: 'settings',
      label: lang === 'bn' ? 'কোম্পানি সেটিংস' : 'Company Settings',
      subLabel: lang === 'bn' ? 'ডাটা সংশোধন ও ব্যাকআপ' : 'Data Correction & PWA',
      icon: Settings,
      color: 'text-slate-500',
    },
  ];

  const navItems = rawNavItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (isHeadSupervisor) {
      return ['dashboard', 'invoices', 'stock', 'price_list', 'worker_tracking', 'payroll', 'branch', 'statements', 'cloud_sync'].includes(item.id);
    }
    // General Staff (view permitted info like stock or own status)
    return ['dashboard', 'stock', 'worker_tracking', 'payroll'].includes(item.id);
  });

  const currentActiveItem = navItems.find((item) => item.id === currentTab) || navItems[0];
  const CurrentIcon = currentActiveItem.icon;

  const handleSelectTab = (tabId: string) => {
    if (tabId === 'cloud_sync') {
      if (onOpenCloudSyncModal) onOpenCloudSyncModal();
      setIsMenuOpen(false);
      return;
    }
    setCurrentTab(tabId);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs no-print transition-colors">
      {/* Top Banner / Company Header info bar */}
      <div className="bg-slate-950 text-slate-300 text-xs px-3 sm:px-6 py-1 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2.5 overflow-x-auto text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {companyInfo.name}
          </span>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
          <span className="text-slate-400 hidden md:inline truncate max-w-sm">
            {companyInfo.address}
          </span>
          <span className="text-slate-600 hidden lg:inline">&bull;</span>
          <span className="text-amber-300 font-mono hidden lg:flex items-center gap-1">
            <Phone className="w-3 h-3" /> {companyInfo.phones.join(', ')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {/* Offline / Online indicator */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono ${
              isOnline
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {isOnline
              ? lang === 'bn'
                ? 'অফলাইন ও ডেস্কটপ সাপোর্ট'
                : 'Offline Supported'
              : lang === 'bn'
              ? 'অফলাইন মোড'
              : 'Offline Mode'}
          </span>

          {/* Cloud Sync Status & Trigger */}
          {onOpenCloudSyncModal && (
            <button
              onClick={onOpenCloudSyncModal}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-xs ${
                isCloudConnected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900'
              }`}
              title={lang === 'bn' ? 'মাল্টি-ডিভাইস ক্লাউড সিঙ্ক' : 'Multi-Device Cloud Sync'}
            >
              <Cloud className={`w-3 h-3 ${isCloudConnected ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
              <span>
                {isCloudConnected
                  ? (lang === 'bn' ? 'ক্লাউড সিঙ্ক (লাইভ)' : 'Cloud Live')
                  : (lang === 'bn' ? 'ক্লাউড সিঙ্ক' : 'Cloud Sync')}
              </span>
            </button>
          )}

          {/* Backup Modal trigger */}
          <button
            onClick={onOpenBackupModal}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Encrypted Database Backup & Restore"
          >
            <Database className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">
              {lang === 'bn' ? 'ব্যাকআপ' : 'Backup'}
            </span>
          </button>

          {/* User Role Badge & Logout Button */}
          {userSession && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                  userSession.role === 'admin'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-purple-950 text-purple-300 border border-purple-700'
                }`}
              >
                <UserCheck className="w-3 h-3" />
                <span className="hidden sm:inline">{userSession.name}</span>
                <span>({userSession.role === 'admin' ? 'Admin' : 'Staff'})</span>
              </span>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title={lang === 'bn' ? 'লগআউট করুন' : 'Logout'}
                >
                  <LogOut className="w-3.5 h-3.5 text-white" />
                  <span>{lang === 'bn' ? 'লগআউট' : 'Logout'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Bar with Left-Corner Row Menu trigger */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-2 lg:gap-4">
          
          {/* LEFT CORNER: Row-based Menu Controller & Company Logo */}
          <div className="flex items-center gap-2.5 relative" ref={menuRef}>
            {/* The Left Corner Menu Button */}
            <button
              id="btn-left-corner-menu"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer select-none ${
                isMenuOpen
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:border-emerald-600'
              }`}
              title={lang === 'bn' ? 'অপশন প্যানেল মেনু খুলুন' : 'Open Option Panels Menu'}
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="tracking-wide">
                {lang === 'bn' ? 'অপশন মেনু' : 'Menu'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Brand Logo & Active Panel Title */}
            <div
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
            >
              <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-8 h-8" />
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                    {companyInfo.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {currentActiveItem.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Left Corner Row-based Dropdown Menu (Rows stacked vertically) */}
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                      {lang === 'bn' ? 'অপশন প্যানেল তালিকা' : 'Option Panels Menu'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'bn' ? 'নিচের যেকোনো অপশন নির্বাচন করুন' : 'Select any option below'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Vertical Stack: Row-by-Row Navigation Options */}
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`menu-row-${item.id}`}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isActive
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs truncate">{item.label}</span>
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {item.subLabel}
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-slate-400 opacity-60'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full mt-2 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>{lang === 'bn' ? 'সিস্টেম লগআউট' : 'Logout System'}</span>
                    </div>
                    <span className="text-[10px] text-rose-500 font-mono">Sign Out</span>
                  </button>
                )}

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-3 py-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{companyInfo.name}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-emerald-500 font-bold">{CURRENT_APP_VERSION}</span>
                    <button
                      onClick={handleForceUpdate}
                      disabled={isUpdating}
                      className="text-cyan-500 hover:text-cyan-400 underline cursor-pointer"
                    >
                      {isUpdating ? 'Updating...' : 'Reload'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Active Panel Breadcrumb (Center) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <CurrentIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {currentActiveItem.label}
            </span>
          </div>

          {/* Right Action Controls: Update App, Desktop Install, +Invoice, Lang, Theme */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick 1-Click App Update & Cache Purge Button */}
            <button
              onClick={handleForceUpdate}
              disabled={isUpdating}
              title={lang === 'bn' ? 'সফটওয়্যারের সর্বশেষ আপডেট ও ফিচার রিফ্রেশ করুন' : 'Refresh and apply latest software updates'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-700 dark:text-cyan-300 border border-cyan-400/40 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-cyan-500' : ''}`} />
              <span className="hidden sm:inline">
                {isUpdating ? (lang === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (lang === 'bn' ? 'অ্যাপ আপডেট' : 'Update App')}
              </span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold">
                {CURRENT_APP_VERSION}
              </span>
            </button>

            {/* Desktop Install Button */}
            <DesktopInstallButton lang={lang} variant="nav" />

            {/* Quick New Invoice Button */}
            {(isSuperAdmin || isHeadSupervisor) && (
              <button
                id="btn-nav-new-invoice"
                onClick={onOpenNewInvoice}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.newInvoice}</span>
                <span className="sm:hidden">{lang === 'bn' ? '+ চালান' : '+ Inv'}</span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                id="btn-lang-bn"
                onClick={() => setLang('bn')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  lang === 'bn'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                id="btn-lang-en"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Notification Center */}
            <NotificationCenter
              stock={stock}
              staff={staff}
              attendance={attendance}
              invoices={invoices}
              lang={lang}
              onNavigateTab={setCurrentTab}
            />

            {/* Dark / Light Mode Toggle */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              title={theme === 'dark' ? (lang === 'bn' ? 'লাইট মোড অন করুন' : 'Switch to Light Mode') : (lang === 'bn' ? 'ডার্ক মোড অন করুন' : 'Switch to Dark Mode')}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

