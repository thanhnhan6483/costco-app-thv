'use client';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import s from '@/styles/table.module.css';
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


interface SpecialGroup {
  id: string;
  code: string;
  name: string;
  workHours: number;
  note: string;
  createdAt: string;
}
type Filters = { code: string; name: string; note: string };
type SortKey = 'code' | 'name' | 'workHours' | 'note';
type SortDir = 'asc' | 'desc';
const BLANK = { code: '', name: '', workHours: 8, note: '' };

function ColFilter({ value, placeholder, onChange }: {
  value: string; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div className={s.colFilter}>
      <span className={s.colFilterIcon}><IconSearch /></span>
      <input className={s.colFilterInput} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
      {value && <button className={s.colFilterClear} onClick={() => onChange('')} type="button"><IconClearX /></button>}
    </div>
  );
}

function SortTh({ label, sortKey, current, dir, onSort, className }: {
  label: string; sortKey: SortKey; current: SortKey | null;
  dir: SortDir; onSort: (k: SortKey) => void; className?: string;
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

export default function SpecialGroups() {
  const { activeMonthId, activeMonthLocked } = useApp();
  const [rows, setRows] = useState<SpecialGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [col, setCol] = useState<Filters>({ code: '', name: '', note: '' });
  const setF = (k: keyof Filters) => (v: string) => setCol(p => ({ ...p, [k]: v }));
  const hasFilter = Object.values(col).some(v => v !== '');

  /* ── Sort ── */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const handleSort = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir('asc'); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await (await fetch(`/api/special-groups?month=${activeMonthId}`)).json()); }
    finally { setLoading(false); }
  }, [activeMonthId]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const base = rows.filter(r =>
      (!col.code || r.code.toLowerCase().includes(col.code.toLowerCase())) &&
      (!col.name || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
      (!col.note || r.note.toLowerCase().includes(col.note.toLowerCase()))
    );
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      if (sortKey === 'workHours') {
        return sortDir === 'asc' ? a.workHours - b.workHours : b.workHours - a.workHours;
      }
      const va = String(a[sortKey] ?? '').toLowerCase();
      const vb = String(b[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
    });
  }, [rows, col, sortKey, sortDir]);

  const clearFilters = () => setCol({ code: '', name: '', note: '' });

  const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (r: SpecialGroup) => {
    setForm({ code: r.code, name: r.name, workHours: r.workHours ?? 8, note: r.note });
    setEditId(r.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/special-groups/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: form.code, name: form.name, workHours: form.workHours, note: form.note }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/special-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: Date.now().toString(), ...form,
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
    await fetch(`/api/special-groups/${deleteId}`, { method: 'DELETE' });
    await load(); setSaving(false); setDeleteId(null);
  };

  const doDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch(`/api/special-groups/clear`, {
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; skippedCodes: string[]; errors: string[] } | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const downloadTemplate = () => window.open('/api/special-groups/import', '_blank');

  const doImport = async (file: File, sheetName: string) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('monthId', activeMonthId);
      fd.append('sheetName', sheetName);
      const res = await fetch('/api/special-groups/import', { method: 'POST', body: fd });
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

  /* Badge màu giờ làm */
  const hoursBadge = (h: number) => {
    if (h < 4) return { bg: '#fef3c7', color: '#92400e' };
    if (h < 8) return { bg: '#dbeafe', color: '#1e40af' };
    if (h === 8) return { bg: '#d1fae5', color: '#065f46' };
    return { bg: '#ede9fe', color: '#5b21b6' };
  };

  return (
    <div className={s.page}>
      <div className={s.actionBar}>
        <div className={s.actionBarLeft}>
          {hasFilter && <button className={s.btnClearAll} onClick={clearFilters}>✕ Xóa bộ lọc ({filtered.length}/{rows.length})</button>}
        </div>
        <div className={s.actionBarRight}>
          <button className={`${s.btnAction} ${s.btnActionPrimary}`} onClick={openCreate} disabled={loading || activeMonthLocked}><IconPlus /><span>Thêm Mới</span></button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={downloadTemplate} title="Tải file Excel mẫu">
            <IconDownload /><span>Tải Mẫu</span>
          </button>
          <a
            className={s.btnAction}
            href={`/api/special-groups/export?month=${activeMonthId}`}
            download
            title="Xuất dữ liệu nhóm đặc thù ra Excel"
            style={{ color: '#0f766e' }}
          >
            <IconDownload /><span>Xuất Excel</span>
          </a>
          <button className={`${s.btnAction} ${s.btnActionGreen}`} onClick={() => fileRef.current?.click()} disabled={importing} title="Import từ file Excel">
            {importing ? <span className={s.spinning}><IconUpload /></span> : <IconUpload />}
            <span>{importing ? 'Đang import…' : 'Import Excel'}</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
          <button
            className={s.btnAction}
            onClick={() => setShowDeleteAll(true)}
            disabled={loading || activeMonthLocked || rows.length === 0}
            style={{ color: '#dc2626' }}
            title="Xóa tất cả nhóm đặc thù"
          >
            <IconDelete /><span>Xóa Tất Cả</span>
          </button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={load} disabled={loading}><span className={loading ? s.spinning : ''}><IconRefresh /></span></button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className={s.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={s.formModal}>
            <div className={s.formHeader}>
              <h2 className={s.formTitle}>{editId ? '✏️ Sửa nhóm đặc thù' : '➕ Thêm nhóm đặc thù'}</h2>
              <button className={s.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={s.form}>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Mã nhóm <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="VD: PREG, LD" required />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Tên nhóm <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="VD: Thai sản, Khuyết tật" required />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>
                  Giờ làm việc / ngày <span className={s.required}>*</span>
                  <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8, fontSize: 12 }}>
                    (tiêu chuẩn thông thường là 8 giờ)
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <input
                    type="number" min={0.5} max={24} step={0.5}
                    className={s.input}
                    style={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', flex: 1 }}
                    value={form.workHours}
                    onChange={e => setForm(f => ({ ...f, workHours: Number(e.target.value) }))}
                    required
                  />
                  <span style={{
                    display: 'flex', alignItems: 'center', padding: '0 14px',
                    height: 38, background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                    borderLeft: 'none', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    fontSize: 13, color: 'var(--gray-500)', whiteSpace: 'nowrap',
                  }}>giờ / ngày</span>
                </div>
                <span className={s.fieldHint}>Nhập 0.5 đến 24 (bước 0.5 giờ)</span>
              </div>
              <div className={s.field}>
                <label className={s.label}>Ghi chú</label>
                <textarea className={s.textarea} rows={2} value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Mô tả thêm về nhóm đặc thù…" />
              </div>
              <div className={s.formActions}>
                <button type="submit" className={s.btnPrimary} disabled={saving}>
                  {saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm'}
                </button>
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
            <p className={s.confirmDesc}>Xóa nhóm <strong>{rows.find(r => r.id === deleteId)?.name}</strong>?</p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDelete} disabled={saving}>🗑️ Xóa</button>
              <button className={s.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All confirm */}
      {showDeleteAll && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa tất cả</h3>
            <p className={s.confirmDesc}>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ {rows.length} nhóm đặc thù</strong>?<br />
              <span style={{ color: 'var(--danger)', fontSize: 13 }}>⚠️ Hành động này không thể hoàn tác!</span>
            </p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDeleteAll} disabled={deletingAll}>
                {deletingAll ? 'Đang xóa…' : '🗑️ Xóa Tất Cả'}
              </button>
              <button className={s.btnSecondary} onClick={() => setShowDeleteAll(false)} disabled={deletingAll}>Hủy</button>
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
              <p>✅ Đã thêm: <strong>{importResult.inserted}</strong> nhóm đặc thù</p>
              <p>⏭ Bỏ qua: <strong>{importResult.skipped}</strong>
                {importResult.skippedCodes?.length > 0 &&
                  <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 6 }}>({importResult.skippedCodes.join(', ')})</span>}
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
          <div className={s.loadingState}><span className={s.spinner} /><span>Đang tải…</span></div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr className={s.headRow}>
                <th className={s.thStt}>#</th>
                <SortTh label="Mã Nhóm"       sortKey="code"      current={sortKey} dir={sortDir} onSort={handleSort} className={s.thCode} />
                <SortTh label="Tên Nhóm"       sortKey="name"      current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Giờ Làm Việc"   sortKey="workHours" current={sortKey} dir={sortDir} onSort={handleSort} className={s.thBool} />
                <SortTh label="Ghi Chú"        sortKey="note"      current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className={s.thAction}>Thao Tác</th>
              </tr>
              <tr className={s.filterRow}>
                <th />
                <th><ColFilter value={col.code} placeholder="Mã…" onChange={setF('code')} /></th>
                <th><ColFilter value={col.name} placeholder="Tên…" onChange={setF('name')} /></th>
                <th />
                <th><ColFilter value={col.note} placeholder="Ghi chú…" onChange={setF('note')} /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className={s.noResult}>Không có kết quả. <button className={s.linkBtn} onClick={clearFilters}>Xóa bộ lọc</button></td></tr>
              ) : filtered.map((r, i) => {
                const badge = hoursBadge(r.workHours);
                return (
                  <tr key={r.id}>
                    <td className={s.tdStt}>{i + 1}</td>
                    <td><span className={s.codeBadge}>{r.code}</span></td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td className={s.tdCenter}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 12px', borderRadius: 99, fontSize: 13,
                        fontWeight: 700, fontFamily: 'monospace',
                        background: badge.bg, color: badge.color,
                      }}>
                        {r.workHours}
                        <span style={{ fontSize: 11, fontWeight: 400, fontFamily: 'inherit' }}>giờ</span>
                      </span>
                    </td>
                    <td className={s.noteCell}>{r.note || <span className={s.noNote}>—</span>}</td>
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
