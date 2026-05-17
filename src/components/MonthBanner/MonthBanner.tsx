/**
 * MonthBanner – hiển thị tháng đang cấu hình ở đầu mỗi module I.
 * Khi user click "Đổi tháng", điều hướng sang trang Tháng chấm công.
 */
'use client';
import { useApp } from '@/context/AppContext';
import styles from './MonthBanner.module.css';

interface Props {
  /** Label ngắn của module, VD: "Phòng Ban", "Ca Làm Việc" */
  moduleName: string;
}

export default function MonthBanner({ moduleName }: Props) {
  const { activeMonthLabel, setCurrentPage } = useApp();

  if (!activeMonthLabel) return null;

  return (
    <div className={styles.banner}>
      <span className={styles.icon}>📅</span>
      <span className={styles.text}>
        Đang cấu hình <strong>{moduleName}</strong> cho tháng{' '}
        <span className={styles.month}>{activeMonthLabel}</span>
      </span>
      <button
        className={styles.changeBtn}
        onClick={() => setCurrentPage('config-month')}
        title="Chuyển sang trang Tháng chấm công để đổi tháng"
      >
        Đổi tháng
      </button>
    </div>
  );
}
