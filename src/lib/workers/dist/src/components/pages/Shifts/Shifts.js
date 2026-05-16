"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Shifts;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const table_module_css_1 = __importDefault(require("@/styles/table.module.css"));
const Shifts_module_css_1 = __importDefault(require("./Shifts.module.css"));
const icons_1 = require("@/lib/icons");
const AppContext_1 = require("@/context/AppContext");
const BLANK = {
    name: '', departmentId: '', isDefault: false, shiftType: 'Ca 1',
    windowStart: '', clockIn: '', clockOut: '', windowEnd: '',
    lateMinutes: 0, otThreshold: 0, otCalc: 'Tính từ giờ ra (công)', note: '',
};
const SHIFT_TYPES = ['Ca 1', 'Ca 2', 'Ca 3'];
const OT_CALC_OPTIONS = [
    'Tính từ giờ ra (công)',
    'Tính từ giờ vào (trưa)',
    'Tính từ giờ vào (tối)',
    'Không tính tăng ca',
];
/* ── Sub-components ───────────────────────────── */
function ColFilter({ value, placeholder, onChange }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(icons_1.IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.colFilterInput, value: value, placeholder: placeholder, onChange: e => onChange(e.target.value) }), value && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.colFilterClear, onClick: () => onChange(''), type: "button", children: (0, jsx_runtime_1.jsx)(icons_1.IconClearX, {}) })] }));
}
function SortTh({ label, sortKey, current, dir, onSort, className, }) {
    const active = current === sortKey;
    return ((0, jsx_runtime_1.jsx)("th", { className: `${table_module_css_1.default.thSortable}${active ? ` ${table_module_css_1.default.thSortActive}` : ''}${className ? ` ${className}` : ''}`, onClick: () => onSort(sortKey), children: (0, jsx_runtime_1.jsxs)("span", { className: table_module_css_1.default.thSortInner, children: [label, (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.sortIcon, children: active ? (dir === 'asc' ? '↑' : '↓') : '↕' })] }) }));
}
/* ── Main ─────────────────────────────────────── */
function Shifts() {
    const { activeMonthId } = (0, AppContext_1.useApp)();
    const [rows, setRows] = (0, react_1.useState)([]);
    const [depts, setDepts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)(BLANK);
    const [deleteId, setDeleteId] = (0, react_1.useState)(null);
    const [col, setCol] = (0, react_1.useState)({
        name: '', departmentId: '', isDefault: '', shiftType: '', otCalc: '',
    });
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
    /* fetch shifts */
    const load = (0, react_1.useCallback)(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/shifts?month=${activeMonthId}`);
            const data = await res.json();
            if (!res.ok)
                throw new Error(data?.error ?? 'Lỗi tải dữ liệu');
            setRows(Array.isArray(data) ? data : []);
        }
        catch (e) {
            console.error('[Shifts]', e);
            setRows([]);
        }
        finally {
            setLoading(false);
        }
    }, [activeMonthId]);
    /* fetch departments */
    const loadDepts = (0, react_1.useCallback)(async () => {
        try {
            const res = await fetch(`/api/departments?month=${activeMonthId}`);
            const data = await res.json();
            setDepts(Array.isArray(data) ? data.filter((d) => d.active) : []);
        }
        catch {
            setDepts([]);
        }
    }, [activeMonthId]);
    (0, react_1.useEffect)(() => { load(); loadDepts(); }, [load, loadDepts]);
    /* filter + sort */
    const filtered = (0, react_1.useMemo)(() => {
        const base = rows.filter(r => (!col.name || r.name.toLowerCase().includes(col.name.toLowerCase())) &&
            (!col.departmentId || r.departmentId === col.departmentId) &&
            (col.isDefault === '' || (col.isDefault === 'true' ? r.isDefault : !r.isDefault)) &&
            (!col.shiftType || r.shiftType === col.shiftType) &&
            (!col.otCalc || r.otCalc === col.otCalc));
        if (!sortKey)
            return base;
        const numCols = ['lateMinutes', 'otThreshold'];
        return [...base].sort((a, b) => {
            let va, vb;
            if (numCols.includes(sortKey)) {
                va = a[sortKey] ?? 0;
                vb = b[sortKey] ?? 0;
                return sortDir === 'asc' ? va - vb : vb - va;
            }
            if (sortKey === 'isDefault') {
                va = a.isDefault ? '1' : '0';
                vb = b.isDefault ? '1' : '0';
            }
            else if (sortKey === 'departmentName') {
                va = (a.departmentName ?? '').toLowerCase();
                vb = (b.departmentName ?? '').toLowerCase();
            }
            else {
                va = String(a[sortKey] ?? '').toLowerCase();
                vb = String(b[sortKey] ?? '').toLowerCase();
            }
            return sortDir === 'asc' ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
        });
    }, [rows, col, sortKey, sortDir]);
    const clearFilters = () => setCol({
        name: '', departmentId: '', isDefault: '', shiftType: '', otCalc: '',
    });
    /* form helpers */
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
    const openEdit = (r) => {
        setForm({
            name: r.name,
            departmentId: r.departmentId ?? '',
            isDefault: r.isDefault,
            shiftType: r.shiftType,
            windowStart: r.windowStart,
            clockIn: r.clockIn,
            clockOut: r.clockOut,
            windowEnd: r.windowEnd,
            lateMinutes: r.lateMinutes,
            otThreshold: r.otThreshold,
            otCalc: r.otCalc,
            note: r.note,
        });
        setEditId(r.id);
        setShowForm(true);
    };
    const closeForm = () => { setShowForm(false); setEditId(null); setForm(BLANK); };
    /* submit */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.clockIn || !form.clockOut)
            return;
        setSaving(true);
        try {
            const payload = { ...form, departmentId: form.departmentId || null };
            if (editId) {
                const res = await fetch(`/api/shifts/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!res.ok)
                    throw new Error((await res.json()).error);
            }
            else {
                const res = await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Date.now().toString(), ...payload, monthId: activeMonthId, createdAt: new Date().toISOString().slice(0, 10) }) });
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
    /* delete */
    const doDelete = async () => {
        if (!deleteId)
            return;
        setSaving(true);
        await fetch(`/api/shifts/${deleteId}`, { method: 'DELETE' });
        await load();
        setSaving(false);
        setDeleteId(null);
    };
    /* phòng ban có trong dữ liệu shifts */
    const availableDepts = (0, react_1.useMemo)(() => {
        const seen = new Set();
        rows.forEach(r => { if (r.departmentId)
            seen.add(r.departmentId); });
        return depts.filter(d => seen.has(d.id));
    }, [rows, depts]);
    /* dept lookup cho hiển thị badge trong bảng */
    const deptById = (0, react_1.useMemo)(() => {
        const m = {};
        depts.forEach(d => { m[d.id] = d; });
        return m;
    }, [depts]);
    /* loại ca có trong dữ liệu */
    const availableShiftTypes = (0, react_1.useMemo)(() => {
        const seen = new Set();
        rows.forEach(r => { if (r.shiftType)
            seen.add(r.shiftType); });
        return [...seen].sort((a, b) => a.localeCompare(b, 'vi'));
    }, [rows]);
    /* cách tính OT có trong dữ liệu */
    const availableOtCalcs = (0, react_1.useMemo)(() => {
        const seen = new Set();
        rows.forEach(r => { if (r.otCalc)
            seen.add(r.otCalc); });
        return [...seen].sort((a, b) => a.localeCompare(b, 'vi'));
    }, [rows]);
    /* ── Render ─────────────────────────────────── */
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBar, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.actionBarLeft, children: hasFilter && (0, jsx_runtime_1.jsxs)("button", { className: table_module_css_1.default.btnClearAll, onClick: clearFilters, children: ["\u2715 X\u00F3a b\u1ED9 l\u1ECDc (", filtered.length, "/", rows.length, ")"] }) }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarRight, children: [(0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${table_module_css_1.default.btnActionPrimary}`, onClick: openCreate, disabled: loading, children: [(0, jsx_runtime_1.jsx)(icons_1.IconPlus, {}), (0, jsx_runtime_1.jsx)("span", { children: "Th\u00EAm M\u1EDBi" })] }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnAction, onClick: () => { load(); loadDepts(); }, disabled: loading, children: (0, jsx_runtime_1.jsx)("span", { className: loading ? table_module_css_1.default.spinning : '', children: (0, jsx_runtime_1.jsx)(icons_1.IconRefresh, {}) }) })] })] }), showForm && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: e => e.target === e.currentTarget && closeForm(), children: (0, jsx_runtime_1.jsxs)("div", { className: `${table_module_css_1.default.formModal} ${Shifts_module_css_1.default.formWide}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formHeader, children: [(0, jsx_runtime_1.jsx)("h2", { className: table_module_css_1.default.formTitle, children: editId ? '✏️ Sửa ca làm việc' : '➕ Thêm ca làm việc' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.formClose, onClick: closeForm, children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: table_module_css_1.default.form, children: [(0, jsx_runtime_1.jsxs)("div", { className: Shifts_module_css_1.default.row3col, children: [(0, jsx_runtime_1.jsxs)("div", { className: `${table_module_css_1.default.field} ${Shifts_module_css_1.default.col2}`, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["T\u00EAn ca ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.name, onChange: e => setField('name', e.target.value), placeholder: "VD: B\u1ED8 PH\u1EACN T\u1ED4NG H\u1EE2P", required: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ph\u00F2ng ban" }), (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.input, value: form.departmentId, onChange: e => setField('departmentId', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\uD83C\uDFE2 Ca chung to\u00E0n c\u00F4ng ty (kh\u00F4ng g\u1EAFn ph\u00F2ng ban)" }), depts.map(d => ((0, jsx_runtime_1.jsxs)("option", { value: d.id, children: [d.code, " \u2013 ", d.name] }, d.id)))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: Shifts_module_css_1.default.row4col, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Lo\u1EA1i ca" }), (0, jsx_runtime_1.jsx)("select", { className: table_module_css_1.default.select, value: form.shiftType, onChange: e => setField('shiftType', e.target.value), children: SHIFT_TYPES.map(t => (0, jsx_runtime_1.jsx)("option", { value: t, children: t }, t)) })] }), (0, jsx_runtime_1.jsxs)("div", { className: `${table_module_css_1.default.field} ${Shifts_module_css_1.default.centerField}`, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "M\u1EB7c \u0111\u1ECBnh" }), (0, jsx_runtime_1.jsxs)("label", { className: Shifts_module_css_1.default.checkboxLabel, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: Shifts_module_css_1.default.checkbox, checked: form.isDefault, onChange: e => setField('isDefault', e.target.checked) }), (0, jsx_runtime_1.jsx)("span", { children: "\u0110\u1EB7t l\u00E0m ca m\u1EB7c \u0111\u1ECBnh" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: Shifts_module_css_1.default.sectionDivider, children: "\u23F1 C\u1EA5u h\u00ECnh gi\u1EDD l\u00E0m vi\u1EC7c" }), (0, jsx_runtime_1.jsxs)("div", { className: Shifts_module_css_1.default.row4col, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Gi\u1EDD v\u00E0o l\u00E0m (b\u1EAFt \u0111\u1EA7u)" }), (0, jsx_runtime_1.jsx)("input", { type: "time", className: table_module_css_1.default.input, value: form.windowStart, onChange: e => setField('windowStart', e.target.value) }), (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.fieldHint, children: "S\u1EDBm nh\u1EA5t c\u00F3 th\u1EC3 ch\u1EA5m v\u00E0o" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["Gi\u1EDD v\u00E0o l\u00E0m chu\u1EA9n ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { type: "time", className: table_module_css_1.default.input, value: form.clockIn, onChange: e => setField('clockIn', e.target.value), required: true }), (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.fieldHint, children: "Gi\u1EDD b\u1EAFt \u0111\u1EA7u l\u00E0m vi\u1EC7c" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["Gi\u1EDD tan l\u00E0m chu\u1EA9n ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { type: "time", className: table_module_css_1.default.input, value: form.clockOut, onChange: e => setField('clockOut', e.target.value), required: true }), (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.fieldHint, children: "Gi\u1EDD k\u1EBFt th\u00FAc l\u00E0m vi\u1EC7c" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Gi\u1EDD tan l\u00E0m (k\u1EBFt th\u00FAc)" }), (0, jsx_runtime_1.jsx)("input", { type: "time", className: table_module_css_1.default.input, value: form.windowEnd, onChange: e => setField('windowEnd', e.target.value) }), (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.fieldHint, children: "Mu\u1ED9n nh\u1EA5t t\u00EDnh c\u00F4ng" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: Shifts_module_css_1.default.sectionDivider, children: "\uD83D\uDCCA Quy t\u1EAFc t\u00EDnh t\u0103ng ca & tr\u1EC5" }), (0, jsx_runtime_1.jsxs)("div", { className: Shifts_module_css_1.default.row3col, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ph\u00FAt b\u1EAFt \u0111\u1EA7u t\u00EDnh tr\u1EC5" }), (0, jsx_runtime_1.jsxs)("div", { className: Shifts_module_css_1.default.inputWithUnit, children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 0, max: 120, className: table_module_css_1.default.input, value: form.lateMinutes, onChange: e => setField('lateMinutes', Number(e.target.value)) }), (0, jsx_runtime_1.jsx)("span", { className: Shifts_module_css_1.default.unit, children: "ph\u00FAt" })] }), (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.fieldHint, children: "0 = t\u00EDnh tr\u1EC5 ngay khi v\u00E0o mu\u1ED9n" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ph\u00FAt b\u1EAFt \u0111\u1EA7u t\u00EDnh t\u0103ng ca" }), (0, jsx_runtime_1.jsxs)("div", { className: Shifts_module_css_1.default.inputWithUnit, children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 0, max: 240, className: table_module_css_1.default.input, value: form.otThreshold, onChange: e => setField('otThreshold', Number(e.target.value)) }), (0, jsx_runtime_1.jsx)("span", { className: Shifts_module_css_1.default.unit, children: "ph\u00FAt" })] }), (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.fieldHint, children: "L\u00E0m th\u00EAm bao nhi\u00EAu ph\u00FAt m\u1EDBi t\u00EDnh OT" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "C\u00E1ch t\u00EDnh t\u0103ng ca" }), (0, jsx_runtime_1.jsx)("select", { className: table_module_css_1.default.select, value: form.otCalc, onChange: e => setField('otCalc', e.target.value), children: OT_CALC_OPTIONS.map(o => (0, jsx_runtime_1.jsx)("option", { value: o, children: o }, o)) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ghi ch\u00FA" }), (0, jsx_runtime_1.jsx)("textarea", { className: table_module_css_1.default.textarea, rows: 2, value: form.note, onChange: e => setField('note', e.target.value), placeholder: "Ghi ch\u00FA th\u00EAm\u2026" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formActions, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", className: table_module_css_1.default.btnPrimary, disabled: saving, children: saving ? 'Đang lưu…' : editId ? '💾 Lưu thay đổi' : '✅ Thêm ca' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: table_module_css_1.default.btnSecondary, onClick: closeForm, children: "H\u1EE7y" })] })] })] }) })), deleteId && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: "\uD83D\uDDD1\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "X\u00E1c nh\u1EADn x\u00F3a" }), (0, jsx_runtime_1.jsxs)("p", { className: table_module_css_1.default.confirmDesc, children: ["X\u00F3a ca ", (0, jsx_runtime_1.jsx)("strong", { children: rows.find(r => r.id === deleteId)?.name }), "?", (0, jsx_runtime_1.jsx)("br", {}), "H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c."] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmActions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnDanger, onClick: doDelete, disabled: saving, children: saving ? '…' : '🗑️ Xóa' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnSecondary, onClick: () => setDeleteId(null), children: "H\u1EE7y" })] })] }) })), (0, jsx_runtime_1.jsx)("div", { className: `${table_module_css_1.default.tableCard} ${Shifts_module_css_1.default.tableWrap}`, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.loadingState, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.spinner }), (0, jsx_runtime_1.jsx)("span", { children: "\u0110ang t\u1EA3i d\u1EEF li\u1EC7u\u2026" })] })) : ((0, jsx_runtime_1.jsxs)("table", { className: `${table_module_css_1.default.table} ${Shifts_module_css_1.default.tableFixed}`, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.headRow, children: [(0, jsx_runtime_1.jsx)("th", { className: Shifts_module_css_1.default.thStt, children: "#" }), (0, jsx_runtime_1.jsx)(SortTh, { label: "T\u00EAn Ca", sortKey: "name", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thName }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Ph\u00F2ng Ban", sortKey: "departmentName", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thDept }), (0, jsx_runtime_1.jsx)(SortTh, { label: "M\u1EB7c \u0110\u1ECBnh", sortKey: "isDefault", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thDefault }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Lo\u1EA1i Ca", sortKey: "shiftType", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thType }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Gi\u1EDD V\u00E0o (BD)", sortKey: "windowStart", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thTime }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Gi\u1EDD V\u00E0o", sortKey: "clockIn", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thTime }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Gi\u1EDD Tan", sortKey: "clockOut", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thTime }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Gi\u1EDD Tan (KT)", sortKey: "windowEnd", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thTime }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Ph\u00FAt Tr\u1EC5", sortKey: "lateMinutes", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thNum }), (0, jsx_runtime_1.jsx)(SortTh, { label: "Ph\u00FAt OT", sortKey: "otThreshold", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thNum }), (0, jsx_runtime_1.jsx)(SortTh, { label: "C\u00E1ch T\u00EDnh OT", sortKey: "otCalc", current: sortKey, dir: sortDir, onSort: handleSort, className: Shifts_module_css_1.default.thOtCalc }), (0, jsx_runtime_1.jsx)("th", { className: Shifts_module_css_1.default.thAction, children: "Thao T\u00E1c" })] }), (0, jsx_runtime_1.jsxs)("tr", { className: table_module_css_1.default.filterRow, children: [(0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.name, placeholder: "T\u00EAn ca\u2026", onChange: setF('name') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: Shifts_module_css_1.default.filterSelect, value: col.departmentId, onChange: e => setCol(p => ({ ...p, departmentId: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), availableDepts.map(d => ((0, jsx_runtime_1.jsxs)("option", { value: d.id, children: [d.code, " \u2013 ", d.name] }, d.id)))] }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: Shifts_module_css_1.default.filterSelect, value: col.isDefault, onChange: e => setCol(p => ({ ...p, isDefault: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), (0, jsx_runtime_1.jsx)("option", { value: "true", children: "\u2713 C\u00F3" }), (0, jsx_runtime_1.jsx)("option", { value: "false", children: "\u2014 Kh\u00F4ng" })] }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: Shifts_module_css_1.default.filterSelect, value: col.shiftType, onChange: e => setCol(p => ({ ...p, shiftType: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), availableShiftTypes.map(t => (0, jsx_runtime_1.jsx)("option", { value: t, children: t }, t))] }) }), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: Shifts_module_css_1.default.filterSelect, value: col.otCalc, onChange: e => setCol(p => ({ ...p, otCalc: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), availableOtCalcs.map(o => (0, jsx_runtime_1.jsx)("option", { value: o, children: o }, o))] }) }), (0, jsx_runtime_1.jsx)("th", {})] })] }), (0, jsx_runtime_1.jsx)("tbody", { children: filtered.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: 13, className: table_module_css_1.default.noResult, children: ["Kh\u00F4ng c\u00F3 k\u1EBFt qu\u1EA3. ", (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.linkBtn, onClick: clearFilters, children: "X\u00F3a b\u1ED9 l\u1ECDc" })] }) })) : filtered.map((r, i) => {
                                const dept = r.departmentId ? deptById[r.departmentId] : null;
                                return ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: `${table_module_css_1.default.tdStt} ${Shifts_module_css_1.default.tdStt}`, children: i + 1 }), (0, jsx_runtime_1.jsx)("td", { className: Shifts_module_css_1.default.tdName, children: r.name }), (0, jsx_runtime_1.jsx)("td", { className: Shifts_module_css_1.default.tdDept, children: dept
                                                ? dept.name
                                                : (0, jsx_runtime_1.jsx)("span", { style: { color: '#6b7280', fontStyle: 'italic' }, children: "Ca chung" }) }), (0, jsx_runtime_1.jsx)("td", { className: Shifts_module_css_1.default.tdCenter, children: r.isDefault ? (0, jsx_runtime_1.jsx)("span", { className: Shifts_module_css_1.default.checkMark, children: "\u2713" }) : (0, jsx_runtime_1.jsx)("span", { className: Shifts_module_css_1.default.dash, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: Shifts_module_css_1.default.typeBadge, "data-type": r.shiftType, children: r.shiftType }) }), (0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.timeCell, children: r.windowStart || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { className: `${table_module_css_1.default.timeCell} ${Shifts_module_css_1.default.timeMain}`, children: r.clockIn }), (0, jsx_runtime_1.jsx)("td", { className: `${table_module_css_1.default.timeCell} ${Shifts_module_css_1.default.timeMain}`, children: r.clockOut }), (0, jsx_runtime_1.jsx)("td", { className: table_module_css_1.default.timeCell, children: r.windowEnd || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { className: Shifts_module_css_1.default.tdNum, children: r.lateMinutes }), (0, jsx_runtime_1.jsx)("td", { className: Shifts_module_css_1.default.tdNum, children: r.otThreshold }), (0, jsx_runtime_1.jsx)("td", { className: Shifts_module_css_1.default.tdOtCalc, children: r.otCalc }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconEdit, onClick: () => openEdit(r), title: "Ch\u1EC9nh s\u1EEDa", children: (0, jsx_runtime_1.jsx)(icons_1.IconEdit, {}) }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconDelete, onClick: () => setDeleteId(r.id), title: "X\u00F3a", children: (0, jsx_runtime_1.jsx)(icons_1.IconDelete, {}) })] }) })] }, r.id));
                            }) })] })) })] }));
}
