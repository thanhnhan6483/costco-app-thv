'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import styles from './Dashboard.module.css';

const COLORS = ['#2563eb','#0891b2','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#64748b'];

const MONTH_KPI = [
  { key: 'totalEmployees',     icon: '👥', label: 'Nhân Viên',        sub: 'trong tháng' },
  { key: 'totalWorkdays',      icon: '📆', label: 'Tổng Ngày Công',   sub: 'toàn bộ NV' },
  { key: 'totalDepts',         icon: '🏢', label: 'Phòng Ban',        sub: 'tháng này' },
  { key: 'totalShifts',        icon: '⚙️', label: 'Ca Làm Việc',      sub: 'tháng này' },
  { key: 'totalLeaveTypes',    icon: '🏖️', label: 'Loại Nghỉ Phép',   sub: 'tháng này' },
  { key: 'totalSpecialGroups', icon: '👤', label: 'Nhóm Đặc Thù',     sub: 'tháng này' },
  { key: 'totalAllocRules',    icon: '📋', label: 'Quy Tắc Phân Bổ',  sub: 'tháng này' },
];

interface MonthOption { id: string; label: string; month: string; locked: boolean }
interface MonthStat { month_str: string; nv_count: number; total_ot: number; total_late: number }
interface DeptItem { dept: string; cnt?: number; total_ot?: number }
interface Employee { code: string; name: string; dept: string; workdays: string; overtime_hours: string; late_minutes: string; phep_nam: string }
interface Detail { kpi: Record<string, number>; deptDist: DeptItem[]; deptOT: DeptItem[]; employees: Employee[] }

export default function Dashboard() {
  const [chartData, setChartData] = useState<MonthStat[]>([]);
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async r => {
        const text = await r.text();
        let d: unknown;
        try { d = JSON.parse(text); } catch { throw new Error('Không thể kết nối database'); }
        if (!r.ok) throw new Error((d as { error?: string })?.error ?? 'Lỗi server');
        return d;
      })
      .then(d => {
        setChartData(d.chartData ?? []);
        setMonths(d.months ?? []);
        if (d.months?.length) setSelectedMonth(d.months[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    setDetailLoading(true);
    fetch(`/api/dashboard?monthId=${selectedMonth}`)
      .then(r => r.json())
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedMonth]);

  if (loading) return <div className={styles.loading}>Đang tải dữ liệu...</div>;
  if (error) return (
    <div className={styles.error} style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Không thể kết nối cơ sở dữ liệu</div>
      <div style={{ color: '#666', marginBottom: 24 }}>Hệ thống đang khởi động, vui lòng thử lại sau vài giây.</div>
      <button
        onClick={() => window.location.reload()}
        style={{ padding: '10px 28px', fontSize: 15, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        🔄 Tải lại trang
      </button>
    </div>
  );

  const selLabel = months.find(m => m.id === selectedMonth)?.label || '';

  return (
    <div className={styles.page}>

      {/* ── Hàng 1: NV full width ── */}
      <div className={styles.sectionTitle}>📊 Tổng Quan Toàn Hệ Thống</div>
      <div className={styles.chartCardFull}>
        <div className={styles.chartLabel}>Số Nhân Viên Qua Từng Tháng</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month_str" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="nv_count" name="Nhân viên" fill="#2563eb" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Hàng 2: OT + Trễ ── */}
      <div className={styles.chartRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartLabel}>Tổng Giờ Tăng Ca Qua Từng Tháng</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month_str" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total_ot" name="OT (giờ)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chartLabel}>Tổng Phút Trễ Qua Từng Tháng</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month_str" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total_late" name="Trễ (phút)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Dropdown chọn tháng ── */}
      <div className={styles.detailHeader}>
        <div className={styles.sectionTitle}>🔍 Chi Tiết Theo Tháng</div>
        <select className={styles.monthSelect} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {months.map(m => (
            <option key={m.id} value={m.id}>{m.label} {m.locked ? '🔒' : '🔓'}</option>
          ))}
        </select>
      </div>

      {detailLoading && <div className={styles.loading}>Đang tải chi tiết...</div>}

      {detail && !detailLoading && (
        <>
          {/* ── KPI cards theo tháng ── */}
          <div className={styles.kpiGrid}>
            {MONTH_KPI.map(({ key, icon, label, sub }) => (
              <div key={key} className={styles.kpiCard}>
                <div className={styles.kpiIcon}>{icon}</div>
                <div className={styles.kpiValue}>{(detail.kpi[key] ?? 0).toLocaleString()}</div>
                <div className={styles.kpiLabel}>{label}</div>
                <div className={styles.kpiSub}>{sub}</div>
              </div>
            ))}
          </div>

          {/* ── Donut + Thanh ngang ── */}
          <div className={styles.chartRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartLabel}>Cơ Cấu Nhân Sự Theo Phòng Ban</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={detail.deptDist} dataKey="cnt" nameKey="dept"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {detail.deptDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.chartCard}>
              <div className={styles.chartLabel}>Top Phòng Ban OT Cao Nhất</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={detail.deptOT} layout="vertical" margin={{ top: 5, right: 40, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="total_ot" name="OT (giờ)" radius={[0,4,4,0]}>
                    {detail.deptOT.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>


        </>
      )}
    </div>
  );
}
