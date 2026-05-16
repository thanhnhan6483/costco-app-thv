"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AllocRules;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const table_module_css_1 = __importDefault(require("@/styles/table.module.css"));
const icons_1 = require("@/lib/icons");
const AppContext_1 = require("@/context/AppContext");
const BLANK_FILTER = { groupCode: '', groupName: '', name: '', paramKey: '', defaultParam: '', specificValue: '' };
const BLANK_FORM = { groupCode: '', groupName: '', name: '', paramKey: '', defaultParam: '', specificValue: '' };
/* ── 4 nhóm quy tắc chuẩn ─────────────────── */
const PRESET_GROUPS = [
    { code: 'WORK_RULE', name: 'Quy tắc làm việc' },
    { code: 'SHIFT_BALANCING_RULE', name: 'Quy tắc phân bổ ca' },
    { code: 'OT_RULE', name: 'Quy tắc tăng ca' },
    { code: 'ATTENDANCE_RULE', name: 'Quy tắc chấm công' },
];
const GROUP_COLORS = {
    WORK_RULE: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    SHIFT_BALANCING_RULE: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    OT_RULE: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    ATTENDANCE_RULE: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};
function GroupBadge({ code }) {
    const c = GROUP_COLORS[code] ?? { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
    return ((0, jsx_runtime_1.jsx)("span", { style: {
            display: 'inline-block', padding: '2px 8px', borderRadius: 5,
            fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
            background: c.bg, color: c.text, border: `1px solid ${c.border}`,
        }, children: code }));
}
function ColFilter({ value, placeholder, onChange }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(icons_1.IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.colFilterInput, value: value, placeholder: placeholder, onChange: e => onChange(e.target.value) }), value && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.colFilterClear, onClick: () => onChange(''), type: "button", children: (0, jsx_runtime_1.jsx)(icons_1.IconClearX, {}) })] }));
}
/* ── Main component ─────────────────────────── */
function AllocRules() {
    const { activeMonthId } = (0, AppContext_1.useApp)();
    const [rows, setRows] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [col, setCol] = (0, react_1.useState)(BLANK_FILTER);
    const setF = (k) => (v) => setCol(p => ({ ...p, [k]: v }));
    const hasFilter = Object.values(col).some(v => v !== '');
    /* Form */
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)(BLANK_FORM);
    const [deleteId, setDeleteId] = (0, react_1.useState)(null);
    /* ── Fetch ──────────────────────────────── */
    const load = (0, react_1.useCallback)(async () => {
        setLoading(true);
        try {
            const data = await fetch(`/api/alloc-rules?month=${activeMonthId}`).then(r => r.json());
            setRows(Array.isArray(data) ? data : []);
        }
        finally {
            setLoading(false);
        }
    }, [activeMonthId]);
    (0, react_1.useEffect)(() => { load(); }, [load]);
    /* ── Filter ──────────────────────────────── */
    const filtered = (0, react_1.useMemo)(() => rows.filter(r => (!col.groupCode || r.groupCode.toLowerCase().includes(col.groupCode.toLowerCase())) &&
        (!col.groupName || r.groupName.toLowerCase().includes(col.groupName.toLowerCase())) &&
        (!col.name || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
        (!col.paramKey || (r.paramKey ?? '').toLowerCase().includes(col.paramKey.toLowerCase())) &&
        (!col.defaultParam || r.defaultParam.toLowerCase().includes(col.defaultParam.toLowerCase())) &&
        (!col.specificValue || r.specificValue.toLowerCase().includes(col.specificValue.toLowerCase()))), [rows, col]);
    /* ── Form helpers ────────────────────────── */
    const openCreate = (groupCode = '', groupName = '') => {
        setForm({ ...BLANK_FORM, groupCode, groupName });
        setEditId(null);
        setShowForm(true);
    };
    const openEdit = (r) => {
        setForm({
            groupCode: r.groupCode, groupName: r.groupName,
            name: r.name, paramKey: r.paramKey ?? '',
            defaultParam: r.defaultParam,
            specificValue: r.specificValue ?? '',
        });
        setEditId(r.id);
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK_FORM); };
    const handleGroupSelect = (code) => {
        const preset = PRESET_GROUPS.find(g => g.code === code);
        setForm(f => ({ ...f, groupCode: code, groupName: preset?.name ?? f.groupName }));
    };
    /* ── Submit ──────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                await fetch(`/api/alloc-rules/${editId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
            }
            else {
                const res = await fetch('/api/alloc-rules', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: `ar_${Date.now()}`, ...form,
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
    const toggleActive = async (id) => { await fetch(`/api/alloc-rules/${id}`, { method: 'PATCH' }); load(); };
    const doDelete = async () => {
        if (!deleteId)
            return;
        setSaving(true);
        await fetch(`/api/alloc-rules/${deleteId}`, { method: 'DELETE' });
        await load();
        setSaving(false);
        setDeleteId(null);
    };
    /* ── Render ─────────────────────────────── */
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBar, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarLeft, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }, children: [rows.length, " quy t\u1EAFc"] }), hasFilter && ((0, jsx_runtime_1.jsxs)("button", { className: table_module_css_1.default.btnClearAll, onClick: () => setCol(BLANK_FILTER), children: ["\u2715 X\u00F3a b\u1ED9 l\u1ECDc (", filtered.length, "/", rows.length, ")"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarRight, children: [(0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${table_module_css_1.default.btnActionPrimary}`, onClick: () => openCreate(), disabled: loading, children: [(0, jsx_runtime_1.jsx)(icons_1.IconPlus, {}), (0, jsx_runtime_1.jsx)("span", { children: "Th\u00EAm M\u1EDBi" })] }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnAction, onClick: load, disabled: loading, children: (0, jsx_runtime_1.jsx)("span", { className: loading ? table_module_css_1.default.spinning : '', children: (0, jsx_runtime_1.jsx)(icons_1.IconRefresh, {}) }) })] })] }), showForm && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: e => e.target === e.currentTarget && closeForm(), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formModal, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formHeader, children: [(0, jsx_runtime_1.jsx)("h2", { className: table_module_css_1.default.formTitle, children: editId ? '✏️ Sửa quy tắc' : '➕ Thêm quy tắc' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.formClose, onClick: closeForm, children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: table_module_css_1.default.form, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["Nh\u00F3m quy t\u1EAFc ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.select, value: form.groupCode, onChange: e => handleGroupSelect(e.target.value), required: true, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "-- Ch\u1ECDn nh\u00F3m --" }), PRESET_GROUPS.map(g => ((0, jsx_runtime_1.jsx)("option", { value: g.code, children: g.name }, g.code)))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["T\u00EAn quy t\u1EAFc ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "VD: Gi\u1EDBi h\u1EA1n ng\u00E0y l\u00E0m li\u00EAn t\u1EE5c", required: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "M\u00E3 quy t\u1EAFc (param_key)" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.paramKey, onChange: e => setForm(f => ({ ...f, paramKey: e.target.value })), placeholder: "VD: max_consecutive_days", style: { fontFamily: 'monospace' } })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Gi\u00E1 tr\u1ECB m\u1EB7c \u0111\u1ECBnh" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.defaultParam, onChange: e => setForm(f => ({ ...f, defaultParam: e.target.value })), placeholder: "VD: 6 ng\u00E0y" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ghi ch\u00FA" }), (0, jsx_runtime_1.jsx)("textarea", { className: table_module_css_1.default.textarea, rows: 3, value: form.specificValue, onChange: e => setForm(f => ({ ...f, specificValue: e.target.value })), placeholder: "Ghi ch\u00FA t\u1EF1 do\u2026" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formActions, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", className: table_module_css_1.default.btnPrimary, disabled: saving, children: saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: table_module_css_1.default.btnSecondary, onClick: closeForm, children: "H\u1EE7y" })] })] })] }) })), deleteId && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: "\uD83D\uDDD1\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "X\u00E1c nh\u1EADn x\u00F3a" }), (0, jsx_runtime_1.jsxs)("p", { className: table_module_css_1.default.confirmDesc, children: ["X\u00F3a quy t\u1EAFc ", (0, jsx_runtime_1.jsx)("strong", { children: rows.find(r => r.id === deleteId)?.name }), "?"] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmActions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnDanger, onClick: doDelete, disabled: saving, children: "\uD83D\uDDD1\uFE0F X\u00F3a" }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnSecondary, onClick: () => setDeleteId(null), children: "H\u1EE7y" })] })] }) })), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.tableCard, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.loadingState, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.spinner }), (0, jsx_runtime_1.jsx)("span", { children: "\u0110ang t\u1EA3i\u2026" })] })) : ((0, jsx_runtime_1.jsxs)("table", { className: table_module_css_1.default.table, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.headRow, children: [(0, jsx_runtime_1.jsx)("th", { className: table_module_css_1.default.thStt, children: "#" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 180 }, children: "M\u00C3 NH\u00D3M" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 160 }, children: "T\u00CAN NH\u00D3M" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 200 }, children: "QUY T\u1EAEC" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 160 }, children: "M\u00C3 QUY T\u1EAEC" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 140 }, children: "GI\u00C1 TR\u1ECA M\u1EB6C \u0110\u1ECANH" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 220 }, children: "GHI CH\u00DA" }), (0, jsx_runtime_1.jsx)("th", { className: table_module_css_1.default.thStatus, children: "TR\u1EA0NG TH\u00C1I" }), (0, jsx_runtime_1.jsx)("th", { className: table_module_css_1.default.thAction, children: "THAO T\u00C1C" })] }), (0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.filterRow, children: [(0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.groupCode, placeholder: "M\u00E3 nh\u00F3m\u2026", onChange: setF('groupCode') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.groupName, placeholder: "T\u00EAn nh\u00F3m\u2026", onChange: setF('groupName') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.name, placeholder: "Quy t\u1EAFc\u2026", onChange: setF('name') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.paramKey, placeholder: "M\u00E3\u2026", onChange: setF('paramKey') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.defaultParam, placeholder: "Gi\u00E1 tr\u1ECB\u2026", onChange: setF('defaultParam') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.specificValue, placeholder: "Ghi ch\u00FA\u2026", onChange: setF('specificValue') }) }), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {})] })] }), (0, jsx_runtime_1.jsx)("tbody", { children: filtered.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: 8, className: table_module_css_1.default.noResult, children: ["Kh\u00F4ng c\u00F3 k\u1EBFt qu\u1EA3.", hasFilter && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.linkBtn, onClick: () => setCol(BLANK_FILTER), children: " X\u00F3a b\u1ED9 l\u1ECDc" })] }) })) : filtered.map((r, i) => ((0, jsx_runtime_1.jsxs)("tr", { style: { opacity: r.active ? 1 : 0.5 }, children: [(0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.tdStt, children: i + 1 }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(GroupBadge, { code: r.groupCode }) }), (0, jsx_runtime_1.jsx)("td", { style: { fontWeight: 500, color: 'var(--gray-700)', fontSize: 13 }, children: r.groupName }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, color: 'var(--gray-800)', fontSize: 13 }, children: r.name }) }), (0, jsx_runtime_1.jsx)("td", { children: r.paramKey ? ((0, jsx_runtime_1.jsx)("span", { style: {
                                                display: 'inline-block', background: '#f8fafc', color: '#334155',
                                                border: '1px solid #e2e8f0', borderRadius: 4,
                                                padding: '2px 7px', fontSize: 11, fontWeight: 700,
                                                fontFamily: 'monospace', letterSpacing: '0.02em',
                                            }, children: r.paramKey })) : (0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--gray-300)', fontSize: 12 }, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                display: 'inline-block', background: '#f0fdf4', color: '#15803d',
                                                border: '1px solid #bbf7d0', borderRadius: 5,
                                                padding: '2px 8px', fontSize: 12, fontWeight: 600,
                                            }, children: r.defaultParam || '—' }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13, color: 'var(--gray-500)' }, children: r.specificValue || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }) }), (0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.tdCenter, children: (0, jsx_runtime_1.jsx)("span", { className: r.active ? table_module_css_1.default.badgeActive : table_module_css_1.default.badgeInactive, children: r.active ? '● Áp dụng' : '● Tắt' }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconEdit, onClick: () => openEdit(r), title: "S\u1EEDa", children: (0, jsx_runtime_1.jsx)(icons_1.IconEdit, {}) }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconToggle, onClick: () => toggleActive(r.id), title: r.active ? 'Tắt' : 'Bật', children: (0, jsx_runtime_1.jsx)(icons_1.IconToggle, {}) }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconDelete, onClick: () => setDeleteId(r.id), title: "X\u00F3a", children: (0, jsx_runtime_1.jsx)(icons_1.IconDelete, {}) })] }) })] }, r.id))) })] })) })] }));
}
