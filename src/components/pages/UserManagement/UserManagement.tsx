'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import s from '@/styles/table.module.css';
import { IconEdit, IconDelete, IconSearch, IconClearX, IconPlus, IconRefresh } from '@/lib/icons';

interface User { id: string; username: string; full_name: string; role: string; note: string; created_at: string; }
type Filters = { username: string };
const BLANK_FORM = { username: '', password: '', confirmPassword: '', full_name: '', note: '' };

function ColFilter({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <div className={s.colFilter}>
      <span className={s.colFilterIcon}><IconSearch /></span>
      <input className={s.colFilterInput} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      {value && <button className={s.colFilterClear} onClick={() => onChange('')} type="button"><IconClearX /></button>}
    </div>
  );
}

export default function UserManagement() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = thêm mới, string = đổi mật khẩu
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [col, setCol] = useState<Filters>({ username: '' });
  const hasFilter = col.username !== '';

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/users');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(await res.json());
    }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() =>
    rows.filter(r => !col.username || r.username.toLowerCase().includes(col.username.toLowerCase())),
    [rows, col]
  );

  const clearFilters = () => setCol({ username: '' });

  const openCreate = () => { setForm(BLANK_FORM); setEditId(null); setFormError(''); setShowPw(false); setShowForm(true); };
  const openEdit = (r: User) => { setForm({ username: r.username, password: '', confirmPassword: '', full_name: r.full_name, note: r.note }); setEditId(r.id); setFormError(''); setShowPw(false); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK_FORM); setFormError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!editId && form.password !== form.confirmPassword) { setFormError('Mật khẩu xác nhận không khớp'); return; }
    if (!editId && form.password.length < 6) { setFormError('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (editId && form.password && form.password !== form.confirmPassword) { setFormError('Mật khẩu xác nhận không khớp'); return; }
    setSaving(true);
    try {
      if (editId) {
        const body: Record<string, string> = { full_name: form.full_name, note: form.note };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/users/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username.trim(), password: form.password, full_name: form.full_name, note: form.note }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      await load(); closeForm();
    } catch (err) { setFormError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!deleteId) return; setSaving(true);
    const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error); }
    else await load();
    setSaving(false); setDeleteId(null);
  };

  return (
    <div className={s.page}>
      <div className={s.actionBar}>
        <div className={s.actionBarLeft}>
          {error && <span className={s.errorChip}>⚠ {error}</span>}
          {hasFilter && !error && <button className={s.btnClearAll} onClick={clearFilters}>✕ Xóa bộ lọc ({filtered.length}/{rows.length})</button>}
        </div>
        <div className={s.actionBarRight}>
          <button className={`${s.btnAction} ${s.btnActionPrimary}`} onClick={openCreate} disabled={loading}><IconPlus /><span>Thêm Tài Khoản</span></button>
          <div className={s.dividerV} />
          <button className={s.btnAction} onClick={load} disabled={loading}><span className={loading ? s.spinning : ''}><IconRefresh /></span></button>
        </div>
      </div>

      {/* Form thêm / đổi mật khẩu */}
      {showForm && (
        <div className={s.formOverlay} onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className={s.formModal}>
            <div className={s.formHeader}>
              <h2 className={s.formTitle}>{editId ? '🔑 Đổi mật khẩu' : '➕ Thêm tài khoản'}</h2>
              <button className={s.formClose} onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={s.form}>
              {!editId && (
                <div className={s.field}>
                  <label className={s.label}>Tên đăng nhập <span className={s.required}>*</span></label>
                  <input className={s.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="VD: admin2" required autoFocus />
                </div>
              )}
              {editId && (
                <div className={s.field}>
                  <label className={s.label}>Tài khoản</label>
                  <input className={s.input} value={form.username} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
                </div>
              )}
              <div className={s.field}>
                <label className={s.label}>Mật khẩu {!editId && <span className={s.required}>*</span>}</label>
                <div style={{ position: 'relative' }}>
                  <input className={s.input} type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editId ? 'Nhập mật khẩu mới' : 'Tối thiểu 6 ký tự'}
                    required={!editId} style={{ paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0 }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Xác nhận mật khẩu {!editId && <span className={s.required}>*</span>}</label>
                <input className={s.input} type={showPw ? 'text' : 'password'} value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Nhập lại mật khẩu" required={!editId} />
              </div>
              <div className={s.field}>
                <label className={s.label}>Họ và tên</label>
                <input className={s.input} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="VD: Nguyễn Văn A" />
              </div>
              <div className={s.field}>
                <label className={s.label}>Ghi chú</label>
                <textarea className={s.textarea} rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              {formError && <div style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>{formError}</div>}
              <div className={s.formActions}>
                <button type="submit" className={s.btnPrimary} disabled={saving}>{saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm'}</button>
                <button type="button" className={s.btnSecondary} onClick={closeForm}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm xóa */}
      {deleteId && (
        <div className={s.formOverlay}>
          <div className={s.confirmModal}>
            <div className={s.confirmIcon}>🗑️</div>
            <h3 className={s.confirmTitle}>Xác nhận xóa</h3>
            <p className={s.confirmDesc}>Xóa tài khoản <strong>{rows.find(r => r.id === deleteId)?.username}</strong>?<br />Hành động này không thể hoàn tác.</p>
            <div className={s.confirmActions}>
              <button className={s.btnDanger} onClick={doDelete} disabled={saving}>{saving ? 'Đang xóa…' : '🗑️ Xóa'}</button>
              <button className={s.btnSecondary} onClick={() => setDeleteId(null)}>Hủy</button>
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
                <th className={s.thCode}>Tên đăng nhập</th>
                <th>Họ và tên</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Ghi chú</th>
                <th className={s.thAction}>Thao Tác</th>
              </tr>
              <tr className={s.filterRow}>
                <th /><th><ColFilter value={col.username} placeholder="Tìm tên…" onChange={v => setCol({ username: v })} /></th><th /><th /><th /><th /><th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className={s.noResult}>Không có kết quả.{hasFilter && <> <button className={s.linkBtn} onClick={clearFilters}>Xóa bộ lọc</button></>}</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? s.rowEven : s.rowOdd}>
                  <td className={s.tdStt}>{i + 1}</td>
                  <td><span className={s.codeBadge}>{r.username}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.full_name || <span className={s.noNote}>—</span>}</td>
                  <td><span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{r.role}</span></td>
                  <td className={s.noteCell}>{r.created_at}</td>
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
