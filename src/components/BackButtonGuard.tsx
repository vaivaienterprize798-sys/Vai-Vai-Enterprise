import { useEffect, useRef, useState } from 'react';

interface Props {
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  lang?: string;
}

/**
 * Mobile back-button handling:
 * - Back goes to the previous page (tab) instead of closing the app.
 * - On the first page, back shows a "Stay / Close app" confirmation.
 */
export function BackButtonGuard({ currentTab, setCurrentTab, lang = 'bn' }: Props) {
  const stack = useRef<string[]>([]);
  const fromBack = useRef(false);
  const exiting = useRef(false);
  const [showExit, setShowExit] = useState(false);
  const tabRef = useRef(setCurrentTab);
  tabRef.current = setCurrentTab;

  // Track tab changes as history entries
  useEffect(() => {
    if (!currentTab) return;
    if (fromBack.current) {
      fromBack.current = false;
      return;
    }
    const last = stack.current[stack.current.length - 1];
    if (last !== currentTab) {
      if (stack.current.length > 0) window.history.pushState({ rsrTab: currentTab }, '');
      stack.current.push(currentTab);
    }
  }, [currentTab]);

  useEffect(() => {
    // Guard entry so the first back press is captured
    window.history.pushState({ rsrGuard: true }, '');
    const onPop = () => {
      if (exiting.current) return;
      if (stack.current.length > 1 && tabRef.current) {
        stack.current.pop();
        fromBack.current = true;
        tabRef.current(stack.current[stack.current.length - 1]);
        window.scrollTo({ top: 0 });
        return;
      }
      // At the first page: re-arm guard and ask
      window.history.pushState({ rsrGuard: true }, '');
      setShowExit(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const closeApp = () => {
    exiting.current = true;
    setShowExit(false);
    try { window.close(); } catch { /* ignore */ }
    setTimeout(() => window.history.go(-(window.history.length - 1) || -1), 50);
  };

  if (!showExit) return null;
  const bn = lang === 'bn';

  return (
    <div className="rsr-exit-overlay" onClick={() => setShowExit(false)}>
      <div className="rsr-exit-card" onClick={(e) => e.stopPropagation()}>
        <div className="rsr-exit-icon">⏻</div>
        <h3>{bn ? 'অ্যাপ বন্ধ করবেন?' : 'Close the app?'}</h3>
        <p>{bn ? 'আপনি কি অ্যাপে থাকবেন নাকি অ্যাপটি বন্ধ করবেন?' : 'Do you want to stay in the app or close it?'}</p>
        <div className="rsr-exit-actions">
          <button className="rsr-exit-stay" onClick={() => setShowExit(false)}>
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
