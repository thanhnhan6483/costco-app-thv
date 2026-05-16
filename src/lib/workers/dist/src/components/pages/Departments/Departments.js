"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Departments;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const table_module_css_1 = __importDefault(require("@/styles/table.module.css"));
const icons_1 = require("@/lib/icons");
const AppContext_1 = require("@/context/AppContext");
/* ── Extra icons ─────────────────────────────── */
const IconDownload = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), (0, jsx_runtime_1.jsx)("polyline", { points: "7 10 12 15 17 10" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }));
const IconUpload = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), (0, jsx_runtime_1.jsx)("polyline", { points: "17 8 12 3 7 8" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "3", x2: "12", y2: "15" })] }));
const BLANK = { code: '', name: '', parentId: '', note: '' };
function ColFilter({ value, placeholder, onChange }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(icons_1.IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.colFilterInput, value: value, placeholder: placeholder, onChange: e => onChange(e.target.value) }), value && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.colFilterClear, onClick: () => onChange(''), type: "button", children: (0, jsx_runtime_1.jsx)(icons_1.IconClearX, {}) })] }));
}
function SortTh({ label, sortKey, current, dir, onSort, className, }) {
    const active = current === sortKey;
    return ((0, jsx_runtime_1.jsx)("th", { className: `${table_module_css_1.default.thSortable}${active ? ` ${table_module_css_1.default.thSortActive}` : ''}${className ? ` ${className}` : ''}`, onClick: () => onSort(sortKey), children: (0, jsx_runtime_1.jsxs)("span", { className: table_module_css_1.default.thSortInner, children: [label, (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.sortIcon, children: active ? (dir === 'asc' ? '↑' : '↓') : '↕' })] }) }));
}
function Departments() {
    const { activeMonthId } = (0, AppContext_1.useApp)();
    const [rows, setRows] = (0, react_1.useState)([]);
    ;
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)(BLANK);
    const [deleteId, setDeleteId] = (0, react_1.useState)(null);
    const [col, setCol] = (0, react_1.useState)({ code: '', name: '', parentName: '', active: '', note: '' });
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
        } // reset
    };
    const load = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await (await fetch(`/api/departments?month=${activeMonthId}`)).json());
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    }, [activeMonthId]);
    (0, react_1.useEffect)(() => { load(); }, [load]);
    const filtered = (0, react_1.useMemo)(() => {
        const base = rows.filter(r => (!col.code || r.code.toLowerCase().includes(col.code.toLowerCase())) &&
            (!col.name || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
            (!col.parentName || (r.parentName ?? '').toLowerCase().includes(col.parentName.toLowerCase())) &&
            (col.active === '' || (col.active === 'true' ? r.active : !r.active)) &&
            (!col.note || r.note.toLowerCase().includes(col.note.toLowerCase())));
        if (!sortKey)
            return base;
        return [...base].sort((a, b) => {
            let va, vb;
            if (sortKey === 'active') {
                va = a.active ? '1' : '0';
                vb = b.active ? '1' : '0';
            }
            else if (sortKey === 'parentName') {
                va = (a.parentName ?? '').toLowerCase();
                vb = (b.parentName ?? '').toLowerCase();
            }
            else {
                va = String(a[sortKey] ?? '').toLowerCase();
                vb = String(b[sortKey] ?? '').toLowerCase();
            }
            return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
        });
    }, [rows, col, sortKey, sortDir]);
    const clearFilters = () => setCol({ code: '', name: '', parentName: '', active: '', note: '' });
    const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
    const openEdit = (r) => {
        setForm({ code: r.code, name: r.name, parentId: r.parentId ?? '', note: r.note });
        setEditId(r.id);
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.code || !form.name)
            return;
        setSaving(true);
        try {
            if (editId) {
                const res = await fetch(`/api/departments/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: form.code, name: form.name, parentId: form.parentId || null, note: form.note }),
                });
                if (!res.ok)
                    throw new Error((await res.json()).error);
            }
            else {
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
    const toggleActive = async (id) => {
        await fetch(`/api/departments/${id}`, { method: 'PATCH' });
        load();
    };
    const doDelete = async () => {
        if (!deleteId)
            return;
        setSaving(true);
        await fetch(`/api/departments/${deleteId}`, { method: 'DELETE' });
        await load();
        setSaving(false);
        setDeleteId(null);
    };
    /* ── Export template ────────────────────────── */
    const downloadTemplate = () => {
        window.open('/api/departments/import', '_blank');
    };
    /* ── Import Excel ───────────────────────────── */
    const fileRef = (0, react_1.useRef)(null);
    const [importing, setImporting] = (0, react_1.useState)(false);
    const [importResult, setImportResult] = (0, react_1.useState)(null);
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setImporting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('monthId', activeMonthId);
            const res = await fetch('/api/departments/import', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            setImportResult(data);
            await load();
        }
        catch (err) {
            alert('Lỗi import: ' + (err instanceof Error ? err.message : String(err)));
        }
        finally {
            setImporting(false);
            if (fileRef.current)
                fileRef.current.value = '';
        }
    };
    /* Danh sách phòng ban có thể chọn làm cấp trên (loại trừ chính nó) */
    const parentOptions = rows.filter(r => r.id !== editId);
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBar, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarLeft, children: [error && (0, jsx_runtime_1.jsxs)("span", { className: table_module_css_1.default.errorChip, children: ["\u26A0 ", error] }), hasFilter && !error && (0, jsx_runtime_1.jsxs)("button", { className: table_module_css_1.default.btnClearAll, onClick: clearFilters, children: ["\u2715 X\u00F3a b\u1ED9 l\u1ECDc (", filtered.length, "/", rows.length, ")"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarRight, children: [(0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${table_module_css_1.default.btnActionPrimary}`, onClick: openCreate, disabled: loading, children: [(0, jsx_runtime_1.jsx)(icons_1.IconPlus, {}), (0, jsx_runtime_1.jsx)("span", { children: "Th\u00EAm M\u1EDBi" })] }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsxs)("button", { className: table_module_css_1.default.btnAction, onClick: downloadTemplate, title: "T\u1EA3i file Excel m\u1EABu \u0111\u1EC3 nh\u1EADp li\u1EC7u", children: [(0, jsx_runtime_1.jsx)(IconDownload, {}), (0, jsx_runtime_1.jsx)("span", { children: "T\u1EA3i M\u1EABu" })] }), (0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${table_module_css_1.default.btnActionGreen}`, onClick: () => fileRef.current?.click(), disabled: importing, title: "Import d\u1EEF li\u1EC7u t\u1EEB file Excel", children: [importing ? (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.spinning, children: (0, jsx_runtime_1.jsx)(IconUpload, {}) }) : (0, jsx_runtime_1.jsx)(IconUpload, {}), (0, jsx_runtime_1.jsx)("span", { children: importing ? 'Đang import…' : 'Import Excel' })] }), (0, jsx_runtime_1.jsx)("input", { ref: fileRef, type: "file", accept: ".xlsx,.xls", style: { display: 'none' }, onChange: handleFileChange }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnAction, onClick: load, disabled: loading, children: (0, jsx_runtime_1.jsx)("span", { className: loading ? table_module_css_1.default.spinning : '', children: (0, jsx_runtime_1.jsx)(icons_1.IconRefresh, {}) }) })] })] }), showForm && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: e => e.target === e.currentTarget && closeForm(), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formModal, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formHeader, children: [(0, jsx_runtime_1.jsx)("h2", { className: table_module_css_1.default.formTitle, children: editId ? '✏️ Sửa phòng ban' : '➕ Thêm phòng ban' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.formClose, onClick: closeForm, children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: table_module_css_1.default.form, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["M\u00E3 ph\u00F2ng ban ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.code, onChange: e => setForm(f => ({ ...f, code: e.target.value })), placeholder: "VD: KD", required: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["T\u00EAn ph\u00F2ng ban ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "VD: Kinh Doanh", required: true })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ph\u00F2ng ban c\u1EA5p tr\u00EAn" }), (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.input, value: form.parentId, onChange: e => setForm(f => ({ ...f, parentId: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\u2014 Kh\u00F4ng c\u00F3 (ph\u00F2ng ban g\u1ED1c) \u2014" }), parentOptions.map(r => ((0, jsx_runtime_1.jsxs)("option", { value: r.id, children: [r.code, " \u2013 ", r.name] }, r.id)))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ghi ch\u00FA" }), (0, jsx_runtime_1.jsx)("textarea", { className: table_module_css_1.default.textarea, rows: 2, value: form.note, onChange: e => setForm(f => ({ ...f, note: e.target.value })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formActions, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", className: table_module_css_1.default.btnPrimary, disabled: saving, children: saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: table_module_css_1.default.btnSecondary, onClick: closeForm, children: "H\u1EE7y" })] })] })] }) })), deleteId && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: "\uD83D\uDDD1\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "X\u00E1c nh\u1EADn x\u00F3a" }), (0, jsx_runtime_1.jsxs)("p", { className: table_module_css_1.default.confirmDesc, children: ["X\u00F3a ph\u00F2ng ban ", (0, jsx_runtime_1.jsx)("strong", { children: rows.find(r => r.id === deleteId)?.name }), "?", (0, jsx_runtime_1.jsx)("br", {}), "H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c."] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmActions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnDanger, onClick: doDelete, disabled: saving, children: saving ? 'Đang xóa…' : '🗑️ Xóa' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnSecondary, onClick: () => setDeleteId(null), children: "H\u1EE7y" })] })] }) })), importResult && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: () => setImportResult(null), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, style: { maxWidth: 420 }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: importResult.errors.length === 0 ? '✅' : '⚠️' }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "K\u1EBFt qu\u1EA3 Import" }), (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'left', fontSize: 13.5, lineHeight: 1.8, marginBottom: 20 }, children: [(0, jsx_runtime_1.jsxs)("p", { children: ["\u2705 \u0110\u00E3 th\u00EAm: ", (0, jsx_runtime_1.jsx)("strong", { children: importResult.inserted }), " ph\u00F2ng ban"] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u23ED B\u1ECF qua: ", (0, jsx_runtime_1.jsx)("strong", { children: importResult.skipped }), importResult.skippedCodes?.length > 0 &&
                                            (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 12, color: 'var(--gray-500)', marginLeft: 6 }, children: ["(", importResult.skippedCodes.join(', '), ")"] })] }), importResult.errors.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 10 }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: 'var(--danger)', fontWeight: 600 }, children: ["\u274C L\u1ED7i (", importResult.errors.length, "):"] }), (0, jsx_runtime_1.jsx)("ul", { style: { paddingLeft: 16, color: 'var(--danger)', fontSize: 12 }, children: importResult.errors.map((e, i) => (0, jsx_runtime_1.jsx)("li", { children: e }, i)) })] }))] }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmActions, style: { justifyContent: 'center' }, children: (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnPrimary, onClick: () => setImportResult(null), children: "\u0110\u00F3ng" }) })] }) })), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.tableCard, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.loadingState, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.spinner }), (0, jsx_runtime_1.jsx)("span", { children: "\u0110ang t\u1EA3i d\u1EEF li\u1EC7u\u2026" })] })) : ((0, jsx_runtime_1.jsxs)("table", { className: table_module_css_1.default.table, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.headRow, children: [(0, jsx_runtime_1.jsx)("th", { className: table_module_css_1.default.thStt, children: "#" }), (0, jsx_runtime_1.jsx)(SortTh, { label: "M\u00E3 PB", sortKey: "code", current: sortKey, dir: sortDir, onSort: handleSort, className: table_module_css_1.default.thCode }), (0, jsx_runtime_1.jsx)(SortTh, { label: "T\u00EAn Ph\u00F2ng Ban", sortKey: "name", current: sortKey, dir: sortDir, onSort: handleSort }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Ph\u00F2ng Ban C\u1EA5p Tr\u00EAn", sortKey: "parentName", current: sortKey, dir: sortDir, onSort: handleSort }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Tr\u1EA1ng Th\u00E1i", sortKey: "active", current: sortKey, dir: sortDir, onSort: handleSort, className: table_module_css_1.default.thStatus }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Ghi Ch\u00FA", sortKey: "note", current: sortKey, dir: sortDir, onSort: handleSort }), (0, jsx_runtime_1.jsx)("th", { className: table_module_css_1.default.thAction, children: "Thao T\u00E1c" })] }), (0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.filterRow, children: [(0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.code, placeholder: "T\u00ECm m\u00E3\u2026", onChange: setF('code') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.name, placeholder: "T\u00ECm t\u00EAn\u2026", onChange: setF('name') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.parentName, placeholder: "T\u00ECm c\u1EA5p tr\u00EAn\u2026", onChange: setF('parentName') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.statusFilterSelect, value: col.active, onChange: e => setCol(p => ({ ...p, active: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), (0, jsx_runtime_1.jsx)("option", { value: "true", children: "\u25CF Ho\u1EA1t \u0111\u1ED9ng" }), (0, jsx_runtime_1.jsx)("option", { value: "false", children: "\u25CF V\u00F4 hi\u1EC7u" })] }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.note, placeholder: "Ghi ch\u00FA\u2026", onChange: setF('note') }) }), (0, jsx_runtime_1.jsx)("th", {})] })] }), (0, jsx_runtime_1.jsx)("tbody", { children: filtered.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: 7, className: table_module_css_1.default.noResult, children: ["Kh\u00F4ng c\u00F3 k\u1EBFt qu\u1EA3. ", (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.linkBtn, onClick: clearFilters, children: "X\u00F3a b\u1ED9 l\u1ECDc" })] }) })) : filtered.map((r, i) => ((0, jsx_runtime_1.jsxs)("tr", { style: { opacity: r.active ? 1 : 0.55 }, children: [(0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.tdStt, children: i + 1 }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.codeBadge, children: r.code }) }), (0, jsx_runtime_1.jsx)("td", { style: { fontWeight: 500 }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { children: r.parentName
                                            ? (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.codeBadge, style: { background: 'var(--accent-muted, #e8f0fe)', color: 'var(--accent, #2563eb)' }, children: r.parentName })
                                            : (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.tdCenter, children: (0, jsx_runtime_1.jsx)("span", { className: r.active ? table_module_css_1.default.badgeActive : table_module_css_1.default.badgeInactive, children: r.active ? '● Hoạt động' : '● Vô hiệu' }) }), (0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.noteCell, children: r.note || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconEdit, onClick: () => openEdit(r), title: "Ch\u1EC9nh s\u1EEDa", children: (0, jsx_runtime_1.jsx)(icons_1.IconEdit, {}) }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconToggle, onClick: () => toggleActive(r.id), title: r.active ? 'Vô hiệu hóa' : 'Kích hoạt', children: (0, jsx_runtime_1.jsx)(icons_1.IconToggle, {}) }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconDelete, onClick: () => setDeleteId(r.id), title: "X\u00F3a", children: (0, jsx_runtime_1.jsx)(icons_1.IconDelete, {}) })] }) })] }, r.id))) })] })) })] }));
}
