import React from 'react';
import { X, FileText, Printer, Download, Sparkles, Phone, ArrowRight } from 'lucide-react';
import { StatementType, Language } from '../types';
import { translations } from '../lib/translations';

interface StatementSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectStatement: (type: StatementType) => void;
}

export const StatementSelectorModal: React.FC<StatementSelectorModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSelectStatement,
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  const statementOptions: {
    type: StatementType;
    title: string;
    subtitle: string;
    iconColor: string;
    badge: string;
    number: string;
  }[] = [
    {
      type: 'stock',
      number: '1',
      title: t.stockStatement1Page,
      subtitle:
        lang === 'bn'
          ? '৪ ক্যাটাগরির বর্তমান মজুত ও গড় ক্রয় দরে মোট স্টক ভ্যালুয়েশন শিট'
          : '4-category current stock and inventory valuation statement',
      iconColor: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      badge: lang === 'bn' ? 'স্টক ও গোডাউন' : 'Stock & Inventory',
    },
    {
      type: 'party',
      number: '2',
      title: t.partyStatement1Page,
      subtitle:
        lang === 'bn'
          ? 'সকল মহাজন ও পার্টির বাকি, বর্তমান অগ্রিম জমা এবং ব্যালেন্স শিট'
          : 'All suppliers & buyers due balance and advance statement',
      iconColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      badge: lang === 'bn' ? 'পার্টি ও মহাজন হিসাব' : 'Party & Ledger',
    },
    {
      type: 'payroll',
      number: '3',
      title: t.payrollStatement1Page,
      subtitle:
        lang === 'bn'
          ? 'স্টাফ হাজিরা, লেট হিসাব, ৬০ টাকা হারে ওভারটাইম ও নিট পে-স্লিপ শিট'
          : 'Staff attendance, ৳60/hr overtime, advance deduction & salary sheet',
      iconColor: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      badge: lang === 'bn' ? 'বেতন ও পে-রোল' : 'HR & Payroll',
    },
    {
      type: 'expense',
      number: '4',
      title: t.expenseStatement1Page,
      subtitle:
        lang === 'bn'
          ? 'অফিস পেটি ক্যাশ ও গাড়ি খরচের সমন্বিত মাসিক হিসাব শিট'
          : 'Combined office petty cash and car maintenance expense statement',
      iconColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      badge: lang === 'bn' ? 'খরচ ও পেটি ক্যাশ' : 'Expenses & Office',
    },
    {
      type: 'financial',
      number: '5',
      title: t.financialAnalyticsStatement1Page,
      subtitle:
        lang === 'bn'
          ? 'বিক্রয় আয়, ক্রয় খরচ, দৈনন্দিন ব্যয়, স্টাফ বেতন, নিট লাভ-ক্ষতি (P&L) ও ROI রিপোর্ট'
          : 'Total revenue, purchases, expenses, paid salaries, Net P&L and ROI statement',
      iconColor: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400',
      badge: lang === 'bn' ? 'P&L ও ROI' : 'P&L & ROI',
    },
    {
      type: 'worker_tracking',
      number: '6',
      title: lang === 'bn' ? 'প্রসেসিং কর্মীভিত্তিক ওয়ার্কার ট্র্যাকিং ও ড্যামেজ শিট' : 'Processing Worker Task & Damage Statement',
      subtitle:
        lang === 'bn'
          ? 'প্রসেসিং স্টাফদের মাল প্রদান (PCS), ডেলিভারি, বকেয়া কাজ ও ড্যামেজ বা নষ্টের বিবরণী'
          : 'Worker task given PCS, completed delivery, remaining and wastage ledger',
      iconColor: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      badge: lang === 'bn' ? 'প্রসেসিং ও ড্যামেজ' : 'Worker & Damage',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {lang === 'bn' ? '১-পৃষ্ঠা স্টেটমেন্ট ও PDF প্রিন্ট হাব' : '1-Page Statement & PDF Print Hub'}
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'bn'
                  ? 'কোন স্টেটমেন্টটি প্রিন্ট, PDF সেভ বা হোয়াটসঅ্যাপে পাঠাতে চান নির্বাচন করুন'
                  : 'Select which statement you want to print, save as PDF or share on WhatsApp'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of 4 statement types */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 gap-2.5">
            {statementOptions.map((opt) => (
              <div
                key={opt.type}
                onClick={() => {
                  onSelectStatement(opt.type);
                  onClose();
                }}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-850 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-2xs hover:shadow-md"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-sm shrink-0 ${opt.iconColor}`}
                  >
                    {opt.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {opt.title}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {opt.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 px-3 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <span>{lang === 'bn' ? 'ওপেন' : 'Open'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {lang === 'bn' ? 'অটো-সেভ ও শেয়ার সুবিধা:' : 'Auto Save & Direct Sharing:'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                {lang === 'bn'
                  ? 'প্রতিটি স্টেটমেন্ট ১-পৃষ্ঠার এ-ফোর (A4) সাইজে স্বয়ংক্রিয়ভাবে PDF ফাইলে সেভ হবে এবং আসল পৃষ্ঠার ছবি হোয়াটসঅ্যাপে মোবাইল ১, মোবাইল ২ বা যেকোনো গ্রুপে সরাসরি পাঠানো যাবে।'
                  : 'Every statement is optimized for 1-Page A4 PDF export and high-resolution image sharing directly to WhatsApp numbers or groups.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
