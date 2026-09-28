import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlertTriangle,
  Users,
  FileText,
  DollarSign,
  CheckCircle,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
} from 'lucide-react';
import { StockItem, Staff, AttendanceRecord, Invoice, Language } from '../types';

export interface AppNotification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  tabTarget?: string;
  read?: boolean;
}

interface NotificationCenterProps {
  stock: StockItem[];
  staff: Staff[];
  attendance: AttendanceRecord[];
  invoices: Invoice[];
  lang: Language;
  onNavigateTab: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  stock,
  staff,
  attendance,
  invoices,
  lang,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rsr_dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Dynamically compute real-time business notifications
  const generatedNotifications: AppNotification[] = [];

  // 1. Low stock alerts
  const lowStockItems = stock.filter((s) => s.quantity <= s.minAlertQty);
  if (lowStockItems.length > 0) {
    generatedNotifications.push({
      id: `low-stock-${todayStr}-${lowStockItems.length}`,
      type: 'warning',
      title: lang === 'bn' ? '⚠️ স্বল্প স্টক সতর্কবার্তা' : '⚠️ Low Stock Alert',
      message:
        lang === 'bn'
          ? `${lowStockItems.length}টি মালের স্টক এলার্ট সীমার নিচে রয়েছে (${lowStockItems.map((s) => s.nameBn).slice(0, 2).join(', ')}${lowStockItems.length > 2 ? ' ইত্যাদি' : ''})`
          : `${lowStockItems.length} items are running low on stock.`,
      timestamp: lang === 'bn' ? 'আজ' : 'Today',
      tabTarget: 'stock',
    });
  }

  // 2. Attendance alert for today
  const todayAttendance = attendance.filter((a) => a.date === todayStr);
  const staffWithoutAttendance = staff.filter(
    (stf) => !todayAttendance.some((a) => a.staffId === stf.id)
  );
  if (staff.length > 0 && staffWithoutAttendance.length > 0) {
    generatedNotifications.push({
      id: `att-pending-${todayStr}`,
      type: 'info',
      title: lang === 'bn' ? '👥 আজকের হাজিরা বাকি' : '👥 Attendance Pending',
      message:
        lang === 'bn'
          ? `${staffWithoutAttendance.length} জন কর্মচারীর আজকের হাজিরা এখনো রেকর্ড করা হয়নি`
          : `${staffWithoutAttendance.length} staff members have not had attendance recorded today.`,
      timestamp: lang === 'bn' ? 'আজ' : 'Today',
      tabTarget: 'payroll',
    });
  }

  // 3. Invoices created today
  const todayInvoices = invoices.filter((inv) => inv.date === todayStr);
  if (todayInvoices.length > 0) {
    const totalTodaySales = todayInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    generatedNotifications.push({
      id: `invoices-today-${todayStr}`,
      type: 'success',
      title: lang === 'bn' ? '📄 আজকের চালান ও বিক্রয়' : '📄 Today\'s Invoices',
      message:
        lang === 'bn'
          ? `আজ মোট ${todayInvoices.length}টি চালান কাটা হয়েছে (মোট: ৳${totalTodaySales.toLocaleString()})`
          : `${todayInvoices.length} invoices generated today totaling ৳${totalTodaySales.toLocaleString()}.`,
      timestamp: lang === 'bn' ? 'আজ' : 'Today',
      tabTarget: 'invoices',
    });
  }

  // Filter out dismissed notifications
  const activeNotifications = generatedNotifications.filter(
    (n) => !dismissedIds.includes(n.id)
  );

  const unreadCount = activeNotifications.length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('rsr_dismissed_notifications', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    const allIds = generatedNotifications.map((n) => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(updated);
    localStorage.setItem('rsr_dismissed_notifications', JSON.stringify(updated));
  };

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setDesktopPermission(perm);
      if (perm === 'granted') {
        new Notification(lang === 'bn' ? 'আরএসআর ভাই ভাই এন্টারপ্রাইজ' : 'RSR Vai Vai Enterprise', {
          body: lang === 'bn' ? 'ডেস্কটপ নোটিফিকেশন সফলভাবে চালু হয়েছে!' : 'Desktop notifications enabled!',
          icon: '/logo.svg',
        });
      }
    }
  };

  const sendTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(lang === 'bn' ? 'আরএসআর ভাই ভাই নোটিফিকেশন' : 'RSR Vai Vai Alert', {
        body: lang === 'bn' ? 'সিস্টেম সক্রিয় রয়েছে এবং সকল হিসাব সুরক্ষিত।' : 'System active and accounts secured.',
        icon: '/logo.svg',
      });
    } else {
      handleRequestPermission();
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button with Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-hidden"
        title={lang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notification Center'}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[9px] font-bold items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Flyout Modal / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold tracking-tight">
                {lang === 'bn' ? 'নোটিফিকেশন ও সতর্কবার্তা' : 'Notifications & Alerts'}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {unreadCount} {lang === 'bn' ? 'নতুন' : 'new'}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer"
              >
                {lang === 'bn' ? 'সব মুছে ফেলুন' : 'Clear all'}
              </button>
            )}
          </div>

          {/* Desktop Push Notifications Permission Banner */}
          {'Notification' in window && (
            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {desktopPermission === 'granted'
                  ? (lang === 'bn' ? '🔔 ডেস্কটপ নোটিফিকেশন সক্রিয়' : '🔔 Desktop alerts enabled')
                  : (lang === 'bn' ? '🔕 ডেস্কটপ এলার্ট বন্ধ আছে' : '🔕 Desktop alerts disabled')}
              </span>
              {desktopPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                >
                  {lang === 'bn' ? 'চালু করুন' : 'Enable'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={sendTestNotification}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  {lang === 'bn' ? 'টেস্ট পাঠান' : 'Test'}
                </button>
              )}
            </div>
          )}

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {activeNotifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  {lang === 'bn' ? 'কোনো নতুন সতর্কবার্তা নেই' : 'No new notifications'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'আপনার স্টক এবং হিসাব আপ-টু-ডেট আছে।' : 'Everything is smoothly updated.'}
                </p>
              </div>
            ) : (
              activeNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.tabTarget) {
                      onNavigateTab(n.tabTarget);
                      setIsOpen(false);
                    }
                  }}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-start gap-2.5 relative group"
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      n.type === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : n.type === 'success'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    }`}
                  >
                    {n.type === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : n.type === 'success' ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      {n.message}
                    </p>
                    {n.tabTarget && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pt-0.5">
                        <span>{lang === 'bn' ? 'বিস্তারিত দেখুন' : 'View details'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDismiss(n.id, e)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title={lang === 'bn' ? 'মুছে ফেলুন' : 'Dismiss'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
