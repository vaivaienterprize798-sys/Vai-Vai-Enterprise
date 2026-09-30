import {
  Invoice,
  StockItem,
  Party,
  PartyTransaction,
  Staff,
  AttendanceRecord,
  OfficeExpense,
  PettyCashExpense,
  CarExpense,
  CompanyInfo,
  DEFAULT_COMPANY,
  InvoiceType,
  DokanPayment,
  WorkerTaskRecord,
  PunchLeaveRequest,
  SupervisorSampleRecord,
  BranchConsignment,
  BranchRmbRemittance,
  ThirdPartyRmbConversion,
  PriceList,
  WorkerProductConversion,
  ThirdParty,
  ChinaDirectPayment,
} from '../types';
import { cloudDbService, auth, db, handleFirestoreError, OperationType } from './firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const STORAGE_KEYS = {
  COMPANY: 'rsr_company_v2',
  INVOICES: 'rsr_invoices_v1',
  STOCK: 'rsr_stock_v1',
  PARTIES: 'rsr_parties_v1',
  LEDGER: 'rsr_ledger_v1',
  STAFF: 'rsr_staff_v1',
  ATTENDANCE: 'rsr_attendance_v1',
  EXPENSES: 'rsr_expenses_v1',
  PETTY_CASH: 'rsr_petty_cash_v1',
  CAR_EXPENSES: 'rsr_car_expenses_v1',
  DOKAN_PAYMENTS: 'rsr_dokan_payments_v1',
  SALARY_PAYMENTS: 'rsr_salary_payments_v1',
  WORKER_TASKS: 'rsr_worker_tasks_v1',
  PUNCH_REQUESTS: 'rsr_punch_requests_v1',
  SUPERVISOR_SAMPLES: 'rsr_supervisor_samples_v1',
  BRANCH_CONSIGNMENTS: 'rsr_branch_consignments_v1',
  BRANCH_REMITTANCES: 'rsr_branch_remittances_v1',
  RMB_CONVERSIONS: 'rsr_rmb_conversions_v1',
  PRICE_LISTS: 'rsr_price_lists_v1',
  WORKER_CONVERSIONS: 'rsr_worker_conversions_v1',
  THIRD_PARTIES: 'rsr_third_parties_v1',
  CHINA_DIRECT_PAYMENTS: 'rsr_china_direct_payments_v1',
  SETTINGS: 'rsr_settings_v1',
  THEME: 'rsr_theme_v1',
  LANGUAGE: 'rsr_lang_v1',
};

// Clean Initial Constants (Zero/Blank State)
export const INITIAL_STOCK: StockItem[] = [];
export const INITIAL_PARTIES: Party[] = [];
export const INITIAL_STAFF: Staff[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_PETTY_CASH: PettyCashExpense[] = [];
export const INITIAL_CAR_EXPENSES: CarExpense[] = [];
export const INITIAL_DOKAN_PAYMENTS: DokanPayment[] = [];
export const INITIAL_WORKER_TASKS: WorkerTaskRecord[] = [];
export const INITIAL_SUPERVISOR_SAMPLES: SupervisorSampleRecord[] = [];
export const INITIAL_PUNCH_REQUESTS: PunchLeaveRequest[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_BRANCH_CONSIGNMENTS: BranchConsignment[] = [];
export const INITIAL_BRANCH_REMITTANCES: BranchRmbRemittance[] = [];
export const INITIAL_RMB_CONVERSIONS: ThirdPartyRmbConversion[] = [];
export const INITIAL_PRICE_LISTS: PriceList[] = [];
export const INITIAL_WORKER_CONVERSIONS: WorkerProductConversion[] = [];
export const INITIAL_THIRD_PARTIES: ThirdParty[] = [];
export const INITIAL_CHINA_DIRECT_PAYMENTS: ChinaDirectPayment[] = [];

// Helper to safely read from localStorage
export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null' || raw === 'NaN') return defaultValue;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return defaultValue;
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(parsed)) return defaultValue;
      return parsed as T;
    }
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return defaultValue;
      return { ...defaultValue, ...parsed } as T;
    }
    return parsed as T;
  } catch (err) {
    console.error(`Error loading key "${key}":`, err);
    return defaultValue;
  }
};

// Helper to safely write to localStorage
export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key "${key}":`, err);
  }
};

// API Service Wrapper for Local Database
export const storageService = {
  // Invoices
  getInvoices: (): Invoice[] => {
    const list = loadFromStorage<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_INVOICES;
  },

  saveInvoice: (invoice: Invoice): void => {
    const invoices = storageService.getInvoices();
    const index = invoices.findIndex((i) => i.id === invoice.id);
    let updated: Invoice[];
    if (index >= 0) {
      updated = [...invoices];
      updated[index] = invoice;
    } else {
      updated = [invoice, ...invoices];
    }
    saveToStorage(STORAGE_KEYS.INVOICES, updated);

    // Auto Stock Adjustment
    storageService.applyInvoiceToStock(invoice);

    // Auto Party Due/Advance update
    if (invoice.partyId && invoice.type !== 'processing') {
      storageService.applyInvoiceToParty(invoice);
    }

    // Cloud Firestore Synchronization
    cloudDbService.saveDocument('invoices', invoice).catch((err) => {
      console.warn('[Cloud Sync] Invoice push note:', err);
    });
  },

  deleteInvoice: async (id: string): Promise<void> => {
    const invoices = storageService.getInvoices();
    const invoice = invoices.find((i) => i.id === id);
    if (!invoice) return;

    // 1. Reverse Stock Adjustment
    const stock = storageService.getStock();
    const isPurchase = invoice.mode === 'purchase';
    const updatedStock = stock.map((stockItem) => {
      const matching = invoice.items.find(
        (it) =>
          (it.code && it.code.trim().toLowerCase() === stockItem.code.trim().toLowerCase()) ||
          it.name.trim().toLowerCase() === stockItem.nameBn.trim().toLowerCase() ||
          it.name.trim().toLowerCase() === stockItem.nameEn.trim().toLowerCase()
      );
      if (matching) {
        if (isPurchase) {
          // Reduce stock (was added during purchase)
          return { ...stockItem, quantity: Math.max(0, stockItem.quantity - matching.quantity) };
        } else {
          // Increase stock (was removed during sale)
          return { ...stockItem, quantity: stockItem.quantity + matching.quantity };
        }
      }
      return stockItem;
    });
    saveToStorage(STORAGE_KEYS.STOCK, updatedStock);
    
    // Sync modified stock items to cloud
    for (const stk of updatedStock) {
      const isModified = invoice.items.some(
        (it) => (it.code && it.code.trim().toLowerCase() === stk.code.trim().toLowerCase()) || 
                it.name.trim().toLowerCase() === stk.nameBn.trim().toLowerCase() || 
                it.name.trim().toLowerCase() === stk.nameEn.trim().toLowerCase()
      );
      if (isModified) {
        await cloudDbService.saveDocument('stock', stk).catch(() => {});
      }
    }

    // 2. Reverse Party Due/Advance update
    if (invoice.partyId && invoice.type !== 'processing') {
      const parties = storageService.getParties();
      const party = parties.find((p) => p.id === invoice.partyId);
      if (party) {
        const updatedParties = parties.map((p) => {
          if (p.id === party.id) {
            return { 
              ...p, 
              currentDue: p.currentDue - (invoice.remainingDue ?? 0),
              totalTransactions: Math.max(0, p.totalTransactions - 1)
            };
          }
          return p;
        });
        saveToStorage(STORAGE_KEYS.PARTIES, updatedParties);
        const updatedParty = updatedParties.find((p) => p.id === party.id);
        if (updatedParty) {
          await cloudDbService.saveDocument('parties', updatedParty).catch(() => {});
        }
      }
    }

    // 3. Final Delete from local list and Cloud
    const filtered = invoices.filter((i) => i.id !== id);
    saveToStorage(STORAGE_KEYS.INVOICES, filtered);
    return cloudDbService.deleteDocument('invoices', id);
  },

  // Company Info
  getCompanyInfo: (): CompanyInfo => {
    const info = loadFromStorage<CompanyInfo>(STORAGE_KEYS.COMPANY, DEFAULT_COMPANY);
    return { ...DEFAULT_COMPANY, ...(info || {}) };
  },

  saveCompanyInfo: (info: CompanyInfo): void => {
    saveToStorage(STORAGE_KEYS.COMPANY, info);
    cloudDbService.saveCompany(info).then(() => {
      console.log('[Cloud Sync] Company Info updated on Cloud');
    }).catch((err) => {
      console.warn('[Cloud Sync] Company push failure:', err);
    });
  },

  // Stock
  getStock: (): StockItem[] => {
    const list = loadFromStorage<StockItem[]>(STORAGE_KEYS.STOCK, INITIAL_STOCK);
    if (!Array.isArray(list)) return INITIAL_STOCK;
    return list.filter(Boolean).map((s) => ({
      ...s,
      purchaseAvgRate: s?.purchaseAvgRate ?? s?.purchaseRate ?? 0,
    }));
  },

  saveStockItem: (item: StockItem): void => {
    const stock = storageService.getStock();
    const idx = stock.findIndex((s) => s.id === item.id);
    let updated: StockItem[];
    const itemWithAvg = {
      ...item,
      purchaseAvgRate: item.purchaseAvgRate ?? item.purchaseRate ?? 0,
    };
    if (idx >= 0) {
      updated = [...stock];
      updated[idx] = itemWithAvg;
    } else {
      updated = [...stock, itemWithAvg];
    }
    saveToStorage(STORAGE_KEYS.STOCK, updated);
    cloudDbService.saveDocument('stock', itemWithAvg).catch((err) => {
      console.warn('[Cloud Sync] Stock push note:', err);
    });
  },

  deleteStockItem: async (id: string): Promise<void> => {
    const stock = storageService.getStock();
    saveToStorage(STORAGE_KEYS.STOCK, stock.filter((s) => s.id !== id));
    return cloudDbService.deleteDocument('stock', id);
  },

  applyInvoiceToStock: (invoice: Invoice): void => {
    const stock = storageService.getStock();
    const isPurchase = invoice.mode === 'purchase';
    const updatedStock = stock.map((stockItem) => {
      const matching = invoice.items.find(
        (it) =>
          (it.code && it.code.trim().toLowerCase() === stockItem.code.trim().toLowerCase()) ||
          it.name.trim().toLowerCase() === stockItem.nameBn.trim().toLowerCase() ||
          it.name.trim().toLowerCase() === stockItem.nameEn.trim().toLowerCase()
      );
      if (matching) {
        const changeQty = matching.quantity;
        if (isPurchase) {
          const oldQty = stockItem.quantity;
          const oldAvgRate = stockItem.purchaseAvgRate ?? stockItem.purchaseRate ?? 0;
          const newQty = oldQty + changeQty;
          const newAvgRate = newQty > 0 ? Math.round(((oldQty * oldAvgRate + changeQty * matching.unitPrice) / newQty) * 100) / 100 : matching.unitPrice;
          return { ...stockItem, quantity: newQty, purchaseAvgRate: newAvgRate, purchaseRate: newAvgRate, lastUpdated: invoice.date || new Date().toISOString().split('T')[0] };
        } else {
          return { ...stockItem, quantity: Math.max(0, stockItem.quantity - changeQty), lastUpdated: invoice.date || new Date().toISOString().split('T')[0] };
        }
      }
      return stockItem;
    });
    saveToStorage(STORAGE_KEYS.STOCK, updatedStock);
    updatedStock.forEach((stk) => {
      const isModified = invoice.items.some(
        (it) => (it.code && it.code.trim().toLowerCase() === stk.code.trim().toLowerCase()) || it.name.trim().toLowerCase() === stk.nameBn.trim().toLowerCase() || it.name.trim().toLowerCase() === stk.nameEn.trim().toLowerCase()
      );
      if (isModified) cloudDbService.saveDocument('stock', stk).catch(() => {});
    });
  },

  // Parties
  getParties: (): Party[] => {
    const list = loadFromStorage<Party[]>(STORAGE_KEYS.PARTIES, INITIAL_PARTIES);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_PARTIES;
  },

  saveParty: (party: Party): void => {
    const parties = storageService.getParties();
    const idx = parties.findIndex((p) => p.id === party.id);
    let updated: Party[];
    if (idx >= 0) {
      updated = [...parties];
      updated[idx] = party;
    } else {
      updated = [...parties, party];
    }
    saveToStorage(STORAGE_KEYS.PARTIES, updated);
    cloudDbService.saveDocument('parties', party).catch((err) => {
      console.warn('[Cloud Sync] Party push note:', err);
    });
  },

  applyInvoiceToParty: (invoice: Invoice): void => {
    if (!invoice.partyId) return;
    const parties = storageService.getParties();
    const party = parties.find((p) => p.id === invoice.partyId);
    if (!party) return;
    const newDue = party.currentDue + (invoice.remainingDue ?? 0);
    const updatedParties = parties.map((p) => {
      if (p.id === party.id) {
        return { ...p, currentDue: newDue, totalTransactions: p.totalTransactions + 1 };
      }
      return p;
    });
    saveToStorage(STORAGE_KEYS.PARTIES, updatedParties);
    const updatedParty = updatedParties.find((p) => p.id === party.id);
    if (updatedParty) {
      cloudDbService.saveDocument('parties', updatedParty).catch(() => {});
    }
  },

  // Staff
  getStaff: (): Staff[] => {
    const list = loadFromStorage<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    const validList = Array.isArray(list) ? list.filter(Boolean) : INITIAL_STAFF;
    return validList.map((stf) => ({
      ...stf,
      dailyRate: stf.category === 'office' ? Math.round(Number(stf.baseSalary || 0) / 30) : Math.round(Number(stf.baseSalary || 0) / 26),
    }));
  },

  saveStaff: (staff: Staff): void => {
    const dailyRate = staff.category === 'office' ? Math.round(Number(staff.baseSalary || 0) / 30) : Math.round(Number(staff.baseSalary || 0) / 26);
    const staffWithRate: Staff = { ...staff, dailyRate };
    const list = storageService.getStaff();
    const idx = list.findIndex((s) => s.id === staffWithRate.id);
    let updated: Staff[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = staffWithRate;
    } else {
      updated = [...list, staffWithRate];
    }
    saveToStorage(STORAGE_KEYS.STAFF, updated);
    cloudDbService.saveDocument('staff', staffWithRate).catch((err) => {
      console.warn('[Cloud Sync] Staff push note:', err);
    });
  },

  deleteStaff: async (id: string): Promise<void> => {
    const list = storageService.getStaff();
    saveToStorage(STORAGE_KEYS.STAFF, list.filter((s) => s.id !== id));
    return cloudDbService.deleteDocument('staff', id);
  },

  // Attendance
  getAttendance: (): AttendanceRecord[] => {
    const list = loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_ATTENDANCE;
  },

  saveAttendance: (att: AttendanceRecord): void => {
    const list = storageService.getAttendance();
    const idx = list.findIndex((a) => a.id === att.id);
    let updated: AttendanceRecord[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = att;
    } else {
      updated = [att, ...list];
    }
    saveToStorage(STORAGE_KEYS.ATTENDANCE, updated);
    cloudDbService.saveDocument('attendance', att).catch((err) => {
      console.warn('[Cloud Sync] Attendance push note:', err);
    });
  },

  // Petty Cash Expenses
  getPettyCash: (): PettyCashExpense[] => {
    const list = loadFromStorage<PettyCashExpense[]>(STORAGE_KEYS.PETTY_CASH, INITIAL_PETTY_CASH);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_PETTY_CASH;
  },

  savePettyCash: (exp: PettyCashExpense): void => {
    const list = storageService.getPettyCash();
    const idx = list.findIndex((e) => e.id === exp.id);
    let updated: PettyCashExpense[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = exp;
    } else {
      updated = [exp, ...list];
    }
    saveToStorage(STORAGE_KEYS.PETTY_CASH, updated);
    saveToStorage(STORAGE_KEYS.EXPENSES, updated);
    cloudDbService.saveDocument('pettyCash', exp).catch((err) => {
      console.warn('[Cloud Sync] PettyCash push note:', err);
    });
  },

  deletePettyCash: async (id: string): Promise<void> => {
    const list = storageService.getPettyCash();
    const filtered = list.filter((e) => e.id !== id);
    saveToStorage(STORAGE_KEYS.PETTY_CASH, filtered);
    saveToStorage(STORAGE_KEYS.EXPENSES, filtered);
    return cloudDbService.deleteDocument('pettyCash', id);
  },

  getPettyCashExpenses: (): PettyCashExpense[] => storageService.getPettyCash(),
  savePettyCashExpense: (exp: PettyCashExpense) => storageService.savePettyCash(exp),
  deletePettyCashExpense: (id: string) => storageService.deletePettyCash(id),

  // Car Expenses
  getCarExpenses: (): CarExpense[] => {
    const list = loadFromStorage<CarExpense[]>(STORAGE_KEYS.CAR_EXPENSES, INITIAL_CAR_EXPENSES);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_CAR_EXPENSES;
  },

  saveCarExpense: (exp: CarExpense): void => {
    const list = storageService.getCarExpenses();
    const idx = list.findIndex((e) => e.id === exp.id);
    let updated: CarExpense[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = exp;
    } else {
      updated = [exp, ...list];
    }
    saveToStorage(STORAGE_KEYS.CAR_EXPENSES, updated);
    cloudDbService.saveDocument('carExpenses', exp).catch((err) => {
      console.warn('[Cloud Sync] CarExpense push note:', err);
    });
  },

  deleteCarExpense: async (id: string): Promise<void> => {
    const list = storageService.getCarExpenses();
    saveToStorage(STORAGE_KEYS.CAR_EXPENSES, list.filter((e) => e.id !== id));
    return cloudDbService.deleteDocument('carExpenses', id);
  },

  // Dokan Payments
  getDokanPayments: (): DokanPayment[] => {
    const list = loadFromStorage<DokanPayment[]>(STORAGE_KEYS.DOKAN_PAYMENTS, INITIAL_DOKAN_PAYMENTS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_DOKAN_PAYMENTS;
  },

  saveDokanPayment: (payment: DokanPayment): void => {
    const list = storageService.getDokanPayments();
    const idx = list.findIndex((p) => p.id === payment.id);
    let updated: DokanPayment[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = payment;
    } else {
      updated = [payment, ...list];
    }
    saveToStorage(STORAGE_KEYS.DOKAN_PAYMENTS, updated);
    cloudDbService.saveDocument('dokanPayments', payment).catch((err) => {
      console.warn('[Cloud Sync] DokanPayment push note:', err);
    });
  },

  deleteDokanPayment: async (id: string): Promise<void> => {
    const list = storageService.getDokanPayments();
    saveToStorage(STORAGE_KEYS.DOKAN_PAYMENTS, list.filter((p) => p.id !== id));
    return cloudDbService.deleteDocument('dokanPayments', id);
  },

  // Salary Status
  getSalaryPayments: (): Record<string, 'Paid' | 'Unpaid'> => loadFromStorage<Record<string, 'Paid' | 'Unpaid'>>(STORAGE_KEYS.SALARY_PAYMENTS, {}),
  getStaffPaymentStatus: (month: string, staffId: string): 'Paid' | 'Unpaid' => {
    const payments = storageService.getSalaryPayments();
    return payments[`${month}_${staffId}`] || 'Unpaid';
  },
  setStaffPaymentStatus: (month: string, staffId: string, status: 'Paid' | 'Unpaid'): void => {
    const payments = storageService.getSalaryPayments();
    const key = `${month}_${staffId}`;
    payments[key] = status;
    saveToStorage(STORAGE_KEYS.SALARY_PAYMENTS, payments);
    cloudDbService.saveDocument('salaryPayments', { id: key, staffId, month, status }).catch(() => {});
  },

  // Worker Tasks
  getWorkerTasks: (): WorkerTaskRecord[] => {
    const list = loadFromStorage<WorkerTaskRecord[]>(STORAGE_KEYS.WORKER_TASKS, INITIAL_WORKER_TASKS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_WORKER_TASKS;
  },

  saveWorkerTask: (task: WorkerTaskRecord): void => {
    const list = storageService.getWorkerTasks();
    const idx = list.findIndex((t) => t.id === task.id);
    let updated: WorkerTaskRecord[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = task;
    } else {
      updated = [task, ...list];
    }
    saveToStorage(STORAGE_KEYS.WORKER_TASKS, updated);
    cloudDbService.saveDocument('workerTasks', task).catch(() => {});
  },

  deleteWorkerTask: async (id: string): Promise<void> => {
    const list = storageService.getWorkerTasks();
    saveToStorage(STORAGE_KEYS.WORKER_TASKS, list.filter((t) => t.id !== id));
    return cloudDbService.deleteDocument('workerTasks', id);
  },

  getWorkerDamagePenaltyForMonth: (workerId: string, monthStr: string): number => {
    const tasks = storageService.getWorkerTasks();
    let totalPenalty = 0;
    tasks.forEach((t) => {
      if (t.workerId === workerId && t.date && t.date.startsWith(monthStr)) {
        t.damages?.forEach((d) => { totalPenalty += Number(d.penaltyAmount) || 0; });
      }
    });
    return totalPenalty;
  },

  // Supervisor Samples
  getSupervisorSamples: (): SupervisorSampleRecord[] => {
    const list = loadFromStorage<SupervisorSampleRecord[]>(STORAGE_KEYS.SUPERVISOR_SAMPLES, INITIAL_SUPERVISOR_SAMPLES);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_SUPERVISOR_SAMPLES;
  },

  saveSupervisorSample: (sample: SupervisorSampleRecord): void => {
    const list = storageService.getSupervisorSamples();
    const idx = list.findIndex((s) => s.id === sample.id);
    let updated: SupervisorSampleRecord[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = sample;
    } else {
      updated = [sample, ...list];
    }
    saveToStorage(STORAGE_KEYS.SUPERVISOR_SAMPLES, updated);
    cloudDbService.saveDocument('supervisorSamples', sample).catch(() => {});
  },

  deleteSupervisorSample: async (id: string): Promise<void> => {
    const list = storageService.getSupervisorSamples();
    saveToStorage(STORAGE_KEYS.SUPERVISOR_SAMPLES, list.filter((s) => s.id !== id));
    return cloudDbService.deleteDocument('supervisorSamples', id);
  },

  // Punch Requests
  getPunchRequests: (): PunchLeaveRequest[] => {
    const list = loadFromStorage<PunchLeaveRequest[]>(STORAGE_KEYS.PUNCH_REQUESTS, INITIAL_PUNCH_REQUESTS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_PUNCH_REQUESTS;
  },

  savePunchRequest: (req: PunchLeaveRequest): void => {
    const list = storageService.getPunchRequests();
    const idx = list.findIndex((r) => r.id === req.id);
    let updated: PunchLeaveRequest[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = req;
    } else {
      updated = [req, ...list];
    }
    saveToStorage(STORAGE_KEYS.PUNCH_REQUESTS, updated);
    cloudDbService.saveDocument('punchRequests', req).catch(() => {});
  },

  deletePunchRequest: async (id: string): Promise<void> => {
    const list = storageService.getPunchRequests();
    saveToStorage(STORAGE_KEYS.PUNCH_REQUESTS, list.filter((r) => r.id !== id));
    return cloudDbService.deleteDocument('punchRequests', id);
  },

  // Branch Consignments (শাখা অফিসে পণ্য প্রেরণের চালান)
  getBranchConsignments: (): BranchConsignment[] => {
    const list = loadFromStorage<BranchConsignment[]>(STORAGE_KEYS.BRANCH_CONSIGNMENTS, INITIAL_BRANCH_CONSIGNMENTS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_BRANCH_CONSIGNMENTS;
  },

  saveBranchConsignment: (item: BranchConsignment): void => {
    const list = storageService.getBranchConsignments();
    const idx = list.findIndex((c) => c.id === item.id);
    let updated: BranchConsignment[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    saveToStorage(STORAGE_KEYS.BRANCH_CONSIGNMENTS, updated);
    cloudDbService.saveDocument('branchConsignments', item).catch((err) => {
      console.warn('[Cloud Sync] Branch Consignment push error:', err);
    });
  },

  deleteBranchConsignment: async (id: string): Promise<void> => {
    const list = storageService.getBranchConsignments();
    saveToStorage(STORAGE_KEYS.BRANCH_CONSIGNMENTS, list.filter((c) => c.id !== id));
    return cloudDbService.deleteDocument('branchConsignments', id);
  },

  // Branch RMB Remittances (শাখা অফিস থেকে প্রেরিত RMB প্রাপ্তি)
  getBranchRemittances: (): BranchRmbRemittance[] => {
    const list = loadFromStorage<BranchRmbRemittance[]>(STORAGE_KEYS.BRANCH_REMITTANCES, INITIAL_BRANCH_REMITTANCES);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_BRANCH_REMITTANCES;
  },

  saveBranchRemittance: (item: BranchRmbRemittance): void => {
    const list = storageService.getBranchRemittances();
    const idx = list.findIndex((r) => r.id === item.id);
    let updated: BranchRmbRemittance[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    saveToStorage(STORAGE_KEYS.BRANCH_REMITTANCES, updated);
    cloudDbService.saveDocument('branchRemittances', item).catch((err) => {
      console.warn('[Cloud Sync] Branch Remittance push error:', err);
    });
  },

  deleteBranchRemittance: async (id: string): Promise<void> => {
    const list = storageService.getBranchRemittances();
    saveToStorage(STORAGE_KEYS.BRANCH_REMITTANCES, list.filter((r) => r.id !== id));
    return cloudDbService.deleteDocument('branchRemittances', id);
  },

  // 3rd Party RMB to BDT Currency Conversions (থার্ড-পার্টি আরএমবি টু বিডিটি কনভার্শন)
  getRmbConversions: (): ThirdPartyRmbConversion[] => {
    const list = loadFromStorage<ThirdPartyRmbConversion[]>(STORAGE_KEYS.RMB_CONVERSIONS, INITIAL_RMB_CONVERSIONS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_RMB_CONVERSIONS;
  },

  saveRmbConversion: (item: ThirdPartyRmbConversion): void => {
    const list = storageService.getRmbConversions();
    const idx = list.findIndex((c) => c.id === item.id);
    let updated: ThirdPartyRmbConversion[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    saveToStorage(STORAGE_KEYS.RMB_CONVERSIONS, updated);
    cloudDbService.saveDocument('rmbConversions', item).catch((err) => {
      console.warn('[Cloud Sync] RMB Conversion push error:', err);
    });
  },

  deleteRmbConversion: async (id: string): Promise<void> => {
    const list = storageService.getRmbConversions();
    saveToStorage(STORAGE_KEYS.RMB_CONVERSIONS, list.filter((c) => c.id !== id));
    return cloudDbService.deleteDocument('rmbConversions', id);
  },

  // Price Lists (দর তালিকা তৈরি - 3 pricing columns)
  getPriceLists: (): PriceList[] => {
    const list = loadFromStorage<PriceList[]>(STORAGE_KEYS.PRICE_LISTS, INITIAL_PRICE_LISTS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_PRICE_LISTS;
  },

  savePriceList: (item: PriceList): void => {
    const list = storageService.getPriceLists();
    const idx = list.findIndex((p) => p.id === item.id);
    let updated: PriceList[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    saveToStorage(STORAGE_KEYS.PRICE_LISTS, updated);
    cloudDbService.saveDocument('priceLists', item).catch((err) => {
      console.warn('[Cloud Sync] Price list push error:', err);
    });
  },

  deletePriceList: async (id: string): Promise<void> => {
    const list = storageService.getPriceLists();
    saveToStorage(STORAGE_KEYS.PRICE_LISTS, list.filter((p) => p.id !== id));
    return cloudDbService.deleteDocument('priceLists', id);
  },

  // Worker Product Conversions (ওয়ার্কার আউটপুট রূপান্তর ও এক্সট্রাকশন)
  getWorkerConversions: (): WorkerProductConversion[] => {
    const list = loadFromStorage<WorkerProductConversion[]>(STORAGE_KEYS.WORKER_CONVERSIONS, INITIAL_WORKER_CONVERSIONS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_WORKER_CONVERSIONS;
  },

  saveWorkerConversion: (item: WorkerProductConversion): void => {
    const list = storageService.getWorkerConversions();
    const idx = list.findIndex((c) => c.id === item.id);
    let updated: WorkerProductConversion[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    saveToStorage(STORAGE_KEYS.WORKER_CONVERSIONS, updated);
    cloudDbService.saveDocument('workerConversions', item).catch((err) => {
      console.warn('[Cloud Sync] Worker conversion push error:', err);
    });
  },

  deleteWorkerConversion: async (id: string): Promise<void> => {
    const list = storageService.getWorkerConversions();
    saveToStorage(STORAGE_KEYS.WORKER_CONVERSIONS, list.filter((c) => c.id !== id));
    return cloudDbService.deleteDocument('workerConversions', id);
  },

  // 3rd Parties Management
  getThirdParties: (): ThirdParty[] => {
    const list = loadFromStorage<ThirdParty[]>(STORAGE_KEYS.THIRD_PARTIES, INITIAL_THIRD_PARTIES);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_THIRD_PARTIES;
  },

  saveThirdParty: (item: ThirdParty): void => {
    const list = storageService.getThirdParties();
    const idx = list.findIndex((p) => p.id === item.id);
    let updated: ThirdParty[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    saveToStorage(STORAGE_KEYS.THIRD_PARTIES, updated);
    cloudDbService.saveDocument('thirdParties', item).catch((err) => {
      console.warn('[Cloud Sync] ThirdParty push error:', err);
    });
  },

  deleteThirdParty: async (id: string): Promise<void> => {
    const list = storageService.getThirdParties();
    saveToStorage(STORAGE_KEYS.THIRD_PARTIES, list.filter((p) => p.id !== id));
    return cloudDbService.deleteDocument('thirdParties', id);
  },

  // China Office Direct BDT Payments
  getChinaDirectPayments: (): ChinaDirectPayment[] => {
    const list = loadFromStorage<ChinaDirectPayment[]>(STORAGE_KEYS.CHINA_DIRECT_PAYMENTS, INITIAL_CHINA_DIRECT_PAYMENTS);
    return Array.isArray(list) ? list.filter(Boolean) : INITIAL_CHINA_DIRECT_PAYMENTS;
  },

  saveChinaDirectPayment: (item: ChinaDirectPayment): void => {
    const list = storageService.getChinaDirectPayments();
    const idx = list.findIndex((p) => p.id === item.id);
    let updated: ChinaDirectPayment[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = item;
    } else {
      updated = [item, ...list];
    }
    saveToStorage(STORAGE_KEYS.CHINA_DIRECT_PAYMENTS, updated);
    cloudDbService.saveDocument('chinaDirectPayments', item).catch((err) => {
      console.warn('[Cloud Sync] ChinaDirectPayment push error:', err);
    });
  },

  deleteChinaDirectPayment: async (id: string): Promise<void> => {
    const list = storageService.getChinaDirectPayments();
    saveToStorage(STORAGE_KEYS.CHINA_DIRECT_PAYMENTS, list.filter((p) => p.id !== id));
    return cloudDbService.deleteDocument('chinaDirectPayments', id);
  },

  // Missing Backup/Restore & Reset Methods
  exportFullBackup: (): string => {
    const backup = {
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      company: storageService.getCompanyInfo(),
      invoices: storageService.getInvoices(),
      stock: storageService.getStock(),
      parties: storageService.getParties(),
      staff: storageService.getStaff(),
      attendance: storageService.getAttendance(),
      pettyCash: storageService.getPettyCash(),
      carExpenses: storageService.getCarExpenses(),
      dokanPayments: storageService.getDokanPayments(),
      workerTasks: storageService.getWorkerTasks(),
      punchRequests: storageService.getPunchRequests(),
      branchConsignments: storageService.getBranchConsignments(),
      branchRemittances: storageService.getBranchRemittances(),
      rmbConversions: storageService.getRmbConversions(),
      priceLists: storageService.getPriceLists(),
      workerConversions: storageService.getWorkerConversions(),
      thirdParties: storageService.getThirdParties(),
      chinaDirectPayments: storageService.getChinaDirectPayments(),
    };
    return JSON.stringify(backup, null, 2);
  },

  downloadBackup: (): void => {
    const json = storageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsr-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  restoreBackup: (jsonContent: string): boolean => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.company) saveToStorage(STORAGE_KEYS.COMPANY, parsed.company);
      if (parsed.invoices) saveToStorage(STORAGE_KEYS.INVOICES, parsed.invoices);
      if (parsed.stock) saveToStorage(STORAGE_KEYS.STOCK, parsed.stock);
      if (parsed.parties) saveToStorage(STORAGE_KEYS.PARTIES, parsed.parties);
      if (parsed.staff) saveToStorage(STORAGE_KEYS.STAFF, parsed.staff);
      if (parsed.attendance) saveToStorage(STORAGE_KEYS.ATTENDANCE, parsed.attendance);
      if (parsed.pettyCash) saveToStorage(STORAGE_KEYS.PETTY_CASH, parsed.pettyCash);
      if (parsed.carExpenses) saveToStorage(STORAGE_KEYS.CAR_EXPENSES, parsed.carExpenses);
      if (parsed.dokanPayments) saveToStorage(STORAGE_KEYS.DOKAN_PAYMENTS, parsed.dokanPayments);
      if (parsed.workerTasks) saveToStorage(STORAGE_KEYS.WORKER_TASKS, parsed.workerTasks);
      if (parsed.punchRequests) saveToStorage(STORAGE_KEYS.PUNCH_REQUESTS, parsed.punchRequests);
      if (parsed.branchConsignments) saveToStorage(STORAGE_KEYS.BRANCH_CONSIGNMENTS, parsed.branchConsignments);
      if (parsed.branchRemittances) saveToStorage(STORAGE_KEYS.BRANCH_REMITTANCES, parsed.branchRemittances);
      if (parsed.rmbConversions) saveToStorage(STORAGE_KEYS.RMB_CONVERSIONS, parsed.rmbConversions);
      if (parsed.priceLists) saveToStorage(STORAGE_KEYS.PRICE_LISTS, parsed.priceLists);
      if (parsed.workerConversions) saveToStorage(STORAGE_KEYS.WORKER_CONVERSIONS, parsed.workerConversions);
      if (parsed.thirdParties) saveToStorage(STORAGE_KEYS.THIRD_PARTIES, parsed.thirdParties);
      if (parsed.chinaDirectPayments) saveToStorage(STORAGE_KEYS.CHINA_DIRECT_PAYMENTS, parsed.chinaDirectPayments);
      return true;
    } catch (e) {
      return false;
    }
  },

  restoreFromJSON: (json: string): boolean => storageService.restoreBackup(json),

  resetToFactorySeed: async (): Promise<void> => {
    await storageService.wipeAllDataClean(false); // Wipe including company but resetting to default
  },

  // Legacy
  getExpenses: (): OfficeExpense[] => storageService.getPettyCash(),
  saveExpense: (exp: OfficeExpense) => storageService.savePettyCash(exp as PettyCashExpense),
  deleteExpense: (id: string) => storageService.deletePettyCash(id),

  // Reset & Wipe
  wipeAllDataClean: async (preserveCompany: boolean = true): Promise<void> => {
    // 1. If online and authenticated, attempt to wipe cloud collections (Force Clean)
    // We do this first so listeners don't re-inject data during the local clear
    if (auth.currentUser) {
      const collectionsToWipe = [
        'invoices', 'stock', 'parties', 'staff', 'attendance', 
        'pettyCash', 'carExpenses', 'dokanPayments', 'workerTasks', 
        'punchRequests', 'supervisorSamples', 'salaryPayments',
        'branchConsignments', 'branchRemittances', 'rmbConversions',
        'priceLists', 'workerConversions', 'thirdParties', 'chinaDirectPayments'
      ];
      
      for (const colName of collectionsToWipe) {
        try {
          const snap = await getDocs(collection(db, colName));
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.forEach((docSnap) => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
          }
        } catch (err) {
          console.warn(`[Wipe] Cloud collection ${colName} wipe notice:`, err);
        }
      }
    }

    // 2. Clear Local Storage completely
    const savedCompany = preserveCompany ? localStorage.getItem(STORAGE_KEYS.COMPANY) : null;
    const savedLang = localStorage.getItem('rsr_lang_pref');
    const savedTheme = localStorage.getItem('rsr_theme_pref');
    
    localStorage.clear();
    sessionStorage.clear();
    
    // 3. Restore basic preferences and company if requested
    if (preserveCompany && savedCompany) {
      localStorage.setItem(STORAGE_KEYS.COMPANY, savedCompany);
    } else if (!preserveCompany) {
      saveToStorage(STORAGE_KEYS.COMPANY, DEFAULT_COMPANY);
    }
    
    if (savedLang) localStorage.setItem('rsr_lang_pref', savedLang);
    if (savedTheme) localStorage.setItem('rsr_theme_pref', savedTheme);

    // 4. Explicitly set empty arrays for all data keys to ensure zero state
    saveToStorage(STORAGE_KEYS.INVOICES, []);
    saveToStorage(STORAGE_KEYS.STOCK, []);
    saveToStorage(STORAGE_KEYS.PARTIES, []);
    saveToStorage(STORAGE_KEYS.STAFF, []);
    saveToStorage(STORAGE_KEYS.ATTENDANCE, []);
    saveToStorage(STORAGE_KEYS.PETTY_CASH, []);
    saveToStorage(STORAGE_KEYS.CAR_EXPENSES, []);
    saveToStorage(STORAGE_KEYS.DOKAN_PAYMENTS, []);
    saveToStorage(STORAGE_KEYS.WORKER_TASKS, []);
    saveToStorage(STORAGE_KEYS.PUNCH_REQUESTS, []);
    saveToStorage(STORAGE_KEYS.EXPENSES, []);
    saveToStorage(STORAGE_KEYS.SUPERVISOR_SAMPLES, []);
    saveToStorage(STORAGE_KEYS.SALARY_PAYMENTS, {});
    saveToStorage(STORAGE_KEYS.BRANCH_CONSIGNMENTS, []);
    saveToStorage(STORAGE_KEYS.BRANCH_REMITTANCES, []);
    saveToStorage(STORAGE_KEYS.RMB_CONVERSIONS, []);
    saveToStorage(STORAGE_KEYS.PRICE_LISTS, []);
    saveToStorage(STORAGE_KEYS.WORKER_CONVERSIONS, []);
    saveToStorage(STORAGE_KEYS.THIRD_PARTIES, []);
    saveToStorage(STORAGE_KEYS.CHINA_DIRECT_PAYMENTS, []);
  },

  resetToDefaults: async (): Promise<void> => {
    await storageService.wipeAllDataClean(true);
  },

  uploadAllToCloud: async (onProgress?: (msg: string) => void): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      if (onProgress) onProgress('কোম্পানি তথ্য সিঙ্ক হচ্ছে...');
      await cloudDbService.saveCompany(storageService.getCompanyInfo());
      let total = 1;
      const collections = [
        { key: 'invoices', data: storageService.getInvoices() },
        { key: 'stock', data: storageService.getStock() },
        { key: 'parties', data: storageService.getParties() },
        { key: 'staff', data: storageService.getStaff() },
        { key: 'attendance', data: storageService.getAttendance() },
        { key: 'pettyCash', data: storageService.getPettyCash() },
        { key: 'carExpenses', data: storageService.getCarExpenses() },
        { key: 'dokanPayments', data: storageService.getDokanPayments() },
        { key: 'workerTasks', data: storageService.getWorkerTasks() },
        { key: 'punchRequests', data: storageService.getPunchRequests() },
        { key: 'branchConsignments', data: storageService.getBranchConsignments() },
        { key: 'branchRemittances', data: storageService.getBranchRemittances() },
        { key: 'rmbConversions', data: storageService.getRmbConversions() },
        { key: 'priceLists', data: storageService.getPriceLists() },
        { key: 'workerConversions', data: storageService.getWorkerConversions() },
        { key: 'thirdParties', data: storageService.getThirdParties() },
        { key: 'chinaDirectPayments', data: storageService.getChinaDirectPayments() },
      ];
      for (const col of collections) {
        if (onProgress) onProgress(`${col.key} সিঙ্ক হচ্ছে...`);
        for (const item of col.data) {
          await cloudDbService.saveDocument(col.key, item);
          total++;
        }
      }
      return { success: true, count: total };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  },

  downloadAllFromCloud: async (onProgress?: (msg: string) => void): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const mappings = [
        { col: 'invoices', key: STORAGE_KEYS.INVOICES },
        { col: 'stock', key: STORAGE_KEYS.STOCK },
        { col: 'parties', key: STORAGE_KEYS.PARTIES },
        { col: 'staff', key: STORAGE_KEYS.STAFF },
        { col: 'attendance', key: STORAGE_KEYS.ATTENDANCE },
        { col: 'pettyCash', key: STORAGE_KEYS.PETTY_CASH },
        { col: 'carExpenses', key: STORAGE_KEYS.CAR_EXPENSES },
        { col: 'dokanPayments', key: STORAGE_KEYS.DOKAN_PAYMENTS },
        { col: 'workerTasks', key: STORAGE_KEYS.WORKER_TASKS },
        { col: 'punchRequests', key: STORAGE_KEYS.PUNCH_REQUESTS },
        { col: 'branchConsignments', key: STORAGE_KEYS.BRANCH_CONSIGNMENTS },
        { col: 'branchRemittances', key: STORAGE_KEYS.BRANCH_REMITTANCES },
        { col: 'rmbConversions', key: STORAGE_KEYS.RMB_CONVERSIONS },
        { col: 'priceLists', key: STORAGE_KEYS.PRICE_LISTS },
        { col: 'workerConversions', key: STORAGE_KEYS.WORKER_CONVERSIONS },
        { col: 'thirdParties', key: STORAGE_KEYS.THIRD_PARTIES },
        { col: 'chinaDirectPayments', key: STORAGE_KEYS.CHINA_DIRECT_PAYMENTS },
      ];
      let total = 0;
      for (const m of mappings) {
        if (onProgress) onProgress(`${m.col} নামানো হচ্ছে...`);
        const snap = await getDocs(collection(db, m.col));
        if (!snap.empty) {
          const list: any[] = [];
          snap.forEach((d) => list.push(d.data()));
          saveToStorage(m.key, list);
          total += snap.size;
        }
      }
      return { success: true, count: total };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  },
};
