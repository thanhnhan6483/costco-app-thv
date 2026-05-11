'use client';
import styles from './AttendanceGrid.module.css';
import { useApp } from '@/context/AppContext';

const SYMBOL_COLORS: Record<string, string> = {
  X: '#10b981', 'X/2': '#34d399', LP: '#94a3b8', L: '#94a3b8',
  NL: '#64748b', P: '#60a5fa', PN: '#3b82f6', Ô: '#f59e0b',
  TS: '#a78bfa', DS: '#c084fc', O: '#ef4444', LL: '#f97316',
  LN: '#fb923c', H: '#22d3ee', B: '#f43f5e', OF: '#6b7280',
};

const DAYS_IN_MAY = 31;

export default function AttendanceGrid() {
  const { employees, departments } = useApp();

  const days = Array.from({ length: DAYS_IN_MAY }, (_, i) => i + 1);
  const grouped = departments
    .filter(d => d.active)
    .map(dept => ({
      dept,
      emps: employees.filter(e => e.department === dept.code),
    }))
    .filter(g => g.emps.length > 0);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Bảng Chấm Công</h1>
          <p className={styles.subtitle}>Xem và kiểm tra chấm công theo từng nhân viên</p>
        </div>
        <button className={styles.btnExport}>📥 Xuất Excel</button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(SYMBOL_COLORS).slice(0, 8).map(([sym, color]) => (
          <div key={sym} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            <span>{sym}</span>
          </div>
        ))}
      </div>

      {grouped.map(({ dept, emps }) => (
        <div key={dept.id} className={styles.deptSection}>
          <div className={styles.deptHeader}>
            <span className={styles.deptCode}>{dept.code}</span>
            <span className={styles.deptName}>{dept.name}</span>
            <span className={styles.empCount}>{emps.length} nhân viên</span>
          </div>
          <div className={styles.gridWrap}>
            <table className={styles.grid}>
              <thead>
                <tr>
                  <th className={styles.stickyCol}>Nhân Viên</th>
                  {days.map(d => (
                    <th key={d} className={[1,8,15,22,29].includes(d) ? styles.sundayHead : ''}>
                      {d}
                    </th>
                  ))}
                  <th>Công</th>
                  <th>OT (h)</th>
                  <th>Trễ</th>
                </tr>
              </thead>
              <tbody>
                {emps.map(emp => (
                  <tr key={emp.id}>
                    <td className={styles.stickyCol}>
                      <div className={styles.empCell}>
                        <span className={styles.empCode}>{emp.code}</span>
                        <span className={styles.empName}>{emp.name}</span>
                        {emp.groupCode && <span className={styles.groupTag}>{emp.groupCode}</span>}
                      </div>
                    </td>
                    {days.map(d => {
                      const sym = emp.attendance[String(d)] || '';
                      const color = SYMBOL_COLORS[sym] || '#e2e8f0';
                      return (
                        <td key={d} className={styles.dayCell}>
                          {sym && (
                            <span
                              className={styles.symBadge}
                              style={{ background: color + '25', color, borderColor: color + '60' }}
                            >
                              {sym}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className={styles.sumCell}><strong>{emp.workdays}</strong></td>
                    <td className={styles.sumCell}>{emp.overtimeHours}</td>
                    <td className={styles.sumCell}>
                      <span className={emp.lateMinutes > 30 ? styles.lateDanger : ''}>
                        {emp.lateMinutes}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
