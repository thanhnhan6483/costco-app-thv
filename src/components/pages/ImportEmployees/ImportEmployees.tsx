'use client';
import { useState, useCallback, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import s from '@/styles/table.module.css';
import styles from './ImportEmployees.module.css';
import { IconEdit, IconDelete, IconSearch, IconClearX, IconRefresh } from '@/lib/icons';
import { useApp } from '@/context/AppContext';


const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const DAY_COUNT = 31;

const SYM_TO_DT: Record<string, number> = { X: 0, L: 1, LP: 1, PN: 2, Ô: 3, TS: 4, DS: 5, O: 6, NL: 7, OF: 8, P: 9, 'X/2': 10, LL: 11, LN: 12, H: 13, B: 14 };
const DT_TEXT: Record<number, string> = { 0: '#15803d', 1: '#475569', 2: '#6d28d9', 3: '#b91c1c', 4: '#be185d', 5: '#0f766e', 6: '#c2410c', 7: '#1d4ed8', 8: '#4b5563', 9: '#0e7490', 10: '#065f46', 11: '#92400e', 12: '#78350f', 13: '#1e40af', 14: '#374151' };
const DT_CELL_BG: Record<number, string> = { 0: '#f0fdf4', 1: '#f1f5f9', 2: '#f5f3ff', 3: '#fef2f2', 4: '#fdf2f8', 5: '#f0fdfa', 6: '#fff7ed', 7: '#eff6ff', 8: '#f8fafc', 9: '#ecfeff', 10: '#d1fae5', 11: '#fef3c7', 12: '#fef9c3', 13: '#dbeafe', 14: '#f3f4f6' };
const DT_SYMBOL: Record<number, string> = { 0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P', 10: 'X/2', 11: 'LL', 12: 'LN', 13: 'H', 14: 'B' };

interface Employee {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  maPb: string;              // Mã PB raw từ Excel / nhập tay
  departmentCode: string | null;
  departmentName: string | null;
  specialGroup: string;
  specialGroupName: string | null;   // Tên nhóm đặc thù (JOIN từ special_groups)
  groupCodeEndDate: string;
  workdays: string;
  ngayNghiCuoiThangTruoc: string;
  overtimeHours: string;
  lateMinutes: string;
  phepNam: string;
  day_1: string; day_2: string; day_3: string; day_4: string; day_5: string;
  day_6: string; day_7: string; day_8: string; day_9: string; day_10: string;
  day_11: string; day_12: string; day_13: string; day_14: string; day_15: string;
  day_16: string; day_17: string; day_18: string; day_19: string; day_20: string;
  day_21: string; day_22: string; day_23: string; day_24: string; day_25: string;
  day_26: string; day_27: string; day_28: string; day_29: string; day_30: string;
  day_31: string;
  active: boolean;
  createdAt: string;
}

const BLANK = {
  code: '', name: '', departmentId: '', specialGroup: '',
  groupCodeEndDate: '', workdays: '', overtimeHours: '',
  lateMinutes: '', phepNam: '', ngayNghiCuoiThangTruoc: '',
  days: Array(DAY_COUNT).fill(''),
};

function getDay(emp: Employee, i: number): string {
  return (emp as unknown as Record<string, unknown>)[`day_${i + 1}`] as string ?? '';
}

/** Parse giá trị số từ string. Trả về NaN nếu rỗng/không phải số. */
function numVal(s: string): number { return s?.trim() ? parseFloat(s.replace(',', '.')) : NaN; }

/** Format ngày thành DD/MM/YYYY. Hỗ trợ YYYY-MM-DD, DD/MM/YYYY, timestamp. */
function formatDate(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val).trim();
  // Đã là DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function ColFilter({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <div className={s.colFilter}>
      <span className={s.colFilterIcon}><IconSearch /></span>
      <input className={s.colFilterInput} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      {value && <button className={s.colFilterClear} onClick={() => onChange('')} type="button"><IconClearX /></button>}
    </div>
  );
}

function SortTh({ label, sortKey, current, onSort, className }: {
  label: string; sortKey: string;
  current: { key: string; dir: 'asc' | 'desc' } | null;
  onSort: (k: string) => void;
  className?: string;
}) {
  const active = current?.key === sortKey;
  const icon = active ? (current!.dir === 'asc' ? '▲' : '▼') : '⇅';
  return (
    <th className={className} onClick={() => onSort(sortKey)}
      style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
      title={active ? (current!.dir === 'asc' ? 'Nhấn để đảo thứ tự' : 'Nhấn để bỏ sort') : 'Nhấn để sắp xếp'}
    >
      {label}
      <span style={{ marginLeft: 4, fontSize: 9, opacity: active ? 1 : 0.35, color: active ? '#2563eb' : 'inherit', verticalAlign: 'middle' }}>
        {icon}
      </span>
    </th>
  );
}

const LIMIT_OPTIONS = [
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '1000', value: 1000 },
  { label: 'Tất cả', value: 99999 },
];

// ── Limit selector component ───────────────────────
function LimitSelector({ total, shown, limit, onLimit }: {
  total: number; shown: number; limit: number;
  onLimit: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: '0.76rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
        Tổng: <strong>{total}</strong> NV
      </span>
      <select
        value={limit}
        onChange={e => onLimit(Number(e.target.value))}
        style={{
          height: 26, padding: '0 6px', border: '1px solid var(--gray-200)',
          borderRadius: 5, fontSize: '0.76rem', color: 'var(--gray-600)',
          background: '#fff', cursor: 'pointer', outline: 'none',
        }}
      >
        {LIMIT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function ImportEmployees() {
  const { activeMonthId, activeMonthLabel, activeMonthLocked } = useApp();
  const daysInMonth = useMemo(() => {
    const parts = String(activeMonthLabel).match(/^(\d{2})\/(\d{4})$/);
    if (!parts) return DAY_COUNT;
    return new Date(+parts[2], +parts[1], 0).getDate();
  }, [activeMonthLabel]);
  const [rows, setRows] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAll, setClearAll] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [relinkResult, setRelinkResult] = useState<{ linked: number; notFound: string[]; totalChecked: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<{ code: string; name: string; dayType: number }[]>([]);
  useEffect(() => {
    fetch(`/api/leave-types?month=${activeMonthId}`).then(r => r.json()).then((data: { code: string; name: string; dayType: number }[]) => {
      setLeaveTypes(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [activeMonthId]);
  const [picker, setPicker] = useState<{ code: string; day: number; currentDT: number | null; x: number; y: number } | null>(null);
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [dragSrc, setDragSrc] = useState<{ code: string; day: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ code: string; day: number } | null>(null);

  const handleCellRightClick = (code: string, day: number, sym: string, e: React.MouseEvent) => {
    if (activeMonthLocked) return;
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPicker({ code, day, currentDT: sym === '' ? null : (SYM_TO_DT[sym] ?? -1), x: rect.left, y: rect.bottom + 4 });
  };

  const handlePick = (dt: number | null) => {
    if (!picker) return;
    const newSym = dt === null ? '' : (DT_SYMBOL[dt] ?? '');
    const origRow = rows.find(r => r.code === picker.code) as unknown as Record<string, unknown>;
    const origSym = String(origRow?.[`day_${picker.day}`] ?? '');
    const k = `${picker.code}_${picker.day}`;
    setEdits(prev => {
      const n = new Map(prev);
      newSym === origSym ? n.delete(k) : n.set(k, newSym);
      return n;
    });
    setPicker(null);
  };

  const handleDrop = (toCode: string, toDay: number) => {
    if (!dragSrc || dragSrc.code !== toCode || dragSrc.day === toDay) {
      setDragSrc(null); setDragOver(null); return;
    }
    const fromRow = rows.find(r => r.code === dragSrc.code) as unknown as Record<string, unknown>;
    const toRow = rows.find(r => r.code === toCode) as unknown as Record<string, unknown>;
    const origFrom = String(fromRow?.[`day_${dragSrc.day}`] ?? '');
    const origTo = String(toRow?.[`day_${toDay}`] ?? '');
    const kFrom = `${dragSrc.code}_${dragSrc.day}`;
    const kTo = `${toCode}_${toDay}`;
    const fromSym = edits.get(kFrom) ?? origFrom;
    const toSym = edits.get(kTo) ?? origTo;
    if (fromSym === origTo && toSym === origFrom) {
      setDragSrc(null); setDragOver(null); return;
    }
    setEdits(prev => {
      const n = new Map(prev);
      toSym === origFrom ? n.delete(kFrom) : n.set(kFrom, toSym);
      fromSym === origTo ? n.delete(kTo) : n.set(kTo, fromSym);
      return n;
    });
    setDragSrc(null); setDragOver(null);
  };

  const handleSaveEdits = async () => {
    if (edits.size === 0) return;
    setSaving(true);
    try {
      const changes = Array.from(edits.entries()).map(([k, symbol]) => {
        const idx = k.lastIndexOf('_');
        return { empCode: k.slice(0, idx), day: Number(k.slice(idx + 1)), symbol };
      });
      const r = await fetch('/api/distribution/edit-day-import', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId: activeMonthId, changes }),
      });
      if (r.ok) {
        setEdits(new Map());
        setRows(prev => {
          const updated = [...prev];
          for (const ch of changes) {
            const idx = updated.findIndex(e => e.code === ch.empCode);
            if (idx >= 0) {
              (updated[idx] as unknown as Record<string, unknown>)[`day_${ch.day}`] = ch.symbol;
            }
          }
          return updated;
        });
      }
    } finally { setSaving(false); }
  };

  const [importResult, setImportResult] = useState<{
    inserted: number; skipped: number; skippedCodes: string[]; errors: string[];
    unmappedDept: { code: string; name: string; deptCode: string }[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // ── Selection & Bulk edit ──────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState<{
    departmentId: string; maPb: string; specialGroup: string; groupCodeEndDate: string;
  }>({ departmentId: '', maPb: '', specialGroup: '', groupCodeEndDate: '' });
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const [col, setCol] = useState({ code: '', name: '', departmentName: '', specialGroup: '', groupCodeEndDate: '', ngayNghi: '', workdays: '', overtimeHours: '', lateMinutes: '', phepNam: '' });
  const setF = (k: keyof typeof col) => (v: string) => setCol(p => ({ ...p, [k]: v }));
  const hasFilter = Object.values(col).some(v => v !== '');

  type SortKey = 'code' | 'name' | 'departmentName' | 'specialGroupName' | 'groupCodeEndDate' | 'ngayNghiCuoiThangTruoc' | 'workdays' | 'overtimeHours' | 'lateMinutes' | 'phepNam';
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const toggleSort = (key: string) =>
    setSort(prev => prev?.key === key ? (prev.dir === 'asc' ? { key: key as SortKey, dir: 'desc' } : null) : { key: key as SortKey, dir: 'asc' });

  const loadWithLimit = useCallback(async (lim: number) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/employees?month=${activeMonthId}&page=1&limit=${lim}`);
      const json = await r.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      setLimit(lim);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [activeMonthId]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [empRes, deptRes, grpRes] = await Promise.all([
        fetch(`/api/employees?month=${activeMonthId}&page=1&limit=${limit}`),
        fetch(`/api/departments?month=${activeMonthId}`),
        fetch(`/api/special-groups?month=${activeMonthId}`),
      ]);
      const empJson = await empRes.json();
      setRows(empJson.data ?? []);
      setTotal(empJson.total ?? 0);
      const deptJson = await deptRes.json();
      setDepts(Array.isArray(deptJson) ? deptJson : []);
      setGroups((await grpRes.json()).map((g: { code: string; name: string }) => ({ code: g.code, name: g.name })));
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [activeMonthId, limit]);

  useEffect(() => { load(); }, [load]);


  const deferredCol = useDeferredValue(col);

  // col.departmentName: '' = tất cả | '__EMPTY__' = chưa có PB | tên/code = tìm kiếm
  const filtered = useMemo(() => rows.filter(r => {
    const col = deferredCol;
    if (col.code && !r.code.toLowerCase().includes(col.code.toLowerCase())) return false;
    if (col.name && !r.name.toLowerCase().includes(col.name.toLowerCase())) return false;
    if (col.departmentName === '__EMPTY__') { if (r.departmentName) return false; }
    else if (col.departmentName) {
      const q = col.departmentName.toLowerCase();
      const match = (r.departmentName ?? '').toLowerCase().includes(q) ||
        (r.departmentCode ?? '').toLowerCase().includes(q) ||
        (r.maPb ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (col.specialGroup === '__EMPTY__') { if (r.specialGroupName || r.specialGroup) return false; }
    else if (col.specialGroup) {
      const q = col.specialGroup.toLowerCase();
      const match = (r.specialGroupName ?? '').toLowerCase().includes(q) ||
        (r.specialGroup ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (col.workdays && r.workdays !== col.workdays) return false;
    if (col.overtimeHours && r.overtimeHours !== col.overtimeHours) return false;
    if (col.lateMinutes && r.lateMinutes !== col.lateMinutes) return false;
    if (col.phepNam && r.phepNam !== col.phepNam) return false;
    if (col.groupCodeEndDate === '__EMPTY__') { if (formatDate(r.groupCodeEndDate)) return false; }
    else if (col.groupCodeEndDate && formatDate(r.groupCodeEndDate) !== col.groupCodeEndDate) return false;
    if (col.ngayNghi === '__EMPTY__') { if (formatDate(r.ngayNghiCuoiThangTruoc)) return false; }
    else if (col.ngayNghi && formatDate(r.ngayNghiCuoiThangTruoc) !== col.ngayNghi) return false;
    return true;
  }), [rows, deferredCol]);

  const clearFilters = () => setCol({ code: '', name: '', departmentName: '', specialGroup: '', groupCodeEndDate: '', ngayNghi: '', workdays: '', overtimeHours: '', lateMinutes: '', phepNam: '' });

  const uniqueWorkdays = useMemo(() => {
    const s = new Set(rows.map(r => r.workdays).filter(Boolean));
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [rows]);

  const uniqueOvertimeHours = useMemo(() => {
    const s = new Set(rows.map(r => r.overtimeHours).filter(Boolean));
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [rows]);

  const uniqueLateMinutes = useMemo(() => {
    const s = new Set(rows.map(r => r.lateMinutes).filter(Boolean));
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [rows]);

  const uniquePhepNam = useMemo(() => {
    const s = new Set(rows.map(r => r.phepNam).filter(Boolean));
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [rows]);

  const uniqueEndDates = useMemo(() => {
    const s = new Set(rows.map(r => formatDate(r.groupCodeEndDate)).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const uniqueNgayNghi = useMemo(() => {
    const s = new Set(rows.map(r => formatDate(r.ngayNghiCuoiThangTruoc)).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const va = String(a[sort.key] ?? '');
      const vb = String(b[sort.key] ?? '');
      const cmp = va.localeCompare(vb, 'vi', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  // ── Legend: unique day symbols ────────────────────
  const symbolToName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const lt of leaveTypes) {
      m[lt.code] = lt.name;
    }
    return m;
  }, [leaveTypes]);
  const usedSymbols = useMemo(() => {
    const s = new Set<string>();
    for (const r of sorted) {
      for (let i = 1; i <= daysInMonth; i++) {
        const v = (r as unknown as Record<string, unknown>)[`day_${i}`];
        if (v && String(v).trim()) s.add(String(v).trim());
      }
    }
    return [...s].filter(sym => SYM_TO_DT[sym] !== undefined).sort((a, b) => a.localeCompare(b));
  }, [sorted]);

  // ── Selection helpers ─────────────────────────────
  const allVisibleIds = useMemo(() => sorted.map(r => r.id), [sorted]);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
  const isIndeterminate = !isAllSelected && allVisibleIds.some(id => selectedIds.has(id));

  const toggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allVisibleIds));
  };
  const toggleRow = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Bulk export (client-side) ─────────────────────
  const exportSelected = async () => {
    const sel = sorted.filter(r => selectedIds.has(r.id));
    const XLSX = await import('xlsx');
    const header = ['employee_code', 'employee_name', 'department_code', 'department_name',
      'group_code', 'group_name', 'group_code_end_date', 'workdays',
      ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
      'overtime_hours', 'late_minutes', 'phep_nam', 'ngay_nghi_thang_truoc'];
    const data = sel.map(r => [
      r.code, r.name, r.departmentCode ?? '', r.departmentName ?? '',
      r.specialGroup, r.specialGroupName ?? '', r.groupCodeEndDate, r.workdays,
      ...Array.from({ length: 31 }, (_, i) => getDay(r, i)),
      r.overtimeHours, r.lateMinutes, r.phepNam, formatDate(r.ngayNghiCuoiThangTruoc),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 8 }, ...Array(31).fill({ wch: 5 }), { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DS_chon_loc');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `ds_nhan_vien_chon_loc_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Bulk update ───────────────────────────────────
  const doBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    const payload: Record<string, string> = {};
    if (bulkForm.departmentId !== '') { payload.departmentId = bulkForm.departmentId; payload.maPb = bulkForm.maPb; }
    if (bulkForm.specialGroup !== '') payload.specialGroup = bulkForm.specialGroup;
    if (bulkForm.groupCodeEndDate !== '') payload.groupCodeEndDate = bulkForm.groupCodeEndDate;
    if (Object.keys(payload).length === 0) return alert('Chưa chọn trường nào để cập nhật.');
    setBulkSaving(true);
    try {
      const res = await fetch('/api/employees/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds], ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowBulkEdit(false);
      setBulkForm({ departmentId: '', maPb: '', specialGroup: '', groupCodeEndDate: '' });
      setSelectedIds(new Set());
      await load();
    } catch (err) { alert('Lỗi: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setBulkSaving(false); }
  };

  const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (r: Employee) => {
    setForm({
      code: r.code, name: r.name, departmentId: r.departmentId,
      specialGroup: r.specialGroup, groupCodeEndDate: r.groupCodeEndDate,
      workdays: r.workdays, overtimeHours: r.overtimeHours,
      lateMinutes: r.lateMinutes, phepNam: r.phepNam,
      ngayNghiCuoiThangTruoc: r.ngayNghiCuoiThangTruoc,
      days: Array.from({ length: daysInMonth }, (_, i) => getDay(r, i)),
    });
    setEditId(r.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.code || !form.name) return;
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/employees/${editId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: `${activeMonthId}_${form.code}`, ...form, monthId: activeMonthId, createdAt: new Date().toISOString().slice(0, 10) }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      await load(); closeForm();
    } catch (err) { alert('Lỗi: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!deleteId) return; setSaving(true);
    await fetch(`/api/employees/${deleteId}`, { method: 'DELETE' });
    await load(); setSaving(false); setDeleteId(null);
  };

  const doClearAll = async () => {
    setSaving(true);
    try {
      await fetch(`/api/employees?month=${activeMonthId}`, { method: 'DELETE' });
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); setClearAll(false); }
  };

  const doRelink = async () => {
    setRelinking(true);
    try {
      const res = await fetch(`/api/employees/relink?month=${activeMonthId}`, { method: 'POST' });
      const data = await res.json();
      setRelinkResult(data);
      await load();
    } catch { /* ignore */ }
    finally { setRelinking(false); }
  };

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; prevMonth?: string; message?: string } | null>(null);
  const [syncConfirm, setSyncConfirm] = useState<{ prevMonthLabel: string; currentLabel: string } | null>(null);

  const doSyncPreview = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/employees/sync-nghi-thang-truoc?month=${activeMonthId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.found) { alert(`Không có dữ liệu tháng ${data.prevMonthLabel}`); return; }
      setSyncConfirm({ prevMonthLabel: data.prevMonthLabel2 || data.prevMonthLabel, currentLabel: data.currentLabel });
    } catch (err) { alert('Lỗi: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setSyncing(false); }
  };

  const doSyncConfirmed = async () => {
    setSyncConfirm(null);
    setSyncing(true);
    try {
      const res = await fetch('/api/employees/sync-nghi-thang-truoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId: activeMonthId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResult(data);
      await load();
    } catch (err) { alert('Lỗi: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setSyncing(false); }
  };
  const doImport = async (file: File, sheetName: string) => {
    setImporting(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('monthId', activeMonthId); fd.append('sheetName', sheetName);
      const res = await fetch('/api/employees/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ inserted: 0, skipped: 0, skippedCodes: [], errors: [data.error ?? 'Lỗi không xác định'], unmappedDept: [] });
        return;
      }
      setImportResult(data); await load();
    } catch (err) {
      setImportResult({ inserted: 0, skipped: 0, skippedCodes: [], errors: [err instanceof Error ? err.message : String(err)], unmappedDept: [] });
    } finally {
      setImporting(false);
      setShowSheetSelector(false);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
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
      setImportResult({ inserted: 0, skipped: 0, skippedCodes: [], errors: ['Lỗi đọc file: ' + (err instanceof Error ? err.message : String(err))], unmappedDept: [] });
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

  return (
    <div className={styles.page}>
      {/* Action bar */}
      <div className={s.actionBar}>
        <div className={s.actionBarLeft}>
          {error && <span className={s.errorChip}>⚠ {error}</span>}
          {hasFilter && !error && <button className={s.btnClearAll} onClick={clearFilters}>✕ Xóa lọc ({filtered.length}/{rows.length})</button>}
          {selectedIds.size > 0 && (
            <span className={styles.bulkCount}>✔ {selectedIds.size} đã chọn</span>
          )}
        </div>
        <div className={s.actionBarRight}>
          <button className={s.btnAction} onClick={() => window.open('/api/employees/import', '_blank')} title="Tải mẫu Excel"><IconDownload /><span>Tải Mẫu</span></button>
          <button className={`${s.btnAction} ${s.btnActionGreen}`} onClick={() => fileRef.current?.click()} disabled={importing || activeMonthLocked}>
            {importing ? <span className={s.spinning}><IconUpload /></span> : <IconUpload />}
            <span>{importing ? 'Đang import…' : 'Import Excel'}</span>
          </button>
          {/* Xuất Excel: nếu có chọn thì xuất chọn lọc, ngược lại xuất tất cả */}
          {selectedIds.size > 0 ? (
            <button className={`${s.btnAction} ${styles.btnExportAction}`} onClick={exportSelected} title="Xuất các dòng đã chọn">
              <IconDownload /><span>Xuất Excel ({selectedIds.size})</span>
            </button>
          ) : (
            <button className={`${s.btnAction} ${styles.btnExportAction}`}
              onClick={() => window.open(`/api/employees/export?month=${activeMonthId}`, '_blank')}
              disabled={loading || rows.length === 0} title="Xuất toàn bộ danh sách">
              <IconDownload /><span>Xuất Excel</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
          <div className={s.dividerV} />
          {selectedIds.size > 0 && (
            <>
              <button className={`${s.btnAction} ${styles.btnRelinkAction}`}
                onClick={() => { setBulkForm({ departmentId: '', maPb: '', specialGroup: '', groupCodeEndDate: '' }); setShowBulkEdit(true); }}
                disabled={activeMonthLocked}>
                ✏️ <span>Cập nhật</span>
              </button>
              <div className={s.dividerV} />
            </>
          )}
          <button className={`${s.btnAction} ${styles.btnRelinkAction}`} onClick={doSyncPreview} disabled={syncing || loading || activeMonthLocked} title="Đồng bộ ngày nghỉ cuối tháng trước vào cột NGHỈ THÁNG TRƯỚC">
            {syncing ? <span className={s.spinning}><IconRefresh /></span> : '🔄'}
            <span>{syncing ? 'Đang đồng bộ…' : 'Đồng bộ'}</span>
          </button>
          <div className={s.dividerV} />
          <button
            className={`${s.btnAction} ${styles.btnDangerAction}`}
            onClick={() => setClearAll(true)}
            disabled={loading || rows.length === 0 || activeMonthLocked}
            title="Xóa toàn bộ dữ liệu nhân viên"
          >
            🗑 <span>Xóa Tất Cả</span>
          </button>
           <div className={s.dividerV} />
           <button className={s.btnAction} onClick={load} disabled={loading}><span className={loading ? s.spinning : ''}><IconRefresh /></span></button>
        </div>
      </div>


      {/* ── Modal Cập nhật hàng loạt ── */}
      {showBulkEdit && (
        <div className={s.formOverlay} onClick={() => setShowBulkEdit(false)}>
          <div className={s.confirmModal} style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <h3 className={s.confirmTitle}>✏️ Cập nhật {selectedIds.size} nhân viên</h3>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 16 }}>
              Chỉ điền vào trường muốn thay đổi — trường để trống sẽ không bị cập nhật.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                Phòng Ban
                <select className={styles.deptFilterSelect} style={{ marginTop: 6, maxWidth: '100%' }}
                  value={bulkForm.departmentId}
                  onChange={e => { const d = depts.find(d => d.id === e.target.value); setBulkForm(f => ({ ...f, departmentId: e.target.value, maPb: d?.code ?? '' })); }}>
                  <option value="">(Giữ nguyên)</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                Nhóm Đặc Thù
                <select className={styles.deptFilterSelect} style={{ marginTop: 6, maxWidth: '100%' }}
                  value={bulkForm.specialGroup}
                  onChange={e => setBulkForm(f => ({ ...f, specialGroup: e.target.value }))}>
                  <option value="">(Giữ nguyên)</option>
                  {groups.map(g => <option key={g.code} value={g.code}>{g.code} – {g.name}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                Ngày KT Nhóm
                <input type="text" className={s.input} style={{ marginTop: 6 }}
                  placeholder="(Giữ nguyên)" value={bulkForm.groupCodeEndDate}
                  onChange={e => setBulkForm(f => ({ ...f, groupCodeEndDate: e.target.value }))} />
              </label>
            </div>
            <div className={s.confirmActions} style={{ marginTop: 24 }}>
              <button className={s.btnSecondary} onClick={() => setShowBulkEdit(false)}>Hủy</button>
              <button className={s.btnPrimary} onClick={doBulkUpdate} disabled={bulkSaving}>
                {bulkSaving ? 'Đang lưu…' : `Lưu ${selectedIds.size} dòng`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Xóa Tất Cả ── */}
      {clearAll && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon}>⚠️</div>
            <h3 className={s.confirmTitle}>Xóa toàn bộ nhân viên?</h3>
            <p className={s.confirmDesc}>
              Hành động này sẽ xóa <strong>tất cả nhân viên</strong> khỏi hệ thống.<br />
              Dữ liệu <strong>không thể khôi phục</strong>. Bạn có chắc chắn?
            </p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doClearAll} disabled={saving}>
                {saving ? 'Đang xóa…' : `🗑️ Xóa tất cả`}
              </button>
              <button className={s.btnSecondary} onClick={() => setClearAll(false)} disabled={saving}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className={s.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={s.formModal} style={{ maxWidth: 680 }}>
            <div className={s.formHeader}>
              <h2 className={s.formTitle}>{editId ? '✏️ Sửa nhân viên' : '➕ Thêm nhân viên'}</h2>
              <button className={s.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={s.form}>
              {/* Thông tin cơ bản */}
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Mã NV <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="NV001" required />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Tên Nhân Viên <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A" required />
                </div>
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Phòng Ban</label>
                  <select className={s.input} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                    <option value="">— Chọn phòng ban —</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.label}>Nhóm Đặc Thù</label>
                  <select className={s.input} value={form.specialGroup} onChange={e => setForm(f => ({ ...f, specialGroup: e.target.value }))}>
                    <option value="">— Không có —</option>
                    {groups.map(g => <option key={g.code} value={g.code}>{g.code} – {g.name}</option>)}
                  </select>
                </div>
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Ngày Kết Thúc Nhóm Đặc Thù</label>
                  <input className={s.input} value={form.groupCodeEndDate} onChange={e => setForm(f => ({ ...f, groupCodeEndDate: e.target.value }))} placeholder="DD/MM/YYYY" />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Ngày Công</label>
                  <input className={s.input} value={form.workdays} onChange={e => setForm(f => ({ ...f, workdays: e.target.value }))} placeholder="VD: 26" />
                </div>
              </div>
              {/* Ký hiệu chấm công */}
              <div className={s.field}>
                <label className={s.label}>Ký hiệu chấm công (1–{daysInMonth})</label>
                <div className={styles.dayGrid}>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <div key={i} className={styles.dayCell}>
                      <span className={styles.dayLabel}>{i + 1}</span>
                      <input
                        className={styles.dayInput}
                        maxLength={4}
                        value={form.days[i]}
                        onChange={e => setForm(f => {
                          const d = [...f.days]; d[i] = e.target.value; return { ...f, days: d };
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className={s.row2} style={{ marginTop: 8 }}>
                <div className={s.field}>
                  <label className={s.label}>Tăng Ca (giờ)</label>
                  <input className={s.input} value={form.overtimeHours} onChange={e => setForm(f => ({ ...f, overtimeHours: e.target.value }))} placeholder="0" />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Giờ Trễ (phút)</label>
                  <input className={s.input} value={form.lateMinutes} onChange={e => setForm(f => ({ ...f, lateMinutes: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className={s.row2} style={{ marginTop: 8 }}>
                <div className={s.field}>
                  <label className={s.label}>Phép Năm</label>
                  <input className={s.input} value={form.phepNam} onChange={e => setForm(f => ({ ...f, phepNam: e.target.value }))} placeholder="0" />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Nghỉ Tháng Trước</label>
                  <input className={s.input} value={form.ngayNghiCuoiThangTruoc} onChange={e => setForm(f => ({ ...f, ngayNghiCuoiThangTruoc: e.target.value }))} placeholder="DD/MM/YYYY" />
                </div>
              </div>
              <div className={s.formActions}>
                <button type="submit" className={s.btnPrimary} disabled={saving}>{saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm'}</button>
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
            <p className={s.confirmDesc}>Xóa nhân viên <strong>{rows.find(r => r.id === deleteId)?.name}</strong>?</p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDelete} disabled={saving}>{saving ? 'Đang xóa…' : '🗑️ Xóa'}</button>
              <button className={s.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Relink result */}
      {relinkResult && (
        <div className={s.formOverlay} onClick={() => setRelinkResult(null)}>
          <div className={s.confirmModal} style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon}>{relinkResult.linked > 0 ? '🔗' : 'ℹ️'}</div>
            <h3 className={s.confirmTitle}>Kết quả Liên kết PB</h3>
            <div style={{ textAlign: 'left', fontSize: 13.5, lineHeight: 1.9, marginBottom: 20 }}>
              <p>🔍 Đã kiểm tra: <strong>{relinkResult.totalChecked}</strong> nhân viên chưa có PB</p>
              <p>✅ Liên kết thành công: <strong>{relinkResult.linked}</strong></p>
              {relinkResult.notFound.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ color: 'var(--gray-500)', fontWeight: 600 }}>
                    ⚠ Mã PB chưa có trong hệ thống ({relinkResult.notFound.length}):
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--gray-400)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {relinkResult.notFound.join(', ')}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>
                    → Vui lòng thêm các Mã PB này vào <strong>Phân hệ Phòng Ban</strong> rồi chạy lại.
                  </p>
                </div>
              )}
            </div>
            <div className={s.confirmActions}>
              <button className={s.btnPrimary} onClick={() => setRelinkResult(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Sync confirm */}
      {syncConfirm && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal} style={{ maxWidth: 400 }}>
            <div className={s.confirmIcon}>🔄</div>
            <h3 className={s.confirmTitle}>Xác nhận đồng bộ</h3>
            <p className={s.confirmDesc}>
              Đồng bộ dữ liệu <strong>ngày nghỉ cuối tháng</strong> từ<br />
              <strong>{syncConfirm.prevMonthLabel}</strong> → <strong>{syncConfirm.currentLabel}</strong>
            </p>
            <p className={s.confirmDesc} style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              Cột "NGHỈ THÁNG TRƯỚC" của các nhân viên có mã khớp sẽ bị ghi đè.
            </p>
            <div className={s.confirmActions}>
              <button className={s.btnPrimary} onClick={doSyncConfirmed}>✅ Đồng bộ</button>
              <button className={s.btnSecondary} onClick={() => setSyncConfirm(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className={s.formOverlay} onClick={() => setSyncResult(null)}>
          <div className={s.confirmModal} style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon}>{syncResult.synced > 0 ? '🔄' : 'ℹ️'}</div>
            <h3 className={s.confirmTitle}>Kết quả Đồng bộ</h3>
            <div style={{ textAlign: 'left', fontSize: 13.5, lineHeight: 1.9, marginBottom: 20 }}>
              {syncResult.message
                ? <p style={{ color: 'var(--gray-500)' }}>⚠ {syncResult.message}</p>
                : <>
                  <p>📅 Tháng nguồn: <strong>{syncResult.prevMonth}</strong></p>
                  <p>✅ Đã cập nhật: <strong>{syncResult.synced}</strong> nhân viên</p>
                </>
              }
            </div>
            <div className={s.confirmActions}>
              <button className={s.btnPrimary} onClick={() => setSyncResult(null)}>Đóng</button>
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

      {/* Import result */}
      {importResult && (
        <div className={s.formOverlay} onClick={() => setImportResult(null)}>
          <div className={s.confirmModal} style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className={s.confirmIcon}>
              {importResult.errors.length > 0 ? '⚠️' : importResult.unmappedDept?.length > 0 ? '🔔' : '✅'}
            </div>
            <h3 className={s.confirmTitle}>Kết quả Import</h3>
            <div style={{ textAlign: 'left', fontSize: 13.5, lineHeight: 1.8, marginBottom: 12 }}>
              <p>✅ Đã thêm: <strong>{importResult.inserted}</strong> nhân viên</p>
              <p>⏭ Bỏ qua (trùng mã): <strong>{importResult.skipped}</strong>
                {importResult.skippedCodes?.length > 0 && <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 6 }}>({importResult.skippedCodes.join(', ')})</span>}
              </p>
              {importResult.errors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ color: 'var(--danger)', fontWeight: 600 }}>❌ Lỗi:</p>
                  <ul style={{ paddingLeft: 16, color: 'var(--danger)', fontSize: 12 }}>
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Cảnh báo NV chưa rõ phòng ban ── */}
            {importResult.unmappedDept?.length > 0 && (
              <div style={{ marginTop: 4, marginBottom: 16 }}>
                <div style={{
                  background: '#fff7ed', border: '1px solid #fed7aa',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 10,
                }}>
                  <p style={{ fontWeight: 600, color: '#c2410c', fontSize: 13, marginBottom: 4 }}>
                    ⚠️ {importResult.unmappedDept.length} nhân viên chưa xác định được Phòng Ban
                  </p>
                  <p style={{ fontSize: 12, color: '#9a3412' }}>
                    Mã phòng ban trong file không khớp với danh sách Phòng Ban trong hệ thống.
                    Dữ liệu vẫn được import — vui lòng bổ sung phòng ban và liên kết lại sau.
                  </p>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 6 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: 600, color: 'var(--gray-600)' }}>Mã NV</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: 600, color: 'var(--gray-600)' }}>Tên Nhân Viên</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: 600, color: '#c2410c' }}>Mã PB (chưa tồn tại)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.unmappedDept.map((e, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--gray-100)', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{e.code}</td>
                          <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--gray-100)' }}>{e.name}</td>
                          <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--gray-100)', fontFamily: 'monospace', color: '#c2410c', fontWeight: 700 }}>{e.deptCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={s.confirmActions}>
              <button className={s.btnPrimary} onClick={() => setImportResult(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bảng cuộn ngang ── */}
      {!error && (
        <div className={styles.limitRow}>
          <LimitSelector total={total} shown={rows.length} limit={limit} onLimit={loadWithLimit} />
        </div>
      )}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={s.loadingState}><span className={s.spinner} /><span>Đang tải…</span></div>
        ) : (
          <div className={styles.tableBody}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                {/* Header row */}
                <tr className={styles.headRow}>
                  <th className={`${styles.th} ${styles.thCheck}`}>
                    <input type="checkbox" className={styles.checkInput}
                      checked={isAllSelected}
                      ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                      onChange={toggleAll}
                      title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    />
                  </th>
                  <th className={`${styles.th} ${styles.thStt}  ${styles.s0}`}>#</th>
                  <SortTh label="MÃ NV" sortKey="code" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thCode} ${styles.s1}`} />
                  <SortTh label="TÊN NHÂN VIÊN" sortKey="name" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thName} ${styles.s2}`} />
                  <SortTh label="PHÒNG BAN" sortKey="departmentName" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thDept}`} />
                  <SortTh label="NHÓM ĐẶC THÙ" sortKey="specialGroupName" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thGroup}`} />
                  <SortTh label="NGÀY KẾT THÚC" sortKey="groupCodeEndDate" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thCenter}`} />
                  <SortTh label="NGÀY CÔNG" sortKey="workdays" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thCenter}`} />
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i} className={`${styles.th} ${styles.thDay}`}>{i + 1}</th>
                  ))}
                  <SortTh label="TĂNG CA(H)" sortKey="overtimeHours" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thCenter}`} />
                  <SortTh label="GIỜ TRỄ (PH)" sortKey="lateMinutes" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thCenter}`} />
                  <SortTh label="PHÉP NĂM" sortKey="phepNam" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thCenter}`} />
                  <SortTh label="NGHỈ T. TRƯỚC" sortKey="ngayNghiCuoiThangTruoc" current={sort} onSort={toggleSort} className={`${styles.th} ${styles.thCenter}`} />
                  <th className={`${styles.th} ${styles.thAction}`}>THAO TÁC</th>
                </tr>
                {/* Filter row */}
                <tr className={styles.filterRow}>
                  <th className={styles.thCheck} />
                  <th className={styles.s0} />
                  <th className={styles.s1}><ColFilter value={col.code} placeholder="Mã…" onChange={setF('code')} /></th>
                  <th className={styles.s2}><ColFilter value={col.name} placeholder="Tên…" onChange={setF('name')} /></th>
                  <th>
                    <select
                      className={styles.deptFilterSelect}
                      value={col.departmentName}
                      onChange={e => setCol(p => ({ ...p, departmentName: e.target.value }))}
                    >
                      <option value="">Tất cả</option>
                      <option value="__EMPTY__">⚠️ Chưa có PB</option>
                      {depts.map(d => (
                        <option key={d.id} value={d.name}>{d.code} – {d.name}</option>
                      ))}
                    </select>
                  </th>
                  <th>
                    <select
                      className={styles.deptFilterSelect}
                      value={col.specialGroup}
                      onChange={e => setCol(p => ({ ...p, specialGroup: e.target.value }))}
                    >
                      <option value="">Tất cả</option>
                      {groups.map(g => (
                        <option key={g.code} value={g.name}>{g.code} – {g.name}</option>
                      ))}
                    </select>
                  </th>
                  <th><select className={styles.deptFilterSelect} value={col.groupCodeEndDate} onChange={e => setCol(p => ({ ...p, groupCodeEndDate: e.target.value }))}><option value="">Tất cả</option><option value="__EMPTY__">⚠️ Ngày trống</option>{uniqueEndDates.map(d => <option key={d} value={d}>{d}</option>)}</select></th><th><select className={styles.deptFilterSelect} value={col.workdays} onChange={e => setCol(p => ({ ...p, workdays: e.target.value }))}><option value="">Tất cả</option>{uniqueWorkdays.map(d => <option key={d} value={d}>{d}</option>)}</select></th>{Array.from({ length: daysInMonth }, (_, i) => <th key={i} />)}<th><select className={styles.deptFilterSelect} value={col.overtimeHours} onChange={e => setCol(p => ({ ...p, overtimeHours: e.target.value }))}><option value="">Tất cả</option>{uniqueOvertimeHours.map(d => <option key={d} value={d}>{d}</option>)}</select></th><th><select className={styles.deptFilterSelect} value={col.lateMinutes} onChange={e => setCol(p => ({ ...p, lateMinutes: e.target.value }))}><option value="">Tất cả</option>{uniqueLateMinutes.map(d => <option key={d} value={d}>{d}</option>)}</select></th><th><select className={styles.deptFilterSelect} value={col.phepNam} onChange={e => setCol(p => ({ ...p, phepNam: e.target.value }))}><option value="">Tất cả</option>{uniquePhepNam.map(d => <option key={d} value={d}>{d}</option>)}</select></th><th><select className={styles.deptFilterSelect} value={col.ngayNghi} onChange={e => setCol(p => ({ ...p, ngayNghi: e.target.value }))}><option value="">Tất cả</option><option value="__EMPTY__">⚠️ Ngày trống</option>{uniqueNgayNghi.map(d => <option key={d} value={d}>{d}</option>)}</select></th><th />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={daysInMonth + 12} className={styles.noResult}>
                    {rows.length === 0 ? 'Chưa có nhân viên. Nhấn Thêm Mới hoặc Import Excel.' : 'Không tìm thấy.'}
                    {hasFilter && <button className={s.linkBtn} onClick={clearFilters}> Xóa bộ lọc</button>}
                  </td></tr>
                ) : sorted.map((r, i) => (
                  <tr key={r.id} className={`${i % 2 === 0 ? styles.rowEven : styles.rowOdd} ${selectedIds.has(r.id) ? styles.rowSelected : ''}`}>
                    <td className={`${styles.td} ${styles.thCheck}`}>
                      <input type="checkbox" className={styles.checkInput}
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                      />
                    </td>
                    <td className={`${styles.td} ${styles.tdStt} ${styles.s0}`}>{i + 1}</td>
                    <td className={`${styles.td} ${styles.tdCode} ${styles.s1}`}>{r.code}</td>
                    <td className={`${styles.td} ${styles.tdName} ${styles.s2}`}>{r.name}</td>
                    <td className={`${styles.td} ${r.departmentName ? '' : styles.tdNoDept}`}>
                      {r.departmentName || ''}
                    </td>
                    <td className={styles.td}>{r.specialGroupName || ''}</td>
                    <td className={`${styles.td} ${styles.tdMono}`}>
                      {r.groupCodeEndDate || <span className={s.noNote}>—</span>}
                    </td>
                    {(() => {
                      const n = numVal(r.workdays); const warn = !isNaN(n) && n <= 0; return (
                        <td className={`${styles.td} ${styles.tdNum} ${warn ? styles.tdWarnVal : ''}`}>
                          {r.workdays || <span className={s.noNote}>—</span>}
                        </td>);
                    })()}
                    {Array.from({ length: daysInMonth }, (_, j) => {
                      const val = getDay(r, j);
                      const dt = val ? (SYM_TO_DT[val] ?? -1) : -1;
                      const bg = dt >= 0 ? (DT_CELL_BG[dt] ?? '#fff') : '#fff';
                      const clr = dt >= 0 ? (DT_TEXT[dt] ?? '#9ca3af') : '#9ca3af';
                      const isDragSrc = dragSrc?.code === r.code && dragSrc?.day === j + 1;
                      const isDragOver = dragOver?.code === r.code && dragOver?.day === j + 1;
                      return (
                        <td key={j} className={`${styles.td} ${styles.tdDay}`}
                          style={{
                            background: bg,
                            color: clr,
                            fontWeight: val ? 700 : 400,
                            cursor: activeMonthLocked ? 'default' : (val ? 'grab' : 'default'),
                            opacity: isDragSrc ? 0.4 : 1,
                            outline: isDragOver ? '2px solid #1d4ed8' : undefined,
                            outlineOffset: isDragOver ? -1 : undefined,
                          }}
                          onContextMenu={e => handleCellRightClick(r.code, j + 1, val, e)}
                          draggable={!activeMonthLocked && !!val}
                          onDragStart={() => { if (!activeMonthLocked && val) setDragSrc({ code: r.code, day: j + 1 }); }}
                          onDragOver={e => { if (activeMonthLocked) return; e.preventDefault(); setDragOver({ code: r.code, day: j + 1 }); }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={() => handleDrop(r.code, j + 1)}
                          onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                        >
                          {val || <span className={styles.dot}>·</span>}
                        </td>
                      );
                    })}
                    {(() => {
                      const n = numVal(r.overtimeHours); const warn = !isNaN(n) && n < 0; return (
                        <td className={`${styles.td} ${styles.tdNum} ${warn ? styles.tdWarnVal : ''}`}>
                          {isNaN(n) ? (r.overtimeHours || '') : n > 0 ? <span className={styles.otTag}>{n.toFixed(2)}h</span> : ''}
                        </td>);
                    })()}
                    {(() => {
                      const n = numVal(r.lateMinutes); const warn = !isNaN(n) && n < 0; return (
                        <td className={`${styles.td} ${styles.tdNum} ${warn ? styles.tdWarnVal : ''}`}>
                          {isNaN(n) ? (r.lateMinutes || '') : n > 0 ? <span className={styles.lateTag}>{n.toFixed(2)}ph</span> : ''}
                        </td>);
                    })()}
                    <td className={`${styles.td} ${styles.tdNum}`}>{r.phepNam || '—'}</td>
                    <td className={`${styles.td} ${styles.tdNum} ${r.ngayNghiCuoiThangTruoc ? styles.tdNghiCTT : ''}`}>
                      {formatDate(r.ngayNghiCuoiThangTruoc) || <span className={s.noNote}>—</span>}
                    </td>
                    <td className={`${styles.td} ${styles.tdAction}`}>
                      <div className={styles.actions}>
                        <button className={s.btnIconEdit} onClick={() => openEdit(r)} title="Sửa" disabled={activeMonthLocked}><IconEdit /></button>
                        <button className={s.btnIconDelete} onClick={() => setDeleteId(r.id)} title="Xóa" disabled={activeMonthLocked}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usedSymbols.length > 0 && (
            <div className={styles.legend}>
              {usedSymbols.map(sym => {
                const dt = SYM_TO_DT[sym] ?? -1;
                const bg = dt >= 0 ? DT_CELL_BG[dt] : '#fff';
                const clr = dt >= 0 ? DT_TEXT[dt] : '#9ca3af';
                return (
                  <span key={sym} className={styles.legendItem}>
                    <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: bg, color: clr, fontWeight: 700, fontSize: '0.72rem', marginRight: 3, border: `1px solid ${clr}30` }}>{sym}</span>
                    {symbolToName[sym] ?? sym}
                  </span>
                );
              })}
            </div>
          )}
          {edits.size > 0 && (
            <div className={styles.editBar}>
              <span className={styles.editBarInfo}>✏️ <span className={styles.editBarCount}>{edits.size}</span> thay đổi</span>
              <button className={`${styles.editBarBtn} ${styles.editBarBtnUndo}`} onClick={() => setEdits(new Map())} disabled={activeMonthLocked} type="button">↩ Hoàn tác</button>
              <button className={`${styles.editBarBtn} ${styles.editBarBtnSave}`} onClick={handleSaveEdits} disabled={saving || activeMonthLocked} type="button">{saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}</button>
            </div>
          )}
          </div>
        )}

      {picker && (
        <DayTypePicker
          currentDT={picker.currentDT}
          x={picker.x} y={picker.y}
          onPick={handlePick}
          onClose={() => setPicker(null)}
          leaveTypes={leaveTypes}
        />
      )}
      </div>
    </div>
  );
}

function DayTypePicker({ currentDT, x, y, onPick, onClose, leaveTypes }: {
  currentDT: number | null; x: number; y: number;
  onPick: (dt: number | null) => void; onClose: () => void;
  leaveTypes: { code: string; name: string; dayType: number }[];
}) {
  const left = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : x);
  const top = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 160 : y);
  return (
    <>
      <div className={styles.dayPickerOverlay} onClick={onClose} />
      <div className={styles.dayPicker} style={{ left, top }}>
        <button
          className={`${styles.dayPickerBtn} ${currentDT === null ? styles.dayPickerBtnActive : ''}`}
          onClick={() => onPick(null)}
          type="button"
          style={{ gridColumn: '1 / -1', color: '#6b7280', background: '#f3f4f6' }}
        >
          ✕ Trống
        </button>
        {(Array.isArray(leaveTypes) ? leaveTypes : []).map(lt => {
          const dt = lt.dayType >= 0 ? lt.dayType : (SYM_TO_DT[lt.code] ?? -1);
          if (dt < 0) return null;
          const sym = DT_SYMBOL[dt] ?? lt.code;
          const isActive = dt === currentDT;
          return (
            <button key={lt.code}
              className={`${styles.dayPickerBtn} ${isActive ? styles.dayPickerBtnActive : ''}`}
              style={{ color: DT_TEXT[dt] ?? '#374151', background: DT_CELL_BG[dt] ?? '#f9fafb' }}
              onClick={() => onPick(dt)}
              type="button"
            >
              <span>{sym}</span>
              <span className={styles.dayPickerLabel}>{lt.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
