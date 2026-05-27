'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import s from '@/styles/table.module.css';
import ss from './Shifts.module.css';
import { IconEdit, IconDelete, IconSearch, IconClearX, IconPlus, IconRefresh } from '@/lib/icons';

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
import { useApp } from '@/context/AppContext';


/* ── Types ────────────────────────────────────── */
interface Dept { id: string; code: string; name: string; active: boolean; }

interface Shift {
  id: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  shiftType: string;
  windowStart: string | number;
  clockIn: string | number;
  clockOut: string | number;
  windowEnd: string | number;
  createdAt: string;
}

type Filters = {
  name: string;
  departmentId: string;
  shiftType: string;
};
type SortKey = 'name' | 'departmentName' | 'shiftType' | 'windowStart' | 'clockIn' | 'clockOut' | 'windowEnd';
type SortDir = 'asc' | 'desc';

const BLANK = {
  name: '', departmentId: '', shiftType: 'Ca 1',
  windowStart: '', clockIn: '', clockOut: '', windowEnd: '',
};

const SHIFT_TYPES = ['Ca 1', 'Ca 2', 'Chung'];

/* ── Sub-components ───────────────────────────── */
function ColFilter({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <div className={s.colFilter}>
      <span className={s.colFilterIcon}><IconSearch /></span>
      <input className={s.colFilterInput} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      {value && <button className={s.colFilterClear} onClick={() => onChange('')} type="button"><IconClearX /></button>}
    </div>
  );
}

function SortTh({
  label, sortKey, current, dir, onSort, className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey | null;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`${s.thSortable}${active ? ` ${s.thSortActive}` : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className={s.thSortInner}>
        {label}
        <span className={s.sortIcon}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </span>
    </th>
  );
}

/* ── Helpers ──────────────────────────────────── */
/** Chuẩn hóa giờ về HH:MM (xử lý cả số thực DuckDB lẫn chuỗi) */
function formatTime(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  // DuckDB TIME trả về số giây trong ngày (integer) hoặc fraction of day (float)
  if (typeof val === 'number') {
    const totalSec = val < 1 ? Math.round(val * 86400) : Math.round(val);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  const m = String(val).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(val);
  return m[1].padStart(2, '0') + ':' + m[2];
}

/* ── Main ─────────────────────────────────────── */
export default function Shifts() {
  const { activeMonthId, activeMonthLocked } = useApp();
  const [rows, setRows] = useState<Shift[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; skippedCodes: string[]; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [col, setCol] = useState<Filters>({
    name: '', departmentId: '', isDefault: '', shiftType: '', otCalc: '',
  });
  const setF = (k: keyof Filters) => (v: string) => setCol(p => ({ ...p, [k]: v }));
  const hasFilter = Object.values(col).some(v => v !== '');

  /* ── Sort ─────────────────────────────────────── */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const handleSort = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir('asc'); }
  };

  /* fetch shifts */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?month=${activeMonthId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Lỗi tải dữ liệu');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Shifts]', e);
      setRows([]);
    } finally { setLoading(false); }
  }, [activeMonthId]);

  /* fetch departments */
  const loadDepts = useCallback(async () => {
    try {
      const res = await fetch(`/api/departments?month=${activeMonthId}`);
      const data = await res.json();
      setDepts(Array.isArray(data) ? data.filter((d: Dept) => d.active) : []);
    } catch { setDepts([]); }
  }, [activeMonthId]);

  useEffect(() => { load(); loadDepts(); }, [load, loadDepts]);

  /* filter + sort */
  const filtered = useMemo(() => {
    const base = rows.filter(r =>
      (!col.name || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
      (!col.departmentId || r.departmentId === col.departmentId) &&
      (col.isDefault === '' || (col.isDefault === 'true' ? r.isDefault : !r.isDefault)) &&
      (!col.shiftType || r.shiftType === col.shiftType) &&
      (!col.otCalc  || r.otCalc === col.otCalc)
    );
    if (!sortKey) return base;
    const numCols: SortKey[] = [];
    return [...base].sort((a, b) => {
      let va: string | number, vb: string | number;
      if (numCols.includes(sortKey)) {
        va = (a as unknown as Record<string, number>)[sortKey] ?? 0;
        vb = (b as unknown as Record<string, number>)[sortKey] ?? 0;
        return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
      }
      if (sortKey === 'isDefault') { va = a.isDefault ? '1' : '0'; vb = b.isDefault ? '1' : '0'; }
      else if (sortKey === 'departmentName') { va = (a.departmentName ?? '').toLowerCase(); vb = (b.departmentName ?? '').toLowerCase(); }
      else { va = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase(); vb = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase(); }
      return sortDir === 'asc' ? (va as string).localeCompare(vb as string, 'vi') : (vb as string).localeCompare(va as string, 'vi');
    });
  }, [rows, col, sortKey, sortDir]);

  const clearFilters = () => setCol({ name: '', departmentId: '', shiftType: '' });

  /* form helpers */
  const setField = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (r: Shift) => {
    setForm({
      name: r.name,
      departmentId: r.departmentId ?? '',
      shiftType: r.shiftType,
      windowStart: formatTime(r.windowStart),
      clockIn: formatTime(r.clockIn),
      clockOut: formatTime(r.clockOut),
      windowEnd: formatTime(r.windowEnd),
    });
    setEditId(r.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };

  /* submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.clockIn || !form.clockOut) return;
    setSaving(true);
    try {
      const payload = { ...form, departmentId: form.departmentId || null };
      if (editId) {
        const res = await fetch(`/api/shifts/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Date.now().toString(), ...payload, monthId: activeMonthId, createdAt: new Date().toISOString().slice(0, 10) }) });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      await load(); closeForm();
    } catch (err) { alert('Lỗi: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setSaving(false); }
  };

  /* delete */
  const doDelete = async () => {
    if (!deleteId) return; setSaving(true);
    await fetch(`/api/shifts/${deleteId}`, { method: 'DELETE' });
    await load(); setSaving(false); setDeleteId(null);
  };

  const doDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch(`/api/shifts/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId: activeMonthId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
      setShowDeleteAll(false);
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingAll(false);
    }
  };

  /* ── Export template ────────────────────────── */
  const downloadTemplate = () => {
    window.open('/api/shifts/import', '_blank');
  };

  /* ── Import Excel ───────────────────────────── */
  const doImport = async (file: File, sheetName: string) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('monthId', activeMonthId);
      fd.append('sheetName', sheetName);
      const res = await fetch('/api/shifts/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult(data);
      await load();
    } catch (err) {
      alert('Lỗi import: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImporting(false);
      setShowSheetSelector(false);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (workbook.SheetNames.length > 1) {
        setAvailableSheets(workbook.SheetNames);
        setSelectedSheet(workbook.SheetNames[0]);
        setPendingFile(file);
        setShowSheetSelector(true);
      } else {
        await doImport(file, workbook.SheetNames[0]);
      }
    } catch (err) {
      alert('Lỗi đọc file: ' + (err instanceof Error ? err.message : String(err)));
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSheetConfirm = () => {
    if (pendingFile && selectedSheet) {
      doImport(pendingFile, selectedSheet);
    }
  };

  const handleSheetCancel = () => {
    setShowSheetSelector(false);
    setPendingFile(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    if (fileRef.current) fileRef.current.value = '';
  };

  /* phòng ban có trong dữ liệu shifts */
  const availableDepts = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach(r => { if (r.departmentId) seen.add(r.departmentId); });
    return depts.filter(d => seen.has(d.id));
  }, [rows, depts]);

  /* dept lookup cho hiển thị badge trong bảng */
  const deptById = useMemo(() => {
    const m: Record<string, Dept> = {};
    depts.forEach(d => { m[d.id] = d; });
    return m;
  }, [depts]);

  /* loại ca có trong dữ liệu */
  const availableShiftTypes = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach(r => { if (r.shiftType) seen.add(r.shiftType); });
    return [...seen].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rows]);

  /* ── Render ─────────────────────────────────── */
  return (
    <div className={s.page}>

      {/* Action bar */}
      <div className={s.actionBar}>
        <div className={s.actionBarLeft}>
          {hasFilter && <button className={s.btnClearAll} onClick={clearFilters}>✕ Xóa bộ lọc ({filtered.length}/{rows.length})</button>}
        </div>
        <div className={s.actionBarRight}>
          <button className={`${s.btnAction} ${s.btnActionPrimary}`} onClick={openCreate} disabled={loading || activeMonthLocked}><IconPlus /><span>Thêm Mới</span></button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={downloadTemplate} title="Tải file Excel mẫu để nhập liệu">
            <IconDownload /><span>Tải Mẫu</span>
          </button>
          <a
            className={s.btnAction}
            href={`/api/shifts/export?month=${activeMonthId}`}
            download
            title="Xuất dữ liệu ca làm việc ra Excel"
            style={{ color: '#0f766e' }}
          >
            <IconDownload /><span>Xuất Excel</span>
          </a>
          <button className={`${s.btnAction} ${s.btnActionGreen}`}
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            title="Import dữ liệu từ file Excel">
            {importing ? <span className={s.spinning}><IconUpload /></span> : <IconUpload />}
            <span>{importing ? 'Đang import…' : 'Import Excel'}</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
          <div className={s.dividerV} />
          <button 
            className={s.btnAction} 
            onClick={() => setShowDeleteAll(true)} 
            disabled={loading || activeMonthLocked || rows.length === 0}
            style={{ color: '#dc2626' }}
            title="Xóa tất cả ca làm việc"
          >
            <IconDelete /><span>Xóa Tất Cả</span>
          </button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={() => { load(); loadDepts(); }} disabled={loading}><span className={loading ? s.spinning : ''}><IconRefresh /></span></button>
        </div>
      </div>

      {/* ── Form modal ── */}
      {showForm && (
        <div className={s.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={`${s.formModal} ${ss.formWide}`}>
            <div className={s.formHeader}>
              <h2 className={s.formTitle}>{editId ? '✏️ Sửa ca làm việc' : '➕ Thêm ca làm việc'}</h2>
              <button className={s.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={s.form}>

              {/* Row 1: Tên + Phòng ban (dropdown liên kết) */}
              <div className={ss.row3col}>
                <div className={`${s.field} ${ss.col2}`}>
                  <label className={s.label}>Tên ca <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="VD: BỘ PHẬN TỔNG HỢP" required />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Phòng ban</label>
                  <select
                    className={s.input}
                    value={form.departmentId}
                    onChange={e => setField('departmentId', e.target.value)}
                  >
                    <option value="">🏢 Ca chung toàn công ty (không gắn phòng ban)</option>
                    {depts.map(d => (
                      <option key={d.id} value={d.id}>{d.code} – {d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Loại ca */}
              <div className={ss.row4col}>
                <div className={s.field}>
                  <label className={s.label}>Loại ca</label>
                  <select className={s.select} value={form.shiftType} onChange={e => setField('shiftType', e.target.value)}>
                    {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className={ss.sectionDivider}>⏱ Cấu hình giờ làm việc</div>

              {/* Row 3: Giờ làm */}
              <div className={ss.row4col}>
                <div className={s.field}>
                  <label className={s.label}>Giờ vào làm (bắt đầu)</label>
                  <input type="time" className={s.input} value={form.windowStart} onChange={e => setField('windowStart', e.target.value)} />
                  <span className={s.fieldHint}>Sớm nhất có thể chấm vào</span>
                </div>
                <div className={s.field}>
                  <label className={s.label}>Giờ vào làm chuẩn <span className={s.required}>*</span></label>
                  <input type="time" className={s.input} value={form.clockIn} onChange={e => setField('clockIn', e.target.value)} required />
                  <span className={s.fieldHint}>Giờ bắt đầu làm việc</span>
                </div>
                <div className={s.field}>
                  <label className={s.label}>Giờ tan làm chuẩn <span className={s.required}>*</span></label>
                  <input type="time" className={s.input} value={form.clockOut} onChange={e => setField('clockOut', e.target.value)} required />
                  <span className={s.fieldHint}>Giờ kết thúc làm việc</span>
                </div>
                <div className={s.field}>
                  <label className={s.label}>Giờ tan làm (kết thúc)</label>
                  <input type="time" className={s.input} value={form.windowEnd} onChange={e => setField('windowEnd', e.target.value)} />
                  <span className={s.fieldHint}>Muộn nhất tính công</span>
                </div>
              </div>

              <div className={s.formActions}>
                <button type="submit" className={s.btnPrimary} disabled={saving}>{saving ? 'Đang lưu…' : editId ? '💾 Lưu thay đổi' : '✅ Thêm ca'}</button>
                <button type="button" className={s.btnSecondary} onClick={closeForm}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon}>🗑️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa</h3>
            <p className={s.confirmDesc}>Xóa ca <strong>{rows.find(r => r.id === deleteId)?.name}</strong>?<br />Hành động này không thể hoàn tác.</p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDelete} disabled={saving}>{saving ? '…' : '🗑️ Xóa'}</button>
              <button className={s.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all confirm */}
      {showDeleteAll && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa tất cả</h3>
            <p className={s.confirmDesc}>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ {rows.length} ca làm việc</strong>?<br />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Hành động này không thể hoàn tác!</span>
            </p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDeleteAll} disabled={deletingAll}>
                {deletingAll ? 'Đang xóa…' : '🗑️ Xóa Tất Cả'}
              </button>
              <button className={s.btnSecondary} onClick={() => setShowDeleteAll(false)} disabled={deletingAll}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet selector modal */}
      {showSheetSelector && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal} style={{ maxWidth: 480 }}>
            <div className={s.confirmIcon} style={{ background: '#eff6ff', color: '#1d4ed8' }}>📊</div>
            <h3 className={s.confirmTitle}>Chọn Sheet để Import</h3>
            <p className={s.confirmDesc} style={{ marginBottom: 16 }}>
              File Excel có <strong>{availableSheets.length} sheets</strong>. Vui lòng chọn sheet cần import:
            </p>
            <div style={{ marginBottom: 20 }}>
              <select
                className={s.input}
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 14 }}
              >
                {availableSheets.map(sheet => (
                  <option key={sheet} value={sheet}>{sheet}</option>
                ))}
              </select>
            </div>
            <div className={s.confirmActions}>
              <button className={s.btnPrimary} onClick={handleSheetConfirm} disabled={importing}>
                {importing ? '⏳ Đang import…' : '✅ Import'}
              </button>
              <button className={s.btnSecondary} onClick={handleSheetCancel} disabled={importing}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import result modal */}
      {importResult && (
        <div className={s.formOverlay} onClick={() => setImportResult(null)}>
          <div className={s.confirmModal} style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon}>{importResult.errors.length === 0 ? '✅' : '⚠️'}</div>
            <h3 className={s.confirmTitle}>Kết quả Import</h3>
            <div style={{ textAlign: 'left', fontSize: 13.5, lineHeight: 1.8, marginBottom: 20 }}>
              <p>✅ Đã thêm: <strong>{importResult.inserted}</strong> ca làm việc</p>
              <p>⏭ Bỏ qua: <strong>{importResult.skipped}</strong>
                {importResult.skippedCodes?.length > 0 &&
                  <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 6 }}>
                    ({importResult.skippedCodes.join(', ')})
                  </span>
                }
              </p>
              {importResult.errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ color: 'var(--danger)', fontWeight: 600 }}>❌ Lỗi ({importResult.errors.length}):</p>
                  <ul style={{ paddingLeft: 16, color: 'var(--danger)', fontSize: 12 }}>
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className={s.confirmActions} style={{ justifyContent: 'center' }}>
              <button className={s.btnPrimary} onClick={() => setImportResult(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className={`${s.tableCard} ${ss.tableWrap}`}>
        {loading ? (
          <div className={s.loadingState}><span className={s.spinner} /><span>Đang tải dữ liệu…</span></div>
        ) : (
          <table className={`${s.table} ${ss.tableFixed}`}>
            <thead>
              <tr className={s.headRow}>
                <th className={ss.thStt}>#</th>
                <SortTh label="Tên Ca"        sortKey="name"         current={sortKey} dir={sortDir} onSort={handleSort} className={ss.thName} />
                <SortTh label="Phòng Ban"     sortKey="departmentName" current={sortKey} dir={sortDir} onSort={handleSort} className={ss.thDept} />
                <SortTh label="Loại Ca"       sortKey="shiftType"     current={sortKey} dir={sortDir} onSort={handleSort} className={ss.thType} />
                <SortTh label="Giờ Vào (BD)" sortKey="windowStart"   current={sortKey} dir={sortDir} onSort={handleSort} className={ss.thTime} />
                <SortTh label="Giờ Vào"      sortKey="clockIn"       current={sortKey} dir={sortDir} onSort={handleSort} className={ss.thTime} />
                <SortTh label="Giờ Tan"       sortKey="clockOut"      current={sortKey} dir={sortDir} onSort={handleSort} className={ss.thTime} />
                <SortTh label="Giờ Tan (KT)" sortKey="windowEnd"     current={sortKey} dir={sortDir} onSort={handleSort} className={ss.thTime} />
                <th className={ss.thAction}>Thao Tác</th>
              </tr>
              <tr className={s.filterRow}>
                <th />
                <th><ColFilter value={col.name} placeholder="Tên ca…" onChange={setF('name')} /></th>
                {/* Phòng Ban – chỉ hiện dept có trong shifts */}
                <th>
                  <select className={ss.filterSelect} value={col.departmentId}
                    onChange={e => setCol(p => ({ ...p, departmentId: e.target.value }))}>
                    <option value="">Tất cả</option>
                    {availableDepts.map(d => (
                      <option key={d.id} value={d.id}>{d.code} – {d.name}</option>
                    ))}
                  </select>
                </th>
                {/* Loại Ca */}
                <th>
                  <select className={ss.filterSelect} value={col.shiftType}
                    onChange={e => setCol(p => ({ ...p, shiftType: e.target.value }))}>
                    <option value="">Tất cả</option>
                    {availableShiftTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </th>
                <th /><th /><th /><th />
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className={s.noResult}>Không có kết quả. <button className={s.linkBtn} onClick={clearFilters}>Xóa bộ lọc</button></td></tr>
              ) : filtered.map((r, i) => {
                const dept = r.departmentId ? deptById[r.departmentId] : null;
                return (
                  <tr key={r.id}>
                    <td className={`${s.tdStt} ${ss.tdStt}`}>{i + 1}</td>
                    <td className={ss.tdName}>{r.name}</td>
                    <td className={ss.tdDept}>
                      {dept ? dept.name : <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Ca chung (mặc định)</span>}
                    </td>
                    <td><span className={ss.typeBadge} data-type={r.shiftType}>{r.shiftType}</span></td>
                    <td className={s.timeCell}>{formatTime(r.windowStart) || <span className={s.noNote}>—</span>}</td>
                    <td className={`${s.timeCell} ${ss.timeMain}`}>{formatTime(r.clockIn)}</td>
                    <td className={`${s.timeCell} ${ss.timeMain}`}>{formatTime(r.clockOut)}</td>
                    <td className={s.timeCell}>{formatTime(r.windowEnd) || <span className={s.noNote}>—</span>}</td>
                    <td>
                      <div className={s.actions}>
                        <button className={s.btnIconEdit} onClick={() => openEdit(r)} title="Chỉnh sửa" disabled={activeMonthLocked}><IconEdit /></button>
                        <button className={s.btnIconDelete} onClick={() => setDeleteId(r.id)} title="Xóa" disabled={activeMonthLocked}><IconDelete /></button>
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
