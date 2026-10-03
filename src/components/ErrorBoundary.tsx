import React, { Component, ErrorInfo, ReactNode } from 'react';
import { storageService } from '../lib/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRepairAndReset = async () => {
    try {
      // 1. Unregister all service workers that may be serving stale dev chunks
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }

      // 3. Reset storage safely
      await storageService.resetToFactorySeed();

      // 4. Reload page
      window.location.href = '/';
    } catch (e) {
      console.error('Error during repair reset:', e);
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 md:p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-2 font-sans">
              অ্যাপ পুনরুদ্ধার সিস্টেম (App Recovery)
            </h2>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              ডেস্কটপ বা ব্রাউজারে ক্যাশ বা পুরনো ডাটা অসংগতির কারণে স্ক্রিন আটকে গিয়েছিল। 
              সিস্টেম সচল রাখতে নিচের বাটনে চাপ দিন:
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                অ্যাপ রিলোড করুন (Reload)
              </button>

              <button
                type="button"
                onClick={this.handleRepairAndReset}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-300 font-semibold text-sm border border-amber-500/40 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                ক্যাশ মেরামত ও রিস্টোর
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono overflow-auto max-h-36">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-300 font-sans font-medium mb-1">
                  কারিগরি ত্রুটি দেখুন (Technical details)
                </summary>
                <p className="text-rose-400 mt-2 font-mono text-[11px]">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-1 text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
