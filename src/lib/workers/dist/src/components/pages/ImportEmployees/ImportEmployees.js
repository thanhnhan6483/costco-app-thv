"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImportEmployees;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const table_module_css_1 = __importDefault(require("@/styles/table.module.css"));
const ImportEmployees_module_css_1 = __importDefault(require("./ImportEmployees.module.css"));
const icons_1 = require("@/lib/icons");
const AppContext_1 = require("@/context/AppContext");
const IconDownload = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), (0, jsx_runtime_1.jsx)("polyline", { points: "7 10 12 15 17 10" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }));
const IconUpload = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), (0, jsx_runtime_1.jsx)("polyline", { points: "17 8 12 3 7 8" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "3", x2: "12", y2: "15" })] }));
const DAY_COUNT = 31;
const BLANK = {
    code: '', name: '', departmentId: '', specialGroup: '',
    groupCodeEndDate: '', workdays: '', overtimeHours: '',
    lateMinutes: '', phepNam: '',
    days: Array(DAY_COUNT).fill(''),
};
function getDay(emp, i) {
    return emp[`day_${i + 1}`] ?? '';
}
/** Parse giá trị số từ string. Trả về NaN nếu rỗng/không phải số. */
function numVal(s) { return s?.trim() ? parseFloat(s) : NaN; }
function ColFilter({ value, placeholder, onChange }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(icons_1.IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.colFilterInput, value: value, placeholder: placeholder, onChange: e => onChange(e.target.value) }), value && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.colFilterClear, onClick: () => onChange(''), type: "button", children: (0, jsx_runtime_1.jsx)(icons_1.IconClearX, {}) })] }));
}
function SortTh({ label, sortKey, current, onSort, className }) {
    const active = current?.key === sortKey;
    const icon = active ? (current.dir === 'asc' ? '▲' : '▼') : '⇅';
    return ((0, jsx_runtime_1.jsxs)("th", { className: className, onClick: () => onSort(sortKey), style: { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }, title: active ? (current.dir === 'asc' ? 'Nhấn để đảo thứ tự' : 'Nhấn để bỏ sort') : 'Nhấn để sắp xếp', children: [label, (0, jsx_runtime_1.jsx)("span", { style: { marginLeft: 4, fontSize: 9, opacity: active ? 1 : 0.35, color: active ? '#2563eb' : 'inherit', verticalAlign: 'middle' }, children: icon })] }));
}
const LIMIT_OPTIONS = [
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1000', value: 1000 },
    { label: 'Tất cả', value: 99999 },
];
// ── Limit selector component ───────────────────────
function LimitSelector({ total, shown, limit, onLimit }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsxs)("span", { style: { fontSize: '0.76rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }, children: ["Hi\u1EC3n ", (0, jsx_runtime_1.jsx)("strong", { children: shown }), " / ", (0, jsx_runtime_1.jsx)("strong", { children: total }), " NV"] }), (0, jsx_runtime_1.jsx)("select", { value: limit, onChange: e => onLimit(Number(e.target.value)), style: {
                    height: 26, padding: '0 6px', border: '1px solid var(--gray-200)',
                    borderRadius: 5, fontSize: '0.76rem', color: 'var(--gray-600)',
                    background: '#fff', cursor: 'pointer', outline: 'none',
                }, children: LIMIT_OPTIONS.map(o => ((0, jsx_runtime_1.jsx)("option", { value: o.value, children: o.label }, o.value))) })] }));
}
function ImportEmployees() {
    const { activeMonthId } = (0, AppContext_1.useApp)();
    const [rows, setRows] = (0, react_1.useState)([]);
    const [depts, setDepts] = (0, react_1.useState)([]);
    const [groups, setGroups] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [limit, setLimit] = (0, react_1.useState)(100);
    const [total, setTotal] = (0, react_1.useState)(0);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [form, setForm] = (0, react_1.useState)(BLANK);
    const [deleteId, setDeleteId] = (0, react_1.useState)(null);
    const [clearAll, setClearAll] = (0, react_1.useState)(false);
    const [relinking, setRelinking] = (0, react_1.useState)(false);
    const [relinkResult, setRelinkResult] = (0, react_1.useState)(null);
    const [importing, setImporting] = (0, react_1.useState)(false);
    const [importResult, setImportResult] = (0, react_1.useState)(null);
    const fileRef = (0, react_1.useRef)(null);
    // ── Selection & Bulk edit ──────────────────────
    const [selectedIds, setSelectedIds] = (0, react_1.useState)(new Set());
    const [bulkSaving, setBulkSaving] = (0, react_1.useState)(false);
    const [bulkForm, setBulkForm] = (0, react_1.useState)({ departmentId: '', maPb: '', specialGroup: '', groupCodeEndDate: '' });
    const [showBulkEdit, setShowBulkEdit] = (0, react_1.useState)(false);
    const [col, setCol] = (0, react_1.useState)({ code: '', name: '', departmentName: '', specialGroup: '' });
    const setF = (k) => (v) => setCol(p => ({ ...p, [k]: v }));
    const hasFilter = Object.values(col).some(v => v !== '');
    const [sort, setSort] = (0, react_1.useState)(null);
    const toggleSort = (key) => setSort(prev => prev?.key === key ? (prev.dir === 'asc' ? { key: key, dir: 'desc' } : null) : { key: key, dir: 'asc' });
    const loadWithLimit = (0, react_1.useCallback)(async (lim) => {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch(`/api/employees?month=${activeMonthId}&page=1&limit=${lim}`);
            const json = await r.json();
            setRows(json.data ?? []);
            setTotal(json.total ?? 0);
            setLimit(lim);
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    }, [activeMonthId]);
    const load = (0, react_1.useCallback)(async () => {
        setLoading(true);
        setError(null);
        try {
            const [empRes, deptRes, grpRes] = await Promise.all([
                fetch(`/api/employees?month=${activeMonthId}&page=1&limit=${limit}`),
                fetch(`/api/departments?month=${activeMonthId}`),
                fetch(`/api/special-groups?month=${activeMonthId}`),
            ]);
            const empJson = await empRes.json();
            setRows(empJson.data ?? []);
            setTotal(empJson.total ?? 0);
            const deptJson = await deptRes.json();
            setDepts(Array.isArray(deptJson) ? deptJson : []);
            setGroups((await grpRes.json()).map((g) => ({ code: g.code, name: g.name })));
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    }, [activeMonthId, limit]);
    (0, react_1.useEffect)(() => { load(); }, [load]);
    // col.departmentName: '' = tất cả | '__EMPTY__' = chưa có PB | tên/code = tìm kiếm
    const filtered = (0, react_1.useMemo)(() => rows.filter(r => {
        if (col.code && !r.code.toLowerCase().includes(col.code.toLowerCase()))
            return false;
        if (col.name && !r.name.toLowerCase().includes(col.name.toLowerCase()))
            return false;
        if (col.departmentName === '__EMPTY__') {
            if (r.departmentName)
                return false;
        }
        else if (col.departmentName) {
            const q = col.departmentName.toLowerCase();
            const match = (r.departmentName ?? '').toLowerCase().includes(q) ||
                (r.departmentCode ?? '').toLowerCase().includes(q) ||
                (r.maPb ?? '').toLowerCase().includes(q);
            if (!match)
                return false;
        }
        if (col.specialGroup === '__EMPTY__') {
            if (r.specialGroupName || r.specialGroup)
                return false;
        }
        else if (col.specialGroup) {
            const q = col.specialGroup.toLowerCase();
            const match = (r.specialGroupName ?? '').toLowerCase().includes(q) ||
                (r.specialGroup ?? '').toLowerCase().includes(q);
            if (!match)
                return false;
        }
        return true;
    }), [rows, col]);
    const clearFilters = () => setCol({ code: '', name: '', departmentName: '', specialGroup: '' });
    const sorted = (0, react_1.useMemo)(() => {
        if (!sort)
            return filtered;
        return [...filtered].sort((a, b) => {
            const va = String(a[sort.key] ?? '');
            const vb = String(b[sort.key] ?? '');
            const cmp = va.localeCompare(vb, 'vi', { numeric: true });
            return sort.dir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sort]);
    // ── Selection helpers ─────────────────────────────
    const allVisibleIds = (0, react_1.useMemo)(() => sorted.map(r => r.id), [sorted]);
    const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
    const isIndeterminate = !isAllSelected && allVisibleIds.some(id => selectedIds.has(id));
    const toggleAll = () => {
        if (isAllSelected)
            setSelectedIds(new Set());
        else
            setSelectedIds(new Set(allVisibleIds));
    };
    const toggleRow = (id) => setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    // ── Bulk export (client-side) ─────────────────────
    const exportSelected = async () => {
        const sel = sorted.filter(r => selectedIds.has(r.id));
        const XLSX = await Promise.resolve().then(() => __importStar(require('xlsx')));
        const header = ['employee_code', 'employee_name', 'department_code', 'department_name',
            'group_code', 'group_name', 'group_code_end_date', 'workdays',
            ...Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`),
            'overtime_hours', 'late_minutes', 'phep_nam', 'ngay_nghi_thang_truoc'];
        const data = sel.map(r => [
            r.code, r.name, r.departmentCode ?? '', r.departmentName ?? '',
            r.specialGroup, r.specialGroupName ?? '', r.groupCodeEndDate, r.workdays,
            ...Array.from({ length: 31 }, (_, i) => getDay(r, i)),
            r.overtimeHours, r.lateMinutes, r.phepNam, r.ngayNghiCuoiThangTruoc ?? '',
        ]);
        const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
        ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 8 }, ...Array(31).fill({ wch: 5 }), { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DS_chon_loc');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ds_nhan_vien_chon_loc_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    };
    // ── Bulk update ───────────────────────────────────
    const doBulkUpdate = async () => {
        if (selectedIds.size === 0)
            return;
        const payload = {};
        if (bulkForm.departmentId !== '') {
            payload.departmentId = bulkForm.departmentId;
            payload.maPb = bulkForm.maPb;
        }
        if (bulkForm.specialGroup !== '')
            payload.specialGroup = bulkForm.specialGroup;
        if (bulkForm.groupCodeEndDate !== '')
            payload.groupCodeEndDate = bulkForm.groupCodeEndDate;
        if (Object.keys(payload).length === 0)
            return alert('Chưa chọn trường nào để cập nhật.');
        setBulkSaving(true);
        try {
            const res = await fetch('/api/employees/bulk', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selectedIds], ...payload }),
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            setShowBulkEdit(false);
            setBulkForm({ departmentId: '', maPb: '', specialGroup: '', groupCodeEndDate: '' });
            setSelectedIds(new Set());
            await load();
        }
        catch (err) {
            alert('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
        }
        finally {
            setBulkSaving(false);
        }
    };
    const openCreate = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
    const openEdit = (r) => {
        setForm({
            code: r.code, name: r.name, departmentId: r.departmentId,
            specialGroup: r.specialGroup, groupCodeEndDate: r.groupCodeEndDate,
            workdays: r.workdays, overtimeHours: r.overtimeHours,
            lateMinutes: r.lateMinutes, phepNam: r.phepNam,
            days: Array.from({ length: DAY_COUNT }, (_, i) => getDay(r, i)),
        });
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
                const res = await fetch(`/api/employees/${editId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
                if (!res.ok)
                    throw new Error((await res.json()).error);
            }
            else {
                const res = await fetch('/api/employees', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        await fetch(`/api/employees/${deleteId}`, { method: 'DELETE' });
        await load();
        setSaving(false);
        setDeleteId(null);
    };
    const doClearAll = async () => {
        setSaving(true);
        try {
            await fetch(`/api/employees?month=${activeMonthId}`, { method: 'DELETE' });
            await load();
        }
        catch { /* ignore */ }
        finally {
            setSaving(false);
            setClearAll(false);
        }
    };
    const doRelink = async () => {
        setRelinking(true);
        try {
            const res = await fetch(`/api/employees/relink?month=${activeMonthId}`, { method: 'POST' });
            const data = await res.json();
            setRelinkResult(data);
            await load();
        }
        catch { /* ignore */ }
        finally {
            setRelinking(false);
        }
    };
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setImporting(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('monthId', activeMonthId);
            const res = await fetch('/api/employees/import', { method: 'POST', body: fd });
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: ImportEmployees_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBar, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarLeft, children: [error && (0, jsx_runtime_1.jsxs)("span", { className: table_module_css_1.default.errorChip, children: ["\u26A0 ", error] }), !error && ((0, jsx_runtime_1.jsx)(LimitSelector, { total: total, shown: rows.length, limit: limit, onLimit: loadWithLimit })), hasFilter && !error && (0, jsx_runtime_1.jsxs)("button", { className: table_module_css_1.default.btnClearAll, onClick: clearFilters, children: ["\u2715 X\u00F3a l\u1ECDc (", filtered.length, "/", rows.length, ")"] }), selectedIds.size > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: ImportEmployees_module_css_1.default.bulkCount, children: ["\u2714 ", selectedIds.size, " \u0111\u00E3 ch\u1ECDn"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.actionBarRight, children: [(0, jsx_runtime_1.jsxs)("button", { className: table_module_css_1.default.btnAction, onClick: () => window.open('/api/employees/import', '_blank'), title: "T\u1EA3i m\u1EABu Excel", children: [(0, jsx_runtime_1.jsx)(IconDownload, {}), (0, jsx_runtime_1.jsx)("span", { children: "T\u1EA3i M\u1EABu" })] }), (0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${table_module_css_1.default.btnActionGreen}`, onClick: () => fileRef.current?.click(), disabled: importing, children: [importing ? (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.spinning, children: (0, jsx_runtime_1.jsx)(IconUpload, {}) }) : (0, jsx_runtime_1.jsx)(IconUpload, {}), (0, jsx_runtime_1.jsx)("span", { children: importing ? 'Đang import…' : 'Import Excel' })] }), selectedIds.size > 0 ? ((0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${ImportEmployees_module_css_1.default.btnExportAction}`, onClick: exportSelected, title: "Xu\u1EA5t c\u00E1c d\u00F2ng \u0111\u00E3 ch\u1ECDn", children: [(0, jsx_runtime_1.jsx)(IconDownload, {}), (0, jsx_runtime_1.jsxs)("span", { children: ["Xu\u1EA5t Excel (", selectedIds.size, ")"] })] })) : ((0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${ImportEmployees_module_css_1.default.btnExportAction}`, onClick: () => window.open(`/api/employees/export?month=${activeMonthId}`, '_blank'), disabled: loading || rows.length === 0, title: "Xu\u1EA5t to\u00E0n b\u1ED9 danh s\u00E1ch", children: [(0, jsx_runtime_1.jsx)(IconDownload, {}), (0, jsx_runtime_1.jsx)("span", { children: "Xu\u1EA5t Excel" })] })), (0, jsx_runtime_1.jsx)("input", { ref: fileRef, type: "file", accept: ".xlsx,.xls", style: { display: 'none' }, onChange: handleFileChange }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV }), selectedIds.size > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${ImportEmployees_module_css_1.default.btnRelinkAction}`, onClick: () => { setBulkForm({ departmentId: '', maPb: '', specialGroup: '', groupCodeEndDate: '' }); setShowBulkEdit(true); }, children: ["\u270F\uFE0F ", (0, jsx_runtime_1.jsx)("span", { children: "C\u1EADp nh\u1EADt" })] }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV })] })), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnAction, onClick: load, disabled: loading, children: (0, jsx_runtime_1.jsx)("span", { className: loading ? table_module_css_1.default.spinning : '', children: (0, jsx_runtime_1.jsx)(icons_1.IconRefresh, {}) }) }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsxs)("button", { className: `${table_module_css_1.default.btnAction} ${ImportEmployees_module_css_1.default.btnDangerAction}`, onClick: () => setClearAll(true), disabled: loading || rows.length === 0, title: "X\u00F3a to\u00E0n b\u1ED9 d\u1EEF li\u1EC7u nh\u00E2n vi\u00EAn", children: ["\uD83D\uDDD1 ", (0, jsx_runtime_1.jsx)("span", { children: "X\u00F3a T\u1EA5t C\u1EA3" })] })] })] }), showBulkEdit && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: () => setShowBulkEdit(false), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, style: { maxWidth: 460 }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("h3", { className: table_module_css_1.default.confirmTitle, children: ["\u270F\uFE0F C\u1EADp nh\u1EADt ", selectedIds.size, " nh\u00E2n vi\u00EAn"] }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: 12, color: 'var(--gray-500)', marginBottom: 16 }, children: "Ch\u1EC9 \u0111i\u1EC1n v\u00E0o tr\u01B0\u1EDDng mu\u1ED1n thay \u0111\u1ED5i \u2014 tr\u01B0\u1EDDng \u0111\u1EC3 tr\u1ED1ng s\u1EBD kh\u00F4ng b\u1ECB c\u1EADp nh\u1EADt." }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }, children: ["Ph\u00F2ng Ban", (0, jsx_runtime_1.jsxs)("select", { className: ImportEmployees_module_css_1.default.deptFilterSelect, style: { marginTop: 6, maxWidth: '100%' }, value: bulkForm.departmentId, onChange: e => { const d = depts.find(d => d.id === e.target.value); setBulkForm(f => ({ ...f, departmentId: e.target.value, maPb: d?.code ?? '' })); }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "(Gi\u1EEF nguy\u00EAn)" }), depts.map(d => (0, jsx_runtime_1.jsxs)("option", { value: d.id, children: [d.code, " \u2013 ", d.name] }, d.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { style: { fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }, children: ["Nh\u00F3m \u0110\u1EB7c Th\u00F9", (0, jsx_runtime_1.jsxs)("select", { className: ImportEmployees_module_css_1.default.deptFilterSelect, style: { marginTop: 6, maxWidth: '100%' }, value: bulkForm.specialGroup, onChange: e => setBulkForm(f => ({ ...f, specialGroup: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "(Gi\u1EEF nguy\u00EAn)" }), groups.map(g => (0, jsx_runtime_1.jsxs)("option", { value: g.code, children: [g.code, " \u2013 ", g.name] }, g.code))] })] }), (0, jsx_runtime_1.jsxs)("label", { style: { fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }, children: ["Ng\u00E0y KT Nh\u00F3m", (0, jsx_runtime_1.jsx)("input", { type: "text", className: table_module_css_1.default.input, style: { marginTop: 6 }, placeholder: "(Gi\u1EEF nguy\u00EAn)", value: bulkForm.groupCodeEndDate, onChange: e => setBulkForm(f => ({ ...f, groupCodeEndDate: e.target.value })) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmActions, style: { marginTop: 24 }, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnSecondary, onClick: () => setShowBulkEdit(false), children: "H\u1EE7y" }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnPrimary, onClick: doBulkUpdate, disabled: bulkSaving, children: bulkSaving ? 'Đang lưu…' : `Lưu ${selectedIds.size} dòng` })] })] }) })), clearAll && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: "\u26A0\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "X\u00F3a to\u00E0n b\u1ED9 nh\u00E2n vi\u00EAn?" }), (0, jsx_runtime_1.jsxs)("p", { className: table_module_css_1.default.confirmDesc, children: ["H\u00E0nh \u0111\u1ED9ng n\u00E0y s\u1EBD x\u00F3a ", (0, jsx_runtime_1.jsxs)("strong", { children: ["t\u1EA5t c\u1EA3 ", rows.length, " nh\u00E2n vi\u00EAn"] }), " kh\u1ECFi h\u1EC7 th\u1ED1ng.", (0, jsx_runtime_1.jsx)("br", {}), "D\u1EEF li\u1EC7u ", (0, jsx_runtime_1.jsx)("strong", { children: "kh\u00F4ng th\u1EC3 kh\u00F4i ph\u1EE5c" }), ". B\u1EA1n c\u00F3 ch\u1EAFc ch\u1EAFn?"] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmActions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnDanger, onClick: doClearAll, disabled: saving, children: saving ? 'Đang xóa…' : `🗑️ Xóa ${rows.length} nhân viên` }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnSecondary, onClick: () => setClearAll(false), disabled: saving, children: "H\u1EE7y" })] })] }) })), showForm && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: e => e.target === e.currentTarget && closeForm(), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formModal, style: { maxWidth: 680 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formHeader, children: [(0, jsx_runtime_1.jsx)("h2", { className: table_module_css_1.default.formTitle, children: editId ? '✏️ Sửa nhân viên' : '➕ Thêm nhân viên' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.formClose, onClick: closeForm, children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: table_module_css_1.default.form, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["M\u00E3 NV ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.code, onChange: e => setForm(f => ({ ...f, code: e.target.value })), placeholder: "NV001", required: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsxs)("label", { className: table_module_css_1.default.label, children: ["T\u00EAn Nh\u00E2n Vi\u00EAn ", (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.required, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "Nguy\u1EC5n V\u0103n A", required: true })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ph\u00F2ng Ban" }), (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.input, value: form.departmentId, onChange: e => setForm(f => ({ ...f, departmentId: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\u2014 Ch\u1ECDn ph\u00F2ng ban \u2014" }), depts.map(d => (0, jsx_runtime_1.jsxs)("option", { value: d.id, children: [d.code, " \u2013 ", d.name] }, d.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Nh\u00F3m" }), (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.input, value: form.specialGroup, onChange: e => setForm(f => ({ ...f, specialGroup: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "\u2014 Kh\u00F4ng c\u00F3 \u2014" }), groups.map(g => (0, jsx_runtime_1.jsxs)("option", { value: g.code, children: [g.code, " \u2013 ", g.name] }, g.code))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.row2, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ng\u00E0y KT Nh\u00F3m" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.groupCodeEndDate, onChange: e => setForm(f => ({ ...f, groupCodeEndDate: e.target.value })), placeholder: "DD/MM/YYYY" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ng\u00E0y C\u00F4ng" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.workdays, onChange: e => setForm(f => ({ ...f, workdays: e.target.value })), placeholder: "VD: 26" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "K\u00FD hi\u1EC7u ch\u1EA5m c\u00F4ng (1\u201331)" }), (0, jsx_runtime_1.jsx)("div", { className: ImportEmployees_module_css_1.default.dayGrid, children: Array.from({ length: DAY_COUNT }, (_, i) => ((0, jsx_runtime_1.jsxs)("div", { className: ImportEmployees_module_css_1.default.dayCell, children: [(0, jsx_runtime_1.jsx)("span", { className: ImportEmployees_module_css_1.default.dayLabel, children: i + 1 }), (0, jsx_runtime_1.jsx)("input", { className: ImportEmployees_module_css_1.default.dayInput, maxLength: 4, value: form.days[i], onChange: e => setForm(f => {
                                                            const d = [...f.days];
                                                            d[i] = e.target.value;
                                                            return { ...f, days: d };
                                                        }) })] }, i))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.row2, style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "T\u0103ng Ca (gi\u1EDD)" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.overtimeHours, onChange: e => setForm(f => ({ ...f, overtimeHours: e.target.value })), placeholder: "0" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Tr\u1EC5 (ph\u00FAt)" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.lateMinutes, onChange: e => setForm(f => ({ ...f, lateMinutes: e.target.value })), placeholder: "0" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.field, style: { maxWidth: 200 }, children: [(0, jsx_runtime_1.jsx)("label", { className: table_module_css_1.default.label, children: "Ph\u00E9p N\u0103m" }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.input, value: form.phepNam, onChange: e => setForm(f => ({ ...f, phepNam: e.target.value })), placeholder: "0" })] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.formActions, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", className: table_module_css_1.default.btnPrimary, disabled: saving, children: saving ? 'Đang lưu…' : editId ? '💾 Lưu' : '✅ Thêm' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: table_module_css_1.default.btnSecondary, onClick: closeForm, children: "H\u1EE7y" })] })] })] }) })), deleteId && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: "\uD83D\uDDD1\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "X\u00E1c nh\u1EADn x\u00F3a" }), (0, jsx_runtime_1.jsxs)("p", { className: table_module_css_1.default.confirmDesc, children: ["X\u00F3a nh\u00E2n vi\u00EAn ", (0, jsx_runtime_1.jsx)("strong", { children: rows.find(r => r.id === deleteId)?.name }), "?"] }), (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmActions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnDanger, onClick: doDelete, disabled: saving, children: saving ? 'Đang xóa…' : '🗑️ Xóa' }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnSecondary, onClick: () => setDeleteId(null), children: "H\u1EE7y" })] })] }) })), relinkResult && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: () => setRelinkResult(null), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, style: { maxWidth: 400 }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: relinkResult.linked > 0 ? '🔗' : 'ℹ️' }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "K\u1EBFt qu\u1EA3 Li\u00EAn k\u1EBFt PB" }), (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'left', fontSize: 13.5, lineHeight: 1.9, marginBottom: 20 }, children: [(0, jsx_runtime_1.jsxs)("p", { children: ["\uD83D\uDD0D \u0110\u00E3 ki\u1EC3m tra: ", (0, jsx_runtime_1.jsx)("strong", { children: relinkResult.totalChecked }), " nh\u00E2n vi\u00EAn ch\u01B0a c\u00F3 PB"] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u2705 Li\u00EAn k\u1EBFt th\u00E0nh c\u00F4ng: ", (0, jsx_runtime_1.jsx)("strong", { children: relinkResult.linked })] }), relinkResult.notFound.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { color: 'var(--gray-500)', fontWeight: 600 }, children: ["\u26A0 M\u00E3 PB ch\u01B0a c\u00F3 trong h\u1EC7 th\u1ED1ng (", relinkResult.notFound.length, "):"] }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: 12, color: 'var(--gray-400)', fontFamily: 'monospace', wordBreak: 'break-all' }, children: relinkResult.notFound.join(', ') }), (0, jsx_runtime_1.jsxs)("p", { style: { fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }, children: ["\u2192 Vui l\u00F2ng th\u00EAm c\u00E1c M\u00E3 PB n\u00E0y v\u00E0o ", (0, jsx_runtime_1.jsx)("strong", { children: "Ph\u00E2n h\u1EC7 Ph\u00F2ng Ban" }), " r\u1ED3i ch\u1EA1y l\u1EA1i."] })] }))] }), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmActions, children: (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnPrimary, onClick: () => setRelinkResult(null), children: "\u0110\u00F3ng" }) })] }) })), importResult && ((0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.formOverlay, onClick: () => setImportResult(null), children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.confirmModal, style: { maxWidth: 560 }, onClick: e => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmIcon, children: importResult.errors.length > 0 ? '⚠️' : importResult.unmappedDept?.length > 0 ? '🔔' : '✅' }), (0, jsx_runtime_1.jsx)("h3", { className: table_module_css_1.default.confirmTitle, children: "K\u1EBFt qu\u1EA3 Import" }), (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'left', fontSize: 13.5, lineHeight: 1.8, marginBottom: 12 }, children: [(0, jsx_runtime_1.jsxs)("p", { children: ["\u2705 \u0110\u00E3 th\u00EAm: ", (0, jsx_runtime_1.jsx)("strong", { children: importResult.inserted }), " nh\u00E2n vi\u00EAn"] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u23ED B\u1ECF qua (tr\u00F9ng m\u00E3): ", (0, jsx_runtime_1.jsx)("strong", { children: importResult.skipped }), importResult.skippedCodes?.length > 0 && (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 12, color: 'var(--gray-500)', marginLeft: 6 }, children: ["(", importResult.skippedCodes.join(', '), ")"] })] }), importResult.errors.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--danger)', fontWeight: 600 }, children: "\u274C L\u1ED7i:" }), (0, jsx_runtime_1.jsx)("ul", { style: { paddingLeft: 16, color: 'var(--danger)', fontSize: 12 }, children: importResult.errors.map((e, i) => (0, jsx_runtime_1.jsx)("li", { children: e }, i)) })] }))] }), importResult.unmappedDept?.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 4, marginBottom: 16 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                        background: '#fff7ed', border: '1px solid #fed7aa',
                                        borderRadius: 8, padding: '10px 14px', marginBottom: 10,
                                    }, children: [(0, jsx_runtime_1.jsxs)("p", { style: { fontWeight: 600, color: '#c2410c', fontSize: 13, marginBottom: 4 }, children: ["\u26A0\uFE0F ", importResult.unmappedDept.length, " nh\u00E2n vi\u00EAn ch\u01B0a x\u00E1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c Ph\u00F2ng Ban"] }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: 12, color: '#9a3412' }, children: "M\u00E3 ph\u00F2ng ban trong file kh\u00F4ng kh\u1EDBp v\u1EDBi danh s\u00E1ch Ph\u00F2ng Ban trong h\u1EC7 th\u1ED1ng. D\u1EEF li\u1EC7u v\u1EABn \u0111\u01B0\u1EE3c import \u2014 vui l\u00F2ng b\u1ED5 sung ph\u00F2ng ban v\u00E0 li\u00EAn k\u1EBFt l\u1EA1i sau." })] }), (0, jsx_runtime_1.jsx)("div", { style: { maxHeight: 200, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 6 }, children: (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: '#f8fafc', position: 'sticky', top: 0 }, children: [(0, jsx_runtime_1.jsx)("th", { style: { padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: 600, color: 'var(--gray-600)' }, children: "M\u00E3 NV" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: 600, color: 'var(--gray-600)' }, children: "T\u00EAn Nh\u00E2n Vi\u00EAn" }), (0, jsx_runtime_1.jsx)("th", { style: { padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--gray-200)', fontWeight: 600, color: '#c2410c' }, children: "M\u00E3 PB (ch\u01B0a t\u1ED3n t\u1EA1i)" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: importResult.unmappedDept.map((e, i) => ((0, jsx_runtime_1.jsxs)("tr", { style: { background: i % 2 === 0 ? '#fff' : '#fafafa' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '5px 10px', borderBottom: '1px solid var(--gray-100)', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }, children: e.code }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '5px 10px', borderBottom: '1px solid var(--gray-100)' }, children: e.name }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '5px 10px', borderBottom: '1px solid var(--gray-100)', fontFamily: 'monospace', color: '#c2410c', fontWeight: 700 }, children: e.deptCode })] }, i))) })] }) })] })), (0, jsx_runtime_1.jsx)("div", { className: table_module_css_1.default.confirmActions, children: (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnPrimary, onClick: () => setImportResult(null), children: "\u0110\u00F3ng" }) })] }) })), (0, jsx_runtime_1.jsx)("div", { className: ImportEmployees_module_css_1.default.tableCard, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.loadingState, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.spinner }), (0, jsx_runtime_1.jsx)("span", { children: "\u0110ang t\u1EA3i\u2026" })] })) : ((0, jsx_runtime_1.jsx)("div", { className: ImportEmployees_module_css_1.default.tableWrap, children: (0, jsx_runtime_1.jsxs)("table", { className: ImportEmployees_module_css_1.default.table, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { className: ImportEmployees_module_css_1.default.headRow, children: [(0, jsx_runtime_1.jsx)("th", { className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thCheck}`, children: (0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: ImportEmployees_module_css_1.default.checkInput, checked: isAllSelected, ref: el => { if (el)
                                                        el.indeterminate = isIndeterminate; }, onChange: toggleAll, title: isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }) }), (0, jsx_runtime_1.jsx)("th", { className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thStt}  ${ImportEmployees_module_css_1.default.s0}`, children: "#" }), (0, jsx_runtime_1.jsx)(SortTh, { label: "M\u00C3 NV", sortKey: "code", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thCode} ${ImportEmployees_module_css_1.default.s1}` }), (0, jsx_runtime_1.jsx)(SortTh, { label: "T\u00CAN NH\u00C2N VI\u00CAN", sortKey: "name", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thName} ${ImportEmployees_module_css_1.default.s2}` }), (0, jsx_runtime_1.jsx)(SortTh, { label: "PH\u00D2NG BAN", sortKey: "departmentName", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thDept}` }), (0, jsx_runtime_1.jsx)(SortTh, { label: "NH\u00D3M \u0110\u1EB6C TH\u00D9", sortKey: "specialGroupName", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thGroup}` }), (0, jsx_runtime_1.jsx)(SortTh, { label: "NG\u00C0Y K\u1EBET TH\u00DAC", sortKey: "groupCodeEndDate", current: sort, onSort: toggleSort, className: ImportEmployees_module_css_1.default.th }), (0, jsx_runtime_1.jsx)(SortTh, { label: "NG\u00C0Y C\u00D4NG", sortKey: "workdays", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thCenter}` }), Array.from({ length: DAY_COUNT }, (_, i) => ((0, jsx_runtime_1.jsx)("th", { className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thDay}`, children: i + 1 }, i))), (0, jsx_runtime_1.jsx)(SortTh, { label: "T\u0102NG CA", sortKey: "overtimeHours", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thCenter}` }), (0, jsx_runtime_1.jsx)(SortTh, { label: "TR\u1EC4 (ph)", sortKey: "lateMinutes", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thCenter}` }), (0, jsx_runtime_1.jsx)(SortTh, { label: "PH\u00C9P N\u0102M", sortKey: "phepNam", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thCenter}` }), (0, jsx_runtime_1.jsx)(SortTh, { label: "NGH\u1EC8 TH\u00C1NG TR\u01AF\u1EDAC", sortKey: "ngayNghiCuoiThangTruoc", current: sort, onSort: toggleSort, className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thCenter}` }), (0, jsx_runtime_1.jsx)("th", { className: `${ImportEmployees_module_css_1.default.th} ${ImportEmployees_module_css_1.default.thAction}`, children: "THAO T\u00C1C" })] }), (0, jsx_runtime_1.jsxs)("tr", { className: ImportEmployees_module_css_1.default.filterRow, children: [(0, jsx_runtime_1.jsx)("th", { className: ImportEmployees_module_css_1.default.thCheck }), (0, jsx_runtime_1.jsx)("th", { className: ImportEmployees_module_css_1.default.s0 }), (0, jsx_runtime_1.jsx)("th", { className: ImportEmployees_module_css_1.default.s1, children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.code, placeholder: "M\u00E3\u2026", onChange: setF('code') }) }), (0, jsx_runtime_1.jsx)("th", { className: ImportEmployees_module_css_1.default.s2, children: (0, jsx_runtime_1.jsx)(ColFilter, { value: col.name, placeholder: "T\u00EAn\u2026", onChange: setF('name') }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: ImportEmployees_module_css_1.default.deptFilterSelect, value: col.departmentName, onChange: e => setCol(p => ({ ...p, departmentName: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), (0, jsx_runtime_1.jsx)("option", { value: "__EMPTY__", children: "\u26A0\uFE0F Ch\u01B0a c\u00F3 PB" }), depts.map(d => ((0, jsx_runtime_1.jsxs)("option", { value: d.name, children: [d.code, " \u2013 ", d.name] }, d.id)))] }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: ImportEmployees_module_css_1.default.deptFilterSelect, value: col.specialGroup, onChange: e => setCol(p => ({ ...p, specialGroup: e.target.value })), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), groups.map(g => ((0, jsx_runtime_1.jsxs)("option", { value: g.name, children: [g.code, " \u2013 ", g.name] }, g.code)))] }) }), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), "  ", Array.from({ length: DAY_COUNT }, (_, i) => (0, jsx_runtime_1.jsx)("th", {}, i)), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {}), (0, jsx_runtime_1.jsx)("th", {})] })] }), (0, jsx_runtime_1.jsx)("tbody", { children: sorted.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsxs)("td", { colSpan: DAY_COUNT + 12, className: ImportEmployees_module_css_1.default.noResult, children: [rows.length === 0 ? 'Chưa có nhân viên. Nhấn Thêm Mới hoặc Import Excel.' : 'Không tìm thấy.', hasFilter && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.linkBtn, onClick: clearFilters, children: " X\u00F3a b\u1ED9 l\u1ECDc" })] }) })) : sorted.map((r, i) => ((0, jsx_runtime_1.jsxs)("tr", { className: `${i % 2 === 0 ? ImportEmployees_module_css_1.default.rowEven : ImportEmployees_module_css_1.default.rowOdd} ${selectedIds.has(r.id) ? ImportEmployees_module_css_1.default.rowSelected : ''}`, children: [(0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.thCheck}`, children: (0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: ImportEmployees_module_css_1.default.checkInput, checked: selectedIds.has(r.id), onChange: () => toggleRow(r.id) }) }), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdStt} ${ImportEmployees_module_css_1.default.s0}`, children: i + 1 }), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdCode} ${ImportEmployees_module_css_1.default.s1}`, children: r.code }), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdName} ${ImportEmployees_module_css_1.default.s2}`, children: r.name }), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${r.departmentName ? '' : ImportEmployees_module_css_1.default.tdNoDept}`, children: r.departmentName || '' }), (0, jsx_runtime_1.jsx)("td", { className: ImportEmployees_module_css_1.default.td, children: r.specialGroupName || '' }), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdMono} ${r.specialGroup && !r.groupCodeEndDate ? ImportEmployees_module_css_1.default.tdNoEndDate : ''}`, children: r.groupCodeEndDate || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (() => {
                                            const n = numVal(r.workdays);
                                            const warn = !isNaN(n) && n <= 0;
                                            return ((0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdNum} ${warn ? ImportEmployees_module_css_1.default.tdWarnVal : ''}`, children: r.workdays || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }));
                                        })(), Array.from({ length: DAY_COUNT }, (_, j) => {
                                            const val = getDay(r, j);
                                            return ((0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdDay} ${val ? ImportEmployees_module_css_1.default.tdDayFilled : ''}`, children: val || (0, jsx_runtime_1.jsx)("span", { className: ImportEmployees_module_css_1.default.dot, children: "\u00B7" }) }, j));
                                        }), (() => {
                                            const n = numVal(r.overtimeHours);
                                            const warn = !isNaN(n) && n < 0;
                                            return ((0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdNum} ${warn ? ImportEmployees_module_css_1.default.tdWarnVal : ''}`, children: r.overtimeHours || '—' }));
                                        })(), (() => {
                                            const n = numVal(r.lateMinutes);
                                            const warn = !isNaN(n) && n < 0;
                                            return ((0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdNum} ${warn ? ImportEmployees_module_css_1.default.tdWarnVal : ''}`, children: r.lateMinutes || '—' }));
                                        })(), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdNum}`, children: r.phepNam || '—' }), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdNum} ${r.ngayNghiCuoiThangTruoc ? ImportEmployees_module_css_1.default.tdNghiCTT : ''}`, children: r.ngayNghiCuoiThangTruoc || (0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.noNote, children: "\u2014" }) }), (0, jsx_runtime_1.jsx)("td", { className: `${ImportEmployees_module_css_1.default.td} ${ImportEmployees_module_css_1.default.tdAction}`, children: (0, jsx_runtime_1.jsxs)("div", { className: ImportEmployees_module_css_1.default.actions, children: [(0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconEdit, onClick: () => openEdit(r), title: "S\u1EEDa", children: (0, jsx_runtime_1.jsx)(icons_1.IconEdit, {}) }), (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.btnIconDelete, onClick: () => setDeleteId(r.id), title: "X\u00F3a", children: (0, jsx_runtime_1.jsx)(icons_1.IconDelete, {}) })] }) })] }, r.id))) })] }) })) })] }));
}
