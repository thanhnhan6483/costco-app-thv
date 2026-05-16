'use client';
import styles from './Dashboard.module.css';
import { useApp } from '@/context/AppContext';

export default function Dashboard() {
  const { departments, employees, shifts, currentMonth } = useApp();
  const activeEmps = employees.length;
  const activeDepts = departments.filter(d => d.active).length;
  const totalOT = employees.reduce((s, e) => s + e.overtimeHours, 0);
  const totalLate = employees.reduce((s, e) => s + e.lateMinutes, 0);

  const stats = [
    { icon: '👥', label: 'Nhân Viên', value: activeEmps, sub: 'đang hoạt động', color: 'blue' },
    { icon: '🏢', label: 'Phòng Ban', value: activeDepts, sub: 'đã cấu hình', color: 'purple' },
    { icon: '⏰', label: 'Tổng Tăng Ca', value: `${totalOT.toFixed(2)}h`, sub: 'trong tháng', color: 'green' },
    { icon: '⚠️', label: 'Tổng Trễ', value: `${totalLate.toFixed(2)} phút`, sub: 'trong tháng', color: 'orange' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.welcomeBanner}>
        <div>
          <h1 className={styles.title}>Xin chào, Admin HR 👋</h1>
          <p className={styles.subtitle}>Tổng quan hệ thống chấm công tháng <strong>{currentMonth}</strong></p>
        </div>
        <div className={styles.bannerDecor} />
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <div key={s.label} className={`${styles.statCard} ${styles[s.color]}`}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statSub}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Shifts summary */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ca Làm Việc Hiện Tại</h2>
        <div className={styles.shiftGrid}>
          {shifts.map(sh => (
            <div key={sh.id} className={styles.shiftCard}>
              <div className={styles.shiftCode}>{sh.code}</div>
              <div className={styles.shiftName}>{sh.name}</div>
              <div className={styles.shiftTime}>{sh.startTime} – {sh.endTime}</div>
              <div className={styles.shiftDepts}>{sh.departments.join(', ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Employees */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Danh Sách Nhân Viên</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã NV</th><th>Họ Tên</th><th>Phòng Ban</th>
                <th>Ngày Công</th><th>OT (giờ)</th><th>Trễ (phút)</th><th>Phép Năm</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td><span className={styles.empCode}>{emp.code}</span></td>
                  <td>
                    {emp.name}
                    {emp.groupCode && <span className={styles.groupBadge}>{emp.groupCode}</span>}
                  </td>
                  <td>{emp.department}</td>
                  <td><strong>{emp.workdays}</strong></td>
                  <td>{emp.overtimeHours}</td>
                  <td>
                    <span className={emp.lateMinutes > 30 ? styles.danger : ''}>
                      {emp.lateMinutes}
                    </span>
                  </td>
                  <td>{emp.phepNam}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
