import { Language } from '../types';

export const toBengaliDigits = (num: number | string): string => {
  if (num === null || num === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num
    .toString()
    .replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit, 10)]);
};

/**
 * Standard currency formatting. If roundToWhole is true, rounds with Math.round (.5 or higher becomes 1+)
 */
export const formatCurrency = (amount: number, lang: Language, roundToWhole: boolean = false): string => {
  const num = roundToWhole ? Math.round(amount || 0) : (amount || 0);
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: roundToWhole ? 0 : 2,
  });

  if (lang === 'bn') {
    const bnFormatted = toBengaliDigits(formatted);
    return num < 0 ? `-৳${bnFormatted}` : `৳${bnFormatted}`;
  }
  return num < 0 ? `-৳${formatted}` : `৳${formatted}`;
};

/**
 * Formats currency as an exact whole number for Dashboard (no decimals; .5+ rounds up to 1+)
 */
export const formatDashboardCurrency = (amount: number, lang: Language): string => {
  return formatCurrency(amount, lang, true);
};

/**
 * Formats numbers for all sheet panels with exactly up to 3 decimal places
 */
export const formatSheetDecimal = (num: number | string, lang: Language, fixed: boolean = false): string => {
  const n = Number(num);
  if (isNaN(n)) return lang === 'bn' ? (fixed ? '০.০০০' : '০') : (fixed ? '0.000' : '0');
  let formatted: string;
  if (fixed) {
    formatted = n.toFixed(3);
  } else if (Number.isInteger(n)) {
    formatted = n.toString();
  } else {
    // Has decimal places: show exactly 3 decimal places per requirement
    formatted = n.toFixed(3);
  }
  return lang === 'bn' ? toBengaliDigits(formatted) : formatted;
};

export const formatSheetNumber = (num: number | string, lang: Language, fixed: boolean = false): string => {
  return formatSheetDecimal(num, lang, fixed);
};

export const formatDecimal3 = (num: number | string, lang: Language): string => {
  const n = Number(num);
  if (isNaN(n)) return lang === 'bn' ? '০.০০০' : '0.000';
  const formatted = n.toFixed(3);
  return lang === 'bn' ? toBengaliDigits(formatted) : formatted;
};

/**
 * Formats quantities/weights: if integer, shows integer; if decimal, shows up to 3 decimal places
 */
export const formatQuantity = (qty: number | string, lang: Language): string => {
  const n = Number(qty);
  if (isNaN(n)) return '0';
  if (Number.isInteger(n)) {
    return formatNumber(n, lang);
  }
  return formatDecimal3(n, lang);
};

export const formatNumber = (num: number | string, lang: Language): string => {
  if (num === null || num === undefined) return '';
  if (lang === 'bn') {
    return toBengaliDigits(num);
  }
  return num.toString();
};

export const formatDate = (dateStr: string, lang: Language): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    if (lang === 'bn') {
      return `${toBengaliDigits(day)}/${toBengaliDigits(month)}/${toBengaliDigits(year)}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const translations = {
  bn: {
    // App header
    appName: 'আরএসআর ভাই ভাই এন্টারপ্রাইজ',
    appNameProcessing: 'ভাই ভাই ট্রেডস ৫জি',
    tagline: 'পুরাতন নষ্ট মোবাইল সার্কিট ও মাদারবোর্ড ক্রয়-বিক্রয়',
    dashboard: 'ড্যাশবোর্ড',
    invoices: 'ইনভয়েস সমূহ',
    stock: 'স্টক ব্যবস্থাপনা',
    parties: 'পার্টি খাতা / লেজার',
    payroll: 'এইচআর ও বেতন মনিটরিং',
    expenses: 'অফিস খরচ',
    dokanHishab: 'দোকানের হিসাব',
    statements: '১-পেজ স্টেটমেন্ট',
    newInvoice: 'নতুন ইনভয়েস',
    settings: 'সেটিংস ও ব্যাকআপ',
    partyAccountStatement: 'পার্টি অ্যাকাউন্ট স্টেটমেন্ট',

    // Dashboard metrics
    totalPurchase: 'মোট ক্রয় (Purchase)',
    totalSales: 'মোট বিক্রয় (Sales)',
    currentStockValue: 'বর্তমান মোট স্টক ভ্যালু',
    totalDueReceivable: 'পার্টিদের মোট বাকি (Due)',
    totalAdvancePayable: 'পার্টি অগ্রিম জমার পরিমাণ',
    todayExpense: 'আজকের মোট খরচ',
    staffAttendanceToday: 'আজকের স্টাফ উপস্থিতি',
    estimatedNetMargin: 'আনুমানিক নেট মার্জিন',
    atAGlance: 'এক নজরে কোম্পানি পর্যবেক্ষণ',
    financialSummary: 'আর্থিক বিবরণী ও স্ট্যাটাস',
    categoryWiseStock: 'ক্যাটাগরি ভিত্তিক স্টক',
    recentInvoices: 'সাম্প্রতিক ইনভয়েসসমূহ',
    quickActions: 'দ্রুত অ্যাকশন',

    // Invoices
    invoiceManagement: 'ইনভয়েস ব্যবস্থাপনা (৪ ধরনের ইনভয়েস)',
    createInvoice: 'ইনভয়েস তৈরি করুন',
    invoiceType: 'ইনভয়েস এর ধরন',
    invoiceMode: 'লেনদেনের ধরন',
    purchaseMode: 'ক্রয় ইনভয়েস (Purchase)',
    salesMode: 'বিক্রয় ইনভয়েস (Sales)',
    generalInvoice: 'জেনারেল ইনভয়েস (General)',
    processingInvoice: 'প্রসেসিং ইনভয়েস (Processing - ভাই ভাই ট্রেডস ৫জি)',
    dokanInvoice: 'দোকান ইনভয়েস (Dokan)',
    commercialInvoice: 'কমার্শিয়াল ইনভয়েস (Commercial)',
    invoiceNo: 'ইনভয়েস নং',
    invoiceDate: 'তারিখ',
    partyName: 'পার্টির নাম (ক্রেতা / বিক্রেতা)',
    selectParty: 'পার্টি নির্বাচন করুন',
    partyPhone: 'মোবাইল নম্বর',
    partyAddress: 'ঠিকানা',
    partyPrevBalance: 'পার্টির পূর্বের বাকি / অগ্রিম',
    previousDue: 'পূর্বের বাকি',
    previousAdvance: 'পূর্বের জমা (অগ্রিম)',
    cleanAccount: 'হিসাব পরিশোধিত',
    productItems: 'পণ্যের বিবরণ (সর্বোচ্চ ৪০ টি আইটেম)',
    addProductRow: '+ নতুন পণ্য যুক্ত করুন (৪০টি পর্যন্ত)',
    sl: 'ক্রমিক',
    category: 'ক্যাটাগরি',
    itemDescription: 'মালের নাম / বিবরণ',
    itemCode: 'কোড',
    qty: 'পরিমাণ',
    unit: 'একক',
    rate: 'দর (টাকা)',
    amount: 'মোট টাকা',
    action: 'অ্যাকশন',
    subTotal: 'সাব-টোটাল',
    courierBillMinus: 'কুরিয়ার বিল বাদ (-)',
    discount: 'বিশেষ ছাড় (-)',
    netBill: 'নেট ইনভয়েস বিল',
    grandTotal: 'সর্বমোট হিসাব',
    paidAmount: 'নগদ / পরিশোধ',
    remainingDue: 'অবশিষ্ট বাকি',
    paymentStatus: 'পেমেন্ট স্ট্যাটাস',
    paid: 'পরিশোধিত (Paid)',
    unpaid: 'বাকি (Unpaid)',
    partial: 'আংশিক পরিশোধ (Partial)',
    paymentMethod: 'পরিশোধ মাধ্যম',
    cash: 'ক্যাশ টাকা',
    bKash: 'বিকাশ',
    nagad: 'নগদ',
    bank: 'ব্যাংক ট্রান্সফার',
    courier_cod: 'কুরিয়ার কন্ডিশন (COD)',
    saveInvoice: 'ইনভয়েস সেভ করুন (অটো স্টক আপডেট)',
    printInvoice: '১-পেজ ইনভয়েস প্রিন্ট',
    shareWhatsApp: 'হোয়াটসঅ্যাপে পাঠান',
    deleteInvoice: 'মুছে ফেলুন',
    editInvoice: 'সম্পাদনা',

    // Stock
    stockManagement: 'অটো স্টক ইনভেন্টরি',
    totalItems: 'মোট আইটেম সংখ্যা',
    codeItem: 'কোড আইটেম (Code Item)',
    androidItem: 'অ্যান্ড্রয়েড আইটেম (Android Item)',
    kgItem: 'কেজি আইটেম (KG Item)',
    pcsBlankItem: 'পিস ও ব্ল্যাঙ্ক বোর্ড (Pcs & Blank Board)',
    inStock: 'মজুদ পরিমাণ',
    todayPurchase: 'আজকের ক্রয় (ইন)',
    todaySale: 'আজকের বিক্রয় (আউট)',
    todayStockInTotal: 'আজকের মোট মাল ইন',
    todayStockOutTotal: 'আজকের মোট মাল আউট',
    purchaseRate: 'গড় ক্রয় দর',
    saleRate: 'বিক্রয় দর',
    stockAlert: 'কম মজুদের সতর্কতা',
    quickStockAdjust: 'স্টক ইন / আউট / অ্যাডজাস্ট',
    stockStatement1Page: '১-পেজ স্টক স্টেটমেন্ট প্রিন্ট',

    // Parties
    partyManagement: 'পার্টি ব্যবস্থাপনা ও লেজার খাতা',
    addParty: 'নতুন পার্টি যোগ করুন',
    partyType: 'পার্টি ক্যাটাগরি',
    supplier: 'সাপ্লায়ার / মহাজন (বিক্রেতা)',
    buyer: 'বাইয়ার / পাইকার (ক্রেতা)',
    both: 'উভয় (সাপ্লায়ার ও বাইয়ার)',
    totalDueFromParties: 'মোট পাওনা বাকি',
    totalPayableToParties: 'মোট দেনা বাকি',
    viewLedger: 'লেজার হিস্টোরি',
    receivePayment: 'টাকা জমা নিন',
    makePayment: 'টাকা পরিশোধ করুন',
    partyStatement1Page: '১-পেজ পার্টি ডিউ / অ্যাডভান্স স্টেটমেন্ট',

    // HR & Payroll
    hrPayroll: 'এইচআর, স্টাফ হাজিরা ও পেরোল মনিটরিং',
    officeStaff: 'অফিস স্টাফ (সময়: সকাল ১০:০০ - রাত ১০:০০)',
    processingStaff: 'প্রসেসিং স্টাফ (সময়: সকাল ০৯:০০ - সন্ধ্যা ০৭:০০)',
    staffName: 'স্টাফের নাম',
    designation: 'পদবী',
    inTime: 'ইন টাইম (প্রবেশ)',
    outTime: 'আউট টাইম (প্রস্থান)',
    lateMinutes: 'লেট (মিনিট)',
    otHours: 'ওভারটাইম (ঘণ্টা)',
    otRateNotice: 'ওভারটাইম রেট: প্রতি ঘণ্টা ৬০ টাকা ফিক্সড',
    baseSalary: 'মূল বেতন',
    dailyRate: 'দৈনিক মজুরি',
    advanceTaken: 'অগ্রিম গ্রহণ',
    netSalary: 'প্রদেয় বেতন',
    recordAttendance: 'আজকের হাজিরা দিন',
    attendanceStatus: 'হাজিরার ধরন / স্ট্যাটাস',
    presentStatus: 'উপস্থিত (Present)',
    absentStatus: 'অনুপস্থিত (Absent)',
    fullDayLeaveStatus: 'পূর্ণ দিবস ছুটি (Full Day Leave)',
    halfDayLeaveStatus: 'অর্ধ দিবস ছুটি (Half Day Leave)',
    payrollStatement1Page: '১-পেজ স্টাফ স্যালারি ও পেরোল স্টেটমেন্ট',
    salaryMonthSelector: 'বেতনের মাস নির্বাচন',
    salaryMonth: 'বেতনের মাস',
    staffPaymentStatus: 'পেমেন্ট স্ট্যাটাস',
    totalStaffSalary: 'মোট প্রদেয় বেতন (সব স্টাফ)',
    totalPaidSalary: 'মোট পরিশোধিত বেতন (Paid)',
    totalUnpaidSalary: 'মোট বকেয়া বেতন (Unpaid)',
    paidStaffCount: 'পরিশোধিত স্টাফ',
    unpaidStaffCount: 'বকেয়া স্টাফ',
    markAsPaid: 'Paid চিহ্নিত করুন',
    markAsUnpaid: 'Unpaid চিহ্নিত করুন',
    executivePayrollSummary: 'মাসিক পে-রোল ও পেমেন্ট এক্সিকিউটিভ সামারি',

    // Expense
    officeExpenses: 'দৈনিক ও মাসিক অফিস খরচ প্যানেল',
    officeExpense: 'দৈনিক ও মাসিক অফিস খরচ প্যানেল',
    expenseTitle: 'খরচের বিবরণ',
    foodTea: 'আপ্যায়ন, চা ও নাস্তা',
    labourCoolie: 'কুলি ও লেবার মজুরি',
    transport: 'কুরিয়ার ও গাড়ি ভাড়া',
    utilityBills: 'বিদ্যুৎ ও ইউটিলিটি বিল',
    otherExpense: 'অন্যান্য খরচ',
    addExpense: 'নতুন খরচ যুক্ত করুন',
    expenseCategory: 'খরচের খাত',
    rent: 'দোকান / অফিস ভাড়া',
    electricity: 'বিদ্যুৎ ও জেনারেটর বিল',
    tea_snacks: 'আপ্যায়ন, চা ও নাস্তা',
    courier_transport: 'কুরিয়ার ও যাতায়াত ভাড়া',
    labor: 'কুলি ও লেবার মজুরি',
    repair: 'মেরামত ও পার্টস খরচ',
    stationery: 'কাগজ ও স্টেশনারি',
    other: 'অন্যান্য জরুরি খরচ',
    voucherNo: 'ভাউচার নং',
    paidBy: 'কে খরচ করলেন',
    expenseStatement1Page: '১-পেজ অফিস খরচ স্টেটমেন্ট',
    financialAnalyticsStatement1Page: '১-পেজ আর্থিক লাভ-ক্ষতি (P&L) ও ROI স্টেটমেন্ট',
    financialAnalyticsTitle: 'ফাইন্যান্সিয়াল অ্যানালিটিক্স, P&L ও ROI ড্যাশবোর্ড',
    totalSalesRevenue: 'মোট বিক্রয় আয় (Total Sales)',
    totalPurchaseCost: 'মোট ক্রয় খরচ (Total Purchase)',
    grossSalesBalance: 'গ্রস সেলস ও পারচেজ মার্জিন',
    netProfitLoss: 'নিট লাভ / ক্ষতি (Net P&L)',
    totalExpenses: 'মোট অফিস ও গাড়ি খরচ',
    paidSalaries: 'পরিশোধিত স্টাফ বেতন',
    totalInvestmentCost: 'মোট পরিচালন ব্যয় ও ইনভেস্টমেন্ট',
    roiPercentage: 'রিটার্ন অন ইনভেস্টমেন্ট (ROI %)',
    profitMargin: 'প্রফিট মার্জিন (%)',
    expenseRatio: 'খরচ ও আয়ের অনুপাত (%)',
    profitableStatus: 'ব্যবসায়িক লাভজনক অবস্থায় আছে',
    lossStatus: 'ব্যবসায়িক সতর্ক অবস্থা / লোকসান',
    financialPeriod: 'হিসাবের সময়কাল',

    // Print & Statements
    printCenter: '১-পেজ স্মার্ট প্রিন্ট সেন্টার',
    printDesc: 'প্রতিটি স্টেটমেন্ট ১-পেজের মধ্যে নিখুঁতভাবে প্রিন্ট ও পিডিএফ ডাউনলোড করার উপযোগী।',
    printStockStatement: 'স্টক স্টেটমেন্ট প্রিন্ট',
    printPartyStatement: 'পার্টি ডিউ / অ্যাডভান্স স্টেটমেন্ট প্রিন্ট',
    printPayrollStatement: 'স্টাফ স্যালারি ও পেরোল স্টেটমেন্ট প্রিন্ট',
    printExpenseStatement: 'অফিস খরচ স্টেটমেন্ট প্রিন্ট',
    printNow: 'এখনই প্রিন্ট করুন',
    companySealSignature: 'কর্তৃপক্ষের স্বাক্ষর ও সিল',
    preparedBy: 'প্রস্তুতকারী',
    authorizedSign: 'অনুমোদনকারী',
    customerSignature: 'গ্রহীতার স্বাক্ষর',

    // Common
    search: 'অনুসন্ধান করুন...',
    filter: 'ফিল্টার',
    all: 'সবগুলো',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    close: 'বন্ধ করুন',
    confirm: 'নিশ্চিত করুন',
    deleteConfirm: 'আপনি কি নিশ্চিতভাবে এটি মুছে ফেলতে চান?',
    offlineMode: 'অফলাইন মোড সক্রিয়',
    desktopReady: 'ডেস্কটপ ইনস্টলেশন প্রস্তুত',
    backupDatabase: 'ডেটা ব্যাকআপ (JSON ডাউনলোড)',
    backupData: 'ডাটাবেস ব্যাকআপ',
    restoreDatabase: 'ব্যাকআপ রিস্টোর করুন',
    restoreData: 'ডাটা রিস্টোর',
    theme: 'থিম পরিবর্তন',
    language: 'ভাষা (Language)',
  },
  en: {
    // App header
    appName: 'RSR Vai Vai Enterprise',
    appNameProcessing: 'Vai Vai Trades 5G',
    tagline: 'Scrap & Used Mobile Circuit & Motherboard Trading',
    dashboard: 'Dashboard',
    invoices: 'Invoices',
    stock: 'Stock Inventory',
    parties: 'Party Ledger',
    payroll: 'HR & Payroll',
    expenses: 'Office Expenses',
    dokanHishab: 'Dokan Hishab (Shop Account)',
    statements: '1-Page Statements',
    newInvoice: 'New Invoice',
    settings: 'Settings & Backup',
    partyAccountStatement: 'Party Account Statement',

    // Dashboard metrics
    totalPurchase: 'Total Purchases',
    totalSales: 'Total Sales',
    currentStockValue: 'Current Stock Value',
    totalDueReceivable: 'Total Due (Receivable)',
    totalAdvancePayable: 'Total Advance (Payable)',
    todayExpense: "Today's Expense",
    staffAttendanceToday: 'Staff Present Today',
    estimatedNetMargin: 'Estimated Net Margin',
    atAGlance: 'Company Operations at a Glance',
    financialSummary: 'Financial Summary & Performance',
    categoryWiseStock: 'Category-wise Stock Inventory',
    recentInvoices: 'Recent Invoices',
    quickActions: 'Quick Actions',

    // Invoices
    invoiceManagement: 'Invoice Management (4 Types)',
    createInvoice: 'Create Invoice',
    invoiceType: 'Invoice Type',
    invoiceMode: 'Transaction Mode',
    purchaseMode: 'Purchase Invoice',
    salesMode: 'Sales Invoice',
    generalInvoice: 'General Invoice',
    processingInvoice: 'Processing Invoice (Vai Vai Trades 5G)',
    dokanInvoice: 'Dokan Invoice',
    commercialInvoice: 'Commercial Invoice',
    invoiceNo: 'Invoice No',
    invoiceDate: 'Date',
    partyName: 'Party Name (Buyer / Supplier)',
    selectParty: 'Select Party',
    partyPhone: 'Contact Number',
    partyAddress: 'Address',
    partyPrevBalance: 'Previous Due / Advance',
    previousDue: 'Previous Due',
    previousAdvance: 'Previous Advance',
    cleanAccount: 'Account Clear (Zero)',
    productItems: 'Products Breakdown (Up to 40 Items)',
    addProductRow: '+ Add Product Item (Up to 40)',
    sl: 'SL',
    category: 'Category',
    itemDescription: 'Item Name & Specs',
    itemCode: 'Code',
    qty: 'Qty',
    unit: 'Unit',
    rate: 'Rate (৳)',
    amount: 'Total Amount',
    action: 'Action',
    subTotal: 'Sub-Total',
    courierBillMinus: 'Courier Bill (-)',
    discount: 'Special Discount (-)',
    netBill: 'Net Invoice Bill',
    grandTotal: 'Grand Total Amount',
    paidAmount: 'Paid / Cash Received',
    remainingDue: 'Net Remaining Due',
    paymentStatus: 'Payment Status',
    paid: 'Paid',
    unpaid: 'Unpaid',
    partial: 'Partial Payment',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    bKash: 'bKash',
    nagad: 'Nagad',
    bank: 'Bank Transfer',
    courier_cod: 'Courier Condition (COD)',
    saveInvoice: 'Save Invoice (Auto Stock Update)',
    printInvoice: '1-Page Invoice Print',
    shareWhatsApp: 'Share on WhatsApp',
    deleteInvoice: 'Delete',
    editInvoice: 'Edit',

    // Stock
    stockManagement: 'Auto Stock Inventory',
    totalItems: 'Total Stocked Items',
    codeItem: 'Code Item',
    androidItem: 'Android Item',
    kgItem: 'KG Item',
    pcsBlankItem: 'Pcs & Blank Board',
    inStock: 'Current Stock',
    todayPurchase: "Today's Purchase (In)",
    todaySale: "Today's Sale (Out)",
    todayStockInTotal: "Today's Total Stock In",
    todayStockOutTotal: "Today's Total Stock Out",
    purchaseRate: 'Avg Cost Rate',
    saleRate: 'Sale Rate',
    stockAlert: 'Low Stock Alert',
    quickStockAdjust: 'Stock In / Out / Adjust',
    stockStatement1Page: '1-Page Stock Statement Print',

    // Parties
    partyManagement: 'Party Management & Ledger',
    addParty: 'Add New Party',
    partyType: 'Party Role',
    supplier: 'Supplier / Mahajan',
    buyer: 'Buyer / Wholesaler',
    both: 'Both (Supplier & Buyer)',
    totalDueFromParties: 'Total Due from Parties',
    totalPayableToParties: 'Total Payable to Parties',
    viewLedger: 'View Ledger History',
    receivePayment: 'Receive Payment',
    makePayment: 'Make Payment',
    partyStatement1Page: '1-Page Party Due/Advance Statement',

    // HR & Payroll
    hrPayroll: 'HR, Staff Attendance & Payroll',
    officeStaff: 'Office Staff (10:00 AM - 10:00 PM)',
    processingStaff: 'Processing Staff (09:00 AM - 07:00 PM)',
    staffName: 'Staff Name',
    designation: 'Designation',
    inTime: 'In-Time',
    outTime: 'Out-Time',
    lateMinutes: 'Late (Min)',
    otHours: 'Overtime (Hrs)',
    otRateNotice: 'Overtime Rate: ৳60 / Hour Fixed',
    baseSalary: 'Base Salary',
    dailyRate: 'Daily Rate',
    advanceTaken: 'Advance Taken',
    netSalary: 'Net Payable Salary',
    recordAttendance: 'Mark Daily Attendance',
    attendanceStatus: 'Attendance Status',
    presentStatus: 'Present',
    absentStatus: 'Absent',
    fullDayLeaveStatus: 'Full Day Leave',
    halfDayLeaveStatus: 'Half Day Leave',
    payrollStatement1Page: '1-Page Staff Salary & Payroll Statement',
    salaryMonthSelector: 'Salary Month Selector',
    salaryMonth: 'Salary Month',
    staffPaymentStatus: 'Payment Status',
    totalStaffSalary: 'Total Staff Salary',
    totalPaidSalary: 'Total Paid Salary',
    totalUnpaidSalary: 'Total Unpaid Salary',
    paidStaffCount: 'Paid Staff',
    unpaidStaffCount: 'Unpaid Staff',
    markAsPaid: 'Mark as Paid',
    markAsUnpaid: 'Mark as Unpaid',
    executivePayrollSummary: 'Executive Payroll & Payment Summary',

    // Expense
    officeExpenses: 'Daily & Monthly Office Expenses',
    officeExpense: 'Daily & Monthly Office Expenses',
    expenseTitle: 'Expense Title',
    foodTea: 'Food & Tea Refreshment',
    labourCoolie: 'Labor & Coolie Wages',
    transport: 'Transport & Vehicle Rent',
    utilityBills: 'Electricity & Utility Bills',
    otherExpense: 'Other Sundry Expenses',
    addExpense: 'Add New Expense',
    expenseCategory: 'Expense Category',
    rent: 'Shop / Office Rent',
    electricity: 'Electricity & Generator',
    tea_snacks: 'Refreshment & Tea',
    courier_transport: 'Courier & Transport',
    labor: 'Labor & Porter',
    repair: 'Maintenance & Repairs',
    stationery: 'Stationery & Printing',
    other: 'Other Sundry Expenses',
    voucherNo: 'Voucher No',
    paidBy: 'Paid By',
    expenseStatement1Page: '1-Page Office Expense Statement',
    financialAnalyticsStatement1Page: '1-Page P&L & ROI Statement',
    financialAnalyticsTitle: 'Financial Analytics, P&L & ROI Dashboard',
    totalSalesRevenue: 'Total Sales Revenue',
    totalPurchaseCost: 'Total Purchase Cost',
    grossSalesBalance: 'Gross Sales & Purchase Margin',
    netProfitLoss: 'Net Profit / Loss (P&L)',
    totalExpenses: 'Total Office & Vehicle Expenses',
    paidSalaries: 'Total Paid Staff Salary',
    totalInvestmentCost: 'Total Operational Outflow & Investment',
    roiPercentage: 'Return on Investment (ROI %)',
    profitMargin: 'Profit Margin (%)',
    expenseRatio: 'Expense-to-Revenue Ratio (%)',
    profitableStatus: 'Company Running in Profit',
    lossStatus: 'Company Running in Loss',
    financialPeriod: 'Accounting Period',

    // Print & Statements
    printCenter: '1-Page Smart Print Center',
    printDesc: 'Optimized high-density 1-page statements ready for clean A4 printing and PDF export.',
    printStockStatement: 'Print Stock Statement',
    printPartyStatement: 'Print Party Due / Advance Statement',
    printPayrollStatement: 'Print Staff Payroll Statement',
    printExpenseStatement: 'Print Office Expense Statement',
    printNow: 'Print Now',
    companySealSignature: 'Authorized Seal & Signature',
    preparedBy: 'Prepared By',
    authorizedSign: 'Authorized By',
    customerSignature: 'Received With Thanks',

    // Common
    search: 'Search records...',
    filter: 'Filter',
    all: 'All',
    save: 'Save Changes',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    deleteConfirm: 'Are you sure you want to delete this record?',
    offlineMode: 'Offline Storage Active',
    desktopReady: 'Desktop Deployment Ready',
    backupDatabase: 'Backup Database (Export JSON)',
    backupData: 'Backup Database',
    restoreDatabase: 'Restore Backup',
    restoreData: 'Restore Backup',
    theme: 'Theme Mode',
    language: 'Language (ভাষা)',
  },
};
