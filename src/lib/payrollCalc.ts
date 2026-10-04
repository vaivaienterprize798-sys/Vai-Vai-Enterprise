import type { Staff, AttendanceRecord } from '../types';
import { storageService } from './storage';

/**
 * Single source of truth for monthly salary calculation.
 * Used by the Payroll panel, print statements, PDF, WhatsApp and WeChat shares
 * so every output shows exactly the same numbers.
 */
export function computeStaffPayroll(stf: Staff, attendance: AttendanceRecord[], month: string) {
  const isOffice = stf.category === 'office';
  const records = (attendance || []).filter((a) => a.staffId === stf.id && a.date && a.date.startsWith(month));
  const baseSalary = Number(stf.baseSalary || 0);
  const daysBase = isOffice ? 30 : 26;
  const dailyRate = Math.round(baseSalary / daysBase);

  const presentDays = records.filter((a) => a.status === 'present' || a.status === 'late').length;
  const leaveDays = records.filter(
    (a) => a.status === 'full_day_leave' || a.status === 'half_day_leave' || a.status === 'leave' || a.status === 'holiday'
  ).length;

  const [selY, selM] = month.split('-').map(Number);
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
    records.filter((a) => !isFriday(a.date) && a.status !== 'absent').map((a) => a.date)
  ).size;
  const absentDays = records.length === 0 ? 0 : Math.min(daysBase, Math.max(0, requiredDays - paidWorkingDays));

  const lateDays = isOffice ? 0 : records.filter((a) => a.status === 'late').length;
  const totalLateMinutes = isOffice ? 0 : records.reduce((s, a) => s + (Number(a.lateMinutes) || 0), 0);
  const lateDeduction = Math.round((totalLateMinutes / 60) * (dailyRate / 10));
  const totalOtHours = isOffice ? 0 : records.reduce((s, a) => s + (Number(a.otHours) || 0), 0);
  const totalOtAmount = isOffice
    ? 0
    : records.reduce((s, a) => s + (a.otAmount !== undefined ? Number(a.otAmount) || 0 : (Number(a.otHours) || 0) * 60), 0);
  const totalAdvance = records.reduce((s, a) => s + (Number(a.advanceDeduction) || 0), 0);
  const damageDeduction = storageService.getWorkerDamagePenaltyForMonth(stf.id, month);
  const absentDeduction = Math.round((absentDays * baseSalary) / daysBase);
  const earnedBase = Math.max(0, baseSalary - absentDeduction);
  const netSalary = Math.round(earnedBase + totalOtAmount - totalAdvance - damageDeduction - lateDeduction);
  const paymentStatus = storageService.getStaffPaymentStatus(month, stf.id);

  return {
    isOffice,
    records,
    daysBase,
    dailyRate,
    presentDays,
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
    /** Payable amount (never below zero) */
    netPayable: Math.max(0, netSalary),
    paymentStatus,
  };
}
