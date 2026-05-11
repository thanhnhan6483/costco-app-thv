'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import styles from './ConfigMonth.module.css';
import { MonthEntry } from '@/types/month';
import { useApp } from '@/context/AppContext';

/* ── helpers ─────────────────────────────────────── */
function daysInMonth(monthStr: string): number {
  const [m, y] = monthStr.split('/').map(Number);
  return new Date(y, m, 0).getDate();
}
function defaultFrom(monthStr: string) {
  if (!monthStr) return '';
  const [m, y] = monthStr.split('/');
  return `01/${m}/${y}`;
}
function defaultTo(monthStr: string) {
  if (!monthStr) return '';
  const [m, y] = monthStr.split('/').map(Number);
  const last = daysInMonth(`${m}/${y}`);
  return `${String(last).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}


const BLANK = { label: '', month: '', fromDate: '', toDate: '', note: '' };

interface ColFilters { label: string; month: string; fromDate: string; toDate: string; note: string; }
type SortKey = 'label' | 'month' | 'fromDate' | 'toDate' | 'note';
type SortDir = 'asc' | 'desc';

/* ── SVG Icons ───────────────────────────────────── */
const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconDelete = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconClearX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconCopy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconExport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

/* ── ColFilterInput ──────────────────────────────── */
function ColFilterInput({ value, placeholder, onChange }: {
  value: string; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div className={styles.colFilter}>
      <span className={styles.colFilterIcon}><IconSearch /></span>
      <input className={styles.colFilterInput} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
      {value && (
        <button className={styles.colFilterClear} onClick={() => onChange('')} type="button">
          <IconClearX />
        </button>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────── */
export default function ConfigMonth() {
  const { currentMonth, refreshMonthList, activeMonthId } = useApp();
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const [entries, setEntries] = useState<MonthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  /* ID tháng nguồn để sao chép cấu hình khi tạo mới */
  const [copyFromMonthId, setCopyFromMonthId] = useState('');

  const [showCopy, setShowCopy] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [copyTo, setCopyTo] = useState('');

  const [col, setCol] = useState<ColFilters>({ label: '', month: '', fromDate: '', toDate: '', note: '' });
  const setColField = (key: keyof ColFilters) => (val: string) => setCol(p => ({ ...p, [key]: val }));
  const hasAnyFilter = Object.values(col).some(v => v !== '');

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const handleSort = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir('asc'); }
  };

  /* ── Fetch from API ─────────────────────────── */
  const fetchMonths = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/months');
      if (!res.ok) throw new Error(await res.text());
      setEntries(await res.json());
    } catch (e) {
      setError('Không thể tải dữ liệu: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMonths(); }, [fetchMonths]);

  // Scroll đến hàng được highlight khi tháng chọn thay đổi
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMonth, entries]);

  /* ── Filtered + sorted rows ──────────────────── */
  const filtered = useMemo(() => {
    const base = entries.filter(en =>
      (!col.label    || en.label.toLowerCase().includes(col.label.toLowerCase()))
      && (!col.month    || en.month.includes(col.month))
      && (!col.fromDate || en.fromDate.includes(col.fromDate))
      && (!col.toDate   || en.toDate.includes(col.toDate))
      && (!col.note     || en.note.toLowerCase().includes(col.note.toLowerCase()))
    );
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      const va = String(a[sortKey] ?? '').toLowerCase();
      const vb = String(b[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
    });
  }, [entries, col, sortKey, sortDir]);

  const clearAllFilters = () => setCol({ label: '', month: '', fromDate: '', toDate: '', note: '' });

  /* ── Form helpers ───────────────────────────── */
  const handleMonthChange = (val: string) =>
    setForm(f => ({ ...f, month: val, fromDate: defaultFrom(val), toDate: defaultTo(val) }));

  const openCreate = () => { setForm(BLANK); setEditId(null); setCopyFromMonthId(''); setShowForm(true); };
  const openEdit = (en: MonthEntry) => {
    setForm({ label: en.label, month: en.month, fromDate: en.fromDate, toDate: en.toDate, note: en.note });
    setEditId(en.id); setCopyFromMonthId(''); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); setCopyFromMonthId(''); };

  /* ── Submit (Create / Update) ───────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.month || !form.fromDate || !form.toDate) return;
    setSaving(true);
    try {
      if (editId) {
        // UPDATE
        const res = await fetch(`/api/months/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: form.label, fromDate: form.fromDate, toDate: form.toDate, note: form.note }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        // CREATE
        const newEntry: MonthEntry = {
          id: Date.now().toString(),
          ...form,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        const res = await fetch('/api/months', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Lỗi tạo tháng');
        }

        // Tự động sao chép cấu hình nếu user chọn tháng nguồn
        if (copyFromMonthId) {
          const copyRes = await fetch('/api/months/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromMonthId: copyFromMonthId, toMonthId: newEntry.id }),
          });
          if (!copyRes.ok) {
            const err = await copyRes.json();
            alert('⚠️ Tạo tháng thành công nhưng sao chép cấu hình thất bại: ' + err.error);
          }
        }
      }
      await fetchMonths();
      refreshMonthList();   // cập nhật Topbar
      closeForm();
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ─────────────────────────────────── */
  const confirmDelete = useCallback((id: string) => setDeleteId(id), []);
  const doDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await fetch(`/api/months/${deleteId}`, { method: 'DELETE' });
      await fetchMonths();
      refreshMonthList();   // cập nhật Topbar
    } finally {
      setSaving(false);
      setDeleteId(null);
    }
  };

  /* ── Copy month ─────────────────────────────── */
  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyFrom || !copyTo) return;
    setSaving(true);
    try {
      // 1. Tạo record tháng mới
      const newEntry: MonthEntry = {
        id: Date.now().toString(),
        month: copyTo,
        label: `Tháng ${copyTo}`,
        fromDate: defaultFrom(copyTo),
        toDate: defaultTo(copyTo),
        note: `Sao chép từ ${copyFrom}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const createRes = await fetch('/api/months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      if (!createRes.ok) throw new Error((await createRes.json()).error);

      // 2. Copy toàn bộ cấu hình từ tháng nguồn
      const fromEntry = entries.find(en => en.month === copyFrom);
      if (fromEntry) {
        const copyRes = await fetch('/api/months/copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromMonthId: fromEntry.id, toMonthId: newEntry.id }),
        });
        if (!copyRes.ok) {
          const err = await copyRes.json();
          alert('⚠️ Tạo tháng thành công, nhưng sao chép cấu hình thất bại: ' + err.error);
        }
      }

      await fetchMonths();
      refreshMonthList();
      setShowCopy(false); setCopyFrom(''); setCopyTo('');
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };


  /* ── Month options ──────────────────────────── */
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(2025, i, 1);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });

  /* ── Render ─────────────────────────────────── */
  return (
    <div className={styles.page}>

      {/* ── Action bar ── */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarLeft}>
          {error && (
            <span className={styles.errorChip}>⚠ {error}</span>
          )}
          {hasAnyFilter && !error && (
            <button className={styles.btnClearAll} onClick={clearAllFilters}>
              ✕ Xóa bộ lọc ({filtered.length}/{entries.length})
            </button>
          )}
        </div>

        <div className={styles.actionBarRight}>
          <button className={`${styles.btnAction} ${styles.btnActionPrimary}`}
            onClick={openCreate} disabled={loading} title="Thêm tháng mới">
            <IconPlus /><span>Thêm Mới</span>
          </button>

          <div className={styles.dividerV} />

          <button className={styles.btnAction}
            onClick={() => setShowCopy(true)} disabled={loading} title="Sao chép cấu hình từ tháng khác">
            <IconCopy /><span>Sao Chép Tháng</span>
          </button>

          <button className={`${styles.btnAction} ${styles.btnActionGreen}`}
            title="Xuất Excel" disabled>
            <IconExport /><span>Xuất Excel</span>
          </button>

          <div className={styles.dividerV} />

          <button className={styles.btnAction} onClick={fetchMonths}
            disabled={loading} title="Tải lại dữ liệu">
            <span className={loading ? styles.spinning : ''}><IconRefresh /></span>
          </button>
        </div>
      </div>

      {/* ── Copy modal ── */}
      {showCopy && (
        <div className={styles.formOverlay} onClick={e => e.target === e.currentTarget && setShowCopy(false)}>
          <div className={styles.formModal}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>📋 Sao Chép Tháng</h2>
              <button className={styles.formClose} onClick={() => setShowCopy(false)}>✕</button>
            </div>
            <form onSubmit={handleCopy} className={styles.form}>
              <div className={styles.copyInfo}>
                Sao chép cấu hình ca làm việc, phòng ban và quy tắc phân bổ sang tháng mới.
                Danh sách nhân viên <strong>không</strong> được sao chép.
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Tháng nguồn <span className={styles.required}>*</span></label>
                  <select className={styles.select} value={copyFrom}
                    onChange={e => setCopyFrom(e.target.value)} required>
                    <option value="">-- Chọn tháng --</option>
                    {entries.map(en => <option key={en.id} value={en.month}>{en.month}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Tháng đích <span className={styles.required}>*</span></label>
                  <select className={styles.select} value={copyTo}
                    onChange={e => setCopyTo(e.target.value)} required>
                    <option value="">-- Chọn tháng --</option>
                    {monthOptions.filter(m => !entries.some(en => en.month === m)).map(m =>
                      <option key={m} value={m}>{m}</option>
                    )}
                  </select>
                  <span className={styles.fieldHint}>Chỉ hiển thị tháng chưa có cấu hình</span>
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? 'Đang xử lý…' : '📋 Sao chép'}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowCopy(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add/Edit form modal ── */}
      {showForm && (
        <div className={styles.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={styles.formModal}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>{editId ? '✏️ Chỉnh sửa tháng' : '➕ Thêm tháng mới'}</h2>
              <button className={styles.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Tên Tháng <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: 11 }}>(tùy chọn)</span></label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: Tháng 5 – Chính thức, Tháng khai trương…"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Tháng <span className={styles.required}>*</span></label>
                <select className={styles.select} value={form.month}
                  onChange={e => handleMonthChange(e.target.value)} required disabled={!!editId}>
                  <option value="">-- Chọn tháng --</option>
                  {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {editId && <span className={styles.fieldHint}>Không thể thay đổi tháng khi chỉnh sửa</span>}
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Từ ngày <span className={styles.required}>*</span></label>
                  <input type="text" className={styles.input} placeholder="DD/MM/YYYY"
                    value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Đến ngày <span className={styles.required}>*</span></label>
                  <input type="text" className={styles.input} placeholder="DD/MM/YYYY"
                    value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} required />
                </div>
              </div>
              {/* Sao chép từ tháng khác — chỉ hiện khi tạo mới */}
              {!editId && (
                <div className={styles.field}>
                  <label className={styles.label}>
                    Sao chép cấu hình từ tháng
                    <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: 11, marginLeft: 6 }}>(tùy chọn)</span>
                  </label>
                  <select
                    className={styles.select}
                    value={copyFromMonthId}
                    onChange={e => setCopyFromMonthId(e.target.value)}
                  >
                    <option value="">— Không sao chép —</option>
                    {entries.map(en => (
                      <option key={en.id} value={en.id}>
                        {en.label ? `${en.label} (${en.month})` : en.month}
                      </option>
                    ))}
                  </select>
                  {copyFromMonthId && (
                    <span className={styles.fieldHint} style={{ color: 'var(--primary)' }}>
                      ✓ Sẽ sao chép: Phòng Ban, Ca Làm Việc, Loại Nghỉ Phép, Nhóm Đặc Thù, Quy Tắc Phân Bổ
                      &nbsp;·&nbsp;<em>Không sao chép nhân viên</em>
                    </span>
                  )}
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label}>Ghi chú</label>
                <textarea className={styles.textarea} rows={3}
                  placeholder="Ghi chú thêm về tháng này…"
                  value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? 'Đang lưu…' : editId ? '💾 Lưu thay đổi' : '✅ Thêm tháng'}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={closeForm}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteId && (
        <div className={styles.formOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmIcon}>🗑️</div>
            <h3 className={styles.confirmTitle}>Xác nhận xóa</h3>
            <p className={styles.confirmDesc}>
              Bạn có chắc muốn xóa tháng{' '}
              <strong>{entries.find(e => e.id === deleteId)?.month}</strong>?<br />
              Hành động này không thể hoàn tác.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.btnDanger} onClick={doDelete} disabled={saving}>
                {saving ? 'Đang xóa…' : '🗑️ Xóa'}
              </button>
              <button className={styles.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner} />
            <span>Đang tải dữ liệu từ DuckDB…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📅</span>
            <p>Chưa có tháng nào. Nhấn <strong>+ Thêm Mới</strong> để bắt đầu.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr className={styles.headRow}>
                <th className={styles.thStt}>#</th>
                {/* Tên Tháng */}
                <th className={styles.thLabel} onClick={() => handleSort('label')} style={{ cursor: 'pointer' }}>
                  <span className={styles.thSortInner}>
                    Tên Tháng
                    <span className={styles.sortIcon}>{sortKey === 'label' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </span>
                </th>
                <th className={styles.thMonth} onClick={() => handleSort('month')} style={{ cursor: 'pointer' }}>
                  <span className={styles.thSortInner}>
                    Tháng
                    <span className={styles.sortIcon}>{sortKey === 'month' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </span>
                </th>
                <th className={styles.thDate} onClick={() => handleSort('fromDate')} style={{ cursor: 'pointer' }}>
                  <span className={styles.thSortInner}>
                    Từ Ngày
                    <span className={styles.sortIcon}>{sortKey === 'fromDate' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </span>
                </th>
                <th className={styles.thDate} onClick={() => handleSort('toDate')} style={{ cursor: 'pointer' }}>
                  <span className={styles.thSortInner}>
                    Đến Ngày
                    <span className={styles.sortIcon}>{sortKey === 'toDate' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </span>
                </th>
                <th className={styles.thDays}>Số Ngày</th>
                <th onClick={() => handleSort('note')} style={{ cursor: 'pointer' }}>
                  <span className={styles.thSortInner}>
                    Ghi Chú
                    <span className={styles.sortIcon}>{sortKey === 'note' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </span>
                </th>
                <th className={styles.thAction}>Thao Tác</th>
              </tr>
              <tr className={styles.filterRow}>
                <th className={styles.thStt} />
                <th className={styles.thLabel}>
                  <ColFilterInput value={col.label} placeholder="Tên tháng…" onChange={setColField('label')} />
                </th>
                <th className={styles.thMonth}>
                  <ColFilterInput value={col.month} placeholder="VD: 05/2026" onChange={setColField('month')} />
                </th>
                <th className={styles.thDate}>
                  <ColFilterInput value={col.fromDate} placeholder="DD/MM/YYYY" onChange={setColField('fromDate')} />
                </th>
                <th className={styles.thDate}>
                  <ColFilterInput value={col.toDate} placeholder="DD/MM/YYYY" onChange={setColField('toDate')} />
                </th>
                <th className={styles.thDays} />
                <th>
                  <ColFilterInput value={col.note} placeholder="Tìm ghi chú…" onChange={setColField('note')} />
                </th>
                <th className={styles.thAction} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.noResult}>
                    Không tìm thấy kết quả.{' '}
                    <button className={styles.linkBtn} onClick={clearAllFilters}>Xóa bộ lọc</button>
                  </td>
                </tr>
              ) : filtered.map((en, i) => {
                const days = daysInMonth(en.month);
                const isActive = en.id === activeMonthId;
                const isCurrentMonth = en.month === currentMonth;
                return (
                  <tr
                    key={en.id}
                    ref={isActive ? highlightRef : null}
                    className={isActive ? styles.rowSelected : ''}
                  >
                    <td className={styles.tdStt}>{i + 1}</td>
                    <td>
                      <div className={styles.labelCell}>
                        <span className={styles.labelText}>{en.label || <span className={styles.noNote}>—</span>}</span>
                        {isActive && <span className={styles.selectedTag}>📌 Đang thao tác</span>}
                        {isCurrentMonth && !isActive && <span className={styles.selectedTag} style={{ background: '#dcfce7', color: '#15803d' }}>📅 Tháng hiện tại</span>}
                      </div>
                    </td>
                    <td>
                      <div className={styles.monthCell}>
                        <span className={[
                          styles.monthBadge,
                          isActive ? styles.monthBadgeSelected : '',
                        ].filter(Boolean).join(' ')}>
                          {en.month}
                        </span>
                      </div>
                    </td>
                    <td className={styles.dateCell}>{en.fromDate}</td>
                    <td className={styles.dateCell}>{en.toDate}</td>
                    <td><span className={styles.daysBadge}>{days} ngày</span></td>
                    <td className={styles.noteCell}>
                      {en.note || <span className={styles.noNote}>—</span>}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnIconEdit} onClick={() => openEdit(en)} title="Chỉnh sửa">
                          <IconEdit />
                        </button>
                        <button className={styles.btnIconDelete} onClick={() => confirmDelete(en.id)} title="Xóa">
                          <IconDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
