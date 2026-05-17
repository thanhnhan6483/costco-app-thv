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
  'import-employees': 'Nhân Viên',
  'alloc-rules': 'Quy Tắc Phân Bổ',
  'export-config': 'Xuất Cấu Hình',
  'auto-alloc': 'Phân Bổ Tự Động',
  'attendance-grid': 'Bảng Chấm Công',
  'export-attendance': 'Xuất Báo Cáo',
};

interface MonthOption {
  id: string;
  month: string;
  label: string;
}

export default function Topbar() {
  const { currentPage, currentMonth, setCurrentMonth, monthListVersion, setActiveMonth } = useApp();

  /* Chỉ render dynamic content sau khi mount (tránh hydration mismatch) */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ── Fetch danh sách tháng từ DB ── */
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(true);

  useEffect(() => {
    setLoadingMonths(true);
    fetch('/api/months')
      .then(r => r.json())
      .then((data: { id: string; month: string; label?: string }[]) => {
        const list = data
          .map(d => ({ id: d.id, month: d.month, label: d.label ?? '' }))
          .sort((a, b) => {
            const [ma, ya] = a.month.split('/').map(Number);
            const [mb, yb] = b.month.split('/').map(Number);
            return (yb * 12 + mb) - (ya * 12 + ma);
          });
        setMonths(list);

        // Nếu tháng hiện tại không có trong list → chọn tháng đầu tiên
        const monthCodes = list.map(m => m.month);
        if (list.length > 0 && !monthCodes.includes(currentMonth)) {
          const first = list[0];
          setCurrentMonth(first.month);
          setActiveMonth(first.id, first.month);
        } else if (list.length > 0) {
          // Sync activeMonthId với tháng hiện tại khi load lần đầu
          const current = list.find(m => m.month === currentMonth);
          if (current) setActiveMonth(current.id, current.month);
        }
      })
      .catch(() => setMonths([]))
      .finally(() => setLoadingMonths(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthListVersion]);

  const isDashboard = currentPage === 'dashboard';
  const currentLabel = PAGE_LABELS[currentPage] ?? currentPage;

  /* Tên hiển thị trong select: "Label – MM/YYYY" hoặc chỉ "MM/YYYY" */
  const optionText = (m: MonthOption) =>
    m.label ? `${m.label} (${m.month})` : m.month;

  const monthCodes = months.map(m => m.month);
  const selectedValue = monthCodes.includes(currentMonth) ? currentMonth : (months[0]?.month ?? '');

  /* ── Khi user chọn tháng khác trong dropdown ── */
  const handleMonthChange = (monthCode: string) => {
    setCurrentMonth(monthCode);
    const found = months.find(m => m.month === monthCode);
    if (found) setActiveMonth(found.id, found.month);
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
          <span className={styles.monthLabel}>📅 THÁNG ĐANG CHỌN:</span>
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
                <option key={m.month} value={m.month} suppressHydrationWarning>
                  {optionText(m)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button className={styles.iconBtn} title="Thông báo">
          🔔
          <span className={styles.notifDot} />
        </button>
        <button className={styles.iconBtn} title="Tài khoản">👤</button>
      </div>
    </header>
  );
}
