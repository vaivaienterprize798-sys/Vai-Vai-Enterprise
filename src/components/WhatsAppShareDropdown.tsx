import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Users,
  PhoneCall,
  ChevronDown,
  Image as ImageIcon,
  FileText,
  Loader2,
  CheckCircle2,
  Sparkles,
  FileDown,
} from 'lucide-react';
import {
  sendToWhatsApp,
  sharePageAsImage,
  captureElementToBlob,
  exportElementToPdf,
  WHATSAPP_NUMBERS,
} from '../lib/printUtils';
import { Language } from '../types';
import { WhatsAppImageShareModal } from './WhatsAppImageShareModal';

interface WhatsAppShareDropdownProps {
  getText: () => string;
  lang: Language;
  buttonLabel?: string;
  className?: string;
  targetElementId?: string;
  fileName?: string;
  onNotification?: (msg: string) => void;
}

export const WhatsAppShareDropdown: React.FC<WhatsAppShareDropdownProps> = ({
  getText,
  lang,
  buttonLabel,
  className = '',
  targetElementId,
  fileName = 'rsr-invoice.png',
  onNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shareMode, setShareMode] = useState<'image' | 'text'>(targetElementId ? 'image' : 'text');
  const [feedback, setFeedback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // High-def Image Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageBlob, setPreviewImageBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking within dropdown or if the image preview modal is active
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShareText = (target: 'phone1' | 'phone2' | 'group') => {
    const text = getText();
    sendToWhatsApp(text, target);
    setIsOpen(false);
    if (onNotification) {
      onNotification(lang === 'bn' ? 'হোয়াটসঅ্যাপ খোলা হচ্ছে...' : 'Opening WhatsApp...');
    }
  };

  const handleShareImage = async (target: 'phone1' | 'phone2' | 'group') => {
    if (!targetElementId) {
      handleShareText(target);
      return;
    }

    setIsCapturing(true);
    setFeedback(lang === 'bn' ? 'পেইজের ছবি ও PDF তৈরি হচ্ছে...' : 'Generating page image & PDF...');

    try {
      const text = getText();
      const res = await sharePageAsImage(targetElementId, fileName, text, target);
      setFeedback(res.message);
      if (onNotification) {
        onNotification(res.message);
      }

      if (res.blob) {
        const url = URL.createObjectURL(res.blob);
        setPreviewImageUrl(url);
        setPreviewImageBlob(res.blob);
      }

      setTimeout(() => {
        setIsCapturing(false);
        setIsOpen(false);
        setFeedback(null);
      }, 1800);
    } catch (err) {
      console.error('handleShareImage error:', err);
      setIsCapturing(false);
      setFeedback(lang === 'bn' ? 'ব্যর্থ হয়েছে, টেক্সট পাঠানো হচ্ছে' : 'Failed, sending text');
      handleShareText(target);
    }
  };

  const handleOpenImageDialog = async () => {
    if (!targetElementId) {
      console.warn('handleOpenImageDialog: targetElementId is empty');
      return;
    }

    setIsCapturing(true);
    setFeedback(lang === 'bn' ? 'পেইজের ছবি তৈরি হচ্ছে...' : 'Generating page image...');

    try {
      const blob = await captureElementToBlob(targetElementId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewImageUrl(url);
        setPreviewImageBlob(blob);
        setPreviewModalOpen(true);
        setIsOpen(false); // Close dropdown menu now that modal is open
      } else {
        const errMsg = lang === 'bn' ? 'ছবি তৈরি সম্ভব হয়নি, আবার চেষ্টা করুন' : 'Could not generate image';
        setFeedback(errMsg);
        if (onNotification) {
          onNotification(errMsg);
        }
      }
    } catch (e) {
      console.error('Failed to open image dialog:', e);
      setFeedback(lang === 'bn' ? 'ছবি তৈরিতে সমস্যা হয়েছে' : 'Error generating image');
    } finally {
      setIsCapturing(false);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const defaultLabel = lang === 'bn' ? 'হোয়াটসঅ্যাপে পাঠান' : 'Share on WhatsApp';

  return (
    <>
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isCapturing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
          title="WhatsApp Share"
        >
          {isCapturing ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <MessageCircle className="w-4 h-4 fill-emerald-100/20" />
          )}
          <span>{buttonLabel || defaultLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden text-xs animate-in fade-in duration-150">
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <MessageCircle className="w-4 h-4 fill-white/20" />
                <span>{lang === 'bn' ? 'হোয়াটসঅ্যাপে শেয়ার হাব' : 'WhatsApp Share Hub'}</span>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                RSR Enterprise
              </span>
            </div>

            {/* Toggle Mode: Image vs Text (if elementId available) */}
            {targetElementId && (
              <div className="p-2 grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setShareMode('image')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    shareMode === 'image'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'bn' ? 'পেইজ ছবি (Image)' : 'Page Image'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode('text')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    shareMode === 'text'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'টেক্সট সামারি' : 'Text Summary'}</span>
                </button>
              </div>
            )}

            {feedback && (
              <div className="mx-2 my-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Direct Image Preview & Action Modal Trigger */}
            {targetElementId && shareMode === 'image' && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={handleOpenImageDialog}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>
                    {isCapturing
                      ? (lang === 'bn' ? 'ছবি তৈরি হচ্ছে...' : 'Generating Image...')
                      : (lang === 'bn' ? 'ছবি তৈরি ও সহজে সেন্ড উইন্ডো' : 'Generate & Send Image Window')}
                  </span>
                </button>
              </div>
            )}

            {/* Target 1: Mobile 1 */}
            <button
              type="button"
              disabled={isCapturing}
              onClick={() => (shareMode === 'image' && targetElementId ? handleShareImage('phone1') : handleShareText('phone1'))}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'মোবাইল ১' : 'Mobile 1'}: {WHATSAPP_NUMBERS.phone1Display}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {shareMode === 'image' && targetElementId
                    ? (lang === 'bn' ? 'পেইজের ছবি ও PDF পাঠান' : 'Send image & PDF')
                    : (lang === 'bn' ? 'অফিস / শাহিন ভাই' : 'Main Contact')}
                </p>
              </div>
            </button>

            {/* Target 2: Mobile 2 */}
            <button
              type="button"
              disabled={isCapturing}
              onClick={() => (shareMode === 'image' && targetElementId ? handleShareImage('phone2') : handleShareText('phone2'))}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'মোবাইল ২' : 'Mobile 2'}: {WHATSAPP_NUMBERS.phone2Display}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {shareMode === 'image' && targetElementId
                    ? (lang === 'bn' ? 'পেইজের ছবি ও PDF পাঠান' : 'Send image & PDF')
                    : (lang === 'bn' ? 'হিসাব শাখা / মহসিন' : 'Accounts')}
                </p>
              </div>
            </button>

            {/* Target 3: Any Group / Custom Contact */}
            <button
              type="button"
              disabled={isCapturing}
              onClick={() => (shareMode === 'image' && targetElementId ? handleShareImage('group') : handleShareText('group'))}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-800"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'হোয়াটসঅ্যাপ গ্রুপ বা অন্য নম্বর' : 'WhatsApp Group / Other'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'যেকোনো চ্যাট বা গ্রুপে শেয়ার' : 'Share to any WhatsApp chat'}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* High-Resolution WhatsApp Image & PDF Share Modal */}
      {previewModalOpen && previewImageUrl && previewImageBlob && (
        <WhatsAppImageShareModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          lang={lang}
          imageUrl={previewImageUrl}
          imageBlob={previewImageBlob}
          fileName={fileName}
          captionText={getText()}
          targetElementId={targetElementId}
          onNotification={onNotification}
        />
      )}
    </>
  );
};
