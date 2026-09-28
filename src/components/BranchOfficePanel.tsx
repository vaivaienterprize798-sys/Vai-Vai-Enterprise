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
  DollarSign
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
} from '../types';
import { formatCurrency, formatNumber, formatDate } from '../lib/translations';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';
import { WeChatShareDropdown } from './WeChatShareDropdown';
import { CompanyLogo } from './CompanyLogo';
import { executePrint } from '../lib/printUtils';

interface BranchOfficePanelProps {
  consignments: BranchConsignment[];
  remittances: BranchRmbRemittance[];
  conversions: ThirdPartyRmbConversion[];
  companyInfo: CompanyInfo;
  lang: Language;
  onSaveConsignment: (item: BranchConsignment) => void;
  onDeleteConsignment: (id: string) => void;
  onSaveRemittance: (item: BranchRmbRemittance) => void;
  onDeleteRemittance: (id: string) => void;
  onSaveConversion: (item: ThirdPartyRmbConversion) => void;
  onDeleteConversion: (id: string) => void;
  isSuperAdmin?: boolean;
}

export const BranchOfficePanel: React.FC<BranchOfficePanelProps> = ({
  consignments,
  remittances,
  conversions,
  companyInfo,
  lang,
  onSaveConsignment,
  onDeleteConsignment,
  onSaveRemittance,
  onDeleteRemittance,
  onSaveConversion,
  onDeleteConversion,
  isSuperAdmin = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'consignments' | 'remittances' | 'conversions'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isConsignmentModalOpen, setIsConsignmentModalOpen] = useState(false);
  const [isRemittanceModalOpen, setIsRemittanceModalOpen] = useState(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState<ThirdPartyRmbConversion | null>(null);
  const [printingConsignment, setPrintingConsignment] = useState<BranchConsignment | null>(null);
  const [isBranchStatementModalOpen, setIsBranchStatementModalOpen] = useState(false);

  // Full Edit States across all modules
  const [editingConsignment, setEditingConsignment] = useState<BranchConsignment | null>(null);
  const [editingRemittance, setEditingRemittance] = useState<BranchRmbRemittance | null>(null);
  const [editingConversion, setEditingConversion] = useState<ThirdPartyRmbConversion | null>(null);

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
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
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
  const [remitDate, setRemitDate] = useState(new Date().toISOString().split('T')[0]);
  const [remitRefNo, setRemitRefNo] = useState(() => getNextRemittanceNo());
  const [remitBranchName, setRemitBranchName] = useState('চীন/গুয়াংজু শাখা অফিস');
  const [remitAmount, setRemitAmount] = useState<number>(0);
  const [remitVia, setRemitVia] = useState<'WeChat Pay' | 'Alipay' | 'Chinese Bank' | 'Cash' | 'Other'>('WeChat Pay');
  const [remitAccount, setRemitAccount] = useState('');
  const [remitNotes, setRemitNotes] = useState('');

  // Conversion Form State
  const [convDate, setConvDate] = useState(new Date().toISOString().split('T')[0]);
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
    setFormDate(new Date().toISOString().split('T')[0]);
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
    setRemitDate(new Date().toISOString().split('T')[0]);
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
    setConvDate(new Date().toISOString().split('T')[0]);
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

  // Installment Payment Modal State
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmountBdt, setPayAmountBdt] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'cash' | 'bKash' | 'nagad'>('bank_transfer');
  const [payAccount, setPayAccount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalBdtSent = consignments.reduce((acc, c) => acc + (Number(c.totalBdtValue) || 0), 0);
    const totalRmbEstSent = consignments.reduce((acc, c) => acc + (Number(c.totalRmbEstimated) || 0), 0);
    const totalRmbReceived = remittances.reduce((acc, r) => acc + (Number(r.rmbAmount) || 0), 0);
    
    const totalRmbConverted = conversions.reduce((acc, cv) => acc + (Number(cv.rmbAmountGiven) || 0), 0);
    const totalBdtReceived = conversions.reduce((acc, cv) => acc + (Number(cv.receivedBdtAmount) || 0), 0);
    const totalExpectedBdt = conversions.reduce((acc, cv) => acc + (Number(cv.expectedBdtAmount) || 0), 0);
    const totalThirdPartyDueBdt = conversions.reduce((acc, cv) => acc + (Number(cv.remainingDueBdt) || 0), 0);

    const rmbBalanceInHand = Math.max(0, totalRmbReceived - totalRmbConverted);
    const branchNetRmbDue = totalRmbEstSent > 0 ? (totalRmbEstSent - totalRmbReceived) : 0;

    return {
      totalBdtSent,
      totalRmbEstSent,
      totalRmbReceived,
      totalRmbConverted,
      rmbBalanceInHand,
      totalBdtReceived,
      totalExpectedBdt,
      totalThirdPartyDueBdt,
      branchNetRmbDue,
    };
  }, [consignments, remittances, conversions]);

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

          {/* Independent Branch Office Print Statement Button */}
          <button
            onClick={() => setIsBranchStatementModalOpen(true)}
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
            fileName="rsr-branch-office-statement.png"
            getText={() => {
              return `*${companyInfo.name} - শাখা অফিস ও ৩য়-পক্ষ RMB হিসাব*
📅 তারিখ: ${new Date().toISOString().split('T')[0]}
━━━━━━━━━━━━━━━━━━━━
📦 শাখা অফিসে প্রেরিত মোট মাল: ৳${(metrics.totalBdtSent ?? 0).toLocaleString()} (≈ ¥${(metrics.totalRmbEstSent ?? 0).toLocaleString()})
💰 শাখা অফিস থেকে প্রাপ্ত মোট RMB: ¥${(metrics.totalRmbReceived ?? 0).toLocaleString()}
🪙 হাতে বর্তমান RMB ব্যালেন্স: ¥${(metrics.rmbBalanceInHand ?? 0).toLocaleString()}
🔄 ৩য়-পক্ষে মোট RMB কনভার্ট: ¥${(metrics.totalRmbConverted ?? 0).toLocaleString()}
💵 প্রাপ্ত মোট টাকা (BDT): ৳${(metrics.totalBdtReceived ?? 0).toLocaleString()}
⚠️ ৩য়-পক্ষের কাছে মোট বকেয়া বাকি: ৳${(metrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
_${companyInfo.name}_`;
            }}
          />

          {/* WeChat Share with Image Target */}
          <WeChatShareDropdown
            lang={lang}
            buttonLabel={lang === 'bn' ? 'উইচ্যাট' : 'WeChat'}
            targetElementId="rsr-branch-office-statement"
            fileName="rsr-wechat-branch-statement.png"
            getText={() => {
              return `${companyInfo.name} - Branch Office & RMB Statement\nDate: ${new Date().toISOString().split('T')[0]}\nSent to Branch: ৳${(metrics.totalBdtSent ?? 0).toLocaleString()} (¥${(metrics.totalRmbEstSent ?? 0).toLocaleString()})\nRMB Remitted: ¥${(metrics.totalRmbReceived ?? 0).toLocaleString()}\nRMB Balance: ¥${(metrics.rmbBalanceInHand ?? 0).toLocaleString()}\nRMB Converted to BDT: ¥${(metrics.totalRmbConverted ?? 0).toLocaleString()}\nBDT Received: ৳${(metrics.totalBdtReceived ?? 0).toLocaleString()}\nDue from 3rd Parties: ৳${(metrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}`;
            }}
          />
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
            <span>{consignments.length} {lang === 'bn' ? 'টি চালান' : 'consignments'}</span>
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
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'bn' ? 'কনভার্ট হয়েছে:' : 'Converted:'} <span className="font-mono font-bold text-slate-700 dark:text-slate-300">¥ {(metrics.totalRmbConverted ?? 0).toLocaleString()}</span>
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
          <div className="text-[11px] text-slate-500 mt-1">
            {lang === 'bn' ? 'প্রাপ্ত BDT:' : 'Received BDT:'} <span className="font-mono font-bold text-emerald-600">{formatCurrency(metrics.totalBdtReceived, lang)}</span>
          </div>
        </div>
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
            {consignments.length}
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
            {remittances.length}
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
            {conversions.length}
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
                <span className="text-xs font-mono font-bold text-blue-600">{consignments.length} Challans</span>
              </div>

              <div className="space-y-3">
                {consignments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {lang === 'bn' ? 'এখনো কোনো মালামাল পাঠানো হয়নি।' : 'No consignments recorded yet.'}
                  </div>
                ) : (
                  consignments.slice(0, 5).map((c) => (
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

            {/* Right: 3rd Party RMB to BDT Conversions Ledger Top Balances */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'bn' ? '৩য়-পক্ষ মানি এক্সচেঞ্জ বাকি ও লেজার' : '3rd Party Agent Due Balances'}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {formatCurrency(metrics.totalThirdPartyDueBdt, lang)} {lang === 'bn' ? 'বাকি' : 'Due'}
                </span>
              </div>

              <div className="space-y-3">
                {conversions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {lang === 'bn' ? 'কোনো কনভার্শন এন্ট্রি পাওয়া যায়নি।' : 'No conversions recorded yet.'}
                  </div>
                ) : (
                  conversions.slice(0, 5).map((cv) => (
                    <div key={cv.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{cv.partyName || (cv as any).thirdPartyName || '3rd Party'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          ¥ {((cv.rmbAmountGiven ?? (cv as any).rmbAmount) || 0).toLocaleString()} @ {cv.exchangeRate || 0} ৳/¥
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className={`font-bold ${(cv.remainingDueBdt || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {(cv.remainingDueBdt || 0) > 0 ? `বাকি: ${formatCurrency(cv.remainingDueBdt, lang)}` : 'পরিশোধিত (Settled)'}
                        </div>
                        <div className="text-[10px] text-slate-400">প্রাপ্ত: {formatCurrency(cv.receivedBdtAmount || (cv as any).bdtReceived || 0, lang)}</div>
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
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">চালান নং & তারিখ</th>
                  <th className="p-3">শাখা / গন্তব্য</th>
                  <th className="p-3">মালের বিবরণ & পরিমাণ</th>
                  <th className="p-3 text-right">বাংলাদেশ মূল্য (BDT)</th>
                  <th className="p-3 text-right">আনুমানিক RMB (¥)</th>
                  <th className="p-3">শিপিং মাধ্যম & ট্র্যাকিং</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {consignments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {lang === 'bn' ? 'এখনো কোনো মালামাল পাঠানো হয়নি।' : 'No consignments found.'}
                    </td>
                  </tr>
                ) : (
                  consignments.map((c) => (
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
                              {it.name}: <strong>{it.quantity} {it.unit}</strong>
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
                {remittances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      {lang === 'bn' ? 'কোনো RMB প্রাপ্তির তথ্য পাওয়া যায়নি।' : 'No remittances found.'}
                    </td>
                  </tr>
                ) : (
                  remittances.map((r) => (
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

      {/* TAB 4: CONVERSIONS */}
      {activeTab === 'conversions' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'bn' ? '৩য়-পক্ষ আরএমবি টু টাকা (RMB ➔ BDT) কনভার্শন ও লেজার' : '3rd Party RMB to BDT Currency Conversions'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'কাকে কত RMB দেওয়া হলো, কোন রেটে কত টাকা আসার কথা, কত টাকা পাওয়া গেল এবং কত বাকি—তার সম্পূর্ণ হিসাব'
                  : 'Track RMB given to 3rd party brokers, exchange rates, expected BDT, collected BDT, and remaining due'}
              </p>
            </div>
            <button
              onClick={openNewConversionModal}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ নতুন কনভার্শন' : '+ New Conversion'}</span>
            </button>
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
                {conversions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      {lang === 'bn' ? 'কোনো কনভার্শন লেনদেন পাওয়া যায়নি।' : 'No conversions found.'}
                    </td>
                  </tr>
                ) : (
                  conversions.map((cv) => (
                    <tr key={cv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div>{cv.voucherNo}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{cv.date}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{cv.partyName || (cv as any).thirdPartyName || '3rd Party'}</div>
                        {cv.partyPhone && <div className="text-[10px] text-slate-400">{cv.partyPhone}</div>}
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

      {/* PRINT VIEW MODAL FOR CONSIGNMENT */}
      {printingConsignment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider">{companyInfo.name}</h1>
                <p className="text-xs text-slate-500">{companyInfo.address}</p>
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
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDEPENDENT BRANCH STATEMENT PREVIEW MODAL */}
      {isBranchStatementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-4xl p-6 sm:p-8 space-y-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center gap-3">
                <CompanyLogo customLogoUrl={companyInfo.logoUrl} className="w-12 h-12" />
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight">{companyInfo.name}</h1>
                  <p className="text-xs text-slate-500">{companyInfo.address} • {companyInfo.phones?.join(', ')}</p>
                  <p className="text-xs font-semibold text-blue-700 mt-0.5">শাখা অফিস ও ৩য়-পক্ষ আরএমবি/টাকা পূর্ণ বিবরণী (A4 Statement)</p>
                </div>
              </div>
              <button
                onClick={() => setIsBranchStatementModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border text-xs">
              <div>
                <span className="text-slate-500 block font-medium">প্রেরিত মোট চালান (BDT):</span>
                <span className="font-bold text-sm text-slate-900 font-mono">৳{(metrics.totalBdtSent ?? 0).toLocaleString()}</span>
                <span className="block text-[10px] text-cyan-700 font-mono">≈ ¥{(metrics.totalRmbEstSent ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">শাখা হতে প্রাপ্ত RMB:</span>
                <span className="font-bold text-sm text-cyan-600 font-mono">¥{(metrics.totalRmbReceived ?? 0).toLocaleString()}</span>
                <span className="block text-[10px] text-slate-500">মোট {remittances.length} টি প্রাপ্তি</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">হাতে অবশিষ্ট RMB:</span>
                <span className="font-bold text-sm text-emerald-600 font-mono">¥{(metrics.rmbBalanceInHand ?? 0).toLocaleString()}</span>
                <span className="block text-[10px] text-slate-500">কনভার্ট: ¥{(metrics.totalRmbConverted ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">৩য়-পক্ষ মোট বকেয়া (BDT):</span>
                <span className="font-bold text-sm text-rose-600 font-mono">৳{(metrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}</span>
                <span className="block text-[10px] text-emerald-600 font-bold">জমা: ৳{(metrics.totalBdtReceived ?? 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Consignments List */}
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-700 mb-2">১. শাখা অফিসে প্রেরিত চালানসমূহ (Dispatches)</h3>
              <table className="w-full text-left text-xs border">
                <thead className="bg-slate-100 font-bold text-[11px]">
                  <tr>
                    <th className="p-2 border">তারিখ ও চালান নং</th>
                    <th className="p-2 border">শাখা ও গন্তব্য</th>
                    <th className="p-2 border">শিপিং / ট্র্যাকিং</th>
                    <th className="p-2 border text-right">আইটেম সংখ্যা</th>
                    <th className="p-2 border text-right">মোট মূল্য (BDT)</th>
                    <th className="p-2 border text-right">RMB (¥)</th>
                  </tr>
                </thead>
                <tbody>
                  {consignments.slice(0, 10).map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="p-2 border font-mono">
                        <span className="font-bold">{c.consignmentNo}</span>
                        <div className="text-[10px] text-slate-400">{c.date}</div>
                      </td>
                      <td className="p-2 border font-medium">{c.branchName}</td>
                      <td className="p-2 border">{c.shippingMethod} {c.trackingNo ? `(${c.trackingNo})` : ''}</td>
                      <td className="p-2 border text-right font-mono">{c.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0}</td>
                      <td className="p-2 border text-right font-mono font-bold">৳{(c.totalBdtValue || 0).toLocaleString()}</td>
                      <td className="p-2 border text-right font-mono text-cyan-700">¥{(c.totalRmbEstimated ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 3rd Party RMB Conversions */}
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-700 mb-2">২. ৩য়-পক্ষ RMB ➔ BDT কনভার্সন ও বকেয়া</h3>
              <table className="w-full text-left text-xs border">
                <thead className="bg-slate-100 font-bold text-[11px]">
                  <tr>
                    <th className="p-2 border">তারিখ ও ভাউচার</th>
                    <th className="p-2 border">৩য়-পক্ষ পার্টি</th>
                    <th className="p-2 border text-right">RMB পরিমাণ</th>
                    <th className="p-2 border text-right">রেট</th>
                    <th className="p-2 border text-right">মোট প্রাপ্য (BDT)</th>
                    <th className="p-2 border text-right">জমা (BDT)</th>
                    <th className="p-2 border text-right">বাকি (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {conversions.slice(0, 10).map((cv) => (
                    <tr key={cv.id} className="border-b">
                      <td className="p-2 border font-mono">
                        <span className="font-bold">{cv.voucherNo}</span>
                        <div className="text-[10px] text-slate-400">{cv.date}</div>
                      </td>
                      <td className="p-2 border font-medium">{cv.partyName || (cv as any).thirdPartyName || '3rd Party'}</td>
                      <td className="p-2 border text-right font-mono font-bold text-cyan-700">¥{((cv.rmbAmountGiven ?? (cv as any).rmbAmount) || 0).toLocaleString()}</td>
                      <td className="p-2 border text-right font-mono">{cv.exchangeRate || 0}</td>
                      <td className="p-2 border text-right font-mono font-bold">৳{((cv.expectedBdtAmount ?? (cv as any).totalBdtExpected) || 0).toLocaleString()}</td>
                      <td className="p-2 border text-right font-mono text-emerald-600">৳{((cv.receivedBdtAmount ?? (cv as any).bdtReceived) || 0).toLocaleString()}</td>
                      <td className="p-2 border text-right font-mono font-bold text-rose-600">
                        {(cv.remainingDueBdt || 0) > 0 ? `৳${(cv.remainingDueBdt || 0).toLocaleString()}` : 'পরিশোধিত'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-xs text-slate-500">
                মুদ্রণ তারিখ: {new Date().toLocaleDateString('bn-BD')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBranchStatementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer font-bold text-xs"
                >
                  বন্ধ করুন
                </button>
                <button
                  onClick={() => executePrint('rsr-branch-office-statement', 'RSR Vai Vai Enterprise - Branch Office Statement')}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন (1-Page A4)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFF-SCREEN 1-PAGE A4 CAPTURE ELEMENT FOR WHATSAPP, WECHAT AND DIRECT PRINT */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, opacity: 1, pointerEvents: 'none', zIndex: -100 }}>
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
                  {companyInfo.address} • মোবা: {(companyInfo.phones || []).join(', ')}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                শাখা অফিস & আরএমবি খাতা
              </div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                শাখা অফিস ও ৩য়-পক্ষ বিবরণী
              </h2>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                তারিখ: <strong>{new Date().toISOString().split('T')[0]}</strong>
              </div>
            </div>
          </div>

          {/* Key Metrics Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ borderLeft: '3px solid #2563eb', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>মোট চালান পাঠানো</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>৳{(metrics.totalBdtSent ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#0891b2' }}>≈ ¥{(metrics.totalRmbEstSent ?? 0).toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #0891b2', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>শাখা হতে প্রাপ্ত RMB</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0891b2' }}>¥{(metrics.totalRmbReceived ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>{remittances.length} টি প্রাপ্তি</div>
            </div>
            <div style={{ borderLeft: '3px solid #059669', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>হাতে RMB ব্যালেন্স</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>¥{(metrics.rmbBalanceInHand ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>কনভার্ট: ¥{(metrics.totalRmbConverted ?? 0).toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '3px solid #e11d48', paddingLeft: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>৩য়-পক্ষ বকেয়া বাকি</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#e11d48' }}>৳{(metrics.totalThirdPartyDueBdt ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: '9px', color: '#059669' }}>জমা: ৳{(metrics.totalBdtReceived ?? 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Table 1: Consignments */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', textTransform: 'uppercase' }}>
              ১. শাখা অফিসে প্রেরিত মালামালের বিবরণ (Consignments Sent)
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
                {consignments.slice(0, 7).map((c, idx) => (
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Table 2: 3rd Party RMB Conversions */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', textTransform: 'uppercase' }}>
              ২. ৩য়-পক্ষ RMB ➔ BDT কনভার্সন ও জমা-বকেয়া হিসাব
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '5px', textAlign: 'center', width: '28px', border: '1px solid #334155' }}>#</th>
                  <th style={{ padding: '5px', textAlign: 'left', width: '90px', border: '1px solid #334155' }}>ভাউচার নং</th>
                  <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #334155' }}>৩য়-পক্ষ পার্টি</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '75px', border: '1px solid #334155' }}>RMB (¥)</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '50px', border: '1px solid #334155' }}>রেট</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '85px', border: '1px solid #334155' }}>প্রাপ্য BDT</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '80px', border: '1px solid #334155' }}>জমা BDT</th>
                  <th style={{ padding: '5px', textAlign: 'right', width: '80px', border: '1px solid #334155' }}>বাকি BDT</th>
                </tr>
              </thead>
              <tbody>
                {conversions.slice(0, 7).map((cv, idx) => (
                  <tr key={cv.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
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
                ))}
              </tbody>
            </table>
          </div>

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
