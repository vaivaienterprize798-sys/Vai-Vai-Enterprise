import React, { useMemo, useState } from 'react';
import { Download, Printer, X, Save } from 'lucide-react';
import {
  BranchConsignment,
  ChinaDirectPayment,
  CompanyInfo,
  Language,
  ThirdPartyRmbConversion,
} from '../types';
import { formatCurrency, formatDate } from '../lib/translations';
import { executePrint, exportElementToPdf } from '../lib/printUtils';
import { storageService } from '../lib/storage';
import {
  BranchOpeningBalance,
  buildRolledLedger,
  chinaOfficeMovements,
  periodBounds,
  signedBranchOpening,
} from '../lib/rollover';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { WeChatShareDropdown } from './WeChatShareDropdown';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  companyInfo: CompanyInfo;
  consignments: BranchConsignment[];
  conversions: ThirdPartyRmbConversion[];
  chinaDirectPayments: ChinaDirectPayment[];
  isSuperAdmin?: boolean;
}

const PRINT_ID = 'rsr-branch-office-ledger';
const balLabel = (n: number, bn: boolean) =>
  n >= 0 ? (bn ? 'Dr (পাওনা)' : 'Dr') : bn ? 'Cr (অগ্রিম)' : 'Cr';

export const BranchOfficeLedger: React.FC<Props> = ({
  isOpen,
  onClose,
  lang,
  companyInfo,
  consignments,
  conversions,
  chinaDirectPayments,
  isSuperAdmin = true,
}) => {
  const bn = lang === 'bn';
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [mode, setMode] = useState<'month' | 'range' | 'all'>('month');
  const [month, setMonth] = useState(todayStr.slice(0, 7));
  const [startDate, setStartDate] = useState(todayStr.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(todayStr);
  const [opening, setOpening] = useState<BranchOpeningBalance>(() => storageService.getBranchOpening());
  const [editAmount, setEditAmount] = useState<number>(opening.amount);
  const [editSide, setEditSide] = useState<'dr' | 'cr'>(opening.side);
  const [isExporting, setIsExporting] = useState(false);

  const ledger = useMemo(() => {
    const { start, end } = periodBounds(mode, { selectedMonth: month, startDate, endDate });
    const mv = chinaOfficeMovements(consignments, conversions, chinaDirectPayments, lang);
    return buildRolledLedger(signedBranchOpening(opening), mv, start, end);
  }, [mode, month, startDate, endDate, consignments, conversions, chinaDirectPayments, opening, lang]);

  if (!isOpen) return null;

  const saveOpening = () => {
    const o: BranchOpeningBalance = { amount: Math.max(0, Number(editAmount) || 0), side: editSide, date: todayStr };
    storageService.saveBranchOpening(o);
    setOpening(o);
  };

  const periodText =
    mode === 'month' ? month : mode === 'range' ? `${startDate} → ${endDate}` : bn ? 'সকল সময়' : 'All time';
  const fileBase = `branch-office-ledger-${mode === 'month' ? month : mode === 'range' ? `${startDate}_${endDate}` : 'all'}`;
  const summary = () =>
    `*${companyInfo.name} - ${bn ? 'শাখা অফিস লেজার' : 'Branch Office Ledger'}*\n📅 ${periodText}\n────────────────────────\n` +
    `${bn ? 'প্রারম্ভিক জের' : 'Opening'}: ৳${Math.abs(ledger.opening).toLocaleString()} ${balLabel(ledger.opening, bn)}\n` +
    `Dr ${bn ? '(প্রেরিত মাল)' : '(goods sent)'}: ৳${ledger.totalDr.toLocaleString()}\n` +
    `Cr ${bn ? '(প্রাপ্ত টাকা + RMB)' : '(cash + RMB)'}: ৳${ledger.totalCr.toLocaleString()}\n` +
    `${bn ? 'সমাপনী জের' : 'Closing'}: ৳${Math.abs(ledger.closing).toLocaleString()} ${balLabel(ledger.closing, bn)}\n` +
    `────────────────────────\n_${companyInfo.name}_`;

  const cell = 'py-1 px-2 border border-slate-300';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-start justify-center overflow-y-auto p-3 sm:p-6">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-200 dark:border-slate-800 no-print">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {bn ? 'শাখা অফিস লেজার (পার্টি স্টাইল)' : 'Branch Office Ledger'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 no-print text-xs">
          {isSuperAdmin && (
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div>
                <label className="block font-bold mb-1">{bn ? 'প্রারম্ভিক ব্যালেন্স (প্রথম সেটআপ)' : 'Opening Balance (initial setup)'}</label>
                <input
                  type="number"
                  min={0}
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-36 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <select
                value={editSide}
                onChange={(e) => setEditSide(e.target.value as 'dr' | 'cr')}
                className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="dr">{bn ? 'Dr - চীন অফিসের কাছে পাওনা' : 'Dr - China Office owes us'}</option>
                <option value="cr">{bn ? 'Cr - চীন অফিস অগ্রিম দিয়েছে' : 'Cr - Advance from China Office'}</option>
              </select>
              <button onClick={saveOpening} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer">
                <Save className="w-3.5 h-3.5" /> {bn ? 'সেভ' : 'Save'}
              </button>
              <p className="w-full text-[11px] text-slate-600 dark:text-slate-400">
                {bn
                  ? 'এটি শুধু একবার দিন। প্রতি মাসের সমাপনী জের স্বয়ংক্রিয়ভাবে পরের মাসের প্রারম্ভিক জের হবে।'
                  : "Enter once. Each month's closing balance carries forward automatically as the next month's opening."}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <option value="month">{bn ? 'মাসিক' : 'Monthly'}</option>
              <option value="range">{bn ? 'তারিখ পরিসর' : 'Date range'}</option>
              <option value="all">{bn ? 'সকল' : 'All'}</option>
            </select>
            {mode === 'month' && (
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
            )}
            {mode === 'range' && (
              <>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800" />
              </>
            )}
            <div className="flex flex-wrap gap-2 ml-auto">
              <button onClick={() => executePrint(PRINT_ID, `${companyInfo.name} - Branch Office Ledger`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> {bn ? 'প্রিন্ট' : 'Print'}
              </button>
              <button
                disabled={isExporting}
                onClick={async () => {
                  setIsExporting(true);
                  await exportElementToPdf(PRINT_ID, `${fileBase}.pdf`);
                  setIsExporting(false);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <WhatsAppShareDropdown lang={lang} getText={summary} targetElementId={PRINT_ID} fileName={`${fileBase}.png`} buttonLabel="WhatsApp" />
              <WeChatShareDropdown lang={lang} getText={summary} targetElementId={PRINT_ID} fileName={`${fileBase}.png`} buttonLabel="WeChat" />
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 overflow-x-auto">
          <div id={PRINT_ID} className="one-page-sheet bg-white text-slate-900 p-5 rounded-xl border border-slate-300 min-w-[640px]">
            <div className="flex items-center gap-3 border-b-2 border-slate-800 pb-2 mb-3">
              <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-10 h-10" />
              <div className="flex-1">
                <div className="font-black text-base">{companyInfo.name}</div>
                <div className="text-[11px]">{bn ? 'শাখা / চীন অফিস লেজার' : 'Branch / China Office Ledger'} — {periodText}</div>
              </div>
              <div className="text-[11px] text-right">{formatDate(todayStr, lang)}</div>
            </div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className={`${cell} w-24 text-left`}>{bn ? 'তারিখ' : 'Date'}</th>
                  <th className={`${cell} text-left`}>{bn ? 'বিবরণ' : 'Particulars'}</th>
                  <th className={`${cell} w-28 text-right`}>{bn ? 'ডেবিট টাকা (Dr)' : 'Dr. Taka'}</th>
                  <th className={`${cell} w-28 text-right`}>{bn ? 'ক্রেডিট টাকা (Cr)' : 'Cr. Taka'}</th>
                  <th className={`${cell} w-32 text-right`}>{bn ? 'নিট ব্যালেন্স' : 'Net Balance'}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-amber-50 font-semibold">
                  <td className={cell}></td>
                  <td className={cell}>{bn ? 'প্রারম্ভিক জের (গত সময়ের সমাপনী)' : 'Opening Balance (b/f)'}</td>
                  <td className={cell}></td>
                  <td className={cell}></td>
                  <td className={`${cell} text-right font-mono`}>{formatCurrency(Math.abs(ledger.opening), lang)} {balLabel(ledger.opening, bn)}</td>
                </tr>
                {ledger.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className={`${cell} text-center text-slate-500 py-3`}>{bn ? 'এই সময়ে কোনো লেনদেন নেই' : 'No entries in this period'}</td>
                  </tr>
                )}
                {ledger.rows.map((r) => (
                  <tr key={r.id}>
                    <td className={`${cell} font-mono`}>{formatDate(r.date, lang)}</td>
                    <td className={cell}>{r.particulars}</td>
                    <td className={`${cell} text-right font-mono`}>{r.dr ? formatCurrency(r.dr, lang) : ''}</td>
                    <td className={`${cell} text-right font-mono`}>{r.cr ? formatCurrency(r.cr, lang) : ''}</td>
                    <td className={`${cell} text-right font-mono`}>{formatCurrency(Math.abs(r.balance), lang)} {balLabel(r.balance, bn)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td className={cell}></td>
                  <td className={cell}>{bn ? 'মোট / সমাপনী জের (c/f)' : 'Total / Closing Balance (c/f)'}</td>
                  <td className={`${cell} text-right font-mono`}>{formatCurrency(ledger.totalDr, lang)}</td>
                  <td className={`${cell} text-right font-mono`}>{formatCurrency(ledger.totalCr, lang)}</td>
                  <td className={`${cell} text-right font-mono`}>{formatCurrency(Math.abs(ledger.closing), lang)} {balLabel(ledger.closing, bn)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-2 text-[10px] text-slate-500">
              {bn
                ? 'Dr = চীন অফিসে পাঠানো মালের মূল্য | Cr = চীন অফিস থেকে সরাসরি টাকা + RMB কনভার্ট করা টাকা'
                : 'Dr = goods sent to China Office | Cr = direct cash from China Office + RMB converted to BDT'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
