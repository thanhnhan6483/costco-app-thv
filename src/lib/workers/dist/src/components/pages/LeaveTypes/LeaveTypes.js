"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LeaveTypes;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const table_module_css_1 = __importDefault(require("@/styles/table.module.css"));
const icons_1 = require("@/lib/icons");
const AppContext_1 = require("@/context/AppContext");
const BLANK = { code: '', name: '', description: '', paid: true, note: '', dayType: -1 };
function ColFilter({ value, placeholder, onChange }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(icons_1.IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.colFilterInput, value: value, placeholder: placeholder, onChange: e => onChange(e.target.value) }), value && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.colFilterClear, onClick: () => onChange(''), type: "button", children: (0, jsx_runtime_1.jsx)(icons_1.IconClearX, {}) })] }));
}
function SortTh({ label, sortKey, current, dir, onSort, className, }) {
    const active = current === sortKey;
    return ((0, jsx_runtime_1.jsx)("th", { className: `${table_module_css_1.default.thSortable}${active ? ` ${table_module_css_1.default.thSortActive}` : ''}${className ? ` ${className}` : ''}`, onClick: () => onSort(sortKey), children: (0, jsx_runtime_1.jsxs)("span", { className: table_module_css_1.default.thSortInner, children: [label, (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.sortIcon, children: active ? (dir === 'asc' ? '↑' : '↓') : '↕' })] }) }));
}
function LeaveTypes() {
    const { activeMonthId } = (0, AppContext_1.useApp)();
    const [rows, setRows] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)(BLANK);
    const [deleteId, setDeleteId] = (0, react_1.useState)(null);
    const [col, setCol] = (0, react_1.useState)({ code: '', name: '', description: '', note: '' });
    const setF = (k) => (v) => setCol(p => ({ ...p, [k]: v }));
    const hasFilter = Object.values(col).some(v => v !== '');
    /* ── Sort ─────────────────────────────────────── */
    const [sortKey, setSortKey] = (0, react_1.useState)(null);
    const [sortDir, setSortDir] = (0, react_1.useState)('asc');
    const handleSort = (k) => {
        if (sortKey !== k) {
            setSortKey(k);
            setSortDir('asc');
        }
        else if (sortDir === 'asc')
            setSortDir('desc');
        else {
            setSortKey(null);
            setSortDir('asc');
        }
    };
    const load = (0, react_1.useCallback)(async () => {
        setLoading(true);
        try {
            setRows(await (await fetch(`/api/leave-types?month=${activeMonthId}`)).json());
        }
        finally {
            setLoading(false);
        }
    }, [activeMonthId]);
    (0, react_1.useEffect)(() => { load(); }, [load]);
    const filtered = (0, react_1.useMemo)(() => {
        const base = rows.filter(r => (!col.code || r.code.toLowerCase().includes(col.code.toLowerCase())) &&
            (!col.name || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
            (!col.description || r.description.toLowerCase().includes(col.description.toLowerCase())) &&
            (!col.note || r.note.toLowerCase().includes(col.note.toLowerCase())));
        if (!sortKey)
            return base;
        return [...base].sort((a, b) => {
            const va = String(a[sortKey] ?? '').toLowerCase();
            const vb = String(b[sortKey] ?? '').toLowerCase();
            return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
        });
    }, [rows, col, sortKey, sortDir]);
    const clearFilters = () => setCol({ code: '', name: '', description: '', note: '' });
    const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
    const openEdit = (r) => {
        setForm({ code: r.code, name: r.name, description: r.description, paid: r.paid, note: r.note, dayType: r.dayType ?? -1 });
        setEditId(r.id);
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                const res = await fetch(`/api/leave-types/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: form.code, name: form.name, description: form.description, paid: form.paid, note: form.note, dayType: form.dayType }),
                });
                if (!res.ok)
                    throw new Error((await res.json()).error);
            }
            else {
                const res = await fetch('/api/leave-types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: Date.now().toString(), ...form, monthId: activeMonthId, createdAt: new Date().toISOString().slice(0, 10) }),
                });
                if (!res.ok)
                    throw new Error((await res.json()).error);
            }
            await load();
            closeForm();
        }
        catch (err) {
            alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
        }
        finally {
            setSaving(false);
        }
    };
    const doDelete = async () => {
        if (!deleteId)
            return;
        setSaving(true);
        await fetch(`/api/leave-types/${deleteId}`, { method: 'DELETE' });
        await load();
        setSaving(false);
        setDeleteId(null);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBar, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.actionBarLeft, children: hasFilter && (0, jsx_runtime_1.jsxs)("button", { className: table_module_css_1.default.btnClearAll, onClick: clearFilters, children: ["\u2715 X\u00F3a b\u1ED9 l\u1ECDc (", filtered.length, "/", rows.length, ")"] }) }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarRight, children: [(0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${table_module_css_1.default.btnActionPrimary}`, onClick: openCreate, disabled: loading, children: [(0, jsx_runtime_1.jsx)(icons_1.IconPlus, {}), (0, jsx_runtime_1.jsx)("span", { children: "Th\u00EAm M\u1EDBi" })] }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnAction, onClick: load, disabled: loading, children: (0, jsx_runtime_1.jsx)("span", { className: loading ? table_module_css_1.default.spinning : '', children: (0, jsx_runtime_1.jsx)(icons_1.IconRefresh, {}) }) })] })] }), showForm && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: e => e.target === e.currentTarget && closeForm(), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formModal, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formHeader, children: [(0, jsx_runtime_1.jsx)("h2", { className: table_module_css_1.default.formTitle, children: editId ? '✏️ Sửa loại nghỉ phép' : '➕ Thêm loại nghỉ phép' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.formClose, onClick: closeForm, children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: table_module_css_1.default.form, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["M\u00E3 lo\u1EA1i ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.code, onChange: e => setForm(f => ({ ...f, code: e.target.value })), placeholder: "VD: X, PN, TS", required: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["T\u00EAn lo\u1EA1i ngh\u1EC9 ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "VD: Ngh\u1EC9 Ph\u00E9p N\u0103m", required: true })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Day Type (s\u1ED1 nguy\u00EAn l\u01B0u v\u00E0o ph\u00E2n b\u1ED5)" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, type: "number", min: -1, value: form.dayType, onChange: e => setForm(f => ({ ...f, dayType: Number(e.target.value) })), placeholder: "-1 = ch\u01B0a map" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "M\u00F4 t\u1EA3" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.description, onChange: e => setForm(f => ({ ...f, description: e.target.value })), placeholder: "VD: Ngh\u1EC9 \u0111\u01B0\u1EE3c ph\u00EA duy\u1EC7t tr\u01B0\u1EDBc." })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ghi ch\u00FA" }), (0, jsx_runtime_1.jsx)("textarea", { className: table_module_css_1.default.textarea, rows: 2, value: form.note, onChange: e => setForm(f => ({ ...f, note: e.target.value })), placeholder: "VD: T\u00EDnh ng\u00E0y c\u00F4ng: Kh\u00F4ng" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formActions, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", className: table_module_css_1.default.btnPrimary, disabled: saving, children: saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: table_module_css_1.default.btnSecondary, onClick: closeForm, children: "H\u1EE7y" })] })] })] }) })), deleteId && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: "\uD83D\uDDD1\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "X\u00E1c nh\u1EADn x\u00F3a" }), (0, jsx_runtime_1.jsxs)("p", { className: table_module_css_1.default.confirmDesc, children: ["X\u00F3a lo\u1EA1i ngh\u1EC9 ", (0, jsx_runtime_1.jsx)("strong", { children: rows.find(r => r.id === deleteId)?.name }), "?"] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmActions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnDanger, onClick: doDelete, disabled: saving, children: "\uD83D\uDDD1\uFE0F X\u00F3a" }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnSecondary, onClick: () => setDeleteId(null), children: "H\u1EE7y" })] })] }) })), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.tableCard, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.loadingState, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.spinner }), (0, jsx_runtime_1.jsx)("span", { children: "\u0110ang t\u1EA3i\u2026" })] })) : ((0, jsx_runtime_1.jsxs)("table", { className: table_module_css_1.default.table, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.headRow, children: [(0, jsx_runtime_1.jsx)("th", { className: table_module_css_1.default.thStt, children: "#" }), (0, jsx_runtime_1.jsx)(SortTh, { label: "M\u00E3 Lo\u1EA1i", sortKey: "code", current: sortKey, dir: sortDir, onSort: handleSort, className: table_module_css_1.default.thCode }), (0, jsx_runtime_1.jsx)(SortTh, { label: "T\u00EAn Lo\u1EA1i Ngh\u1EC9", sortKey: "name", current: sortKey, dir: sortDir, onSort: handleSort }), (0, jsx_runtime_1.jsx)(SortTh, { label: "M\u00F4 T\u1EA3", sortKey: "description", current: sortKey, dir: sortDir, onSort: handleSort }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Ghi Ch\u00FA", sortKey: "note", current: sortKey, dir: sortDir, onSort: handleSort }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 80, textAlign: 'center' }, children: "Day Type" }), (0, jsx_runtime_1.jsx)("th", { className: table_module_css_1.default.thAction, children: "Thao T\u00E1c" })] }), (0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.filterRow, children: [(0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.code, placeholder: "M\u00E3\u2026", onChange: setF('code') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.name, placeholder: "T\u00EAn\u2026", onChange: setF('name') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.description, placeholder: "M\u00F4 t\u1EA3\u2026", onChange: setF('description') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.note, placeholder: "Ghi ch\u00FA\u2026", onChange: setF('note') }) }), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {})] })] }), (0, jsx_runtime_1.jsx)("tbody", { children: filtered.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: 7, className: table_module_css_1.default.noResult, children: ["Kh\u00F4ng c\u00F3 k\u1EBFt qu\u1EA3. ", (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.linkBtn, onClick: clearFilters, children: "X\u00F3a b\u1ED9 l\u1ECDc" })] }) })) : filtered.map((r, i) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.tdStt, children: i + 1 }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.codeBadge, children: r.code }) }), (0, jsx_runtime_1.jsx)("td", { style: { fontWeight: 500 }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.noteCell, children: r.description || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.noteCell, children: r.note || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center', fontFamily: 'monospace', color: r.dayType >= 0 ? '#1d4ed8' : '#9ca3af' }, children: r.dayType >= 0 ? r.dayType : '—' }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconEdit, onClick: () => openEdit(r), title: "Ch\u1EC9nh s\u1EEDa", children: (0, jsx_runtime_1.jsx)(icons_1.IconEdit, {}) }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconDelete, onClick: () => setDeleteId(r.id), title: "X\u00F3a", children: (0, jsx_runtime_1.jsx)(icons_1.IconDelete, {}) })] }) })] }, r.id))) })] })) })] }));
}
