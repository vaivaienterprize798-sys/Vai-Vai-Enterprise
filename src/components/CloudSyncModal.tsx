import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Laptop,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  X,
  LogIn,
  LogOut,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { auth, cloudDbService, isFirebaseConfigured, saveConfigOverride, clearConfigOverride, getConfigOverride } from '../lib/firebase';
import { storageService } from '../lib/storage';
import { isMainDevice } from '../lib/deviceRole';
import { Language } from '../types';
import { User } from 'firebase/auth';

declare const __SHARED_APP_URL__: string;

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onDataRefreshed: () => void;
  isOnline: boolean;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  lang,
  onDataRefreshed,
  isOnline,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [configText, setConfigText] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const [hasOverride, setHasOverride] = useState(!!getConfigOverride());
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Parse the config snippet copied from the Firebase console
  // (accepts either the full `const firebaseConfig = {...};` snippet or plain JSON)
  const handleSaveConfig = () => {
    setConfigError(null);
    try {
      let text = configText.trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no-object');
      const normalized = match[0]
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,\s*}/g, '}');
      const parsed = JSON.parse(normalized);
      if (!parsed.apiKey || !parsed.apiKey.startsWith('AIza')) {
        throw new Error('bad-key');
      }
      saveConfigOverride({
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain || '',
        projectId: parsed.projectId || '',
        storageBucket: parsed.storageBucket || '',
        messagingSenderId: String(parsed.messagingSenderId || ''),
        appId: parsed.appId || '',
        firestoreDatabaseId: parsed.firestoreDatabaseId || '(default)',
      });
      window.location.reload();
    } catch (e: any) {
      setConfigError(
        e?.message === 'bad-key'
          ? (lang === 'bn'
              ? 'API Key ঠিক নেই। Firebase কনসোল থেকে পুরো কনফিগ কপি করে আবার পেস্ট করুন।'
              : 'Invalid API key. Copy the full config from the Firebase console and paste again.')
          : (lang === 'bn'
              ? 'কনফিগ পড়া যায়নি। Firebase কনসোল থেকে পুরো কোডটা কপি করে পেস্ট করুন।'
              : 'Could not read the config. Paste the full snippet from the Firebase console.')
      );
    }
  };

  const handleResetConfig = () => {
    clearConfigOverride();
    setHasOverride(false);
    window.location.reload();
  };

  useEffect(() => {
    const unsub = cloudDbService.onAuthChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnauthorizedDomain(null);
    try {
      const user = await cloudDbService.signInWithGoogle();
      setCurrentUser(user);
      setSuccessMessage(
        lang === 'bn'
          ? `সফলভাবে সাইন-ইন হয়েছে: ${user.email}। রিয়েলটাইম ক্লাউড সিঙ্ক চালু!`
          : `Signed in as ${user.email}. Real-time cloud sync active!`
      );
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || String(err?.message).includes('unauthorized-domain')) {
        const domain = err?.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
        setUnauthorizedDomain(domain);
      } else {
        setErrorMessage(
          err?.message || (lang === 'bn' ? 'গুগল সাইন-ইন ব্যর্থ হয়েছে' : 'Google sign-in failed')
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await cloudDbService.signOutUser();
      setCurrentUser(null);
      setSuccessMessage(
        lang === 'bn' ? 'লগ-আউট সম্পন্ন হয়েছে।' : 'Signed out successfully.'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sign out failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadAll = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage(lang === 'bn' ? 'ডাটা আপলোড শুরু হচ্ছে...' : 'Starting upload...');

    try {
      const res = await storageService.uploadAllToCloud((msg) => {
        setStatusMessage(msg);
      });
      if (res.success) {
        setSuccessMessage(
          lang === 'bn'
            ? `সব তথ্য ক্লাউড ফায়ারস্টোরে সিঙ্ক হয়েছে (মোট ${res.count} টি রেকর্ড)!`
            : `All records synced to Cloud Firestore (${res.count} total items)!`
        );
        onDataRefreshed();
      } else {
        setErrorMessage(res.error || 'Upload failed');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sync failed');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleDownloadAll = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage(lang === 'bn' ? 'ক্লাউড থেকে তথ্য নামানো হচ্ছে...' : 'Fetching from cloud...');

    try {
      const res = await storageService.downloadAllFromCloud((msg) => {
        setStatusMessage(msg);
      });
      if (res.success) {
        setSuccessMessage(
          lang === 'bn'
            ? 'ক্লাউড থেকে সফলভাবে সমস্ত চালান, স্টক ও লেজার রিস্টোর হয়েছে!'
            : 'All invoices, stock and ledger successfully restored from cloud!'
        );
        onDataRefreshed();
      } else {
        setErrorMessage(res.error || 'Download failed');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Download failed');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };


  const getPublicShareUrl = (): string => {
    try {
      if (typeof __SHARED_APP_URL__ !== 'undefined' && __SHARED_APP_URL__) {
        return __SHARED_APP_URL__;
      }
    } catch {}
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  const publicShareUrl = getPublicShareUrl();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text =
      lang === 'bn'
        ? `*RSR Vai Vai Enterprise Management Software*\nদোকানের যেকোনো কম্পিউটার বা মোবাইল থেকে ওপেন করুন:\n${publicShareUrl}`
        : `*RSR Vai Vai Enterprise Management Software*\nAccess from any laptop or mobile:\n${publicShareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                {lang === 'bn' ? 'ক্লাউড ডাটাবেজ ও মাল্টি-ডিভাইস সিঙ্ক' : 'Cloud Database & Multi-Device Sync'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                  Firestore Live
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700">
                  {isMainDevice()
                    ? (lang === 'bn' ? 'মূল ডিভাইস' : 'Main device')
                    : (lang === 'bn' ? 'অতিরিক্ত ডিভাইস — শুধু নতুন আপডেট' : 'Secondary — new updates only')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'একাধিক ল্যাপটপ ও ফোনে স্বয়ংক্রিয় রিয়েলটাইম সিঙ্ক'
                  : 'Automatic real-time sync across multiple laptops & phones'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Real-time Status Card */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isFirebaseConfigured
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="shrink-0 mt-0.5">
              {isFirebaseConfigured ? (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">
                  <CloudOff className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isFirebaseConfigured
                    ? lang === 'bn' ? 'রিয়েলটাইম ক্লাউড সিঙ্ক সক্রিয়' : 'Real-time Cloud Sync Active'
                    : lang === 'bn' ? 'ক্লাউড সিঙ্ক সংযোগ প্রয়োজন' : 'Cloud Sync Sign-in Needed'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isFirebaseConfigured ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300' : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300'
                }`}>
                  {isFirebaseConfigured ? 'LIVE SYNC' : 'OFFLINE LOCAL'}
                </span>
              </div>

              {isFirebaseConfigured ? (
                <div className="mt-1">
                  <p className="text-xs font-medium truncate">
                    {lang === 'bn' ? 'সংযুক্ত অবস্থা:' : 'Connection status:'}{' '}
                    <span className="font-bold underline">
                      {currentUser?.email || (lang === 'bn' ? 'স্বয়ংক্রিয় ক্লাউড ডিভাইস সেশন' : 'Auto-connected device session')}
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {lang === 'bn'
                      ? 'চালান তৈরি, স্টক পরিবর্তন বা হাজিরা রেকর্ড করলে অন্যান্য সকল ডিভাইস স্বয়ংক্রিয়ভাবে আপডেট হবে।'
                      : 'Any new invoice, stock change, or attendance is instantly reflected on all devices.'}
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-xs">
                    {lang === 'bn'
                      ? 'একাধিক ল্যাপটপ বা মোবাইলে একই ডাটা লাইভ সিঙ্ক করতে নিচে Firebase কনফিগ নিশ্চিত করুন।'
                      : 'To synchronize live data across multiple laptops or mobile devices, configure Firebase below.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Unauthorized Domain Guidance Card */}
          {unauthorizedDomain && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-3">
              <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">
                    {lang === 'bn' ? 'Firebase-এ এই ডোমেইনটি অনুমোদিত করা নেই' : 'Domain Not Authorized in Firebase'}
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                    {lang === 'bn'
                      ? 'গুগল OAuth দিয়ে সাইন-ইন করতে Firebase Console-এ নিচের ডোমেইনটি Authorized Domains তালিকায় যোগ করুন:'
                      : 'To sign in with Google OAuth, add this domain to the Authorized Domains list in the Firebase Console:'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800">
                <code className="text-[11px] font-mono text-slate-800 dark:text-slate-200 flex-1 truncate select-all">
                  {unauthorizedDomain}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 text-white rounded-md hover:bg-amber-500 cursor-pointer shrink-0"
                >
                  {copiedDomain ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'কপি ডোমেইন' : 'Copy Domain')}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                <a
                  href="https://console.firebase.google.com/project/hazel-gateway-w1ttq/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'Firebase Console-এ Settings খুলুন' : 'Open Firebase Console Settings'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setUnauthorizedDomain(null)}
                  className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                >
                  {lang === 'bn' ? 'বার্তাটি বন্ধ করুন' : 'Dismiss'}
                </button>
              </div>

              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                {lang === 'bn'
                  ? '✓ গুগল লগইন ছাড়াও অ্যাপের সমস্ত ডাটা, চালান ও স্টক রিয়েলটাইমে স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক হচ্ছে।'
                  : '✓ Real-time sync for all stock, invoices and data is already active even without Google sign-in.'}
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {statusMessage && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Firebase Setup Card — shown when no real config is available */}
          {!isFirebaseConfigured && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-300 dark:border-rose-800 space-y-3">
              <h3 className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                {lang === 'bn' ? 'একবারের Firebase সেটআপ (আসল Key বসান)' : 'One-time Firebase Setup (paste real config)'}
              </h3>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                {lang === 'bn'
                  ? 'Firebase Console → Project Settings → Your apps → Web app-এ গিয়ে "firebaseConfig" কোডটা কপি করে নিচে পেস্ট করুন। একবার সেভ করলেই এই ডিভাইসে চিরকালের জন্য ঠিক হয়ে যাবে।'
                  : 'Go to Firebase Console → Project Settings → Your apps → Web app, copy the "firebaseConfig" code and paste it below. Save once and this device is fixed forever.'}
              </p>
              <textarea
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                rows={5}
                placeholder={'const firebaseConfig = {\n  apiKey: "AIza...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n};'}
                className="w-full bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-800 text-slate-800 dark:text-slate-200 text-[11px] px-3 py-2 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-400"
              />
              {configError && (
                <p className="text-[11px] text-rose-700 dark:text-rose-300 font-bold">{configError}</p>
              )}
              <button
                onClick={handleSaveConfig}
                disabled={!configText.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'bn' ? 'সেভ করে সংযোগ ঠিক করুন' : 'Save & Fix Connection'}</span>
              </button>
            </div>
          )}

          {/* Reset saved config (only when an in-app override exists) */}
          {hasOverride && isFirebaseConfigured && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-slate-500">
                {lang === 'bn' ? 'এই ডিভাইসে সেভ করা Firebase কনফিগ ব্যবহার হচ্ছে' : 'Using Firebase config saved on this device'}
              </span>
              <button
                onClick={handleResetConfig}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                {lang === 'bn' ? 'রিসেট করুন' : 'Reset'}
              </button>
            </div>
          )}

          {/* Auth Action Buttons */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {lang === 'bn' ? 'ক্লাউড নিরাপত্তা ও গুগল অথেন্টিকেশন' : 'Cloud Security & Google Authentication'}
            </h3>

            {currentUser && !currentUser.isAnonymous && currentUser.email ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'লগ-আউট' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleSignIn}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {currentUser?.isAnonymous
                      ? (lang === 'bn' ? 'ঐচ্ছিক: গুগল একাউন্ট লিঙ্ক করুন' : 'Optional: Link Google Account')
                      : (lang === 'bn' ? 'গুগল দিয়ে ক্লাউড কানেক্ট করুন' : 'Sign in with Google')}
                  </span>
                </button>
                {currentUser?.isAnonymous && (
                  <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                    {lang === 'bn'
                      ? '✓ গুগল লগইন ছাড়াও আপনার সমস্ত ডাটা ক্লাউডে সুরক্ষিত ও স্বয়ংক্রিয়ভাবে সিঙ্ক হচ্ছে।'
                      : '✓ Real-time cloud sync is already active without requiring Google login.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cloud Action Hub */}
          {isFirebaseConfigured && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleUploadAll}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <div>{lang === 'bn' ? 'সকল ডাটা ক্লাউডে আপলোড করুন' : 'Upload Local Data to Cloud'}</div>
                  <div className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                    {lang === 'bn' ? 'বর্তমান চালান ও স্টক পাঠান' : 'Push existing records'}
                  </div>
                </div>
              </button>

              <button
                onClick={handleDownloadAll}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 p-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4 text-blue-600" />
                <div className="text-left">
                  <div>{lang === 'bn' ? 'ক্লাউড থেকে ডাটা নামান' : 'Pull / Restore from Cloud'}</div>
                  <div className="text-[10px] font-normal text-blue-600 dark:text-blue-400">
                    {lang === 'bn' ? 'অন্য ডিভাইসের ডাটা লোড' : 'Fetch latest remote updates'}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Public Link Card for Multi-Device Access */}
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-emerald-400" />
                {lang === 'bn' ? 'পাবলিক শেয়ার ও প্রোডাকশন লিংক (Public App Link)' : 'Public Production / Multi-Device URL'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                {lang === 'bn' ? 'সকল ডিভাইসে সচল' : 'Accessible Everywhere'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg font-mono selection:bg-emerald-600 truncate focus:outline-hidden"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? (lang === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (lang === 'bn' ? 'কপি করুন' : 'Copy')}</span>
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Share via WhatsApp"
              >
                <span>WhatsApp</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'bn'
                ? 'দোকানের অন্য কোনো ল্যাপটপ বা মোবাইলের ব্রাউজারে এই লিংকটি পেস্ট করে এন্টার দিন। কোনো লগইন এরর ছাড়াই সরাসরি সম্পূর্ণ অ্যাপ ওপেন হবে এবং একই ডাটা দেখতে পারবেন।'
                : 'Open this link on any other computer or mobile browser. It opens directly with no error and syncs with the same cloud database.'}
            </p>
          </div>

          {/* Multi-Device Instructions Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-500" />
                <Smartphone className="w-4 h-4 text-sky-500" />
                {lang === 'bn' ? 'অন্যান্য ল্যাপটপ ও ফোনে কীভাবে চালাবেন?' : 'How to use on other laptops & phones?'}
              </span>
            </div>

            <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal pl-4">
              <li>
                {lang === 'bn'
                  ? 'উপরের "পাবলিক লিংক" টি কপি করে অন্য ল্যাপটপ বা মোবাইলের ব্রাউজারে পেস্ট করুন।'
                  : 'Copy the Public Link above and paste it into any other browser or mobile phone.'}
              </li>
              <li>
                {lang === 'bn'
                  ? 'অন্য ডিভাইসে অ্যাপটি ওপেন করার পর "ক্লাউড সিঙ্ক" অপশনে গিয়ে একই গুগল একাউন্টে সাইন-ইন করুন।'
                  : 'After opening the app, go to "Cloud Sync" and sign in with the same Google account.'}
              </li>
              <li>
                {lang === 'bn'
                  ? 'ব্যস! যেকোনো ডিভাইসে চালান তৈরি বা স্টক আপডেট করলে সকল ডিভাইসে লাইভ রিয়েল-টাইম সিঙ্ক হয়ে যাবে।'
                  : 'Done! Any invoice or inventory update on one device will instantly sync across all devices in real time.'}
              </li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {isOnline ? 'Network Connected' : 'Offline Mode'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
