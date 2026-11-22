import { CompanyAddresses } from './CompanyAddresses';
import React, { useState, useMemo } from 'react';
import {
  Globe,
  ArrowRightLeft,
  PlusCircle,
  Search,
  Printer,
  Trash2,
  Calendar,
  Layers,
  Banknote,
  Send,
  Building,
  CheckCircle,
  Clock,
  Coins,
  Receipt,
  FileSpreadsheet,
  X,
  CreditCard,
  Edit,
  Edit2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  Download,
  Users,
} from 'lucide-react';
import {
  Language,
  CompanyInfo,
  BranchConsignment,
  BranchConsignmentItem,
  BranchRmbRemittance,
  ThirdPartyRmbConversion,
  ConsignmentStatus,
  SettlementStatus,
  ThirdParty,
  ChinaDirectPayment,
} from '../types';
import { formatCurrency, formatNumber, formatDate, formatSheetNumber } from '../lib/translations';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { WeChatShareDropdown } from './WeChatShareDropdown';
import { CompanyLogo } from './CompanyLogo';
import { executePrint, exportElementToPdf } from '../lib/printUtils';
import { storageService } from '../lib/storage';
import { computeChinaOfficeSummary } from '../lib/rollover';
import { BranchOfficeLedger } from './BranchOfficeLedger';

interface BranchOfficePanelProps {
  consignments: BranchConsignment[];
  remittances: BranchRmbRemittance[];
  conversions: ThirdPartyRmbConversion[];
  thirdParties?: ThirdParty[];
  chinaDirectPayments?: ChinaDirectPayment[];
  companyInfo: CompanyInfo;
  lang: Language;
  onSaveConsignment: (item: BranchConsignment) => void;
  onDeleteConsignment: (id: string) => void;
  onSaveRemittance: (item: BranchRmbRemittance) => void;
  onDeleteRemittance: (id: string) => void;
  onSaveConversion: (item: ThirdPartyRmbConversion) => void;
  onDeleteConversion: (id: string) => void;
  onSaveThirdParty?: (item: ThirdParty) => void;
  onDeleteThirdParty?: (id: string) => void;
  onSaveChinaDirectPayment?: (item: ChinaDirectPayment) => void;
  onDeleteChinaDirectPayment?: (id: string) => void;
  isSuperAdmin?: boolean;
}

export const BranchOfficePanel: React.FC<BranchOfficePanelProps> = ({
  consignments,
  remittances,
  conversions,
  thirdParties = [],
  chinaDirectPayments = [],
  companyInfo,
  lang,
  onSaveConsignment,
  onDeleteConsignment,
  onSaveRemittance,
  onDeleteRemittance,
  onSaveConversion,
  onDeleteConversion,
  onSaveThirdParty,
  onDeleteThirdParty,
  onSaveChinaDirectPayment,
  onDeleteChinaDirectPayment,
  isSuperAdmin = true,
}) => {
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'consignments' | 'remittances' | 'conversions' | 'third_parties' | 'china_direct_payments'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isConsignmentModalOpen, setIsConsignmentModalOpen] = useState(false);
  const [isRemittanceModalOpen, setIsRemittanceModalOpen] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isThirdPartyModalOpen, setIsThirdPartyModalOpen] = useState(false);
  const [isChinaPaymentModalOpen, setIsChinaPaymentModalOpen] = useState(false);

  const [selectedConversion, setSelectedConversion] = useState<ThirdPartyRmbConversion | null>(null);
  const [printingConsignment, setPrintingConsignment] = useState<BranchConsignment | null>(null);
  const [isBranchStatementModalOpen, setIsBranchStatementModalOpen] = useState(false);
  const [statementType, setStatementType] = useState<'third_party' | 'consignments' | 'remittances' | 'combined'>('third_party');
  const [statementPartyFilter, setStatementPartyFilter] = useState<string>('all');
  const [statementBranchFilter, setStatementBranchFilter] = useState<string>('all');

  // Month & Date Filter States (User Requirement)
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const [filterPeriodMode, setFilterPeriodMode] = useState<'all' | 'today' | 'month' | 'date'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [statementPeriodMode, setStatementPeriodMode] = useState<'month' | 'today' | 'all'>('month');
  const [statementMonth, setStatementMonth] = useState<string>(currentMonthStr);
  const [isStatementPdfExporting, setIsStatementPdfExporting] = useState(false);
  const [conversionPartyFilter, setConversionPartyFilter] = useState<string>('all');
  const [conversionSearch, setConversionSearch] = useState<string>('');
  const [showChinaBdtHistory, setShowChinaBdtHistory] = useState(false);

  // Full Edit States across all modules
  const [editingConsignment, setEditingConsignment] = useState<BranchConsignment | null>(null);
  const [editingRemittance, setEditingRemittance] = useState<BranchRmbRemittance | null>(null);
  const [editingConversion, setEditingConversion] = useState<ThirdPartyRmbConversion | null>(null);
  const [editingThirdParty, setEditingThirdParty] = useState<ThirdParty | null>(null);
  const [editingChinaPayment, setEditingChinaPayment] = useState<ChinaDirectPayment | null>(null);

  // Third Party Form State
  const [tpName, setTpName] = useState('');
  const [tpContactPerson, setTpContactPerson] = useState('');
  const [tpPhone, setTpPhone] = useState('');
  const [tpEmail, setTpEmail] = useState('');
  const [tpCity, setTpCity] = useState('');
  const [tpAddress, setTpAddress] = useState('');
  const [tpNotes, setTpNotes] = useState('');
  const [tpOpeningBalance, setTpOpeningBalance] = useState<number>(0);

  // China Direct Payment Form State
  const [cdpDate, setCdpDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [cdpRefNo, setCdpRefNo] = useState(() => `CDP-${Date.now().toString().slice(-4)}`);
  const [cdpBranchName, setCdpBranchName] = useState('চীন/গুয়াংজু শাখা অফিস');
  const [cdpAmountBdt, setCdpAmountBdt] = useState<number>(0);
  const [cdpPaymentMethod, setCdpPaymentMethod] = useState<'bank' | 'bank_transfer' | 'cash' | 'bKash' | 'nagad' | 'other'>('bank_transfer');
  const [cdpBankDetails, setCdpBankDetails] = useState('');
  const [cdpNotes, setCdpNotes] = useState('');

  // Sequential Auto-Increment Number Generators
  const getNextConsignmentNo = () => {
    const currentYear = new Date().getFullYear();
    let maxNum = 0;
    consignments.forEach((c) => {
      const match = c.consignmentNo?.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `BC-${currentYear}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const getNextRemittanceNo = () => {
    let maxNum = 0;
    remittances.forEach((r) => {
      const match = r.referenceNo?.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `REM-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const getNextConversionNo = () => {
    let maxNum = 0;
    conversions.forEach((cv) => {
      const match = cv.voucherNo?.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `CNV-${String(maxNum + 1).padStart(4, '0')}`;
  };

  // Consignment Form State
  const [formConsignmentNo, setFormConsignmentNo] = useState(() => getNextConsignmentNo());
  const [formDate, setFormDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [formBranchName, setFormBranchName] = useState('চীন/গুয়াংজু শাখা অফিস');
  const [formDestinationCity, setFormDestinationCity] = useState('Guangzhou');
  const [formShippingMethod, setFormShippingMethod] = useState<'Air Cargo' | 'Sea Cargo' | 'Hand Carry' | 'Courier' | 'Other'>('Air Cargo');
  const [formTrackingNo, setFormTrackingNo] = useState('');
  const [formCarrierName, setFormCarrierName] = useState('');
  const [formShippingCost, setFormShippingCost] = useState<number>(0);
  const [formConsignmentNotes, setFormConsignmentNotes] = useState('');
  const [formItems, setFormItems] = useState<BranchConsignmentItem[]>([
    {
      id: 'item-1',
      name: '',
      quantity: 1,
      unit: 'pcs',
      unitCostBdt: 0,
      totalCostBdt: 0,
      estimatedRmbRate: 0,
      estimatedRmbTotal: 0,
    },
  ]);

  // Remittance Form State
  const [remitDate, setRemitDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [remitRefNo, setRemitRefNo] = useState(() => getNextRemittanceNo());
  const [remitBranchName, setRemitBranchName] = useState('চীন/গুয়াংজু শাখা অফিস');
  const [remitAmount, setRemitAmount] = useState<number>(0);
  const [remitVia, setRemitVia] = useState<'WeChat Pay' | 'Alipay' | 'Chinese Bank' | 'Cash' | 'Other'>('WeChat Pay');
  const [remitAccount, setRemitAccount] = useState('');
  const [remitNotes, setRemitNotes] = useState('');

  // Conversion Form State
  const [convDate, setConvDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [convVoucherNo, setConvVoucherNo] = useState(() => getNextConversionNo());
  const [convPartyName, setConvPartyName] = useState('');
  const [convPartyPhone, setConvPartyPhone] = useState('');
  const [convRmbAmount, setConvRmbAmount] = useState<number>(0);
  const [convRate, setConvRate] = useState<number>(16.85);
  const [convReceivedBdt, setConvReceivedBdt] = useState<number>(0);
  const [convPaymentMethod, setConvPaymentMethod] = useState<'bank_transfer' | 'cash' | 'bKash' | 'nagad' | 'multiple'>('bank_transfer');
  const [convBankDetails, setConvBankDetails] = useState('');
  const [convNotes, setConvNotes] = useState('');

  // Open Consignment Modals (Create vs Edit)
  const openNewConsignmentModal = () => {
    setEditingConsignment(null);
    setFormConsignmentNo(getNextConsignmentNo());
    setFormDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setFormBranchName('চীন/গুয়াংজু শাখা অফিস');
    setFormDestinationCity('Guangzhou');
    setFormShippingMethod('Air Cargo');
    setFormTrackingNo('');
    setFormCarrierName('');
    setFormShippingCost(0);
    setFormConsignmentNotes('');
    setFormItems([
      {
        id: `item-${Date.now()}`,
        name: '',
        quantity: 100,
        unit: 'pcs',
        unitCostBdt: 0,
        totalCostBdt: 0,
        estimatedRmbRate: 0,
        estimatedRmbTotal: 0,
      },
    ]);
    setIsConsignmentModalOpen(true);
  };

  const openEditConsignmentModal = (c: BranchConsignment) => {
    setEditingConsignment(c);
    setFormConsignmentNo(c.consignmentNo);
    setFormDate(c.date);
    setFormBranchName(c.branchName);
    setFormDestinationCity(c.destinationCity || 'Guangzhou');
    setFormShippingMethod(c.shippingMethod);
    setFormTrackingNo(c.trackingNo || '');
    setFormCarrierName(c.carrierName || '');
    setFormShippingCost(c.shippingCostBdt || 0);
    setFormConsignmentNotes(c.notes || '');
    setFormItems(
      c.items && c.items.length > 0
        ? [...c.items]
        : [
            {
              id: `item-${Date.now()}`,
              name: '',
              quantity: 1,
              unit: 'pcs',
              unitCostBdt: 0,
              totalCostBdt: 0,
              estimatedRmbRate: 0,
              estimatedRmbTotal: 0,
            },
          ]
    );
    setIsConsignmentModalOpen(true);
  };

  // Open Remittance Modals (Create vs Edit)
  const openNewRemittanceModal = () => {
    setEditingRemittance(null);
    setRemitDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setRemitRefNo(getNextRemittanceNo());
    setRemitBranchName('চীন/গুয়াংজু শাখা অফিস');
    setRemitAmount(0);
    setRemitVia('WeChat Pay');
    setRemitAccount('');
    setRemitNotes('');
    setIsRemittanceModalOpen(true);
  };

  const openEditRemittanceModal = (r: BranchRmbRemittance) => {
    setEditingRemittance(r);
    setRemitDate(r.date);
    setRemitRefNo(r.referenceNo);
    setRemitBranchName(r.branchName);
    setRemitAmount(r.rmbAmount);
    setRemitVia(r.receivedVia);
    setRemitAccount(r.accountDetails || '');
    setRemitNotes(r.notes || '');
    setIsRemittanceModalOpen(true);
  };

  // Open Conversion Modals (Create vs Edit)
  const openNewConversionModal = () => {
    setEditingConversion(null);
    setConvDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setConvVoucherNo(getNextConversionNo());
    setConvPartyName('');
    setConvPartyPhone('');
    setConvRmbAmount(0);
    setConvRate(16.85);
    setConvReceivedBdt(0);
    setConvPaymentMethod('bank_transfer');
    setConvBankDetails('');
    setConvNotes('');
    setIsConversionModalOpen(true);
  };

  const openEditConversionModal = (cv: ThirdPartyRmbConversion) => {
    setEditingConversion(cv);
    setConvDate(cv.date);
    setConvVoucherNo(cv.voucherNo);
    setConvPartyName(cv.partyName);
    setConvPartyPhone(cv.partyPhone || '');
    setConvRmbAmount(cv.rmbAmountGiven);
    setConvRate(cv.exchangeRate);
    setConvReceivedBdt(cv.receivedBdtAmount);
    setConvPaymentMethod(cv.paymentMethod);
    setConvBankDetails(cv.bankAccountDetails || '');
    setConvNotes(cv.notes || '');
    setIsConversionModalOpen(true);
  };

  // Third Party Handlers (Requirement 1)
  const openNewThirdPartyModal = () => {
    setEditingThirdParty(null);
    setTpName('');
    setTpContactPerson('');
    setTpPhone('');
    setTpEmail('');
    setTpCity('');
    setTpAddress('');
    setTpNotes('');
    setTpOpeningBalance(0);
    setIsThirdPartyModalOpen(true);
  };

  const openEditThirdPartyModal = (tp: ThirdParty) => {
    setEditingThirdParty(tp);
    setTpName(tp.name);
    setTpContactPerson(tp.contactPerson || '');
    setTpPhone(tp.phone || '');
    setTpEmail(tp.email || '');
    setTpCity(tp.city || '');
    setTpAddress(tp.address || '');
    setTpNotes(tp.notes || '');
    setTpOpeningBalance(tp.openingBalance || 0);
    setIsThirdPartyModalOpen(true);
  };

  const handleThirdPartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpName.trim()) return;
    const now = new Date().toISOString();
    const item: ThirdParty = {
      id: editingThirdParty ? editingThirdParty.id : `tp-${Date.now()}`,
      name: tpName.trim(),
      contactPerson: tpContactPerson.trim(),
      phone: tpPhone.trim(),
      email: tpEmail.trim(),
      city: tpCity.trim(),
      address: tpAddress.trim(),
      openingBalance: Number(tpOpeningBalance) || 0,
      notes: tpNotes.trim(),
      status: 'active',
      createdAt: editingThirdParty ? editingThirdParty.createdAt : now,
      updatedAt: now,
    };
    if (onSaveThirdParty) {
      onSaveThirdParty(item);
    } else {
      storageService.saveThirdParty(item);
    }
    setConvPartyName(item.name);
    if (item.phone) setConvPartyPhone(item.phone);
    setIsThirdPartyModalOpen(false);
  };

  const handleDeleteThirdPartyConfirm = (id: string) => {
    if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই ৩য়-পক্ষ এক্সচেঞ্জার মুছে ফেলতে চান?' : 'Are you sure you want to remove this 3rd party?')) {
      if (onDeleteThirdParty) {
        onDeleteThirdParty(id);
      } else {
        storageService.deleteThirdParty(id);
      }
    }
  };

  // China Direct Payment Handlers (Requirement 2)
  const openNewChinaDirectPaymentModal = () => {
    setEditingChinaPayment(null);
    setCdpDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setCdpRefNo(`CDP-${Date.now().toString().slice(-4)}`);
    setCdpBranchName('চীন/গুয়াংজু শাখা অফিস');
    setCdpAmountBdt(0);
    setCdpPaymentMethod('bank_transfer');
    setCdpBankDetails('');
    setCdpNotes('');
    setIsChinaPaymentModalOpen(true);
  };

  const openEditChinaDirectPaymentModal = (cdp: ChinaDirectPayment) => {
    setEditingChinaPayment(cdp);
    setCdpDate(cdp.date);
    setCdpRefNo(cdp.referenceNo);
    setCdpBranchName(cdp.branchName);
    setCdpAmountBdt(cdp.amountBdt);
    setCdpPaymentMethod(cdp.paymentMethod);
    setCdpBankDetails(cdp.bankAccountDetails || '');
    setCdpNotes(cdp.notes || '');
    setIsChinaPaymentModalOpen(true);
  };

  const handleChinaDirectPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cdpAmountBdt <= 0) return;
    const now = new Date().toISOString();
    const item: ChinaDirectPayment = {
      id: editingChinaPayment ? editingChinaPayment.id : `cdp-${Date.now()}`,
      date: cdpDate,
      referenceNo: cdpRefNo || `CDP-${Date.now().toString().slice(-4)}`,
      branchName: cdpBranchName || 'চীন/গুয়াংজু শাখা অফিস',
      amountBdt: cdpAmountBdt,
      paymentMethod: cdpPaymentMethod,
      bankAccountDetails: cdpBankDetails.trim(),
      notes: cdpNotes.trim(),
      createdAt: editingChinaPayment ? editingChinaPayment.createdAt : now,
      updatedAt: now,
    };
    if (onSaveChinaDirectPayment) {
      onSaveChinaDirectPayment(item);
    } else {
      storageService.saveChinaDirectPayment(item);
    }
    setIsChinaPaymentModalOpen(false);
  };

  const handleDeleteChinaPaymentConfirm = (id: string) => {
    if (confirm(lang === 'bn' ? 'চীন অফিসের এই সরাসরি BDT পেমেন্ট মুছে ফেলতে চান?' : 'Delete this China direct payment?')) {
      if (onDeleteChinaDirectPayment) {
        onDeleteChinaDirectPayment(id);
      } else {
        storageService.deleteChinaDirectPayment(id);
      }
    }
  };

  // Installment Payment Modal State
  const [payDate, setPayDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [payAmountBdt, setPayAmountBdt] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'cash' | 'bKash' | 'nagad'>('bank_transfer');
  const [payAccount, setPayAccount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const handlePrevStatementMonth = () => {
    const [y, m] = statementMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setStatementMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextStatementMonth = () => {
    const [y, m] = statementMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setStatementMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  // Normalise any stored date (ISO, ISO with time, DD/MM/YYYY, DD-MM-YYYY) to YYYY-MM-DD
  const normalizeDate = (raw: any): string => {
    if (!raw) return '';
    const str = String(raw).trim();
    const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    const dmy = str.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    const d = new Date(str);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };

  const isDateInWindow = (
    rawDate: any,
    mode: 'all' | 'today' | 'month' | 'date',
    monthStr: string,
    dateVal: string
  ) => {
    if (mode === 'all') return true;
    const dateStr = normalizeDate(rawDate);
    if (!dateStr) return false;
    if (mode === 'today') return dateStr === todayStr;
    if (mode === 'date') return dateStr === dateVal;
    if (mode === 'month') return dateStr.startsWith(monthStr);
    return true;
  };

  const formatPeriodTitle = (
    mode: 'all' | 'today' | 'month' | 'date',
    monthStr: string,
    dateVal: string
  ) => {
    if (mode === 'all') return lang === 'bn' ? 'সকল সময় (All Time)' : 'All Time';
    if (mode === 'today') return lang === 'bn' ? `আজকের (${todayStr})` : `Today (${todayStr})`;
    if (mode === 'date') return lang === 'bn' ? `তারিখ: ${dateVal}` : `Date: ${dateVal}`;
    const [y, m] = (monthStr || currentMonthStr).split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      const label = new Date(y, m - 1, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'long',
        year: 'numeric',
      });
      return `${label} (${monthStr})`;
    }
    return monthStr;
  };

  const sortByDateDesc = <T extends { date?: string; createdAt?: string; id?: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => {
      const da = normalizeDate(a.date || a.createdAt);
      const db = normalizeDate(b.date || b.createdAt);
      if (db !== da) return db.localeCompare(da);
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  const sortByDateAsc = <T extends { date?: string; createdAt?: string; id?: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => {
      const da = normalizeDate(a.date || a.createdAt);
      const db = normalizeDate(b.date || b.createdAt);
      if (da !== db) return da.localeCompare(db);
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

  const isDateInFilter = (rawDate: any) =>
    isDateInWindow(rawDate, filterPeriodMode, selectedMonth, selectedDate);

  const filteredConsignments = useMemo(() => {
    return sortByDateDesc(consignments.filter((c) => isDateInFilter(c.date || (c as any).createdAt)));
  }, [consignments, filterPeriodMode, selectedMonth, selectedDate, todayStr]);

  const filteredRemittances = useMemo(() => {
    return sortByDateDesc(remittances.filter((r) => isDateInFilter(r.date || (r as any).createdAt)));
  }, [remittances, filterPeriodMode, selectedMonth, selectedDate, todayStr]);

  const filteredConversions = useMemo(() => {
    return sortByDateDesc(conversions.filter((cv) => isDateInFilter(cv.date || (cv as any).createdAt)));
  }, [conversions, filterPeriodMode, selectedMonth, selectedDate, todayStr]);

  const filteredChinaDirectPayments = useMemo(() => {
    return sortByDateDesc(chinaDirectPayments.filter((p) => isDateInFilter(p.date || (p as any).createdAt)));
  }, [chinaDirectPayments, filterPeriodMode, selectedMonth, selectedDate, todayStr]);

  // Unique lists for party-wise & branch-wise filtering (Requirement 3)
  const uniqueThirdPartiesList = useMemo(() => {
    const set = new Set<string>();
    thirdParties.forEach((p) => { if (p.name) set.add(p.name); });
    conversions.forEach((cv) => {
      const name = cv.partyName || (cv as any).thirdPartyName;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [thirdParties, conversions]);

  const uniqueBranchesList = useMemo(() => {
    const set = new Set<string>();
    consignments.forEach((c) => { if (c.branchName) set.add(c.branchName); });
    remittances.forEach((r) => { if (r.branchName) set.add(r.branchName); });
    chinaDirectPayments.forEach((p) => { if (p.branchName) set.add(p.branchName); });
    if (set.size === 0) set.add('চীন/গুয়াংজু শাখা অফিস');
    return Array.from(set);
  }, [consignments, remittances, chinaDirectPayments]);

  const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

  const getPeriodStart = (mode: 'all' | 'today' | 'month' | 'date', monthStr: string, dateVal: string): string => {
    if (mode === 'today') return todayStr;
    if (mode === 'date') return dateVal || '';
    if (mode === 'month' && monthStr) return `${monthStr}-01`;
    return '';
  };

  const getPeriodEnd = (mode: 'all' | 'today' | 'month' | 'date', monthStr: string, dateVal: string): string => {
    if (mode === 'today') return todayStr;
    if (mode === 'date') return dateVal || '';
    if (mode === 'month' && monthStr) return `${monthStr}-31`;
    return '';
  };

  const computeBranchCarryForward = (
    mode: 'all' | 'today' | 'month' | 'date',
    monthStr: string,
    dateVal: string,
    branchNameFilter: string = 'all'
  ) => {
    const start = getPeriodStart(mode, monthStr, dateVal);
    const end = getPeriodEnd(mode, monthStr, dateVal);
    const matchBranch = (bName?: string) =>
      branchNameFilter === 'all' || String(bName || '').toLowerCase() === branchNameFilter.toLowerCase();

    const isBefore = (raw: any) => {
      if (!start) return false;
      const d = normalizeDate(raw);
      return d !== '' && d < start;
    };
    const isIn = (raw: any) => {
      const d = normalizeDate(raw);
      if (start && (!d || d < start)) return false;
      if (end && (!d || d > end)) return false;
      return true;
    };

    const baseOpening = storageService.getBranchOpening();
    const priorC = consignments.filter((c) => matchBranch(c.branchName) && isBefore(c.date || (c as any).createdAt));
    const priorR = remittances.filter((r) => matchBranch(r.branchName) && isBefore(r.date || (r as any).createdAt));
    const priorCv = branchNameFilter === 'all' ? conversions.filter((cv) => isBefore(cv.date || (cv as any).createdAt)) : [];
    const priorDp = chinaDirectPayments.filter((p) => matchBranch(p.branchName) && isBefore(p.date || (p as any).createdAt));

    const periodC = consignments.filter((c) => matchBranch(c.branchName) && isIn(c.date || (c as any).createdAt));
    const periodR = remittances.filter((r) => matchBranch(r.branchName) && isIn(r.date || (r as any).createdAt));
    const periodCv = branchNameFilter === 'all' ? conversions.filter((cv) => isIn(cv.date || (cv as any).createdAt)) : [];
    const periodDp = chinaDirectPayments.filter((p) => matchBranch(p.branchName) && isIn(p.date || (p as any).createdAt));

    const priorSummary = computeChinaOfficeSummary(priorC, priorCv, priorDp, priorR, branchNameFilter === 'all' ? baseOpening : null);
    const periodSummary = computeChinaOfficeSummary(periodC, periodCv, periodDp, periodR, null);

    const hasWindow = Boolean(start);
    const openingChinaDueBdt = hasWindow
      ? priorSummary.chinaRemainingDueBdt
      : (branchNameFilter === 'all' ? round2(baseOpening ? (baseOpening.side === 'cr' ? -1 : 1) * (Number(baseOpening.amount) || 0) : 0) : 0);
    const closingChinaDueBdt = round2(
      openingChinaDueBdt + periodSummary.totalSentBdt - periodSummary.rmbConvertedBdt - periodSummary.totalChinaDirectBdt
    );

    const openingRmbInHand = hasWindow ? Math.max(0, round2(priorSummary.totalRmbRemitted - priorSummary.totalConvertedRmb)) : 0;
    const closingRmbInHand = Math.max(0, round2(openingRmbInHand + periodSummary.totalRmbRemitted - periodSummary.totalConvertedRmb));

    const openingSentBdt = hasWindow ? priorSummary.totalSentBdt : 0;
    const openingSentRmb = hasWindow ? priorSummary.totalEstRmbSent : 0;
    const closingSentBdt = round2(openingSentBdt + periodSummary.totalSentBdt);
    const closingSentRmb = round2(openingSentRmb + periodSummary.totalEstRmbSent);

    const openingRemittedRmb = hasWindow ? priorSummary.totalRmbRemitted : 0;
    const closingRemittedRmb = round2(openingRemittedRmb + periodSummary.totalRmbRemitted);
    const closingBranchRmbDue = closingSentRmb > 0 ? Math.max(0, round2(closingSentRmb - closingRemittedRmb)) : 0;

    return {
      hasWindow,
      periodSummary,
      openingChinaDueBdt,
      closingChinaDueBdt,
      openingRmbInHand,
      closingRmbInHand,
      openingSentBdt,
      openingSentRmb,
      closingSentBdt,
      closingSentRmb,
      openingRemittedRmb,
      closingRemittedRmb,
      closingBranchRmbDue,
      priorConsignmentCount: priorC.length,
      priorRemittanceCount: priorR.length,
    };
  };

  type PartyLedgerTx = {
    id: string;
    date: string;
    voucherNo: string;
    partyName: string;
    rmbAmount: number;
    exchangeRate: number;
    expectedBdt: number;
    receivedBdt: number;
    runningBalance: number;
    kind: 'conversion' | 'collection';
    note?: string;
    sourceConversion?: ThirdPartyRmbConversion;
  };

  type PartyLedgerSummary = {
    partyKey: string;
    partyName: string;
    phone: string;
    city: string;
    openingSetupBalance: number;
    openingDueBdt: number;
    periodRmb: number;
    periodExpectedBdt: number;
    periodReceivedBdt: number;
    closingDueBdt: number;
    allTimeDueBdt: number;
    conversionCount: number;
    entries: PartyLedgerTx[];
  };

  const computeThirdPartyLedgers = (
    mode: 'all' | 'today' | 'month' | 'date',
    monthStr: string,
    dateVal: string
  ) => {
    const start = getPeriodStart(mode, monthStr, dateVal);
    const end = getPeriodEnd(mode, monthStr, dateVal);
    const hasWindow = Boolean(start);

    const metaMap = new Map<string, { partyName: string; phone: string; city: string; openingSetupBalance: number }>();
    thirdParties.forEach((tp) => {
      const displayName = (tp.name || '').trim();
      if (!displayName) return;
      const key = displayName.toLowerCase();
      metaMap.set(key, {
        partyName: displayName,
        phone: tp.phone || '',
        city: tp.city || '',
        openingSetupBalance: Number(tp.openingBalance) || 0,
      });
    });

    conversions.forEach((cv) => {
      const displayName = String(cv.partyName || (cv as any).thirdPartyName || '').trim() || '3rd Party';
      const key = displayName.toLowerCase();
      const existing = metaMap.get(key);
      if (!existing) {
        metaMap.set(key, {
          partyName: displayName,
          phone: cv.partyPhone || '',
          city: '',
          openingSetupBalance: 0,
        });
      } else if (!existing.phone && cv.partyPhone) {
        existing.phone = cv.partyPhone;
      }
    });

    type Accum = {
      priorExpected: number;
      priorReceived: number;
      periodRmb: number;
      periodExpected: number;
      periodReceived: number;
      allExpected: number;
      allReceived: number;
      conversionCount: number;
      rawEntries: Omit<PartyLedgerTx, 'runningBalance'>[];
    };

    const accMap = new Map<string, Accum>();
    metaMap.forEach((_, key) => {
      accMap.set(key, {
        priorExpected: 0,
        priorReceived: 0,
        periodRmb: 0,
        periodExpected: 0,
        periodReceived: 0,
        allExpected: 0,
        allReceived: 0,
        conversionCount: 0,
        rawEntries: [],
      });
    });

    conversions.forEach((cv) => {
      const displayName = String(cv.partyName || (cv as any).thirdPartyName || '').trim() || '3rd Party';
      const key = displayName.toLowerCase();
      const acc = accMap.get(key);
      if (!acc) return;

      const cvDate = normalizeDate(cv.date || (cv as any).createdAt);
      const expected = Number(cv.expectedBdtAmount ?? (cv as any).totalBdtExpected) || 0;
      const receivedTotal = Number(cv.receivedBdtAmount ?? (cv as any).bdtReceived) || 0;
      const rmb = Number(cv.rmbAmountGiven ?? (cv as any).rmbAmount) || 0;

      acc.allExpected += expected;
      acc.allReceived += receivedTotal;

      const hist = Array.isArray(cv.historyPayments) ? cv.historyPayments : [];
      const histSum = hist.reduce((s, p) => s + (Number(p.amountBdt) || 0), 0);
      const useHistory = hist.length > 0 && Math.abs(histSum - receivedTotal) < 2;

      const inWin = (d: string) => (!start || (d !== '' && d >= start)) && (!end || (d !== '' && d <= end));
      const beforeWin = (d: string) => Boolean(start) && d !== '' && d < start;

      let recBefore = 0;
      let recInPeriod = 0;
      let latestPeriodPayDate = cvDate;

      if (useHistory) {
        hist.forEach((p) => {
          const pd = normalizeDate(p.date || cvDate);
          const amt = Number(p.amountBdt) || 0;
          if (beforeWin(pd)) recBefore += amt;
          else if (inWin(pd)) {
            recInPeriod += amt;
            if (!latestPeriodPayDate || pd > latestPeriodPayDate) latestPeriodPayDate = pd;
          }
        });
      } else {
        if (beforeWin(cvDate)) recBefore = receivedTotal;
        else if (inWin(cvDate)) recInPeriod = receivedTotal;
      }

      if (beforeWin(cvDate)) {
        acc.priorExpected += expected;
        acc.priorReceived += recBefore;
        if (recInPeriod > 0) {
          acc.periodReceived += recInPeriod;
          acc.rawEntries.push({
            id: `col-${cv.id}`,
            date: latestPeriodPayDate || start,
            voucherNo: cv.voucherNo || '-',
            partyName: displayName,
            rmbAmount: 0,
            exchangeRate: 0,
            expectedBdt: 0,
            receivedBdt: recInPeriod,
            kind: 'collection',
            note: `পূর্বের জের আদায় (ভাউচার তারিখ: ${cv.date})`,
            sourceConversion: cv,
          });
        }
      } else if (inWin(cvDate)) {
        acc.periodRmb += rmb;
        acc.periodExpected += expected;
        acc.periodReceived += recInPeriod;
        acc.conversionCount += 1;
        acc.rawEntries.push({
          id: cv.id,
          date: cvDate || cv.date,
          voucherNo: cv.voucherNo || '-',
          partyName: displayName,
          rmbAmount: rmb,
          exchangeRate: Number(cv.exchangeRate) || 0,
          expectedBdt: expected,
          receivedBdt: recInPeriod,
          kind: 'conversion',
          note: cv.notes || '',
          sourceConversion: cv,
        });
      }
    });

    const summaries: PartyLedgerSummary[] = [];
    metaMap.forEach((meta, key) => {
      const acc = accMap.get(key)!;
      const openingDueBdt = round2(
        meta.openingSetupBalance + (hasWindow ? acc.priorExpected - acc.priorReceived : 0)
      );
      const periodRmb = round2(acc.periodRmb);
      const periodExpectedBdt = round2(acc.periodExpected);
      const periodReceivedBdt = round2(acc.periodReceived);
      const closingDueBdt = round2(openingDueBdt + periodExpectedBdt - periodReceivedBdt);
      const allTimeDueBdt = round2(meta.openingSetupBalance + acc.allExpected - acc.allReceived);

      const sortedRaw = [...acc.rawEntries].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.voucherNo.localeCompare(b.voucherNo);
      });

      let running = openingDueBdt;
      const entries: PartyLedgerTx[] = sortedRaw.map((row) => {
        running = round2(running + row.expectedBdt - row.receivedBdt);
        return { ...row, runningBalance: running };
      });

      summaries.push({
        partyKey: key,
        partyName: meta.partyName,
        phone: meta.phone,
        city: meta.city,
        openingSetupBalance: meta.openingSetupBalance,
        openingDueBdt,
        periodRmb,
        periodExpectedBdt,
        periodReceivedBdt,
        closingDueBdt,
        allTimeDueBdt,
        conversionCount: acc.conversionCount,
        entries,
      });
    });

    summaries.sort((a, b) => {
      if (Math.abs(b.closingDueBdt) !== Math.abs(a.closingDueBdt)) {
        return b.closingDueBdt - a.closingDueBdt;
      }
      if (b.periodRmb !== a.periodRmb) return b.periodRmb - a.periodRmb;
      return a.partyName.localeCompare(b.partyName);
    });

    return {
      hasWindow,
      summaries,
      totals: {
        openingDueBdt: round2(summaries.reduce((s, p) => s + p.openingDueBdt, 0)),
        periodRmb: round2(summaries.reduce((s, p) => s + p.periodRmb, 0)),
        periodExpectedBdt: round2(summaries.reduce((s, p) => s + p.periodExpectedBdt, 0)),
        periodReceivedBdt: round2(summaries.reduce((s, p) => s + p.periodReceivedBdt, 0)),
        closingDueBdt: round2(summaries.reduce((s, p) => s + p.closingDueBdt, 0)),
        conversionCount: summaries.reduce((s, p) => s + p.conversionCount, 0),
      },
    };
  };

  const mainThirdPartyLedgers = useMemo(
    () => computeThirdPartyLedgers(filterPeriodMode, selectedMonth, selectedDate),
    [conversions, thirdParties, filterPeriodMode, selectedMonth, selectedDate, todayStr]
  );

  // KPI Calculations with automatic carry-forward Opening -> Period -> Closing
  const metrics = useMemo(() => {
    const cf = computeBranchCarryForward(filterPeriodMode, selectedMonth, selectedDate, 'all');
    const summary = cf.periodSummary;
    const tpTotals = mainThirdPartyLedgers.totals;

    return {
      hasWindow: cf.hasWindow,
      totalBdtSent: summary.totalSentBdt,
      totalRmbEstSent: summary.totalEstRmbSent,
      totalRmbReceived: summary.totalRmbRemitted,
      totalRmbConverted: summary.totalConvertedRmb,
      openingRmbInHand: cf.openingRmbInHand,
      rmbBalanceInHand: cf.closingRmbInHand,
      totalBdtReceived: cf.hasWindow ? tpTotals.periodReceivedBdt : summary.totalBdtReceived,
      totalExpectedBdt: cf.hasWindow ? tpTotals.periodExpectedBdt : summary.totalExpectedBdt,
      openingThirdPartyDueBdt: tpTotals.openingDueBdt,
      totalThirdPartyDueBdt: cf.hasWindow ? tpTotals.closingDueBdt : summary.totalThirdPartyDueBdt + thirdParties.reduce((s, tp) => s + (Number(tp.openingBalance) || 0), 0),
      totalChinaDirectBdt: summary.totalChinaDirectBdt,
      branchNetRmbDue: cf.hasWindow ? cf.closingBranchRmbDue : summary.branchNetRmbDue,
      rmbConvertedBdt: summary.rmbConvertedBdt,
      openingChinaDueBdt: cf.openingChinaDueBdt,
      chinaRemainingStockBdt: cf.closingChinaDueBdt,
      signedOpening: cf.openingChinaDueBdt,
    };
  }, [consignments, remittances, conversions, chinaDirectPayments, thirdParties, mainThirdPartyLedgers, filterPeriodMode, selectedMonth, selectedDate, todayStr]);

  // Comprehensive China Stock BDT, RMB Conversion & Direct BDT Payment History Ledger
  const chinaBdtHistoryLedger = useMemo(() => {
    type LedgerEntry = {
      id: string;
      date: string;
      type: 'consignment_sent' | 'rmb_converted' | 'china_direct_payment';
      title: string;
      refNo: string;
      stockDebitBdt: number;
      convertedCreditBdt: number;
      runningBalanceBdt: number;
    };

    const entries: Omit<LedgerEntry, 'runningBalanceBdt'>[] = [];

    consignments.forEach((c) => {
      entries.push({
        id: `c-${c.id}`,
        date: c.date,
        type: 'consignment_sent',
        title: lang === 'bn' ? `মাল চালান প্রেরণ (${c.branchName})` : `Consignment Sent (${c.branchName})`,
        refNo: c.consignmentNo,
        stockDebitBdt: Number(c.totalBdtValue) || 0,
        convertedCreditBdt: 0,
      });
    });

    conversions.forEach((cv) => {
      const bdtAmount = Number(cv.expectedBdtAmount) || Number(cv.receivedBdtAmount) || 0;
      entries.push({
        id: `cv-${cv.id}`,
        date: cv.date,
        type: 'rmb_converted',
        title: lang === 'bn' ? `৩য়-পক্ষ RMB কনভার্সন (${cv.partyName || 'Agent'})` : `3rd Party RMB Converted (${cv.partyName || 'Agent'})`,
        refNo: cv.voucherNo,
        stockDebitBdt: 0,
        convertedCreditBdt: bdtAmount,
      });
    });

    chinaDirectPayments.forEach((p) => {
      entries.push({
        id: `cdp-${p.id}`,
        date: p.date,
        type: 'china_direct_payment',
        title: lang === 'bn' ? `চীন অফিস সরাসরি BDT পেমেন্ট (${p.paymentMethod})` : `China Direct BDT Payment (${p.paymentMethod})`,
        refNo: p.referenceNo,
        stockDebitBdt: 0,
        convertedCreditBdt: Number(p.amountBdt) || 0,
      });
    });

    entries.sort((a, b) => (a.date > b.date ? 1 : -1));

    let currentBalance = 0;
    const result: LedgerEntry[] = entries.map((entry) => {
      currentBalance = currentBalance + entry.stockDebitBdt - entry.convertedCreditBdt;
      return {
        ...entry,
        runningBalanceBdt: currentBalance,
      };
    });

    return result;
  }, [consignments, conversions, chinaDirectPayments, lang]);

  // Filtered lists for statement printing & sharing (month-wise, party-wise and branch-wise)
  const statementPeriodLabel = useMemo(
    () => formatPeriodTitle(statementPeriodMode, statementMonth, todayStr),
    [statementPeriodMode, statementMonth, todayStr, lang]
  );

  const mainFilterPeriodLabel = useMemo(
    () => formatPeriodTitle(filterPeriodMode, selectedMonth, selectedDate),
    [filterPeriodMode, selectedMonth, selectedDate, todayStr, lang]
  );

  // Combined A4 sheet uses modal month filter when modal is open, or main panel filter when sharing from header
  const effectiveCombinedMode = isBranchStatementModalOpen ? statementPeriodMode : filterPeriodMode;
  const effectiveCombinedMonth = isBranchStatementModalOpen ? statementMonth : selectedMonth;
  const effectiveCombinedPeriodLabel = isBranchStatementModalOpen ? statementPeriodLabel : mainFilterPeriodLabel;

  const statementThirdPartyLedgers = useMemo(
    () => computeThirdPartyLedgers(statementPeriodMode, statementMonth, todayStr),
    [conversions, thirdParties, statementPeriodMode, statementMonth, todayStr]
  );

  // Active 3rd-party ledgers for statement preview & A4 print
  const statementPartyGroups = useMemo(() => {
    if (statementPartyFilter !== 'all') {
      return statementThirdPartyLedgers.summaries.filter(
        (p) => p.partyKey === statementPartyFilter.trim().toLowerCase()
      );
    }
    return statementThirdPartyLedgers.summaries.filter(
      (p) => p.openingDueBdt !== 0 || p.periodRmb > 0 || p.periodExpectedBdt > 0 || p.periodReceivedBdt > 0 || p.closingDueBdt !== 0 || p.entries.length > 0
    );
  }, [statementThirdPartyLedgers, statementPartyFilter]);

  const statementConversions = useMemo(() => {
    return sortByDateAsc(
      conversions.filter((c) => {
        if (!isDateInWindow(c.date || (c as any).createdAt, statementPeriodMode, statementMonth, todayStr)) return false;
        if (statementPartyFilter === 'all') return true;
        return (c.partyName || (c as any).thirdPartyName)?.trim().toLowerCase() === statementPartyFilter.trim().toLowerCase();
      })
    );
  }, [conversions, statementPartyFilter, statementPeriodMode, statementMonth, todayStr]);

  const statementPartyMetrics = useMemo(() => {
    const openingDue = round2(statementPartyGroups.reduce((acc, g) => acc + g.openingDueBdt, 0));
    const totalRmb = round2(statementPartyGroups.reduce((acc, g) => acc + g.periodRmb, 0));
    const totalExpected = round2(statementPartyGroups.reduce((acc, g) => acc + g.periodExpectedBdt, 0));
    const totalReceived = round2(statementPartyGroups.reduce((acc, g) => acc + g.periodReceivedBdt, 0));
    const closingDue = round2(statementPartyGroups.reduce((acc, g) => acc + g.closingDueBdt, 0));
    const entryCount = statementPartyGroups.reduce((acc, g) => acc + g.entries.length, 0);
    return {
      hasWindow: statementThirdPartyLedgers.hasWindow,
      openingDue,
      totalRmb,
      totalExpected,
      totalReceived,
      totalDue: closingDue,
      closingDue,
      entryCount,
    };
  }, [statementPartyGroups, statementThirdPartyLedgers.hasWindow]);

  const statementConsignments = useMemo(() => {
    return sortByDateAsc(
      consignments.filter((c) => {
        if (!isDateInWindow(c.date || (c as any).createdAt, statementPeriodMode, statementMonth, todayStr)) return false;
        if (statementBranchFilter === 'all') return true;
        return c.branchName?.toLowerCase() === statementBranchFilter.toLowerCase();
      })
    );
  }, [consignments, statementBranchFilter, statementPeriodMode, statementMonth, todayStr]);

  const statementConsignmentMetrics = useMemo(() => {
    const cf = computeBranchCarryForward(statementPeriodMode, statementMonth, todayStr, statementBranchFilter);
    const totalBdt = statementConsignments.reduce((acc, c) => acc + (Number(c.totalBdtValue) || 0), 0);
    const totalRmb = statementConsignments.reduce((acc, c) => acc + (Number(c.totalRmbEstimated) || 0), 0);
    return {
      hasWindow: cf.hasWindow,
      openingBdt: cf.openingSentBdt,
      openingRmb: cf.openingSentRmb,
      totalBdt,
      totalRmb,
      closingBdt: round2(cf.openingSentBdt + totalBdt),
      closingRmb: round2(cf.openingSentRmb + totalRmb),
      priorCount: cf.priorConsignmentCount,
    };
  }, [statementConsignments, consignments, statementBranchFilter, statementPeriodMode, statementMonth, todayStr]);

  const statementRemittances = useMemo(() => {
    return sortByDateAsc(
      remittances.filter((r) => {
        if (!isDateInWindow(r.date || (r as any).createdAt, statementPeriodMode, statementMonth, todayStr)) return false;
        if (statementBranchFilter === 'all') return true;
        return r.branchName?.toLowerCase() === statementBranchFilter.toLowerCase();
      })
    );
  }, [remittances, statementBranchFilter, statementPeriodMode, statementMonth, todayStr]);

  const statementRemittanceMetrics = useMemo(() => {
    const cf = computeBranchCarryForward(statementPeriodMode, statementMonth, todayStr, statementBranchFilter);
    const totalRmb = statementRemittances.reduce((acc, r) => acc + (Number(r.rmbAmount) || 0), 0);
    return {
      hasWindow: cf.hasWindow,
      openingRmb: cf.openingRemittedRmb,
      totalRmb,
      closingRmb: round2(cf.openingRemittedRmb + totalRmb),
      priorCount: cf.priorRemittanceCount,
    };
  }, [statementRemittances, remittances, statementBranchFilter, statementPeriodMode, statementMonth, todayStr]);

  const statementCombinedConsignments = useMemo(
    () => sortByDateAsc(consignments.filter((c) => isDateInWindow(c.date || (c as any).createdAt, effectiveCombinedMode, effectiveCombinedMonth, selectedDate))),
    [consignments, effectiveCombinedMode, effectiveCombinedMonth, selectedDate, todayStr]
  );
  const statementCombinedRemittances = useMemo(
    () => sortByDateAsc(remittances.filter((r) => isDateInWindow(r.date || (r as any).createdAt, effectiveCombinedMode, effectiveCombinedMonth, selectedDate))),
    [remittances, effectiveCombinedMode, effectiveCombinedMonth, selectedDate, todayStr]
  );
  const statementCombinedConversions = useMemo(
    () => sortByDateAsc(conversions.filter((cv) => isDateInWindow(cv.date || (cv as any).createdAt, effectiveCombinedMode, effectiveCombinedMonth, selectedDate))),
    [conversions, effectiveCombinedMode, effectiveCombinedMonth, selectedDate, todayStr]
  );
  const statementCombinedDirectPayments = useMemo(
    () => sortByDateAsc(chinaDirectPayments.filter((p) => isDateInWindow(p.date || (p as any).createdAt, effectiveCombinedMode, effectiveCombinedMonth, selectedDate))),
    [chinaDirectPayments, effectiveCombinedMode, effectiveCombinedMonth, selectedDate, todayStr]
  );
  const statementCombinedThirdPartyLedgers = useMemo(
    () => computeThirdPartyLedgers(effectiveCombinedMode, effectiveCombinedMonth, selectedDate),
    [conversions, thirdParties, effectiveCombinedMode, effectiveCombinedMonth, selectedDate, todayStr]
  );
  const statementCombinedMetrics = useMemo(() => {
    const cf = computeBranchCarryForward(effectiveCombinedMode, effectiveCombinedMonth, selectedDate, 'all');
    const summary = cf.periodSummary;
    const tpTotals = statementCombinedThirdPartyLedgers.totals;
    return {
      hasWindow: cf.hasWindow,
      totalBdtSent: summary.totalSentBdt,
      totalRmbEstSent: summary.totalEstRmbSent,
      totalRmbReceived: summary.totalRmbRemitted,
      totalRmbConverted: summary.totalConvertedRmb,
      openingRmbInHand: cf.openingRmbInHand,
      rmbBalanceInHand: cf.closingRmbInHand,
      totalBdtReceived: cf.hasWindow ? tpTotals.periodReceivedBdt : summary.totalBdtReceived,
      totalExpectedBdt: cf.hasWindow ? tpTotals.periodExpectedBdt : summary.totalExpectedBdt,
      openingThirdPartyDueBdt: tpTotals.openingDueBdt,
      totalThirdPartyDueBdt: cf.hasWindow ? tpTotals.closingDueBdt : summary.totalThirdPartyDueBdt + thirdParties.reduce((s, tp) => s + (Number(tp.openingBalance) || 0), 0),
      totalChinaDirectBdt: summary.totalChinaDirectBdt,
      branchNetRmbDue: cf.hasWindow ? cf.closingBranchRmbDue : summary.branchNetRmbDue,
      rmbConvertedBdt: summary.rmbConvertedBdt,
      openingChinaDueBdt: cf.openingChinaDueBdt,
      chinaRemainingStockBdt: cf.closingChinaDueBdt,
    };
  }, [consignments, remittances, conversions, chinaDirectPayments, thirdParties, statementCombinedThirdPartyLedgers, effectiveCombinedMode, effectiveCombinedMonth, selectedDate, todayStr]);

  // Consignment Item Handlers
  const handleAddItemRow = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        quantity: 100,
        unit: 'pcs',
        unitCostBdt: 0,
        totalCostBdt: 0,
        estimatedRmbRate: 0,
        estimatedRmbTotal: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BranchConsignmentItem, val: any) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === 'quantity' || field === 'unitCostBdt') {
          const qty = field === 'quantity' ? Number(val) : item.quantity;
          const cost = field === 'unitCostBdt' ? Number(val) : item.unitCostBdt;
          updated.totalCostBdt = Math.round(qty * cost);
        }
        if (field === 'quantity' || field === 'estimatedRmbRate') {
          const qty = field === 'quantity' ? Number(val) : item.quantity;
          const rate = field === 'estimatedRmbRate' ? Number(val) : (item.estimatedRmbRate || 0);
          updated.estimatedRmbTotal = Math.round(qty * rate * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Submit Consignment
  const handleSaveConsignmentForm = (e: React.FormEvent) => {
    e.preventDefault();
    const totalBdt = formItems.reduce((acc, i) => acc + (Number(i.totalCostBdt) || 0), 0);
    const totalRmb = formItems.reduce((acc, i) => acc + (Number(i.estimatedRmbTotal) || 0), 0);

    const consignmentToSave: BranchConsignment = {
      id: editingConsignment ? editingConsignment.id : `bc-${Date.now()}`,
      consignmentNo: formConsignmentNo.trim(),
      date: formDate,
      branchName: formBranchName.trim(),
      destinationCity: formDestinationCity.trim(),
      items: formItems,
      totalBdtValue: totalBdt,
      totalRmbEstimated: totalRmb,
      shippingMethod: formShippingMethod,
      trackingNo: formTrackingNo.trim(),
      carrierName: formCarrierName.trim(),
      shippingCostBdt: Number(formShippingCost) || 0,
      status: editingConsignment ? editingConsignment.status : 'dispatched',
      notes: formConsignmentNotes.trim(),
      createdAt: editingConsignment ? editingConsignment.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveConsignment(consignmentToSave);
    setIsConsignmentModalOpen(false);
    setEditingConsignment(null);
  };

  // Submit Remittance
  const handleSaveRemittanceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (remitAmount <= 0) return;

    const remittanceToSave: BranchRmbRemittance = {
      id: editingRemittance ? editingRemittance.id : `rem-${Date.now()}`,
      date: remitDate,
      referenceNo: remitRefNo.trim(),
      branchName: remitBranchName.trim(),
      rmbAmount: Number(remitAmount),
      receivedVia: remitVia,
      accountDetails: remitAccount.trim(),
      notes: remitNotes.trim(),
      createdAt: editingRemittance ? editingRemittance.createdAt : new Date().toISOString(),
    };

    onSaveRemittance(remittanceToSave);
    setIsRemittanceModalOpen(false);
    setEditingRemittance(null);
    setRemitAmount(0);
  };

  // Submit Conversion
  const handleSaveConversionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convPartyName.trim() || convRmbAmount <= 0 || convRate <= 0) return;

    const expectedBdt = Math.round(convRmbAmount * convRate);
    const receivedBdt = Number(convReceivedBdt) || 0;
    const remainingDue = expectedBdt - receivedBdt;
    const settlement: SettlementStatus = remainingDue <= 0 ? 'settled' : receivedBdt > 0 ? 'partial' : 'pending';

    const conversionToSave: ThirdPartyRmbConversion = {
      id: editingConversion ? editingConversion.id : `cnv-${Date.now()}`,
      date: convDate,
      voucherNo: convVoucherNo.trim(),
      partyName: convPartyName.trim(),
      partyPhone: convPartyPhone.trim(),
      rmbAmountGiven: Number(convRmbAmount),
      exchangeRate: Number(convRate),
      expectedBdtAmount: expectedBdt,
      receivedBdtAmount: receivedBdt,
      remainingDueBdt: remainingDue,
      settlementStatus: settlement,
      paymentMethod: convPaymentMethod,
      bankAccountDetails: convBankDetails.trim(),
      historyPayments: editingConversion
        ? (editingConversion.historyPayments || [])
        : (receivedBdt > 0 ? [{
            id: `pay-${Date.now()}`,
            date: convDate,
            amountBdt: receivedBdt,
            method: convPaymentMethod === 'multiple' ? 'bank_transfer' : convPaymentMethod,
            accountDetails: convBankDetails.trim(),
            notes: 'Initial receipt at time of RMB handover'
          }] : []),
      notes: convNotes.trim(),
      createdAt: editingConversion ? editingConversion.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveConversion(conversionToSave);
    setIsConversionModalOpen(false);
    setEditingConversion(null);
    setConvPartyName('');
    setConvRmbAmount(0);
    setConvReceivedBdt(0);
  };

  // Add Partial/Settlement Payment to Conversion
  const handleAddPaymentToConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversion || payAmountBdt <= 0) return;

    const newReceivedBdt = selectedConversion.receivedBdtAmount + payAmountBdt;
    const newRemainingDue = selectedConversion.expectedBdtAmount - newReceivedBdt;
    const newStatus: SettlementStatus = newRemainingDue <= 0 ? 'settled' : 'partial';

    const paymentRecord = {
      id: `pay-${Date.now()}`,
      date: payDate,
      amountBdt: payAmountBdt,
      method: payMethod,
      accountDetails: payAccount.trim(),
      notes: payNotes.trim(),
    };

    const updated: ThirdPartyRmbConversion = {
      ...selectedConversion,
      receivedBdtAmount: newReceivedBdt,
      remainingDueBdt: newRemainingDue,
      settlementStatus: newStatus,
      historyPayments: [...(selectedConversion.historyPayments || []), paymentRecord],
      updatedAt: new Date().toISOString(),
    };

    onSaveConversion(updated);
    setIsPaymentModalOpen(false);
    setSelectedConversion(null);
    setPayAmountBdt(0);
  };

  return (
    <div className="space-y-6">
      <BranchOfficeLedger
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        lang={lang}
        companyInfo={companyInfo}
        consignments={consignments}
        conversions={conversions}
        chinaDirectPayments={chinaDirectPayments}
        isSuperAdmin={isSuperAdmin}
      />
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'আন্তর্জাতিক শাখা অফিস & আরএমবি খাতা' : 'Branch Office & RMB Trade'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {lang === 'bn' ? 'শাখা অফিস ও ৩য়-পক্ষ আরএমবি/টাকা হিসাব' : 'Branch Office & 3rd Party RMB/BDT'}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            {lang === 'bn'
              ? 'বাংলাদেশ থেকে মালামাল (IC, CPU, ক্যামেরা) পাঠানো, শাখা অফিস থেকে RMB প্রাপ্তি এবং থার্ড-পার্টির মাধ্যমে BDT তে কনভার্ট করার সম্পূর্ণ ডিজিটাল হিসাব।'
              : 'Dispatch parts from BD, receive RMB from branch sales, and manage 3rd party RMB-to-BDT currency conversions.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openNewConsignmentModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ পণ্য চালান পাঠান' : '+ Send Consignment'}</span>
          </button>

          <button
            onClick={openNewRemittanceModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
          >
            <Coins className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ RMB প্রাপ্তি এন্ট্রি' : '+ Receive RMB'}</span>
          </button>

          <button
            onClick={openNewConversionModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ ৩য়-পক্ষ RMB ➔ BDT' : '+ Convert RMB to BDT'}</span>
          </button>

          {/* New RMB Exchanger button (Requirement 1) */}
          <button
            onClick={openNewThirdPartyModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
            title="নতুন ৩য়-পক্ষ আরএমবি এক্সচেঞ্জার যুক্ত করুন"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ নতুন মানি এক্সচেঞ্জার' : '+ Add 3rd Party / Exchanger'}</span>
          </button>

          {/* China Office Direct BDT Payment button (Requirement 2) */}
          <button
            onClick={openNewChinaDirectPaymentModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
            title="চীন অফিস সরাসরি BDT পাঠালে এন্ট্রি করুন"
          >
            <Banknote className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ চীন সরাসরি BDT পেমেন্ট' : '+ China Direct BDT'}</span>
          </button>

          {/* Independent Branch Office Print Statement Button */}
          <button
            onClick={() => setIsLedgerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? 'লেজার / প্রারম্ভিক জের' : 'Ledger / Opening Balance'}</span>
          </button>
          <button
            onClick={() => {
              if (filterPeriodMode === 'month') {
                setStatementPeriodMode('month');
                setStatementMonth(selectedMonth);
              } else if (filterPeriodMode === 'today') {
                setStatementPeriodMode('today');
              } else {
                setStatementPeriodMode('month');
                setStatementMonth(selectedMonth);
              }
              setIsBranchStatementModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95"
            title="শাখা অফিস ও আরএমবি স্টেটমেন্ট প্রিন্ট"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? 'প্রিন্ট বিবরণী (A4)' : 'Print Statement'}</span>
          </button>

          {/* WhatsApp Share with Image Target */}
          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}
            targetElementId="rsr-branch-office-statement"
            fileName={`rsr-branch-office-statement-${filterPeriodMode === 'month' ? selectedMonth : filterPeriodMode}.png`}
            getText={() => {
              const openingLine = metrics.hasWindow
                ? `\n📌 গত মাসের জের (চীন Opening): ৳${(metrics.openingChinaDueBdt ?? 0).toLocaleString()} | হাতে RMB জের: ¥${(metrics.openingRmbInHand ?? 0).toLocaleString()} | ৩য়-পক্ষ জের: ৳${(metrics.openingThirdPartyDueBdt ?? 0).toLocaleString()}`
                : '';
              return `*${companyInfo.name} - শাখা অফিস ও ৩য়-পক্ষ RMB হিসাব*
📅 সময়কাল: ${mainFilterPeriodLabel}${openingLine}
━━━━━━━━━━━━━━━━━━━━
📦 শাখা অফিসে প্রেরিত মাল: ৳${(metrics.totalBdtSent ?? 0).toLocaleString()} (≈ ¥${(metrics.totalRmbEstSent ?? 0).toLocaleString()})
💰 শাখা অফিস থেকে প্রাপ্ত RMB: ¥${(metrics.totalRmbReceived ?? 0).toLocaleString()}
🪙 হাতে সমাপনী RMB ব্যালেন্স: ¥${(metrics.rmbBalanceInHand ?? 0).toLocaleString()}
🔄 ৩য়-পক্ষে RMB কনভার্ট: ¥${(metrics.totalRmbConverted ?? 0).toLocaleString()}
💵 প্রাপ্ত টাকা (BDT): ৳${(metrics.totalBdtReceived ?? 0).toLocaleString()}
🏦 চীন সরাসরি BDT পেমেন্ট: ৳${(metrics.totalChinaDirectBdt ?? 0).toLocaleString()}
⚠️ ৩য়-পক্ষ সমাপনী বাকি: ৳${(metrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}
🇨🇳 চীন অফিস সমাপনী পাওনা: ৳${(metrics.chinaRemainingStockBdt ?? 0).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
_${companyInfo.name}_`;
            }}
          />

          {/* WeChat Share with Image Target */}
          <WeChatShareDropdown
            lang={lang}
            buttonLabel={lang === 'bn' ? 'উইচ্যাট' : 'WeChat'}
            targetElementId="rsr-branch-office-statement"
            fileName={`rsr-wechat-branch-statement-${filterPeriodMode === 'month' ? selectedMonth : filterPeriodMode}.png`}
            getText={() => {
              const openingLine = metrics.hasWindow
                ? `\nOpening China Due: ৳${(metrics.openingChinaDueBdt ?? 0).toLocaleString()} | Opening RMB: ¥${(metrics.openingRmbInHand ?? 0).toLocaleString()} | Opening 3rd Party Due: ৳${(metrics.openingThirdPartyDueBdt ?? 0).toLocaleString()}`
                : '';
              return `${companyInfo.name} - Branch Office & RMB Statement\nPeriod: ${mainFilterPeriodLabel}${openingLine}\nSent to Branch: ৳${(metrics.totalBdtSent ?? 0).toLocaleString()} (¥${(metrics.totalRmbEstSent ?? 0).toLocaleString()})\nRMB Remitted: ¥${(metrics.totalRmbReceived ?? 0).toLocaleString()}\nClosing RMB Balance: ¥${(metrics.rmbBalanceInHand ?? 0).toLocaleString()}\nRMB Converted to BDT: ¥${(metrics.totalRmbConverted ?? 0).toLocaleString()}\nBDT Received: ৳${(metrics.totalBdtReceived ?? 0).toLocaleString()}\nChina Direct BDT: ৳${(metrics.totalChinaDirectBdt ?? 0).toLocaleString()}\nClosing 3rd Party Due: ৳${(metrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}\nClosing China Net Due: ৳${(metrics.chinaRemainingStockBdt ?? 0).toLocaleString()}`;
            }}
          />
        </div>
      </div>

      {/* Month & Date Filter Toolbar for Branch Office Sheets (User Requirement) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200">
            {lang === 'bn' ? 'শাখা ও আরএমবি শিটের তারিখ বা মাস নির্বাচন:' : 'Filter Branch Sheets by Month/Date:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 font-medium">
            <button
              onClick={() => setFilterPeriodMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'all'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সব সময় (All)' : 'All Time'}
            </button>
            <button
              onClick={() => setFilterPeriodMode('today')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'today'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'আজকের (Today)' : 'Today'}
            </button>
            <button
              onClick={() => setFilterPeriodMode('month')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'month'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'নির্দিষ্ট মাস (Month)' : 'Month'}
            </button>
            <button
              onClick={() => setFilterPeriodMode('date')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterPeriodMode === 'date'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'নির্দিষ্ট তারিখ (Date)' : 'Date'}
            </button>
          </div>

          {filterPeriodMode === 'month' && (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-slate-700 text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-hidden cursor-pointer"
              />
              <button
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-slate-700 text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {filterPeriodMode === 'date' && (
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-hidden cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Sent to Branch */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
            <span>{lang === 'bn' ? 'শাখা অফিসে পাঠানো মাল (BDT)' : 'Total Stock Sent (BDT)'}</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(metrics.totalBdtSent, lang)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{filteredConsignments.length} {lang === 'bn' ? 'টি চালান' : 'consignments'}</span>
            <span className="font-mono text-cyan-600 font-bold">≈ ¥ {(metrics.totalRmbEstSent ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: RMB Received from Branch */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
            <span>{lang === 'bn' ? 'শাখা অফিস থেকে প্রাপ্ত RMB' : 'Total RMB Remitted'}</span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
            ¥ {(metrics.totalRmbReceived ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'bn' ? 'শাখা অফিস নেট বাকি:' : 'Branch Balance:'} <span className="font-mono font-bold text-amber-600">¥ {(metrics.branchNetRmbDue ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: Unconverted RMB in Hand */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
            <span>{lang === 'bn' ? 'হাতে অবশিষ্ট RMB ব্যালেন্স' : 'Unconverted RMB Balance'}</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ¥ {(metrics.rmbBalanceInHand ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
            {metrics.hasWindow && (
              <div>
                {lang === 'bn' ? 'গত মাসের জের:' : 'Prev Opening:'}{' '}
                <span className="font-mono font-bold text-cyan-600">¥ {(metrics.openingRmbInHand ?? 0).toLocaleString()}</span>
              </div>
            )}
            <div>
              {lang === 'bn' ? 'কনভার্ট হয়েছে:' : 'Converted:'}{' '}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">¥ {(metrics.totalRmbConverted ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 4: 3rd Party Pending BDT Due */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
            <span>{lang === 'bn' ? '৩য়-পক্ষের কাছে মোট বাকি (BDT)' : '3rd Party BDT Due'}</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatCurrency(metrics.totalThirdPartyDueBdt, lang)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
            {metrics.hasWindow && (
              <div>
                {lang === 'bn' ? 'গত মাসের জের:' : 'Prev Opening:'}{' '}
                <span className="font-mono font-bold text-amber-600">{formatCurrency(metrics.openingThirdPartyDueBdt, lang)}</span>
              </div>
            )}
            <div>
              {lang === 'bn' ? 'প্রাপ্ত BDT:' : 'Received BDT:'}{' '}
              <span className="font-mono font-bold text-emerald-600">{formatCurrency(metrics.totalBdtReceived, lang)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* USER REQUIREMENT: Total RMB Remitted-এর ঠিক নিচে মোট BDT টাকার কার্ড এবং হিস্ট্রি যোগ */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-600/50 p-4 sm:p-5 rounded-2xl text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-800/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-cyan-300 border border-sky-400/40">
                {lang === 'bn' ? 'চীন অফিস মোট BDT টাকার হিসাব ও ব্যালেন্স' : 'China Office Stock BDT Status'}
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                Total Stock BDT (-) RMB Converted BDT
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-cyan-400" />
              <span>{lang === 'bn' ? 'চীন অফিসে স্টক ও টাকার অবশিষ্টাংশ স্থিতি (Remaining / Due)' : 'China Office Remaining Stock & BDT Due Status'}</span>
            </h3>
          </div>

          <button
            onClick={() => setShowChinaBdtHistory(!showChinaBdtHistory)}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto shadow-sm"
          >
            <Clock className="w-4 h-4" />
            <span>{showChinaBdtHistory ? (lang === 'bn' ? 'হিস্ট্রি লুকান' : 'Hide History') : (lang === 'bn' ? 'টাকা ও স্টক হিস্ট্রি দেখুন' : 'View BDT History Ledger')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Total Stock Sent BDT */}
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              {lang === 'bn' ? '১. শাখা অফিসে মোট প্রেরিত স্টক (BDT)' : '1. Total Stock Sent (BDT)'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-white">
              {formatCurrency(metrics.totalBdtSent, lang)}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {filteredConsignments.length} {lang === 'bn' ? 'টি চালান পাঠানো হয়েছে' : 'consignments sent'}
            </p>
          </div>

          {/* 2. Total RMB Converted to BDT */}
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              {lang === 'bn' ? '২. (-) RMB হতে কনভার্ট হওয়া টাকা' : '2. (-) RMB Converted to BDT'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(metrics.rmbConvertedBdt, lang)}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {filteredConversions.length} {lang === 'bn' ? 'টি RMB কনভার্শন' : 'conversions recorded'}
            </p>
          </div>

          {/* 3. China Office Direct BDT Payment */}
          <div className="p-3.5 bg-white/5 border border-teal-500/30 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center justify-between">
              <span>{lang === 'bn' ? '৩. (-) চীন অফিস সরাসরি BDT' : '3. (-) China Direct BDT'}</span>
              <button
                onClick={openNewChinaDirectPaymentModal}
                className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 cursor-pointer"
              >
                + এন্ট্রি
              </button>
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-teal-300">
              {formatCurrency(metrics.totalChinaDirectBdt, lang)}
            </div>
            <p className="text-[10px] text-teal-200/80 font-mono">
              {filteredChinaDirectPayments.length} {lang === 'bn' ? 'টি সরাসরি ব্যাংক/ক্যাশ পেমেন্ট' : 'direct bank/cash payments'}
            </p>
          </div>

          {/* 4. China Remaining Due BDT */}
          <div className="p-3.5 bg-sky-500/15 border border-cyan-400/50 rounded-xl space-y-1">
            <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">
              {lang === 'bn' ? '৪. (=) চায়না অফিসে অবশিষ্টাংশ পাওনা' : '4. (=) China Office Net Due'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
              {formatCurrency(metrics.chinaRemainingStockBdt, lang)}
            </div>
            <p className="text-[10px] text-cyan-200/90 font-mono">
              {metrics.hasWindow
                ? `জের: ৳${(metrics.openingChinaDueBdt ?? 0).toLocaleString()} + ৳${(metrics.totalBdtSent ?? 0).toLocaleString()} - ৳${(metrics.rmbConvertedBdt ?? 0).toLocaleString()} - ৳${(metrics.totalChinaDirectBdt ?? 0).toLocaleString()}`
                : `= ৳${(metrics.totalBdtSent ?? 0).toLocaleString()} - ৳${(metrics.rmbConvertedBdt ?? 0).toLocaleString()} - ৳${(metrics.totalChinaDirectBdt ?? 0).toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* China BDT History Ledger Table */}
        {showChinaBdtHistory && (
          <div className="mt-4 pt-4 border-t border-sky-800/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-sky-200">
              <span>{lang === 'bn' ? 'চীন অফিস স্টক প্রেরণ ও RMB কনভার্শন সমন্বিত হিস্ট্রি লেজার:' : 'China Stock Sent & RMB Conversion Transaction Ledger:'}</span>
              <span className="text-[11px] font-mono text-slate-400">{chinaBdtHistoryLedger.length} {lang === 'bn' ? 'টি লেনদেন' : 'transactions'}</span>
            </div>
            <div className="overflow-x-auto max-h-72 border border-slate-700/60 rounded-xl">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-800/90 text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">লেনদেনের বিবরণ & রেফারেন্স</th>
                    <th className="p-2.5 text-right">স্টক বৃদ্ধি (+) BDT</th>
                    <th className="p-2.5 text-right">RMB কনভার্ট (-) BDT</th>
                    <th className="p-2.5 text-right">অবশিষ্টাংশ ব্যালেন্স BDT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {chinaBdtHistoryLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500 font-sans">
                        {lang === 'bn' ? 'কোনো লেনদেন হিস্ট্রি পাওয়া যায়নি।' : 'No transaction history found.'}
                      </td>
                    </tr>
                  ) : (
                    chinaBdtHistoryLedger.map((row) => (
                      <tr key={row.id} className="hover:bg-white/5">
                        <td className="p-2.5 text-slate-300">{row.date}</td>
                        <td className="p-2.5 font-sans">
                          <span className="font-semibold text-white">{row.title}</span>
                          <span className="ml-2 text-[10px] text-cyan-400 font-mono">#{row.refNo}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-blue-400">
                          {row.stockDebitBdt > 0 ? `+৳${row.stockDebitBdt.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">
                          {row.convertedCreditBdt > 0 ? `-৳${row.convertedCreditBdt.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-cyan-300">
                          ৳{row.runningBalanceBdt.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{lang === 'bn' ? 'সার্বিক বিবরণী & ব্যালেন্স' : 'Overview & Balances'}</span>
        </button>

        <button
          onClick={() => setActiveTab('consignments')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'consignments'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{lang === 'bn' ? 'পণ্য চালান প্রেরণ খাতা' : 'Goods Sent Consignments'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
            {filteredConsignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('remittances')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'remittances'
              ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>{lang === 'bn' ? 'শাখা অফিস RMB প্রাপ্তি' : 'Branch RMB Remittances'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono">
            {filteredRemittances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('conversions')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'conversions'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{lang === 'bn' ? '৩য়-পক্ষ RMB ➔ BDT কনভার্শন লেজার' : '3rd Party RMB to BDT Ledger'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono font-bold">
            {filteredConversions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('third_parties')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'third_parties'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{lang === 'bn' ? '৩য়-পক্ষ এক্সচেঞ্জার খাতা' : '3rd Party Exchangers'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold">
            {thirdParties.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('china_direct_payments')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'china_direct_payments'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>{lang === 'bn' ? 'চীন সরাসরি BDT পেমেন্ট' : 'China Direct BDT'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono font-bold">
            {filteredChinaDirectPayments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Goods Sent Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'bn' ? 'শাখা অফিসে প্রেরিত পণ্যের সামারি' : 'Branch Consignment Summary'}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-blue-600">{filteredConsignments.length} Challans</span>
              </div>

              <div className="space-y-3">
                {filteredConsignments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {lang === 'bn' ? 'এখনো কোনো মালামাল পাঠানো হয়নি।' : 'No consignments recorded yet.'}
                  </div>
                ) : (
                  filteredConsignments.slice(0, 5).map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{c.consignmentNo}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-normal">
                            {c.shippingMethod}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {c.date} • {c.items.length} {lang === 'bn' ? 'রকমের মালামাল' : 'items'}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(c.totalBdtValue || 0, lang)}</div>
                        <div className="text-[10px] text-cyan-600">¥ {(c.totalRmbEstimated ?? 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: 3rd Party RMB to BDT Conversions Party-Wise Balances */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'bn' ? '৩য়-পক্ষ পার্টি-ভিত্তিক আলাদা হিসাব ও বাকি' : '3rd Party-Wise Balances'}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {formatCurrency(metrics.totalThirdPartyDueBdt, lang)} {lang === 'bn' ? 'মোট বাকি' : 'Total Due'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {mainThirdPartyLedgers.summaries.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {lang === 'bn' ? 'কোনো ৩য়-পক্ষ কনভার্শন এন্ট্রি পাওয়া যায়নি।' : 'No 3rd party conversions recorded yet.'}
                  </div>
                ) : (
                  mainThirdPartyLedgers.summaries
                    .filter((p) => p.openingDueBdt !== 0 || p.periodRmb > 0 || p.periodExpectedBdt > 0 || p.periodReceivedBdt > 0 || p.closingDueBdt !== 0)
                    .map((p) => (
                      <div
                        key={p.partyKey}
                        onClick={() => {
                          setConversionPartyFilter(p.partyName);
                          setActiveTab('conversions');
                        }}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded-xl flex items-center justify-between text-xs cursor-pointer border border-transparent hover:border-amber-300 transition-all"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{p.partyName}</span>
                            {p.conversionCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono">
                                ¥{p.periodRmb.toLocaleString()} ({p.conversionCount})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {mainThirdPartyLedgers.hasWindow ? `জের: ৳${p.openingDueBdt.toLocaleString()} • ` : ''}
                            প্রাপ্য: ৳{p.periodExpectedBdt.toLocaleString()} • জমা: ৳{p.periodReceivedBdt.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 ml-2">
                          <div className={`font-bold ${p.closingDueBdt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {p.closingDueBdt > 0 ? `বাকি: ${formatCurrency(p.closingDueBdt, lang)}` : 'পরিশোধিত'}
                          </div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-sans font-semibold">
                            লেজার দেখুন →
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONSIGNMENTS */}
      {activeTab === 'consignments' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'bn' ? 'শাখা অফিসে পণ্য প্রেরণের তালিকা' : 'Consignments Sent to Branch Office'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'বাংলাদেশ থেকে বিভিন্ন পণ্য (IC, CPU, ক্যামেরা) প্রেরণের বিস্তারিত চালান' : 'Track exported electronic scrap parts to branch office'}
              </p>
            </div>
            <button
              onClick={openNewConsignmentModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'নতুন চালান' : 'New Consignment'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 text-white font-bold">চালান নং & তারিখ</th>
                  <th className="p-3 text-white font-bold">শাখা / গন্তব্য</th>
                  <th className="p-3 text-white font-bold">মালের বিবরণ & পরিমাণ</th>
                  <th className="p-3 text-right text-white font-bold">বাংলাদেশ মূল্য (BDT)</th>
                  <th className="p-3 text-right text-white font-bold">আনুমানিক RMB (¥)</th>
                  <th className="p-3 text-white font-bold">শিপিং মাধ্যম & ট্র্যাকিং</th>
                  <th className="p-3 text-center text-white font-bold">স্ট্যাটাস</th>
                  <th className="p-3 text-center text-white font-bold">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredConsignments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {lang === 'bn' ? 'কোনো মালামাল বা চালান পাওয়া যায়নি।' : 'No consignments found.'}
                    </td>
                  </tr>
                ) : (
                  filteredConsignments.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div>{c.consignmentNo}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{c.date}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{c.branchName}</div>
                        {c.destinationCity && <div className="text-[10px] text-slate-400">{c.destinationCity}</div>}
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5 max-w-xs">
                          {c.items.map((it, idx) => (
                            <span key={idx} className="inline-block mr-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                              {it.name}: <strong>{formatSheetNumber(it.quantity, lang)} {it.unit}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(c.totalBdtValue || 0, lang)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        ¥ {(c.totalRmbEstimated ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-[11px]">
                        <div>{c.shippingMethod}</div>
                        {c.trackingNo && <div className="text-slate-400 font-mono text-[10px]">Track: {c.trackingNo}</div>}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditConsignmentModal(c)}
                            title={lang === 'bn' ? 'চালান এডিট করুন' : 'Edit Consignment'}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPrintingConsignment(c)}
                            title="প্রিন্ট করুন"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                if (confirm(lang === 'bn' ? 'চালানটি ডিলিট করতে চান?' : 'Delete this consignment?')) {
                                  onDeleteConsignment(c.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REMITTANCES */}
      {activeTab === 'remittances' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'bn' ? 'শাখা অফিস থেকে প্রেরিত RMB প্রাপ্তি' : 'RMB Remittances Received from Branch'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'শাখা অফিস মাল বিক্রি করে যে RMB আমাদের পাঠায় তার হিসাব' : 'RMB payments remitted by branch office'}
              </p>
            </div>
            <button
              onClick={openNewRemittanceModal}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ নতুন RMB এন্ট্রি' : '+ Add RMB'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">তারিখ & রেফারেন্স</th>
                  <th className="p-3">শাখা অফিস</th>
                  <th className="p-3 text-right">প্রাপ্ত RMB (¥)</th>
                  <th className="p-3">মাধ্যম (Received Via)</th>
                  <th className="p-3">অ্যাকাউন্ট / মন্তব্য</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRemittances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      {lang === 'bn' ? 'কোনো RMB প্রাপ্তির তথ্য পাওয়া যায়নি।' : 'No remittances found.'}
                    </td>
                  </tr>
                ) : (
                  filteredRemittances.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div>{r.referenceNo}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{r.date}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {r.branchName}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                        ¥ {(r.rmbAmount ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {r.receivedVia}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        <div>{r.accountDetails || '-'}</div>
                        {r.notes && <div className="text-slate-400 italic">{r.notes}</div>}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditRemittanceModal(r)}
                            title={lang === 'bn' ? 'RMB এন্ট্রি এডিট করুন' : 'Edit Remittance'}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                if (confirm(lang === 'bn' ? 'রেকর্ডটি ডিলিট করতে চান?' : 'Delete this record?')) {
                                  onDeleteRemittance(r.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONVERSIONS (WITH 3RD PARTY-WISE BREAKDOWN + CARRY-FORWARD) */}
      {activeTab === 'conversions' && (() => {
        const selectedPartyKey = conversionPartyFilter.trim().toLowerCase();
        const activePartySummary = conversionPartyFilter === 'all'
          ? null
          : mainThirdPartyLedgers.summaries.find((p) => p.partyKey === selectedPartyKey) || null;
        const tabFilteredConversions = filteredConversions.filter((cv) => {
          const pName = (cv.partyName || (cv as any).thirdPartyName || '3rd Party').trim();
          if (conversionPartyFilter !== 'all' && pName.toLowerCase() !== selectedPartyKey) return false;
          if (conversionSearch.trim()) {
            const q = conversionSearch.trim().toLowerCase();
            return (
              pName.toLowerCase().includes(q) ||
              (cv.voucherNo || '').toLowerCase().includes(q) ||
              (cv.partyPhone || '').toLowerCase().includes(q)
            );
          }
          return true;
        });

        const openPartyStatementPrint = (partyName: string) => {
          setStatementType('third_party');
          setStatementPartyFilter(partyName);
          if (filterPeriodMode === 'month') {
            setStatementPeriodMode('month');
            setStatementMonth(selectedMonth);
          } else if (filterPeriodMode === 'today') {
            setStatementPeriodMode('today');
          } else if (filterPeriodMode === 'all') {
            setStatementPeriodMode('all');
          } else {
            setStatementPeriodMode('month');
            setStatementMonth(selectedMonth);
          }
          setIsBranchStatementModalOpen(true);
        };

        return (
          <div className="space-y-4">
            {/* 3rd Party-Wise Separate Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>{lang === 'bn' ? '৩য়-পক্ষ পার্টি-ভিত্তিক আলাদা হিসাব ও লেজার' : '3rd Party-Wise Separate RMB Conversion Summary'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {mainFilterPeriodLabel} • {lang === 'bn' ? 'প্রতিটি পার্টির গত মাসের জের (Opening), চলতি কনভার্সন, জমা এবং সমাপনী বাকি আলাদা আলাদা দেখুন' : 'Separate carry-forward balances & conversions per 3rd party'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openPartyStatementPrint(conversionPartyFilter)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>
                      {conversionPartyFilter === 'all'
                        ? (lang === 'bn' ? 'পার্টি-ভিত্তিক প্রিন্ট (A4)' : 'Print 3rd Party A4')
                        : `${conversionPartyFilter} প্রিন্ট (A4)`}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openNewConversionModal();
                      if (conversionPartyFilter !== 'all') {
                        const tp = thirdParties.find((p) => p.name.toLowerCase() === selectedPartyKey);
                        setConvPartyName(conversionPartyFilter);
                        if (tp?.phone) setConvPartyPhone(tp.phone);
                      }
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? '+ নতুন কনভার্শন' : '+ New Conversion'}</span>
                  </button>
                </div>
              </div>

              {/* Party Filter + Search Controls */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <select
                  value={conversionPartyFilter}
                  onChange={(e) => setConversionPartyFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">{lang === 'bn' ? '👥 সকল ৩য়-পক্ষ পার্টি (একসাথে আলাদা সারি)' : '👥 All 3rd Parties'}</option>
                  {uniqueThirdPartiesList.map((name) => (
                    <option key={name} value={name}>👤 {name}</option>
                  ))}
                </select>

                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={conversionSearch}
                    onChange={(e) => setConversionSearch(e.target.value)}
                    placeholder={lang === 'bn' ? 'ভাউচার নং, পার্টি নাম বা ফোন দিয়ে খুঁজুন...' : 'Search voucher, party, phone...'}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {conversionPartyFilter !== 'all' && (
                  <button
                    onClick={() => setConversionPartyFilter('all')}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    ← সকল পার্টি দেখুন
                  </button>
                )}
              </div>

              {/* Selected Party Opening -> Closing Strip OR All Parties Breakdown Table */}
              {activePartySummary ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 text-xs font-mono">
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">গত মাসের জের (Opening Due)</span>
                    <strong className="text-sm text-amber-700 dark:text-amber-300">{formatCurrency(activePartySummary.openingDueBdt, lang)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">চলতি RMB প্রদত্ত ({activePartySummary.conversionCount} টি)</span>
                    <strong className="text-sm text-cyan-700 dark:text-cyan-400">¥ {activePartySummary.periodRmb.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">চলতি প্রাপ্য BDT</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{formatCurrency(activePartySummary.periodExpectedBdt, lang)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">এই সময়ে জমা প্রাপ্ত BDT</span>
                    <strong className="text-sm text-emerald-600">{formatCurrency(activePartySummary.periodReceivedBdt, lang)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">সমাপনী বাকি (Closing Due)</span>
                    <strong className={`text-sm font-black ${activePartySummary.closingDueBdt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(activePartySummary.closingDueBdt, lang)}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-2.5 text-white">#</th>
                        <th className="p-2.5 text-white">৩য়-পক্ষ পার্টি</th>
                        <th className="p-2.5 text-right text-amber-300">গত মাসের জের (Opening)</th>
                        <th className="p-2.5 text-right text-cyan-300">RMB প্রদত্ত (¥)</th>
                        <th className="p-2.5 text-right text-white">প্রাপ্য BDT</th>
                        <th className="p-2.5 text-right text-emerald-300">জমা BDT</th>
                        <th className="p-2.5 text-right text-rose-300">সমাপনী বাকি (Closing)</th>
                        <th className="p-2.5 text-center text-white">পার্টি হিসাব / প্রিন্ট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {mainThirdPartyLedgers.summaries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400">কোনো ৩য়-পক্ষ লেনদেন পাওয়া যায়নি।</td>
                        </tr>
                      ) : (
                        mainThirdPartyLedgers.summaries.map((p, idx) => (
                          <tr key={p.partyKey} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              <button
                                type="button"
                                onClick={() => setConversionPartyFilter(p.partyName)}
                                className="hover:text-amber-600 cursor-pointer text-left"
                              >
                                {p.partyName}
                                {p.phone && <span className="block text-[10px] font-mono font-normal text-slate-400">{p.phone}</span>}
                              </button>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(p.openingDueBdt, lang)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                              ¥ {p.periodRmb.toLocaleString()}
                              <span className="block text-[10px] text-slate-400 font-normal">{p.conversionCount} টি</span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(p.periodExpectedBdt, lang)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(p.periodReceivedBdt, lang)}
                            </td>
                            <td className={`p-2.5 text-right font-mono font-black ${p.closingDueBdt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {p.closingDueBdt > 0 ? formatCurrency(p.closingDueBdt, lang) : '৳০ (পরিশোধিত)'}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setConversionPartyFilter(p.partyName)}
                                  className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] cursor-pointer"
                                >
                                  দেখুন
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openPartyStatementPrint(p.partyName)}
                                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  title="এই পার্টির আলাদা বিবরণী প্রিন্ট/শেয়ার"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>বিবরণী</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {mainThirdPartyLedgers.summaries.length > 0 && (
                      <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold font-mono">
                        <tr>
                          <td colSpan={2} className="p-2.5 text-right font-sans text-slate-700 dark:text-slate-200">
                            সর্বমোট ({mainThirdPartyLedgers.summaries.length} পার্টি):
                          </td>
                          <td className="p-2.5 text-right text-amber-700 dark:text-amber-300">{formatCurrency(mainThirdPartyLedgers.totals.openingDueBdt, lang)}</td>
                          <td className="p-2.5 text-right text-cyan-700 dark:text-cyan-300">¥ {mainThirdPartyLedgers.totals.periodRmb.toLocaleString()}</td>
                          <td className="p-2.5 text-right text-slate-900 dark:text-white">{formatCurrency(mainThirdPartyLedgers.totals.periodExpectedBdt, lang)}</td>
                          <td className="p-2.5 text-right text-emerald-600">{formatCurrency(mainThirdPartyLedgers.totals.periodReceivedBdt, lang)}</td>
                          <td className="p-2.5 text-right text-rose-600 font-black">{formatCurrency(mainThirdPartyLedgers.totals.closingDueBdt, lang)}</td>
                          <td className="p-2.5"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* Detailed Conversions Ledger Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {conversionPartyFilter === 'all'
                    ? (lang === 'bn' ? 'বিস্তারিত কনভার্শন ভাউচার তালিকা (সকল পার্টি)' : 'Detailed Conversion Vouchers')
                    : `${conversionPartyFilter} — বিস্তারিত কনভার্শন ও পেমেন্ট তালিকা`}
                </h3>
                <span className="text-xs font-mono text-slate-500">{tabFilteredConversions.length} টি ভাউচার</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">ভাউচার & তারিখ</th>
                      <th className="p-3">৩য়-পক্ষ এজেন্ট / পার্টি</th>
                      <th className="p-3 text-right">প্রদত্ত RMB (¥)</th>
                      <th className="p-3 text-center">রেট (৳/¥)</th>
                      <th className="p-3 text-right">প্রত্যাশিত BDT (৳)</th>
                      <th className="p-3 text-right">প্রাপ্ত BDT (৳)</th>
                      <th className="p-3 text-right text-rose-600">বাকি BDT (Due)</th>
                      <th className="p-3 text-center">স্ট্যাটাস</th>
                      <th className="p-3 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tabFilteredConversions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          {lang === 'bn' ? 'নির্বাচিত সময়ে/পার্টিতে কোনো কনভার্শন লেনদেন পাওয়া যায়নি।' : 'No conversions found.'}
                        </td>
                      </tr>
                    ) : (
                      tabFilteredConversions.map((cv) => (
                        <tr key={cv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            <div>{cv.voucherNo}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{cv.date}</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            <button
                              type="button"
                              onClick={() => setConversionPartyFilter(cv.partyName || (cv as any).thirdPartyName || '3rd Party')}
                              className="hover:text-amber-600 cursor-pointer text-left"
                            >
                              <div>{cv.partyName || (cv as any).thirdPartyName || '3rd Party'}</div>
                              {cv.partyPhone && <div className="text-[10px] text-slate-400">{cv.partyPhone}</div>}
                            </button>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                            ¥ {((cv.rmbAmountGiven ?? (cv as any).rmbAmount) || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            {cv.exchangeRate || 0}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(cv.expectedBdtAmount || (cv as any).totalBdtExpected || 0, lang)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(cv.receivedBdtAmount || (cv as any).bdtReceived || 0, lang)}
                          </td>
                          <td className={`p-3 text-right font-mono font-black text-sm ${(cv.remainingDueBdt || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {(cv.remainingDueBdt || 0) > 0 ? formatCurrency(cv.remainingDueBdt, lang) : '০ (Settled)'}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                cv.settlementStatus === 'settled'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : cv.settlementStatus === 'partial'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {cv.settlementStatus === 'settled' ? 'পরিশোধিত' : cv.settlementStatus === 'partial' ? 'আংশিক বাকি' : 'সম্পূর্ণ বাকি'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {cv.remainingDueBdt > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedConversion(cv);
                                    setPayAmountBdt(cv.remainingDueBdt);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] cursor-pointer"
                                >
                                  + টাকা জমা
                                </button>
                              )}
                              <button
                                onClick={() => openEditConversionModal(cv)}
                                title={lang === 'bn' ? 'কনভার্শন এডিট করুন' : 'Edit Conversion'}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => {
                                    if (confirm(lang === 'bn' ? 'রেকর্ডটি ডিলিট করতে চান?' : 'Delete this conversion?')) {
                                      onDeleteConversion(cv.id);
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: 3RD PARTY EXCHANGERS MANAGEMENT (Requirement 1) */}
      {activeTab === 'third_parties' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" />
                <span>{lang === 'bn' ? '৩য়-পক্ষ আরএমবি এক্সচেঞ্জার তালিকা ও প্রোফাইল' : '3rd Party RMB Exchangers Management'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'bn'
                  ? 'যাদের মাধ্যমে আরএমবি রেট সুবিধা পেয়ে BDT তে কনভার্ট করা হয় তাদের সংরক্ষিত তালিকা।'
                  : 'Manage dynamic 3rd party brokers for RMB currency conversion rate comparison.'}
              </p>
            </div>
            <button
              onClick={openNewThirdPartyModal}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'bn' ? '+ নতুন এক্সচেঞ্জার যোগ করুন' : '+ Add 3rd Party Exchanger'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">এক্সচেঞ্জারের নাম</th>
                    <th className="p-3">যোগাযোগকারী</th>
                    <th className="p-3">ফোন নম্বর</th>
                    <th className="p-3">শহর / ঠিকানা</th>
                    <th className="p-3">মোট কনভার্ট লেনদেন</th>
                    <th className="p-3 text-right">বর্তমান বাকি (Due)</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {thirdParties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        <Building className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p>{lang === 'bn' ? 'কোনো ৩য়-পক্ষ এক্সচেঞ্জার যুক্ত করা হয়নি। উপরের বাটনে চাপ দিয়ে যুক্ত করুন।' : 'No 3rd party exchangers added yet.'}</p>
                      </td>
                    </tr>
                  ) : (
                    thirdParties.map((tp, idx) => {
                      const partyConversions = conversions.filter(
                        (cv) => cv.partyName?.toLowerCase() === tp.name.toLowerCase() || (cv as any).thirdPartyName?.toLowerCase() === tp.name.toLowerCase()
                      );
                      const partyDue = partyConversions.reduce((acc, cv) => acc + (Number(cv.remainingDueBdt) || 0), 0);
                      const partyRmb = partyConversions.reduce((acc, cv) => acc + (Number(cv.rmbAmountGiven) || 0), 0);

                      return (
                        <tr key={tp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              <span>{tp.name}</span>
                            </div>
                            {tp.notes && <span className="text-[10px] text-slate-400 block font-normal">{tp.notes}</span>}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{tp.contactPerson || '-'}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{tp.phone || '-'}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{tp.city || tp.address || '-'}</td>
                          <td className="p-3 font-mono">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{partyConversions.length} টি</span>
                            {partyRmb > 0 && <span className="text-[10px] text-cyan-600 dark:text-cyan-400 block">¥ {partyRmb.toLocaleString()}</span>}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-sm">
                            {partyDue > 0 ? (
                              <span className="text-rose-600">৳{partyDue.toLocaleString()}</span>
                            ) : (
                              <span className="text-emerald-600">৳০</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  openNewConversionModal();
                                  setConvPartyName(tp.name);
                                  if (tp.phone) setConvPartyPhone(tp.phone);
                                }}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                                title="এই এক্সচেঞ্জারের মাধ্যমে RMB কনভার্ট করুন"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>{lang === 'bn' ? 'RMB কনভার্ট' : 'Convert'}</span>
                              </button>
                              <button
                                onClick={() => openEditThirdPartyModal(tp)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDeleteThirdPartyConfirm(tp.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CHINA DIRECT BDT PAYMENTS (Requirement 2) */}
      {activeTab === 'china_direct_payments' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {lang === 'bn' ? 'সরাসরি ব্যাংক/ক্যাশ BDT' : 'Direct BDT'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {lang === 'bn' ? 'কোনো ৩য়-পক্ষ এক্সচেঞ্জার ছাড়া' : 'Direct from China Branch'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-1 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-teal-600" />
                <span>{lang === 'bn' ? 'চীন অফিস সরাসরি BDT পেমেন্ট এন্ট্রি খাতা' : 'China Office Direct BDT Inflows'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'bn'
                  ? 'চীন অফিস থেকে ব্যাংক বা ক্যাশে পাঠানো টাকা স্বয়ংক্রিয়ভাবে মোট আয়ে যোগ হবে এবং ROI তে হিসাব প্রতিফলিত হবে।'
                  : 'Direct BDT remittances from China branch automatically calculating into business revenue & ROI reports.'}
              </p>
            </div>

            <button
              onClick={openNewChinaDirectPaymentModal}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'bn' ? '+ নতুন সরাসরি BDT এন্ট্রি' : '+ Add Direct BDT Payment'}</span>
            </button>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-xs text-slate-500 block">{lang === 'bn' ? 'মোট সরাসরি পেমেন্ট সংখ্যা' : 'Total Direct Payments'}</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {filteredChinaDirectPayments.length} {lang === 'bn' ? 'টি' : 'records'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20">
              <span className="text-xs text-teal-700 dark:text-teal-400 block">{lang === 'bn' ? 'চীন হতে প্রাপ্ত মোট সরাসরি BDT' : 'Total Direct BDT Inflow'}</span>
              <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-300 mt-1">
                {formatCurrency(metrics.totalChinaDirectBdt, lang)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20">
              <span className="text-xs text-sky-700 dark:text-sky-400 block">{lang === 'bn' ? 'চীন অফিসে অবশিষ্ট স্টক/পাওনা' : 'China Office Net Balance'}</span>
              <div className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-300 mt-1">
                {formatCurrency(metrics.chinaRemainingStockBdt, lang)}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">তারিখ & রেফারেন্স</th>
                    <th className="p-3">শাখা অফিস</th>
                    <th className="p-3">পেমেন্ট মাধ্যম</th>
                    <th className="p-3">ব্যাংক / অ্যাকাউন্ট বিবরণ</th>
                    <th className="p-3 text-right">টাকার পরিমাণ (BDT)</th>
                    <th className="p-3">মন্তব্য</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredChinaDirectPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        <Banknote className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p>{lang === 'bn' ? 'কোনো সরাসরি BDT পেমেন্ট এন্ট্রি পাওয়া যায়নি।' : 'No direct BDT payments found.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredChinaDirectPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          <div>#{p.referenceNo}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.date}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{p.branchName}</td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{p.bankAccountDetails || '-'}</td>
                        <td className="p-3 text-right font-mono font-black text-sm text-teal-600 dark:text-teal-400">
                          {formatCurrency(p.amountBdt, lang)}
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{p.notes || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditChinaDirectPaymentModal(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteChinaPaymentConfirm(p.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: New Consignment Modal */}
      {isConsignmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-xs animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'bn' ? 'শাখা অফিসে পণ্য প্রেরণের নতুন চালান' : 'Dispatch Consignment to Branch'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'বাংলাদেশ থেকে মালামাল (IC, CPU, ক্যামেরা) পাঠানোর চালান তৈরি করুন' : 'Record exported items and dispatch details'}
                </p>
              </div>
              <button onClick={() => setIsConsignmentModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConsignmentForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">চালান নং</label>
                  <input
                    type="text"
                    value={formConsignmentNo}
                    onChange={(e) => setFormConsignmentNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">শাখা অফিসের নাম</label>
                  <input
                    type="text"
                    value={formBranchName}
                    onChange={(e) => setFormBranchName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    প্রেরিত মালামালের তালিকা (Items to Send)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] cursor-pointer flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>আইটেম যোগ করুন</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="col-span-4">
                        <label className="text-[10px] text-slate-400 block">মালের নাম (IC, CPU, ক্যামেরা ইত্যাদি)</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="e.g. CPU IC, eMMC, Camera"
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-semibold"
                          required
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block">পরিমাণ</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono font-bold"
                          required
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block">দর BDT (৳)</label>
                        <input
                          type="number"
                          value={item.unitCostBdt}
                          onChange={(e) => handleItemChange(item.id, 'unitCostBdt', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                          required
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block">আনুমানিক RMB দর (¥)</label>
                        <input
                          type="number"
                          step="any"
                          value={item.estimatedRmbRate || ''}
                          onChange={(e) => handleItemChange(item.id, 'estimatedRmbRate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono font-bold text-cyan-600"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer pt-3"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-xs font-bold pt-2 px-1">
                  <span>মোট বাংলাদেশ মূল্য: <strong className="font-mono text-blue-600">{formatCurrency(formItems.reduce((acc, i) => acc + (Number(i.totalCostBdt) || 0), 0), lang)}</strong></span>
                  <span>আনুমানিক মোট RMB: <strong className="font-mono text-cyan-600">¥ {formItems.reduce((acc, i) => acc + (Number(i.estimatedRmbTotal) || 0), 0).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">শিপিং মাধ্যম</label>
                  <select
                    value={formShippingMethod}
                    onChange={(e) => setFormShippingMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Air Cargo">Air Cargo (এয়ার কার্গো)</option>
                    <option value="Sea Cargo">Sea Cargo (সমুদ্র পথে)</option>
                    <option value="Hand Carry">Hand Carry (হ্যান্ড ক্যারি)</option>
                    <option value="Courier">Courier (কুরিয়ার)</option>
                    <option value="Other">Other (অন্যান্য)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ট্র্যাকিং নম্বর</label>
                  <input
                    type="text"
                    value={formTrackingNo}
                    onChange={(e) => setFormTrackingNo(e.target.value)}
                    placeholder="e.g. DHL-123456"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">শিপিং খরচ BDT (৳)</label>
                  <input
                    type="number"
                    value={formShippingCost || ''}
                    onChange={(e) => setFormShippingCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">মন্তব্য / নোট</label>
                <input
                  type="text"
                  value={formConsignmentNotes}
                  onChange={(e) => setFormConsignmentNotes(e.target.value)}
                  placeholder="প্যাকেটের সংখ্যা, ওজন বা অন্যান্য বিশেষ নির্দেশনা..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsConsignmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  চালান সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: New Remittance Modal */}
      {isRemittanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan-600" />
                <span>শাখা অফিস থেকে প্রেরিত RMB প্রাপ্তি</span>
              </h3>
              <button onClick={() => setIsRemittanceModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRemittanceForm} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={remitDate}
                  onChange={(e) => setRemitDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">শাখা অফিসের নাম</label>
                <input
                  type="text"
                  value={remitBranchName}
                  onChange={(e) => setRemitBranchName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-cyan-600 dark:text-cyan-400 mb-1 text-sm">
                  প্রাপ্ত RMB পরিমাণ (¥) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={remitAmount || ''}
                  onChange={(e) => setRemitAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2.5 rounded-xl border border-cyan-400 dark:border-cyan-700 bg-white dark:bg-slate-800 font-mono font-black text-lg text-cyan-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">প্রাপ্তির মাধ্যম</label>
                <select
                  value={remitVia}
                  onChange={(e) => setRemitVia(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="WeChat Pay">WeChat Pay (উইচ্যাট পে)</option>
                  <option value="Alipay">Alipay (আলীপে)</option>
                  <option value="Chinese Bank">Chinese Bank Transfer (চাইনিজ ব্যাংক)</option>
                  <option value="Cash">Cash RMB (নগদ আরএমবি)</option>
                  <option value="Other">Other (অন্যান্য)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">অ্যাকাউন্ট ডিটেইলস</label>
                <input
                  type="text"
                  value={remitAccount}
                  onChange={(e) => setRemitAccount(e.target.value)}
                  placeholder="e.g. WeChat ID বা Bank Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">নোট / মন্তব্য</label>
                <input
                  type="text"
                  value={remitNotes}
                  onChange={(e) => setRemitNotes(e.target.value)}
                  placeholder="কোন চালানের টাকা ইত্যাদি..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsRemittanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer shadow-md"
                >
                  RMB প্রাপ্তি সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: New 3rd Party Conversion Modal */}
      {isConversionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                <span>৩য়-পক্ষ আরএমবি টু টাকা (RMB ➔ BDT) কনভার্শন</span>
              </h3>
              <button onClick={() => setIsConversionModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConversionForm} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={convDate}
                    onChange={(e) => setConvDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ভাউচার নং</label>
                  <input
                    type="text"
                    value={convVoucherNo}
                    onChange={(e) => setConvVoucherNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Pick from saved 3rd parties or add new dynamically (Requirement 1) */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-purple-900 dark:text-purple-300 text-xs">
                    {lang === 'bn' ? 'সেভ করা ৩য়-পক্ষ এক্সচেঞ্জার নির্বাচন করুন:' : 'Select Saved 3rd Party Exchanger:'}
                  </label>
                  <button
                    type="button"
                    onClick={openNewThirdPartyModal}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-xs transition-transform active:scale-95"
                    title="নতুন ৩য়-পক্ষ আরএমবি এক্সচেঞ্জার যুক্ত করুন"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? '+ নতুন এক্সচেঞ্জার' : '+ Add Exchanger'}</span>
                  </button>
                </div>
                <select
                  value={thirdParties.find(tp => tp.name.toLowerCase() === convPartyName.toLowerCase())?.id || ''}
                  onChange={(e) => {
                    const tp = thirdParties.find(p => p.id === e.target.value);
                    if (tp) {
                      setConvPartyName(tp.name);
                      if (tp.phone) setConvPartyPhone(tp.phone);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- এক্সচেঞ্জার তালিকা হতে নির্বাচন করুন অথবা নিচে লিখুন --</option>
                  {thirdParties.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.name} {tp.phone ? `(${tp.phone})` : ''} {tp.city ? `- ${tp.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ৩য়-পক্ষ এজেন্ট / ব্যক্তির নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={convPartyName}
                    onChange={(e) => setConvPartyName(e.target.value)}
                    placeholder="e.g. তারেক মানি এক্সচেঞ্জ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={convPartyPhone}
                    onChange={(e) => setConvPartyPhone(e.target.value)}
                    placeholder="017..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-900 dark:text-amber-400 mb-1">
                    প্রদত্ত RMB পরিমাণ (¥) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={convRmbAmount || ''}
                    onChange={(e) => setConvRmbAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono font-black text-amber-700 dark:text-amber-300"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-900 dark:text-amber-400 mb-1">
                    এক্সচেঞ্জ রেট (BDT/RMB) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={convRate}
                    onChange={(e) => setConvRate(parseFloat(e.target.value) || 0)}
                    placeholder="16.85"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    required
                  />
                </div>

                <div className="col-span-2 pt-1 border-t border-amber-200 dark:border-amber-900/40 flex justify-between font-bold">
                  <span className="text-slate-600 dark:text-slate-400">প্রত্যাশিত মোট টাকা (Expected BDT):</span>
                  <span className="font-mono text-base text-slate-900 dark:text-white">
                    {formatCurrency(Math.round(convRmbAmount * convRate), lang)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-600 mb-1">এখনই প্রাপ্ত টাকা (BDT)</label>
                  <input
                    type="number"
                    value={convReceivedBdt || ''}
                    onChange={(e) => setConvReceivedBdt(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={convPaymentMethod}
                    onChange={(e) => setConvPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="bank_transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                    <option value="cash">Cash BDT (নগদ টাকা)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="nagad">Nagad (নগদ)</option>
                    <option value="multiple">Multiple (একাধিক মাধ্যম)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl font-bold">
                <span className="text-slate-600 dark:text-slate-400">এজেন্টের কাছে বাকি থাকবে (Due):</span>
                <span className="font-mono text-rose-600 text-sm">
                  {formatCurrency(Math.max(0, Math.round(convRmbAmount * convRate) - convReceivedBdt), lang)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ব্যাংক বিবরণী / মন্তব্য</label>
                <input
                  type="text"
                  value={convBankDetails}
                  onChange={(e) => setConvBankDetails(e.target.value)}
                  placeholder="ব্যাংক অ্যাকাউন্ট বা চেক নম্বর..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsConversionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer shadow-md"
                >
                  কনভার্শন সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Installment Payment Collection Modal */}
      {isPaymentModalOpen && selectedConversion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>৩য়-পক্ষ থেকে টাকা আদায় / জমা</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 font-mono text-xs">
              <div className="font-bold text-slate-900 dark:text-white">{selectedConversion.partyName}</div>
              <div className="text-slate-500">ভাউচার: {selectedConversion.voucherNo}</div>
              <div className="text-rose-600 font-bold">
                বর্তমান বাকি: {formatCurrency(selectedConversion.remainingDueBdt, lang)}
              </div>
            </div>

            <form onSubmit={handleAddPaymentToConversion} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-600 mb-1">জমার পরিমাণ BDT (৳) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedConversion.remainingDueBdt}
                  value={payAmountBdt}
                  onChange={(e) => setPayAmountBdt(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-400 bg-white dark:bg-slate-800 font-mono font-black text-base text-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">মাধ্যম</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="bank_transfer">Bank Transfer (ব্যাংক)</option>
                  <option value="cash">Cash (নগদ)</option>
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="nagad">Nagad (নগদ)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ব্যাংক ডিটেইলস / মন্তব্য</label>
                <input
                  type="text"
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
                  placeholder="রেফারেন্স বা বিবরণ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Add/Edit 3rd Party Exchanger Modal (Requirement 1) */}
      {isThirdPartyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-xs animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-600" />
                  <span>{editingThirdParty ? (lang === 'bn' ? '৩য়-পক্ষ এক্সচেঞ্জার সম্পাদনা' : 'Edit 3rd Party') : (lang === 'bn' ? 'নতুন ৩য়-পক্ষ এক্সচেঞ্জার যুক্ত করুন' : 'Add 3rd Party Exchanger')}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'bn' ? 'RMB কনভার্ট করার জন্য এক্সচেঞ্জারের প্রোফাইল তথ্য সেভ করুন' : 'Save 3rd party broker contact & profile'}
                </p>
              </div>
              <button onClick={() => setIsThirdPartyModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleThirdPartySubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  এক্সচেঞ্জার / এজেন্টের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tpName}
                  onChange={(e) => setTpName(e.target.value)}
                  placeholder="e.g. আকাশ মানি এক্সচেঞ্জ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">যোগাযোগকারী ব্যক্তি</label>
                  <input
                    type="text"
                    value={tpContactPerson}
                    onChange={(e) => setTpContactPerson(e.target.value)}
                    placeholder="e.g. তারেক ভাই"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={tpPhone}
                    onChange={(e) => setTpPhone(e.target.value)}
                    placeholder="017..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">শহর (City)</label>
                  <input
                    type="text"
                    value={tpCity}
                    onChange={(e) => setTpCity(e.target.value)}
                    placeholder="e.g. ঢাকা / গুয়াংজু"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ইমেইল / উইচ্যাট আইডি</label>
                  <input
                    type="text"
                    value={tpEmail}
                    onChange={(e) => setTpEmail(e.target.value)}
                    placeholder="wechat / email..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-amber-600 dark:text-amber-400 mb-1">
                  প্রারম্ভিক জের / ব্যালেন্স (Opening B/L ৳)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tpOpeningBalance || ''}
                  onChange={(e) => setTpOpeningBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono font-bold text-amber-700 dark:text-amber-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={tpAddress}
                  onChange={(e) => setTpAddress(e.target.value)}
                  placeholder="অফিস বা দোকানের ঠিকানা..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">মন্তব্য / রেট সুবিধা সংক্রান্ত নোট</label>
                <textarea
                  value={tpNotes}
                  onChange={(e) => setTpNotes(e.target.value)}
                  placeholder="রেট ভালো দেয়, দ্রুত ক্যাশ করে ইত্যাদি..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsThirdPartyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {editingThirdParty ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Add/Edit China Direct Payment Modal (Requirement 2) */}
      {isChinaPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-xs animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-teal-600" />
                  <span>{editingChinaPayment ? (lang === 'bn' ? 'সরাসরি পেমেন্ট সম্পাদনা' : 'Edit Direct Payment') : (lang === 'bn' ? 'চীন অফিস সরাসরি BDT পেমেন্ট এন্ট্রি' : 'China Office Direct BDT Payment')}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {lang === 'bn' ? 'চীন অফিস সরাসরি ব্যাংক বা ক্যাশে BDT পাঠালে এখানে এন্ট্রি করুন' : 'Direct remittances from China branch without 3rd party brokers'}
                </p>
              </div>
              <button onClick={() => setIsChinaPaymentModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChinaDirectPaymentSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={cdpDate}
                    onChange={(e) => setCdpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">রেফারেন্স / ভাউচার</label>
                  <input
                    type="text"
                    value={cdpRefNo}
                    onChange={(e) => setCdpRefNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">চীন শাখা অফিসের নাম</label>
                <input
                  type="text"
                  value={cdpBranchName}
                  onChange={(e) => setCdpBranchName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-teal-600 dark:text-teal-400 mb-1">
                    টাকার পরিমাণ (BDT ৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={cdpAmountBdt || ''}
                    onChange={(e) => setCdpAmountBdt(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 rounded-xl border border-teal-400 dark:border-teal-700 bg-white dark:bg-slate-800 font-mono font-black text-base text-teal-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={cdpPaymentMethod}
                    onChange={(e) => setCdpPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="bank_transfer">Bank Transfer (ব্যাংক)</option>
                    <option value="cash">Cash (নগদ টাকা)</option>
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="nagad">Nagad (নগদ)</option>
                    <option value="other">Other (অন্যান্য)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ব্যাংক অ্যাকাউন্ট / ট্রানজেকশন বিবরণ</label>
                <input
                  type="text"
                  value={cdpBankDetails}
                  onChange={(e) => setCdpBankDetails(e.target.value)}
                  placeholder="e.g. ডাচ বাংলা ব্যাংক A/C: 123... / ক্যাশ ভাউচার"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">মন্তব্য / বিবরণ</label>
                <input
                  type="text"
                  value={cdpNotes}
                  onChange={(e) => setCdpNotes(e.target.value)}
                  placeholder="চীন অফিস হতে সরাসরি পাঠানো..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsChinaPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {editingChinaPayment ? 'আপডেট করুন' : 'পেমেন্ট সংরক্ষণ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT VIEW MODAL FOR CONSIGNMENT */}
      {printingConsignment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div id="consignment-print-area" className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider">{companyInfo.name}</h1>
                <p className="text-xs text-slate-500"><CompanyAddresses info={companyInfo} /></p>
                <p className="text-xs text-slate-500">{companyInfo.phones?.join(', ')}</p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase font-bold text-slate-400">Consignment Dispatch Note</div>
                <div className="text-lg font-mono font-black text-blue-600">{printingConsignment.consignmentNo}</div>
                <div className="text-xs text-slate-500">{printingConsignment.date}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border">
              <div>
                <span className="font-bold text-slate-500 block">প্রাপক শাখা অফিস (Destination):</span>
                <span className="font-bold text-sm text-slate-900">{printingConsignment.branchName}</span>
                <span className="block text-slate-500">{printingConsignment.destinationCity}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-500 block">শিপিং বিবরণ:</span>
                <span className="font-semibold">{printingConsignment.shippingMethod}</span>
                {printingConsignment.trackingNo && <span className="block font-mono">Track: {printingConsignment.trackingNo}</span>}
              </div>
            </div>

            <table className="w-full text-left text-xs border">
              <thead className="bg-slate-100 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">পণ্যের নাম</th>
                  <th className="p-2 border text-right">পরিমাণ</th>
                  <th className="p-2 border text-right">দর (BDT)</th>
                  <th className="p-2 border text-right">মোট (BDT)</th>
                  <th className="p-2 border text-right">RMB (¥)</th>
                </tr>
              </thead>
              <tbody>
                {printingConsignment.items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 border text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border font-semibold">{it.name}</td>
                    <td className="p-2 border text-right font-mono font-bold">{it.quantity} {it.unit}</td>
                    <td className="p-2 border text-right font-mono">{it.unitCostBdt || 0}</td>
                    <td className="p-2 border text-right font-mono font-bold">{(it.totalCostBdt || 0).toLocaleString()} ৳</td>
                    <td className="p-2 border text-right font-mono text-cyan-700">¥ {(it.estimatedRmbTotal ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-bold bg-slate-50">
                <tr>
                  <td colSpan={4} className="p-2 border text-right">সর্বমোট (Grand Total):</td>
                  <td className="p-2 border text-right font-mono text-sm">{(printingConsignment.totalBdtValue || 0).toLocaleString()} ৳</td>
                  <td className="p-2 border text-right font-mono text-sm text-cyan-700">¥ {(printingConsignment.totalRmbEstimated ?? 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between items-end pt-12 text-xs">
              <div className="border-t border-slate-400 pt-1 text-center w-36">প্রস্তুতকারক স্বাক্ষর</div>
              <div className="border-t border-slate-400 pt-1 text-center w-36">কর্তৃপক্ষ অনুমোদন</div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t print:hidden">
              <button
                onClick={() => setPrintingConsignment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer font-bold text-xs"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => executePrint('consignment-print-area', `${companyInfo.name} - Consignment ${printingConsignment.consignmentNo}`)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDEPENDENT BRANCH STATEMENT PREVIEW & SELECTION MODAL (User Requirement) */}
      {isBranchStatementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-4xl p-6 sm:p-8 space-y-5 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center gap-3">
                <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-12 h-12" />
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">{companyInfo.name}</h1>
                  <p className="text-xs text-slate-500"><CompanyAddresses info={companyInfo} /> • {companyInfo.phones?.join(', ')}</p>
                  <p className="text-xs font-semibold text-blue-700 mt-0.5">
                    {lang === 'bn' ? 'শাখা ও আরএমবি পৃথক বিবরণী প্রিন্ট ও শেয়ার সেন্টার' : 'Branch Office & RMB Statement Center'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBranchStatementModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statement Type Selector Tabs */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-600 block">
                {lang === 'bn' ? 'কোন বিবরণীটি প্রিন্ট বা শেয়ার করতে চান নির্বাচন করুন:' : 'Select Statement to Print or Share:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  onClick={() => setStatementType('third_party')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    statementType === 'third_party'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-2 ring-amber-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lang === 'bn' ? '১. ৩য়-পক্ষ RMB কনভার্সন' : '1. 3rd Party RMB'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {lang === 'bn' ? 'পার্টিকে দেওয়ার জন্য (চায়না চালান বা খরচ গোপন থাকবে)' : 'For 3rd party brokers without China costs'}
                  </p>
                </button>

                <button
                  onClick={() => setStatementType('consignments')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    statementType === 'consignments'
                      ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'bn' ? '২. প্রেরিত মাল চালান' : '2. Sent Consignments'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {lang === 'bn' ? 'চীন শাখা অফিসে প্রেরিত সকল পণ্যের তালিকা' : 'Goods exported to China branch'}
                  </p>
                </button>

                <button
                  onClick={() => setStatementType('remittances')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    statementType === 'remittances'
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm ring-2 ring-cyan-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-cyan-600" />
                    <span>{lang === 'bn' ? '৩. শাখা RMB প্রাপ্তি' : '3. Branch RMB Inflow'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {lang === 'bn' ? 'চীন শাখা হতে পাওয়া সকল RMB রেমিট্যান্স' : 'All RMB received from China'}
                  </p>
                </button>

                <button
                  onClick={() => setStatementType('combined')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    statementType === 'combined'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm ring-2 ring-indigo-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{lang === 'bn' ? '৪. সার্বিক পূর্ণ বিবরণী' : '4. Combined Statement'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {lang === 'bn' ? 'মালিকদের অভ্যন্তরীণ সব খাতা একসাথে' : 'Full internal consolidated sheet'}
                  </p>
                </button>
              </div>
            </div>

            {/* Dynamic Filter Controls: Month-Wise Period + Party/Branch Selector */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              {/* Month-Wise Period Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'bn' ? 'মাস / সময়কাল নির্বাচন:' : 'Statement Period:'}</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 font-medium">
                    <button
                      type="button"
                      onClick={() => setStatementPeriodMode('month')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        statementPeriodMode === 'month'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'bn' ? 'মাস অনুযায়ী' : 'Month'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementPeriodMode('today')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        statementPeriodMode === 'today'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'bn' ? 'আজকের' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementPeriodMode('all')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        statementPeriodMode === 'all'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'bn' ? 'সকল সময়' : 'All Time'}
                    </button>
                  </div>

                  {statementPeriodMode === 'month' && (
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 px-2 py-1 rounded-xl">
                      <button
                        type="button"
                        onClick={handlePrevStatementMonth}
                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title={lang === 'bn' ? 'আগের মাস' : 'Previous Month'}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="month"
                        value={statementMonth}
                        onChange={(e) => setStatementMonth(e.target.value)}
                        className="bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={handleNextStatementMonth}
                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title={lang === 'bn' ? 'পরের মাস' : 'Next Month'}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
              {statementType === 'third_party' && (
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <label className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 shrink-0">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lang === 'bn' ? 'পার্টি নির্বাচন (আলাদা বিবরণী):' : 'Filter by 3rd Party:'}</span>
                  </label>
                  <select
                    value={statementPartyFilter}
                    onChange={(e) => setStatementPartyFilter(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">{lang === 'bn' ? '👥 সকল ৩য়-পক্ষ এক্সচেঞ্জার (একত্রে)' : '👥 All 3rd Parties (Combined)'}</option>
                    {thirdParties.map((tp) => (
                      <option key={tp.id} value={tp.name}>
                        👤 {tp.name} {tp.phone ? `(${tp.phone})` : ''} {tp.city ? `- ${tp.city}` : ''}
                      </option>
                    ))}
                    {Array.from(new Set(conversions.map((c) => c.partyName || (c as any).thirdPartyName).filter(Boolean)))
                      .filter((name) => !thirdParties.some((tp) => tp.name === name))
                      .map((name) => (
                        <option key={name} value={name}>👤 {name}</option>
                      ))}
                  </select>
                </div>
              )}

              {(statementType === 'consignments' || statementType === 'remittances') && (
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <label className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 shrink-0">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'bn' ? 'চীন শাখা অফিস নির্বাচন (আলাদা বিবরণী):' : 'Filter by China Branch:'}</span>
                  </label>
                  <select
                    value={statementBranchFilter}
                    onChange={(e) => setStatementBranchFilter(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">{lang === 'bn' ? '🇨🇳 সকল শাখা অফিস (একত্রে)' : '🇨🇳 All Branch Offices (Combined)'}</option>
                    {Array.from(
                      new Set([
                        ...consignments.map((c) => c.branchName),
                        ...remittances.map((r) => r.branchName),
                        'চীন/গুয়াংজু শাখা অফিস',
                      ].filter(Boolean))
                    ).map((bName) => (
                      <option key={bName} value={bName}>🏢 {bName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-semibold ml-auto">
                <span className="text-indigo-700 font-bold mr-2">[{statementPeriodLabel}]</span>
                {statementType === 'third_party' && (
                  statementPartyFilter === 'all'
                    ? `${statementConversions.length} টি কনভার্শন রেকর্ড (সকল পার্টি)`
                    : `"${statementPartyFilter}" এর জন্য একক বিবরণী (${statementConversions.length} টি রেকর্ড)`
                )}
                {statementType === 'consignments' && (
                  statementBranchFilter === 'all'
                    ? `${statementConsignments.length} টি চালান রেকর্ড (সকল শাখা)`
                    : `"${statementBranchFilter}" এর জন্য একক চালান (${statementConsignments.length} টি)`
                )}
                {statementType === 'remittances' && (
                  statementBranchFilter === 'all'
                    ? `${statementRemittances.length} টি রেমিট্যান্স রেকর্ড (সকল শাখা)`
                    : `"${statementBranchFilter}" এর জন্য একক RMB হিস্ট্রি (${statementRemittances.length} টি)`
                )}
                {statementType === 'combined' && `${statementCombinedConsignments.length} চালান • ${statementCombinedRemittances.length} RMB • ${statementCombinedConversions.length} কনভার্শন`}
              </div>
              </div>
            </div>

            {/* PREVIEW: 1. Third Party RMB Statement */}
            {statementType === 'third_party' && (
              <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {lang === 'bn' ? '৩য়-পক্ষ RMB ➔ BDT কনভার্সন ও জমা-বকেয়া স্টেটমেন্ট প্রিভিউ' : '3rd Party RMB to BDT Statement Preview'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {statementPeriodLabel} • {statementPartyFilter === 'all'
                        ? (lang === 'bn' ? `পার্টি-ভিত্তিক আলাদা হিসাব (${statementPartyGroups.length} টি পার্টি)` : 'All 3rd parties grouped separately')
                        : `পার্টি: ${statementPartyFilter}`}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs space-y-0.5">
                    {statementPartyMetrics.hasWindow && (
                      <div className="text-[11px] text-amber-700 font-bold">
                        গত মাসের জের (Opening): ৳{statementPartyMetrics.openingDue.toLocaleString()}
                      </div>
                    )}
                    <div className="font-bold text-rose-600">
                      সমাপনী বাকি (Closing): ৳{statementPartyMetrics.closingDue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 4-Box Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white p-2.5 rounded-xl border border-amber-200/70">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">গত মাসের জের (Opening):</span>
                    <strong className="text-amber-700">৳{statementPartyMetrics.openingDue.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">চলতি RMB কনভার্ট:</span>
                    <strong className="text-cyan-700">¥{statementPartyMetrics.totalRmb.toLocaleString()}</strong>
                    <span className="text-[10px] text-slate-400 block">প্রাপ্য: ৳{statementPartyMetrics.totalExpected.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">মোট জমা প্রাপ্তি (BDT):</span>
                    <strong className="text-emerald-600">৳{statementPartyMetrics.totalReceived.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">সমাপনী বাকি (Closing):</span>
                    <strong className="text-rose-600">৳{statementPartyMetrics.closingDue.toLocaleString()}</strong>
                  </div>
                </div>

                {/* 3rd Party-Wise Summary Table when Viewing All */}
                {statementPartyFilter === 'all' && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-900">
                      পার্টি-ভিত্তিক আলাদা আলাদা সারসংক্ষেপ (যেকোনো পার্টিতে ক্লিক করলে তার একক বিবরণী আসবে):
                    </div>
                    <div className="overflow-x-auto max-h-48 border rounded-xl bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase sticky top-0">
                          <tr>
                            <th className="p-2 text-white">৩য়-পক্ষ পার্টি</th>
                            <th className="p-2 text-right text-amber-300">গত মাসের জের</th>
                            <th className="p-2 text-right text-cyan-300">RMB (¥)</th>
                            <th className="p-2 text-right text-white">প্রাপ্য BDT</th>
                            <th className="p-2 text-right text-emerald-300">জমা BDT</th>
                            <th className="p-2 text-right text-rose-300">সমাপনী বাকি</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-[11px]">
                          {statementPartyGroups.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">
                                নির্বাচিত সময়ে কোনো পার্টি লেনদেন বা জের নেই।
                              </td>
                            </tr>
                          ) : (
                            statementPartyGroups.map((g) => (
                              <tr
                                key={g.partyKey}
                                onClick={() => setStatementPartyFilter(g.partyName)}
                                className="hover:bg-amber-50 cursor-pointer"
                              >
                                <td className="p-2 font-bold text-indigo-700 underline decoration-dotted">{g.partyName}</td>
                                <td className="p-2 text-right font-mono text-amber-700">৳{g.openingDueBdt.toLocaleString()}</td>
                                <td className="p-2 text-right font-mono font-bold text-cyan-700">¥{g.periodRmb.toLocaleString()}</td>
                                <td className="p-2 text-right font-mono">৳{g.periodExpectedBdt.toLocaleString()}</td>
                                <td className="p-2 text-right font-mono text-emerald-600">৳{g.periodReceivedBdt.toLocaleString()}</td>
                                <td className={`p-2 text-right font-mono font-bold ${g.closingDueBdt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  ৳{g.closingDueBdt.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Per-Party Ledger Details Preview */}
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {statementPartyGroups.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 bg-white rounded-xl border text-xs">
                      নির্বাচিত সময়ে কোনো লেনদেন পাওয়া যায়নি।
                    </div>
                  ) : (
                    statementPartyGroups.map((g) => (
                      <div key={g.partyKey} className="border rounded-xl bg-white overflow-hidden">
                        <div className="px-3 py-2 bg-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                          <span className="text-slate-900">👤 {g.partyName} {g.phone ? `(${g.phone})` : ''}</span>
                          <span className="font-mono text-slate-600">
                            জের: <strong className="text-amber-700">৳{g.openingDueBdt.toLocaleString()}</strong> • বাকি: <strong className="text-rose-600">৳{g.closingDueBdt.toLocaleString()}</strong>
                          </span>
                        </div>
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 font-bold text-[10px] text-slate-600 border-b">
                            <tr>
                              <th className="p-1.5">ভাউচার & তারিখ</th>
                              <th className="p-1.5 text-right">RMB (¥)</th>
                              <th className="p-1.5 text-center">রেট</th>
                              <th className="p-1.5 text-right">প্রাপ্য BDT</th>
                              <th className="p-1.5 text-right">জমা BDT</th>
                              <th className="p-1.5 text-right text-rose-600">জের/ব্যালেন্স</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr className="bg-amber-50/70 font-semibold">
                              <td colSpan={5} className="p-1.5 text-amber-900">প্রারম্ভিক জের (গত মাসের সমাপনী)</td>
                              <td className="p-1.5 text-right font-mono text-amber-800">৳{g.openingDueBdt.toLocaleString()}</td>
                            </tr>
                            {g.entries.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-2 text-center text-slate-400">এই সময়ে নতুন লেনদেন নেই (জের বহনকৃত)</td>
                              </tr>
                            ) : (
                              g.entries.map((tx) => (
                                <tr key={tx.id}>
                                  <td className="p-1.5 font-mono font-bold">
                                    {tx.voucherNo}
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      {tx.date}{tx.kind === 'collection' ? ' • পূর্বের জের আদায়' : ''}
                                    </div>
                                  </td>
                                  <td className="p-1.5 text-right font-mono font-bold text-cyan-700">
                                    {tx.rmbAmount > 0 ? `¥${tx.rmbAmount.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="p-1.5 text-center font-mono">{tx.exchangeRate > 0 ? tx.exchangeRate : '-'}</td>
                                  <td className="p-1.5 text-right font-mono font-bold">
                                    {tx.expectedBdt > 0 ? `৳${tx.expectedBdt.toLocaleString()}` : '-'}
                                  </td>
                                  <td className="p-1.5 text-right font-mono text-emerald-600 font-bold">৳{tx.receivedBdt.toLocaleString()}</td>
                                  <td className={`p-1.5 text-right font-mono font-bold ${tx.runningBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    ৳{tx.runningBalance.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PREVIEW: 2. Consignments Sent Statement */}
            {statementType === 'consignments' && (
              <div className="border border-blue-200 rounded-2xl p-4 bg-blue-50/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {lang === 'bn' ? 'চীন শাখা অফিসে প্রেরিত মালামাল চালান বিবরণী প্রিভিউ' : 'Consignments Sent to China Branch Preview'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {statementPeriodLabel} • {statementBranchFilter === 'all' ? 'সকল শাখা অফিস' : `শাখা: ${statementBranchFilter}`} • চলতি প্রেরণ: ৳{statementConsignmentMetrics.totalBdt.toLocaleString()}
                    </p>
                  </div>
                  {statementConsignmentMetrics.hasWindow && (
                    <div className="text-right font-mono text-[11px]">
                      <div className="text-amber-700 font-bold">গত মাসের জের: ৳{statementConsignmentMetrics.openingBdt.toLocaleString()}</div>
                      <div className="text-blue-700 font-bold">সমাপনী মোট: ৳{statementConsignmentMetrics.closingBdt.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto max-h-64 border rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-[10px] uppercase text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2">চালান নং & তারিখ</th>
                        <th className="p-2">শাখা ও গন্তব্য</th>
                        <th className="p-2">আইটেম বিবরণ</th>
                        <th className="p-2 text-right">মূল্য (BDT)</th>
                        <th className="p-2 text-right">RMB (¥)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[11px]">
                      {statementConsignmentMetrics.hasWindow && (
                        <tr className="bg-amber-50/70 font-bold">
                          <td colSpan={3} className="p-2 text-amber-900">গত মাসের প্রারম্ভিক জের ({statementConsignmentMetrics.priorCount} টি পূর্বের চালান)</td>
                          <td className="p-2 text-right font-mono text-amber-800">৳{statementConsignmentMetrics.openingBdt.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-amber-800">¥{statementConsignmentMetrics.openingRmb.toLocaleString()}</td>
                        </tr>
                      )}
                      {statementConsignments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            নির্বাচিত সময়ে কোনো চালান পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        statementConsignments.map((c) => (
                          <tr key={c.id}>
                            <td className="p-2 font-mono font-bold">{c.consignmentNo}<div className="text-[10px] text-slate-400 font-normal">{c.date}</div></td>
                            <td className="p-2">{c.branchName}</td>
                            <td className="p-2">{c.items?.map((i) => `${i.name} (${formatSheetNumber(i.quantity, lang)} ${i.unit})`).join(', ')}</td>
                            <td className="p-2 text-right font-mono font-bold">৳{(c.totalBdtValue || 0).toLocaleString()}</td>
                            <td className="p-2 text-right font-mono font-bold text-cyan-700">¥{(c.totalRmbEstimated ?? 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW: 3. Remittances Statement */}
            {statementType === 'remittances' && (
              <div className="border border-cyan-200 rounded-2xl p-4 bg-cyan-50/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-200 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {lang === 'bn' ? 'চীন শাখা হতে প্রাপ্ত RMB রেমিট্যান্স হিস্ট্রি প্রিভিউ' : 'China Branch RMB Remittances Preview'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {statementPeriodLabel} • {statementBranchFilter === 'all' ? 'সকল শাখা অফিস' : `শাখা: ${statementBranchFilter}`} • চলতি প্রাপ্ত RMB: ¥{statementRemittanceMetrics.totalRmb.toLocaleString()}
                    </p>
                  </div>
                  {statementRemittanceMetrics.hasWindow && (
                    <div className="text-right font-mono text-[11px]">
                      <div className="text-amber-700 font-bold">গত মাসের জের: ¥{statementRemittanceMetrics.openingRmb.toLocaleString()}</div>
                      <div className="text-cyan-700 font-bold">সমাপনী মোট: ¥{statementRemittanceMetrics.closingRmb.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto max-h-64 border rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-[10px] uppercase text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2">রেফারেন্স নং & তারিখ</th>
                        <th className="p-2">শাখা অফিস</th>
                        <th className="p-2">মাধ্যম (Channel)</th>
                        <th className="p-2 text-right">প্রাপ্ত RMB (¥)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[11px]">
                      {statementRemittanceMetrics.hasWindow && (
                        <tr className="bg-amber-50/70 font-bold">
                          <td colSpan={3} className="p-2 text-amber-900">গত মাসের প্রারম্ভিক জের ({statementRemittanceMetrics.priorCount} টি পূর্বের এন্ট্রি)</td>
                          <td className="p-2 text-right font-mono text-amber-800">¥{statementRemittanceMetrics.openingRmb.toLocaleString()}</td>
                        </tr>
                      )}
                      {statementRemittances.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400">
                            নির্বাচিত সময়ে কোনো RMB রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        statementRemittances.map((r) => (
                          <tr key={r.id}>
                            <td className="p-2 font-mono font-bold">{r.referenceNo}<div className="text-[10px] text-slate-400 font-normal">{r.date}</div></td>
                            <td className="p-2">{r.branchName}</td>
                            <td className="p-2">{r.receivedVia}</td>
                            <td className="p-2 text-right font-mono font-bold text-cyan-700">¥{(r.rmbAmount || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW: 4. Combined Statement */}
            {statementType === 'combined' && (
              <div className="border border-indigo-200 rounded-2xl p-4 bg-indigo-50/30 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {lang === 'bn' ? 'সার্বিক কমপ্লিট শাখা ও আরএমবি বিবরণী প্রিভিউ' : 'Combined Full Branch Statement Preview'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {statementPeriodLabel} • {lang === 'bn' ? 'গত মাসের জেরসহ চালান, আরএমবি এবং ৩য়-পক্ষ পার্টি-ভিত্তিক হিসাব সমন্বিত' : 'Carry-forward balances, Consignments, Remittances & Conversions'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white p-3 rounded-xl border">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">গত মাসের জের (চীন পাওনা):</span>
                    <strong className="text-amber-700">৳{(statementCombinedMetrics.openingChinaDueBdt ?? 0).toLocaleString()}</strong>
                    <span className="text-[10px] text-slate-400 block">হাতে RMB জের: ¥{(statementCombinedMetrics.openingRmbInHand ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">মোট প্রেরিত স্টক (+):</span>
                    <strong>৳{(statementCombinedMetrics.totalBdtSent ?? 0).toLocaleString()}</strong>
                    <span className="text-[10px] text-cyan-600 block">শাখা RMB: ¥{(statementCombinedMetrics.totalRmbReceived ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">RMB কনভার্ট / সরাসরি:</span>
                    <strong className="text-emerald-600">¥{(statementCombinedMetrics.totalRmbConverted ?? 0).toLocaleString()}</strong>
                    <span className="text-[10px] text-slate-500 block">৳{((statementCombinedMetrics.rmbConvertedBdt ?? 0) + (statementCombinedMetrics.totalChinaDirectBdt ?? 0)).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">চীন সমাপনী পাওনা (=):</span>
                    <strong className="text-cyan-600">৳{(statementCombinedMetrics.chinaRemainingStockBdt ?? 0).toLocaleString()}</strong>
                    <span className="text-[10px] text-rose-600 block">৩য়-পক্ষ বাকি: ৳{(statementCombinedMetrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
              <div className="text-xs text-slate-500">
                সময়কাল: <strong className="text-slate-700">{statementPeriodLabel}</strong> • মুদ্রণ: {new Date().toLocaleDateString('bn-BD')}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsBranchStatementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer font-bold text-xs"
                >
                  বন্ধ করুন
                </button>

                {/* Print button for the active statement */}
                <button
                  onClick={() => {
                    const targetId =
                      statementType === 'third_party'
                        ? 'rsr-3rd-party-rmb-statement'
                        : statementType === 'consignments'
                        ? 'rsr-china-consignments-statement'
                        : statementType === 'remittances'
                        ? 'rsr-china-remittances-statement'
                        : 'rsr-branch-office-statement';
                    const docTitle =
                      statementType === 'third_party'
                        ? `RSR - 3rd Party RMB Statement (${statementPeriodLabel})`
                        : statementType === 'consignments'
                        ? `RSR - China Consignments Statement (${statementPeriodLabel})`
                        : statementType === 'remittances'
                        ? `RSR - China Remittances Statement (${statementPeriodLabel})`
                        : `RSR - Branch Office Full Statement (${statementPeriodLabel})`;
                    executePrint(targetId, docTitle);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'প্রিন্ট করুন (A4)' : 'Print A4'}</span>
                </button>

                {/* PDF Download for active statement */}
                <button
                  type="button"
                  disabled={isStatementPdfExporting}
                  onClick={async () => {
                    const targetId =
                      statementType === 'third_party'
                        ? 'rsr-3rd-party-rmb-statement'
                        : statementType === 'consignments'
                        ? 'rsr-china-consignments-statement'
                        : statementType === 'remittances'
                        ? 'rsr-china-remittances-statement'
                        : 'rsr-branch-office-statement';
                    const periodTag = statementPeriodMode === 'month' ? statementMonth : statementPeriodMode;
                    setIsStatementPdfExporting(true);
                    await exportElementToPdf(targetId, `rsr-${statementType}-${periodTag}.pdf`);
                    setIsStatementPdfExporting(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>

                {/* WhatsApp Share for active statement */}
                <WhatsAppShareDropdown
                  lang={lang}
                  buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}
                  targetElementId={
                    statementType === 'third_party'
                      ? 'rsr-3rd-party-rmb-statement'
                      : statementType === 'consignments'
                      ? 'rsr-china-consignments-statement'
                      : statementType === 'remittances'
                      ? 'rsr-china-remittances-statement'
                      : 'rsr-branch-office-statement'
                  }
                  fileName={`rsr-${statementType}-${statementPeriodMode === 'month' ? statementMonth : statementPeriodMode}-${statementType === 'third_party' ? (statementPartyFilter !== 'all' ? statementPartyFilter.replace(/[\s/]/g, '_') : 'all_parties') : (statementBranchFilter !== 'all' ? statementBranchFilter.replace(/[\s/]/g, '_') : 'all_branches')}.png`}
                  getText={() => {
                    if (statementType === 'third_party') {
                      const partyLabel = statementPartyFilter !== 'all' ? statementPartyFilter : 'সকল ৩য়-পক্ষ এক্সচেঞ্জার';
                      const partyLines = statementPartyFilter === 'all' && statementPartyGroups.length > 0
                        ? '\n' + statementPartyGroups.map((g) => `• ${g.partyName}: জের ৳${g.openingDueBdt.toLocaleString()} | ¥${g.periodRmb.toLocaleString()} | জমা ৳${g.periodReceivedBdt.toLocaleString()} | বাকি ৳${g.closingDueBdt.toLocaleString()}`).join('\n')
                        : '';
                      return `*${companyInfo.name} - ৩য়-পক্ষ RMB হিসাব*
👤 এক্সচেঞ্জার: *${partyLabel}*
📅 সময়কাল: *${statementPeriodLabel}*
━━━━━━━━━━━━━━━━━━━━
📌 গত মাসের জের (Opening): ৳${statementPartyMetrics.openingDue.toLocaleString()}
🔄 চলতি RMB কনভার্ট: ¥${statementPartyMetrics.totalRmb.toLocaleString()} (প্রাপ্য ৳${statementPartyMetrics.totalExpected.toLocaleString()})
💵 মোট জমা প্রাপ্তি (BDT): ৳${statementPartyMetrics.totalReceived.toLocaleString()}
⚠️ সমাপনী বাকি (Closing Due): ৳${statementPartyMetrics.closingDue.toLocaleString()}${partyLines}
━━━━━━━━━━━━━━━━━━━━
_${companyInfo.name}_`;
                    }
                    if (statementType === 'consignments') {
                      const branchLabel = statementBranchFilter !== 'all' ? statementBranchFilter : 'সকল শাখা অফিস';
                      const openLine = statementConsignmentMetrics.hasWindow
                        ? `📌 গত মাসের জের: ৳${statementConsignmentMetrics.openingBdt.toLocaleString()} (¥${statementConsignmentMetrics.openingRmb.toLocaleString()})\n`
                        : '';
                      return `*${companyInfo.name} - চীন শাখা চালান বিবরণী*
🏢 শাখা অফিস: *${branchLabel}*
📅 সময়কাল: *${statementPeriodLabel}*
━━━━━━━━━━━━━━━━━━━━
${openLine}📦 চলতি চালান: ${statementConsignments.length} টি — ৳${statementConsignmentMetrics.totalBdt.toLocaleString()} (≈ ¥${statementConsignmentMetrics.totalRmb.toLocaleString()})
💰 সমাপনী মোট: ৳${statementConsignmentMetrics.closingBdt.toLocaleString()} (≈ ¥${statementConsignmentMetrics.closingRmb.toLocaleString()})
━━━━━━━━━━━━━━━━━━━━
_${companyInfo.name}_`;
                    }
                    if (statementType === 'remittances') {
                      const branchLabel = statementBranchFilter !== 'all' ? statementBranchFilter : 'সকল শাখা অফিস';
                      const openLine = statementRemittanceMetrics.hasWindow
                        ? `📌 গত মাসের জের RMB: ¥${statementRemittanceMetrics.openingRmb.toLocaleString()}\n`
                        : '';
                      return `*${companyInfo.name} - চীন শাখা RMB প্রাপ্তি*
🏢 শাখা অফিস: *${branchLabel}*
📅 সময়কাল: *${statementPeriodLabel}*
━━━━━━━━━━━━━━━━━━━━
${openLine}🪙 চলতি প্রাপ্ত RMB: ¥${statementRemittanceMetrics.totalRmb.toLocaleString()} (${statementRemittances.length} টি রেকর্ড)
🏦 সমাপনী মোট প্রাপ্ত RMB: ¥${statementRemittanceMetrics.closingRmb.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
_${companyInfo.name}_`;
                    }
                    const combinedOpenLine = statementCombinedMetrics.hasWindow
                      ? `📌 গত মাসের জের (চীন পাওনা): ৳${(statementCombinedMetrics.openingChinaDueBdt ?? 0).toLocaleString()} | হাতে RMB জের: ¥${(statementCombinedMetrics.openingRmbInHand ?? 0).toLocaleString()}\n`
                      : '';
                    return `*${companyInfo.name} - সার্বিক শাখা অফিস ও আরএমবি স্টেটমেন্ট*
📅 সময়কাল: *${statementPeriodLabel}*
━━━━━━━━━━━━━━━━━━━━
${combinedOpenLine}📦 প্রেরিত মাল: ৳${(statementCombinedMetrics.totalBdtSent ?? 0).toLocaleString()}
💰 শাখা RMB প্রাপ্তি: ¥${(statementCombinedMetrics.totalRmbReceived ?? 0).toLocaleString()}
🪙 হাতে সমাপনী RMB: ¥${(statementCombinedMetrics.rmbBalanceInHand ?? 0).toLocaleString()}
🔄 ৩য়-পক্ষ কনভার্ট: ¥${(statementCombinedMetrics.totalRmbConverted ?? 0).toLocaleString()}
💵 প্রাপ্ত টাকা: ৳${(statementCombinedMetrics.totalBdtReceived ?? 0).toLocaleString()}
🏦 চীন সরাসরি BDT: ৳${(statementCombinedMetrics.totalChinaDirectBdt ?? 0).toLocaleString()}
⚠️ ৩য়-পক্ষ সমাপনী বাকি: ৳${(statementCombinedMetrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}
🇨🇳 চীন সমাপনী পাওনা: ৳${(statementCombinedMetrics.chinaRemainingStockBdt ?? 0).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
_${companyInfo.name}_`;
                  }}
                />

                {/* WeChat Share for active statement */}
                <WeChatShareDropdown
                  lang={lang}
                  buttonLabel={lang === 'bn' ? 'উইচ্যাট' : 'WeChat'}
                  targetElementId={
                    statementType === 'third_party'
                      ? 'rsr-3rd-party-rmb-statement'
                      : statementType === 'consignments'
                      ? 'rsr-china-consignments-statement'
                      : statementType === 'remittances'
                      ? 'rsr-china-remittances-statement'
                      : 'rsr-branch-office-statement'
                  }
                  fileName={`rsr-wechat-${statementType}-${statementPeriodMode === 'month' ? statementMonth : statementPeriodMode}-${statementType === 'third_party' ? (statementPartyFilter !== 'all' ? statementPartyFilter.replace(/[\s/]/g, '_') : 'all_parties') : (statementBranchFilter !== 'all' ? statementBranchFilter.replace(/[\s/]/g, '_') : 'all_branches')}.png`}
                  getText={() => {
                    if (statementType === 'third_party') {
                      const partyLabel = statementPartyFilter !== 'all' ? statementPartyFilter : 'All 3rd Parties';
                      const partyLines = statementPartyFilter === 'all' && statementPartyGroups.length > 0
                        ? '\n' + statementPartyGroups.map((g) => `- ${g.partyName}: Opening ৳${g.openingDueBdt.toLocaleString()} | ¥${g.periodRmb.toLocaleString()} | Paid ৳${g.periodReceivedBdt.toLocaleString()} | Closing Due ৳${g.closingDueBdt.toLocaleString()}`).join('\n')
                        : '';
                      return `${companyInfo.name} - 3rd Party RMB Statement\nParty: ${partyLabel}\nPeriod: ${statementPeriodLabel}\nOpening Due: ৳${statementPartyMetrics.openingDue.toLocaleString()}\nRMB Converted: ¥${statementPartyMetrics.totalRmb.toLocaleString()}\nBDT Received: ৳${statementPartyMetrics.totalReceived.toLocaleString()}\nClosing Due BDT: ৳${statementPartyMetrics.closingDue.toLocaleString()}${partyLines}`;
                    }
                    if (statementType === 'consignments') {
                      const branchLabel = statementBranchFilter !== 'all' ? statementBranchFilter : 'All Branches';
                      const openLine = statementConsignmentMetrics.hasWindow
                        ? `\nOpening Carried Forward: ৳${statementConsignmentMetrics.openingBdt.toLocaleString()} (¥${statementConsignmentMetrics.openingRmb.toLocaleString()})`
                        : '';
                      return `${companyInfo.name} - China Consignments Statement\nBranch: ${branchLabel}\nPeriod: ${statementPeriodLabel}${openLine}\nPeriod Consignments: ${statementConsignments.length} — ৳${statementConsignmentMetrics.totalBdt.toLocaleString()} (¥${statementConsignmentMetrics.totalRmb.toLocaleString()})\nClosing Total: ৳${statementConsignmentMetrics.closingBdt.toLocaleString()} (¥${statementConsignmentMetrics.closingRmb.toLocaleString()})`;
                    }
                    if (statementType === 'remittances') {
                      const branchLabel = statementBranchFilter !== 'all' ? statementBranchFilter : 'All Branches';
                      const openLine = statementRemittanceMetrics.hasWindow
                        ? `\nOpening RMB: ¥${statementRemittanceMetrics.openingRmb.toLocaleString()}`
                        : '';
                      return `${companyInfo.name} - China RMB Remittances\nBranch: ${branchLabel}\nPeriod: ${statementPeriodLabel}${openLine}\nPeriod RMB Received: ¥${statementRemittanceMetrics.totalRmb.toLocaleString()} (${statementRemittances.length} entries)\nClosing Total RMB: ¥${statementRemittanceMetrics.closingRmb.toLocaleString()}`;
                    }
                    const combinedOpenLine = statementCombinedMetrics.hasWindow
                      ? `\nOpening China Due: ৳${(statementCombinedMetrics.openingChinaDueBdt ?? 0).toLocaleString()} | Opening RMB: ¥${(statementCombinedMetrics.openingRmbInHand ?? 0).toLocaleString()}`
                      : '';
                    return `${companyInfo.name} - Combined Branch & RMB Statement\nPeriod: ${statementPeriodLabel}${combinedOpenLine}\nSent: ৳${(statementCombinedMetrics.totalBdtSent ?? 0).toLocaleString()}\nRMB Remitted: ¥${(statementCombinedMetrics.totalRmbReceived ?? 0).toLocaleString()}\nClosing RMB Balance: ¥${(statementCombinedMetrics.rmbBalanceInHand ?? 0).toLocaleString()}\nRMB Converted: ¥${(statementCombinedMetrics.totalRmbConverted ?? 0).toLocaleString()}\nBDT Received: ৳${(statementCombinedMetrics.totalBdtReceived ?? 0).toLocaleString()}\nClosing 3rd Party Due: ৳${(statementCombinedMetrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}\nClosing China Net Due: ৳${(statementCombinedMetrics.chinaRemainingStockBdt ?? 0).toLocaleString()}`;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFF-SCREEN 1-PAGE A4 CAPTURE ELEMENTS (4 DISTINCT TARGETS) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 1, pointerEvents: 'none', zIndex: -100 }}>
        {/* TARGET 1: 3RD PARTY RMB CONVERSIONS ONLY (NO FACTORY CONSIGNMENTS) */}
        <div
          id="rsr-3rd-party-rmb-statement"
          style={{
            width: '794px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '32px',
            boxSizing: 'border-box',
            fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-14 h-14" />
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  {companyInfo.name}
                </h1>
                <p style={{ margin: '1px 0', fontSize: '11px', color: '#475569' }}>
                  {companyInfo.businessTypeBn}
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>
                  <CompanyAddresses info={companyInfo} /> • মোবা: {(companyInfo.phones || []).join(', ')}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                ৩য়-পক্ষ মানি এক্সচেঞ্জ বিবরণী {statementPartyFilter !== 'all' ? `• ${statementPartyFilter}` : ''}
              </div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {statementPartyFilter !== 'all' ? `${statementPartyFilter} - RMB কনভার্সন খাতা` : '৩য়-পক্ষ RMB কনভার্সন ও জমা-বকেয়া খাতা'}
              </h2>
              <div style={{ fontSize: '10px', color: '#1e293b', marginTop: '2px' }}>
                সময়কাল: <strong>{statementPeriodLabel}</strong> • মুদ্রণ: {todayStr}
              </div>
            </div>
          </div>

          {/* Key Metrics Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ borderLeft: '3px solid #d97706', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>গত মাসের জের (Opening)</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400e' }}>৳{statementPartyMetrics.openingDue.toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>পূর্ববর্তী সমাপনী বাকি</div>
            </div>
            <div style={{ borderLeft: '3px solid #0891b2', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>চলতি RMB কনভার্ট</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>¥{statementPartyMetrics.totalRmb.toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>প্রাপ্য: ৳{statementPartyMetrics.totalExpected.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #059669', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>মোট জমা প্রাপ্ত টাকা (BDT)</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>৳{statementPartyMetrics.totalReceived.toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>{statementPartyMetrics.entryCount} টি লেনদেন</div>
            </div>
            <div style={{ borderLeft: '3px solid #e11d48', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>সমাপনী বাকি (Closing Due)</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#e11d48' }}>৳{statementPartyMetrics.closingDue.toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#e11d48' }}>জের + প্রাপ্য - জমা</div>
            </div>
          </div>

          {/* When All 3rd Parties selected: Section A = Party-Wise Summary Table */}
          {statementPartyFilter === 'all' && statementPartyGroups.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', textTransform: 'uppercase' }}>
                ১. ৩য়-পক্ষ পার্টি-ভিত্তিক আলাদা হিসাব সারসংক্ষেপ ({statementPeriodLabel})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '5px', textAlign: 'center', width: '26px', border: '1px solid #334155' }}>#</th>
                    <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #334155' }}>৩য়-পক্ষ পার্টি</th>
                    <th style={{ padding: '5px', textAlign: 'right', width: '88px', border: '1px solid #334155' }}>গত মাসের জের</th>
                    <th style={{ padding: '5px', textAlign: 'right', width: '74px', border: '1px solid #334155' }}>RMB (¥)</th>
                    <th style={{ padding: '5px', textAlign: 'right', width: '86px', border: '1px solid #334155' }}>প্রাপ্য BDT</th>
                    <th style={{ padding: '5px', textAlign: 'right', width: '86px', border: '1px solid #334155' }}>জমা BDT</th>
                    <th style={{ padding: '5px', textAlign: 'right', width: '92px', border: '1px solid #334155' }}>সমাপনী বাকি</th>
                  </tr>
                </thead>
                <tbody>
                  {statementPartyGroups.map((g, idx) => (
                    <tr key={g.partyKey} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '4px 5px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: '4px 5px', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {g.partyName} {g.phone ? `(${g.phone})` : ''}
                      </td>
                      <td style={{ padding: '4px 5px', textAlign: 'right', color: '#b45309', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ৳{g.openingDueBdt.toLocaleString()}
                      </td>
                      <td style={{ padding: '4px 5px', textAlign: 'right', color: '#0891b2', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ¥{g.periodRmb.toLocaleString()}
                      </td>
                      <td style={{ padding: '4px 5px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ৳{g.periodExpectedBdt.toLocaleString()}
                      </td>
                      <td style={{ padding: '4px 5px', textAlign: 'right', color: '#059669', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ৳{g.periodReceivedBdt.toLocaleString()}
                      </td>
                      <td style={{ padding: '4px 5px', textAlign: 'right', color: g.closingDueBdt > 0 ? '#e11d48' : '#059669', fontWeight: 800, border: '1px solid #cbd5e1' }}>
                        ৳{g.closingDueBdt.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                    <td colSpan={2} style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1' }}>সর্বমোট ({statementPartyGroups.length} পার্টি):</td>
                    <td style={{ padding: '5px', textAlign: 'right', color: '#b45309', border: '1px solid #cbd5e1' }}>৳{statementPartyMetrics.openingDue.toLocaleString()}</td>
                    <td style={{ padding: '5px', textAlign: 'right', color: '#0891b2', border: '1px solid #cbd5e1' }}>¥{statementPartyMetrics.totalRmb.toLocaleString()}</td>
                    <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1' }}>৳{statementPartyMetrics.totalExpected.toLocaleString()}</td>
                    <td style={{ padding: '5px', textAlign: 'right', color: '#059669', border: '1px solid #cbd5e1' }}>৳{statementPartyMetrics.totalReceived.toLocaleString()}</td>
                    <td style={{ padding: '5px', textAlign: 'right', color: '#e11d48', border: '1px solid #cbd5e1' }}>৳{statementPartyMetrics.closingDue.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Section B: Separate Per-Party Detailed Conversion Ledgers */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', textTransform: 'uppercase' }}>
              {statementPartyFilter === 'all'
                ? `২. পার্টি-ভিত্তিক আলাদা আলাদা বিস্তারিত লেনদেন খাতা (${statementPeriodLabel})`
                : `${statementPartyFilter} — বিস্তারিত কনভার্সন ও জের খাতা (${statementPeriodLabel})`}
            </div>
            {statementPartyGroups.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                নির্বাচিত সময়ে কোনো কনভার্শন রেকর্ড বা জের নেই।
              </div>
            ) : (
              statementPartyGroups.map((g, gIdx) => (
                <div key={g.partyKey} style={{ marginBottom: '12px', breakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderBottom: 'none', padding: '5px 8px', fontSize: '10px', fontWeight: 800, color: '#78350f' }}>
                    <span>
                      {statementPartyFilter === 'all' ? `${gIdx + 1}. ` : ''}{g.partyName} {g.phone ? `• ${g.phone}` : ''}
                    </span>
                    <span>
                      প্রারম্ভিক জের: ৳{g.openingDueBdt.toLocaleString()} | সমাপনী বাকি: ৳{g.closingDueBdt.toLocaleString()}
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        <th style={{ padding: '5px', textAlign: 'center', width: '24px', border: '1px solid #334155' }}>#</th>
                        <th style={{ padding: '5px', textAlign: 'left', width: '70px', border: '1px solid #334155' }}>তারিখ</th>
                        <th style={{ padding: '5px', textAlign: 'left', width: '82px', border: '1px solid #334155' }}>ভাউচার / বিবরণ</th>
                        <th style={{ padding: '5px', textAlign: 'right', width: '68px', border: '1px solid #334155' }}>RMB (¥)</th>
                        <th style={{ padding: '5px', textAlign: 'right', width: '44px', border: '1px solid #334155' }}>রেট</th>
                        <th style={{ padding: '5px', textAlign: 'right', width: '78px', border: '1px solid #334155' }}>প্রাপ্য BDT</th>
                        <th style={{ padding: '5px', textAlign: 'right', width: '78px', border: '1px solid #334155' }}>জমা BDT</th>
                        <th style={{ padding: '5px', textAlign: 'right', width: '82px', border: '1px solid #334155' }}>জের/ব্যালেন্স</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: '#fffbeb', fontWeight: 700 }}>
                        <td style={{ padding: '4px 5px', textAlign: 'center', border: '1px solid #cbd5e1' }}>-</td>
                        <td style={{ padding: '4px 5px', border: '1px solid #cbd5e1' }}>Opening</td>
                        <td colSpan={5} style={{ padding: '4px 5px', border: '1px solid #cbd5e1', color: '#92400e' }}>
                          প্রারম্ভিক জের (গত মাসের সমাপনী বাকি)
                        </td>
                        <td style={{ padding: '4px 5px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#b45309' }}>
                          ৳{g.openingDueBdt.toLocaleString()}
                        </td>
                      </tr>
                      {g.entries.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                            এই সময়ে নতুন কোনো লেনদেন নেই।
                          </td>
                        </tr>
                      ) : (
                        g.entries.map((tx, idx) => (
                          <tr key={tx.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '4px 5px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                            <td style={{ padding: '4px 5px', border: '1px solid #cbd5e1' }}>{tx.date}</td>
                            <td style={{ padding: '4px 5px', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                              {tx.voucherNo}
                              {tx.kind === 'collection' && (
                                <span style={{ display: 'block', fontSize: '9px', fontWeight: 500, color: '#059669' }}>পূর্বের জের আদায়</span>
                              )}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'right', color: '#0891b2', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                              {tx.rmbAmount > 0 ? `¥${tx.rmbAmount.toLocaleString()}` : '-'}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                              {tx.exchangeRate > 0 ? tx.exchangeRate : '-'}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                              {tx.expectedBdt > 0 ? `৳${tx.expectedBdt.toLocaleString()}` : '-'}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'right', color: '#059669', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                              ৳{tx.receivedBdt.toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'right', color: tx.runningBalance > 0 ? '#e11d48' : '#059669', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                              ৳{tx.runningBalance.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan={3} style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                          {g.partyName} মোট / সমাপনী জের:
                        </td>
                        <td style={{ padding: '5px', textAlign: 'right', color: '#0891b2', border: '1px solid #cbd5e1' }}>¥{g.periodRmb.toLocaleString()}</td>
                        <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}></td>
                        <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1' }}>৳{g.periodExpectedBdt.toLocaleString()}</td>
                        <td style={{ padding: '5px', textAlign: 'right', color: '#059669', border: '1px solid #cbd5e1' }}>৳{g.periodReceivedBdt.toLocaleString()}</td>
                        <td style={{ padding: '5px', textAlign: 'right', color: g.closingDueBdt > 0 ? '#e11d48' : '#059669', border: '1px solid #cbd5e1' }}>৳{g.closingDueBdt.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))
            )}
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '50px', paddingTop: '16px' }}>
            <div style={{ textAlign: 'center', width: '160px' }}>
              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '4px', fontSize: '10px', color: '#334155', fontWeight: 600 }}>
                ৩য়-পক্ষ এজেন্টের স্বাক্ষর
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '11px', color: '#0f172a', fontWeight: 700 }}>
                কর্তৃপক্ষের স্বাক্ষর ও সিলমোহর
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                {companyInfo.name}
              </div>
            </div>
          </div>
        </div>

        {/* TARGET 2: CHINA CONSIGNMENTS STATEMENT */}
        <div
          id="rsr-china-consignments-statement"
          style={{
            width: '794px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '32px',
            boxSizing: 'border-box',
            fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-14 h-14" />
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{companyInfo.name}</h1>
                <p style={{ margin: '1px 0', fontSize: '11px', color: '#475569' }}>{companyInfo.businessTypeBn}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}><CompanyAddresses info={companyInfo} /> • মোবা: {(companyInfo.phones || []).join(', ')}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                চীন শাখা চালান খাতা {statementBranchFilter !== 'all' ? `• ${statementBranchFilter}` : ''}
              </div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {statementBranchFilter !== 'all' ? `${statementBranchFilter} - প্রেরিত চালান বিবরণী` : 'চীন শাখা অফিসে প্রেরিত মালামাল চালান বিবরণী'}
              </h2>
              <div style={{ fontSize: '10px', color: '#1e293b', marginTop: '2px' }}>সময়কাল: <strong>{statementPeriodLabel}</strong> • মুদ্রণ: {todayStr}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ borderLeft: '3px solid #d97706', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>গত মাসের জের (Opening)</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>৳{statementConsignmentMetrics.openingBdt.toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>≈ ¥{statementConsignmentMetrics.openingRmb.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>চলতি চালান ({statementConsignments.length} টি)</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>৳{statementConsignmentMetrics.totalBdt.toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#0891b2' }}>≈ ¥{statementConsignmentMetrics.totalRmb.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>সমাপনী মোট (BDT)</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>৳{statementConsignmentMetrics.closingBdt.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #0891b2', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>সমাপনী মোট RMB (¥)</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0891b2' }}>¥{statementConsignmentMetrics.closingRmb.toLocaleString()}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '6px', textAlign: 'center', width: '28px', border: '1px solid #334155' }}>#</th>
                <th style={{ padding: '6px', textAlign: 'left', width: '88px', border: '1px solid #334155' }}>চালান নং</th>
                <th style={{ padding: '6px', textAlign: 'left', width: '70px', border: '1px solid #334155' }}>তারিখ</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #334155' }}>গন্তব্য ও শিপিং</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '58px', border: '1px solid #334155' }}>আইটেম</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '98px', border: '1px solid #334155' }}>মূল্য (BDT)</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '88px', border: '1px solid #334155' }}>RMB (¥)</th>
              </tr>
            </thead>
            <tbody>
              {statementConsignmentMetrics.hasWindow && (
                <tr style={{ backgroundColor: '#fffbeb', fontWeight: 700 }}>
                  <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #cbd5e1' }}>-</td>
                  <td colSpan={4} style={{ padding: '5px', border: '1px solid #cbd5e1', color: '#92400e' }}>
                    গত মাসের প্রারম্ভিক জের ({statementConsignmentMetrics.priorCount} টি পূর্ববর্তী চালান)
                  </td>
                  <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#b45309' }}>৳{statementConsignmentMetrics.openingBdt.toLocaleString()}</td>
                  <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#b45309' }}>¥{statementConsignmentMetrics.openingRmb.toLocaleString()}</td>
                </tr>
              )}
              {statementConsignments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                    নির্বাচিত সময়ে কোনো নতুন চালান রেকর্ড নেই।
                  </td>
                </tr>
              ) : (
                statementConsignments.map((c, idx) => (
                  <tr key={c.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                    <td style={{ padding: '5px', fontWeight: 700, border: '1px solid #cbd5e1' }}>{c.consignmentNo}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>{c.date}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>{c.branchName} ({c.shippingMethod})</td>
                    <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{c.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0}</td>
                    <td style={{ padding: '5px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>৳{(c.totalBdtValue || 0).toLocaleString()}</td>
                    <td style={{ padding: '5px', textAlign: 'right', color: '#0891b2', fontWeight: 700, border: '1px solid #cbd5e1' }}>¥{(c.totalRmbEstimated ?? 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                <td colSpan={5} style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                  {statementConsignmentMetrics.hasWindow
                    ? `সমাপনী সর্বমোট (জের + চলতি ${statementConsignments.length} টি চালান):`
                    : `মোট (${statementConsignments.length} টি চালান):`}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>৳{statementConsignmentMetrics.closingBdt.toLocaleString()}</td>
                <td style={{ padding: '6px', textAlign: 'right', color: '#0891b2', border: '1px solid #cbd5e1' }}>¥{statementConsignmentMetrics.closingRmb.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '50px', paddingTop: '16px' }}>
            <div style={{ textAlign: 'center', width: '160px' }}>
              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '4px', fontSize: '10px', color: '#334155', fontWeight: 600 }}>
                শাখা অফিস প্রাপক
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '11px', color: '#0f172a', fontWeight: 700 }}>
                কর্তৃপক্ষের স্বাক্ষর ও সিলমোহর
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{companyInfo.name}</div>
            </div>
          </div>
        </div>

        {/* TARGET 3: CHINA RMB REMITTANCES STATEMENT */}
        <div
          id="rsr-china-remittances-statement"
          style={{
            width: '794px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '32px',
            boxSizing: 'border-box',
            fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-14 h-14" />
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{companyInfo.name}</h1>
                <p style={{ margin: '1px 0', fontSize: '11px', color: '#475569' }}>{companyInfo.businessTypeBn}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}><CompanyAddresses info={companyInfo} /> • মোবা: {(companyInfo.phones || []).join(', ')}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                চীন শাখা RMB প্রাপ্তি {statementBranchFilter !== 'all' ? `• ${statementBranchFilter}` : ''}
              </div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {statementBranchFilter !== 'all' ? `${statementBranchFilter} - RMB প্রাপ্তি বিবরণী` : 'চীন শাখা অফিস হতে RMB প্রাপ্তি হিস্ট্রি বিবরণী'}
              </h2>
              <div style={{ fontSize: '10px', color: '#1e293b', marginTop: '2px' }}>সময়কাল: <strong>{statementPeriodLabel}</strong> • মুদ্রণ: {todayStr}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ borderLeft: '3px solid #d97706', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>গত মাসের জের RMB</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#92400e' }}>¥{statementRemittanceMetrics.openingRmb.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #0891b2', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>চলতি RMB প্রাপ্তি ({statementRemittances.length} টি)</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0891b2' }}>¥{statementRemittanceMetrics.totalRmb.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>সমাপনী মোট RMB</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>¥{statementRemittanceMetrics.closingRmb.toLocaleString()}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '6px', textAlign: 'center', width: '30px', border: '1px solid #334155' }}>#</th>
                <th style={{ padding: '6px', textAlign: 'left', width: '100px', border: '1px solid #334155' }}>রেফারেন্স নং</th>
                <th style={{ padding: '6px', textAlign: 'left', width: '80px', border: '1px solid #334155' }}>তারিখ</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #334155' }}>শাখা অফিস</th>
                <th style={{ padding: '6px', textAlign: 'left', width: '100px', border: '1px solid #334155' }}>মাধ্যম</th>
                <th style={{ padding: '6px', textAlign: 'right', width: '110px', border: '1px solid #334155' }}>প্রাপ্ত RMB (¥)</th>
              </tr>
            </thead>
            <tbody>
              {statementRemittanceMetrics.hasWindow && (
                <tr style={{ backgroundColor: '#fffbeb', fontWeight: 700 }}>
                  <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #cbd5e1' }}>-</td>
                  <td colSpan={4} style={{ padding: '5px', border: '1px solid #cbd5e1', color: '#92400e' }}>
                    গত মাসের প্রারম্ভিক জের ({statementRemittanceMetrics.priorCount} টি পূর্ববর্তী এন্ট্রি)
                  </td>
                  <td style={{ padding: '5px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#b45309' }}>¥{statementRemittanceMetrics.openingRmb.toLocaleString()}</td>
                </tr>
              )}
              {statementRemittances.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                    নির্বাচিত সময়ে কোনো নতুন RMB রেকর্ড নেই।
                  </td>
                </tr>
              ) : (
                statementRemittances.map((r, idx) => (
                  <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                    <td style={{ padding: '5px', fontWeight: 700, border: '1px solid #cbd5e1' }}>{r.referenceNo}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>{r.date}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>{r.branchName}</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>{r.receivedVia}</td>
                    <td style={{ padding: '5px', textAlign: 'right', fontWeight: 700, color: '#0891b2', border: '1px solid #cbd5e1' }}>¥{(r.rmbAmount || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                <td colSpan={5} style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                  {statementRemittanceMetrics.hasWindow
                    ? `সমাপনী মোট প্রাপ্ত RMB (জের + চলতি ${statementRemittances.length} টি):`
                    : `সর্বমোট প্রাপ্ত RMB (${statementRemittances.length} টি):`}
                </td>
                <td style={{ padding: '6px', textAlign: 'right', color: '#0891b2', border: '1px solid #cbd5e1' }}>¥{statementRemittanceMetrics.closingRmb.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '50px', paddingTop: '16px' }}>
            <div style={{ textAlign: 'center', width: '160px' }}>
              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '4px', fontSize: '10px', color: '#334155', fontWeight: 600 }}>
                শাখা হিসাবরক্ষক
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '11px', color: '#0f172a', fontWeight: 700 }}>
                কর্তৃপক্ষের স্বাক্ষর ও সিলমোহর
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{companyInfo.name}</div>
            </div>
          </div>
        </div>

        {/* TARGET 4: COMBINED FULL STATEMENT */}
        <div
          id="rsr-branch-office-statement"
          style={{
            width: '794px',
            minHeight: '1123px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '32px',
            boxSizing: 'border-box',
            fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-14 h-14" />
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                  {companyInfo.name}
                </h1>
                <p style={{ margin: '1px 0', fontSize: '11px', color: '#475569' }}>
                  {companyInfo.businessTypeBn}
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>
                  <CompanyAddresses info={companyInfo} /> • মোবা: {(companyInfo.phones || []).join(', ')}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                শাখা অফিস & আরএমবি খাতা
              </div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                শাখা অফিস ও ৩য়-পক্ষ সার্বিক পূর্ণ বিবরণী
              </h2>
              <div style={{ fontSize: '10px', color: '#1e293b', marginTop: '2px' }}>
                সময়কাল: <strong>{effectiveCombinedPeriodLabel}</strong> • মুদ্রণ: {todayStr}
              </div>
            </div>
          </div>

          {/* Key Metrics Banner (with Opening -> Closing Carry-Forward) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>মোট চালান পাঠানো</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>৳{(statementCombinedMetrics.totalBdtSent ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#0891b2' }}>≈ ¥{(statementCombinedMetrics.totalRmbEstSent ?? 0).toLocaleString()} ({statementCombinedConsignments.length} টি)</div>
            </div>
            <div style={{ borderLeft: '3px solid #0891b2', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>শাখা হতে প্রাপ্ত RMB</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0891b2' }}>¥{(statementCombinedMetrics.totalRmbReceived ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>{statementCombinedRemittances.length} টি প্রাপ্তি</div>
            </div>
            <div style={{ borderLeft: '3px solid #059669', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>হাতে সমাপনী RMB</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>¥{(statementCombinedMetrics.rmbBalanceInHand ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>
                {statementCombinedMetrics.hasWindow
                  ? `জের: ¥${(statementCombinedMetrics.openingRmbInHand ?? 0).toLocaleString()} | কনভার্ট: ¥${(statementCombinedMetrics.totalRmbConverted ?? 0).toLocaleString()}`
                  : `কনভার্ট: ¥${(statementCombinedMetrics.totalRmbConverted ?? 0).toLocaleString()}`}
              </div>
            </div>
            <div style={{ borderLeft: '3px solid #e11d48', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>চীন সমাপনী পাওনা</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#e11d48' }}>৳{(statementCombinedMetrics.chinaRemainingStockBdt ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#059669' }}>
                {statementCombinedMetrics.hasWindow
                  ? `জের: ৳${(statementCombinedMetrics.openingChinaDueBdt ?? 0).toLocaleString()} | সরাসরি: ৳${(statementCombinedMetrics.totalChinaDirectBdt ?? 0).toLocaleString()}`
                  : `জমা: ৳${(statementCombinedMetrics.totalBdtReceived ?? 0).toLocaleString()} | সরাসরি: ৳${(statementCombinedMetrics.totalChinaDirectBdt ?? 0).toLocaleString()}`}
              </div>
            </div>
          </div>

          {/* Carry-Forward Rollover Strip */}
          {statementCombinedMetrics.hasWindow && (
            <div style={{ marginBottom: '12px', padding: '7px 10px', backgroundColor: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#78350f' }}>
              <span>গত মাসের জের (চীন): ৳{(statementCombinedMetrics.openingChinaDueBdt ?? 0).toLocaleString()}</span>
              <span>গত মাসের RMB জের: ¥{(statementCombinedMetrics.openingRmbInHand ?? 0).toLocaleString()}</span>
              <span>৩য়-পক্ষ জের: ৳{(statementCombinedMetrics.openingThirdPartyDueBdt ?? 0).toLocaleString()}</span>
              <span>৩য়-পক্ষ সমাপনী বাকি: ৳{(statementCombinedMetrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}</span>
            </div>
          )}

          {/* Table 1: Consignments */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', textTransform: 'uppercase' }}>
              ১. শাখা অফিসে প্রেরিত মালামালের বিবরণ ({effectiveCombinedPeriodLabel})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '5px', textAlign: 'center', width: '28px', border: '1px solid #334155' }}>#</th>
                  <th style={{ padding: '5px', textAlign: 'left', width: '90px', border: '1px solid #334155' }}>চালান নং</th>
                  <th style={{ padding: '5px', textAlign: 'left', width: '70px', border: '1px solid #334155' }}>তারিখ</th>
                  <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #334155' }}>গন্তব্য ও শিপিং</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '60px', border: '1px solid #334155' }}>আইটেম</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '95px', border: '1px solid #334155' }}>মোট টাকা (BDT)</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '85px', border: '1px solid #334155' }}>RMB (¥)</th>
                </tr>
              </thead>
              <tbody>
                {statementCombinedConsignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                      নির্বাচিত সময়ে কোনো চালান নেই।
                    </td>
                  </tr>
                ) : (
                  statementCombinedConsignments.map((c, idx) => (
                    <tr key={c.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: '4px', fontWeight: 700, border: '1px solid #cbd5e1' }}>{c.consignmentNo}</td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{c.date}</td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{c.branchName} ({c.shippingMethod})</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                        {c.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ৳{(c.totalBdtValue || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'right', color: '#0891b2', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ¥{(c.totalRmbEstimated ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table 2: 3rd Party-Wise Separate Summary */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', textTransform: 'uppercase' }}>
              ২. ৩য়-পক্ষ পার্টি-ভিত্তিক আলাদা হিসাব ({effectiveCombinedPeriodLabel})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                  <th style={{ padding: '5px', textAlign: 'center', width: '24px', border: '1px solid #334155' }}>#</th>
                  <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #334155' }}>৩য়-পক্ষ পার্টি</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '82px', border: '1px solid #334155' }}>গত মাসের জের</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '70px', border: '1px solid #334155' }}>RMB (¥)</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '82px', border: '1px solid #334155' }}>প্রাপ্য BDT</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '82px', border: '1px solid #334155' }}>জমা BDT</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '86px', border: '1px solid #334155' }}>সমাপনী বাকি</th>
                </tr>
              </thead>
              <tbody>
                {statementCombinedThirdPartyLedgers.summaries.filter((g) => g.openingDueBdt !== 0 || g.periodRmb > 0 || g.periodExpectedBdt > 0 || g.periodReceivedBdt > 0 || g.closingDueBdt !== 0).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                      নির্বাচিত সময়ে কোনো ৩য়-পক্ষ হিসাব নেই।
                    </td>
                  </tr>
                ) : (
                  statementCombinedThirdPartyLedgers.summaries
                    .filter((g) => g.openingDueBdt !== 0 || g.periodRmb > 0 || g.periodExpectedBdt > 0 || g.periodReceivedBdt > 0 || g.closingDueBdt !== 0)
                    .map((g, idx) => (
                      <tr key={g.partyKey} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '4px', fontWeight: 700, border: '1px solid #cbd5e1' }}>{g.partyName}</td>
                        <td style={{ padding: '4px', textAlign: 'right', color: '#b45309', fontWeight: 700, border: '1px solid #cbd5e1' }}>৳{g.openingDueBdt.toLocaleString()}</td>
                        <td style={{ padding: '4px', textAlign: 'right', color: '#0891b2', fontWeight: 700, border: '1px solid #cbd5e1' }}>¥{g.periodRmb.toLocaleString()}</td>
                        <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>৳{g.periodExpectedBdt.toLocaleString()}</td>
                        <td style={{ padding: '4px', textAlign: 'right', color: '#059669', fontWeight: 700, border: '1px solid #cbd5e1' }}>৳{g.periodReceivedBdt.toLocaleString()}</td>
                        <td style={{ padding: '4px', textAlign: 'right', color: g.closingDueBdt > 0 ? '#e11d48' : '#059669', fontWeight: 800, border: '1px solid #cbd5e1' }}>৳{g.closingDueBdt.toLocaleString()}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table 3: Detailed 3rd Party RMB Conversions */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', textTransform: 'uppercase' }}>
              ৩. বিস্তারিত RMB ➔ BDT কনভার্সন ভাউচার ({effectiveCombinedPeriodLabel})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '5px', textAlign: 'center', width: '26px', border: '1px solid #334155' }}>#</th>
                  <th style={{ padding: '5px', textAlign: 'left', width: '68px', border: '1px solid #334155' }}>তারিখ</th>
                  <th style={{ padding: '5px', textAlign: 'left', width: '76px', border: '1px solid #334155' }}>ভাউচার নং</th>
                  <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #334155' }}>৩য়-পক্ষ পার্টি</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '70px', border: '1px solid #334155' }}>RMB (¥)</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '46px', border: '1px solid #334155' }}>রেট</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '80px', border: '1px solid #334155' }}>প্রাপ্য BDT</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '78px', border: '1px solid #334155' }}>জমা BDT</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '76px', border: '1px solid #334155' }}>বাকি BDT</th>
                </tr>
              </thead>
              <tbody>
                {statementCombinedConversions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                      নির্বাচিত সময়ে কোনো কনভার্শন নেই।
                    </td>
                  </tr>
                ) : (
                  statementCombinedConversions.map((cv, idx) => (
                    <tr key={cv.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{cv.date}</td>
                      <td style={{ padding: '4px', fontWeight: 700, border: '1px solid #cbd5e1' }}>{cv.voucherNo}</td>
                      <td style={{ padding: '4px', fontWeight: 600, border: '1px solid #cbd5e1' }}>{cv.partyName || (cv as any).thirdPartyName || '3rd Party'}</td>
                      <td style={{ padding: '4px', textAlign: 'right', color: '#0891b2', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ¥{((cv.rmbAmountGiven ?? (cv as any).rmbAmount) || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{cv.exchangeRate || 0}</td>
                      <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ৳{((cv.expectedBdtAmount ?? (cv as any).totalBdtExpected) || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'right', color: '#059669', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        ৳{((cv.receivedBdtAmount ?? (cv as any).bdtReceived) || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'right', color: (cv.remainingDueBdt || 0) > 0 ? '#e11d48' : '#059669', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                        {(cv.remainingDueBdt || 0) > 0 ? `৳${(cv.remainingDueBdt || 0).toLocaleString()}` : 'পরিশোধিত'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table 4: Branch RMB Remittances & China Direct BDT Payments Summary */}
          {(statementCombinedRemittances.length > 0 || statementCombinedDirectPayments.length > 0) && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', textTransform: 'uppercase' }}>
                ৪. শাখা RMB প্রাপ্তি ({statementCombinedRemittances.length} টি) ও চীন সরাসরি BDT পেমেন্ট ({statementCombinedDirectPayments.length} টি)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                    <th style={{ padding: '5px', textAlign: 'left', width: '75px', border: '1px solid #334155' }}>তারিখ</th>
                    <th style={{ padding: '5px', textAlign: 'left', width: '95px', border: '1px solid #334155' }}>ধরন / রেফারেন্স</th>
                    <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #334155' }}>শাখা ও মাধ্যম</th>
                    <th style={{ padding: '5px', textAlign: 'right', width: '95px', border: '1px solid #334155' }}>RMB (¥)</th>
                    <th style={{ padding: '5px', textAlign: 'right', width: '95px', border: '1px solid #334155' }}>সরাসরি BDT (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {statementCombinedRemittances.map((r) => (
                    <tr key={`cr-${r.id}`}>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{r.date}</td>
                      <td style={{ padding: '4px', fontWeight: 700, border: '1px solid #cbd5e1' }}>RMB • {r.referenceNo}</td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{r.branchName} ({r.receivedVia})</td>
                      <td style={{ padding: '4px', textAlign: 'right', color: '#0891b2', fontWeight: 700, border: '1px solid #cbd5e1' }}>¥{(r.rmbAmount || 0).toLocaleString()}</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>-</td>
                    </tr>
                  ))}
                  {statementCombinedDirectPayments.map((p) => (
                    <tr key={`cd-${p.id}`}>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{p.date}</td>
                      <td style={{ padding: '4px', fontWeight: 700, border: '1px solid #cbd5e1' }}>BDT • {p.referenceNo}</td>
                      <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>{p.branchName} ({p.paymentMethod})</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #cbd5e1' }}>-</td>
                      <td style={{ padding: '4px', textAlign: 'right', color: '#059669', fontWeight: 700, border: '1px solid #cbd5e1' }}>৳{(p.amountBdt || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '40px', paddingTop: '16px' }}>
            <div style={{ textAlign: 'center', width: '160px' }}>
              <div style={{ borderTop: '1px dashed #64748b', paddingTop: '4px', fontSize: '10px', color: '#334155', fontWeight: 600 }}>
                শাখা হিসাবরক্ষক / কাস্টডিয়ান
              </div>
            </div>

            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '11px', color: '#0f172a', fontWeight: 700 }}>
                কর্তৃপক্ষের স্বাক্ষর ও সিলমোহর
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                {companyInfo.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
