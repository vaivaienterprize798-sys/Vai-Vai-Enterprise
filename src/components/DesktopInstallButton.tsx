import React, { useState } from 'react';
import { Download, Monitor, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';

interface DesktopInstallButtonProps {
  lang: Language;
  className?: string;
  variant?: 'nav' | 'banner' | 'card';
}

export const DesktopInstallButton: React.FC<DesktopInstallButtonProps> = ({
  lang,
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled) {
    if (variant === 'banner') return null;
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{lang === 'bn' ? 'ডেস্কটপে ইনস্টলড' : 'Desktop Installed'}</span>
      </div>
    );
  }

  const bnText = 'ডেস্কটপে ইনস্টল করুন';
  const enText = 'Install on Desktop';

  return (
    <>
      {variant === 'nav' && (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-md cursor-pointer ${className}`}
          title={lang === 'bn' ? 'আজীবন ব্যবহারের জন্য অ্যাপটি ডেস্কটপে ইনস্টল করুন' : 'Install desktop application for lifetime offline use'}
        >
          <Monitor className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">{lang === 'bn' ? bnText : enText}</span>
          <span className="sm:hidden">{lang === 'bn' ? 'ইনস্টল' : 'Install'}</span>
        </button>
      )}

      {variant === 'card' && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 dark:from-slate-900 dark:to-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {lang === 'bn' ? 'লাইফটাইম ডেস্কটপ অ্যাপ ইনস্টলেশন' : 'Lifetime Desktop App Installation'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'bn'
                    ? 'কোনো ইন্টারনেট ছাড়া লাইফটাইম ব্যবহারের জন্য পিসিতে ইনস্টল করুন'
                    : 'Run independently on your PC without browser address bar and offline forever'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'bn' ? '১-ক্লিকে ইনস্টল করুন' : '1-Click Install Now'}</span>
          </button>
        </div>
      )}

      {/* Instructional Modal for when browser doesn't prompt automatically or is in iframe */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Monitor className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'ডেস্কটপে ইনস্টল করার নিয়ম' : 'How to Install on Desktop / PC'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200">
                <strong>{lang === 'bn' ? 'লাইফটাইম অফলাইন সুবিধা:' : 'Lifetime Offline Benefit:'}</strong>{' '}
                {lang === 'bn'
                  ? 'একবার ডেস্কটপে ইনস্টল করলে এটি উইন্ডোজের সাধারণ সফটওয়্যারের মতো স্টার্ট মেনু ও ডেস্কটপ আইকন থেকে সরাসরি চালু হবে এবং সম্পূর্ণ অফলাইনে কাজ করবে।'
                  : 'Once installed, it launches directly from Windows Desktop / Start menu as a native app and works offline with zero recurring fees.'}
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {lang === 'bn' ? 'Google Chrome বা Microsoft Edge এ ইনস্টল করুন:' : 'Steps on Chrome or Edge:'}
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>
                    {lang === 'bn'
                      ? 'অ্যাপটি নতুন ট্যাবে বড় করে খুলুন (Open in New Tab).'
                      : 'Open the app in a dedicated browser tab (Open in New Tab).'}
                  </li>
                  <li>
                    {lang === 'bn'
                      ? 'ব্রাউজারের অ্যাড্রেস বারের ডান পাশে থাকা (কম্পিউটার/ডাউনলোড আইকন ⊕) বাটনে ক্লিক করুন।'
                      : 'Look at the right side of the URL address bar for the "Install App" (⊕ or screen) icon.'}
                  </li>
                  <li>
                    {lang === 'bn'
                      ? 'অথবা ব্রাউজারের ৩ ডট মেনু (⋮) > "Install RSR Vai Vai Enterprise" বা "Save and Share > Install page as app" এ ক্লিক করুন।'
                      : 'Or click the 3-dot menu (⋮) > "Install RSR Vai Vai Enterprise" or "Save and Share > Install as app".'}
                  </li>
                  <li>
                    {lang === 'bn'
                      ? '"Install" চাপলেই এটি আপনার পিসির ডেস্কটপে শর্টকাট সহ নিজস্ব উইন্ডোতে চালু হবে!'
                      : 'Click "Install" to create a desktop icon and open in its dedicated standalone window!'}
                  </li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">
                  <strong>iPhone / iPad:</strong> Safari এর <em>Share</em> বাটনে চাপ দিয়ে <em>Add to Home Screen</em> চাপুন।
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowGuideModal(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'নতুন ট্যাবে খুলুন' : 'Open in New Tab'}
              </button>
              <button
                onClick={() => setShowGuideModal(false)}
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
              >
                {lang === 'bn' ? 'বুঝেছি (ঠিক আছে)' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
