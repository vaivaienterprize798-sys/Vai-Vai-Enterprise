import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Plus,
  Users,
  Calendar,
  Printer,
  Share2,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  UserCheck,
  Edit2,
  Trash2,
  UserCog,
  UserPlus,
  UserMinus,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Wallet,
  CreditCard,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  Staff,
  AttendanceRecord,
  StaffCategory,
  AttendanceStatus,
  StaffPaymentStatus,
  Language,
  DEFAULT_COMPANY,
  PunchLeaveRequest,
  RequestType,
  LeaveType,
} from '../types';
import {
  translations,
  formatCurrency,
  formatNumber,
  formatDate,
} from '../lib/translations';
import { storageService } from '../lib/storage';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

interface PayrollPanelProps {
  staff: Staff[];
  attendance: AttendanceRecord[];
  punchRequests?: PunchLeaveRequest[];
  lang: Language;
  onSaveAttendance: (rec: AttendanceRecord) => void;
  onSaveStaff: (stf: Staff) => void;
  onDeleteStaff?: (id: string) => void;
  onSavePunchRequest?: (req: PunchLeaveRequest) => void;
  onDeletePunchRequest?: (id: string) => void;
  onPrintPayrollStatement: (staffId?: string, selectedMonth?: string) => void;
  isSuperAdmin?: boolean;
  userSession?: any;
}

export const PayrollPanel: React.FC<PayrollPanelProps> = ({
  staff,
  attendance,
  punchRequests = [],
  lang,
  onSaveAttendance,
  onSaveStaff,
  onDeleteStaff,
  onSavePunchRequest,
  onDeletePunchRequest,
  onPrintPayrollStatement,
  isSuperAdmin = true,
  userSession,
}) => {
  const t = translations[lang];

  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // e.g. "2026-09"

  // Month-wise Filtering state
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'office' | 'processing'>('all');

  // Salary Payment Status State Map ({ "2026-09_stf-1": "Paid", ... })
  const [salaryPayments, setSalaryPayments] = useState<Record<string, 'Paid' | 'Unpaid'>>(() => {
    return storageService.getSalaryPayments();
  });

  // Keep salaryPayments in sync when storage updates
  useEffect(() => {
    setSalaryPayments(storageService.getSalaryPayments());
  }, [selectedMonth]);

  const handleTogglePaymentStatus = (staffId: string, targetStatus?: 'Paid' | 'Unpaid') => {
    const key = `${selectedMonth}_${staffId}`;
    const current = salaryPayments[key] || 'Unpaid';
    const nextStatus: 'Paid' | 'Unpaid' = targetStatus || (current === 'Paid' ? 'Unpaid' : 'Paid');
    storageService.setStaffPaymentStatus(selectedMonth, staffId, nextStatus);
    setSalaryPayments((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
  };

  const formatMonthDisplay = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    if (isNaN(date.getTime())) return monthStr;

    if (lang === 'bn') {
      const bnMonths = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      return `${bnMonths[m - 1]} ${y}`;
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Attendance Quick Record Modal
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [attDate, setAttDate] = useState<string>(todayStr);
  const [attStaffId, setAttStaffId] = useState<string>('');
  const [attInTime, setAttInTime] = useState<string>('10:00');
  const [attOutTime, setAttOutTime] = useState<string>('22:00');
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('present');
  const [attAdvance, setAttAdvance] = useState<number>(0);
  const [attNotes, setAttNotes] = useState<string>('');

  // Staff Management Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffCategory, setStaffCategory] = useState<StaffCategory>('office');
  const [staffDesignation, setStaffDesignation] = useState('');
  const [staffSalary, setStaffSalary] = useState<number | string>(20000);
  const [staffLoginCode, setStaffLoginCode] = useState('');
  const [staffPassword, setStaffPassword] = useState('123456');
  const [staffRole, setStaffRole] = useState<'admin' | 'staff'>('staff');
  const [staffIsSupervisor, setStaffIsSupervisor] = useState(false);

  // Punch & Leave Requests State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAdminReviewModalOpen, setIsAdminReviewModalOpen] = useState(false);
  const [reqStaffId, setReqStaffId] = useState<string>('');
  const [reqType, setReqType] = useState<RequestType>('leave');
  const [reqDate, setReqDate] = useState<string>(todayStr);
  const [reqLeaveType, setReqLeaveType] = useState<LeaveType>('full_day');
  const [reqInTime, setReqInTime] = useState<string>('09:00');
  const [reqOutTime, setReqOutTime] = useState<string>('19:00');
  const [reqReason, setReqReason] = useState<string>('');

  const pendingRequests = useMemo(() => {
    return punchRequests.filter((r) => r.status === 'pending');
  }, [punchRequests]);

  const openNewStaffModal = () => {
    setEditingStaff(null);
    setStaffName('');
    setStaffPhone('');
    setStaffCategory('office');
    setStaffDesignation('');
    setStaffSalary(20000);
    setStaffLoginCode(`STF0${staff.length + 1}`);
    setStaffPassword('123456');
    setStaffRole('staff');
    setStaffIsSupervisor(false);
    setIsStaffModalOpen(true);
  };

  const openEditStaffModal = (stf: Staff) => {
    setEditingStaff(stf);
    setStaffName(stf.name);
    setStaffPhone(stf.phone || '');
    setStaffCategory(stf.category);
    setStaffDesignation(stf.designation || '');
    setStaffSalary(stf.baseSalary ?? 20000);
    setStaffLoginCode(stf.loginCode || stf.id || `STF0${staff.length}`);
    setStaffPassword(stf.password || '123456');
    setStaffRole(stf.role || 'staff');
    setStaffIsSupervisor(Boolean(stf.isSupervisor));
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaffClick = (stf: Staff) => {
    const confirmed = confirm(
      lang === 'bn'
        ? `আপনি কি নিশ্চিতভাবে "${stf.name}" স্টাফকে মুছে ফেলতে চান?`
        : `Are you sure you want to remove staff "${stf.name}"?`
    );
    if (confirmed && onDeleteStaff) {
      onDeleteStaff(stf.id);
    }
  };

  // Helper to check if a date is Friday
  const isFriday = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDay() === 5;
  };

  // Auto Calculate Late Minutes & OT Hours based on official policies:
  // 1. Office Staff: 30 days calculation (dailyRate = baseSalary / 30). Strictly NO OT and NO late count.
  // 2. Processing Staff: Friday rule applies ONLY to processing staff (Friday weekly holiday, Friday duty 100% OT @ ৳60/hr).
  //    Regular days: 9:00 AM shift, late after 9:30 AM, regular OT after 7:00 PM (10 hrs shift) @ ৳60/hr.
  const calculateAttendanceMetrics = (
    cat: StaffCategory,
    inTimeStr: string,
    outTimeStr: string,
    status: AttendanceStatus,
    dateStr: string = todayStr
  ) => {
    // 1. Office Staff Rule:
    // Office staff has fixed monthly salary based on 30 days. NO OT and NO late count at all.
    if (cat === 'office') {
      return { lateMinutes: 0, otHours: 0, otAmount: 0, isLate: false, isFridayWork: false };
    }

    // 2. Weekly Friday Policy (ONLY for Processing Staff):
    // Friday is officially weekly off ONLY for processing staff.
    // If a processing staff works on Friday, the ENTIRE duration is counted as Overtime (OT) at ৳60/hr.
    if (isFriday(dateStr)) {
      if (status === 'present') {
        const effectiveIn = inTimeStr || '09:00';
        const effectiveOut = outTimeStr || '19:00';
        const [inH, inM] = effectiveIn.split(':').map(Number);
        const [outH, outM] = effectiveOut.split(':').map(Number);
        const inMins = (inH || 0) * 60 + (inM || 0);
        const outMins = (outH || 0) * 60 + (outM || 0);
        const workedMins = Math.max(0, outMins - inMins);
        const otHours = Math.round((workedMins / 60) * 2) / 2; // nearest 0.5 hour
        const otAmount = otHours * 60; // strictly ৳60/hr
        return { lateMinutes: 0, otHours, otAmount, isLate: false, isFridayWork: true };
      }
      return { lateMinutes: 0, otHours: 0, otAmount: 0, isLate: false, isFridayWork: false };
    }

    // 3. Leave, Holiday or Absent on regular days for processing staff
    if (
      status === 'absent' ||
      status === 'leave' ||
      status === 'holiday' ||
      status === 'full_day_leave' ||
      status === 'half_day_leave'
    ) {
      return { lateMinutes: 0, otHours: 0, otAmount: 0, isLate: false, isFridayWork: false };
    }

    // 4. Regular Days (Sat-Thu) for Processing Staff:
    const fixedInMinutes = 9 * 60; // 09:00 AM = 540 minutes
    const lateGraceMinutes = 9 * 60 + 30; // 09:30 AM = 570 minutes
    const requiredShiftMinutes = 10 * 60; // 10 hours full shift = 600 minutes (09:00 to 19:00)

    let actualInMinutes = fixedInMinutes;
    let actualOutMinutes = 19 * 60;

    if (inTimeStr) {
      const [h, m] = inTimeStr.split(':').map(Number);
      actualInMinutes = (h || 0) * 60 + (m || 0);
    }
    if (outTimeStr) {
      const [h, m] = outTimeStr.split(':').map(Number);
      actualOutMinutes = (h || 0) * 60 + (m || 0);
    }

    // Late count starts strictly after 9:30 AM
    let lateMinutes = 0;
    let isLate = false;
    if (actualInMinutes > lateGraceMinutes) {
      isLate = true;
      lateMinutes = actualInMinutes - fixedInMinutes; // Counted from 9:00 AM shift in-time
    }

    // Overtime (OT) is calculated only after completing the required full-time hours (after 7:00 PM):
    const totalWorkedMinutes = Math.max(0, actualOutMinutes - actualInMinutes);
    let otHours = 0;
    if (totalWorkedMinutes > requiredShiftMinutes) {
      const extraMinutes = totalWorkedMinutes - requiredShiftMinutes;
      otHours = Math.round((extraMinutes / 60) * 2) / 2;
    }
    const otAmount = otHours * 60; // strictly 60 Taka per hour

    return { lateMinutes, otHours, otAmount, isLate, isFridayWork: false };
  };

  const openRecordModal = (stf?: Staff, customDate?: string) => {
    const target = stf || staff[0];
    if (!target) return;
    const dateToUse = customDate || selectedDate || todayStr;
    const isOff = target.category === 'office';
    const friday = isFriday(dateToUse) && !isOff; // Friday holiday only for processing staff
    setAttDate(dateToUse);
    setAttStaffId(target.id);

    // Check if attendance already recorded for this staff on this date
    const existing = attendance.find((a) => a.staffId === target.id && a.date === dateToUse);
    if (existing) {
      setAttInTime(existing.inTime || (isOff ? '10:00' : '09:00'));
      setAttOutTime(existing.outTime || (isOff ? '22:00' : '19:00'));
      setAttStatus(existing.status);
      setAttAdvance(existing.advanceDeduction || 0);
      setAttNotes(existing.notes || '');
    } else {
      setAttInTime(isOff ? '10:00' : '09:00');
      setAttOutTime(isOff ? '22:00' : '19:00');
      setAttStatus(friday ? 'holiday' : 'present');
      setAttAdvance(0);
      setAttNotes(
        friday
          ? (lang === 'bn' ? 'সাপ্তাহিক ছুটি (শুক্রবার)' : 'Weekly Holiday (Friday)')
          : isOff
          ? (lang === 'bn' ? 'অফিস নিয়মিত শিফট (১০:০০-২২:০০, ৩০ দিন বেসিস)' : 'Office Shift (10:00-22:00, 30d base)')
          : ''
      );
    }
    setIsAttModalOpen(true);
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const stf = staff.find((s) => s.id === attStaffId);
    if (!stf) return;

    const targetDate = attDate || selectedDate || todayStr;
    const friday = isFriday(targetDate);

    // If it's Friday and processing staff is absent, ensure it's marked as holiday so no salary is deducted
    const effectiveStatus: AttendanceStatus =
      friday && stf.category === 'processing' && attStatus === 'absent' ? 'holiday' : attStatus;

    const { lateMinutes, otHours, otAmount, isLate, isFridayWork } = calculateAttendanceMetrics(
      stf.category,
      attInTime,
      attOutTime,
      effectiveStatus,
      targetDate
    );

    // Office Staff is never marked as late or OT; processing staff marked late if after 9:30 AM
    const finalStatus: AttendanceStatus =
      effectiveStatus === 'present' && isLate && stf.category !== 'office'
        ? 'late'
        : effectiveStatus;

    let notesText = attNotes.trim();
    if (isFridayWork && !notesText.includes('শুক্রবার') && stf.category === 'processing') {
      notesText = notesText
        ? `${notesText} (শুক্রবার ডিউটি ওটি: ${otHours} ঘণ্টা)`
        : `শুক্রবার ডিউটি ওটি (${otHours} ঘণ্টা সম্পূর্ণ ওভারটাইম হিসেবে গণ্য)`;
    }

    const existing = attendance.find((a) => a.staffId === stf.id && a.date === targetDate);

    const rec: AttendanceRecord = {
      id: existing ? existing.id : `att-${Date.now()}-${stf.id}`,
      staffId: stf.id,
      staffName: stf.name,
      category: stf.category,
      date: targetDate,
      inTime: (effectiveStatus === 'absent' || effectiveStatus === 'full_day_leave' || effectiveStatus === 'holiday') ? '' : attInTime,
      outTime: (effectiveStatus === 'absent' || effectiveStatus === 'full_day_leave' || effectiveStatus === 'holiday') ? '' : attOutTime,
      status: finalStatus,
      lateMinutes,
      otHours,
      otAmount,
      advanceDeduction: Number(attAdvance) || 0,
      notes: notesText,
    };

    onSaveAttendance(rec);
    setIsAttModalOpen(false);
  };

  // Day-by-Day Batch Attendance Auto-Fill for the selected date
  const handleAutoRecordAllForDate = () => {
    const friday = isFriday(selectedDate);
    const existingDateStaffIds = new Set(
      attendance.filter((a) => a.date === selectedDate).map((a) => a.staffId)
    );

    const activeStaff = staff.filter((s) => s.active !== false);
    let count = 0;

    activeStaff.forEach((stf) => {
      // Don't overwrite if already recorded for this date
      if (existingDateStaffIds.has(stf.id)) return;

      const isOff = stf.category === 'office';
      const inT = isOff ? '10:00' : '09:00';
      const outT = isOff ? '22:00' : '19:00';
      const status: AttendanceStatus = friday ? 'holiday' : 'present';

      const { lateMinutes, otHours, otAmount } = calculateAttendanceMetrics(
        stf.category,
        inT,
        outT,
        status,
        selectedDate
      );

      const rec: AttendanceRecord = {
        id: `att-${Date.now()}-${stf.id}`,
        staffId: stf.id,
        staffName: stf.name,
        category: stf.category,
        date: selectedDate,
        inTime: friday ? '' : inT,
        outTime: friday ? '' : outT,
        status,
        lateMinutes,
        otHours,
        otAmount,
        advanceDeduction: 0,
        notes: friday
          ? (lang === 'bn' ? 'সাপ্তাহিক ছুটি (শুক্রবার)' : 'Weekly Holiday (Friday)')
          : (lang === 'bn' ? 'নিয়মিত শিফট অটো-হাজিরা' : 'Regular Shift Attendance'),
      };

      onSaveAttendance(rec);
      count++;
    });

    if (count > 0) {
      alert(
        lang === 'bn'
          ? `${selectedDate} তারিখের জন্য ${count} জন স্টাফের হাজিরা সফলভাবে অটো-রেকর্ড করা হয়েছে!`
          : `Attendance for ${count} staff auto-recorded for ${selectedDate}!`
      );
    } else {
      alert(
        lang === 'bn'
          ? `এই তারিখের (${selectedDate}) সকল স্টাফের হাজিরা পূর্বেই রেকর্ড করা আছে।`
          : `All staff attendance already recorded for ${selectedDate}.`
      );
    }
  };

  // Leave & Punch Request Handlers
  const handleOpenNewRequestModal = (stfId?: string) => {
    setReqStaffId(stfId || staff[0]?.id || '');
    setReqType('leave');
    setReqDate(todayStr);
    setReqLeaveType('full_day');
    setReqInTime('09:00');
    setReqOutTime('19:00');
    setReqReason('');
    setIsRequestModalOpen(true);
  };

  const handleSaveRequestForm = (e: React.FormEvent) => {
    e.preventDefault();
    const stf = staff.find((s) => s.id === reqStaffId);
    if (!stf || !reqReason.trim()) {
      alert(lang === 'bn' ? 'আবেদনের কারণ ও স্টাফ নির্বাচন করুন' : 'Please select staff and reason');
      return;
    }

    const newReq: PunchLeaveRequest = {
      id: `pnc-${Date.now()}`,
      staffId: stf.id,
      staffName: stf.name,
      category: stf.category,
      requestType: reqType,
      date: reqDate || todayStr,
      leaveType: reqType === 'leave' ? reqLeaveType : undefined,
      requestedInTime: reqType === 'punch_fix' ? reqInTime : undefined,
      requestedOutTime: reqType === 'punch_fix' ? reqOutTime : undefined,
      reason: reqReason.trim(),
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };

    if (onSavePunchRequest) {
      onSavePunchRequest(newReq);
    }
    setIsRequestModalOpen(false);
  };

  const handleApproveRequest = (req: PunchLeaveRequest) => {
    const stf = staff.find((s) => s.id === req.staffId);
    if (!stf) return;

    if (req.requestType === 'leave') {
      const leaveRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        staffId: req.staffId,
        staffName: req.staffName,
        category: req.category,
        date: req.date,
        inTime: '',
        outTime: '',
        status: req.leaveType === 'half_day' ? 'half_day_leave' : 'full_day_leave',
        lateMinutes: 0,
        otHours: 0,
        otAmount: 0,
        advanceDeduction: 0,
        notes: `ছুটি অনুমোদিত: ${req.reason}`,
      };
      onSaveAttendance(leaveRec);
    } else {
      const inT = req.requestedInTime || '09:00';
      const outT = req.requestedOutTime || '19:00';
      const { lateMinutes, otHours, otAmount, isLate } = calculateAttendanceMetrics(
        req.category,
        inT,
        outT,
        'present',
        req.date
      );
      const fixRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        staffId: req.staffId,
        staffName: req.staffName,
        category: req.category,
        date: req.date,
        inTime: inT,
        outTime: outT,
        status: isLate ? 'late' : 'present',
        lateMinutes,
        otHours,
        otAmount,
        advanceDeduction: 0,
        notes: `পাঞ্চ সংশোধন অনুমোদিত: ${req.reason}`,
      };
      onSaveAttendance(fixRec);
    }

    if (onSavePunchRequest) {
      onSavePunchRequest({
        ...req,
        status: 'approved',
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString(),
      });
    }
  };

  const handleRejectRequest = (req: PunchLeaveRequest, adminNote?: string) => {
    if (onSavePunchRequest) {
      onSavePunchRequest({
        ...req,
        status: 'rejected',
        reviewedBy: 'Admin',
        reviewedAt: new Date().toISOString(),
        adminNotes: adminNote || 'আবেদন বাতিল করা হয়েছে',
      });
    }
  };

  const handleSaveStaffForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;

    const baseSal = Number(staffSalary) || 15000;
    // Office staff uses 30 days calculation, processing staff uses 26 days calculation
    const divisor = staffCategory === 'office' ? 30 : 26;
    const dailyRate = Math.round(baseSal / divisor);

    const newStaff: Staff = {
      id: editingStaff ? editingStaff.id : `stf-${Date.now()}`,
      name: staffName.trim(),
      phone: staffPhone.trim(),
      category: staffCategory,
      designation: staffDesignation.trim(),
      baseSalary: baseSal,
      dailyRate,
      joinDate: editingStaff ? editingStaff.joinDate : todayStr,
      active: true,
      loginCode: staffLoginCode.trim() || `STF0${staff.length + 1}`,
      password: staffPassword.trim() || '123456',
      role: staffRole,
      isSupervisor: staffIsSupervisor,
    };

    onSaveStaff(newStaff);
    setIsStaffModalOpen(false);
  };

  // Filter attendance records by the selected month
  const monthAttendance = useMemo(() => {
    return attendance.filter((a) => a.date && a.date.startsWith(selectedMonth));
  }, [attendance, selectedMonth]);

  // Staff Monthly Aggregated Payroll Computed for the selected month
  // 1. Weekly Holiday: Friday is officially off. Friday absences are NEVER deducted.
  // 2. Friday Duty OT: Any staff (office or processing) working on Friday earns full duration as Overtime (OT) at ৳60/hr.
  // 3. 26 Days Base: Daily rate is strictly baseSalary / 26 days.
  // 4. Leave Policy: Full Day / Half Day / Approved Leaves are 100% fully paid without deduction.
  const staffPayrollSummary = useMemo(() => {
    return staff.map((stf) => {
      const isOffice = stf.category === 'office';
      const records = monthAttendance.filter((a) => a.staffId === stf.id);
      const daysPresent = records.filter(
        (a) => a.status === 'present' || a.status === 'late'
      ).length;
      const leaveDays = records.filter(
        (a) =>
          a.status === 'full_day_leave' ||
          a.status === 'half_day_leave' ||
          a.status === 'leave' ||
          a.status === 'holiday'
      ).length;

      // Office Staff: 30 days calculation. Processing Staff: 26 days calculation.
      const daysBase = isOffice ? 30 : 26;
      const dailyRate = Math.round(Number(stf.baseSalary || 0) / daysBase);

      // Unexcused absences:
      // - Calculated dynamically as the difference between required daysBase and actual paid/present days
      // Count only working days (Friday is the weekly holiday) that have already passed in the selected month.
      // A Friday attendance never counts toward the required days, so it can't cancel an absence.
      const [selY, selM] = selectedMonth.split('-').map(Number);
      const monthDays = new Date(selY, selM, 0).getDate();
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === selY && now.getMonth() + 1 === selM;
      const isFutureMonth = selY > now.getFullYear() || (selY === now.getFullYear() && selM > now.getMonth() + 1);
      const lastDay = isFutureMonth ? 0 : isCurrentMonth ? now.getDate() : monthDays;
      let requiredDays = 0;
      for (let d = 1; d <= lastDay; d++) {
        if (new Date(selY, selM - 1, d).getDay() !== 5) requiredDays++;
      }
      const isFriday = (date: string) => new Date(`${date}T00:00:00`).getDay() === 5;
      const paidWorkingDays = new Set(
        records
          .filter((a) => !isFriday(a.date) && a.status !== 'absent')
          .map((a) => a.date)
      ).size;
      const absentDays = records.length === 0 ? 0 : Math.min(daysBase, Math.max(0, requiredDays - paidWorkingDays));
      
      // Office staff: strictly NO late count and NO OT
      const lateDays = isOffice ? 0 : records.filter((a) => a.status === 'late').length;
      const totalLateMinutes = isOffice ? 0 : records.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
      const lateDeduction = Math.round((totalLateMinutes / 60) * (dailyRate / 10));
      const totalOtHours = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otHours || 0), 0);
      const totalOtAmount = isOffice ? 0 : records.reduce((sum, a) => sum + (a.otAmount !== undefined ? a.otAmount : (a.otHours || 0) * 60), 0);
      const totalAdvance = records.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
      const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(stf.id, selectedMonth);

      const absentDeduction = Math.round((absentDays * Number(stf.baseSalary || 0)) / daysBase);
      const earnedBase = Math.max(0, stf.baseSalary - absentDeduction);
      // Not clamped: if advance exceeds earnings, net is negative (staff owes the company)
      const netSalary = Math.round(earnedBase + totalOtAmount - totalAdvance - damageDeduction - lateDeduction);

      const paymentKey = `${selectedMonth}_${stf.id}`;
      const paymentStatus: StaffPaymentStatus = (salaryPayments[paymentKey] as StaffPaymentStatus) || 'Unpaid';

      return {
        ...stf,
        dailyRate,
        daysPresent: records.length === 0 ? (isOffice ? 30 : 26) : daysPresent,
        leaveDays,
        absentDays,
        lateDays,
        totalLateMinutes,
        lateDeduction,
        totalOtHours,
        totalOtAmount,
        totalAdvance,
        damageDeduction,
        absentDeduction,
        earnedBase,
        netSalary,
        paymentStatus,
      };
    });
  }, [staff, monthAttendance, selectedMonth, salaryPayments]);

  // Advance correction editor
  const [advEditStaffId, setAdvEditStaffId] = useState<string | null>(null);
  const [advEdits, setAdvEdits] = useState<Record<string, number>>({});
  const advEditRecords = useMemo(
    () =>
      advEditStaffId
        ? monthAttendance.filter((a) => a.staffId === advEditStaffId).sort((a, b) => a.date.localeCompare(b.date))
        : [],
    [advEditStaffId, monthAttendance]
  );
  const openAdvanceEditor = (staffId: string) => {
    const recs = monthAttendance.filter((a) => a.staffId === staffId);
    const init: Record<string, number> = {};
    recs.forEach((r) => (init[r.id] = Number(r.advanceDeduction) || 0));
    setAdvEdits(init);
    setAdvEditStaffId(staffId);
  };
  const saveAdvanceCorrections = () => {
    advEditRecords.forEach((r) => {
      const v = Math.max(0, Number(advEdits[r.id]) || 0);
      if (v !== (Number(r.advanceDeduction) || 0)) onSaveAttendance({ ...r, advanceDeduction: v });
    });
    setAdvEditStaffId(null);
  };

  // Executive Summary Card Metrics for the selected month
  const executiveSummary = useMemo(() => {
    const totalStaff = staffPayrollSummary.length;
    // Payable totals only count positive net salary; negative (over-advance) is tracked separately
    const totalSalary = staffPayrollSummary.reduce((sum, s) => sum + Math.max(0, s.netSalary), 0);
    const paidSalary = staffPayrollSummary
      .filter((s) => s.paymentStatus === 'Paid')
      .reduce((sum, s) => sum + Math.max(0, s.netSalary), 0);
    const unpaidSalary = staffPayrollSummary
      .filter((s) => s.paymentStatus === 'Unpaid')
      .reduce((sum, s) => sum + Math.max(0, s.netSalary), 0);

    const paidCount = staffPayrollSummary.filter((s) => s.paymentStatus === 'Paid').length;
    const unpaidCount = staffPayrollSummary.filter((s) => s.paymentStatus === 'Unpaid').length;
    const paidPercentage = totalSalary > 0 ? Math.round((paidSalary / totalSalary) * 100) : 0;

    return {
      totalStaff,
      totalSalary,
      paidSalary,
      unpaidSalary,
      paidCount,
      unpaidCount,
      paidPercentage,
    };
  }, [staffPayrollSummary]);

  // Filtered attendance for daily logs table
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      const matchDate = !selectedDate || a.date === selectedDate;
      const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
      return matchDate && matchCat;
    });
  }, [attendance, selectedDate, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t.hrPayroll}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'অফিস ও প্রসেসিং স্টাফদের হাজিরা, লেট কাউন্ট, ফিক্সড ৬০ টাকা হারে ওভারটাইম ও মাসভিত্তিক পে-রোল'
              : 'Office & processing staff shifts, automated late calculation, ৳60/hr OT rate, and month-wise payroll'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setIsAdminReviewModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer relative"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ছুটি ও পাঞ্চ আবেদন' : 'Punch & Leave Requests'}</span>
              {pendingRequests.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center animate-bounce">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => handleOpenNewRequestModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>{lang === 'bn' ? 'আবেদন করুন' : 'Apply Request'}</span>
          </button>

          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={lang === 'bn' ? 'হোয়াটসঅ্যাপ রিপোর্ট' : 'Share WhatsApp'}
            getText={() => {
              const companyInfo = storageService.getCompanyInfo();
              return `*${companyInfo.name} - স্টাফ বেতন ও হাজিরা সামারি*\n📅 মাস: ${selectedMonth}\n────────────────────────\n👥 মোট স্টাফ: ${executiveSummary.totalStaff} জন\n💵 মোট বেতন বিল: ৳${executiveSummary.totalSalary.toLocaleString()}\n✅ পরিশোধিত বেতন: ৳${executiveSummary.paidSalary.toLocaleString()} (${executiveSummary.paidCount} জন)\n⏳ বকেয়া বেতন: ৳${executiveSummary.unpaidSalary.toLocaleString()} (${executiveSummary.unpaidCount} জন)\n────────────────────────\n_${companyInfo.name}_`;
            }}
          />

          <button
            onClick={() => onPrintPayrollStatement(undefined, selectedMonth)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.payrollStatement1Page}</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => openRecordModal()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{t.recordAttendance}</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={openNewStaffModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{lang === 'bn' ? '+ নতুন স্টাফ / হেড সুপারভাইজার যোগ করুন' : '+ Add Staff / Head Supervisor'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Month-Wise Selector & Executive Payroll Summary Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-slate-700/60 space-y-5">
        {/* Month Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  {lang === 'bn' ? 'বেতনের মাস নির্বাচন' : 'Salary Month & Period'}
                </span>
                {selectedMonth === currentMonthStr && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {lang === 'bn' ? 'চলতি মাস' : 'Current Month'}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white capitalize flex items-center gap-2">
                {formatMonthDisplay(selectedMonth)}
              </h3>
            </div>
          </div>

          {/* Month Controller Controls */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 self-start md:self-auto">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={lang === 'bn' ? 'পূর্ববর্তী মাস' : 'Previous Month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="bg-slate-900 border border-slate-600 hover:border-emerald-500 text-white text-xs font-mono font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={lang === 'bn' ? 'পরবর্তী মাস' : 'Next Month'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedMonth !== currentMonthStr && (
              <button
                onClick={handleCurrentMonth}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer ml-1"
              >
                {lang === 'bn' ? 'চলতি মাস' : 'Today'}
              </button>
            )}
          </div>
        </div>

        {/* 3 Real-time Dynamic Executive Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Staff Salary */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2 relative overflow-hidden backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                {lang === 'bn' ? 'মোট স্টাফ বেতন (Net Payable)' : 'Total Staff Salary'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {formatCurrency(executiveSummary.totalSalary, lang)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
              <span>{lang === 'bn' ? 'মোট স্টাফ সংখ্যা:' : 'Total Staff:'}</span>
              <span className="font-bold text-white">{formatNumber(executiveSummary.totalStaff, lang)} {lang === 'bn' ? 'জন' : ''}</span>
            </div>
          </div>

          {/* Card 2: Total Paid Salary */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2 relative overflow-hidden backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300">
                {lang === 'bn' ? 'মোট পরিশোধিত বেতন (Paid)' : 'Total Paid Salary'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {formatCurrency(executiveSummary.paidSalary, lang)}
            </div>
            <div className="space-y-1 pt-1 border-t border-emerald-900/60">
              <div className="flex items-center justify-between text-[11px] text-emerald-300/80">
                <span>{lang === 'bn' ? 'পরিশোধিত স্টাফ:' : 'Paid Staff:'}</span>
                <span className="font-bold text-emerald-300">
                  {formatNumber(executiveSummary.paidCount, lang)} {lang === 'bn' ? 'জন' : ''} ({executiveSummary.paidPercentage}%)
                </span>
              </div>
              <div className="w-full bg-emerald-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${executiveSummary.paidPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Total Unpaid Salary */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 relative overflow-hidden backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300">
                {lang === 'bn' ? 'মোট বকেয়া / অপরিশোধিত (Unpaid)' : 'Total Unpaid Salary'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {formatCurrency(executiveSummary.unpaidSalary, lang)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-amber-300/80 pt-1 border-t border-amber-900/60">
              <span>{lang === 'bn' ? 'বকেয়া স্টাফ:' : 'Unpaid Staff:'}</span>
              <span className="font-bold text-amber-300">
                {formatNumber(executiveSummary.unpaidCount, lang)} {lang === 'bn' ? 'জন' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Attendance & Payroll Policy Notice Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Friday Policy */}
        <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 text-xs space-y-1">
          <div className="font-bold text-teal-900 dark:text-teal-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">🕌 {lang === 'bn' ? 'শুক্রবার ছুটি ও ওটি (প্রসেসিং স্টাফ)' : 'Friday Holiday & OT (Processing)'}</span>
            <span className="text-[10px] bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-200 px-2 py-0.5 rounded-full font-mono font-bold">
              {lang === 'bn' ? 'প্রসেসিং: ওটি ৬০৳/ঘণ্টা' : 'Processing: OT ৳60/hr'}
            </span>
          </div>
          <p className="text-[11px] text-teal-800 dark:text-teal-400">
            {lang === 'bn'
              ? 'শুক্রবার ছুটির নিয়মটি শুধুমাত্র প্রসেসিং স্টাফদের ক্ষেত্রে প্রযোজ্য। ছুটির দিনে কাজ করলে পুরো সময়টি ওভারটাইম (OT) হিসেবে গণ্য হবে।'
              : 'Friday holiday rule applies ONLY to processing staff. Any Friday duty is 100% overtime (OT) at ৳60/hr.'}
          </p>
        </div>

        {/* 26 Days vs 30 Days Calculation */}
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 text-xs space-y-1">
          <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">📅 {lang === 'bn' ? '২৬ দিন ও ৩০ দিন বেতন গণনা' : '26-Day & 30-Day Salary Base'}</span>
            <span className="text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-full font-mono font-bold">
              {lang === 'bn' ? 'প্রসেসিং ২৬ দিন | অফিস ৩০ দিন' : 'Proc: 26d | Office: 30d'}
            </span>
          </div>
          <p className="text-[11px] text-indigo-800 dark:text-indigo-400">
            {lang === 'bn'
              ? 'প্রসেসিং স্টাফদের ২৬ দিন এবং অফিস স্টাফদের ৩০ দিন হিসেবে স্যালারি ক্যালকুলেট হয়। অফিস স্টাফদের কোনো ওটি বা লেট কাউন্ট হবে না।'
              : 'Processing staff calculated on 26 days; office staff calculated on 30 days with NO overtime and NO late penalty.'}
          </p>
        </div>

        {/* Shift Timings */}
        <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 text-xs space-y-1">
          <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">⏱️ {lang === 'bn' ? 'শিফট ও ওটি নিয়ম' : 'Shift & OT Policy'}</span>
            <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 px-2 py-0.5 rounded-full font-mono">
              অফিস ১০-১০ | প্রসেসিং ৯-৭
            </span>
          </div>
          <p className="text-[11px] text-purple-800 dark:text-purple-400">
            {lang === 'bn'
              ? 'অফিস স্টাফ: ফিক্সড বেতন (১০AM-১০PM, নো ওটি/লেট)। প্রসেসিং স্টাফ: ৯:৩০ এর পর লেট, ৭:০০ এর পর ওটি (৬০৳/ঘণ্টা)।'
              : 'Office staff: fixed pay (10AM-10PM, no OT/late). Processing staff: late after 9:30 AM, OT after 7:00 PM at ৳60/hr.'}
          </p>
        </div>
      </div>

      {/* Monthly Payroll Summary Table (Ready for Statement) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-2 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'bn' ? `স্টাফ বেতন ও পে-রোল ক্যালকুলেশন (${formatMonthDisplay(selectedMonth)})` : `Staff Salary & Payroll Calculation (${formatMonthDisplay(selectedMonth)})`}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'bn'
                ? 'হাজিরা + ওভারটাইম (প্রতি ঘণ্টা ৬০ টাকা) - অগ্রিম কর্তন = মোট প্রদেয় বেতন | পেমেন্ট স্ট্যাটাস নির্বাচন করুন'
                : 'Days Present + Overtime (৳60/hr) - Advances = Net Payable Salary | Toggle Paid/Unpaid status'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintPayrollStatement(undefined, selectedMonth)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'bn' ? `${formatMonthDisplay(selectedMonth)} পে-রোল প্রিন্ট` : 'Print Monthly Payroll'}</span>
            </button>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {t.otRateNotice}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">{t.staffName}</th>
                <th className="py-2.5 px-3">{t.designation}</th>
                <th className="py-2.5 px-3 text-center">{t.category}</th>
                <th className="py-2.5 px-3 text-right">{t.baseSalary}</th>
                <th className="py-2.5 px-3 text-center">{lang === 'bn' ? 'উপস্থিতি (দিন)' : 'Present Days'}</th>
                <th className="py-2.5 px-3 text-center">{t.otHours}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'ওটি টাকা (৬০x)' : 'OT Amount (60x)'}</th>
                <th className="py-2.5 px-3 text-right">{t.advanceTaken}</th>
                <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">{lang === 'bn' ? 'লেট কর্তন' : 'Late Deduction'}</th>
                <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">{lang === 'bn' ? 'ড্যামেজ কর্তন' : 'Damage Penalty'}</th>
                <th className="py-2.5 px-3 text-right">{t.netSalary}</th>
                <th className="py-2.5 px-3 text-center">{lang === 'bn' ? 'পেমেন্ট স্ট্যাটাস' : 'Payment Status'}</th>
                <th className="py-2.5 px-3 text-right">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staffPayrollSummary.map((stf) => (
                <tr key={stf.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{stf.name}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          stf.role === 'admin'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {stf.role === 'admin' ? 'Admin' : 'Staff'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {stf.phone} • ID: <strong className="text-slate-700 dark:text-slate-300">{stf.loginCode || stf.id}</strong>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                    {stf.designation}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        stf.category === 'office'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {stf.category === 'office' ? 'Office' : 'Processing'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(stf.baseSalary, lang)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                    {formatNumber(stf.daysPresent, lang)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                    {stf.totalOtHours > 0 ? (
                      <>{formatNumber(stf.totalOtHours, lang)} {lang === 'bn' ? 'ঘণ্টা' : 'hrs'}</>
                    ) : (
                      <span className="text-slate-400 font-normal text-[10px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {stf.totalOtAmount > 0 ? (
                      formatCurrency(stf.totalOtAmount, lang)
                    ) : (
                      <span className="text-slate-400 font-normal text-[10px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                    <div className="flex items-center justify-end gap-1">
                      <span>{stf.totalAdvance > 0 ? `-${formatCurrency(stf.totalAdvance, lang)}` : '-'}</span>
                      <button
                        type="button"
                        onClick={() => openAdvanceEditor(stf.id)}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 cursor-pointer"
                        title={lang === 'bn' ? 'অ্যাডভান্স সংশোধন' : 'Edit Advance'}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                    {stf.lateDeduction > 0 ? (
                      <span title={`${stf.totalLateMinutes} মিনিট লেট`}>
                        -{formatCurrency(stf.lateDeduction, lang)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                    {stf.damageDeduction > 0 ? `-${formatCurrency(stf.damageDeduction, lang)}` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                    {stf.netSalary < 0 ? (
                      <span className="text-rose-600 dark:text-rose-400" title={lang === 'bn' ? 'অগ্রিম বেতনের চেয়ে বেশি — স্টাফের কাছে পাওনা' : 'Advance exceeds salary — staff owes this amount'}>
                        -{formatCurrency(Math.abs(stf.netSalary), lang)}
                        <span className="block text-[9px] font-bold">{lang === 'bn' ? '(অগ্রিম বেশি/বকেয়া)' : '(Over-advance due)'}</span>
                      </span>
                    ) : (
                      formatCurrency(stf.netSalary, lang)
                    )}
                  </td>

                  {/* 1. Payment Status Field (Paid / Unpaid Toggle / Dropdown) */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        handleTogglePaymentStatus(
                          stf.id,
                          stf.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-2xs border ${
                        stf.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      }`}
                      title={
                        stf.paymentStatus === 'Paid'
                          ? lang === 'bn' ? 'ক্লিক করে Unpaid করুন' : 'Click to mark as Unpaid'
                          : lang === 'bn' ? 'ক্লিক করে Paid করুন' : 'Click to mark as Paid'
                      }
                    >
                      {stf.paymentStatus === 'Paid' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{lang === 'bn' ? 'পরিশোধিত (Paid)' : 'Paid'}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{lang === 'bn' ? 'বাকি (Unpaid)' : 'Unpaid'}</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onPrintPayrollStatement(stf.id, selectedMonth)}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition-colors flex items-center gap-1"
                        title={lang === 'bn' ? `${stf.name}-এর একক পে-স্লিপ প্রিন্ট করুন` : `Print individual payslip for ${stf.name}`}
                      >
                        <Printer className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>{lang === 'bn' ? 'পে-স্লিপ' : 'Payslip'}</span>
                      </button>
                      <button
                        onClick={() => openRecordModal(stf, selectedDate)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer transition-colors"
                        title={lang === 'bn' ? `${stf.name}-এর হাজিরা রেকর্ড করুন` : `Record Attendance for ${stf.name}`}
                      >
                        {lang === 'bn' ? 'হাজিরা' : 'Attendance'}
                      </button>
                      <button
                        onClick={() => openEditStaffModal(stf)}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg cursor-pointer transition-colors"
                        title={lang === 'bn' ? 'স্টাফ তথ্য এডিট করুন' : 'Edit Staff Profile'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteStaff && (
                        <button
                          onClick={() => handleDeleteStaffClick(stf)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer transition-colors"
                          title={lang === 'bn' ? 'স্টাফ মুছুন' : 'Delete Staff'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Management Directory Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCog className="w-4 h-4 text-indigo-600" />
              {lang === 'bn' ? 'কর্মচারী তালিকা ও প্রোফাইল ব্যবস্থাপনা' : 'Staff Directory & Profile Management'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'bn'
                ? 'এখান থেকে যেকোনো কর্মচারীর পদবি, মোবাইল নম্বর এবং মূল বেতন পরিবর্তন বা এডিট করতে পারবেন'
                : 'Manage staff profiles, designations, contact numbers, and basic salary'}
            </p>
          </div>

          <button
            onClick={openNewStaffModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 cursor-pointer transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ নতুন স্টাফ / হেড সুপারভাইজার যোগ করুন' : '+ Add Staff / Head Supervisor'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {staff.map((stf) => (
            <div
              key={stf.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {stf.name}
                    </h4>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      {stf.designation || (lang === 'bn' ? 'পদবি নির্ধারিত নেই' : 'No designation')}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      stf.category === 'office'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    }`}
                  >
                    {stf.category === 'office' ? 'Office' : 'Processing'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 font-mono">
                  <div>📞 {stf.phone || 'N/A'}</div>
                  <div>💰 {lang === 'bn' ? 'মূল বেতন' : 'Base'}: ৳{stf.baseSalary?.toLocaleString()} / {lang === 'bn' ? 'মাস' : 'mo'} <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">(দৈনিক: ৳{Math.round((stf.baseSalary || 0) / (stf.category === 'office' ? 30 : 26))} / {stf.category === 'office' ? (lang === 'bn' ? '৩০ দিন' : '30d') : (lang === 'bn' ? '২৬ দিন' : '26d')})</span></div>
                  <div className="pt-1 mt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px]">
                    <span>🔑 আইডি: <strong className="text-purple-600 dark:text-purple-400">{stf.loginCode || stf.id}</strong></span>
                    <span>🔑 পাসওয়ার্ড: <strong className="text-purple-600 dark:text-purple-400">{stf.password || '123456'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-slate-400">রোল:</span>
                    <span
                      className={`px-2 py-0.2 rounded-full font-bold text-[9px] uppercase ${
                        stf.role === 'admin'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {stf.role === 'admin' ? 'Super Admin' : 'Staff'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                <button
                  type="button"
                  onClick={() => openRecordModal(stf, selectedDate)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors shadow-2xs text-[11px]"
                  title={lang === 'bn' ? `${stf.name}-এর হাজিরা রেকর্ড করুন` : `Record Attendance for ${stf.name}`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{lang === 'bn' ? 'হাজিরা' : 'Attendance'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrintPayrollStatement(stf.id)}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer transition-colors shadow-2xs text-[11px]"
                  title={lang === 'bn' ? 'ব্যক্তিগত পে-স্লিপ প্রিন্ট' : 'Print individual payslip'}
                >
                  <Printer className="w-3 h-3" />
                  <span>{lang === 'bn' ? 'পে-স্লিপ' : 'Payslip'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditStaffModal(stf)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold cursor-pointer transition-colors shadow-2xs text-[11px]"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                </button>
                {onDeleteStaff && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStaffClick(stf)}
                    className="flex items-center gap-1 py-1.5 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-200 dark:border-rose-900 font-bold cursor-pointer transition-colors shadow-2xs text-[11px]"
                    title={lang === 'bn' ? 'স্টাফ মুছে ফেলুন' : 'Delete / Remove Staff'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Attendance Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              {lang === 'bn' ? 'দৈনিক স্টাফ উপস্থিতির বিবরণ' : 'Daily Attendance Logs'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'bn'
                ? 'ইন-টাইম, আউট-টাইম এবং অটো লেট ও ওভারটাইম লগ'
                : 'In-Time, Out-Time, automated late minutes & OT breakdown'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
            />

            {isFriday(selectedDate) ? (
              <button
                type="button"
                onClick={handleAutoRecordAllForDate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                title={lang === 'bn' ? 'সকল স্টাফের শুক্রবার সাপ্তাহিক ছুটি নিশ্চিত করুন' : 'Confirm Friday weekly holiday for all'}
              >
                <span>🕌 {lang === 'bn' ? 'শুক্রবার ছুটি অটো-নিশ্চিত করুন' : 'Confirm Friday Off (All)'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAutoRecordAllForDate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                title={lang === 'bn' ? 'সকল স্টাফের নিয়মিত শিফট উপস্থিতি এক ক্লিকে অটো-হাজিরা করুন' : 'Auto-record regular shifts for all'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'নিয়মিত শিফট অটো-হাজিরা' : 'Auto Mark Shifts'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openRecordModal(undefined, selectedDate)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
              title={lang === 'bn' ? 'এই দিনের জন্য নতুন হাজিরা যুক্ত করুন' : 'Record attendance for this date'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'হাজিরা যুক্ত করুন' : 'Record Attendance'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">{t.staffName}</th>
                <th className="py-2.5 px-3">{t.category}</th>
                <th className="py-2.5 px-3 text-center">{t.attendanceStatus}</th>
                <th className="py-2.5 px-3 text-center">{t.inTime}</th>
                <th className="py-2.5 px-3 text-center">{t.outTime}</th>
                <th className="py-2.5 px-3 text-center">{t.lateMinutes}</th>
                <th className="py-2.5 px-3 text-center">{t.otHours}</th>
                <th className="py-2.5 px-3 text-right">{lang === 'bn' ? 'ওটি বিল (৬০x)' : 'OT Bill (60x)'}</th>
                <th className="py-2.5 px-3">{lang === 'bn' ? 'মন্তব্য' : 'Notes'}</th>
                <th className="py-2.5 px-3 text-right">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAttendance.map((rec) => {
                const isOffice = rec.category === 'office';
                const recFriday = isFriday(rec.date);
                const isLeaveOrAbsent =
                  rec.status === 'absent' ||
                  rec.status === 'full_day_leave' ||
                  rec.status === 'half_day_leave' ||
                  rec.status === 'leave' ||
                  rec.status === 'holiday';

                return (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {rec.staffName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOffice
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {isOffice ? 'Office' : 'Processing'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          rec.status === 'present'
                            ? recFriday
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-700'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : rec.status === 'holiday' || recFriday
                            ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            : rec.status === 'full_day_leave'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : rec.status === 'half_day_leave'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : rec.status === 'absent'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {rec.status === 'present'
                          ? recFriday
                            ? lang === 'bn' ? 'উপস্থিত (শুক্রবার ওটি ডিউটি)' : 'Present (Friday OT)'
                            : lang === 'bn' ? 'উপস্থিত' : 'Present'
                          : rec.status === 'holiday' || recFriday
                          ? lang === 'bn' ? '🕌 সাপ্তাহিক ছুটি (শুক্রবার)' : 'Weekly Holiday (Friday)'
                          : rec.status === 'full_day_leave'
                          ? lang === 'bn' ? 'ফুল ডে ছুটি (ছুটি)' : 'Full Day Leave'
                          : rec.status === 'half_day_leave'
                          ? lang === 'bn' ? 'হাফ ডে ছুটি' : 'Half Day Leave'
                          : rec.status === 'absent'
                          ? lang === 'bn' ? 'অনুপস্থিত' : 'Absent'
                          : lang === 'bn' ? 'লেট' : 'Late'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium">
                      {isLeaveOrAbsent ? '-' : rec.inTime || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium">
                      {isLeaveOrAbsent ? '-' : rec.outTime || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {isOffice ? (
                        <span className="text-slate-400 text-[10px]">
                          {lang === 'bn' ? 'অফিস (N/A)' : 'N/A'}
                        </span>
                      ) : isLeaveOrAbsent ? (
                        <span className="text-slate-400 text-[10px]">-</span>
                      ) : rec.lateMinutes > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {formatNumber(rec.lateMinutes, lang)} {lang === 'bn' ? 'মি.' : 'min'}
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-[11px]">সময়মত</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                      {rec.otHours > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold">
                          {formatNumber(rec.otHours, lang)} hrs
                          {recFriday && (
                            <span className="text-[9px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 px-1 py-0.2 rounded font-semibold">
                              {lang === 'bn' ? 'শুক্রবার ওটি' : 'Friday OT'}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-normal">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {rec.otAmount > 0 ? (
                        formatCurrency(rec.otAmount, lang)
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                      {rec.notes || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const targetStaff = staff.find((s) => s.id === rec.staffId);
                          if (targetStaff) openRecordModal(targetStaff, rec.date);
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 cursor-pointer inline-flex items-center gap-0.5 text-[11px] font-semibold"
                        title={lang === 'bn' ? 'হাজিরা সম্পাদন / ওটি পরিবর্তন করুন' : 'Edit attendance / OT'}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Attendance Modal */}
      {isAttModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                {t.recordAttendance}
              </h3>
              <button onClick={() => setIsAttModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.staffName}
                  </label>
                  <select
                    value={attStaffId}
                    onChange={(e) => setAttStaffId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold truncate"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category === 'office' ? 'Office' : 'Processing'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attendance Status Dropdown */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'হাজিরার স্ট্যাটাস / ধরন *' : 'Attendance Status *'}
                </label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-emerald-500 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="present">
                    {lang === 'bn' ? (isFriday(attDate) ? '🟢 Present (শুক্রবার ডিউটি - পুরো সময় ওটি)' : '🟢 Present (উপস্থিত)') : (isFriday(attDate) ? '🟢 Present (Friday OT Duty)' : '🟢 Present')}
                  </option>
                  <option value="holiday">
                    {lang === 'bn' ? '🕌 Holiday (সাপ্তাহিক ছুটি - কোনো বেতন কর্তন হবে না)' : '🕌 Weekly Holiday (Friday Off - Fully Paid)'}
                  </option>
                  <option value="full_day_leave">
                    {lang === 'bn' ? '🔵 Full Day Leave (পূর্ণ দিবস ছুটি - কোনো বেতন কর্তন হবে না)' : '🔵 Full Day Leave (Paid Leave)'}
                  </option>
                  <option value="half_day_leave">
                    {lang === 'bn' ? '🟣 Half Day Leave (অর্ধ দিবস ছুটি - কোনো বেতন কর্তন হবে না)' : '🟣 Half Day Leave (Paid Leave)'}
                  </option>
                  <option value="absent">
                    {lang === 'bn' ? '🔴 Absent (অনুপস্থিত - ১ দিনের মজুরি কর্তন)' : '🔴 Absent (1 Day Salary Deduction)'}
                  </option>
                </select>
              </div>

              {/* Special Friday Notice Banner */}
              {isFriday(attDate) && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 text-[11px] text-teal-900 dark:text-teal-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                    <span>🕌</span>
                    <span>{lang === 'bn' ? 'শুক্রবার অফিসিয়াল সাপ্তাহিক ছুটি (Weekly Holiday)' : 'Friday Official Weekly Holiday'}</span>
                  </div>
                  <p>
                    {lang === 'bn'
                      ? 'ছুটির দিনে কাজ করলে (Present) কাজের পুরো সময়টি স্বয়ংক্রিয়ভাবে ওভারটাইম (OT) হিসেবে গণ্য হবে এবং ঘণ্টায় ৬০ টাকা হারে মূল বেতনের সাথে যোগ হবে। ডিউটি না থাকলে "সাপ্তাহিক ছুটি" নির্বাচন করুন।'
                      : 'Working on Friday counts full duty time as Overtime (OT) at ৳60/hr. If off, select Weekly Holiday (no salary deduction).'}
                  </p>
                </div>
              )}

              {/* In-Time and Out-Time (Active when present or half day leave) */}
              {(attStatus === 'present' || attStatus === 'half_day_leave') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t.inTime}
                    </label>
                    <input
                      type="time"
                      value={attInTime}
                      onChange={(e) => setAttInTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t.outTime}
                    </label>
                    <input
                      type="time"
                      value={attOutTime}
                      onChange={(e) => setAttOutTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Status Explanation Notice */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                {(attStatus === 'full_day_leave' || attStatus === 'half_day_leave' || attStatus === 'holiday') ? (
                  <div className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {lang === 'bn'
                        ? 'ছুটি ও সাপ্তাহিক ছুটি নিয়ম: ফুল ডে ছুটি, হাফ ডে ছুটি বা শুক্রবার সাপ্তাহিক ছুটির জন্য স্টাফদের বেতন থেকে কোনো টাকা কর্তন হবে না (২৬ দিন ভিত্তিতে হিসাব অপরিবর্তিত থাকবে)।'
                        : 'Leave & Holiday Policy: No salary deduction for Full Day, Half Day leave or Friday Holiday (Fully paid on 26-day basis).'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                      {lang === 'bn' ? 'নিয়মাবলী ও গণনা পলিসি:' : 'Policy Rules:'}
                    </span>
                    {lang === 'bn'
                      ? 'অফিস কর্মীদের জন্য শুক্রবার ডিউটি ছাড়া নিয়মিত দিন লেট ও ওভারটাইম হিসাব বাদ থাকে। প্রসেসিং কর্মীদের ক্ষেত্রে সকাল ৯:৩০ এর পর লেট এবং সন্ধ্যা ৭:০০ এর পর নিয়মিত ওটি (৬০৳/ঘণ্টা)। শুক্রবার ডিউটিতে সকল স্টাফের পুরো সময় ওটি হিসেবে গণ্য।'
                      : 'Office staff regular days have no late/OT. Processing staff late after 9:30 AM; regular OT after 7:00 PM at ৳60/hr. Friday duty counts as 100% OT for all staff.'}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'দৈনিক অগ্রিম গ্রহণ (যদি থাকে)' : 'Daily Advance Taken (if any)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={attAdvance || ''}
                  onChange={(e) => setAttAdvance(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'কাজের বিবরণ বা মন্তব্য' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  placeholder={
                    attStatus === 'full_day_leave' || attStatus === 'half_day_leave'
                      ? lang === 'bn' ? 'ছুটির কারণ (যেমন: পারিবারিক কাজ / অসুস্থতা)...' : 'Reason for leave...'
                      : lang === 'bn' ? 'যেমন: মাদারবোর্ড ডেলিভারি আনলোডিং কাজ করেছেন...' : 'Daily notes...'
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAttModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Add / Edit Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                {editingStaff ? 'স্টাফ তথ্য পরিবর্তন' : 'নতুন স্টাফ যুক্ত করুন'}
              </h3>
              <button onClick={() => setIsStaffModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffForm} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  স্টাফের নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="যেমন: মো: আল-আমিন হোসেন"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ক্যাটাগরি
                  </label>
                  <select
                    value={staffCategory}
                    onChange={(e) => setStaffCategory(e.target.value as StaffCategory)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="office">Office Staff (10AM-10PM)</option>
                    <option value="processing">Processing Staff (9AM-7PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  পদবী (Designation)
                </label>
                <input
                  type="text"
                  value={staffDesignation}
                  onChange={(e) => setStaffDesignation(e.target.value)}
                  placeholder="যেমন: হিসাবরক্ষক / প্রসেসিং টেকনিশিয়ান"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              {/* Base Salary & Computed Daily Rate Input */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    মূল মাসিক বেতন (Base Salary) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-600 dark:text-emerald-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={staffSalary}
                      onChange={(e) => setStaffSalary(e.target.value)}
                      placeholder="যেমন: 20000"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border-2 border-emerald-500/80 bg-white dark:bg-slate-800 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    হিসাবকৃত দৈনিক রেট (Daily Rate - ২৬ দিন হিসাব)
                  </label>
                  <div className="h-9 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold flex items-center justify-between">
                    <span>৳{Math.round((Number(staffSalary) || 0) / 26).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 font-normal">/ দিন (২৬ দিন)</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkSupervisor"
                    checked={staffIsSupervisor}
                    onChange={(e) => setStaffIsSupervisor(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="chkSupervisor" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer text-xs">
                    হেড প্রসেসিং সুপারভাইজার (Team Lead / Head Supervisor)
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-6 mt-0.5">
                  * টিক দিলে এই কর্মকর্তা কারিগর টিমের হেড সুপারভাইজার হিসেবে দায়িত্ব পাবেন এবং ওয়ার্কার মনিটরিং প্যানেলে লিড করবেন।
                </p>
              </div>

              {/* User Account / Credentials Section */}
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 dark:text-purple-300 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>লগইন এক্সেস & রোল তৈরি (User Account)</span>
                  </span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">Secure Access</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                      স্টাফ আইডি (Login Code)
                    </label>
                    <input
                      type="text"
                      value={staffLoginCode}
                      onChange={(e) => setStaffLoginCode(e.target.value)}
                      placeholder="STF01"
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                      লগইন পাসওয়ার্ড
                    </label>
                    <input
                      type="text"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="123456"
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    সিস্টেম রোল (Role Permission)
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as 'staff' | 'admin')}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 font-bold text-xs"
                  >
                    <option value="staff">Staff (শুধুমাত্র ভিউ & আবেদন করার অনুমতি)</option>
                    <option value="admin">Super Admin (পূর্ণ এডিট, ডিলিট & সিস্টেম কন্ট্রোল)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Leave & Punch Correction Request Form Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>{lang === 'bn' ? 'ছুটি বা ভুল পাঞ্চ সংশোধনের আবেদন' : 'Punch & Leave Request'}</span>
              </h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRequestForm} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  স্টাফ নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reqStaffId}
                  onChange={(e) => setReqStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  required
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category === 'office' ? 'Office' : 'Processing'} - {s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  আবেদনের ধরন <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReqType('leave')}
                    className={`py-2 rounded-xl font-bold text-center cursor-pointer transition-all ${
                      reqType === 'leave'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    ছুটির আবেদন (Leave)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqType('punch_fix')}
                    className={`py-2 rounded-xl font-bold text-center cursor-pointer transition-all ${
                      reqType === 'punch_fix'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    পাঞ্চ সংশোধন (Punch Fix)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  তারিখ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  required
                />
              </div>

              {reqType === 'leave' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ছুটির ধরন
                  </label>
                  <select
                    value={reqLeaveType}
                    onChange={(e) => setReqLeaveType(e.target.value as LeaveType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="full_day">পূর্ণ দিবস ছুটি (Full Day Leave)</option>
                    <option value="half_day">অর্ধ দিবস ছুটি (Half Day Leave)</option>
                    <option value="sick">অসুস্থতাজনিত ছুটি (Sick Leave)</option>
                    <option value="casual">জরুরি ব্যক্তিগত ছুটি (Casual Leave)</option>
                  </select>
                </div>
              )}

              {reqType === 'punch_fix' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      প্রকৃত আসার সময় (In-Time)
                    </label>
                    <input
                      type="time"
                      value={reqInTime}
                      onChange={(e) => setReqInTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      প্রকৃত যাওয়ার সময় (Out-Time)
                    </label>
                    <input
                      type="time"
                      value={reqOutTime}
                      onChange={(e) => setReqOutTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  আবেদনের কারণ বা বিবরণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  rows={2}
                  placeholder="যেমন: বিদ্যুৎ ছিল না বা জরুরি কাজ ছিল..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>আবেদন জমা দিন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Review & Approval Modal */}
      {isAdminReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in duration-200">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">ছুটি ও পাঞ্চ সংশোধন আবেদন পর্যালোচনা (Admin Approval)</h3>
                  <p className="text-[11px] text-slate-400">শুধুমাত্র এডমিন অনুমোদন বা বাতিল করতে পারবেন</p>
                </div>
              </div>
              <button onClick={() => setIsAdminReviewModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {punchRequests.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p>বর্তমানে কোনো ছুটির আবেদন বা পাঞ্চ সংশোধনের অনুরোধ নেই।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {punchRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPending
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                            : req.status === 'approved'
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40'
                            : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 opacity-75'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {req.staffName}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                              {req.category}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                req.requestType === 'leave'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              }`}
                            >
                              {req.requestType === 'leave' ? 'ছুটির আবেদন' : 'পাঞ্চ সংশোধন'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-500">
                              📅 {formatDate(req.date, lang)}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isPending
                                  ? 'bg-amber-500 text-white'
                                  : req.status === 'approved'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {isPending ? 'অপেক্ষমান' : req.status === 'approved' ? 'অনুমোদিত' : 'বাতিল'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-slate-700 dark:text-slate-300 text-xs">
                          {req.requestType === 'leave' ? (
                            <div className="font-semibold text-sky-700 dark:text-sky-400">
                              ছুটির ধরন: {req.leaveType === 'half_day' ? 'অর্ধ দিবস' : 'পূর্ণ দিবস ছুটি'}
                            </div>
                          ) : (
                            <div className="font-mono text-amber-700 dark:text-amber-400">
                              অনুরোধকৃত সময়: {req.requestedInTime || '০৯:০০'} থেকে {req.requestedOutTime || '১৯:০০'}
                            </div>
                          )}
                          <p className="mt-1 text-slate-600 dark:text-slate-400 italic">
                            &quot;{req.reason}&quot;
                          </p>
                        </div>

                        {isPending && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRejectRequest(req)}
                              className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold text-xs cursor-pointer"
                            >
                              বাতিল করুন (Reject)
                            </button>
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>অনুমোদন করুন (Approve & Update Attendance)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsAdminReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
      {advEditStaffId && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {lang === 'bn' ? 'অ্যাডভান্স সংশোধন' : 'Edit / Correct Advance'} — {staff.find((x) => x.id === advEditStaffId)?.name}
              </h3>
              <button type="button" onClick={() => setAdvEditStaffId(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {advEditRecords.length === 0 ? (
                <p className="text-slate-500">
                  {lang === 'bn' ? 'এই মাসে কোনো হাজিরা এন্ট্রি নেই। আগে হাজিরা এন্ট্রি দিন, তারপর অ্যাডভান্স যোগ করুন।' : 'No attendance entries this month. Add attendance first, then the advance.'}
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-2 text-left">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                        <th className="p-2 text-right">{lang === 'bn' ? 'অ্যাডভান্স (৳)' : 'Advance (৳)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {advEditRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2 font-mono text-slate-800 dark:text-slate-200">{r.date}</td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={advEdits[r.id] ?? 0}
                              onChange={(e) => setAdvEdits((prev) => ({ ...prev, [r.id]: parseFloat(e.target.value) || 0 }))}
                              className="w-28 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-mono text-slate-900 dark:text-white"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'মোট:' : 'Total:'} ৳{advEditRecords.reduce((s2, r) => s2 + (Number(advEdits[r.id]) || 0), 0).toLocaleString()}
                </span>
                <button type="button" onClick={saveAdvanceCorrections} disabled={advEditRecords.length === 0}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold cursor-pointer">
                  <Save className="w-3.5 h-3.5" /> {lang === 'bn' ? 'সংশোধন সংরক্ষণ' : 'Save Corrections'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
