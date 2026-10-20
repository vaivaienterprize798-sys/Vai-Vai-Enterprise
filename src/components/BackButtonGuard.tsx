import { useEffect, useRef, useState } from 'react';

interface Props {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  lang?: string;
  enableTabHistory?: boolean;
}

/**
 * Mobile back-button & App exit handling:
 * 1. Back button on the root/dashboard page prompts to exit.
 * 2. If 'বন্ধ করুন' is clicked, attempts native / window close.
 * 3. If the browser blocks window.close() (standard security policy),
 *    shows a clear exit screen instructing user to close tab or press Home,
 *    and resets the exit flag so the app never gets permanently stuck.
 */
export function BackButtonGuard({ currentTab = 'dashboard', setCurrentTab, lang = 'bn', enableTabHistory = true }: Props) {
  const stack = useRef<string[]>(['dashboard']);
  const fromBack = useRef(false);
  const exiting = useRef(false);
  const [showExit, setShowExit] = useState(false);
  const [isAppClosed, setIsAppClosed] = useState(false);
  const tabRef = useRef(setCurrentTab);
  tabRef.current = setCurrentTab;

  // Track tab changes
  useEffect(() => {
    if (!currentTab) return;
    if (fromBack.current) {
      fromBack.current = false;
      return;
    }

    // ড্যাশবোর্ডে এলে স্ট্যাক রিসেট করুন যাতে ব্যাক বাটনে সব সময় এক্সিট পপআপ আসে
    if (currentTab === 'dashboard') {
      stack.current = ['dashboard'];
      return;
    }

    if (!enableTabHistory) return;

    const last = stack.current[stack.current.length - 1];
    if (last !== currentTab) {
      window.history.pushState({ rsrTab: currentTab }, '');
      stack.current.push(currentTab);
    }
  }, [currentTab, enableTabHistory]);

  // Back button listener
  useEffect(() => {
    window.history.pushState({ rsrGuard: true }, '');

    const onPop = () => {
      // যদি ডায়লগ ইতিমধ্যেই ওপেন থাকে
      if (showExit) {
        window.history.pushState({ rsrGuard: true }, '');
        return;
      }

      // ট্যাবের ভেতরে থাকলে আগের ট্যাবে ব্যাক করবে
      if (enableTabHistory && stack.current.length > 1 && tabRef.current) {
        stack.current.pop();
        fromBack.current = true;
        const prevTab = stack.current[stack.current.length - 1] || 'dashboard';
        tabRef.current(prevTab);
        window.scrollTo({ top: 0 });
        return;
      }

      // ড্যাশবোর্ড বা রুট পেজে থাকলে নিশ্চিত করার ডায়লগ দেখাবে
      window.history.pushState({ rsrGuard: true }, '');
      setShowExit(true);
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [showExit, enableTabHistory]);

  const closeApp = () => {
    setShowExit(false);
    exiting.current = true;

    // ১. সাধারণ window.close() চেষ্টা করা
    try {
      window.close();
    } catch {
      /* ignore */
    }

    // ২. অ্যান্ড্রয়েড ওয়েবভিউ বা হাইব্রিড অ্যাপ হুক থাকলে
    try {
      const win = window as any;
      const nav = navigator as any;
      if (win.Android?.closeApp) win.Android.closeApp();
      else if (nav.app?.exitApp) nav.app.exitApp();
      else if (nav.device?.exitApp) nav.device.exitApp();
    } catch {
      /* ignore */
    }

    // ৩. সেলফ উইন্ডো ক্লোজ ট্রিক
    try {
      window.open('', '_self', '');
      window.close();
    } catch {
      /* ignore */
    }

    // ৪. ব্রাউজার ব্যাক
    try {
      window.history.back();
    } catch {
      /* ignore */
    }

    // ৫. ব্রাউজার যদি ট্যাব বন্ধ করতে বাধা দেয়, তবে ক্লোজ স্ক্রিন দেখানো এবং ফ্ল্যাগ রিসেট করা
    setTimeout(() => {
      exiting.current = false;
      setIsAppClosed(true);
    }, 200);
  };

  const cancelExit = () => {
    setShowExit(false);
    exiting.current = false;
  };

  const reEnterApp = () => {
    setIsAppClosed(false);
    exiting.current = false;
    window.history.pushState({ rsrGuard: true }, '');
  };

  const bn = lang === 'bn';

  // ব্রাউজার ট্যাব বন্ধ না হলে সুন্দর এক্সিট কনফার্মেশন স্ক্রিন
  if (isAppClosed) {
    return (
      <div className="rsr-exit-overlay" style={{ background: '#0f172a', zIndex: 999999 }}>
        <div className="rsr-exit-card" style={{ maxWidth: '440px', padding: '32px 24px' }}>
          <div className="rsr-exit-icon" style={{ background: '#dcfce7', color: '#16a34a', fontSize: '28px' }}>
            ✓
          </div>
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>
            {bn ? 'অ্যাপটি সফলভাবে বন্ধ হয়েছে' : 'App Closed Successfully'}
          </h3>
          <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.85, marginBottom: '24px' }}>
            {bn
              ? 'ব্রাউজার বা ফোনের নিরাপত্তার কারণে সরাসরি ট্যাব বন্ধ করা যায় না। অনুগ্রহ করে এই ব্রাউজার ট্যাবটি কেটে দিন অথবা ফোনের হোম বাটনে চাপুন।'
              : 'Browser security prevents closing tabs automatically. Please close this browser tab or press your Home button.'}
          </p>
          <div className="rsr-exit-actions">
            <button className="rsr-exit-stay" onClick={reEnterApp} style={{ padding: '12px 20px' }}>
              {bn ? 'অ্যাপে পুনরায় প্রবেশ করুন' : 'Re-open App'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showExit) return null;

  return (
    <div className="rsr-exit-overlay" onClick={cancelExit}>
      <div className="rsr-exit-card" onClick={(e) => e.stopPropagation()}>
        <div className="rsr-exit-icon">⏻</div>
        <h3>{bn ? 'অ্যাপ বন্ধ করবেন?' : 'Close the app?'}</h3>
        <p>{bn ? 'আপনি কি অ্যাপে থাকবেন নাকি অ্যাপটি বন্ধ করবেন?' : 'Do you want to stay in the app or close it?'}</p>
        <div className="rsr-exit-actions">
          <button className="rsr-exit-stay" onClick={cancelExit}>
            {bn ? 'অ্যাপে থাকুন' : 'Stay'}
          </button>
          <button className="rsr-exit-close" onClick={closeApp}>
            {bn ? 'বন্ধ করুন' : 'Close app'}
          </button>
        </div>
      </div>
    </div>
  );
}
