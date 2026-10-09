import React, { useState } from 'react';
import {
  Settings,
  Building,
  Phone,
  Mail,
  MapPin,
  Upload,
  Save,
  CheckCircle,
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  Laptop,
  Image as ImageIcon,
  Smartphone,
  Info,
  Cloud,
  CheckCircle2,
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { CompanyInfo, Language } from '../types';
import { storageService } from '../lib/storage';
import { CompanyLogo } from './CompanyLogo';
import { CURRENT_APP_VERSION, forceUpdateAndReloadApp, BUILD_TIMESTAMP } from '../lib/appUpdate';

interface SettingsPanelProps {
  lang: Language;
  companyInfo?: CompanyInfo;
  onSaveCompanyInfo?: (info: CompanyInfo) => void;
  onCompanyUpdate?: () => void;
  onOpenBackupModal?: () => void;
  onOpenCloudSyncModal?: () => void;
  onInstallPwa?: () => void;
  isInstallable?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  lang,
  companyInfo,
  onSaveCompanyInfo,
  onCompanyUpdate,
  onOpenBackupModal,
  onOpenCloudSyncModal,
  onInstallPwa,
  isInstallable = false,
}) => {
  const currentCompany = companyInfo || storageService.getCompanyInfo();

  const [name, setName] = useState(currentCompany.name);
  const [processingName, setProcessingName] = useState(currentCompany.processingName);
  const [email, setEmail] = useState(currentCompany.email);
  const [address, setAddress] = useState(currentCompany.address);
  const [phone1, setPhone1] = useState(currentCompany.phones[0] || '01725-550002');
  const [phone2, setPhone2] = useState(currentCompany.phones[1] || '01746-383825');
  const [businessTypeBn, setBusinessTypeBn] = useState(currentCompany.businessTypeBn);
  const [businessTypeEn, setBusinessTypeEn] = useState(currentCompany.businessTypeEn);
  const [proprietor, setProprietor] = useState(currentCompany.proprietor || 'হাজী মোঃ শাহিন');
  const [adminUsername, setAdminUsername] = useState(currentCompany.adminUsername || 'ADMIN');
  const [adminPassword, setAdminPassword] = useState(currentCompany.adminPassword || 'admin123');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [logoUrl, setLogoUrl] = useState(currentCompany.logoUrl || '');
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(lang === 'bn' ? 'লোগো ফাইলের সাইজ সর্বোচ্চ ২ মেগাবাইট হতে হবে' : 'Logo size must be under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: CompanyInfo = {
      name: name.trim(),
      processingName: processingName.trim(),
      email: email.trim(),
      address: address.trim(),
      phones: [phone1.trim(), phone2.trim()].filter(Boolean),
      businessTypeBn: businessTypeBn.trim(),
      businessTypeEn: businessTypeEn.trim(),
      proprietor: proprietor.trim(),
      adminUsername: adminUsername.trim() || 'ADMIN',
      adminPassword: adminPassword.trim() || 'admin123',
      logoUrl: logoUrl.trim(),
    };

    storageService.saveCompanyInfo(updated);
    if (onSaveCompanyInfo) onSaveCompanyInfo(updated);
    if (onCompanyUpdate) onCompanyUpdate();
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 4000);
  };

  // Reset All Party Data (secure, type RESET to confirm)
  const [isPartyResetOpen, setIsPartyResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetOpenings, setResetOpenings] = useState<Record<string, number>>({});
  const [isResetting, setIsResetting] = useState(false);
  const resetParties = isPartyResetOpen ? storageService.getParties() : [];

  const handlePartyReset = async () => {
    if (resetConfirmText.trim() !== 'RESET' || isResetting) return;
    setIsResetting(true);
    try {
      const res = await storageService.resetAllPartyData(resetOpenings);
      alert(
        lang === 'bn'
          ? `সম্পন্ন: ${res.deletedTransactions}টি লেনদেন মুছে ফেলা হয়েছে, ${res.parties}টি পার্টির হিসাব রিসেট হয়েছে।`
          : `Done: ${res.deletedTransactions} transactions deleted, ${res.parties} parties reset.`
      );
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(lang === 'bn' ? 'রিসেট করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।' : 'Reset failed, please try again.');
      setIsResetting(false);
    }
  };

  const handleWipeAllData = async () => {
    const confirmed = confirm(
      lang === 'bn'
        ? '⚠️ চূড়ান্ত সতর্কতা: আপনি কি ডিফল্ট তথ্য ও নমুনা ডেমো ডেটাসহ সমস্ত হিসাব, স্টক, চালান ও কর্মচারী তথ্য সম্পূর্ণ মুছে শূন্য (Blank) করে নতুনভাবে শুরু করতে চান?'
        : '⚠️ Critical Warning: Are you sure you want to wipe ALL data completely clean (including all default/sample data) to start from a blank zero state?'
    );
    if (confirmed) {
      await storageService.wipeAllDataClean(true);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <CompanyLogo customLogoUrl={logoUrl} className="w-12 h-12" />
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'bn' ? 'কোম্পানি তথ্য ও সিস্টেম সেটিংস' : 'Company Information & System Settings'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'bn'
                ? 'এখান থেকে কোম্পানির নাম, ঠিকানা, ফোন নম্বর, লোগো ও সফটওয়্যারের যাবতীয় সেটিংস পরিবর্তন করতে পারবেন'
                : 'Configure company profile, contact numbers, official logo, and offline desktop settings'}
            </p>
          </div>
        </div>

        {/* PWA Desktop Install Call to Action */}
        <div className="flex items-center gap-2">
          {onInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Laptop className="w-4 h-4 text-emerald-400 dark:text-white" />
              <span>{lang === 'bn' ? 'ডেস্কটপে ইনস্টল করুন' : 'Install on Desktop'}</span>
            </button>
          )}
        </div>
      </div>

      {isSavedAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>
            {lang === 'bn'
              ? 'কোম্পানির সকল তথ্য সফলভাবে সংরক্ষিত ও আপডেট হয়েছে! সমস্ত ইনভয়েস ও শিটে নতুন তথ্য প্রদর্শিত হবে।'
              : 'Company settings have been updated successfully and synced across all invoices and sheets!'}
          </span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Super Admin Profile & Access Credentials Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'bn' ? 'সুপার অ্যাডমিন প্রোফাইল ও সিকিউরিটি পাসওয়ার্ড' : 'Super Admin Profile & Credentials'}</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
              Admin Access
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                {lang === 'bn' ? 'সুপার অ্যাডমিনের নাম (Proprietor / Profile Name)' : 'Admin Profile Name'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={proprietor}
                onChange={(e) => setProprietor(e.target.value)}
                placeholder="হাজী মোঃ শাহিন"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-white font-bold text-xs"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                * সিস্টেম নেভিগেশন বার ও সকল ইনভয়েসের স্বত্বাধিকারী নাম
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                {lang === 'bn' ? 'অ্যাডমিন ইউজারনেম (Login Username)' : 'Admin Username'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="ADMIN"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-amber-300 font-mono font-bold text-xs uppercase"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                * সিস্টেমে অ্যাডমিন লগইনের জন্য ব্যবহৃত আইডি
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                {lang === 'bn' ? 'অ্যাডমিন পাসওয়ার্ড (Admin Password)' : 'Admin Password'} <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-700 bg-slate-800/90 text-emerald-300 font-mono font-bold text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                * সিকিউরিটি পাসওয়ার্ড (শো/হাইড আইকন দিয়ে দেখতে পারেন)
              </p>
            </div>
          </div>
        </div>

        {/* Company Identity & Addresses Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'bn' ? 'কোম্পানি পরিচিতি ও ব্র্যান্ডিং' : 'Company Identity & Branding'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'মূল কোম্পানির নাম (Default Company Name)' : 'Primary Company Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="RSR Vai Vai Enterprise"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn' ? 'জেনারেল, দোকান ও কমার্শিয়াল চালানের হেডার হিসেবে ব্যবহৃত হবে' : 'Used on General, Dokan and Commercial invoices'}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'প্রসেসিং ইনভয়েস কোম্পানি নাম (5G Processing Company)' : 'Processing Invoice Company Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={processingName}
                onChange={(e) => setProcessingName(e.target.value)}
                placeholder="Vai Vai Trades 5G"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'bn' ? 'প্রসেসিং (5G) ইনভয়েস প্রিন্ট করার সময় এই নামটি স্বয়ংক্রিয়ভাবে হেডার হবে' : 'Used specifically when creating 5G Processing invoices'}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'কোম্পানি ঠিকানা (Full Address)' : 'Official Address'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shakib-Siyam Super Market, 14 No. Lane, Puran Potti Road, Hiraabil, Siddhirganj, Narayanganj"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'যোগাযোগ নম্বর ১ (Primary Phone)' : 'Contact Number 1'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phone1}
                onChange={(e) => setPhone1(e.target.value)}
                placeholder="01725-550002"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'যোগাযোগ নম্বর ২ (Secondary Phone)' : 'Contact Number 2'}
              </label>
              <input
                type="text"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="01746-383825"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'ইমেইল অ্যাড্রেস (Company Email)' : 'Official Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vaivaienterpeize798@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'ব্যবসার ধরন (বাংলা)' : 'Business Type (Bangla)'}
              </label>
              <input
                type="text"
                value={businessTypeBn}
                onChange={(e) => setBusinessTypeBn(e.target.value)}
                placeholder="পুরাতন নষ্ট মোবাইল সার্কিট ও মাদারবোর্ড ক্রয়-বিক্রয়"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'bn' ? 'ব্যবসার ধরন (ইংরেজি)' : 'Business Type (English)'}
              </label>
              <input
                type="text"
                value={businessTypeEn}
                onChange={(e) => setBusinessTypeEn(e.target.value)}
                placeholder="Used Mobile Circuit & Motherboard Scrap Trading"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Company Official Logo Management */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'bn' ? 'কোম্পানি অফিসিয়াল লোগো (All Sheets & Print Header)' : 'Company Official Logo'}</span>
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0">
              <CompanyLogo customLogoUrl={logoUrl} className="w-24 h-24" />
              <span className="text-[11px] text-slate-500 mt-2 font-medium">
                {lang === 'bn' ? 'বর্তমান লোগো প্রিভিউ' : 'Current Logo Preview'}
              </span>
            </div>

            <div className="space-y-3 flex-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'কম্পিউটার বা মোবাইল থেকে লোগো আপলোড করুন' : 'Upload Logo from Device'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'অথবা লোগোর সরাসরি ইমেজ লিঙ্ক (URL)' : 'Or Image URL'}
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  {lang === 'bn' ? 'ডিফল্ট আরএসআর লোগোতে ফিরে যান' : 'Reset to Default Vector Logo'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{lang === 'bn' ? 'কোম্পানি তথ্য সংরক্ষণ করুন' : 'Save Company Information'}</span>
          </button>
        </div>
      </form>

      {/* Real-time Cloud Database & Multi-Device Sync Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-5 rounded-2xl border border-emerald-800 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                {lang === 'bn' ? 'ক্লাউড ফায়ারস্টোর ও মাল্টি-ডিভাইস লাইভ সিঙ্ক' : 'Cloud Firestore & Multi-Device Live Sync'}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-mono border border-emerald-600 font-bold">
                  Real-time
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'bn'
                  ? 'সব ডিভাইস ও ল্যাপটপে স্বয়ংক্রিয়ভাবে ডাটা সিঙ্ক হচ্ছে।'
                  : 'All data automatically synchronizes across all devices & laptops.'}
              </p>
            </div>
          </div>

          {onOpenCloudSyncModal && (
            <button
              type="button"
              onClick={onOpenCloudSyncModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ক্লাউড সিঙ্ক কন্ট্রোল প্যানেল' : 'Cloud Sync Control'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
            <Laptop className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-200 text-[11px]">
              {lang === 'bn'
                ? 'একাধিক ল্যাপটপ থেকে একযোগে ক্যাশিয়ার ও একাউন্ট্যান্ট কাজ করতে পারবেন।'
                : 'Cashiers & accountants can work simultaneously from multiple laptops.'}
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-slate-200 text-[11px]">
              {lang === 'bn'
                ? 'মোবাইল থেকে তাৎক্ষণিক স্টক ও বাকি খাতার লাইভ ব্যালেন্স দেখতে পারবেন।'
                : 'Instantly view live stock and party ledger balances from your phone.'}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop App & Offline Installation Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-900 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold">
              {lang === 'bn' ? 'ডেস্কটপ ইনস্টল ও লাইফটাইম অফলাইন ব্যবহার' : 'Desktop App & Lifetime Offline Use'}
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
            100% Offline PWA Ready
          </span>
        </div>

        <p className="text-xs text-slate-300">
          {lang === 'bn'
            ? 'এই সফটওয়্যারটি একটি আধুনিক প্রগ্রেসিভ ওয়েব অ্যাপ (PWA)। আপনি কোনো জটিলতা ছাড়াই আপনার কম্পিউটার/ডেস্কটপে একটি সাধারণ সফটওয়্যারের মতো ইনস্টল করে ইন্টারনেট সংযোগ ছাড়াও আজীবন ব্যবহার করতে পারবেন।'
            : 'Install this application as a standalone desktop app on Windows, Mac, or Linux to use seamlessly lifetime even without internet connectivity.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="font-semibold text-emerald-400">১. ব্রাউজার মেন্যু</div>
            <div className="text-slate-300 text-[11px] mt-0.5">
              Chrome/Edge এর এড্রেসবারের ডানপাশে Install আইকন চাপুন।
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="font-semibold text-cyan-400">২. শর্টকাট আইকন</div>
            <div className="text-slate-300 text-[11px] mt-0.5">
              কম্পিউটারের ডেস্কটপ স্ক্রিনে সরাসরি আরএসআর ভাই ভাই অ্যাপ তৈরি হবে।
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="font-semibold text-amber-400">৩. লোকাল ডেটা সুরক্ষা</div>
            <div className="text-slate-300 text-[11px] mt-0.5">
              সকল হিসাব আপনার কম্পিউটারে সুরক্ষিত থাকবে। নিয়মিত ব্যাকআপ রাখুন।
            </div>
          </div>
        </div>
      </div>

      {/* App Version & Auto-Update Control */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'সফটওয়্যার আপডেট ও ক্যাশ সিঙ্ক্রোনাইজেশন' : 'Software Updates & Cache Sync'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {CURRENT_APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {lang === 'bn'
                ? 'ব্রাউজার বা ডেস্কটপ PWA অ্যাপে পুরোনো ক্যাশ ফাইল জমে থাকলে নতুন ফিচার দৃশ্যমান নাও হতে পারে। নিচের বাটনে ক্লিক করলে সমস্ত পুরোনো ক্যাশ পরিষ্কার হয়ে অ্যাপের সম্পূর্ণ নতুন সংস্করণ ও ফিচার ইনস্ট্যান্ট লোড হবে।'
                : 'If your browser or installed PWA app holds cached files, click below to force-clean cache and immediately load all the latest updates.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => forceUpdateAndReloadApp()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{lang === 'bn' ? 'সম্পূর্ণ অ্যাপ এখনই আপডেট ও রিফ্রেশ করুন' : 'Force Update & Reload App'}</span>
          </button>
        </div>
      </div>

      {/* Database Management & Backup */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Database className="w-4 h-4 text-cyan-600" />
          <span>{lang === 'bn' ? 'ডাটাবেজ ও এনক্রিপ্টেড ব্যাকআপ ব্যবস্থাপনা' : 'Database & Backup Management'}</span>
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 max-w-lg">
            {lang === 'bn'
              ? 'আপনার প্রতিষ্ঠানের সমস্ত হিসাব, স্টক, খাতা ও কর্মচারীর তথ্য একটি সুরক্ষিত ফাইলে ব্যাকআপ নিয়ে পেনড্রাইভ বা গুগল ড্রাইভে রাখতে পারেন।'
              : 'Safeguard all transactions, invoices, and ledgers by downloading an encrypted offline backup.'}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ব্যাকআপ ডাউনলোড / রিস্টোর' : 'Backup & Restore'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setResetConfirmText(''); setResetOpenings({}); setIsPartyResetOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white cursor-pointer font-bold shadow-xs transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সকল পার্টি ডাটা রিসেট' : 'Reset All Party Data'}</span>
            </button>

            <button
              type="button"
              onClick={handleWipeAllData}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer font-bold shadow-xs transition-all active:scale-95"
              title={lang === 'bn' ? 'ডিফল্ট তথ্যসহ সমস্ত ডেটা সম্পূর্ণ মুছে ফ্রেশ করুন' : 'Wipe everything completely clean'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'সকল ডাটা সম্পূর্ণ মুছুন (All Clean)' : 'Wipe All Data'}</span>
            </button>
          </div>
        </div>
      </div>
      {isPartyResetOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-rose-300 dark:border-rose-800 shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-rose-600 text-white font-bold text-sm">
              {lang === 'bn' ? '⚠️ সকল পার্টি ডাটা রিসেট' : '⚠️ Reset All Party Data'}
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {lang === 'bn'
                  ? 'সব পার্টির সকল লেনদেন, চালান, পেমেন্ট ও লেজার এই ডিভাইস ও ক্লাউড দুই জায়গা থেকেই স্থায়ীভাবে মুছে যাবে। সব পার্টির বাকি ও অগ্রিম ০ হবে। পার্টির নাম ও ফোন নম্বর থাকবে। পুরনো ডাটা আর ফিরে আসবে না।'
                  : 'All party transactions, invoices, payments and ledgers will be permanently deleted from this device and the cloud. Every due and advance becomes 0. Party names and phones are kept. Old data cannot come back.'}
              </p>
              {resetParties.length > 0 && (
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                    {lang === 'bn' ? 'নতুন প্রারম্ভিক ব্যালেন্স (ঐচ্ছিক, খালি রাখলে ০)' : 'Fresh opening balance (optional, blank = 0)'}
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                    {resetParties.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 p-2">
                        <span className="truncate text-slate-800 dark:text-slate-200">{p.name}</span>
                        <input
                          type="number"
                          value={resetOpenings[p.id] ?? ''}
                          onChange={(e) => setResetOpenings((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block font-bold text-rose-700 dark:text-rose-400 mb-1">
                  {lang === 'bn' ? 'নিশ্চিত করতে বড় হাতের অক্ষরে RESET লিখুন' : 'Type RESET (capital letters) to confirm'}
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET"
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg border-2 border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 font-mono font-bold tracking-widest text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsPartyResetOpen(false)} disabled={isResetting}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="button" onClick={handlePartyReset}
                  disabled={resetConfirmText.trim() !== 'RESET' || isResetting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold cursor-pointer">
                  {isResetting ? (lang === 'bn' ? 'রিসেট হচ্ছে...' : 'Resetting...') : (lang === 'bn' ? 'স্থায়ীভাবে রিসেট করুন' : 'Reset Permanently')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
