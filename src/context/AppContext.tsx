'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Department, Shift, LeaveType, SpecialGroup,
  Employee, AllocRule, PageKey
} from '@/types';
import {
  DEFAULT_DEPARTMENTS, DEFAULT_SHIFTS, DEFAULT_LEAVE_TYPES,
  DEFAULT_SPECIAL_GROUPS, DEFAULT_ALLOC_RULES, SAMPLE_EMPLOYEES
} from '@/data/defaults';
import { DEFAULT_MONTH_ID } from '@/lib/constants';

interface AppState {
  currentMonth: string;
  currentPage: PageKey;
  departments: Department[];
  shifts: Shift[];
  leaveTypes: LeaveType[];
  specialGroups: SpecialGroup[];
  employees: Employee[];
  allocRules: AllocRule[];
  sidebarCollapsed: boolean;
  /** Tăng counter này để báo Topbar fetch lại danh sách tháng */
  monthListVersion: number;
  /** ID của tháng đang được chọn để quản lý cấu hình Module I */
  activeMonthId: string;
  /** Nhãn hiển thị của tháng đang chọn (vd: "01/2026") */
  activeMonthLabel: string;
  /** Tháng đang active có bị khóa không */
  activeMonthLocked: boolean;

  setCurrentMonth: (m: string) => void;
  setCurrentPage: (p: PageKey) => void;
  setDepartments: (d: Department[]) => void;
  setShifts: (s: Shift[]) => void;
  setEmployees: (e: Employee[]) => void;
  setAllocRules: (r: AllocRule[]) => void;
  toggleSidebar: () => void;
  /** Gọi sau khi thêm/xóa tháng trong ConfigMonth */
  refreshMonthList: () => void;
  /** Đặt tháng đang active để Module I lọc dữ liệu */
  setActiveMonth: (id: string, label: string, locked?: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentMonth, setCurrentMonth] = useState('05/2026');
  const getPageFromHash = (): PageKey => {
    const raw = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    const hash = raw.split('/')[0] as PageKey;
    const valid: PageKey[] = ['dashboard','config-month','departments','shifts','leave-types','special-groups','import-employees','alloc-rules','export-config','auto-alloc','attendance-grid','export-attendance','user-management'];
    return valid.includes(hash) ? hash : 'dashboard';
  };
  const [currentPage, setCurrentPageState] = useState<PageKey>(getPageFromHash);
  const setCurrentPage = (p: PageKey) => {
    window.location.hash = p;
    setCurrentPageState(p);
  };
  useEffect(() => {
    const onPop = () => setCurrentPageState(getPageFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [shifts, setShifts] = useState<Shift[]>(DEFAULT_SHIFTS);
  const [leaveTypes] = useState<LeaveType[]>(DEFAULT_LEAVE_TYPES);
  const [specialGroups] = useState<SpecialGroup[]>(DEFAULT_SPECIAL_GROUPS);
  const [employees, setEmployees] = useState<Employee[]>(SAMPLE_EMPLOYEES);
  const [allocRules, setAllocRules] = useState<AllocRule[]>(DEFAULT_ALLOC_RULES);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [monthListVersion, setMonthListVersion] = useState(0);
  // activeMonth: tháng được chọn trong màn hình "Tháng chấm công" để Module I lọc dữ liệu
  const [activeMonthId, setActiveMonthId] = useState(() =>
    (typeof window !== 'undefined' && localStorage.getItem('activeMonthId')) || DEFAULT_MONTH_ID
  );
  const [activeMonthLabel, setActiveMonthLabel] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('activeMonthLabel') : null;
    // Chỉ dùng nếu có dạng MM/YYYY hợp lệ
    return (saved && /^\d{2}\/\d{4}$/.test(saved)) ? saved : '01/2026';
  });
  const [activeMonthLocked, setActiveMonthLocked] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('activeMonthLocked') === 'true'
  );

  const toggleSidebar = () => setSidebarCollapsed(p => !p);
  const refreshMonthList = () => setMonthListVersion(v => v + 1);
  const setActiveMonth = (id: string, label: string, locked = false) => {
    setActiveMonthId(id);
    setActiveMonthLabel(label);
    setActiveMonthLocked(locked);
    localStorage.setItem('activeMonthId', id);
    localStorage.setItem('activeMonthLabel', label);
    localStorage.setItem('activeMonthLocked', String(locked));
  };

  return (
    <AppContext.Provider value={{
      currentMonth, currentPage, departments, shifts, leaveTypes,
      specialGroups, employees, allocRules, sidebarCollapsed, monthListVersion,
      activeMonthId, activeMonthLabel, activeMonthLocked,
      setCurrentMonth, setCurrentPage, setDepartments, setShifts,
      setEmployees, setAllocRules, toggleSidebar, refreshMonthList, setActiveMonth,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
