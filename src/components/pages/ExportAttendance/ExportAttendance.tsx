'use client';
import { useApp } from '@/context/AppContext';
import s from './ExportAttendance.module.css';

const cards = [
  {
    icon: '📦',
    title: 'Tổng hợp cấu hình',
    desc: 'Phòng ban, ca làm việc, loại nghỉ phép, nhóm đặc thù, quy tắc phân bổ và danh sách nhân viên',
    color: '#3b82f6',
    bg: '#eff6ff',
    href: (id: string) => `/api/config/export?month=${id}`,
  },
  {
    icon: '📊',
    title: 'Báo cáo chi tiết phân bổ',
    desc: 'Kết quả phân bổ ngày công hoàn chỉnh (Bước 6)',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    href: (id: string) => `/api/distribution/export?month=${id}&step=6`,
  },
  {
    icon: '📋',
    title: 'Bảng chấm công tổng hợp',
    desc: 'Bảng chấm công kèm cột ca làm việc (Bước 5)',
    color: '#10b981',
    bg: '#ecfdf5',
    href: (id: string) => `/api/distribution/export?month=${id}&step=5&withShift=1`,
  },
];

export default function ExportAttendance() {
  const { activeMonthId, activeMonthLabel } = useApp();

  return (
    <div className={s.page}>
      <div className={s.header}>
        <span className={s.monthLabel}>
          📅 Tháng đang chọn: <strong>{activeMonthLabel || '—'}</strong>
        </span>
      </div>

      <div className={s.grid}>
        {cards.map(card => (
          <div key={card.title} className={s.card} style={{ '--card-color': card.color, '--card-bg': card.bg } as React.CSSProperties}>
            <div className={s.cardIcon}>{card.icon}</div>
            <div className={s.cardTitle}>{card.title}</div>
            <div className={s.cardDesc}>{card.desc}</div>
            {activeMonthId ? (
              <a className={s.btnDownload} href={card.href(activeMonthId)} download>
                ⬇ Tải Excel
              </a>
            ) : (
              <button className={s.btnDownload} disabled>⬇ Tải Excel</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
