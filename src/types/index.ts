// Types for COSTCO Attendance Management System

export interface Department {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Shift {
  id: string;
  code: string;
  name: string;
  departments: string[];
  startTime: string;
  endTime: string;
  lateToleranceMin: number;
  earlyLeaveToleranceMin: number;
  otThresholdMin: number;
  maxHoursPerDay: number;
  breakTime: string;
}

export interface LeaveType {
  symbol: string;
  name: string;
  description: string;
  countAsWorkday: boolean | string;
  isViolation?: boolean;
}

export interface SpecialGroup {
  code: string;
  name: string;
  workHours: number;
  note?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  department: string;
  groupCode?: string;
  groupCodeEndDate?: string;
  workdays: number;
  overtimeHours: number;
  lateMinutes: number;
  phepNam: number;
  attendance: Record<string, string>;
}

export interface MonthConfig {
  month: number;
  year: number;
  departments: Department[];
  shifts: Shift[];
  leaveTypes: LeaveType[];
  specialGroups: SpecialGroup[];
  employees: Employee[];
  allocRules: AllocRule[];
}

export interface AllocRule {
  id: number;
  rule: string;
  param: string;
  description: string;
}

export type PageKey =
  | 'dashboard'
  | 'config-month'
  | 'departments'
  | 'shifts'
  | 'leave-types'
  | 'special-groups'
  | 'import-employees'
  | 'alloc-rules'
  | 'export-config'
  | 'auto-alloc'
  | 'attendance-grid'
  | 'export-attendance'
  | 'user-management';
