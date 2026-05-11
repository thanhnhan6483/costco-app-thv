'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import s from '@/styles/table.module.css';
import { IconEdit, IconDelete, IconSearch, IconClearX, IconPlus, IconRefresh } from '@/lib/icons';
import { useApp } from '@/context/AppContext';


interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string;
  paid: boolean;
  note: string;
  createdAt: string;
}
type Filters = { code: string; name: string; description: string; note: string };
type SortKey = 'code' | 'name' | 'description' | 'note';
type SortDir = 'asc' | 'desc';
const BLANK = { code: '', name: '', description: '', paid: true, note: '' };

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

export default function LeaveTypes() {
  const { activeMonthId } = useApp();
  const [rows, setRows] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [col, setCol] = useState<Filters>({ code: '', name: '', description: '', note: '' });
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

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await (await fetch(`/api/leave-types?month=${activeMonthId}`)).json()); }
    finally { setLoading(false); }
  }, [activeMonthId]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const base = rows.filter(r =>
      (!col.code        || r.code.toLowerCase().includes(col.code.toLowerCase())) &&
      (!col.name        || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
      (!col.description || r.description.toLowerCase().includes(col.description.toLowerCase())) &&
      (!col.note        || r.note.toLowerCase().includes(col.note.toLowerCase()))
    );
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      const va = String(a[sortKey] ?? '').toLowerCase();
      const vb = String(b[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
    });
  }, [rows, col, sortKey, sortDir]);

  const clearFilters = () => setCol({ code: '', name: '', description: '', note: '' });

  const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (r: LeaveType) => {
    setForm({ code: r.code, name: r.name, description: r.description, paid: r.paid, note: r.note });
    setEditId(r.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/leave-types/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: form.code, name: form.name, description: form.description, paid: form.paid, note: form.note }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/leave-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: Date.now().toString(), ...form, monthId: activeMonthId, createdAt: new Date().toISOString().slice(0, 10) }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      await load(); closeForm();
    } catch (err) { alert('Lỗi: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!deleteId) return; setSaving(true);
    await fetch(`/api/leave-types/${deleteId}`, { method: 'DELETE' });
    await load(); setSaving(false); setDeleteId(null);
  };

  return (
    <div className={s.page}>
      <div className={s.actionBar}>
        <div className={s.actionBarLeft}>
          {hasFilter && <button className={s.btnClearAll} onClick={clearFilters}>✕ Xóa bộ lọc ({filtered.length}/{rows.length})</button>}
        </div>
        <div className={s.actionBarRight}>
          <button className={`${s.btnAction} ${s.btnActionPrimary}`} onClick={openCreate} disabled={loading}><IconPlus /><span>Thêm Mới</span></button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={load} disabled={loading}><span className={loading ? s.spinning : ''}><IconRefresh /></span></button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className={s.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={s.formModal}>
            <div className={s.formHeader}>
              <h2 className={s.formTitle}>{editId ? '✏️ Sửa loại nghỉ phép' : '➕ Thêm loại nghỉ phép'}</h2>
              <button className={s.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={s.form}>
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Mã loại <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="VD: X, PN, TS" required />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Tên loại nghỉ <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="VD: Nghỉ Phép Năm" required />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Mô tả</label>
                <input className={s.input} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="VD: Nghỉ được phê duyệt trước." />
              </div>
              <div className={s.field}>
                <label className={s.label}>Ghi chú</label>
                <textarea className={s.textarea} rows={2} value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="VD: Tính ngày công: Không" />
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
            <p className={s.confirmDesc}>Xóa loại nghỉ <strong>{rows.find(r => r.id === deleteId)?.name}</strong>?</p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDelete} disabled={saving}>🗑️ Xóa</button>
              <button className={s.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
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
                <SortTh label="Mã Loại"    sortKey="code"        current={sortKey} dir={sortDir} onSort={handleSort} className={s.thCode} />
                <SortTh label="Tên Loại Nghỉ" sortKey="name"    current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Mô Tả"       sortKey="description" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Ghi Chú"     sortKey="note"        current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className={s.thAction}>Thao Tác</th>
              </tr>
              <tr className={s.filterRow}>
                <th />
                <th><ColFilter value={col.code} placeholder="Mã…" onChange={setF('code')} /></th>
                <th><ColFilter value={col.name} placeholder="Tên…" onChange={setF('name')} /></th>
                <th><ColFilter value={col.description} placeholder="Mô tả…" onChange={setF('description')} /></th>
                <th><ColFilter value={col.note} placeholder="Ghi chú…" onChange={setF('note')} /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className={s.noResult}>Không có kết quả. <button className={s.linkBtn} onClick={clearFilters}>Xóa bộ lọc</button></td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td className={s.tdStt}>{i + 1}</td>
                  <td><span className={s.codeBadge}>{r.code}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td className={s.noteCell}>{r.description || <span className={s.noNote}>—</span>}</td>
                  <td className={s.noteCell}>{r.note || <span className={s.noNote}>—</span>}</td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.btnIconEdit} onClick={() => openEdit(r)} title="Chỉnh sửa"><IconEdit /></button>
                      <button className={s.btnIconDelete} onClick={() => setDeleteId(r.id)} title="Xóa"><IconDelete /></button>
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
