'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import s from '@/styles/table.module.css';
import { IconEdit, IconDelete, IconSearch, IconClearX, IconPlus, IconRefresh } from '@/lib/icons';
import { useApp } from '@/context/AppContext';


/* ── Extra icons ─────────────────────────────── */
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

interface Dept {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  active: boolean;
  note: string;
  createdAt: string;
}
type Filters = { code: string; name: string; parentName: string; active: '' | 'true' | 'false'; note: string };
type SortKey = 'code' | 'name' | 'parentName' | 'active' | 'note';
type SortDir = 'asc' | 'desc';
const BLANK = { code: '', name: '', parentId: '', note: '' };

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
        <span className={s.sortIcon}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

export default function Departments() {
  const { activeMonthId, activeMonthLocked } = useApp();
  const [rows, setRows] = useState<Dept[]>([]);;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [col, setCol] = useState<Filters>({ code: '', name: '', parentName: '', active: '', note: '' });
  const setF = (k: keyof Filters) => (v: string) => setCol(p => ({ ...p, [k]: v }));
  const hasFilter = Object.values(col).some(v => v !== '');

  /* ── Sort ─────────────────────────────────────── */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir('asc'); } // reset
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRows(await (await fetch(`/api/departments?month=${activeMonthId}`)).json()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [activeMonthId]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const base = rows.filter(r =>
      (!col.code || r.code.toLowerCase().includes(col.code.toLowerCase())) &&
      (!col.name || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
      (!col.parentName || (r.parentName ?? '').toLowerCase().includes(col.parentName.toLowerCase())) &&
      (col.active === '' || (col.active === 'true' ? r.active : !r.active)) &&
      (!col.note || r.note.toLowerCase().includes(col.note.toLowerCase()))
    );
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      let va: string, vb: string;
      if (sortKey === 'active') { va = a.active ? '1' : '0'; vb = b.active ? '1' : '0'; }
      else if (sortKey === 'parentName') { va = (a.parentName ?? '').toLowerCase(); vb = (b.parentName ?? '').toLowerCase(); }
      else { va = String(a[sortKey] ?? '').toLowerCase(); vb = String(b[sortKey] ?? '').toLowerCase(); }
      return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
    });
  }, [rows, col, sortKey, sortDir]);

  const clearFilters = () => setCol({ code: '', name: '', parentName: '', active: '', note: '' });
  const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (r: Dept) => {
    setForm({ code: r.code, name: r.name, parentId: r.parentId ?? '', note: r.note });
    setEditId(r.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.code || !form.name) return;
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/departments/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: form.code, name: form.name, parentId: form.parentId || null, note: form.note }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: Date.now().toString(),
            code: form.code,
            name: form.name,
            parentId: form.parentId || null,
            note: form.note,
            monthId: activeMonthId,
            createdAt: new Date().toISOString().slice(0, 10),
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      await load(); closeForm();
    } catch (err) { alert('Lỗi: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setSaving(false); }
  };


  const doDelete = async () => {
    if (!deleteId) return; setSaving(true);
    await fetch(`/api/departments/${deleteId}`, { method: 'DELETE' });
    await load(); setSaving(false); setDeleteId(null);
  };

  const doDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch(`/api/departments/clear`, {
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
    window.open('/api/departments/import', '_blank');
  };

  /* ── Import Excel ───────────────────────────── */
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; skippedCodes: string[]; errors: string[] } | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Đọc file để kiểm tra số sheet
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      if (workbook.SheetNames.length > 1) {
        // Có nhiều sheet → hiển thị popup chọn
        setAvailableSheets(workbook.SheetNames);
        setSelectedSheet(workbook.SheetNames[0]); // Chọn sheet đầu tiên mặc định
        setPendingFile(file);
        setShowSheetSelector(true);
      } else {
        // Chỉ có 1 sheet → import trực tiếp
        await doImport(file, workbook.SheetNames[0]);
      }
    } catch (err) {
      alert('Lỗi đọc file: ' + (err instanceof Error ? err.message : String(err)));
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doImport = async (file: File, sheetName: string) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('monthId', activeMonthId);
      fd.append('sheetName', sheetName);
      const res = await fetch('/api/departments/import', { method: 'POST', body: fd });
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

  /* Danh sách phòng ban có thể chọn làm cấp trên (loại trừ chính nó) */
  const parentOptions = rows.filter(r => r.id !== editId);

  return (
    <div className={s.page}>
      <div className={s.actionBar}>
        <div className={s.actionBarLeft}>
          {error && <span className={s.errorChip}>⚠ {error}</span>}
          {hasFilter && !error && <button className={s.btnClearAll} onClick={clearFilters}>✕ Xóa bộ lọc ({filtered.length}/{rows.length})</button>}
        </div>
        <div className={s.actionBarRight}>
          <button className={`${s.btnAction} ${s.btnActionPrimary}`} onClick={openCreate} disabled={loading || activeMonthLocked}><IconPlus /><span>Thêm Mới</span></button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={downloadTemplate} title="Tải file Excel mẫu để nhập liệu">
            <IconDownload /><span>Tải Mẫu</span>
          </button>
          <a
            className={s.btnAction}
            href={`/api/departments/export?month=${activeMonthId}`}
            download
            title="Xuất dữ liệu phòng ban ra Excel"
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
            title="Xóa tất cả phòng ban"
          >
            <IconDelete /><span>Xóa Tất Cả</span>
          </button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={load} disabled={loading}><span className={loading ? s.spinning : ''}><IconRefresh /></span></button>
        </div>
      </div>

      {showForm && (
        <div className={s.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={s.formModal}>
            <div className={s.formHeader}>
              <h2 className={s.formTitle}>{editId ? '✏️ Sửa phòng ban' : '➕ Thêm phòng ban'}</h2>
              <button className={s.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={s.form}>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Mã phòng ban <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: KD" required />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Tên phòng ban <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Kinh Doanh" required />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Phòng ban cấp trên</label>
                <select
                  className={s.input}
                  value={form.parentId}
                  onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                >
                  <option value="">— Không có (phòng ban gốc) —</option>
                  {parentOptions.map(r => (
                    <option key={r.id} value={r.id}>{r.code} – {r.name}</option>
                  ))}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Ghi chú</label>
                <textarea className={s.textarea} rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className={s.formActions}>
                <button type="submit" className={s.btnPrimary} disabled={saving}>{saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm'}</button>
                <button type="button" className={s.btnSecondary} onClick={closeForm}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon}>🗑️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa</h3>
            <p className={s.confirmDesc}>Xóa phòng ban <strong>{rows.find(r => r.id === deleteId)?.name}</strong>?<br />Hành động này không thể hoàn tác.</p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDelete} disabled={saving}>{saving ? 'Đang xóa…' : '🗑️ Xóa'}</button>
              <button className={s.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAll && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa tất cả</h3>
            <p className={s.confirmDesc}>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ {rows.length} phòng ban</strong>?<br />
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
              <p>✅ Đã thêm: <strong>{importResult.inserted}</strong> phòng ban</p>
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

      <div className={s.tableCard}>
        {loading ? (
          <div className={s.loadingState}><span className={s.spinner} /><span>Đang tải dữ liệu…</span></div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr className={s.headRow}>
                <th className={s.thStt}>#</th>
                <SortTh label="Mã PB"         sortKey="code" current={sortKey} dir={sortDir} onSort={handleSort} className={s.thCode} />
                <SortTh label="Tên Phòng Ban" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Ghi Chú"       sortKey="note" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className={s.thAction}>Thao Tác</th>
              </tr>
              <tr className={s.filterRow}>
                <th />
                <th><ColFilter value={col.code} placeholder="Tìm mã…" onChange={setF('code')} /></th>
                <th><ColFilter value={col.name} placeholder="Tìm tên…" onChange={setF('name')} /></th>
                <th><ColFilter value={col.note} placeholder="Ghi chú…" onChange={setF('note')} /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className={s.noResult}>Không có kết quả. <button className={s.linkBtn} onClick={clearFilters}>Xóa bộ lọc</button></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.55 }}>
                  <td className={s.tdStt}>{i + 1}</td>
                  <td><span className={s.codeBadge}>{r.code}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td className={s.noteCell}>{r.note || <span className={s.noNote}>—</span>}</td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.btnIconEdit} onClick={() => openEdit(r)} title="Chỉnh sửa" disabled={activeMonthLocked}><IconEdit /></button>
                      <button className={s.btnIconDelete} onClick={() => setDeleteId(r.id)} title="Xóa" disabled={activeMonthLocked}><IconDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
