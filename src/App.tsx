import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoicePrintView } from './components/InvoicePrintView';
import { StockPanel } from './components/StockPanel';
import { PartyPanel } from './components/PartyPanel';
import { PayrollPanel } from './components/PayrollPanel';
import { PettyCashPanel } from './components/PettyCashPanel';
import { CarExpensePanel } from './components/CarExpensePanel';
import { FinancialAnalyticsPanel } from './components/FinancialAnalyticsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { DokanHishabPanel } from './components/DokanHishabPanel';
import { WorkerTrackingPanel } from './components/WorkerTrackingPanel';
import { BranchOfficePanel } from './components/BranchOfficePanel';
import { PriceListPanel } from './components/PriceListPanel';
import { PrintStatements } from './components/PrintStatements';
import { AllSheetsPanel } from './components/AllSheetsPanel';
import { StatementSelectorModal } from './components/StatementSelectorModal';
import { SecurityComplianceModal } from './components/SecurityComplianceModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { AuthScreen } from './components/AuthScreen';
import { auth, cloudDbService } from './lib/firebase';
import { User } from 'firebase/auth';
import { RefreshCw, X as CloseIcon } from 'lucide-react';
import { CURRENT_APP_VERSION, forceUpdateAndReloadApp } from './lib/appUpdate';

import {
  Language,
  ThemeMode,
  StatementType,
  Invoice,
  StockItem,
  Party,
  Staff,
  AttendanceRecord,
  PettyCashExpense,
  CarExpense,
  CompanyInfo,
  OfficeExpense,
  DokanPayment,
  WorkerTaskRecord,
  PunchLeaveRequest,
  UserSession,
  BranchConsignment,
  BranchRmbRemittance,
  ThirdPartyRmbConversion,
  PriceList,
  WorkerProductConversion,
  ThirdParty,
  ChinaDirectPayment,
} from './types';
import { storageService } from './lib/storage';
import { translations } from './lib/translations';
import { PeriodFilterMode } from './components/PettyCashPanel';

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];
  // Instant hydration and Splash removal
  useLayoutEffect(() => {
    // Hide initial splash screen smoothly as soon as React component layout is ready
    const splash = document.getElementById('__rsr_splash__');
    if (splash) {
      splash.style.transition = 'opacity 0.2s ease-out';
      splash.style.opacity = '0';
      const timer = setTimeout(() => {
        splash.remove();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Localization & Theme
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('rsr_lang_pref') as Language) || 'bn';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('rsr_theme_pref') as ThemeMode) || 'light';
  });

  // Offline status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync theme with html document element
  useEffect(() => {
    localStorage.setItem('rsr_theme_pref', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync language pref
  useEffect(() => {
    localStorage.setItem('rsr_lang_pref', lang);
  }, [lang]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // State Entities loaded from Storage
  const [invoices, setInvoices] = useState<Invoice[]>(() => storageService.getInvoices());
  const [stock, setStock] = useState<StockItem[]>(() => storageService.getStock());
  const [parties, setParties] = useState<Party[]>(() => storageService.getParties());
  const [staff, setStaff] = useState<Staff[]>(() => storageService.getStaff());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => storageService.getAttendance());
  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>(() => storageService.getPettyCashExpenses());
  const [carExpenses, setCarExpenses] = useState<CarExpense[]>(() => storageService.getCarExpenses());
  const [dokanPayments, setDokanPayments] = useState<DokanPayment[]>(() => storageService.getDokanPayments());
  const [workerTasks, setWorkerTasks] = useState<WorkerTaskRecord[]>(() => storageService.getWorkerTasks());
  const [punchRequests, setPunchRequests] = useState<PunchLeaveRequest[]>(() => storageService.getPunchRequests());
  const [branchConsignments, setBranchConsignments] = useState<BranchConsignment[]>(() => storageService.getBranchConsignments());
  const [branchRemittances, setBranchRemittances] = useState<BranchRmbRemittance[]>(() => storageService.getBranchRemittances());
  const [rmbConversions, setRmbConversions] = useState<ThirdPartyRmbConversion[]>(() => storageService.getRmbConversions());
  const [priceLists, setPriceLists] = useState<PriceList[]>(() => storageService.getPriceLists());
  const [workerConversions, setWorkerConversions] = useState<WorkerProductConversion[]>(() => storageService.getWorkerConversions());
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>(() => storageService.getThirdParties());
  const [chinaDirectPayments, setChinaDirectPayments] = useState<ChinaDirectPayment[]>(() => storageService.getChinaDirectPayments());
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => storageService.getCompanyInfo());

  const refreshAllData = () => {
    setInvoices(storageService.getInvoices());
    setStock(storageService.getStock());
    setParties(storageService.getParties());
    setStaff(storageService.getStaff());
    setAttendance(storageService.getAttendance());
    setPettyCashExpenses(storageService.getPettyCashExpenses());
    setCarExpenses(storageService.getCarExpenses());
    setDokanPayments(storageService.getDokanPayments());
    setWorkerTasks(storageService.getWorkerTasks());
    setPunchRequests(storageService.getPunchRequests());
    setBranchConsignments(storageService.getBranchConsignments());
    setBranchRemittances(storageService.getBranchRemittances());
    setRmbConversions(storageService.getRmbConversions());
    setPriceLists(storageService.getPriceLists());
    setWorkerConversions(storageService.getWorkerConversions());
    setThirdParties(storageService.getThirdParties());
    setChinaDirectPayments(storageService.getChinaDirectPayments());
    setCompanyInfo(storageService.getCompanyInfo());
  };

  // Active Navigation Tab
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printedInvoice, setPrintedInvoice] = useState<Invoice | null>(null);

  // Statement Print View
  const [isStatementSelectorOpen, setIsStatementSelectorOpen] = useState(false);
  const [activeStatementType, setActiveStatementType] = useState<StatementType | null>(null);
  const [activeStatementStaffId, setActiveStatementStaffId] = useState<string | null>(null);
  const [activeStatementPartyId, setActiveStatementPartyId] = useState<string | null>(null);
  const [activeStatementMonth, setActiveStatementMonth] = useState<string | null>(null);
  const [activeStatementFilterMode, setActiveStatementFilterMode] = useState<PeriodFilterMode>('month');
  const [activeStatementSelectedDate, setActiveStatementSelectedDate] = useState<string>(todayStr);
  const [activeStatementStartDate, setActiveStatementStartDate] = useState<string>(todayStr);
  const [activeStatementEndDate, setActiveStatementEndDate] = useState<string>(todayStr);

  // User Session & Role-Based Auth State
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('rsr_user_session_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.warn('Invalid user session:', err);
      }
    }
    return null;
  });

  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    localStorage.setItem('rsr_user_session_v1', JSON.stringify(session));
  };

  const handleLogout = () => {
    localStorage.removeItem('rsr_user_session_v1');
    setUserSession(null);
  };

  const isSuperAdmin = userSession?.role === 'admin';
  const currentStaffMember = staff.find(
    (s) => s.id === userSession?.staffId || s.loginCode?.toLowerCase() === userSession?.loginId?.toLowerCase()
  );
  const isHeadSupervisor =
    isSuperAdmin ||
    Boolean(
      currentStaffMember?.isSupervisor ||
        userSession?.designation?.toLowerCase().includes('supervisor') ||
        userSession?.designation?.toLowerCase().includes('lead')
    );
  const isGeneralStaff = !isSuperAdmin && !isHeadSupervisor;

  // Security & Backup Modal
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  // Cloud Sync Modal
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [showUpdateBanner, setShowUpdateBanner] = useState(() => {
    // Show update notification if new version or user hasn't seen it yet
    const seen = localStorage.getItem('rsr_seen_update_banner');
    return seen !== CURRENT_APP_VERSION;
  });

  // Real-time Firestore synchronization across all devices & laptops
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const setupListeners = () => {
      // Clear existing listeners if any
      unsubs.forEach(unsub => unsub());
      unsubs.length = 0;

      // Invoices live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<Invoice>('invoices', (cloudInvoices) => {
          if (Array.isArray(cloudInvoices)) {
            setInvoices(cloudInvoices);
            localStorage.setItem('rsr_invoices_v1', JSON.stringify(cloudInvoices));
          }
        })
      );

      // Stock live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<StockItem>('stock', (cloudStock) => {
          if (Array.isArray(cloudStock)) {
            setStock(cloudStock);
            localStorage.setItem('rsr_stock_v1', JSON.stringify(cloudStock));
          }
        })
      );

      // Parties live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<Party>('parties', (cloudParties) => {
          if (Array.isArray(cloudParties)) {
            setParties(cloudParties);
            localStorage.setItem('rsr_parties_v1', JSON.stringify(cloudParties));
          }
        })
      );

      // Staff live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<Staff>('staff', (cloudStaff) => {
          if (Array.isArray(cloudStaff)) {
            setStaff(cloudStaff);
            localStorage.setItem('rsr_staff_v1', JSON.stringify(cloudStaff));
          }
        })
      );

      // Attendance live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<AttendanceRecord>('attendance', (cloudAttendance) => {
          if (Array.isArray(cloudAttendance)) {
            setAttendance(cloudAttendance);
            localStorage.setItem('rsr_attendance_v1', JSON.stringify(cloudAttendance));
          }
        })
      );

      // Petty Cash live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<PettyCashExpense>('pettyCash', (cloudPetty) => {
          if (Array.isArray(cloudPetty)) {
            setPettyCashExpenses(cloudPetty);
            localStorage.setItem('rsr_petty_cash_v1', JSON.stringify(cloudPetty));
            localStorage.setItem('rsr_expenses_v1', JSON.stringify(cloudPetty));
          }
        })
      );

      // Car Expenses live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<CarExpense>('carExpenses', (cloudCar) => {
          if (Array.isArray(cloudCar)) {
            setCarExpenses(cloudCar);
            localStorage.setItem('rsr_car_expenses_v1', JSON.stringify(cloudCar));
          }
        })
      );

      // Dokan Payments live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<DokanPayment>('dokanPayments', (cloudDP) => {
          if (Array.isArray(cloudDP)) {
            setDokanPayments(cloudDP);
            localStorage.setItem('rsr_dokan_payments_v1', JSON.stringify(cloudDP));
          }
        })
      );

      // Worker Tasks live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<WorkerTaskRecord>('workerTasks', (cloudTasks) => {
          if (Array.isArray(cloudTasks)) {
            setWorkerTasks(cloudTasks);
            localStorage.setItem('rsr_worker_tasks_v1', JSON.stringify(cloudTasks));
          }
        })
      );

      // Punch & Leave Requests live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<PunchLeaveRequest>('punchRequests', (cloudRequests) => {
          if (Array.isArray(cloudRequests)) {
            setPunchRequests(cloudRequests);
            localStorage.setItem('rsr_punch_requests_v1', JSON.stringify(cloudRequests));
          }
        })
      );

      // Branch Consignments live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<BranchConsignment>('branchConsignments', (cloudBC) => {
          if (Array.isArray(cloudBC)) {
            setBranchConsignments(cloudBC);
            localStorage.setItem('rsr_branch_consignments_v1', JSON.stringify(cloudBC));
          }
        })
      );

      // Branch Remittances live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<BranchRmbRemittance>('branchRemittances', (cloudBR) => {
          if (Array.isArray(cloudBR)) {
            setBranchRemittances(cloudBR);
            localStorage.setItem('rsr_branch_remittances_v1', JSON.stringify(cloudBR));
          }
        })
      );

      // 3rd Party RMB Conversions live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<ThirdPartyRmbConversion>('rmbConversions', (cloudRC) => {
          if (Array.isArray(cloudRC)) {
            setRmbConversions(cloudRC);
            localStorage.setItem('rsr_rmb_conversions_v1', JSON.stringify(cloudRC));
          }
        })
      );

      // Price Lists live sync (দর তালিকা তৈরি - 3 pricing columns)
      unsubs.push(
        cloudDbService.subscribeToCollection<PriceList>('priceLists', (cloudPL) => {
          if (Array.isArray(cloudPL)) {
            setPriceLists(cloudPL);
            localStorage.setItem('rsr_price_lists_v1', JSON.stringify(cloudPL));
          }
        })
      );

      // Worker Product Conversions live sync (পণ্য রূপান্তর ও আউটপুট ট্র্যাকিং)
      unsubs.push(
        cloudDbService.subscribeToCollection<WorkerProductConversion>('workerConversions', (cloudWC) => {
          if (Array.isArray(cloudWC)) {
            setWorkerConversions(cloudWC);
            localStorage.setItem('rsr_worker_conversions_v1', JSON.stringify(cloudWC));
          }
        })
      );

      // 3rd Parties live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<ThirdParty>('thirdParties', (cloudTP) => {
          if (Array.isArray(cloudTP)) {
            setThirdParties(cloudTP);
            localStorage.setItem('rsr_third_parties_v1', JSON.stringify(cloudTP));
          }
        })
      );

      // China Direct Payments live sync
      unsubs.push(
        cloudDbService.subscribeToCollection<ChinaDirectPayment>('chinaDirectPayments', (cloudCDP) => {
          if (Array.isArray(cloudCDP)) {
            setChinaDirectPayments(cloudCDP);
            localStorage.setItem('rsr_china_direct_payments_v1', JSON.stringify(cloudCDP));
          }
        })
      );

      // Company profile live sync
      unsubs.push(
        cloudDbService.subscribeToCompany((cloudComp) => {
          if (cloudComp && cloudComp.name) {
            setCompanyInfo(cloudComp);
            localStorage.setItem('rsr_company_v2', JSON.stringify(cloudComp));
          }
        })
      );
    };

    // Immediately trigger listeners so all devices stay updated in real-time
    setupListeners();

    const unsubAuth = cloudDbService.onAuthChanged((user) => {
      setCurrentUser(user);
      if (user) {
        setupListeners();
      }
    });

    return () => {
      unsubAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  // Universal Table & Form UX Improvements: Zero-Clear & Enter Auto-Advance
  useEffect(() => {
    // 1. Zero-Clear on Focus and Click
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const val = target.value?.trim();
        if (val === '0' || val === '0.00' || val === '0.0' || val === '০') {
          // Select entire text so any typed key instantly overwrites '0' without needing backspace
          setTimeout(() => {
            try {
              target.select();
            } catch (err) {
              // ignore
            }
          }, 10);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && (target.type === 'number' || target.type === 'text')) {
        const val = target.value?.trim();
        if (val === '0' || val === '0.00' || val === '0.0' || val === '০') {
          try {
            target.select();
          } catch (err) {
            // ignore
          }
        }
      }
    };

    // 2. Enter Key Auto-Advance to Next Sequential Input / Cell
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target && target.tagName === 'INPUT') {
          const input = target as HTMLInputElement;
          // Ignore submit buttons, checkboxes, radio, file
          if (['submit', 'button', 'checkbox', 'radio', 'file'].includes(input.type)) return;

          // Find container (table row, table, form, modal body, or active panel)
          const container =
            input.closest('tr') ||
            input.closest('table') ||
            input.closest('form') ||
            input.closest('[role="dialog"]') ||
            input.closest('.modal-content') ||
            document.querySelector('main') ||
            document.body;

          const focusableElements = Array.from(
            container.querySelectorAll<HTMLElement>(
              'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), select:not([disabled]), textarea:not([disabled])'
            )
          ).filter((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
          });

          const currentIndex = focusableElements.indexOf(input);
          if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
            e.preventDefault();
            const nextEl = focusableElements[currentIndex + 1];
            nextEl.focus();
            if (nextEl instanceof HTMLInputElement) {
              const nextVal = nextEl.value?.trim();
              if (nextVal === '0' || nextVal === '0.00' || nextVal === '0.0' || nextVal === '০') {
                setTimeout(() => nextEl.select(), 10);
              }
            }
          }
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);


  // Toast Notification System
  const [toastNotification, setToastNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Invoice Handlers
  const handleOpenNewInvoice = () => {
    setEditingInvoice(null);
    setIsInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleSaveInvoice = (savedInvoice: Invoice) => {
    storageService.saveInvoice(savedInvoice);
    refreshAllData();
    showToast(lang === 'bn' ? 'চালান সফলভাবে সংরক্ষিত হয়েছে' : 'Invoice saved successfully');
  };

  const handleDeleteInvoice = async (id: string) => {
    // Optimistic UI update
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    try {
      await storageService.deleteInvoice(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'চালান সফলভাবে মুছে ফেলা হয়েছে' : 'Invoice deleted successfully', 'info');
    } catch (err) {
      console.error('Delete error:', err);
      refreshAllData(); // Revert to actual state
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete invoice', 'error');
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setPrintedInvoice(invoice);
  };

  // Stock Handlers
  const handleSaveStockItem = (item: StockItem) => {
    storageService.saveStockItem(item);
    refreshAllData();
    showToast(lang === 'bn' ? 'মালের স্টক সফলভাবে সংরক্ষিত হয়েছে' : 'Stock item saved successfully');
  };

  const handleDeleteStockItem = async (id: string) => {
    // Optimistic UI update
    setStock((prev) => prev.filter((item) => item.id !== id));
    try {
      await storageService.deleteStockItem(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'মাল স্টক থেকে সফলভাবে মুছে ফেলা হয়েছে' : 'Item removed from stock', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete item', 'error');
    }
  };

  // Party Handlers
  const handleSaveParty = (party: Party) => {
    storageService.saveParty(party);
    refreshAllData();
    showToast(lang === 'bn' ? 'পার্টি তথ্য সংরক্ষিত হয়েছে' : 'Party saved successfully');
  };

  // Payroll & Staff Handlers
  const handleSaveStaff = (stf: Staff) => {
    storageService.saveStaff(stf);
    refreshAllData();
    showToast(lang === 'bn' ? 'স্টাফ তথ্য সফলভাবে সংরক্ষিত ও আপডেট হয়েছে' : 'Staff details updated successfully');
  };

  const handleDeleteStaff = async (id: string) => {
    // Optimistic UI update
    setStaff((prev) => prev.filter((s) => s.id !== id));
    try {
      await storageService.deleteStaff(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'স্টাফ তালিকা থেকে সফলভাবে মুছে ফেলা হয়েছে' : 'Staff removed successfully', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to remove staff', 'error');
    }
  };

  const handleSaveAttendance = (rec: AttendanceRecord) => {
    storageService.saveAttendance(rec);
    refreshAllData();
    showToast(lang === 'bn' ? 'হাজিরা সফলভাবে রেকর্ড করা হয়েছে' : 'Attendance recorded successfully');
  };

  // Punch & Leave Request Handlers
  const handleSavePunchRequest = (req: PunchLeaveRequest) => {
    storageService.savePunchRequest(req);
    refreshAllData();
    showToast(lang === 'bn' ? 'ছুটি / পাঞ্চ আবেদন সফলভাবে সংরক্ষিত হয়েছে' : 'Request submitted/updated successfully');
  };

  const handleDeletePunchRequest = async (id: string) => {
    // Optimistic UI update
    setPunchRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await storageService.deletePunchRequest(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'আবেদন তালিকা থেকে সফলভাবে মুছে ফেলা হয়েছে' : 'Request removed successfully', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to remove request', 'error');
    }
  };

  // Processing Worker Task & Damage Handlers
  const handleSaveWorkerTask = (task: WorkerTaskRecord) => {
    storageService.saveWorkerTask(task);
    refreshAllData();
    showToast(lang === 'bn' ? 'ওয়ার্কার টাস্ক ও কাজের হিসাব সংরক্ষিত হয়েছে' : 'Worker task & production recorded');
  };

  const handleDeleteWorkerTask = async (id: string) => {
    // Optimistic UI update
    setWorkerTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await storageService.deleteWorkerTask(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'টাস্ক মুছে ফেলা হয়েছে' : 'Worker task deleted', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete task', 'error');
    }
  };

  // Petty Cash Handlers
  const handleSavePettyCash = (exp: PettyCashExpense) => {
    storageService.savePettyCashExpense(exp);
    refreshAllData();
  };

  const handleDeletePettyCash = async (id: string) => {
    // Optimistic update
    setPettyCashExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await storageService.deletePettyCashExpense(id);
      refreshAllData();
    } catch (err) {
      console.warn('Delete petty cash error:', err);
      refreshAllData();
    }
  };

  // Car Expense Handlers
  const handleSaveCarExpense = (exp: CarExpense) => {
    storageService.saveCarExpense(exp);
    refreshAllData();
  };

  const handleDeleteCarExpense = async (id: string) => {
    // Optimistic update
    setCarExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await storageService.deleteCarExpense(id);
      refreshAllData();
    } catch (err) {
      console.warn('Delete car expense error:', err);
      refreshAllData();
    }
  };

  // Dokan Payment Handlers
  const handleSaveDokanPayment = (payment: DokanPayment) => {
    storageService.saveDokanPayment(payment);
    refreshAllData();
  };

  const handleDeleteDokanPayment = async (id: string) => {
    // Optimistic update
    setDokanPayments((prev) => prev.filter((p) => p.id !== id));
    try {
      await storageService.deleteDokanPayment(id);
      refreshAllData();
    } catch (err) {
      console.warn('Delete dokan payment error:', err);
      refreshAllData();
    }
  };

  // Branch Office & 3rd Party RMB Handlers
  const handleSaveBranchConsignment = (item: BranchConsignment) => {
    storageService.saveBranchConsignment(item);
    refreshAllData();
    showToast(lang === 'bn' ? 'শাখা অফিসের চালান সংরক্ষিত হয়েছে' : 'Branch consignment saved');
  };

  const handleDeleteBranchConsignment = async (id: string) => {
    setBranchConsignments((prev) => prev.filter((c) => c.id !== id));
    try {
      await storageService.deleteBranchConsignment(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'চালান মুছে ফেলা হয়েছে' : 'Consignment deleted', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete consignment', 'error');
    }
  };

  const handleSaveBranchRemittance = (item: BranchRmbRemittance) => {
    storageService.saveBranchRemittance(item);
    refreshAllData();
    showToast(lang === 'bn' ? 'RMB প্রাপ্তির রেকর্ড সংরক্ষিত হয়েছে' : 'RMB remittance saved');
  };

  const handleDeleteBranchRemittance = async (id: string) => {
    setBranchRemittances((prev) => prev.filter((r) => r.id !== id));
    try {
      await storageService.deleteBranchRemittance(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'RMB রেকর্ড মুছে ফেলা হয়েছে' : 'RMB remittance deleted', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete remittance', 'error');
    }
  };

  const handleSaveRmbConversion = (item: ThirdPartyRmbConversion) => {
    storageService.saveRmbConversion(item);
    refreshAllData();
    showToast(lang === 'bn' ? '৩য়-পক্ষ RMB কনভার্শন সংরক্ষিত হয়েছে' : 'RMB conversion saved');
  };

  const handleDeleteRmbConversion = async (id: string) => {
    setRmbConversions((prev) => prev.filter((c) => c.id !== id));
    try {
      await storageService.deleteRmbConversion(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'কনভার্শন রেকর্ড মুছে ফেলা হয়েছে' : 'Conversion deleted', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete conversion', 'error');
    }
  };

  const handleSaveThirdParty = (item: ThirdParty) => {
    storageService.saveThirdParty(item);
    refreshAllData();
    showToast(lang === 'bn' ? '৩য়-পক্ষ সফলভাবে সংরক্ষিত হয়েছে' : 'Third party saved successfully');
  };

  const handleDeleteThirdParty = async (id: string) => {
    setThirdParties((prev) => prev.filter((p) => p.id !== id));
    try {
      await storageService.deleteThirdParty(id);
      refreshAllData();
      showToast(lang === 'bn' ? '৩য়-পক্ষ মুছে ফেলা হয়েছে' : 'Third party removed', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to remove third party', 'error');
    }
  };

  const handleSaveChinaDirectPayment = (item: ChinaDirectPayment) => {
    storageService.saveChinaDirectPayment(item);
    refreshAllData();
    showToast(lang === 'bn' ? 'চীন সরাসরি পেমেন্ট এন্ট্রি সংরক্ষিত হয়েছে' : 'China direct payment saved');
  };

  const handleDeleteChinaDirectPayment = async (id: string) => {
    setChinaDirectPayments((prev) => prev.filter((p) => p.id !== id));
    try {
      await storageService.deleteChinaDirectPayment(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'পেমেন্ট এন্ট্রি মুছে ফেলা হয়েছে' : 'Direct payment removed', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to remove direct payment', 'error');
    }
  };

  // Price List Handlers (দর তালিকা তৈরি)
  const handleSavePriceList = (list: PriceList) => {
    storageService.savePriceList(list);
    refreshAllData();
    showToast(lang === 'bn' ? 'দর তালিকা সংরক্ষিত হয়েছে' : 'Price list saved');
  };

  const handleDeletePriceList = async (id: string) => {
    setPriceLists((prev) => prev.filter((p) => p.id !== id));
    try {
      await storageService.deletePriceList(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'দর তালিকা মুছে ফেলা হয়েছে' : 'Price list deleted', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete price list', 'error');
    }
  };

  // Worker Product Conversion Handlers (পণ্য রূপান্তর ও আউটপুট ট্র্যাকিং)
  const handleSaveWorkerConversion = (conversion: WorkerProductConversion) => {
    storageService.saveWorkerConversion(conversion);
    refreshAllData();
    showToast(lang === 'bn' ? 'পণ্য রূপান্তর রেকর্ড সংরক্ষিত হয়েছে' : 'Product conversion saved');
  };

  const handleDeleteWorkerConversion = async (id: string) => {
    setWorkerConversions((prev) => prev.filter((c) => c.id !== id));
    try {
      await storageService.deleteWorkerConversion(id);
      refreshAllData();
      showToast(lang === 'bn' ? 'কনভার্শন রেকর্ড মুছে ফেলা হয়েছে' : 'Conversion record deleted', 'info');
    } catch (err) {
      refreshAllData();
      showToast(lang === 'bn' ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete conversion', 'error');
    }
  };

  const handleOpenNewDokanInvoice = () => {
    setEditingInvoice({
      id: `inv-${Date.now()}`,
      invoiceNo: `DK-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      type: 'dokan',
      mode: 'purchase',
      partyId: '',
      partyName: lang === 'bn' ? 'দোকান ক্রয়' : 'Shop Purchase',
      partyPhone: '',
      partyAddress: '',
      previousBalance: 0,
      items: [
        {
          id: '1',
          name: '',
          category: 'code',
          quantity: 0,
          unit: 'kg',
          unitPrice: 0,
          total: 0,
        },
      ],
      subtotal: 0,
      courierDeduction: 0,
      netInvoiceAmount: 0,
      grandTotal: 0,
      paidAmount: 0,
      remainingDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      notes: lang === 'bn' ? 'দোকান থেকে মালামাল ক্রয়' : 'Purchased goods from shop',
      createdAt: new Date().toISOString(),
    });
    setIsInvoiceModalOpen(true);
  };

  // Company Info Handler
  const handleSaveCompanyInfo = (info: CompanyInfo) => {
    storageService.saveCompanyInfo(info);
    if (userSession && userSession.role === 'admin' && info.proprietor) {
      const updatedSession: UserSession = {
        ...userSession,
        name: info.proprietor,
        loginId: info.adminUsername || userSession.loginId,
      };
      setUserSession(updatedSession);
      localStorage.setItem('rsr_user_session_v1', JSON.stringify(updatedSession));
    }
    refreshAllData();
  };

  // Combine expenses for dashboard & statements (Preserving cash in vs expense out)
  const allExpensesCombined: OfficeExpense[] = [
    ...pettyCashExpenses.map((p) => ({
      id: p.id,
      date: p.date,
      type: p.type || 'out',
      category: p.category,
      title: p.title,
      amount: p.amount,
      paymentMethod: p.paymentMethod || 'cash',
      paidTo: p.paidTo,
      notes: p.notes,
    })),
    ...carExpenses.map((c) => ({
      id: c.id,
      date: c.date,
      type: 'out' as const,
      category: 'other' as const,
      title: `${c.title || c.expenseType || 'Vehicle'}: ${c.description || c.vehicleNo || ''}`,
      amount: c.amount,
      paymentMethod: c.paymentMethod || 'cash',
      paidTo: c.driverName || c.paidTo,
      notes: c.notes,
    })),
  ];

  const t = translations[lang];

  if (!userSession) {
    return (
      <AuthScreen
        staffList={staff}
        companyInfo={companyInfo}
        lang={lang}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Side-by-side Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setActiveStatementType(null);
          setPrintedInvoice(null);
          setCurrentTab(tab);
        }}
        lang={lang}
        setLang={setLang}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenNewInvoice={handleOpenNewInvoice}
        onOpenStatementsModal={() => setIsStatementSelectorOpen(true)}
        onOpenBackupModal={() => setIsSecurityModalOpen(true)}
        onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
        isCloudConnected={Boolean(currentUser)}
        isOnline={isOnline}
        companyInfo={companyInfo}
        stock={stock}
        staff={staff}
        attendance={attendance}
        invoices={invoices}
        userSession={userSession}
        onLogout={handleLogout}
      />

      {/* App Update Notification Bar */}
      {showUpdateBanner && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white px-3 sm:px-6 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-30">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
            </span>
            <span>
              {lang === 'bn'
                ? `সফটওয়্যারের নতুন সংস্করণ (${CURRENT_APP_VERSION}) সক্রিয় হয়েছে! শাখা অফিস ৩য়-পক্ষ এক্সচেঞ্জার, চীন সরাসরি BDT পেমেন্ট ও নতুন রিপোর্ট যুক্ত হয়েছে।`
                : `A newer version (${CURRENT_APP_VERSION}) of the software is active with latest updates and features!`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => forceUpdateAndReloadApp()}
              className="px-3 py-1 bg-white text-slate-950 hover:bg-slate-100 rounded-lg font-bold text-[11px] shadow-sm cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>{lang === 'bn' ? 'রিফ্রেশ ও সিঙ্ক করুন' : 'Refresh Now'}</span>
            </button>
            <button
              onClick={() => {
                setShowUpdateBanner(false);
                localStorage.setItem('rsr_seen_update_banner', CURRENT_APP_VERSION);
              }}
              className="p-1 text-white/80 hover:text-white cursor-pointer"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Render Single Dedicated 1-Page Printable Views if active */}
        {printedInvoice ? (
          <InvoicePrintView
            invoice={printedInvoice}
            lang={lang}
            onBack={() => setPrintedInvoice(null)}
          />
        ) : activeStatementType ? (
          <PrintStatements
            type={activeStatementType}
            lang={lang}
            stock={stock}
            invoices={invoices}
            parties={parties}
            staff={staff}
            attendance={attendance}
            expenses={allExpensesCombined}
            initialStaffId={activeStatementStaffId}
            initialPartyId={activeStatementPartyId}
            initialMonth={activeStatementMonth}
            filterMode={activeStatementFilterMode}
            selectedDate={activeStatementSelectedDate}
            startDate={activeStatementStartDate}
            endDate={activeStatementEndDate}
            onBack={() => {
              setActiveStatementType(null);
              setActiveStatementStaffId(null);
              setActiveStatementPartyId(null);
              setActiveStatementMonth(null);
            }}
          />
        ) : (
          /* Normal Tab Content */
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                lang={lang}
                invoices={invoices}
                stock={stock}
                parties={parties}
                attendance={attendance}
                expenses={allExpensesCombined}
                staff={staff}
                branchConsignments={branchConsignments}
                branchRemittances={branchRemittances}
                rmbConversions={rmbConversions}
                chinaDirectPayments={chinaDirectPayments}
                onOpenNewInvoice={handleOpenNewInvoice}
                onOpenStatementsModal={() => setIsStatementSelectorOpen(true)}
                onSelectTab={(tab) => setCurrentTab(tab)}
                onViewInvoice={handlePrintInvoice}
                isCloudConnected={Boolean(currentUser)}
                onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoiceList
                invoices={invoices}
                lang={lang}
                onNewInvoice={handleOpenNewInvoice}
                onEditInvoice={handleEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onPrintInvoice={handlePrintInvoice}
                isSuperAdmin={isSuperAdmin}
                isHeadSupervisor={isHeadSupervisor}
              />
            )}

            {/* Dokan Hishab Panel (দোকানের হিসাব) */}
            {currentTab === 'dokan_hishab' && (
              <DokanHishabPanel
                invoices={invoices}
                dokanPayments={dokanPayments}
                onSavePayment={handleSaveDokanPayment}
                onDeletePayment={handleDeleteDokanPayment}
                onOpenNewDokanInvoice={handleOpenNewDokanInvoice}
                onViewInvoice={handlePrintInvoice}
                lang={lang}
                companyInfo={companyInfo}
              />
            )}

            {currentTab === 'stock' && (
              <StockPanel
                stock={stock}
                invoices={invoices}
                lang={lang}
                onSaveItem={handleSaveStockItem}
                onDeleteItem={handleDeleteStockItem}
                onPrintStockStatement={() => setActiveStatementType('stock')}
                isSuperAdmin={isSuperAdmin}
              />
            )}

            {/* Price List Make Panel (3 Pricing Columns) */}
            {currentTab === 'price_list' && (
              <PriceListPanel
                priceLists={priceLists}
                stock={stock}
                companyInfo={companyInfo}
                lang={lang}
                onSavePriceList={handleSavePriceList}
                onDeletePriceList={handleDeletePriceList}
                isSuperAdmin={isSuperAdmin || isHeadSupervisor}
              />
            )}

            {currentTab === 'parties' && (
              <PartyPanel
                parties={parties}
                invoices={invoices}
                lang={lang}
                onSaveParty={handleSaveParty}
                onSaveInvoice={handleSaveInvoice}
                onPrintPartyStatement={() => {
                  setActiveStatementPartyId(null);
                  setActiveStatementType('party');
                }}
                onPrintPartyLedger={(partyId) => {
                  setActiveStatementPartyId(partyId);
                  setActiveStatementType('party');
                }}
                onViewInvoice={handlePrintInvoice}
                isSuperAdmin={isSuperAdmin}
              />
            )}

            {currentTab === 'payroll' && (
              <PayrollPanel
                staff={staff}
                attendance={attendance}
                punchRequests={punchRequests}
                lang={lang}
                onSaveAttendance={handleSaveAttendance}
                onSaveStaff={handleSaveStaff}
                onDeleteStaff={handleDeleteStaff}
                onSavePunchRequest={handleSavePunchRequest}
                onDeletePunchRequest={handleDeletePunchRequest}
                onPrintPayrollStatement={(staffId, selectedMonth) => {
                  setActiveStatementStaffId(staffId || null);
                  setActiveStatementMonth(selectedMonth || null);
                  setActiveStatementType('payroll');
                }}
                isSuperAdmin={isSuperAdmin}
                userSession={userSession}
              />
            )}

            {/* Worker Tracking Panel (Processing Staff & Product Conversion Output) */}
            {currentTab === 'worker_tracking' && (
              <WorkerTrackingPanel
                staff={staff || []}
                workerTasks={workerTasks || []}
                lang={lang}
                onSaveTask={handleSaveWorkerTask}
                onDeleteTask={handleDeleteWorkerTask}
                onPrintWorkerStatement={(workerId) => {
                  setActiveStatementType('worker_tracking');
                }}
                isSuperAdmin={isSuperAdmin || isHeadSupervisor}
                workerConversions={workerConversions || []}
                onSaveWorkerConversion={handleSaveWorkerConversion}
                onDeleteWorkerConversion={handleDeleteWorkerConversion}
                onSaveStaff={handleSaveStaff}
              />
            )}

            {/* Office Petty Cash / Expense Maintain Panel */}
            {currentTab === 'petty_cash' && (
              <PettyCashPanel
                expenses={pettyCashExpenses}
                lang={lang}
                onSaveExpense={handleSavePettyCash}
                onDeleteExpense={handleDeletePettyCash}
                onPrintStatement={(filters) => {
                  setActiveStatementFilterMode(filters.filterMode);
                  setActiveStatementMonth(filters.selectedMonth);
                  setActiveStatementSelectedDate(filters.selectedDate);
                  setActiveStatementStartDate(filters.startDate);
                  setActiveStatementEndDate(filters.endDate);
                  setActiveStatementType('expense');
                }}
              />
            )}

            {/* Car Expense Panel */}
            {currentTab === 'car_expenses' && (
              <CarExpensePanel
                expenses={carExpenses}
                lang={lang}
                onSaveExpense={handleSaveCarExpense}
                onDeleteExpense={handleDeleteCarExpense}
                onPrintStatement={() => setActiveStatementType('expense')}
              />
            )}

            {/* Financial Analytics & ROI Dashboard Panel */}
            {currentTab === 'financial' && (
              <FinancialAnalyticsPanel
                lang={lang}
                invoices={invoices}
                stock={stock}
                staff={staff}
                attendance={attendance}
                pettyCashExpenses={pettyCashExpenses}
                carExpenses={carExpenses}
                branchConsignments={branchConsignments}
                branchRemittances={branchRemittances}
                rmbConversions={rmbConversions}
                chinaDirectPayments={chinaDirectPayments}
                parties={parties}
                onPrintFinancialStatement={(mode, selDate, selMonth, startD, endD) => {
                  setActiveStatementMonth(selMonth || new Date().toISOString().split('T')[0].slice(0, 7));
                  setActiveStatementType('financial');
                }}
              />
            )}

            {/* Branch Office & 3rd Party RMB/BDT Management Panel */}
            {currentTab === 'branch' && (
              <BranchOfficePanel
                consignments={branchConsignments}
                remittances={branchRemittances}
                conversions={rmbConversions}
                thirdParties={thirdParties}
                chinaDirectPayments={chinaDirectPayments}
                companyInfo={companyInfo}
                lang={lang}
                onSaveConsignment={handleSaveBranchConsignment}
                onDeleteConsignment={handleDeleteBranchConsignment}
                onSaveRemittance={handleSaveBranchRemittance}
                onDeleteRemittance={handleDeleteBranchRemittance}
                onSaveConversion={handleSaveRmbConversion}
                onDeleteConversion={handleDeleteRmbConversion}
                onSaveThirdParty={handleSaveThirdParty}
                onDeleteThirdParty={handleDeleteThirdParty}
                onSaveChinaDirectPayment={handleSaveChinaDirectPayment}
                onDeleteChinaDirectPayment={handleDeleteChinaDirectPayment}
                isSuperAdmin={isSuperAdmin || isHeadSupervisor}
              />
            )}

            {/* Company Settings Panel (correction/changes for all company details & desktop install) */}
            {currentTab === 'settings' && (
              <SettingsPanel
                companyInfo={companyInfo}
                lang={lang}
                onSaveCompanyInfo={handleSaveCompanyInfo}
                onOpenBackupModal={() => setIsSecurityModalOpen(true)}
                onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
              />
            )}

            {/* Statements Hub (All Sheets Panel with Date & Month Filters) */}
            {currentTab === 'statements' && (
              <AllSheetsPanel
                lang={lang}
                stock={stock}
                invoices={invoices}
                parties={parties}
                staff={staff}
                attendance={attendance}
                expenses={allExpensesCombined}
                branchConsignments={branchConsignments}
                branchRemittances={branchRemittances}
                rmbConversions={rmbConversions}
                thirdParties={thirdParties}
                chinaDirectPayments={chinaDirectPayments}
                workerTasks={workerTasks}
                initialType={activeStatementType || 'stock'}
              />
            )}
          </>
        )}
      </main>

      {/* 1-Page Statement Selection Modal */}
      <StatementSelectorModal
        isOpen={isStatementSelectorOpen}
        onClose={() => setIsStatementSelectorOpen(false)}
        lang={lang}
        onSelectStatement={(type) => {
          setIsStatementSelectorOpen(false);
          setActiveStatementType(type);
        }}
      />

      {/* Invoice Creation / Edit Modal (Manual Unit Price, Enter key cursor nav, Stock shown, Print button) */}
      <InvoiceModal
        lang={lang}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        onSave={handleSaveInvoice}
        parties={parties}
        stock={stock}
        existingInvoice={editingInvoice}
        onPrint={(inv) => {
          setIsInvoiceModalOpen(false);
          setPrintedInvoice(inv);
        }}
      />

      {/* Security, Encryption & Database Backup Modal */}
      {isSecurityModalOpen && (
        <SecurityComplianceModal
          lang={lang}
          onClose={() => setIsSecurityModalOpen(false)}
          onDataRestored={refreshAllData}
        />
      )}

      {/* Cloud Firestore Multi-Device Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        lang={lang}
        onDataRefreshed={refreshAllData}
        isOnline={isOnline}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
              toastNotification.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : toastNotification.type === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-emerald-600 text-white border-emerald-500'
            }`}
          >
            <span>{toastNotification.message}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="text-white/80 hover:text-white p-0.5 cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Footer with dynamic company info */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto">
          <div>
            <strong>{companyInfo.name}</strong> &bull; {companyInfo.processingName}
          </div>
          <div className="text-[11px]">
            {companyInfo.address} | {companyInfo.phones.join(', ')}
          </div>
        </div>
      </footer>
    </div>
  );
}
