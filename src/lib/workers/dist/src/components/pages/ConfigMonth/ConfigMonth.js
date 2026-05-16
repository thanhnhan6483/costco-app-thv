"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConfigMonth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ConfigMonth_module_css_1 = __importDefault(require("./ConfigMonth.module.css"));
const AppContext_1 = require("@/context/AppContext");
/* ── helpers ─────────────────────────────────────── */
function daysInMonth(monthStr) {
    const [m, y] = monthStr.split('/').map(Number);
    return new Date(y, m, 0).getDate();
}
function defaultFrom(monthStr) {
    if (!monthStr)
        return '';
    const [m, y] = monthStr.split('/');
    return `01/${m}/${y}`;
}
function defaultTo(monthStr) {
    if (!monthStr)
        return '';
    const [m, y] = monthStr.split('/').map(Number);
    const last = daysInMonth(`${m}/${y}`);
    return `${String(last).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
const BLANK = { label: '', month: '', fromDate: '', toDate: '', note: '' };
/* ── SVG Icons ───────────────────────────────────── */
const IconEdit = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), (0, jsx_runtime_1.jsx)("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] }));
const IconDelete = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("polyline", { points: "3 6 5 6 21 6" }), (0, jsx_runtime_1.jsx)("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }), (0, jsx_runtime_1.jsx)("path", { d: "M10 11v6" }), (0, jsx_runtime_1.jsx)("path", { d: "M14 11v6" }), (0, jsx_runtime_1.jsx)("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" })] }));
const IconSearch = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "11", cy: "11", r: "8" }), (0, jsx_runtime_1.jsx)("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }));
const IconClearX = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.8", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), (0, jsx_runtime_1.jsx)("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }));
const IconCopy = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), (0, jsx_runtime_1.jsx)("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }));
const IconPlus = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), (0, jsx_runtime_1.jsx)("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }));
const IconExport = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), (0, jsx_runtime_1.jsx)("polyline", { points: "7 10 12 15 17 10" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }));
const IconRefresh = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("polyline", { points: "23 4 23 10 17 10" }), (0, jsx_runtime_1.jsx)("path", { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })] }));
/* ── ColFilterInput ──────────────────────────────── */
function ColFilterInput({ value, placeholder, onChange }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: ConfigMonth_module_css_1.default.colFilterInput, value: value, placeholder: placeholder, onChange: e => onChange(e.target.value) }), value && ((0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.colFilterClear, onClick: () => onChange(''), type: "button", children: (0, jsx_runtime_1.jsx)(IconClearX, {}) }))] }));
}
/* ── Main component ──────────────────────────────── */
function ConfigMonth() {
    const { currentMonth, refreshMonthList, activeMonthId } = (0, AppContext_1.useApp)();
    const highlightRef = (0, react_1.useRef)(null);
    const [entries, setEntries] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)(BLANK);
    const [deleteId, setDeleteId] = (0, react_1.useState)(null);
    /* ID tháng nguồn để sao chép cấu hình khi tạo mới */
    const [copyFromMonthId, setCopyFromMonthId] = (0, react_1.useState)('');
    const [showCopy, setShowCopy] = (0, react_1.useState)(false);
    const [copyFrom, setCopyFrom] = (0, react_1.useState)('');
    const [copyTo, setCopyTo] = (0, react_1.useState)('');
    const [col, setCol] = (0, react_1.useState)({ label: '', month: '', fromDate: '', toDate: '', note: '' });
    const setColField = (key) => (val) => setCol(p => ({ ...p, [key]: val }));
    const hasAnyFilter = Object.values(col).some(v => v !== '');
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
    /* ── Fetch from API ─────────────────────────── */
    const fetchMonths = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/months');
            if (!res.ok)
                throw new Error(await res.text());
            setEntries(await res.json());
        }
        catch (e) {
            setError('Không thể tải dữ liệu: ' + (e instanceof Error ? e.message : String(e)));
        }
        finally {
            setLoading(false);
        }
    }, []);
    (0, react_1.useEffect)(() => { fetchMonths(); }, [fetchMonths]);
    // Scroll đến hàng được highlight khi tháng chọn thay đổi
    (0, react_1.useEffect)(() => {
        if (highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentMonth, entries]);
    /* ── Filtered + sorted rows ──────────────────── */
    const filtered = (0, react_1.useMemo)(() => {
        const base = entries.filter(en => (!col.label || en.label.toLowerCase().includes(col.label.toLowerCase()))
            && (!col.month || en.month.includes(col.month))
            && (!col.fromDate || en.fromDate.includes(col.fromDate))
            && (!col.toDate || en.toDate.includes(col.toDate))
            && (!col.note || en.note.toLowerCase().includes(col.note.toLowerCase())));
        if (!sortKey)
            return base;
        return [...base].sort((a, b) => {
            const va = String(a[sortKey] ?? '').toLowerCase();
            const vb = String(b[sortKey] ?? '').toLowerCase();
            return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
        });
    }, [entries, col, sortKey, sortDir]);
    const clearAllFilters = () => setCol({ label: '', month: '', fromDate: '', toDate: '', note: '' });
    /* ── Form helpers ───────────────────────────── */
    const handleMonthChange = (val) => setForm(f => ({ ...f, month: val, fromDate: defaultFrom(val), toDate: defaultTo(val) }));
    const openCreate = () => { setForm(BLANK); setEditId(null); setCopyFromMonthId(''); setShowForm(true); };
    const openEdit = (en) => {
        setForm({ label: en.label, month: en.month, fromDate: en.fromDate, toDate: en.toDate, note: en.note });
        setEditId(en.id);
        setCopyFromMonthId('');
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); setCopyFromMonthId(''); };
    /* ── Submit (Create / Update) ───────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.month || !form.fromDate || !form.toDate)
            return;
        setSaving(true);
        try {
            if (editId) {
                // UPDATE
                const res = await fetch(`/api/months/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ label: form.label, fromDate: form.fromDate, toDate: form.toDate, note: form.note }),
                });
                if (!res.ok)
                    throw new Error((await res.json()).error);
            }
            else {
                // CREATE
                const newEntry = {
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
            refreshMonthList(); // cập nhật Topbar
            closeForm();
        }
        catch (err) {
            alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
        }
        finally {
            setSaving(false);
        }
    };
    /* ── Delete ─────────────────────────────────── */
    const confirmDelete = (0, react_1.useCallback)((id) => setDeleteId(id), []);
    const doDelete = async () => {
        if (!deleteId)
            return;
        setSaving(true);
        try {
            await fetch(`/api/months/${deleteId}`, { method: 'DELETE' });
            await fetchMonths();
            refreshMonthList(); // cập nhật Topbar
        }
        finally {
            setSaving(false);
            setDeleteId(null);
        }
    };
    /* ── Copy month ─────────────────────────────── */
    const handleCopy = async (e) => {
        e.preventDefault();
        if (!copyFrom || !copyTo)
            return;
        setSaving(true);
        try {
            // 1. Tạo record tháng mới
            const newEntry = {
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
            if (!createRes.ok)
                throw new Error((await createRes.json()).error);
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
            setShowCopy(false);
            setCopyFrom('');
            setCopyTo('');
        }
        catch (err) {
            alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
        }
        finally {
            setSaving(false);
        }
    };
    /* ── Month options ──────────────────────────── */
    const monthOptions = Array.from({ length: 24 }, (_, i) => {
        const d = new Date(2025, i, 1);
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    });
    /* ── Render ─────────────────────────────────── */
    return ((0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.actionBar, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.actionBarLeft, children: [error && ((0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.errorChip, children: ["\u26A0 ", error] })), hasAnyFilter && !error && ((0, jsx_runtime_1.jsxs)("button", { className: ConfigMonth_module_css_1.default.btnClearAll, onClick: clearAllFilters, children: ["\u2715 X\u00F3a b\u1ED9 l\u1ECDc (", filtered.length, "/", entries.length, ")"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.actionBarRight, children: [(0, jsx_runtime_1.jsxs)("button", { className: `${ConfigMonth_module_css_1.default.btnAction} ${ConfigMonth_module_css_1.default.btnActionPrimary}`, onClick: openCreate, disabled: loading, title: "Th\u00EAm th\u00E1ng m\u1EDBi", children: [(0, jsx_runtime_1.jsx)(IconPlus, {}), (0, jsx_runtime_1.jsx)("span", { children: "Th\u00EAm M\u1EDBi" })] }), (0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsxs)("button", { className: ConfigMonth_module_css_1.default.btnAction, onClick: () => setShowCopy(true), disabled: loading, title: "Sao ch\u00E9p c\u1EA5u h\u00ECnh t\u1EEB th\u00E1ng kh\u00E1c", children: [(0, jsx_runtime_1.jsx)(IconCopy, {}), (0, jsx_runtime_1.jsx)("span", { children: "Sao Ch\u00E9p Th\u00E1ng" })] }), (0, jsx_runtime_1.jsxs)("button", { className: `${ConfigMonth_module_css_1.default.btnAction} ${ConfigMonth_module_css_1.default.btnActionGreen}`, title: "Xu\u1EA5t Excel", disabled: true, children: [(0, jsx_runtime_1.jsx)(IconExport, {}), (0, jsx_runtime_1.jsx)("span", { children: "Xu\u1EA5t Excel" })] }), (0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.btnAction, onClick: fetchMonths, disabled: loading, title: "T\u1EA3i l\u1EA1i d\u1EEF li\u1EC7u", children: (0, jsx_runtime_1.jsx)("span", { className: loading ? ConfigMonth_module_css_1.default.spinning : '', children: (0, jsx_runtime_1.jsx)(IconRefresh, {}) }) })] })] }), showCopy && ((0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.formOverlay, onClick: e => e.target === e.currentTarget && setShowCopy(false), children: (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.formModal, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.formHeader, children: [(0, jsx_runtime_1.jsx)("h2", { className: ConfigMonth_module_css_1.default.formTitle, children: "\uD83D\uDCCB Sao Ch\u00E9p Th\u00E1ng" }), (0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.formClose, onClick: () => setShowCopy(false), children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleCopy, className: ConfigMonth_module_css_1.default.form, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.copyInfo, children: ["Sao ch\u00E9p c\u1EA5u h\u00ECnh ca l\u00E0m vi\u1EC7c, ph\u00F2ng ban v\u00E0 quy t\u1EAFc ph\u00E2n b\u1ED5 sang th\u00E1ng m\u1EDBi. Danh s\u00E1ch nh\u00E2n vi\u00EAn ", (0, jsx_runtime_1.jsx)("strong", { children: "kh\u00F4ng" }), " \u0111\u01B0\u1EE3c sao ch\u00E9p."] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: ConfigMonth_module_css_1.default.label, children: ["Th\u00E1ng ngu\u1ED3n ", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsxs)("select", { className: ConfigMonth_module_css_1.default.select, value: copyFrom, onChange: e => setCopyFrom(e.target.value), required: true, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "-- Ch\u1ECDn th\u00E1ng --" }), entries.map(en => (0, jsx_runtime_1.jsx)("option", { value: en.month, children: en.month }, en.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: ConfigMonth_module_css_1.default.label, children: ["Th\u00E1ng \u0111\u00EDch ", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsxs)("select", { className: ConfigMonth_module_css_1.default.select, value: copyTo, onChange: e => setCopyTo(e.target.value), required: true, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "-- Ch\u1ECDn th\u00E1ng --" }), monthOptions.filter(m => !entries.some(en => en.month === m)).map(m => (0, jsx_runtime_1.jsx)("option", { value: m, children: m }, m))] }), (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.fieldHint, children: "Ch\u1EC9 hi\u1EC3n th\u1ECB th\u00E1ng ch\u01B0a c\u00F3 c\u1EA5u h\u00ECnh" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.formActions, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", className: ConfigMonth_module_css_1.default.btnPrimary, disabled: saving, children: saving ? 'Đang xử lý…' : '📋 Sao chép' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: ConfigMonth_module_css_1.default.btnSecondary, onClick: () => setShowCopy(false), children: "H\u1EE7y" })] })] })] }) })), showForm && ((0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.formOverlay, onClick: e => e.target === e.currentTarget && closeForm(), children: (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.formModal, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.formHeader, children: [(0, jsx_runtime_1.jsx)("h2", { className: ConfigMonth_module_css_1.default.formTitle, children: editId ? '✏️ Chỉnh sửa tháng' : '➕ Thêm tháng mới' }), (0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.formClose, onClick: closeForm, children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: ConfigMonth_module_css_1.default.form, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: ConfigMonth_module_css_1.default.label, children: ["T\u00EAn Th\u00E1ng ", (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 400, color: 'var(--gray-400)', fontSize: 11 }, children: "(t\u00F9y ch\u1ECDn)" })] }), (0, jsx_runtime_1.jsx)("input", { type: "text", className: ConfigMonth_module_css_1.default.input, placeholder: "VD: Th\u00E1ng 5 \u2013 Ch\u00EDnh th\u1EE9c, Th\u00E1ng khai tr\u01B0\u01A1ng\u2026", value: form.label, onChange: e => setForm(f => ({ ...f, label: e.target.value })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: ConfigMonth_module_css_1.default.label, children: ["Th\u00E1ng ", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsxs)("select", { className: ConfigMonth_module_css_1.default.select, value: form.month, onChange: e => handleMonthChange(e.target.value), required: true, disabled: !!editId, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "-- Ch\u1ECDn th\u00E1ng --" }), monthOptions.map(m => (0, jsx_runtime_1.jsx)("option", { value: m, children: m }, m))] }), editId && (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.fieldHint, children: "Kh\u00F4ng th\u1EC3 thay \u0111\u1ED5i th\u00E1ng khi ch\u1EC9nh s\u1EEDa" })] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: ConfigMonth_module_css_1.default.label, children: ["T\u1EEB ng\u00E0y ", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { type: "text", className: ConfigMonth_module_css_1.default.input, placeholder: "DD/MM/YYYY", value: form.fromDate, onChange: e => setForm(f => ({ ...f, fromDate: e.target.value })), required: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: ConfigMonth_module_css_1.default.label, children: ["\u0110\u1EBFn ng\u00E0y ", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { type: "text", className: ConfigMonth_module_css_1.default.input, placeholder: "DD/MM/YYYY", value: form.toDate, onChange: e => setForm(f => ({ ...f, toDate: e.target.value })), required: true })] })] }), !editId && ((0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: ConfigMonth_module_css_1.default.label, children: ["Sao ch\u00E9p c\u1EA5u h\u00ECnh t\u1EEB th\u00E1ng", (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 400, color: 'var(--gray-400)', fontSize: 11, marginLeft: 6 }, children: "(t\u00F9y ch\u1ECDn)" })] }), (0, jsx_runtime_1.jsxs)("select", { className: ConfigMonth_module_css_1.default.select, value: copyFromMonthId, onChange: e => setCopyFromMonthId(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\u2014 Kh\u00F4ng sao ch\u00E9p \u2014" }), entries.map(en => ((0, jsx_runtime_1.jsx)("option", { value: en.id, children: en.label ? `${en.label} (${en.month})` : en.month }, en.id)))] }), copyFromMonthId && ((0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.fieldHint, style: { color: 'var(--primary)' }, children: ["\u2713 S\u1EBD sao ch\u00E9p: Ph\u00F2ng Ban, Ca L\u00E0m Vi\u1EC7c, Lo\u1EA1i Ngh\u1EC9 Ph\u00E9p, Nh\u00F3m \u0110\u1EB7c Th\u00F9, Quy T\u1EAFc Ph\u00E2n B\u1ED5 \u00A0\u00B7\u00A0", (0, jsx_runtime_1.jsx)("em", { children: "Kh\u00F4ng sao ch\u00E9p nh\u00E2n vi\u00EAn" })] }))] })), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: ConfigMonth_module_css_1.default.label, children: "Ghi ch\u00FA" }), (0, jsx_runtime_1.jsx)("textarea", { className: ConfigMonth_module_css_1.default.textarea, rows: 3, placeholder: "Ghi ch\u00FA th\u00EAm v\u1EC1 th\u00E1ng n\u00E0y\u2026", value: form.note, onChange: e => setForm(f => ({ ...f, note: e.target.value })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.formActions, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", className: ConfigMonth_module_css_1.default.btnPrimary, disabled: saving, children: saving ? 'Đang lưu…' : editId ? '💾 Lưu thay đổi' : '✅ Thêm tháng' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: ConfigMonth_module_css_1.default.btnSecondary, onClick: closeForm, children: "H\u1EE7y" })] })] })] }) })), deleteId && ((0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.formOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.confirmModal, children: [(0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.confirmIcon, children: "\uD83D\uDDD1\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: ConfigMonth_module_css_1.default.confirmTitle, children: "X\u00E1c nh\u1EADn x\u00F3a" }), (0, jsx_runtime_1.jsxs)("p", { className: ConfigMonth_module_css_1.default.confirmDesc, children: ["B\u1EA1n c\u00F3 ch\u1EAFc mu\u1ED1n x\u00F3a th\u00E1ng", ' ', (0, jsx_runtime_1.jsx)("strong", { children: entries.find(e => e.id === deleteId)?.month }), "?", (0, jsx_runtime_1.jsx)("br", {}), "H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c."] }), (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.confirmActions, children: [(0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.btnDanger, onClick: doDelete, disabled: saving, children: saving ? 'Đang xóa…' : '🗑️ Xóa' }), (0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.btnSecondary, onClick: () => setDeleteId(null), children: "H\u1EE7y" })] })] }) })), (0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.tableCard, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.loadingState, children: [(0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.spinner }), (0, jsx_runtime_1.jsx)("span", { children: "\u0110ang t\u1EA3i d\u1EEF li\u1EC7u t\u1EEB DuckDB\u2026" })] })) : entries.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.empty, children: [(0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.emptyIcon, children: "\uD83D\uDCC5" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Ch\u01B0a c\u00F3 th\u00E1ng n\u00E0o. Nh\u1EA5n ", (0, jsx_runtime_1.jsx)("strong", { children: "+ Th\u00EAm M\u1EDBi" }), " \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u."] })] })) : ((0, jsx_runtime_1.jsxs)("table", { className: ConfigMonth_module_css_1.default.table, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { className: ConfigMonth_module_css_1.default.headRow, children: [(0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thStt, children: "#" }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thLabel, onClick: () => handleSort('label'), style: { cursor: 'pointer' }, children: (0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.thSortInner, children: ["T\u00EAn Th\u00E1ng", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.sortIcon, children: sortKey === 'label' ? (sortDir === 'asc' ? '↑' : '↓') : '↕' })] }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thMonth, onClick: () => handleSort('month'), style: { cursor: 'pointer' }, children: (0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.thSortInner, children: ["Th\u00E1ng", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.sortIcon, children: sortKey === 'month' ? (sortDir === 'asc' ? '↑' : '↓') : '↕' })] }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thDate, onClick: () => handleSort('fromDate'), style: { cursor: 'pointer' }, children: (0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.thSortInner, children: ["T\u1EEB Ng\u00E0y", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.sortIcon, children: sortKey === 'fromDate' ? (sortDir === 'asc' ? '↑' : '↓') : '↕' })] }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thDate, onClick: () => handleSort('toDate'), style: { cursor: 'pointer' }, children: (0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.thSortInner, children: ["\u0110\u1EBFn Ng\u00E0y", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.sortIcon, children: sortKey === 'toDate' ? (sortDir === 'asc' ? '↑' : '↓') : '↕' })] }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thDays, children: "S\u1ED1 Ng\u00E0y" }), (0, jsx_runtime_1.jsx)("th", { onClick: () => handleSort('note'), style: { cursor: 'pointer' }, children: (0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.thSortInner, children: ["Ghi Ch\u00FA", (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.sortIcon, children: sortKey === 'note' ? (sortDir === 'asc' ? '↑' : '↓') : '↕' })] }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thAction, children: "Thao T\u00E1c" })] }), (0, jsx_runtime_1.jsxs)("tr", { className: ConfigMonth_module_css_1.default.filterRow, children: [(0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thStt }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thLabel, children: (0, jsx_runtime_1.jsx)(ColFilterInput, { value: col.label, placeholder: "T\u00EAn th\u00E1ng\u2026", onChange: setColField('label') }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thMonth, children: (0, jsx_runtime_1.jsx)(ColFilterInput, { value: col.month, placeholder: "VD: 05/2026", onChange: setColField('month') }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thDate, children: (0, jsx_runtime_1.jsx)(ColFilterInput, { value: col.fromDate, placeholder: "DD/MM/YYYY", onChange: setColField('fromDate') }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thDate, children: (0, jsx_runtime_1.jsx)(ColFilterInput, { value: col.toDate, placeholder: "DD/MM/YYYY", onChange: setColField('toDate') }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thDays }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilterInput, { value: col.note, placeholder: "T\u00ECm ghi ch\u00FA\u2026", onChange: setColField('note') }) }), (0, jsx_runtime_1.jsx)("th", { className: ConfigMonth_module_css_1.default.thAction })] })] }), (0, jsx_runtime_1.jsx)("tbody", { children: filtered.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: 8, className: ConfigMonth_module_css_1.default.noResult, children: ["Kh\u00F4ng t\u00ECm th\u1EA5y k\u1EBFt qu\u1EA3.", ' ', (0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.linkBtn, onClick: clearAllFilters, children: "X\u00F3a b\u1ED9 l\u1ECDc" })] }) })) : filtered.map((en, i) => {
                                const days = daysInMonth(en.month);
                                const isActive = en.id === activeMonthId;
                                const isCurrentMonth = en.month === currentMonth;
                                return ((0, jsx_runtime_1.jsxs)("tr", { ref: isActive ? highlightRef : null, className: isActive ? ConfigMonth_module_css_1.default.rowSelected : '', children: [(0, jsx_runtime_1.jsx)("td", { className: ConfigMonth_module_css_1.default.tdStt, children: i + 1 }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.labelCell, children: [(0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.labelText, children: en.label || (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.noNote, children: "\u2014" }) }), isActive && (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.selectedTag, children: "\uD83D\uDCCC \u0110ang thao t\u00E1c" }), isCurrentMonth && !isActive && (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.selectedTag, style: { background: '#dcfce7', color: '#15803d' }, children: "\uD83D\uDCC5 Th\u00E1ng hi\u1EC7n t\u1EA1i" })] }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("div", { className: ConfigMonth_module_css_1.default.monthCell, children: (0, jsx_runtime_1.jsx)("span", { className: [
                                                        ConfigMonth_module_css_1.default.monthBadge,
                                                        isActive ? ConfigMonth_module_css_1.default.monthBadgeSelected : '',
                                                    ].filter(Boolean).join(' '), children: en.month }) }) }), (0, jsx_runtime_1.jsx)("td", { className: ConfigMonth_module_css_1.default.dateCell, children: en.fromDate }), (0, jsx_runtime_1.jsx)("td", { className: ConfigMonth_module_css_1.default.dateCell, children: en.toDate }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("span", { className: ConfigMonth_module_css_1.default.daysBadge, children: [days, " ng\u00E0y"] }) }), (0, jsx_runtime_1.jsx)("td", { className: ConfigMonth_module_css_1.default.noteCell, children: en.note || (0, jsx_runtime_1.jsx)("span", { className: ConfigMonth_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: ConfigMonth_module_css_1.default.actions, children: [(0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.btnIconEdit, onClick: () => openEdit(en), title: "Ch\u1EC9nh s\u1EEDa", children: (0, jsx_runtime_1.jsx)(IconEdit, {}) }), (0, jsx_runtime_1.jsx)("button", { className: ConfigMonth_module_css_1.default.btnIconDelete, onClick: () => confirmDelete(en.id), title: "X\u00F3a", children: (0, jsx_runtime_1.jsx)(IconDelete, {}) })] }) })] }, en.id));
                            }) })] })) })] }));
}
