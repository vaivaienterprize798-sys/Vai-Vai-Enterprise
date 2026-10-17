import React, { useMemo, useState } from 'react';
import { Printer, Download, Calendar, RotateCcw, BookOpen, Wallet, MapPin, Phone } from 'lucide-react';
import { CarExpense, CompanyInfo, DokanPayment, Invoice, Language, Party, PettyCashExpense } from '../types';
import { formatCurrency, formatDate } from '../lib/translations';
import { executePrint, exportElementToPdf } from '../lib/printUtils';
import {
  PeriodStatement,
  StatementEntry,
  buildPeriodStatement,
  partyNaturalOpening,
  partyStatementEntries,
} from '../lib/ledger';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { CompanyLogo } from './CompanyLogo';
import { storageService } from '../lib/storage';

/* ----------------------------- date helpers ----------------------------- */
const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
const monthEnd = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};
const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (ym: string, lang: Language) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
};

export interface PeriodFilter {
  from: string;
  to: string;
  month: string; // YYYY-MM when a month is selected, '' otherwise
}

const ALL_TIME: PeriodFilter = { from: '', to: '', month: '' };

const periodText = (f: PeriodFilter, lang: Language) => {
  if (f.month) return monthLabel(f.month, lang);
  if (!f.from && !f.to) return lang === 'bn' ? 'সকল সময় (All Time)' : 'All Time';
  if (f.from && f.from === f.to) return formatDate(f.from, lang);
  return `${f.from ? formatDate(f.from, lang) : '...'} — ${f.to ? formatDate(f.to, lang) : '...'}`;
};

const balanceTag = (v: number, lang: Language) =>
  v > 0 ? (lang === 'bn' ? 'বাকি (Due)' : 'Due') : v < 0 ? (lang === 'bn' ? 'অগ্রিম (Adv)' : 'Advance') : (lang === 'bn' ? 'নিল' : 'Nil');

/* ----------------------------- filter bar ----------------------------- */
const PeriodFilterBar: React.FC<{
  value: PeriodFilter;
  onChange: (f: PeriodFilter) => void;
  months: string[];
  lang: Language;
}> = ({ value, onChange, months, lang }) => {
  const today = localToday();
  const thisMonth = today.slice(0, 7);
  const presets: { key: string; label: string; f: PeriodFilter }[] = [
    { key: 'today', label: lang === 'bn' ? 'আজ' : 'Today', f: { from: today, to: today, month: '' } },
    { key: 'this', label: lang === 'bn' ? 'এই মাস' : 'This Month', f: { from: `${thisMonth}-01`, to: monthEnd(thisMonth), month: thisMonth } },
    {
      key: 'last',
      label: lang === 'bn' ? 'গত মাস' : 'Last Month',
      f: { from: `${shiftMonth(thisMonth, -1)}-01`, to: monthEnd(shiftMonth(thisMonth, -1)), month: shiftMonth(thisMonth, -1) },
    },
    { key: 'all', label: lang === 'bn' ? 'রিসেট / সকল সময়' : 'Reset / All Time', f: ALL_TIME },
  ];
  const same = (a: PeriodFilter, b: PeriodFilter) => a.from === b.from && a.to === b.to;
  const input = 'px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white';

  return (
    <div className="flex flex-col lg:flex-row lg:items-end gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 no-print">
      <div>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
          <Calendar className="w-3 h-3 inline mr-1" />
          {lang === 'bn' ? 'মাস নির্বাচন' : 'Month'}
        </label>
        <select
          value={value.month}
          onChange={(e) => {
            const m = e.target.value;
            onChange(m ? { from: `${m}-01`, to: monthEnd(m), month: m } : ALL_TIME);
          }}
          className={`${input} min-w-[160px] font-semibold`}
        >
          <option value="">{lang === 'bn' ? '— সকল মাস —' : '— All months —'}</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m, lang)}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{lang === 'bn' ? 'শুরুর তারিখ' : 'From Date'}</label>
          <input type="date" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value, month: '' })} className={`${input} font-mono`} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{lang === 'bn' ? 'শেষ তারিখ' : 'To Date'}</label>
          <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value, month: '' })} className={`${input} font-mono`} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 lg:ml-auto">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.f)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              same(value, p.f)
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {p.key === 'all' && <RotateCcw className="w-3 h-3" />}
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const monthsFromEntries = (entries: { date: string }[]) => {
  const thisMonth = localToday().slice(0, 7);
  const dates = entries.map((e) => (e.date || '').slice(0, 7)).filter((d) => /^\d{4}-\d{2}$/.test(d));
  let start = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : thisMonth;
  if (start > thisMonth) start = thisMonth;
  const out: string[] = [];
  for (let m = thisMonth; m >= start && out.length < 120; m = shiftMonth(m, -1)) out.push(m);
  return out;
};

/* ----------------------------- printable table ----------------------------- */
const StatementSheet: React.FC<{
  id: string;
  title: string;
  subtitle: string;
  partyLines: string[];
  statement: PeriodStatement;
  filter: PeriodFilter;
  lang: Language;
  companyInfo: CompanyInfo;
  drLabel: string;
  crLabel: string;
  balanceMode: 'dueAdvance' | 'cash';
  onRowClick?: (e: StatementEntry) => void;
}> = ({ id, title, subtitle, partyLines, statement, filter, lang, companyInfo, drLabel, crLabel, balanceMode, onRowClick }) => {
  const fmtBal = (v: number) =>
    balanceMode === 'cash'
      ? formatCurrency(v, lang)
      : `${formatCurrency(Math.abs(v), lang)} ${v !== 0 ? (v > 0 ? 'Dr' : 'Cr') : ''}`;
  const th = 'p-2 border border-slate-300 text-[11px] font-bold';
  const td = 'p-2 border border-slate-200 text-xs';
  return (
    <div id={id} className="one-page-sheet bg-white text-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* Centralized Framed Company Header Box */}
      <div className="mb-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Top Golden Accent Bar */}
        <div className="w-full h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-t-full mb-3" />

        {/* Centralized Logo & Premium Vibrant Company Name */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 z-10">
          <div className="p-1.5 bg-white rounded-2xl shadow-md border-2 border-amber-400 shrink-0">
            <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-amber-300 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-tight leading-tight uppercase font-sans drop-shadow-md">
              {companyInfo.name}
            </h1>
            <div className="inline-block px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white text-[11px] font-extrabold tracking-wide uppercase shadow-xs">
              {lang === 'bn' ? companyInfo.businessTypeBn : companyInfo.businessTypeEn}
            </div>
          </div>
        </div>

        {/* Centralized Contact Details Ribbon */}
        <div className="text-[11px] text-slate-200 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 pt-2.5 border-t border-slate-800/80 w-full font-medium z-10">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{companyInfo.address}</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-cyan-300 font-bold">
            <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{companyInfo.phones.join(', ')}</span>
          </span>
        </div>

        {/* Statement Badge & Period Line */}
        <div className="mt-2.5 pt-2 w-full flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800 text-xs font-mono z-10">
          <div className="flex items-center gap-2">
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow-md">
              {title}
            </span>
            <span className="text-[11px] text-amber-300 font-bold">({subtitle})</span>
          </div>
          <div className="text-[11px] text-slate-200 font-bold">
            {lang === 'bn' ? 'সময়কাল: ' : 'Period: '}
            <strong className="text-cyan-300 font-bold">{periodText(filter, lang)}</strong>
          </div>
        </div>
      </div>

      {partyLines.length > 0 && (
        <div className="mb-4 p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-blue-50/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4 text-cyan-200" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-700 text-white font-black text-[10px] uppercase">
                  {lang === 'bn' ? 'পার্টির নাম' : 'Party Name'}
                </span>
                <span className="font-black text-base sm:text-lg text-indigo-950 uppercase">{partyLines[0]}</span>
              </div>
              {partyLines.length > 1 && (
                <div className="flex items-center gap-1 text-slate-800 font-bold text-xs pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{partyLines.slice(1).join(' • ')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 text-center sm:text-right border-t sm:border-t-0 sm:border-l sm:pl-4 border-indigo-200/80 pt-1.5 sm:pt-0">
            <span className="text-[10px] uppercase font-black text-indigo-700 block">
              {lang === 'bn' ? 'পার্টি লেজার খাতা' : 'Party Ledger'}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-700">
              {periodText(filter, lang)}
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className={`${th} text-left w-24`}>{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
              <th className={`${th} text-left w-32`}>{lang === 'bn' ? 'ইনভয়েস/ভাউচার নং' : 'Invoice No.'}</th>
              <th className={`${th} text-left`}>{lang === 'bn' ? 'বিবরণ' : 'Particulars'}</th>
              <th className={`${th} text-right w-28`}>{drLabel}</th>
              <th className={`${th} text-right w-28`}>{crLabel}</th>
              <th className={`${th} text-right w-32`}>{lang === 'bn' ? 'নিট ব্যালেন্স (৳)' : 'Net Balance (৳)'}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-amber-50">
              <td className={`${td} font-mono`}>{filter.from ? formatDate(filter.from, lang) : '—'}</td>
              <td className={`${td} font-mono text-slate-500`}>B/F</td>
              <td className={`${td} font-semibold italic`}>
                {lang === 'bn' ? 'প্রারম্ভিক / পূর্বের জের (Opening Balance b/f)' : 'Opening Balance (brought forward)'}
              </td>
              <td className={`${td} text-right`}>—</td>
              <td className={`${td} text-right`}>—</td>
              <td className={`${td} text-right font-mono font-bold`}>{fmtBal(statement.opening)}</td>
            </tr>
            {statement.rows.length === 0 && (
              <tr>
                <td colSpan={6} className={`${td} text-center text-slate-400 py-6`}>
                  {lang === 'bn' ? 'এই সময়ে কোনো লেনদেন নেই' : 'No transactions in this period'}
                </td>
              </tr>
            )}
            {statement.rows.map((r) => (
              <tr
                key={r.id}
                onClick={onRowClick && r.invoice ? () => onRowClick(r) : undefined}
                className={onRowClick && r.invoice ? 'cursor-pointer hover:bg-indigo-50' : ''}
              >
                <td className={`${td} font-mono`}>{formatDate(r.date, lang)}</td>
                <td className={`${td} font-mono font-semibold`}>{r.refNo}</td>
                <td className={td}>{r.particulars}</td>
                <td className={`${td} text-right font-mono`}>{r.dr ? formatCurrency(r.dr, lang) : '—'}</td>
                <td className={`${td} text-right font-mono`}>{r.cr ? formatCurrency(r.cr, lang) : '—'}</td>
                <td className={`${td} text-right font-mono font-bold ${balanceMode === 'dueAdvance' ? (r.balance > 0 ? 'text-rose-700' : r.balance < 0 ? 'text-emerald-700' : '') : ''}`}>
                  {fmtBal(r.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white">
              <td colSpan={3} className="p-2 text-xs font-black text-right">{lang === 'bn' ? 'সর্বমোট (Total)' : 'Total'}</td>
              <td className="p-2 text-xs font-black text-right font-mono">{formatCurrency(statement.totalDr, lang)}</td>
              <td className="p-2 text-xs font-black text-right font-mono">{formatCurrency(statement.totalCr, lang)}</td>
              <td className="p-2 text-xs font-black text-right font-mono">{fmtBal(statement.closing)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Dynamic & Colorful Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5 text-xs">
        <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 shadow-2xs">
          <div className="text-[10px] text-amber-800 font-extrabold uppercase">{lang === 'bn' ? 'প্রারম্ভিক জের' : 'Opening'}</div>
          <div className="font-mono font-black text-sm text-amber-900 mt-0.5">{fmtBal(statement.opening)}</div>
        </div>
        <div className="p-2.5 rounded-xl border border-blue-300 bg-blue-50/90 text-blue-950 shadow-2xs">
          <div className="text-[10px] text-blue-800 font-extrabold uppercase">{lang === 'bn' ? 'মোট ডেবিট' : 'Total Debit'}</div>
          <div className="font-mono font-black text-sm text-blue-900 mt-0.5">{formatCurrency(statement.totalDr, lang)}</div>
        </div>
        <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 text-emerald-950 shadow-2xs">
          <div className="text-[10px] text-emerald-800 font-extrabold uppercase">{lang === 'bn' ? 'মোট ক্রেডিট' : 'Total Credit'}</div>
          <div className="font-mono font-black text-sm text-emerald-900 mt-0.5">{formatCurrency(statement.totalCr, lang)}</div>
        </div>
        <div className={`p-2.5 rounded-xl border-2 shadow-2xs ${balanceMode === 'dueAdvance' ? (statement.closing > 0 ? 'border-rose-400 bg-rose-50 text-rose-950' : statement.closing < 0 ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-slate-300 bg-slate-50 text-slate-800') : 'border-slate-800 bg-slate-100'}`}>
          <div className="text-[10px] uppercase font-black">
            {lang === 'bn' ? 'সমাপনী জের' : 'Closing'} {balanceMode === 'dueAdvance' ? `- ${balanceTag(statement.closing, lang)}` : ''}
          </div>
          <div className="font-mono font-black text-base mt-0.5">
            {balanceMode === 'cash' ? formatCurrency(statement.closing, lang) : formatCurrency(Math.abs(statement.closing), lang)}
          </div>
        </div>
      </div>

      {/* Unique Dynamic Signatures Section */}
      <div className="grid grid-cols-2 gap-6 pt-10 text-center text-xs">
        <div className="p-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 flex flex-col justify-between h-20">
          <div className="w-full border-b border-dashed border-slate-300 pb-3 text-transparent select-none">.</div>
          <div className="font-black text-slate-800 text-[11px] flex items-center justify-center gap-1">
            <span>📋 {lang === 'bn' ? 'হিসাবরক্ষক' : 'Accountant'}</span>
          </div>
        </div>
        <div className="p-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 flex flex-col justify-between h-20">
          <div className="w-full border-b border-dashed border-indigo-200 pb-3 text-transparent select-none">.</div>
          <div className="font-black text-indigo-900 text-[11px] flex items-center justify-center gap-1">
            <span>🏛️ {lang === 'bn' ? 'অনুমোদনকারী ও সিল' : 'Authorised Signature'}</span>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] text-slate-400 mt-2">
        {lang === 'bn' ? 'প্রিন্টের তারিখ' : 'Printed on'}: {formatDate(localToday(), lang)}
      </p>
    </div>
  );
};

const ActionButtons: React.FC<{
  elementId: string;
  fileBase: string;
  printTitle: string;
  getText: () => string;
  lang: Language;
}> = ({ elementId, fileBase, printTitle, getText, lang }) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <WhatsAppShareDropdown
        getText={getText}
        lang={lang}
        targetElementId={elementId}
        fileName={`${fileBase}.png`}
        buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপে শেয়ার' : 'Share via WhatsApp'}
      />
      <button
        onClick={async () => {
          setBusy(true);
          await exportElementToPdf(elementId, `${fileBase}.pdf`);
          setBusy(false);
        }}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        {busy ? '...' : 'PDF'}
      </button>
      <button
        onClick={() => executePrint(elementId, printTitle)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5" />
        {lang === 'bn' ? 'প্রিন্ট' : 'Print'}
      </button>
    </div>
  );
};

const statementWhatsAppText = (
  heading: string,
  name: string,
  st: PeriodStatement,
  filter: PeriodFilter,
  lang: Language,
  companyName: string,
  mode: 'dueAdvance' | 'cash'
) => {
  const lines = st.rows
    .slice(-25)
    .map((r) => `• ${r.date} | ${r.refNo} | ${r.particulars}${r.dr ? ` | Dr ৳${r.dr.toLocaleString()}` : ''}${r.cr ? ` | Cr ৳${r.cr.toLocaleString()}` : ''} | Bal ৳${r.balance.toLocaleString()}`)
    .join('\n');
  const closing =
    mode === 'cash'
      ? `💰 *সমাপনী জের (Closing):* ৳${st.closing.toLocaleString()}`
      : st.closing > 0
      ? `🔴 *সমাপনী বাকি (Net Due):* ৳${Math.abs(st.closing).toLocaleString()}`
      : st.closing < 0
      ? `🟢 *সমাপনী অগ্রিম (Net Advance):* ৳${Math.abs(st.closing).toLocaleString()}`
      : `⚪ *হিসাব পরিশোধিত (Settled)*`;
  return `*${companyName} - ${heading}*
👤 ${name}
📅 *সময়:* ${periodText(filter, lang)}
────────────────────────
↪️ *প্রারম্ভিক জের (Opening):* ৳${st.opening.toLocaleString()}
${lines || 'এই সময়ে কোনো লেনদেন নেই'}${st.rows.length > 25 ? `\n… (${st.rows.length - 25} টি পূর্বের লেনদেন)` : ''}
────────────────────────
📈 *মোট ডেবিট:* ৳${st.totalDr.toLocaleString()}
📉 *মোট ক্রেডিট:* ৳${st.totalCr.toLocaleString()}
${closing}
────────────────────────
_${companyName}_`;
};

/* ============================ Party Ledger ============================ */
const SHOP_ID = '__shop__';

export const shopStatementEntries = (dokanInvoices: Invoice[], dokanPayments: DokanPayment[], lang: Language): StatementEntry[] => [
  ...dokanInvoices.map((inv) => ({
    id: inv.id,
    date: inv.date,
    createdAt: inv.createdAt,
    refNo: inv.invoiceNo,
    particulars: lang === 'bn' ? 'দোকান ক্রয় ইনভয়েস' : 'Shop Purchase Invoice',
    dr: Number(inv.netInvoiceAmount || inv.grandTotal || 0),
    cr: Number(inv.paidAmount || 0),
    invoice: inv,
  })),
  ...dokanPayments.map((p) => ({
    id: p.id,
    date: p.date,
    createdAt: p.createdAt,
    refNo: p.voucherNo || '—',
    particulars: `${lang === 'bn' ? 'দোকানে পেমেন্ট প্রদান' : 'Payment Paid to Shop'}${p.notes ? ` (${p.notes})` : ''}`,
    dr: 0,
    cr: Number(p.amount || 0),
  })),
];

export const PartyLedgerStatement: React.FC<{
  parties: Party[];
  invoices: Invoice[];
  dokanInvoices: Invoice[];
  dokanPayments: DokanPayment[];
  lang: Language;
  companyInfo: CompanyInfo;
  onViewInvoice?: (inv: Invoice) => void;
}> = ({ parties, invoices, dokanInvoices, dokanPayments, lang, companyInfo, onViewInvoice }) => {
  const [partyId, setPartyId] = useState<string>(SHOP_ID);
  const [filter, setFilter] = useState<PeriodFilter>(ALL_TIME);
  const party = parties.find((p) => p.id === partyId) || null;

  const { entries, baseOpening } = useMemo(() => {
    if (party) return { entries: partyStatementEntries(party, invoices, lang), baseOpening: partyNaturalOpening(party) };
    return { entries: shopStatementEntries(dokanInvoices, dokanPayments, lang), baseOpening: storageService.getDokanOpeningBalance() };
  }, [party, invoices, dokanInvoices, dokanPayments, lang]);

  const statement = useMemo(() => buildPeriodStatement(entries, baseOpening, filter.from || undefined, filter.to || undefined), [entries, baseOpening, filter]);
  const months = useMemo(() => monthsFromEntries(entries), [entries]);

  const name = party ? party.name : lang === 'bn' ? 'দোকান (Shop Counter)' : 'Shop Counter';
  const partyLines = party
    ? [party.name, [party.address, party.phone].filter(Boolean).join(' | ')].filter(Boolean)
    : [name];
  const fileBase = `ledger-${(party?.name || 'shop').replace(/\s+/g, '-')}-${filter.from || 'all'}-${filter.to || 'all'}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            <BookOpen className="w-3 h-3 inline mr-1" />
            {lang === 'bn' ? 'পার্টি নির্বাচন করুন' : 'Select Party'}
          </label>
          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white min-w-[260px]"
          >
            <option value={SHOP_ID}>{lang === 'bn' ? 'দোকান (Shop Counter)' : 'Shop Counter'}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.phone ? ` — ${p.phone}` : ''}</option>
            ))}
          </select>
        </div>
        <ActionButtons
          elementId="party-ledger-print"
          fileBase={fileBase}
          printTitle={`${companyInfo.name} - ${name} - Ledger`}
          getText={() => statementWhatsAppText(lang === 'bn' ? 'পার্টি লেজার স্টেটমেন্ট' : 'Party Ledger Statement', name, statement, filter, lang, companyInfo.name, 'dueAdvance')}
          lang={lang}
        />
      </div>
      <PeriodFilterBar value={filter} onChange={setFilter} months={months} lang={lang} />
      <StatementSheet
        id="party-ledger-print"
        title={lang === 'bn' ? 'পার্টি লেজার / স্টেটমেন্ট' : 'PARTY LEDGER STATEMENT'}
        subtitle={lang === 'bn' ? 'হিসাব বিবরণী' : 'Statement of Account'}
        partyLines={partyLines}
        statement={statement}
        filter={filter}
        lang={lang}
        companyInfo={companyInfo}
        drLabel={lang === 'bn' ? 'ডেবিট (৳) বিল' : 'Dr. Amount (৳)'}
        crLabel={lang === 'bn' ? 'ক্রেডিট (৳) পেমেন্ট' : 'Cr. Amount (৳)'}
        balanceMode="dueAdvance"
        onRowClick={onViewInvoice ? (r) => r.invoice && onViewInvoice(r.invoice) : undefined}
      />
    </div>
  );
};

/* ============================ Daily Cash Book ============================ */
export const cashBookEntries = (
  invoices: Invoice[],
  dokanPayments: DokanPayment[],
  pettyCash: PettyCashExpense[],
  carExpenses: CarExpense[],
  lang: Language
): StatementEntry[] => {
  const out: StatementEntry[] = [];
  for (const inv of invoices || []) {
    const paid = Number(inv.paidAmount) || 0;
    if (!paid || inv.type === 'processing') continue;
    const isIn = inv.voucherKind ? inv.voucherKind === 'payment_received' : inv.mode === 'sales';
    out.push({
      id: `cb-${inv.id}`,
      date: inv.date,
      createdAt: inv.createdAt,
      refNo: inv.invoiceNo,
      particulars: `${isIn ? (lang === 'bn' ? 'টাকা গ্রহণ' : 'Cash In') : (lang === 'bn' ? 'টাকা প্রদান' : 'Cash Out')} — ${inv.partyName}`,
      dr: isIn ? paid : 0,
      cr: isIn ? 0 : paid,
      invoice: inv,
    });
  }
  for (const p of dokanPayments || [])
    out.push({ id: `cb-${p.id}`, date: p.date, createdAt: p.createdAt, refNo: p.voucherNo || '—', particulars: lang === 'bn' ? 'দোকানে পরিশোধ' : 'Paid to Shop', dr: 0, cr: Number(p.amount) || 0 });
  for (const e of pettyCash || [])
    out.push({ id: `cb-${e.id}`, date: e.date, refNo: e.voucherNo || e.receiptNo || '—', particulars: `${lang === 'bn' ? 'অফিস খরচ' : 'Office Expense'} — ${e.title}`, dr: 0, cr: Number(e.amount) || 0 });
  for (const e of carExpenses || [])
    out.push({ id: `cb-${e.id}`, date: e.date, refNo: e.voucherNo || e.receiptNo || '—', particulars: `${lang === 'bn' ? 'গাড়ি খরচ' : 'Vehicle Expense'} — ${e.title}`, dr: 0, cr: Number(e.amount) || 0 });
  return out;
};

export const DailyCashBook: React.FC<{
  invoices: Invoice[];
  dokanPayments: DokanPayment[];
  pettyCash: PettyCashExpense[];
  carExpenses: CarExpense[];
  lang: Language;
  companyInfo: CompanyInfo;
  onViewInvoice?: (inv: Invoice) => void;
}> = ({ invoices, dokanPayments, pettyCash, carExpenses, lang, companyInfo, onViewInvoice }) => {
  const today = localToday();
  const [filter, setFilter] = useState<PeriodFilter>({ from: today, to: today, month: '' });
  const entries = useMemo(() => cashBookEntries(invoices, dokanPayments, pettyCash, carExpenses, lang), [invoices, dokanPayments, pettyCash, carExpenses, lang]);
  const statement = useMemo(() => buildPeriodStatement(entries, storageService.getCashBookOpeningBalance(), filter.from || undefined, filter.to || undefined), [entries, filter]);
  const months = useMemo(() => monthsFromEntries(entries), [entries]);
  const fileBase = `cash-book-${filter.from || 'all'}-${filter.to || 'all'}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Wallet className="w-4 h-4 text-emerald-600" />
          {lang === 'bn' ? 'দৈনিক ক্যাশ বুক (স্বয়ংক্রিয় জের স্থানান্তর)' : 'Daily Cash Book (auto carry-forward)'}
        </div>
        <ActionButtons
          elementId="cash-book-print"
          fileBase={fileBase}
          printTitle={`${companyInfo.name} - Cash Book`}
          getText={() => statementWhatsAppText(lang === 'bn' ? 'ক্যাশ বুক' : 'Cash Book', lang === 'bn' ? 'দৈনিক ক্যাশ বুক' : 'Daily Cash Book', statement, filter, lang, companyInfo.name, 'cash')}
          lang={lang}
        />
      </div>
      <PeriodFilterBar value={filter} onChange={setFilter} months={months} lang={lang} />
      <StatementSheet
        id="cash-book-print"
        title={lang === 'bn' ? 'ক্যাশ বুক' : 'CASH BOOK'}
        subtitle={lang === 'bn' ? 'গতকালের সমাপনী = আজকের প্রারম্ভিক জের' : "Yesterday's closing = today's opening"}
        partyLines={[]}
        statement={statement}
        filter={filter}
        lang={lang}
        companyInfo={companyInfo}
        drLabel={lang === 'bn' ? 'জমা / আয় (৳)' : 'Cash In (৳)'}
        crLabel={lang === 'bn' ? 'খরচ / প্রদান (৳)' : 'Cash Out (৳)'}
        balanceMode="cash"
        onRowClick={onViewInvoice ? (r) => r.invoice && onViewInvoice(r.invoice) : undefined}
      />
    </div>
  );
};
