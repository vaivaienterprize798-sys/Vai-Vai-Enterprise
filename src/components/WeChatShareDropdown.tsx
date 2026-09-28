import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  Share2,
  Loader2,
  FileImage,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { captureElementToBlob } from '../lib/printUtils';
import { Language } from '../types';

interface WeChatShareDropdownProps {
  getText?: () => string;
  lang: Language;
  buttonLabel?: string;
  className?: string;
  targetElementId?: string;
  fileName?: string;
  onNotification?: (msg: string) => void;
}

export const WeChatShareDropdown: React.FC<WeChatShareDropdownProps> = ({
  getText,
  lang,
  buttonLabel,
  className = '',
  targetElementId,
  fileName = 'rsr-wechat-statement.png',
  onNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageBlob, setPreviewImageBlob] = useState<Blob | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCaptureImage = async (): Promise<Blob | null> => {
    if (!targetElementId) return null;
    setIsCapturing(true);
    setFeedback(lang === 'bn' ? 'উইচ্যাট এইচডি ছবি প্রস্তুত হচ্ছে...' : 'Generating WeChat HD image...');
    try {
      const blob = await captureElementToBlob(targetElementId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewImageUrl(url);
        setPreviewImageBlob(blob);
        return blob;
      }
    } catch (e) {
      console.error('WeChat capture error:', e);
    } finally {
      setIsCapturing(false);
    }
    return null;
  };

  const handleCopyImage = async () => {
    try {
      const blob = previewImageBlob || (await handleCaptureImage());
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ [blob.type]: blob }),
        ]);
        setFeedback(lang === 'bn' ? 'ছবি কপি হয়েছে! WeChat এ সরাসরি Ctrl+V পেস্ট করুন' : 'Image copied! Paste directly into WeChat');
        if (onNotification) {
          onNotification(lang === 'bn' ? 'উইচ্যাটের জন্য ছবি কপি হয়েছে!' : 'WeChat image copied to clipboard!');
        }
      } else {
        // Fallback: download image
        handleDownloadImage();
      }
    } catch (err) {
      console.warn('Clipboard write failed, downloading instead:', err);
      handleDownloadImage();
    }
    setTimeout(() => {
      setFeedback(null);
      setIsOpen(false);
    }, 2500);
  };

  const handleDownloadImage = async () => {
    const blob = previewImageBlob || (await handleCaptureImage());
    if (blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setFeedback(lang === 'bn' ? 'ছবি ডাউনলোড সম্পন্ন হয়েছে!' : 'Image downloaded!');
      if (onNotification) {
        onNotification(lang === 'bn' ? 'উইচ্যাট রিপোর্ট ছবি ডাউনলোড হয়েছে' : 'WeChat image downloaded');
      }
    }
    setTimeout(() => {
      setFeedback(null);
      setIsOpen(false);
    }, 2000);
  };

  const handleWebShare = async () => {
    const blob = previewImageBlob || (await handleCaptureImage());
    if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) {
      try {
        const file = new File([blob], fileName, { type: blob.type });
        await navigator.share({
          title: 'RSR Vai Vai Enterprise - Statement',
          text: getText ? getText() : 'RSR Vai Vai Enterprise Report',
          files: [file],
        });
        setFeedback(lang === 'bn' ? 'সফলভাবে শেয়ার করা হয়েছে' : 'Shared successfully');
      } catch (err) {
        console.warn('WebShare cancelled or failed:', err);
      }
    } else {
      // Open preview dialog
      setPreviewModalOpen(true);
    }
    setIsOpen(false);
  };

  const defaultLabel = lang === 'bn' ? 'উইচ্যাট (WeChat)' : 'WeChat Share';

  return (
    <>
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isCapturing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
          title="WeChat Share"
        >
          {isCapturing ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <MessageSquare className="w-4 h-4 fill-teal-100/30" />
          )}
          <span>{buttonLabel || defaultLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 dark:ring-slate-800 focus:outline-hidden z-50 p-2 space-y-1 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 rounded-xl mb-1 border border-teal-100 dark:border-teal-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>{lang === 'bn' ? 'উইচ্যাট (WeChat) শেয়ার' : 'WeChat Share Hub'}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-600 text-white font-mono font-bold">
                  HD Image
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'bn' ? 'সরাসরি উইচ্যাটে পাঠানোর জন্য ১-পৃষ্ঠার রিপোর্ট ইমেজ' : '1-Page high-res statement image for WeChat'}
              </p>
            </div>

            {/* Option 1: Copy Image to Clipboard */}
            <button
              onClick={handleCopyImage}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 group-hover:scale-105 transition-transform">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'bn' ? 'ইমেজ কপি করুন (Ctrl+V)' : 'Copy Image to Clipboard'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {lang === 'bn' ? 'উইচ্যাট চ্যাটে সরাসরি পেস্ট করুন' : 'Paste directly in WeChat app/web'}
                  </div>
                </div>
              </div>
            </button>

            {/* Option 2: Download WeChat HD Image */}
            <button
              onClick={handleDownloadImage}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'bn' ? 'ছবি ডাউনলোড করুন' : 'Download Image'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {lang === 'bn' ? 'হাই-রেজোলিউশন PNG ফাইল' : 'High-res image for attachments'}
                  </div>
                </div>
              </div>
            </button>

            {/* Option 3: Direct App Share / Preview */}
            <button
              onClick={async () => {
                const blob = previewImageBlob || (await handleCaptureImage());
                if (blob) {
                  setPreviewModalOpen(true);
                  setIsOpen(false);
                }
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800 text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 group-hover:scale-105 transition-transform">
                  <FileImage className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'bn' ? 'ছবি প্রিভিউ ও শেয়ার' : 'Preview & Quick Share'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {lang === 'bn' ? 'উইচ্যাটে শেয়ারের জন্য বড় প্রিভিউ' : 'Open full HD image viewer'}
                  </div>
                </div>
              </div>
            </button>

            {feedback && (
              <div className="p-2 bg-teal-50 dark:bg-teal-950/60 rounded-lg text-center text-xs font-semibold text-teal-800 dark:text-teal-300 flex items-center justify-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{feedback}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Image Preview & Action Modal */}
      {previewModalOpen && previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {lang === 'bn' ? 'উইচ্যাট (WeChat) রিপোর্ট প্রিভিউ' : 'WeChat Statement Preview'}
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-inner bg-slate-50 dark:bg-slate-950 max-h-[50vh] flex items-center justify-center p-2">
              <img
                src={previewImageUrl}
                alt="WeChat Statement Preview"
                className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <div className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'টিপস: "কপি" বাটনে চাপ দিয়ে উইচ্যাটে পেস্ট (Ctrl+V) করুন।'
                  : 'Tip: Click Copy then paste directly (Ctrl+V) in WeChat chat.'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadImage}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                </button>
                <button
                  onClick={handleCopyImage}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ইমেজ কপি করুন' : 'Copy Image'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
