export type Language = 'bn' | 'en';
export type ThemeMode = 'light' | 'dark';

export interface CompanyInfo {
  name: string;
  processingName: string;
  email: string;
  address: string;
  phones: string[];
  businessTypeBn: string;
  businessTypeEn: string;
  tagline?: string;
  proprietor?: string;
  adminUsername?: string;
  adminPassword?: string;
  logoUrl?: string;
  invoiceTermsBn?: string;
  invoiceTermsEn?: string;
}

export const DEFAULT_COMPANY: CompanyInfo = {
  name: 'RSR Vai Vai Enterprise',
  processingName: 'Vai Vai Trades 5G',
  email: 'vaivaienterpeize798@gmail.com',
  address: 'Shakib-Siyam Super Market, 14 No. Lane, Puran Potti Road, Hiraabil, Siddhirganj, Narayanganj',
  phones: ['01725-550002', '01746-383825'],
  businessTypeBn: 'পুরাতন নষ্ট মোবাইল সার্কিট ও মাদারবোর্ড ক্রয়-বিক্রয়',
  businessTypeEn: 'Scrap & Used Mobile Circuit & Motherboard Trading',
  tagline: 'পুরাতন নষ্ট মোবাইল সার্কিট ও মাদারবোর্ড ক্রয়-বিক্রয় পাইকারি আড়ত',
  proprietor: 'হাজী মোঃ শাহিন',
  adminUsername: 'ADMIN',
  adminPassword: 'admin123',
  invoiceTermsBn: '১. বিক্রিত মাল ফেরত নেওয়া হয় না।\n২. কুরিয়ার রসিদ দেখে মাল বুঝে নেওয়ার দায়িত্ব ক্রেতার।\n৩. কোনো অসঙ্গতি থাকলে বিলের ৪৮ ঘণ্টার মধ্যে জানাতে হবে।',
  invoiceTermsEn: '1. Sold goods are non-refundable.\n2. Buyer must inspect goods upon delivery receipt.\n3. Discrepancies must be reported within 48 hours.',
};

export type InvoiceType = 'general' | 'processing' | 'dokan' | 'commercial';
export type InvoiceMode = 'purchase' | 'sales';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
export type PaymentMethod = 'cash' | 'bKash' | 'nagad' | 'bank' | 'courier_cod';

export type StockCategory = 'code' | 'android' | 'kg' | 'pcs_blank';

export interface InvoiceItem {
  id: string;
  category: StockCategory;
  name: string;
  code?: string;
  quantity: number;
  unit: 'pcs' | 'kg' | 'lot' | 'gm';
  unitPrice: number;
  total: number;
  inputGrams?: number; // optional tracking when entered as grams
  rateBasis?: 'per_unit' | 'per_kg' | 'per_gm'; // default rate basis
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  type: InvoiceType;
  mode: InvoiceMode;
  partyId?: string;
  partyName: string;
  partyPhone: string;
  partyAddress?: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  courierDeduction: number;
  discount?: number;
  netInvoiceAmount: number;
  previousBalance: number; // Positive = Due, Negative = Advance
  grandTotal: number;
  paidAmount?: number;
  remainingDue?: number;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface StockItem {
  id: string;
  category: StockCategory;
  nameBn: string;
  nameEn: string;
  code: string;
  openingQty?: number; // প্রারম্ভিক মজুদ (Opening Stock Quantity)
  quantity: number;
  unit: 'pcs' | 'kg';
  purchaseRate: number; // ক্রয় দর (Purchase Rate)
  purchaseAvgRate?: number; // optional legacy
  saleRate?: number; // optional legacy
  minAlertQty: number;
  lastUpdated: string;
}

export interface DokanPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  recipientName?: string;
  voucherNo?: string;
  notes?: string;
  createdAt: string;
}

export type PartyType = 'supplier' | 'buyer' | 'both';

export interface Party {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: PartyType;
  openingBalance: number; // positive = due to party / from party
  currentDue: number; // Amount they owe us (if buyer) or we owe them (if supplier)
  currentAdvance: number; // Amount in advance
  totalTransactions: number;
  notes?: string;
}

export interface PartyTransaction {
  id: string;
  partyId: string;
  date: string;
  invoiceNo?: string;
  type: 'purchase' | 'sales' | 'payment_given' | 'payment_received' | 'adjustment';
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export type StaffCategory = 'office' | 'processing';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'full_day_leave' | 'half_day_leave' | 'leave' | 'holiday';
export type StaffPaymentStatus = 'Paid' | 'Unpaid';

export type UserRole = 'admin' | 'staff';

export interface UserSession {
  id: string;
  name: string;
  loginId: string;
  role: UserRole;
  staffId?: string;
  category?: StaffCategory;
  designation?: string;
  loggedInAt: string;
}

export interface Staff {
  id: string;
  name: string;
  phone: string;
  category: StaffCategory;
  designation: string;
  baseSalary: number; // Monthly salary
  dailyRate: number; // Daily computed rate
  joinDate: string;
  active: boolean;
  isSupervisor?: boolean; // True if designated lead/supervisor for processing team
  supervisorId?: string; // ID of supervisor managing this staff member
  loginCode?: string; // e.g. "STF01" or "stf-1"
  password?: string; // Default password e.g. "123456"
  role?: UserRole; // 'admin' | 'staff' (Super Admin or Standard Staff)
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  category: StaffCategory;
  date: string;
  inTime: string; // e.g. "09:45"
  outTime: string; // e.g. "22:15"
  status: AttendanceStatus;
  lateMinutes: number;
  otHours: number;
  otAmount: number; // otHours * 60 Taka
  advanceDeduction: number;
  damageDeduction?: number; // Auto-calculated damage penalties for worker
  notes?: string;
}

export type PettyCashCategory =
  | 'tea_food' // আপ্যায়ন, চা ও নাস্তা
  | 'tea_snacks'
  | 'courier_bill' // কুরিয়ার বিল (Courier Bill)
  | 'transport_allowance' // যাতায়াত ও ভাড়া (Transport Allowance)
  | 'service_charge' // সার্ভিস চার্জ ও ফি (Service Charge)
  | 'coolie_labor' // কুলি ও লেবার মজুরি
  | 'labor'
  | 'utility_bills' // বিদ্যুৎ ও ইউটিলিটি বিল
  | 'utility'
  | 'stationery' // খাতা, কলম ও প্রিন্টিং
  | 'cleaning_maint' // অফিস পরিচ্ছন্নতা ও মেনটেনেন্স
  | 'maintenance'
  | 'entertainment'
  | 'rent' // দোকান ও অফিস ভাড়া
  | 'other'; // অন্যান্য খরচ

export interface PettyCashExpense {
  id: string;
  date: string;
  category: PettyCashCategory;
  type?: string;
  title: string;
  description?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  voucherNo?: string;
  receiptNo?: string;
  paidBy?: string;
  paidTo?: string;
  notes?: string;
}

export type CarExpenseCategory =
  | 'fuel'
  | 'fuel_gas' // তেল, পেট্রোল ও গ্যাস
  | 'maintenance'
  | 'repair_servicing' // গাড়ি মেরামত ও পার্টস সার্ভিসিং
  | 'driver_salary'
  | 'driver_salary_food' // ড্রাইভার বেতন ও খোরাকি
  | 'toll'
  | 'toll_parking' // টোল ও পার্কিং
  | 'papers'
  | 'papers_tax' // গাড়ির ট্যাক্স ও কাগজপত্র
  | 'garage'
  | 'truck_rent' // পণ্য পরিবহন / ট্রাক-পিকআপ ভাড়া
  | 'other'; // অন্যান্য পরিবহন খরচ

export interface CarExpense {
  id: string;
  date: string;
  category: CarExpenseCategory;
  vehicleNo?: string; // গাড়ির নাম্বার (যেমন: ঢাকা মেট্রো-গ ১২-৩৪৫৬)
  tripRoute?: string;
  liter?: number;
  kilometers?: number;
  title: string;
  description?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  voucherNo?: string;
  receiptNo?: string;
  driverName?: string;
  paidTo?: string;
  notes?: string;
  expenseType?: string;
}

export type ExpenseCategory =
  | PettyCashCategory
  | CarExpenseCategory
  | 'food_tea'
  | 'labour_coolie'
  | 'transport'
  | 'bills'
  | 'rent'
  | 'electricity'
  | 'tea_snacks'
  | 'courier_transport'
  | 'labor'
  | 'repair'
  | 'stationery'
  | 'other';

export interface OfficeExpense {
  id: string;
  date: string;
  type?: 'in' | 'out' | string;
  category: ExpenseCategory;
  description?: string;
  title?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  voucherNo?: string;
  paidBy?: string;
  paidTo?: string;
  notes?: string;
}

export type Expense = OfficeExpense;

export type StatementType = 'stock' | 'party' | 'payroll' | 'expense' | 'financial' | 'worker_tracking';

export interface FilterState {
  startDate: string;
  endDate: string;
  category?: string;
  search?: string;
}

// HR Punch & Leave Requests
export type RequestType = 'leave' | 'punch_fix';
export type LeaveType = 'full_day' | 'half_day' | 'sick' | 'casual';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PunchLeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  category: StaffCategory;
  requestType: RequestType;
  date: string;
  leaveType?: LeaveType;
  requestedInTime?: string;
  requestedOutTime?: string;
  reason: string;
  status: RequestStatus;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
}

// Worker Task & Damage Tracking (Processing Staff Only)
export type WorkerTaskStatus = 'assigned' | 'in_progress' | 'completed' | 'on_hold';

export interface WorkerDamageRecord {
  id: string;
  date: string;
  damagedPcs: number;
  reason: string; // 'cracked_board' | 'burnt_ic' | 'missing_parts' | 'handling_loss' | 'other'
  penaltyAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface ExtractedProductItem {
  id: string;
  name: string; // e.g. "CPU IC", "eMMC/Flash IC", "Camera Module", "Power IC", "Copper/Scrap"
  quantity: number; // pcs or kg
  unit: 'pcs' | 'kg' | 'gm';
  notes?: string;
}

export interface WorkerTaskRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  productName: string; // Source raw material e.g. "Android 4G/5G Mainboard", "Feature Phone Board", "Camera Circuit"
  batchNo?: string;
  givenPcs: number; // PCS product given (মাল দেওয়া হয়েছে)
  completedPcs: number; // PCS delivered upon completion (কাজ সম্পন্ন / জমা দেওয়া হয়েছে)
  damagedPcs: number; // Damaged / Wasted PCS (নষ্ট / ড্যামেজ পিস)
  status: WorkerTaskStatus;
  
  // Extracted/Produced Products from this raw material (কোন প্রোডাক্ট থেকে কী প্রোডাক্ট বের হলো)
  extractedProductSummary?: string; // Summary string e.g. "CPU IC (95 pcs), eMMC (98 pcs), ক্যামেরা (90 pcs)"
  extractedItems?: ExtractedProductItem[]; // Structured output yield products array

  // One-by-One Worker Time Tracking
  startTime?: string; // e.g. "09:30 AM" or "09:30"
  completionTime?: string; // e.g. "05:15 PM" or "17:15"
  durationMinutes?: number; // Duration in minutes
  timerStartedAt?: string; // ISO string if timer is running

  // Supervisor & Multi-Staff Team Assignment
  supervisorId?: string; // ID of assigned supervisor
  supervisorName?: string; // Name of assigned supervisor
  isSampleBatch?: boolean; // True if this is a sample/testing batch
  samplePassed?: boolean; // Status of sample testing

  damages?: WorkerDamageRecord[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisorSampleRecord {
  id: string;
  supervisorId: string;
  supervisorName: string;
  date: string;
  sampleName: string;
  testedQty: number;
  passedQty: number;
  failedQty: number;
  status: 'passed' | 'failed' | 'conditional';
  notes?: string;
  createdAt: string;
}

// ==========================================
// শাখা অফিস ও ৩য়-পক্ষ আরএমবি/বিডিটি ম্যানেজমেন্ট (Branch Office & 3rd Party RMB/BDT Management)
// ==========================================

export type ConsignmentStatus = 'dispatched' | 'in_transit' | 'received_at_branch' | 'sold';

export interface BranchConsignmentItem {
  id: string;
  name: string; // e.g. "CPU IC", "Camera Module", "Android 4G/5G eMMC", "Mixed Scrap Board"
  category?: string;
  quantity: number;
  unit: 'pcs' | 'kg' | 'lot';
  unitCostBdt: number; // দর (টাকা)
  totalCostBdt: number; // মোট মূল্য (টাকা)
  estimatedRmbRate?: number; // আনুমানিক RMB দর (¥)
  estimatedRmbTotal?: number; // আনুমানিক মোট RMB (¥)
  notes?: string;
}

export interface BranchConsignment {
  id: string;
  consignmentNo: string; // e.g. "BC-2026-001"
  date: string;
  branchName: string; // e.g. "চীন/গুয়াংজু শাখা অফিস"
  destinationCity?: string; // e.g. "Guangzhou", "Hong Kong", "Shenzhen"
  items: BranchConsignmentItem[];
  totalBdtValue: number; // বাংলাদেশ থেকে পাঠানো মালের মোট বিডিটি মূল্য
  totalRmbEstimated: number; // আনুমানিক মোট RMB মূল্য
  shippingMethod: 'Air Cargo' | 'Sea Cargo' | 'Hand Carry' | 'Courier' | 'Other';
  trackingNo?: string;
  carrierName?: string; // e.g. "DHL", "SF Express", "Bangladesh Air Cargo"
  shippingCostBdt?: number;
  status: ConsignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchRmbRemittance {
  id: string;
  date: string;
  referenceNo: string; // e.g. "REM-2026-001"
  branchName: string; // e.g. "চীন শাখা অফিস"
  rmbAmount: number; // শাখা অফিস থেকে প্রেরিত RMB (¥)
  consignmentId?: string; // সংশ্লিষ্ট চালান (যদি থাকে)
  consignmentNo?: string;
  receivedVia: 'WeChat Pay' | 'Alipay' | 'Chinese Bank' | 'Cash' | 'Other';
  accountDetails?: string; // e.g. "WeChat: RSR-01"
  notes?: string;
  createdAt: string;
}

export type SettlementStatus = 'settled' | 'partial' | 'pending';

export interface ConversionPaymentHistory {
  id: string;
  date: string;
  amountBdt: number;
  method: 'bank_transfer' | 'cash' | 'bKash' | 'nagad';
  accountDetails?: string;
  voucherNo?: string;
  notes?: string;
}

export interface ThirdPartyRmbConversion {
  id: string;
  date: string;
  voucherNo: string; // e.g. "CNV-2026-001"
  partyName: string; // থার্ড-পার্টি এজেন্ট বা মানি এক্সচেঞ্জার (e.g. "আলম মানি এক্সচেঞ্জ", "হুন্ডি ব্রোকার")
  partyPhone?: string;
  rmbAmountGiven: number; // মোট কত RMB দেওয়া হলো (¥)
  exchangeRate: number; // কনভার্শন রেট (BDT per RMB, e.g. 16.85)
  expectedBdtAmount: number; // কনভার্ট হয়ে প্রত্যাশিত মোট BDT (টাকা) = rmbAmountGiven * exchangeRate
  receivedBdtAmount: number; // কনভার্ট হয়ে মোট কত BDT পাওয়া গেল (টাকা)
  remainingDueBdt: number; // থার্ড-পার্টির কাছে বর্তমান বাকি/ডিউ BDT (expectedBdtAmount - receivedBdtAmount)
  settlementStatus: SettlementStatus; // 'settled' | 'partial' | 'pending'
  paymentMethod: 'bank_transfer' | 'cash' | 'bKash' | 'nagad' | 'multiple';
  bankAccountDetails?: string;
  historyPayments?: ConversionPaymentHistory[]; // কিস্তি বা আংশিক পেমেন্ট হিস্ট্রি
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// দর তালিকা তৈরি (Price List Make with 3 Specific Pricing Columns)
// ==========================================

export interface PriceListItem {
  id: string;
  productName: string;
  category?: string;
  code?: string;
  unit: 'pcs' | 'kg';
  // Exactly 3 specific pricing columns per requirement:
  // 1. 100% Cash Payment Price (নগদ মূল্য)
  cashPrice: number;
  // 2. Protidin 1ti kore Payment (প্রতিদিন ১টি করে পেমেন্ট)
  dailyPaymentPrice: number;
  // 3. 1 Masher Baki Payment (১ মাসের বাকি পেমেন্ট)
  monthlyCreditPrice: number;
  notes?: string;
}

export interface PriceList {
  id: string;
  title: string; // e.g. "আজকের বাজার দর তালিকা / Daily Price List"
  date: string;
  companyName: string;
  companyAddress: string;
  companyPhones: string[];
  companyLogoUrl?: string;
  items: PriceListItem[];
  notes?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ওয়ার্কার পণ্য রূপান্তর ও আউটপুট এক্সট্রাকশন (Worker Product Conversion & Yield)
// ==========================================

export interface WorkerProductConversion {
  id: string;
  date: string;
  workerId: string;
  workerName: string;
  inputProduct: string; // e.g. "64GB Board / Circuit"
  inputQty: number; // e.g. 1
  inputUnit: 'pcs' | 'kg';
  outputProduct: string; // e.g. "32GB Board / Circuit"
  outputQty: number; // e.g. 2
  outputUnit: 'pcs' | 'kg';
  wastageOrLoss?: number; // e.g. loss or scrap in pcs/gm
  extractedPartsSummary?: string; // e.g. "2x CPU IC, 1x eMMC"
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

