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

/* ── Types ─────────────────────────────────── */
interface AllocRule {
  id: string;
  groupCode: string;
  groupName: string;
  name: string;
  paramKey: string;
  paramValue: number | null;
  defaultParam: string;
  specificValue: string;
  active: boolean;
}

type Filters = { groupCode: string; groupName: string; name: string; paramKey: string; defaultParam: string; specificValue: string };
const BLANK_FILTER: Filters = { groupCode: '', groupName: '', name: '', paramKey: '', defaultParam: '', specificValue: '' };
const BLANK_FORM = { groupCode: '', groupName: '', name: '', paramKey: '', paramValue: '', defaultParam: '', specificValue: '' };

/* ── 4 nhóm quy tắc chuẩn ─────────────────── */
const PRESET_GROUPS = [
  { code: 'WORK_RULE',            name: 'Quy tắc làm việc'   },
  { code: 'SHIFT_BALANCING_RULE', name: 'Quy tắc phân bổ ca' },
  { code: 'OT_RULE',              name: 'Quy tắc tăng ca'    },
  { code: 'ATTENDANCE_RULE',      name: 'Quy tắc chấm công'  },
];

const GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  WORK_RULE:            { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  SHIFT_BALANCING_RULE: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  OT_RULE:              { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  ATTENDANCE_RULE:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

function GroupBadge({ code }: { code: string }) {
  const c = GROUP_COLORS[code] ?? { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 5,
      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {code}
    </span>
  );
}

function ColFilter({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <div className={s.colFilter}>
      <span className={s.colFilterIcon}><IconSearch /></span>
      <input className={s.colFilterInput} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
      {value && <button className={s.colFilterClear} onClick={() => onChange('')} type="button"><IconClearX /></button>}
    </div>
  );
}

/* ── Main component ─────────────────────────── */
export default function AllocRules() {
  const { activeMonthId, activeMonthLocked } = useApp();
  const [rows, setRows]     = useState<AllocRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [col, setCol]         = useState<Filters>(BLANK_FILTER);
  const setF = (k: keyof Filters) => (v: string) => setCol(p => ({ ...p, [k]: v }));
  const hasFilter = Object.values(col).some(v => v !== '');

  /* Form */
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState(BLANK_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; skippedCodes: string[]; errors: string[] } | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  /* ── Fetch ──────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/alloc-rules?month=${activeMonthId}`).then(r => r.json());
      setRows(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, [activeMonthId]);
  useEffect(() => { load(); }, [load]);

  /* ── Filter ──────────────────────────────── */
  const filtered = useMemo(() => rows.filter(r =>
    (!col.groupCode    || r.groupCode.toLowerCase().includes(col.groupCode.toLowerCase())) &&
    (!col.groupName    || r.groupName.toLowerCase().includes(col.groupName.toLowerCase())) &&
    (!col.name         || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
    (!col.paramKey     || (r.paramKey ?? '').toLowerCase().includes(col.paramKey.toLowerCase())) &&
    (!col.defaultParam || r.defaultParam.toLowerCase().includes(col.defaultParam.toLowerCase())) &&
    (!col.specificValue|| r.specificValue.toLowerCase().includes(col.specificValue.toLowerCase()))
  ), [rows, col]);

  /* ── Form helpers ────────────────────────── */
  const openCreate = (groupCode = '', groupName = '') => {
    setForm({ ...BLANK_FORM, groupCode, groupName });
    setEditId(null); setShowForm(true);
  };
  const openEdit = (r: AllocRule) => {
    setForm({
      groupCode: r.groupCode, groupName: r.groupName,
      name: r.name, paramKey: r.paramKey ?? '',
      paramValue: r.paramValue != null ? String(r.paramValue) : '',
      defaultParam: r.defaultParam,
      specificValue: r.specificValue ?? '',
    });
    setEditId(r.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK_FORM); };

  const handleGroupSelect = (code: string) => {
    const preset = PRESET_GROUPS.find(g => g.code === code);
    setForm(f => ({ ...f, groupCode: code, groupName: preset?.name ?? f.groupName }));
  };

  /* ── Submit ──────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        await fetch(`/api/alloc-rules/${editId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            paramValue: form.paramValue !== '' ? Number(form.paramValue) : null,
          }),
        });
      } else {
        const res = await fetch('/api/alloc-rules', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `ar_${Date.now()}`, ...form,
            paramValue: form.paramValue !== '' ? Number(form.paramValue) : null,
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
    await fetch(`/api/alloc-rules/${deleteId}`, { method: 'DELETE' });
    await load(); setSaving(false); setDeleteId(null);
  };

  const [seeding, setSeeding] = useState(false);
  const doSeed = async () => {
    if (!confirm('Xóa toàn bộ quy tắc hiện tại và set lại quy tắc mặc định ?')) return;
    setSeeding(true);
    try {
      const res = await fetch(`/api/alloc-rules/seed?month=month_apr2026`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
    } catch (e) { alert('Lỗi: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setSeeding(false); }
  };

  const downloadTemplate = () => window.open('/api/alloc-rules/import', '_blank');

  const doImport = async (file: File, sheetName: string) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('monthId', activeMonthId);
      fd.append('sheetName', sheetName);
      const res = await fetch('/api/alloc-rules/import', { method: 'POST', body: fd });
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

  const doDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch(`/api/alloc-rules/clear`, {
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

  /* ── Render ─────────────────────────────── */
  return (
    <div className={s.page}>
      {/* Action bar */}
      <div className={s.actionBar}>
        <div className={s.actionBarLeft}>
          {hasFilter && (
            <button className={s.btnClearAll} onClick={() => setCol(BLANK_FILTER)}>
              ✕ Xóa bộ lọc ({filtered.length}/{rows.length})
            </button>
          )}
        </div>
        <div className={s.actionBarRight}>
          <button className={`${s.btnAction} ${s.btnActionPrimary}`} onClick={() => openCreate()} disabled={activeMonthLocked}>
            <IconPlus /><span>Thêm Mới</span>
          </button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={doSeed} disabled={seeding || activeMonthLocked}
            title="Xóa và seed lại 9 quy tắc mặc định" style={{ color: '#d97706' }}>
            <span className={seeding ? s.spinning : ''}>⚙️</span>
            <span>{seeding ? 'Đang set…' : 'Khôi phục thiết lập'}</span>
          </button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={downloadTemplate} title="Tải file Excel mẫu để nhập liệu">
            <IconDownload /><span>Tải Mẫu</span>
          </button>
          <a
            className={s.btnAction}
            href={`/api/alloc-rules/export?month=${activeMonthId}`}
            download
            title="Xuất quy tắc phân bổ ra Excel"
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
            title="Xóa tất cả quy tắc phân bổ"
          >
            <IconDelete /><span>Xóa Tất Cả</span>
          </button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={load} disabled={loading}>
            <span className={loading ? s.spinning : ''}><IconRefresh /></span>
          </button>
        </div>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className={s.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={s.formModal}>
            <div className={s.formHeader}>
              <h2 className={s.formTitle}>{editId ? '✏️ Sửa quy tắc' : '➕ Thêm quy tắc'}</h2>
              <button className={s.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={s.form}>
              {/* Nhóm */}
              <div className={s.field}>
                <label className={s.label}>Nhóm quy tắc <span className={s.required}>*</span></label>
                <select className={s.select} value={form.groupCode}
                  onChange={e => handleGroupSelect(e.target.value)} required>
                  <option value="">-- Chọn nhóm --</option>
                  {PRESET_GROUPS.map(g => (
                    <option key={g.code} value={g.code}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Tên quy tắc */}
              <div className={s.field}>
                <label className={s.label}>Tên quy tắc <span className={s.required}>*</span></label>
                <input className={s.input} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Giới hạn ngày làm liên tục" required />
              </div>

              {/* Giá trị + Ghi chú */}
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Mã quy tắc (param_key)</label>
                  <input className={s.input} value={form.paramKey}
                    onChange={e => setForm(f => ({ ...f, paramKey: e.target.value }))}
                    placeholder="VD: max_consecutive_days" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Giá trị áp dụng (số) <span style={{color:'var(--primary)',fontWeight:700}}>← engine dùng</span></label>
                  <input className={s.input} type="number" value={form.paramValue}
                    onChange={e => setForm(f => ({ ...f, paramValue: e.target.value }))}
                    placeholder="VD: 6" />
                </div>
              </div>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Giá trị mặc định (hiển thị)</label>
                  <input className={s.input} value={form.defaultParam}
                    onChange={e => setForm(f => ({ ...f, defaultParam: e.target.value }))}
                    placeholder="VD: 6 ngày" />
                </div>
              </div>

              {/* Ghi chú – full width */}
              <div className={s.field}>
                <label className={s.label}>Ghi chú</label>
                <textarea className={s.textarea} rows={3} value={form.specificValue}
                  onChange={e => setForm(f => ({ ...f, specificValue: e.target.value }))}
                  placeholder="Ghi chú tự do…" />
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

      {/* ── Confirm Delete ── */}
      {deleteId && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon}>🗑️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa</h3>
            <p className={s.confirmDesc}>Xóa quy tắc <strong>{rows.find(r => r.id === deleteId)?.name}</strong>?</p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDelete} disabled={saving}>🗑️ Xóa</button>
              <button className={s.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All confirm ── */}
      {showDeleteAll && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa tất cả</h3>
            <p className={s.confirmDesc}>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ {rows.length} quy tắc phân bổ</strong>?<br />
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
              <p>✅ Đã thêm: <strong>{importResult.inserted}</strong> quy tắc</p>
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
      <div className={s.tableCard}>
        {loading ? (
          <div className={s.loadingState}><span className={s.spinner} /><span>Đang tải…</span></div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr className={s.headRow}>
                <th className={s.thStt}>#</th>
                <th style={{ minWidth: 180 }}>MÃ NHÓM</th>
                <th style={{ minWidth: 160 }}>TÊN NHÓM</th>
                <th style={{ minWidth: 200 }}>QUY TẮC</th>
                <th style={{ minWidth: 160 }}>MÃ QUY TẮC</th>
                <th style={{ minWidth: 100 }}>GIÁ TRỊ (SỐ)</th>
                <th style={{ minWidth: 140 }}>GIÁ TRỊ HIỂN THỊ</th>
                <th style={{ minWidth: 220 }}>GHI CHÚ</th>
                <th className={s.thAction}>THAO TÁC</th>
              </tr>
              <tr className={s.filterRow}>
                <th />
                <th><ColFilter value={col.groupCode} placeholder="Mã nhóm…" onChange={setF('groupCode')} /></th>
                <th><ColFilter value={col.groupName} placeholder="Tên nhóm…" onChange={setF('groupName')} /></th>
                <th><ColFilter value={col.name} placeholder="Quy tắc…" onChange={setF('name')} /></th>
                <th><ColFilter value={col.paramKey} placeholder="Mã…" onChange={setF('paramKey')} /></th>
                <th />
                <th><ColFilter value={col.defaultParam} placeholder="Giá trị…" onChange={setF('defaultParam')} /></th>
                <th><ColFilter value={col.specificValue} placeholder="Ghi chú…" onChange={setF('specificValue')} /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className={s.noResult}>
                  Không có kết quả.
                  {hasFilter && <button className={s.linkBtn} onClick={() => setCol(BLANK_FILTER)}> Xóa bộ lọc</button>}
                </td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td className={s.tdStt}>{i + 1}</td>
                  <td><GroupBadge code={r.groupCode} /></td>
                  <td style={{ fontWeight: 500, color: 'var(--gray-700)', fontSize: 13 }}>{r.groupName}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: 13 }}>{r.name}</div>
                  </td>
                  <td>
                    {r.paramKey ? (
                      <span style={{
                        display: 'inline-block', background: '#f8fafc', color: '#334155',
                        border: '1px solid #e2e8f0', borderRadius: 4,
                        padding: '2px 7px', fontSize: 11, fontWeight: 700,
                        fontFamily: 'monospace', letterSpacing: '0.02em',
                      }}>
                        {r.paramKey}
                      </span>
                    ) : <span style={{ color: 'var(--gray-300)', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {r.paramValue != null ? (
                      <span style={{
                        display: 'inline-block', background: '#eff6ff', color: '#1d4ed8',
                        border: '1px solid #bfdbfe', borderRadius: 5,
                        padding: '2px 10px', fontSize: 13, fontWeight: 700,
                      }}>
                        {r.paramValue}
                      </span>
                    ) : <span style={{ color: 'var(--gray-300)', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', background: '#f0fdf4', color: '#15803d',
                      border: '1px solid #bbf7d0', borderRadius: 5,
                      padding: '2px 8px', fontSize: 12, fontWeight: 600,
                    }}>
                      {r.defaultParam || '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                      {r.specificValue || <span className={s.noNote}>—</span>}
                    </span>
                  </td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.btnIconEdit} onClick={() => openEdit(r)} title="Sửa" disabled={activeMonthLocked}><IconEdit /></button>
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
