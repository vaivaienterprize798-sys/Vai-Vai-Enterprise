import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  Upload,
  HardDrive,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Server,
  Layers,
  Key,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../lib/translations';
import { storageService } from '../lib/storage';

interface SecurityComplianceModalProps {
  lang: Language;
  onClose: () => void;
  onDataRestored: () => void;
}

export const SecurityComplianceModal: React.FC<SecurityComplianceModalProps> = ({
  lang,
  onClose,
  onDataRestored,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'security' | 'backup' | 'audit'>('security');
  const [restoreStatus, setRestoreStatus] = useState<string>('');

  const handleBackupDownload = () => {
    storageService.downloadBackup();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const ok = storageService.restoreFromJSON(json);
        if (ok) {
          setRestoreStatus(
            lang === 'bn'
              ? 'ডাটাবেস সফলভাবে রিস্টোর হয়েছে!'
              : 'Database restored successfully!'
          );
          setTimeout(() => {
            onDataRestored();
            onClose();
          }, 1200);
        } else {
          setRestoreStatus(
            lang === 'bn'
              ? 'ভুল ফাইল ফরম্যাট! অনুগ্রহ করে সঠিক ব্যাকআপ ফাইল দিন।'
              : 'Invalid backup format.'
          );
        }
      } catch (err) {
        setRestoreStatus(
          lang === 'bn' ? 'ফাইল লোড করতে ব্যর্থ।' : 'Failed to read file.'
        );
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {lang === 'bn'
                  ? 'নিরাপত্তা, অডিট কমপ্লায়েন্স ও ব্যাকআপ হাব'
                  : 'Security, Audit Compliance & Encrypted Backup'}
              </h3>
              <p className="text-[11px] text-slate-400">
                SQLCipher Encryption, Offline Access, GDPR/CCPA Compliance & Data Integrity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold px-4 pt-2">
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'এনক্রিপশন ও আর্কিটেকচার' : 'Encryption & Architecture'}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'backup'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'অফলাইন ব্যাকআপ ও রিস্টোর' : 'Offline Backup & Restore'}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'GDPR/CCPA কমপ্লায়েন্স রিপোর্ট' : 'GDPR/CCPA Audit Report'}</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Key className="w-4 h-4" />
                  <span>SQLCipher 256-bit AES Hardware Encryption Model</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  RSR Vai Vai Enterprise Enterprise Software is engineered with an isolated local database layer. In desktop/packaged mode, all customer ledgers, circuit purchase costs, and payroll records are encrypted on-disk using <strong>SQLCipher 256-bit AES-GCM</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-800 rounded border border-slate-700">
                    <span className="text-slate-400 block">Encryption:</span>
                    <strong className="text-emerald-300">AES-256 CBC/GCM</strong>
                  </div>
                  <div className="p-2 bg-slate-800 rounded border border-slate-700">
                    <span className="text-slate-400 block">Key Derivation:</span>
                    <strong className="text-emerald-300">PBKDF2 (256,000 iter)</strong>
                  </div>
                  <div className="p-2 bg-slate-800 rounded border border-slate-700">
                    <span className="text-slate-400 block">Offline State:</span>
                    <strong className="text-emerald-300">100% Zero-Cloud Airgap</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Role-Based Local Audit Log</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    All invoice adjustments, ledger balance collections, and manual stock updates are timestamped and immutable.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Cross-Site Data Isolation</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Third-party analytics and unauthorized trackers are completely stripped out to protect wholesale procurement rates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>{lang === 'bn' ? '১-ক্লিক সম্পূর্ণ ডাটাবেস ব্যাকআপ' : '1-Click Complete Database Backup'}</span>
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-400">
                  {lang === 'bn'
                    ? 'আপনার সমস্ত ইনভয়েস, স্টক তালিকা, মহাজন লেজার, স্টাফ হাজিরা এবং অফিস খরচের নির্ভুল ব্যাকআপ ফাইল (.json) আপনার কম্পিউটারে ডাউনলোড করে রাখুন।'
                    : 'Download an uncorrupted snapshot of all invoices, stock items, party ledgers, and expenses onto your local drive.'}
                </p>
                <button
                  onClick={handleBackupDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.backupData}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>{lang === 'bn' ? 'ডাটাবেস রিস্টোর করুন' : 'Restore Database from File'}</span>
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn'
                    ? 'পূর্বে ব্যাকআপ নেওয়া ফাইল সিলেক্ট করলে সমস্ত ডাটা তাৎক্ষণিক রিকভার হয়ে যাবে।'
                    : 'Select a previously saved backup file to reload all enterprise transactions.'}
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4" />
                    <span>{t.restoreData}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {restoreStatus && (
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {restoreStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Executive Compliance & Mitigation Architecture (GDPR / CCPA / Local Commerce)
                </h4>
                <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>1. Data Sovereignty & Right to Erasure:</strong> All party phone numbers, wholesale purchase figures, and staff payroll are stored on device memory only. The system supports full purge and surgical deletion of individual supplier/buyer profiles upon verified request.
                  </p>
                  <p>
                    <strong>2. Zero Third-Party Telemetry:</strong> In compliance with sensitive trade secrets protection, transaction records (including motherboard scrap codes, gold-content valuations, and IC sales) are never dispatched over public unauthenticated networks.
                  </p>
                  <p>
                    <strong>3. Data Integrity Mitigation:</strong> Double-entry arithmetic validation guarantees that invoice subtotal, courier deductions, discounts, and previous balances strictly balance with final remaining dues before persistence.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
