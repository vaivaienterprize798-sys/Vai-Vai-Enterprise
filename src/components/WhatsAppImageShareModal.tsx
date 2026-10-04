import React, { useState } from 'react';
import {
  Download,
  Share2,
  Copy,
  CheckCircle2,
  X,
  MessageCircle,
  PhoneCall,
  Users,
  Eye,
  FileDown,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';
import { WHATSAPP_NUMBERS, exportElementToPdf, sendToWhatsApp } from '../lib/printUtils';

interface WhatsAppImageShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  imageUrl: string;
  imageBlob: Blob;
  fileName: string;
  captionText: string;
  targetElementId?: string;
  onNotification?: (msg: string) => void;
}

export const WhatsAppImageShareModal: React.FC<WhatsAppImageShareModalProps> = ({
  isOpen,
  onClose,
  lang,
  imageUrl,
  imageBlob,
  fileName,
  captionText,
  targetElementId,
  onNotification,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPdfSaving, setIsPdfSaving] = useState(false);

  if (!isOpen) return null;

  const pdfFileName = fileName.replace(/\.(png|jpg|jpeg)$/i, '') + '.pdf';

  const handleCopyImage = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob }),
        ]);
        setCopied(true);
        if (onNotification) {
          onNotification(
            lang === 'bn'
              ? '✅ পেইজের ছবি ক্লিপবোর্ডে কপি হয়েছে! হোয়াটসঅ্যাপে গিয়ে Ctrl+V চাপুন'
              : '✅ Page image copied to clipboard! Paste in WhatsApp with Ctrl+V'
          );
        }
        setTimeout(() => setCopied(false), 3000);
      } else {
        handleDownloadImage();
      }
    } catch (e) {
      console.warn('Clipboard write failed, triggering download', e);
      handleDownloadImage();
    }
  };

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onNotification) {
      onNotification(
        lang === 'bn' ? '📥 পেইজের ছবি ডাউনলোড হয়েছে!' : '📥 Image downloaded!'
      );
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfSaving(true);
    try {
      if (targetElementId) {
        await exportElementToPdf(targetElementId, pdfFileName);
      } else {
        // Fallback using direct image in PDF
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName;
        link.click();
      }
      if (onNotification) {
        onNotification(
          lang === 'bn' ? '📄 ১-পৃষ্ঠা PDF ফাইল স্বয়ংক্রিয়ভাবে ডাউনলোড হয়েছে!' : '📄 1-Page PDF downloaded!'
        );
      }
    } catch (e) {
      console.error('PDF save error:', e);
    } finally {
      setIsPdfSaving(false);
    }
  };

  const handleNativeShare = async () => {
    const file = new File([imageBlob], fileName, { type: 'image/png' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
          text: captionText,
        });
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed:', err);
        }
      }
    } else {
      handleCopyImage();
    }
  };

  const handleOpenWhatsAppChat = (target: 'phone1' | 'phone2' | 'group') => {
    // Copy image to clipboard and trigger PDF save
    handleCopyImage();
    handleDownloadPdf();

    const instruction =
      lang === 'bn'
        ? `📄 [পেইজের ছবি ও ১-পৃষ্ঠা PDF সেভ করা হয়েছে। নিচের চ্যাটে Paste (Ctrl+V) বা 📎 চেপে ফাইল যুক্ত করুন]\n\n${captionText}`
        : `📄 [Page image and 1-page PDF saved. Paste or attach via paperclip in chat]\n\n${captionText}`;

    sendToWhatsApp(instruction, target);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <MessageCircle className="w-5 h-5 fill-white/30" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                {lang === 'bn' ? 'হোয়াটসঅ্যাপে পেইজ ছবি ও PDF শেয়ার' : 'Share Page Image & PDF on WhatsApp'}
              </h3>
              <p className="text-[11px] text-emerald-100 opacity-90">
                {lang === 'bn' ? 'আসল ১-পৃষ্ঠা এ-ফোর (A4) শিটের নিখুঁত ছবি ও PDF প্রস্তুত' : 'High-definition 1-Page A4 Image & PDF Ready'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Quick Notice */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3 flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {lang === 'bn' ? 'ছবি ও PDF সহজে শেয়ার করার উপায়:' : 'How to share image & PDF easily:'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {lang === 'bn'
                  ? '১. নিচে "কাকে পাঠাবেন" অপশনে ক্লিক করলে চ্যাট ওপেন হবে এবং ছবি ক্লিপবোর্ডে কপি ও PDF ডাউনলোড হবে। ২. হোয়াটসঅ্যাপ চ্যাটে গিয়ে সরাসরি Ctrl+V চাপুন অথবা ৩. পেপারক্লিপ (📎) চেপে PDF ফাইল যুক্ত করে পাঠিয়ে দিন।'
                  : '1. Click recipient below to open chat; image copies to clipboard and PDF downloads automatically. 2. Press Ctrl+V in WhatsApp chat or attach downloaded PDF.'}
              </p>
            </div>
          </div>

          {/* Image Preview (Exact 1-Page A4 Sheet Rendering) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-100 dark:bg-slate-950 p-3 overflow-hidden flex flex-col items-center">
            <div className="flex items-center justify-between w-full px-1 py-1 text-[11px] font-semibold text-slate-500 mb-2">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'bn' ? '১-পৃষ্ঠা A4 প্রিন্ট শিট প্রিভিউ' : '1-Page A4 Sheet Print Preview'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold">
                100% A4 Print Match
              </span>
            </div>
            <div className="max-h-64 sm:max-h-72 overflow-y-auto w-full rounded-xl bg-slate-200/60 dark:bg-slate-900/80 p-3 flex justify-center shadow-inner">
              <div className="bg-white rounded-sm shadow-xl border border-slate-300 dark:border-slate-700 p-1 max-w-[420px] w-full transform transition-transform">
                <img
                  src={imageUrl}
                  alt="A4 Document Print Sheet"
                  className="w-full h-auto object-contain block select-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: Native Share, Copy Image, Download Image, Auto PDF */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-all gap-1 text-center"
              >
                <Share2 className="w-4 h-4" />
                <span>{lang === 'bn' ? 'সরাসরি শেয়ার' : 'Native Share'}</span>
                <span className="text-[9px] opacity-80 font-normal">মোবাইল অ্যাপ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyImage}
              className={`flex flex-col items-center justify-center p-2.5 rounded-2xl font-bold text-xs cursor-pointer transition-all gap-1 text-center border ${
                copied
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-teal-600" />}
              <span>{copied ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'ছবি কপি করুন' : 'Copy Image')}</span>
              <span className="text-[9px] opacity-75 font-normal">Ctrl + V পেস্ট</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs cursor-pointer transition-all gap-1 text-center"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'bn' ? 'ছবি ডাউনলোড' : 'Download PNG'}</span>
              <span className="text-[9px] opacity-75 font-normal">ইমেজ ফাইল</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isPdfSaving}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 font-bold text-xs cursor-pointer transition-all gap-1 text-center"
            >
              <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{isPdfSaving ? (lang === 'bn' ? 'তৈরি হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'PDF সেভ করুন' : 'Save PDF')}</span>
              <span className="text-[9px] opacity-75 font-normal">1-Page A4</span>
            </button>
          </div>

          {/* Direct Send Target Options */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {lang === 'bn' ? 'কাকে পাঠাবেন নির্বাচন করুন (চ্যাট ওপেন + ছবি/PDF সেভ হবে):' : 'Select recipient to send:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Mobile 1 */}
              <button
                type="button"
                onClick={() => handleOpenWhatsAppChat('phone1')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 text-left cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    {lang === 'bn' ? 'মোবাইল ১' : 'Mobile 1'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {WHATSAPP_NUMBERS.phone1Display}
                  </p>
                </div>
              </button>

              {/* Mobile 2 */}
              <button
                type="button"
                onClick={() => handleOpenWhatsAppChat('phone2')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 text-left cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    {lang === 'bn' ? 'মোবাইল ২' : 'Mobile 2'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">
                    {WHATSAPP_NUMBERS.phone2Display}
                  </p>
                </div>
              </button>

              {/* Any Contact / Group */}
              <button
                type="button"
                onClick={() => handleOpenWhatsAppChat('group')}
                className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 text-left cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    {lang === 'bn' ? 'হোয়াটসঅ্যাপ গ্রুপ / পার্সন' : 'WhatsApp Group'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {lang === 'bn' ? 'যে কাউকে শেয়ার' : 'Pick any chat'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {lang === 'bn' ? 'RSR ভাই ভাই এন্টারপ্রাইজ • ১-পৃষ্ঠা স্মার্ট প্রিন্ট ও PDF' : 'RSR Vai Vai Enterprise • 1-Page Smart Print & PDF'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
