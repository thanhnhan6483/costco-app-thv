'use client';
import { useEffect, useState } from 'react';
import styles from './Topbar.module.css';
import { useApp } from '@/context/AppContext';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Trang Chủ',
  'config-month': 'Tháng Chấm công',
  departments: 'Phòng Ban',
  shifts: 'Ca Làm Việc',
  'leave-types': 'Loại Nghỉ Phép',
  'special-groups': 'Nhóm Đặc Thù',
  'import-employees': 'Danh sách Nhân Viên',
  'alloc-rules': 'Quy Tắc Phân Bổ',
  'export-config': 'Xuất Cấu Hình',
  'auto-alloc': 'Bảng Chấm Công',
  'attendance-grid': 'Bảng Chấm Công',
  'export-attendance': 'Xuất Báo Cáo',
  'user-management': 'Quản Lý Tài Khoản',
};

interface MonthOption { id: string; month: string; label: string; locked: boolean; }

export default function Topbar() {
  const { currentPage, currentMonth, setCurrentMonth, monthListVersion, setActiveMonth } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [months, setMonths] = useState<MonthOption[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [user, setUser] = useState<{ username: string; full_name?: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setUser(d.user); }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingMonths(true);
    fetch('/api/months')
      .then(r => r.json())
      .then((data: { id: string; month: string; label?: string; locked?: boolean }[]) => {
        const list = data
          .map(d => ({ id: d.id, month: d.month, label: d.label ?? '', locked: d.locked ?? false }))
          .sort((a, b) => {
            const [ma, ya] = a.month.split('/').map(Number);
            const [mb, yb] = b.month.split('/').map(Number);
            return (yb * 12 + mb) - (ya * 12 + ma);
          });
        setMonths(list);
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('activeMonthId') : null;
        const savedMonth = list.find(m => m.id === savedId);
        if (savedMonth) {
          setCurrentMonth(savedMonth.month);
          setActiveMonth(savedMonth.id, savedMonth.month, savedMonth.locked);
        } else if (list.length > 0 && !list.map(m => m.month).includes(currentMonth)) {
          const first = list[0];
          setCurrentMonth(first.month);
          setActiveMonth(first.id, first.month, first.locked);
        } else if (list.length > 0) {
          const current = list.find(m => m.month === currentMonth);
          if (current) setActiveMonth(current.id, current.month, current.locked);
        }
      })
      .catch(() => setMonths([]))
      .finally(() => setLoadingMonths(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthListVersion]);

  const isDashboard = currentPage === 'dashboard';
  const currentLabel = PAGE_LABELS[currentPage] ?? currentPage;
  const optionText = (m: MonthOption) => m.label ? `${m.label} (${m.month})` : m.month;
  const monthCodes = months.map(m => m.month);
  const selectedValue = monthCodes.includes(currentMonth) ? currentMonth : (months[0]?.month ?? '');

  const handleMonthChange = (monthCode: string) => {
    setCurrentMonth(monthCode);
    const found = months.find(m => m.month === monthCode);
    if (found) setActiveMonth(found.id, found.month, found.locked);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.breadcrumb}>
          {isDashboard ? (
            <span className={styles.breadcrumbCurrent}>Trang Chủ</span>
          ) : (
            <>
              <span className={styles.breadcrumbRoot}>Trang chủ</span>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbCurrent}>{currentLabel}</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.monthPicker}>
          <span className={styles.monthLabel}>📅 Tháng đang chọn:</span>
          {!mounted || loadingMonths ? (
            <span className={styles.monthLoading}>…</span>
          ) : months.length === 0 ? (
            <span className={styles.monthEmpty}>Chưa có tháng</span>
          ) : (
            <select
              className={styles.monthSelect}
              value={selectedValue}
              onChange={e => handleMonthChange(e.target.value)}
              suppressHydrationWarning
            >
              {months.map(m => (
                <option key={m.month} value={m.month} suppressHydrationWarning>{optionText(m)}</option>
              ))}
            </select>
          )}
        </div>
        {user && (
          <div className={styles.userArea}>
            <span className={styles.userName}>👤 {user.full_name || user.username}</span>
            <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut} title="Đăng xuất">
              {loggingOut ? '…' : '⏻ Đăng xuất'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
