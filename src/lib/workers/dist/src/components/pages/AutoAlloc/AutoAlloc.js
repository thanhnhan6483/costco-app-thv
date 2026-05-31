"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AutoAlloc;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AppContext_1 = require("@/context/AppContext");
const table_module_css_1 = __importDefault(require("@/styles/table.module.css"));
const AutoAlloc_module_css_1 = __importDefault(require("./AutoAlloc.module.css"));
const icons_1 = require("@/lib/icons");
/* ── Reusable inline filter row for grids ── */
function InlineFilterRow({ fCode, fName, fDept, setFCode, setFName, setFDept, deptList, extraBefore = 0, extraAfter = 0, daysCols = 31, codeThStyle, nameThStyle, monthLabel, fGroup, setFGroup, groupList, extraMiddle = 0 }) {
    return ((0, jsx_runtime_1.jsxs)("tr", { className: AutoAlloc_module_css_1.default.filterRow, children: [Array.from({ length: extraBefore }, (_, i) => (0, jsx_runtime_1.jsx)("th", {}, `b${i}`)), (0, jsx_runtime_1.jsx)("th", { style: codeThStyle, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(icons_1.IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.colFilterInput, value: fCode, placeholder: "M\u00E3\u2026", onChange: e => setFCode(e.target.value) }), fCode && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.colFilterClear, onClick: () => setFCode(''), type: "button", children: (0, jsx_runtime_1.jsx)(icons_1.IconClearX, {}) })] }) }), (0, jsx_runtime_1.jsx)("th", { style: nameThStyle, children: (0, jsx_runtime_1.jsxs)("div", { className: table_module_css_1.default.colFilter, children: [(0, jsx_runtime_1.jsx)("span", { className: table_module_css_1.default.colFilterIcon, children: (0, jsx_runtime_1.jsx)(icons_1.IconSearch, {}) }), (0, jsx_runtime_1.jsx)("input", { className: table_module_css_1.default.colFilterInput, value: fName, placeholder: "T\u00EAn\u2026", onChange: e => setFName(e.target.value) }), fName && (0, jsx_runtime_1.jsx)("button", { className: table_module_css_1.default.colFilterClear, onClick: () => setFName(''), type: "button", children: (0, jsx_runtime_1.jsx)(icons_1.IconClearX, {}) })] }) }), (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.statusFilterSelect, value: fDept, onChange: e => setFDept(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), deptList.map(d => (0, jsx_runtime_1.jsx)("option", { value: d, children: d }, d))] }) }), groupList && setFGroup !== undefined && (0, jsx_runtime_1.jsx)("th", { children: (0, jsx_runtime_1.jsxs)("select", { className: table_module_css_1.default.statusFilterSelect, value: fGroup ?? '', onChange: e => setFGroup(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "T\u1EA5t c\u1EA3" }), groupList.map(g => (0, jsx_runtime_1.jsx)("option", { value: g, children: g }, g))] }) }), Array.from({ length: extraMiddle }, (_, i) => (0, jsx_runtime_1.jsx)("th", {}, 'm' + i)), monthLabel ? (() => { const [mm, yyyy] = monthLabel.split('/'); return Array.from({ length: daysCols }, (_, di) => { const dow = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, di + 1).getDay(); const isSun = dow === 0, isSat = dow === 6; return (0, jsx_runtime_1.jsx)("th", { style: { fontSize: '0.6rem', fontWeight: 600, textAlign: 'center', color: isSun ? '#dc2626' : isSat ? '#2563eb' : '#64748b' }, children: DOW_SHORT[dow] }, 'd' + di); }); })() : Array.from({ length: daysCols }, (_, i) => (0, jsx_runtime_1.jsx)("th", {}, 'd' + i)), Array.from({ length: extraAfter }, (_, i) => (0, jsx_runtime_1.jsx)("th", {}, `a${i}`))] }));
}
function useDeptList(rows) {
    return (0, react_1.useMemo)(() => {
        const set = new Set();
        for (const r of rows) {
            if (r.deptName)
                set.add(r.deptName);
        }
        return [...set].sort((a, b) => a.localeCompare(b, 'vi'));
    }, [rows]);
}
function useGridFilter(rows, fCode, fName, fDept, fGroup = '') {
    return (0, react_1.useMemo)(() => rows.filter((r) => {
        if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase()))
            return false;
        if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase()))
            return false;
        if (fDept && String(r.deptName ?? '') !== fDept)
            return false;
        if (fGroup && String(r.specialGroup ?? '') !== fGroup)
            return false;
        return true;
    }), [rows, fCode, fName, fDept, fGroup]);
}
const IconPlay = () => (0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", fill: "currentColor", width: "14", height: "14", children: (0, jsx_runtime_1.jsx)("path", { d: "M8 5v14l11-7z" }) });
const IconCheck = () => (0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", fill: "currentColor", width: "13", height: "13", children: (0, jsx_runtime_1.jsx)("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) });
const IconDl = () => (0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", fill: "currentColor", width: "14", height: "14", children: (0, jsx_runtime_1.jsx)("path", { d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" }) });
const STEPS = [
    { num: 1, apiNum: 2, key: 'step2Done', label: 'Xem dữ liệu', icon: '📋', editable: false, viewOnly: false },
    { num: 2, apiNum: 1, key: 'step1Done', label: 'Phân bổ ngày công', icon: '📊', editable: false, viewOnly: false },
    { num: 3, apiNum: 4, key: 'step4Done', label: 'Chia ca', icon: '🗓️', editable: false, viewOnly: false },
    { num: 4, apiNum: 5, key: 'step5Done', label: 'Tăng ca/Đi trễ', icon: '⏱️', editable: false, viewOnly: false },
    { num: 5, apiNum: 6, key: 'step6Done', label: 'Giờ vào/ra', icon: '🕐', editable: false, viewOnly: false },
    { num: 6, apiNum: 7, key: 'step6Done', label: 'Kết quả', icon: '📈', editable: false, viewOnly: true },
];
const DAY_TYPE_COLOR = {
    0: '#16a34a', 1: '#64748b', 2: '#7c3aed', 3: '#dc2626',
    4: '#db2777', 5: '#0d9488', 6: '#ea580c', 7: '#2563eb', 8: '#6b7280', 9: '#0891b2',
};
// Code có nghĩa = mã từ SYMBOL_TO_CODE (engine): 0=X,1=LP,2=PN,3=Ô,4=TS,5=DS,6=O,7=NL,8=OF,9=P
const DAY_TYPE_LABEL = {
    0: 'Làm (X)', 1: 'Nghỉ lịch (LP)', 2: 'Phép năm (PN)', 3: 'Ốm (Ô)', 4: 'Thai sản (TS)',
    5: 'Dưỡng sức (DS)', 6: 'Không phép (O)', 7: 'Nghỉ lễ (NL)', 8: 'Thôi việc (OF)', 9: 'Có phép (P)',
};
const DT_BG = { 0: '#f0fdf4', 1: '#fefce8', 2: '#eff6ff', 3: '#fef2f2', 4: '#fdf2f8', 5: '#f0fdfa', 6: '#fff7ed', 7: '#f7fee7', 8: '#f8fafc', 9: '#faf5ff' };
const DT_CLR = { 0: '#15803d', 1: '#92400e', 2: '#1d4ed8', 3: '#b91c1c', 4: '#be185d', 5: '#0f766e', 6: '#c2410c', 7: '#4d7c0f', 8: '#4b5563', 9: '#6d28d9' };
// Ký hiệu ngắn hiển thị trong ô bảng (algorithm output: 0→X, 1→LP, 2→PN...)
const DT_SYMBOL = {
    0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P', 10: 'X/2', 11: 'LL', 12: 'LN', 13: 'H', 14: 'B',
};
function AutoAlloc() {
    const { activeMonthId, activeMonthLabel } = (0, AppContext_1.useApp)();
    const [activeStep, setActiveStep] = (0, react_1.useState)(1);
    const [status, setStatus] = (0, react_1.useState)({});
    const [locked, setLocked] = (0, react_1.useState)(false);
    const [locking, setLocking] = (0, react_1.useState)(false);
    const [stepData, setStepData] = (0, react_1.useState)({});
    const [stepCache, setStepCache] = (0, react_1.useState)({});
    const [pageNum, setPageNum] = (0, react_1.useState)({});
    const [running, setRunning] = (0, react_1.useState)(null);
    const [clearing, setClearing] = (0, react_1.useState)(false);
    const [elapsed, setElapsed] = (0, react_1.useState)(0);
    const [pageSizes, setPageSizes] = (0, react_1.useState)({}); // size riêng cho từng bước
    const [showCa, setShowCa] = (0, react_1.useState)(false);
    const [completionInfo, setCompletionInfo] = (0, react_1.useState)(null);
    const refreshStatus = (0, react_1.useCallback)(async () => {
        const r = await fetch(`/api/distribution/status?month=${activeMonthId}`);
        if (r.ok)
            setStatus(await r.json());
    }, [activeMonthId]);
    const refreshLocked = (0, react_1.useCallback)(async () => {
        const r = await fetch('/api/months');
        if (r.ok) {
            const months = await r.json();
            const m = months.find(x => x.id === activeMonthId);
            setLocked(Boolean(m?.locked));
        }
    }, [activeMonthId]);
    const toggleLock = (0, react_1.useCallback)(async () => {
        if (!activeMonthId)
            return;
        setLocking(true);
        try {
            const r = await fetch(`/api/months/${activeMonthId}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locked: !locked }),
            });
            if (r.ok) {
                const data = await r.json();
                setLocked(data.locked);
            }
        }
        finally {
            setLocking(false);
        }
    }, [activeMonthId, locked]);
    (0, react_1.useEffect)(() => {
        refreshStatus();
        refreshLocked();
        setStepData({});
        setStepCache({});
        setPageNum({});
    }, [activeMonthId, refreshStatus, refreshLocked]);
    const clearAll = (0, react_1.useCallback)(async () => {
        if (!confirm('Xóa toàn bộ dữ liệu phân bổ của tháng này? Không thể khôi phục!'))
            return;
        setClearing(true);
        try {
            await fetch('/api/distribution/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
            setStepData({});
            setStepCache({});
            setPageNum({});
            await refreshStatus();
        }
        finally {
            setClearing(false);
        }
    }, [activeMonthId, refreshStatus]);
    const loadStepData = (0, react_1.useCallback)(async (displayStep, page = 1, size, force = false) => {
        const limit = size ?? pageSizes[displayStep] ?? 100;
        const cacheKey = `${page}_${limit}`;
        if (!force && stepCache[displayStep]?.[cacheKey]) {
            setStepData(prev => ({ ...prev, [displayStep]: stepCache[displayStep][cacheKey] }));
            setPageNum(prev => ({ ...prev, [displayStep]: page }));
            return;
        }
        const step = STEPS.find(s => s.num === displayStep);
        if (!step)
            return;
        const r = await fetch(`/api/distribution/step/${step.apiNum}?month=${activeMonthId}&page=${page}&limit=${limit}`);
        if (r.ok) {
            const json = await r.json();
            setStepCache(prev => ({ ...prev, [displayStep]: { ...(prev[displayStep] ?? {}), [cacheKey]: json } }));
            setStepData(prev => ({ ...prev, [displayStep]: json }));
            setPageNum(prev => ({ ...prev, [displayStep]: page }));
        }
    }, [activeMonthId, stepCache, pageSizes]);
    const handleStepClick = (0, react_1.useCallback)(async (num) => {
        setActiveStep(num);
        if (!stepCache[num]?.[pageNum[num] ?? 1])
            await loadStepData(num, pageNum[num] ?? 1);
        else
            setStepData(prev => ({ ...prev, [num]: stepCache[num][pageNum[num] ?? 1] }));
    }, [loadStepData, stepCache, pageNum]);
    const runStep = (0, react_1.useCallback)(async (displayStep) => {
        const step = STEPS.find(s => s.num === displayStep);
        if (!step || step.viewOnly)
            return;
        const { apiNum } = step;
        if (apiNum === 2) {
            await fetch(`/api/distribution/step/${apiNum}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
            await refreshStatus();
            return;
        }
        setRunning(displayStep);
        const t0 = Date.now();
        const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
        try {
            await fetch(`/api/distribution/step/${apiNum}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
            const elapsedSec = Math.round((Date.now() - t0) / 1000);
            clearInterval(timer);
            setRunning(null);
            setElapsed(0);
            await fetch('/api/distribution/invalidate-after', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId, afterDisplayStep: displayStep }) });
            const laterSteps = STEPS.filter(s => s.num > displayStep && !s.viewOnly).map(s => s.num);
            setStepCache(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); return n; });
            setStepData(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); return n; });
            setCompletionInfo({
                stepNum: displayStep, stepLabel: step.label, stepIcon: step.icon, elapsedSec,
                onConfirm: async () => {
                    setCompletionInfo(null);
                    await loadStepData(displayStep, 1, undefined, true);
                    await refreshStatus();
                },
            });
        }
        catch (e) {
            clearInterval(timer);
            setRunning(null);
            setElapsed(0);
            throw e;
        }
    }, [activeMonthId, refreshStatus, loadStepData]);
    const runAll = (0, react_1.useCallback)(async () => {
        setRunning('all');
        const t0 = Date.now();
        const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
        try {
            await fetch('/api/distribution/run-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
            const elapsedSec = Math.round((Date.now() - t0) / 1000);
            clearInterval(timer);
            setRunning(null);
            setElapsed(0);
            setCompletionInfo({
                stepNum: 'all', stepLabel: 'Toàn bộ quy trình', stepIcon: '🏆', elapsedSec,
                onConfirm: async () => {
                    setCompletionInfo(null);
                    setStepData({});
                    setStepCache({});
                    setPageNum({});
                    await refreshStatus();
                    await loadStepData(activeStep, 1);
                },
            });
        }
        catch (e) {
            clearInterval(timer);
            setRunning(null);
            setElapsed(0);
            throw e;
        }
    }, [activeMonthId, refreshStatus, loadStepData, activeStep]);
    const isRunning = running !== null;
    const curStep = STEPS.find(s => s.num === activeStep);
    return ((0, jsx_runtime_1.jsxs)("div", {
        className: AutoAlloc_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", {
            className: AutoAlloc_module_css_1.default.stepper, children: [STEPS.map(step => {
                const done = Boolean(status[step.key]);
                const active = activeStep === step.num;
                const busy = running === step.num;
                return ((0, jsx_runtime_1.jsxs)("button", { className: `${AutoAlloc_module_css_1.default.stepBtn} ${active ? AutoAlloc_module_css_1.default.stepActive : ''} ${done ? AutoAlloc_module_css_1.default.stepDone : ''}`, onClick: () => handleStepClick(step.num), id: `step-btn-${step.num}`, children: [(0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.stepCircle, children: done ? (0, jsx_runtime_1.jsx)(IconCheck, {}) : busy ? (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.spinnerSm }) : step.num }), (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.stepLabel, children: [step.icon, " ", step.label] }), step.editable && (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.editTag, children: "Manual" })] }, step.num));
            }), (0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.stepperSpacer }), (0, jsx_runtime_1.jsxs)("div", {
                className: AutoAlloc_module_css_1.default.stepperRunWrap, children: [!curStep?.viewOnly && ((0, jsx_runtime_1.jsx)("button", {
                    className: `${AutoAlloc_module_css_1.default.btnRunStep} ${running === activeStep ? AutoAlloc_module_css_1.default.btnRunning : ''}`, onClick: () => runStep(activeStep), disabled: isRunning || locked, id: `btn-run-step-${activeStep}`, children: running === activeStep ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.spinnerSm }), " ", elapsed, "s"] })
                        : curStep?.apiNum === 2 ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(IconCheck, {}), " X\u00E1c nh\u1EADn"] })
                            : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(IconPlay, {}), " ", 'Chạy bước', " ", activeStep] })
                })), (0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.dividerV }), !locked && ((0, jsx_runtime_1.jsx)("button", { className: AutoAlloc_module_css_1.default.btnClear, onClick: toggleLock, disabled: isRunning || locking, id: "btn-finish-month", style: { background: '#f0fdf4', color: '#15803d', borderColor: '#86efac' }, children: locking ? '⏳...' : '🔒 Khóa' })), locked && ((0, jsx_runtime_1.jsx)("button", { className: AutoAlloc_module_css_1.default.btnClear, onClick: toggleLock, disabled: locking, id: "btn-unlock-month", style: { background: '#fef2f2', color: '#b91c1c', borderColor: '#fca5a5' }, children: locking ? '⏳...' : '🔓 Mở khóa' })), (0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.dividerV }), (0, jsx_runtime_1.jsx)("button", { className: AutoAlloc_module_css_1.default.btnClear, onClick: clearAll, disabled: isRunning || clearing || locked, id: "btn-clear-all", children: clearing ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.spinnerSm }), " \u0110ang x\u00F3a..."] }) : (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: "\uD83D\uDDD1\uFE0F X\u00F3a d\u1EEF li\u1EC7u" }) })]
            })]
        }), (0, jsx_runtime_1.jsxs)("div", {
            className: AutoAlloc_module_css_1.default.panel, children: [(0, jsx_runtime_1.jsxs)("div", {
                className: AutoAlloc_module_css_1.default.panelHeader, children: [(0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.panelTitle, children: [curStep?.icon, " B\u01B0\u1EDBc ", activeStep, ": ", curStep?.label] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }, children: [activeStep === 5 && ((0, jsx_runtime_1.jsx)("button", { onClick: () => setShowCa(v => !v), className: AutoAlloc_module_css_1.default.btnExport, style: { minWidth: 110, justifyContent: 'center', background: showCa ? '#1d4ed8' : '#eff6ff', color: showCa ? '#fff' : '#1d4ed8', borderColor: '#93c5fd' }, children: showCa ? 'Ẩn Ca' : 'Hiện Ca' })), (0, jsx_runtime_1.jsxs)("a", { href: activeMonthId ? `/api/distribution/export?month=${activeMonthId}&step=${activeStep}` : '#', className: AutoAlloc_module_css_1.default.btnExport, download: true, id: `btn-export-step-${activeStep}`, style: { minWidth: 110, justifyContent: 'center' }, children: [(0, jsx_runtime_1.jsx)(IconDl, {}), " T\u1EA3i Excel"] }), activeStep === 5 && ((0, jsx_runtime_1.jsxs)("a", { href: activeMonthId ? `/api/distribution/export?month=${activeMonthId}&step=5&withShift=1` : '#', className: AutoAlloc_module_css_1.default.btnExport, download: true, id: "btn-export-step-5-ca", style: { minWidth: 110, justifyContent: 'center' }, children: [(0, jsx_runtime_1.jsx)(IconDl, {}), " T\u1EA3i Excel c\u00F3 Ca"] }))] }), stepData[activeStep] && ((0, jsx_runtime_1.jsx)(Pagination, {
                    page: stepData[activeStep].page, totalPages: stepData[activeStep].totalPages, total: stepData[activeStep].total, limit: stepData[activeStep].limit, pageSize: pageSizes[activeStep] ?? 100, onPage: (p) => loadStepData(activeStep, p), onSizeChange: (sz) => {
                        setPageSizes(prev => ({ ...prev, [activeStep]: sz }));
                        setStepCache(prev => { const n = { ...prev }; delete n[activeStep]; return n; });
                        setStepData(prev => { const n = { ...prev }; delete n[activeStep]; return n; });
                        loadStepData(activeStep, 1, sz);
                    }
                }))]
            }), (0, jsx_runtime_1.jsx)("div", {
                className: AutoAlloc_module_css_1.default.panelBody, children: (0, jsx_runtime_1.jsx)(StepView, {
                    step: activeStep, data: stepData[activeStep]?.data, onLoad: () => loadStepData(activeStep, 1), onRefresh: () => {
                        setStepCache(prev => { const n = { ...prev }; delete n[activeStep]; return n; });
                        loadStepData(activeStep, pageNum[activeStep] ?? 1, undefined, true);
                    }, done: Boolean(curStep && status[curStep.key]), monthId: activeMonthId, monthLabel: activeMonthLabel, showCa: showCa, locked: locked
                })
            })]
        }), completionInfo && ((0, jsx_runtime_1.jsx)(CompletionModal, { stepNum: completionInfo.stepNum, stepLabel: completionInfo.stepLabel, stepIcon: completionInfo.stepIcon, elapsedSec: completionInfo.elapsedSec, onConfirm: completionInfo.onConfirm }))]
    }));
}
/* === Completion Modal === */
function CompletionModal({ stepNum, stepLabel, stepIcon, elapsedSec, onConfirm }) {
    const isAll = stepNum === 'all';
    return ((0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.modalOverlay, children: (0, jsx_runtime_1.jsxs)("div", { className: AutoAlloc_module_css_1.default.modalCard, children: [(0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.modalIcon, children: (0, jsx_runtime_1.jsx)("svg", { className: AutoAlloc_module_css_1.default.modalIconSvg, viewBox: "0 0 24 24", fill: "currentColor", width: "32", height: "32", children: (0, jsx_runtime_1.jsx)("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }), (0, jsx_runtime_1.jsx)("h2", { className: AutoAlloc_module_css_1.default.modalTitle, children: isAll ? 'Hoàn thành toàn bộ!' : 'Bước hoàn thành!' }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 12 }, children: (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.modalStep, children: [stepIcon, "\u00A0", isAll ? 'Chạy Toàn Bộ' : `Bước ${stepNum}: ${stepLabel}`] }) }), (0, jsx_runtime_1.jsx)("p", { className: AutoAlloc_module_css_1.default.modalDesc, children: isAll ? 'Tất cả các bước đã được thực hiện thành công.' : 'Dữ liệu đã được phân bổ và sẵn sàng để xem.' }), (0, jsx_runtime_1.jsxs)("p", { className: AutoAlloc_module_css_1.default.modalTime, children: ["\u23F1 Th\u1EDDi gian th\u1EF1c thi: ", (0, jsx_runtime_1.jsxs)("strong", { children: [elapsedSec, "s"] })] }), (0, jsx_runtime_1.jsxs)("button", { className: AutoAlloc_module_css_1.default.modalBtnOk, onClick: onConfirm, autoFocus: true, id: "btn-completion-ok", children: [(0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", fill: "currentColor", width: "16", height: "16", children: (0, jsx_runtime_1.jsx)("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }), "OK"] })] }) }));
}
/* === Pagination === */
const PAGE_SIZES = [100, 500, 1000, 999999];
const SIZE_LABELS = { 100: '100', 500: '500', 1000: '1000', 999999: 'Tất cả' };
function Pagination({ total, limit, pageSize, onPage, onSizeChange }) {
    return ((0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.pageInfo, children: ["T\u1ED5ng: ", (0, jsx_runtime_1.jsx)("strong", { children: total }), " NV", (0, jsx_runtime_1.jsx)("select", { value: pageSize, onChange: e => { onSizeChange(Number(e.target.value)); onPage(1); }, style: { marginLeft: 8, padding: '2px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, color: 'var(--gray-600)', background: '#fff', cursor: 'pointer' }, children: PAGE_SIZES.map(s => (0, jsx_runtime_1.jsx)("option", { value: s, children: SIZE_LABELS[s] }, s)) })] }));
}
/* ── color maps ── */
const SYM_BG = { '': '#fff', 'X': '#f0fdf4', 'L': '#f1f5f9', 'LP': '#f1f5f9', 'PN': '#f5f3ff', 'Ô': '#fef2f2', 'TS': '#fdf2f8', 'DS': '#f0fdfa', 'O': '#fff7ed', 'NL': '#eff6ff', 'OF': '#f8fafc', 'P': '#ecfeff' };
const SYM_CLR = { '': '#d1d5db', 'X': '#15803d', 'L': '#475569', 'LP': '#475569', 'PN': '#6d28d9', 'Ô': '#b91c1c', 'TS': '#be185d', 'DS': '#0f766e', 'O': '#c2410c', 'NL': '#1d4ed8', 'OF': '#4b5563', 'P': '#0e7490' };
const DT_TEXT = { 0: '#15803d', 1: '#475569', 2: '#6d28d9', 3: '#b91c1c', 4: '#be185d', 5: '#0f766e', 6: '#c2410c', 7: '#1d4ed8', 8: '#4b5563', 9: '#0e7490', 10: '#065f46', 11: '#92400e', 12: '#78350f', 13: '#1e40af', 14: '#374151' };
const DT_CELL_BG = { 0: '#f0fdf4', 1: '#f1f5f9', 2: '#f5f3ff', 3: '#fef2f2', 4: '#fdf2f8', 5: '#f0fdfa', 6: '#fff7ed', 7: '#eff6ff', 8: '#f8fafc', 9: '#ecfeff', 10: '#d1fae5', 11: '#fef3c7', 12: '#fef9c3', 13: '#dbeafe', 14: '#f3f4f6' };
/* === ImportGrid (Step 1) === */
function ImportGrid({ rows, monthLabel }) {
    const [fCode, setFCode] = (0, react_1.useState)('');
    const [fName, setFName] = (0, react_1.useState)('');
    const [fDept, setFDept] = (0, react_1.useState)('');
    const deptList = useDeptList(rows);
    const [fGroup, setFGroup] = (0, react_1.useState)('');
    const groupList = (0, react_1.useMemo)(() => {
        const gs = new Set(); for (const r of rows) {
            if (r.specialGroup)
                gs.add(r.specialGroup);
        } return [...gs].sort((a, b) => a.localeCompare(b, 'vi'));
    }, [rows]);
    const filtered = useGridFilter(rows, fCode, fName, fDept, fGroup);
    return ((0, jsx_runtime_1.jsxs)("div", {
        className: AutoAlloc_module_css_1.default.tableOuter, children: [(0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.tableWrap, children: (0, jsx_runtime_1.jsxs)("table", {
                className: AutoAlloc_module_css_1.default.gridTable, style: { fontSize: '0.72rem' }, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }, children: "#" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 90, maxWidth: 90, overflow: 'hidden' }, children: "M\u00C3 NV" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200 }, children: "T\u00CAN NH\u00C2N VI\u00CAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70 }, children: "PH\u00D2NG BAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70, color: '#0369a1' }, children: "NH\u00D3M \u0110\u1EB6C TH\u00D9" }), Array.from({ length: 31 }, (_, i) => (0, jsx_runtime_1.jsx)("th", { className: AutoAlloc_module_css_1.default.dayNum, children: i + 1 }, i)), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 40, color: '#15803d' }, children: "NG\u00C0Y C\u00D4NG" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 44, color: '#1d4ed8' }, children: "T\u0102NG CA (H)" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 50, color: '#c2410c' }, children: "TR\u1EC4 (PH)" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 36, color: '#6d28d9' }, children: "PH\u00C9P N\u0102M" })] }), (0, jsx_runtime_1.jsx)(InlineFilterRow, { fCode: fCode, fName: fName, fDept: fDept, setFCode: setFCode, setFName: setFName, setFDept: setFDept, deptList: deptList, extraBefore: 1, extraAfter: 4, fGroup: fGroup, setFGroup: setFGroup, groupList: groupList, codeThStyle: { maxWidth: 90, width: 90 }, nameThStyle: { maxWidth: 200, width: 200 }, monthLabel: monthLabel })] }), (0, jsx_runtime_1.jsx)("tbody", {
                    children: filtered.map((r, ri) => {
                        const days = r.days ?? [];
                        return ((0, jsx_runtime_1.jsxs)("tr", {
                            children: [(0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }, children: ri + 1 }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.mono, style: { maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.code }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }, children: r.deptName || '—' }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.65rem', color: '#0369a1', whiteSpace: 'nowrap' }, children: r.specialGroup || '—' }), Array.from({ length: 31 }, (_, i) => {
                                const d = days.find((x) => x.day === i + 1);
                                const sym = d?.symbol ?? '';
                                return ((0, jsx_runtime_1.jsx)("td", {
                                    style: {
                                        background: SYM_BG[sym] ?? '#fff',
                                        color: SYM_CLR[sym] ?? '#9ca3af',
                                        fontWeight: (!sym || sym === 'X') ? 700 : 600,
                                        textAlign: 'center', padding: '4px 2px', minWidth: 26,
                                        borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                                    }, children: sym || (0, jsx_runtime_1.jsx)("span", { style: { color: '#d1d5db', fontWeight: 300 }, children: "\u00B7" })
                                }, i));
                            }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: '#15803d' }, children: (0, jsx_runtime_1.jsx)("strong", { children: r.workdays || '—' }) }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center' }, children: Number(r.overtimeHours) > 0 ? (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.otTag, children: [r.overtimeHours, "h"] }) : '—' }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center' }, children: Number(r.lateMinutes) > 0 ? (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.lateTag, children: [r.lateMinutes, "ph"] }) : '—' }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: '#6d28d9' }, children: r.phepNam || '—' })]
                        }, r.code));
                    })
                })]
            })
        }), (0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.legend, children: Object.entries(SYM_CLR).filter(([k]) => k !== '').map(([sym, clr]) => ((0, jsx_runtime_1.jsx)("span", {
                className: AutoAlloc_module_css_1.default.legendItem, children: (0, jsx_runtime_1.jsx)("span", {
                    style: {
                        display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                        background: SYM_BG[sym], color: clr, fontWeight: 700,
                        fontSize: '0.7rem', marginRight: 3, border: `1px solid ${clr}30`,
                    }, children: sym
                })
            }, sym)))
        })]
    }));
}
/* === DayTypePicker (dropdown chọn loại ngày) === */
const SYM_TO_DT = { X: 0, L: 1, LP: 1, PN: 2, Ô: 3, TS: 4, DS: 5, O: 6, NL: 7, OF: 8, P: 9, 'X/2': 10, LL: 11, LN: 12, H: 13, B: 14 };
function DayTypePicker({ currentDT, x, y, onPick, onClose, leaveTypes }) {
    const left = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : x);
    const top = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 160 : y);
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, {
        children: [(0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.dayPickerOverlay, onClick: onClose }), (0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.dayPicker, style: { left, top }, children: (Array.isArray(leaveTypes) ? leaveTypes : []).map(lt => {
                const dt = lt.dayType >= 0 ? lt.dayType : undefined;
                const sym = (dt != null ? (DT_SYMBOL[dt] ?? lt.code) : lt.code);
                const isActive = dt != null && dt === currentDT;
                return ((0, jsx_runtime_1.jsxs)("button", {
                    className: `${AutoAlloc_module_css_1.default.dayPickerBtn} ${isActive ? AutoAlloc_module_css_1.default.dayPickerBtnActive : ''}`, style: { color: dt != null ? (DT_TEXT[dt] ?? '#666') : '#374151', background: dt != null ? (DT_CELL_BG[dt] ?? '#fff') : '#f9fafb' }, onClick: () => {
                        if (dt != null)
                            onPick(dt);
                    }, type: "button", children: [(0, jsx_runtime_1.jsx)("span", { children: sym }), (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.dayPickerLabel, children: lt.name })]
                }, lt.code));
            })
        })]
    }));
}
const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function DayTypeGrid({ rows, monthId, monthLabel, onSaved, locked }) {
    const [fCode, setFCode] = (0, react_1.useState)('');
    const [fName, setFName] = (0, react_1.useState)('');
    const [fDept, setFDept] = (0, react_1.useState)('');
    const [edits, setEdits] = (0, react_1.useState)(new Map());
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [dragSrc, setDragSrc] = (0, react_1.useState)(null);
    const [dragOver, setDragOver] = (0, react_1.useState)(null);
    const [picker, setPicker] = (0, react_1.useState)(null);
    const [leaveTypes, setLeaveTypes] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch(`/api/leave-types?month=${monthId}`).then(r => r.json()).then((data) => {
            setLeaveTypes(Array.isArray(data) ? data : []);
        }).catch(() => { });
    }, [monthId]);
    const deptList = useDeptList(rows);
    const filtered = useGridFilter(rows, fCode, fName, fDept);
    const handleCellClick = (code, day, currentDT, e) => {
        const rect = e.target.getBoundingClientRect();
        setPicker({ code, day, currentDT, x: rect.left, y: rect.bottom + 4 });
    };
    const handleDrop = (toCode, toDay) => {
        if (!dragSrc || dragSrc.code !== toCode || dragSrc.day === toDay) {
            setDragSrc(null);
            setDragOver(null);
            return;
        }
        const fromDT = getEffectiveDT(dragSrc.code, dragSrc.day, rows.find((r) => r.code === dragSrc.code)?.days?.find((d) => d.day === dragSrc.day)?.dayType ?? -1);
        const toDT = getEffectiveDT(toCode, toDay, rows.find((r) => r.code === toCode)?.days?.find((d) => d.day === toDay)?.dayType ?? -1);
        const origFrom = rows.find((r) => r.code === dragSrc.code)?.days?.find((d) => d.day === dragSrc.day)?.dayType ?? -1;
        const origTo = rows.find((r) => r.code === toCode)?.days?.find((d) => d.day === toDay)?.dayType ?? -1;
        setEdits(prev => {
            const next = new Map(prev);
            const kFrom = `${dragSrc.code}_${dragSrc.day}`;
            const kTo = `${toCode}_${toDay}`;
            toDT === origFrom ? next.delete(kFrom) : next.set(kFrom, toDT);
            fromDT === origTo ? next.delete(kTo) : next.set(kTo, fromDT);
            return next;
        });
        setDragSrc(null);
        setDragOver(null);
    };
    const handlePick = (dt) => {
        if (!picker)
            return;
        const key = `${picker.code}_${picker.day}`;
        const origRow = rows.find((r) => r.code === picker.code);
        const origDT = origRow?.days?.find((d) => d.day === picker.day)?.dayType ?? -1;
        setEdits(prev => {
            const next = new Map(prev);
            if (dt === origDT)
                next.delete(key);
            else
                next.set(key, dt);
            return next;
        });
        setPicker(null);
    };
    const handleUndo = () => { setEdits(new Map()); };
    const handleSave = async () => {
        if (edits.size === 0)
            return;
        setSaving(true);
        try {
            const changes = Array.from(edits.entries()).map(([key, dayType]) => {
                const [empCode, dayStr] = key.split('_');
                return { empCode, day: Number(dayStr), dayType };
            });
            const r = await fetch('/api/distribution/edit-day', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monthId, changes }),
            });
            if (r.ok) {
                setEdits(new Map());
                onSaved?.();
            }
        }
        finally {
            setSaving(false);
        }
    };
    const getEffectiveDT = (code, day, originalDT) => {
        const key = `${code}_${day}`;
        return edits.has(key) ? edits.get(key) : originalDT;
    };
    return ((0, jsx_runtime_1.jsxs)("div", {
        className: AutoAlloc_module_css_1.default.tableOuter, children: [(0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.tableWrap, children: (0, jsx_runtime_1.jsxs)("table", {
                className: AutoAlloc_module_css_1.default.gridTable, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }, children: "#" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 90, maxWidth: 90, overflow: 'hidden' }, children: "M\u00C3 NV" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200 }, children: "T\u00CAN NH\u00C2N VI\u00CAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70 }, children: "PH\u00D2NG BAN" }), Array.from({ length: 31 }, (_, i) => (0, jsx_runtime_1.jsx)("th", { className: AutoAlloc_module_css_1.default.dayNum, children: i + 1 }, i)), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 60, color: '#15803d' }, children: "NG\u00C0Y C\u00D4NG" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 36, color: '#475569' }, children: "LP" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 36, color: '#6d28d9' }, children: "PN" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 80, color: '#0369a1' }, children: "NGH\u1EC8 TH\u00C1NG TR\u01AF\u1EDAC" })] }), (0, jsx_runtime_1.jsx)(InlineFilterRow, { fCode: fCode, fName: fName, fDept: fDept, setFCode: setFCode, setFName: setFName, setFDept: setFDept, deptList: deptList, extraBefore: 1, extraAfter: 4, codeThStyle: { maxWidth: 90, width: 90 }, nameThStyle: { maxWidth: 200, width: 200 }, monthLabel: monthLabel })] }), (0, jsx_runtime_1.jsx)("tbody", {
                    children: filtered.map((r, ri) => {
                        const days = r.days ?? [];
                        return ((0, jsx_runtime_1.jsxs)("tr", {
                            children: [(0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }, children: ri + 1 }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.mono, style: { maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.code }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.empName, style: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }, children: r.deptName || '—' }), Array.from({ length: 31 }, (_, i) => {
                                const d = days.find(x => x.day === i + 1);
                                const origDT = d?.dayType ?? -1;
                                const dt = getEffectiveDT(r.code, i + 1, origDT);
                                const sym = DT_SYMBOL[dt] ?? '';
                                const bg = dt >= 0 ? (DT_CELL_BG[dt] ?? '#fff') : '#fff';
                                const clr = DT_TEXT[dt] ?? '#9ca3af';
                                const isChanged = edits.has((`${r.code}_${i + 1}`));
                                const isOver = dragOver?.code === r.code && dragOver?.day === i + 1;
                                return ((0, jsx_runtime_1.jsx)("td", {
                                    className: `${AutoAlloc_module_css_1.default.editableCell} ${isChanged ? AutoAlloc_module_css_1.default.editableCellChanged : ''} ${isOver ? AutoAlloc_module_css_1.default.editableCellDragOver : ''}`, style: {
                                        background: bg, color: clr, fontWeight: dt === 0 ? 700 : 600,
                                        fontSize: '0.72rem', textAlign: 'center', padding: '4px 2px', minWidth: 28,
                                        borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                                        opacity: dragSrc?.code === r.code && dragSrc?.day === i + 1 ? 0.4 : 1,
                                    }, onContextMenu: (e) => {
                                        if (locked)
                                            return; e.preventDefault(); handleCellClick(r.code, i + 1, dt, e);
                                    }, draggable: !locked, onDragStart: () => {
                                        if (!locked)
                                            setDragSrc({ code: r.code, day: i + 1 });
                                    }, onDragOver: (e) => { e.preventDefault(); setDragOver({ code: r.code, day: i + 1 }); }, onDragLeave: () => setDragOver(null), onDrop: () => handleDrop(r.code, i + 1), onDragEnd: () => { setDragSrc(null); setDragOver(null); }, children: sym || (0, jsx_runtime_1.jsx)("span", { style: { color: '#d1d5db', fontWeight: 400 }, children: "\u00B7" })
                                }, i));
                            }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: '#15803d' }, children: r.workdays || '—' }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, children: Array.from({ length: 31 }, (_, i) => getEffectiveDT(r.code, i + 1, days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 1).length }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: '#6d28d9' }, children: Array.from({ length: 31 }, (_, i) => getEffectiveDT(r.code, i + 1, days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 2).length }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: '#0369a1' }, children: r.ngayNghiCuoiThangTruoc || (0, jsx_runtime_1.jsx)("span", { style: { color: '#d1d5db' }, children: "\u2014" }) })]
                        }, r.code));
                    })
                })]
            })
        }), (0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.legend, children: (Array.isArray(leaveTypes) ? leaveTypes : []).filter(lt => lt.dayType >= 0).map(lt => {
                const sym = DT_SYMBOL[lt.dayType] ?? lt.code;
                return ((0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.legendItem, children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: DT_CELL_BG[lt.dayType], color: DT_TEXT[lt.dayType], fontWeight: 700, fontSize: '0.72rem', marginRight: 3, border: `1px solid ${DT_TEXT[lt.dayType]}30` }, children: sym }), lt.name] }, lt.code));
            })
        }), picker && ((0, jsx_runtime_1.jsx)(DayTypePicker, { currentDT: picker.currentDT, x: picker.x, y: picker.y, onPick: handlePick, onClose: () => setPicker(null), leaveTypes: leaveTypes })), edits.size > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: AutoAlloc_module_css_1.default.editBar, children: [(0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.editBarInfo, children: ["\u270F\uFE0F ", (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.editBarCount, children: edits.size }), " thay \u0111\u1ED5i"] }), (0, jsx_runtime_1.jsx)("button", { className: `${AutoAlloc_module_css_1.default.editBarBtn} ${AutoAlloc_module_css_1.default.editBarBtnUndo}`, onClick: handleUndo, disabled: locked, type: "button", children: "\u21A9 Ho\u00E0n t\u00E1c" }), (0, jsx_runtime_1.jsx)("button", { className: `${AutoAlloc_module_css_1.default.editBarBtn} ${AutoAlloc_module_css_1.default.editBarBtnSave}`, onClick: handleSave, disabled: saving || locked, type: "button", children: saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi' })] }))]
    }));
}
/* === ShiftGrid (Step 3) === */
function ShiftGrid({ rows, monthLabel }) {
    const CA1_BG = '#eff6ff', CA1_CLR = '#1d4ed8';
    const CA2_BG = '#fff7ed', CA2_CLR = '#c2410c';
    const CAC_BG = '#f0fdf4', CAC_CLR = '#15803d';
    const [fCode, setFCode] = (0, react_1.useState)('');
    const [fName, setFName] = (0, react_1.useState)('');
    const [fDept, setFDept] = (0, react_1.useState)('');
    const deptList = useDeptList(rows);
    const filtered = useGridFilter(rows, fCode, fName, fDept);
    return ((0, jsx_runtime_1.jsxs)("div", {
        className: AutoAlloc_module_css_1.default.tableOuter, children: [(0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.tableWrap, children: (0, jsx_runtime_1.jsxs)("table", {
                className: AutoAlloc_module_css_1.default.gridTable, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }, children: "#" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 90, maxWidth: 90, overflow: 'hidden' }, children: "M\u00C3 NV" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200 }, children: "T\u00CAN NH\u00C2N VI\u00CAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70 }, children: "PH\u00D2NG BAN" }), Array.from({ length: 31 }, (_, i) => (0, jsx_runtime_1.jsx)("th", { className: AutoAlloc_module_css_1.default.dayNum, children: i + 1 }, i)), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 40, color: CA1_CLR }, children: "Ca 1" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 40, color: CA2_CLR }, children: "Ca 2" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 40, color: CAC_CLR }, children: "C" })] }), (0, jsx_runtime_1.jsx)(InlineFilterRow, { fCode: fCode, fName: fName, fDept: fDept, setFCode: setFCode, setFName: setFName, setFDept: setFDept, deptList: deptList, extraBefore: 1, extraAfter: 3, codeThStyle: { maxWidth: 90, width: 90 }, nameThStyle: { maxWidth: 200, width: 200 }, monthLabel: monthLabel })] }), (0, jsx_runtime_1.jsx)("tbody", {
                    children: filtered.map((r, ri) => {
                        const days = r.days ?? [];
                        const ca1Count = days.filter(d => d.shiftCode === 'Ca 1').length;
                        const ca2Count = days.filter(d => d.shiftCode === 'Ca 2').length;
                        const caCCount = days.filter(d => d.shiftCode === 'C').length;
                        return ((0, jsx_runtime_1.jsxs)("tr", {
                            children: [(0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }, children: ri + 1 }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.mono, style: { maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.code }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.empName, style: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }, children: r.deptName || '—' }), Array.from({ length: 31 }, (_, i) => {
                                const d = days.find(x => x.day === i + 1);
                                const dt = d?.dayType ?? -1;
                                const sc = d?.shiftCode ?? '';
                                let bg = '#fff', clr = '#9ca3af', label = DT_SYMBOL[dt] ?? '';
                                if (dt === 0 && sc === 'Ca 1') {
                                    bg = CA1_BG;
                                    clr = CA1_CLR;
                                    label = 'Ca 1';
                                }
                                else if (dt === 0 && sc === 'Ca 2') {
                                    bg = CA2_BG;
                                    clr = CA2_CLR;
                                    label = 'Ca 2';
                                }
                                else if (dt === 0 && sc === 'C') {
                                    bg = CAC_BG;
                                    clr = CAC_CLR;
                                    label = 'C';
                                }
                                else if (dt >= 0) {
                                    bg = DT_CELL_BG[dt] ?? '#fff';
                                    clr = DT_TEXT[dt] ?? '#9ca3af';
                                }
                                return ((0, jsx_runtime_1.jsx)("td", { style: { background: bg, color: clr, fontWeight: dt === 0 ? 700 : 600, fontSize: '0.72rem', textAlign: 'center', padding: '4px 2px', minWidth: 28, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }, children: label || (0, jsx_runtime_1.jsx)("span", { style: { color: '#d1d5db', fontWeight: 400 }, children: "\u00B7" }) }, i));
                            }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: CA1_CLR }, children: ca1Count || '—' }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: CA2_CLR }, children: ca2Count || '—' }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: CAC_CLR }, children: caCCount || '—' })]
                        }, r.code));
                    })
                })]
            })
        }), (0, jsx_runtime_1.jsxs)("div", { className: AutoAlloc_module_css_1.default.legend, children: [(0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.legendItem, children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA1_BG, color: CA1_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }, children: "Ca 1" }), " Ca 1"] }), (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.legendItem, children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA2_BG, color: CA2_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }, children: "Ca 2" }), " Ca 2"] }), (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.legendItem, children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CAC_BG, color: CAC_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }, children: "C" }), " Ca chung"] })] })]
    }));
}
/* === OtLateGrid (Step 4) === */
function OtLateGrid({ rows, monthLabel }) {
    const OT_BG = '#eff6ff', OT_CLR = '#1d4ed8';
    const LATE_BG = '#fff7ed', LATE_CLR = '#c2410c';
    const [fCode, setFCode] = (0, react_1.useState)('');
    const [fName, setFName] = (0, react_1.useState)('');
    const [fDept, setFDept] = (0, react_1.useState)('');
    const deptList = useDeptList(rows);
    const filtered = useGridFilter(rows, fCode, fName, fDept);
    return ((0, jsx_runtime_1.jsx)("div", {
        className: AutoAlloc_module_css_1.default.tableOuter, children: (0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.tableWrap, children: (0, jsx_runtime_1.jsxs)("table", {
                className: AutoAlloc_module_css_1.default.gridTable, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }, children: "#" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 90, maxWidth: 90, overflow: 'hidden' }, children: "M\u00C3 NV" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200 }, children: "T\u00CAN NH\u00C2N VI\u00CAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70 }, children: "PH\u00D2NG BAN" }), Array.from({ length: 31 }, (_, i) => (0, jsx_runtime_1.jsx)("th", { className: AutoAlloc_module_css_1.default.dayNum, children: i + 1 }, i)), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 44, color: OT_CLR }, children: "T\u0102NG CA (H)" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 50, color: LATE_CLR }, children: "TR\u1EC4(PH)" })] }), (0, jsx_runtime_1.jsx)(InlineFilterRow, { fCode: fCode, fName: fName, fDept: fDept, setFCode: setFCode, setFName: setFName, setFDept: setFDept, deptList: deptList, extraBefore: 1, extraAfter: 2, codeThStyle: { maxWidth: 90, width: 90 }, nameThStyle: { maxWidth: 200, width: 200 }, monthLabel: monthLabel })] }), (0, jsx_runtime_1.jsx)("tbody", {
                    children: filtered.map((r, ri) => {
                        const days = r.days ?? [];
                        return ((0, jsx_runtime_1.jsxs)("tr", {
                            children: [(0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }, children: ri + 1 }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.mono, style: { maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.code }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.empName, style: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }, children: r.deptName || '—' }), Array.from({ length: 31 }, (_, i) => {
                                const d = days.find(x => x.day === i + 1);
                                const dt = d?.dayType ?? -1;
                                const ot = Number(d?.otH) || 0;
                                const late = Number(d?.lateM) || 0;
                                let bg = '#fff', clr = '#9ca3af', label = (0, jsx_runtime_1.jsx)("span", { style: { color: '#d1d5db', fontWeight: 400 }, children: "\u00B7" });
                                if (dt === 0 && ot > 0 && late > 0) {
                                    bg = '#f5f3ff';
                                    clr = '#6d28d9';
                                    label = (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("span", { style: { color: OT_CLR }, children: [ot, "h"] }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#9ca3af', margin: '0 1px' }, children: "/" }), (0, jsx_runtime_1.jsx)("span", { style: { color: LATE_CLR }, children: late })] });
                                }
                                else if (dt === 0 && ot > 0) {
                                    bg = OT_BG;
                                    clr = OT_CLR;
                                    label = (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [ot, "h"] });
                                }
                                else if (dt === 0 && late > 0) {
                                    bg = LATE_BG;
                                    clr = LATE_CLR;
                                    label = (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: late });
                                }
                                else if (dt === 0) {
                                    bg = DT_CELL_BG[0];
                                    clr = DT_TEXT[0];
                                    label = (0, jsx_runtime_1.jsx)("span", { style: { opacity: 0.4 }, children: "X" });
                                }
                                else if (dt >= 0) {
                                    bg = DT_CELL_BG[dt] ?? '#fff';
                                    clr = DT_TEXT[dt] ?? '#9ca3af';
                                    label = (0, jsx_runtime_1.jsx)("span", { children: DT_SYMBOL[dt] ?? '' });
                                }
                                return ((0, jsx_runtime_1.jsx)("td", { style: { background: bg, color: clr, fontWeight: 700, fontSize: '0.7rem', textAlign: 'center', padding: '3px 2px', minWidth: 28, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }, children: label }, i));
                            }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: OT_CLR }, children: Number(r.totalOT) > 0 ? (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.otTag, children: [Number(r.totalOT).toFixed(1), "h"] }) : '—' }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.statCell, style: { color: LATE_CLR }, children: Number(r.totalLate) > 0 ? (0, jsx_runtime_1.jsxs)("span", { className: AutoAlloc_module_css_1.default.lateTag, children: [r.totalLate, "ph"] }) : '—' })]
                        }, r.code));
                    })
                })]
            })
        })
    }));
}
/* === TimeGrid (Step 5) === */
function TimeGrid({ rows, monthLabel, showCa }) {
    const IN_BG = '#f0fdf4', IN_CLR = '#15803d';
    const OUT_BG = '#eff6ff', OUT_CLR = '#1d4ed8';
    const [fCode, setFCode] = (0, react_1.useState)('');
    const [fName, setFName] = (0, react_1.useState)('');
    const [fDept, setFDept] = (0, react_1.useState)('');
    const deptList = useDeptList(rows);
    const filtered = useGridFilter(rows, fCode, fName, fDept);
    return ((0, jsx_runtime_1.jsx)("div", {
        className: AutoAlloc_module_css_1.default.tableOuter, children: (0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.tableWrap, children: (0, jsx_runtime_1.jsxs)("table", {
                className: AutoAlloc_module_css_1.default.gridTable, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }, children: "#" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 90, maxWidth: 90, overflow: 'hidden' }, children: "M\u00C3 NV" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200 }, children: "T\u00CAN NH\u00C2N VI\u00CAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70 }, children: "PH\u00D2NG BAN" }), Array.from({ length: 31 }, (_, i) => (0, jsx_runtime_1.jsx)("th", { className: AutoAlloc_module_css_1.default.dayNum, children: i + 1 }, i))] }), (0, jsx_runtime_1.jsx)(InlineFilterRow, { fCode: fCode, fName: fName, fDept: fDept, setFCode: setFCode, setFName: setFName, setFDept: setFDept, deptList: deptList, extraBefore: 1, extraAfter: 0, codeThStyle: { maxWidth: 90, width: 90 }, nameThStyle: { maxWidth: 200, width: 200 }, monthLabel: monthLabel })] }), (0, jsx_runtime_1.jsx)("tbody", {
                    children: filtered.map((r, ri) => {
                        const days = r.days ?? [];
                        return ((0, jsx_runtime_1.jsxs)("tr", {
                            children: [(0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }, children: ri + 1 }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.mono, style: { maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.code }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.empName, style: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }, children: r.deptName || '—' }), Array.from({ length: 31 }, (_, i) => {
                                const d = days.find(x => x.day === i + 1);
                                const dt = d?.dayType ?? -1;
                                const ci = d?.checkIn ?? '';
                                const co = d?.checkOut ?? '';
                                let bg = '#fff', clr = '#9ca3af', label = (0, jsx_runtime_1.jsx)("span", { style: { color: '#d1d5db', fontWeight: 400 }, children: "\u00B7" });
                                if (dt === 0 && ci && ci !== '00:00') {
                                    bg = IN_BG;
                                    label = (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { style: { color: IN_CLR, display: 'block', lineHeight: 1.2 }, children: ci }), (0, jsx_runtime_1.jsx)("span", { style: { color: OUT_CLR, display: 'block', lineHeight: 1.2 }, children: co }), showCa && d?.shiftCode && (0, jsx_runtime_1.jsx)("span", { style: { color: '#ea580c', display: 'block', lineHeight: 1.2, fontSize: '0.6rem' }, children: d.shiftCode })] });
                                }
                                else if (dt >= 0) {
                                    bg = DT_CELL_BG[dt] ?? '#fff';
                                    clr = DT_TEXT[dt] ?? '#9ca3af';
                                    label = (0, jsx_runtime_1.jsx)("span", { children: DT_SYMBOL[dt] ?? '' });
                                }
                                return ((0, jsx_runtime_1.jsx)("td", { title: d?.shiftCode || '', style: { background: bg, color: clr, fontWeight: 600, fontSize: '0.65rem', textAlign: 'center', padding: '2px 1px', minWidth: 38, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', lineHeight: 1.3 }, children: label }, i));
                            })]
                        }, r.code));
                    })
                })]
            })
        })
    }));
}
/* === FinalGrid (Step 6) === */
function FinalGrid({ rows, monthLabel }) {
    const [fCode, setFCode] = (0, react_1.useState)('');
    const [fName, setFName] = (0, react_1.useState)('');
    const [fDept, setFDept] = (0, react_1.useState)('');
    const deptList = useDeptList(rows);
    const [fGroup, setFGroup] = (0, react_1.useState)('');
    const groupList = (0, react_1.useMemo)(() => {
        const gs = new Set(); for (const r of rows) {
            if (r.specialGroup)
                gs.add(r.specialGroup);
        } return [...gs].sort((a, b) => a.localeCompare(b, 'vi'));
    }, [rows]);
    const filtered = useGridFilter(rows, fCode, fName, fDept, fGroup);
    return ((0, jsx_runtime_1.jsx)("div", {
        className: AutoAlloc_module_css_1.default.tableOuter, children: (0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.tableWrap, children: (0, jsx_runtime_1.jsxs)("table", {
                className: AutoAlloc_module_css_1.default.gridTable, style: { fontSize: '0.68rem' }, children: [(0, jsx_runtime_1.jsxs)("thead", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { style: { minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }, children: "#" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 90, maxWidth: 90, overflow: 'hidden' }, children: "M\u00C3 NV" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200 }, children: "T\u00CAN NH\u00C2N VI\u00CAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70 }, children: "PH\u00D2NG BAN" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', minWidth: 70, color: '#0369a1' }, children: "NH\u00D3M \u0110\u1EB6C TH\u00D9" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 70, color: '#92400e' }, children: "NGH\u1EC8 TH\u00C1NG TR\u01AF\u1EDAC" }), Array.from({ length: 31 }, (_, i) => (0, jsx_runtime_1.jsx)("th", { className: AutoAlloc_module_css_1.default.dayNum, style: { minWidth: 64 }, children: i + 1 }, i)), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 44, color: '#15803d' }, children: "NG\u00C0Y C\u00D4NG" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 36, color: '#1d4ed8' }, children: "LP" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 36, color: '#7c3aed' }, children: "PN" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 50, color: '#1d4ed8' }, children: "T\u0102NG CA (H)" }), (0, jsx_runtime_1.jsx)("th", { style: { minWidth: 44, color: '#c2410c' }, children: "TR\u1EC4(PH)" })] }), (0, jsx_runtime_1.jsx)(InlineFilterRow, { fCode: fCode, fName: fName, fDept: fDept, setFCode: setFCode, setFName: setFName, setFDept: setFDept, deptList: deptList, extraBefore: 1, extraAfter: 5, extraMiddle: 1, fGroup: fGroup, setFGroup: setFGroup, groupList: groupList, codeThStyle: { maxWidth: 90, width: 90 }, nameThStyle: { maxWidth: 200, width: 200 }, monthLabel: monthLabel })] }), (0, jsx_runtime_1.jsx)("tbody", {
                    children: filtered.map((r, ri) => ((0, jsx_runtime_1.jsxs)("tr", {
                        style: { background: ri % 2 === 0 ? '#fff' : 'var(--gray-50)' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }, children: ri + 1 }), (0, jsx_runtime_1.jsx)("td", { className: AutoAlloc_module_css_1.default.mono, style: { maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.code }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', minWidth: 200, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: r.name }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }, children: r.deptName || '—' }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.65rem', color: '#0369a1', whiteSpace: 'nowrap' }, children: r.specialGroup || '—' }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'left', fontSize: '0.7rem', color: '#92400e', whiteSpace: 'nowrap' }, children: r.ngayNghiCuoiThangTruoc || '—' }), Array.from({ length: 31 }, (_, i) => {
                            const d = (r.days ?? []).find((x) => x.day === i + 1);
                            if (!d)
                                return (0, jsx_runtime_1.jsx)("td", { style: { background: '#fff', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }, children: (0, jsx_runtime_1.jsx)("span", { style: { color: '#d1d5db' }, children: "\u00B7" }) }, i);
                            const dt = Number(d.dayType);
                            const isWork = dt === 0;
                            return (0, jsx_runtime_1.jsx)("td", { style: { background: DT_CELL_BG[dt] ?? '#fff', color: DT_TEXT[dt] ?? '#9ca3af', fontWeight: 600, fontSize: '0.65rem', textAlign: 'center', padding: '2px 1px', minWidth: 48, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', lineHeight: 1.3 }, title: (DAY_TYPE_LABEL[dt] ?? '') + ' | ' + (d.shiftCode ?? ''), children: isWork ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { style: { color: '#15803d', display: 'block', lineHeight: 1.2 }, children: d.checkIn }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#1d4ed8', display: 'block', lineHeight: 1.2 }, children: d.checkOut })] }) : (0, jsx_runtime_1.jsx)("span", { style: { opacity: 0.85 }, children: DT_SYMBOL[dt] ?? '?' }) }, i);
                        }), (0, jsx_runtime_1.jsx)("td", { style: { fontWeight: 700, color: '#15803d', textAlign: 'center' }, children: r.workdays || '—' }), (0, jsx_runtime_1.jsx)("td", { style: { fontWeight: 700, color: '#1d4ed8', textAlign: 'center' }, children: r.lpCount ?? 0 }), (0, jsx_runtime_1.jsx)("td", { style: { fontWeight: 700, color: '#7c3aed', textAlign: 'center' }, children: r.pnCount ?? 0 }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center' }, children: Number(r.totalOT) > 0 ? (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.otTag, children: Number(r.totalOT).toFixed(1) }) : 0 }), (0, jsx_runtime_1.jsx)("td", { style: { textAlign: 'center' }, children: Number(r.totalLate) > 0 ? (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.lateTag, children: r.totalLate }) : 0 })]
                    }, r.code)))
                })]
            })
        })
    }));
}
function ValidatePanel({ monthId, onlyIds, title, subtitle, btnId, onFixed, autoRun }) {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [fixing, setFixing] = (0, react_1.useState)(false);
    const [fixingLp, setFixingLp] = (0, react_1.useState)(false);
    const [fixingConsec, setFixingConsec] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [openIds, setOpenIds] = (0, react_1.useState)(new Set());
    (0, react_1.useEffect)(() => {
        if (autoRun)
            run();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const fixPn = async () => {
        setFixing(true);
        setError(null);
        try {
            const r = await fetch('/api/distribution/fix-pn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId }) });
            if (!r.ok)
                throw new Error(await r.text());
            setResult(null);
            onFixed?.();
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setFixing(false);
        }
    };
    const fixConsec = async () => {
        setFixingConsec(true);
        setError(null);
        try {
            const r = await fetch('/api/distribution/fix-consecutive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId }) });
            if (!r.ok)
                throw new Error(await r.text());
            setResult(null);
            onFixed?.();
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setFixingConsec(false);
        }
    };
    const fixLp = async () => {
        setFixingLp(true);
        setError(null);
        try {
            const r = await fetch('/api/distribution/fix-lp-balance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId }) });
            if (!r.ok)
                throw new Error(await r.text());
            setResult(null);
            onFixed?.();
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setFixingLp(false);
        }
    };
    const run = async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch(`/api/distribution/validate?month=${monthId}`);
            if (!r.ok)
                throw new Error(await r.text());
            const data = await r.json();
            if (onlyIds?.length) {
                data.results = data.results.filter(c => onlyIds.includes(c.id));
                data.totalViolations = data.results.reduce((s, c) => s + c.violationCount, 0);
                data.overallStatus = data.results.some((c) => c.status === 'error') ? 'error' : data.results.some((c) => c.status === 'warning') ? 'warning' : 'ok';
            }
            setResult(data);
            setOpenIds(new Set(data.results.filter(c => c.violationCount > 0).map(c => c.id)));
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setLoading(false);
        }
    };
    const statusClass = { ok: AutoAlloc_module_css_1.default.checkCardOk, warning: AutoAlloc_module_css_1.default.checkCardWarn, error: AutoAlloc_module_css_1.default.checkCardError };
    const dotClass = { ok: AutoAlloc_module_css_1.default.dotOk, warning: AutoAlloc_module_css_1.default.dotWarn, error: AutoAlloc_module_css_1.default.dotError };
    const countClass = { ok: AutoAlloc_module_css_1.default.countOk, warning: AutoAlloc_module_css_1.default.countWarn, error: AutoAlloc_module_css_1.default.countError };
    const summaryClass = { ok: AutoAlloc_module_css_1.default.summaryOk, warning: AutoAlloc_module_css_1.default.summaryWarn, error: AutoAlloc_module_css_1.default.summaryError };
    const summaryLabel = { ok: '✅ Tất cả điều kiện đạt', warning: '⚠️ Có cảnh báo cần xem xét', error: '❌ Có điều kiện chưa thỏa mãn' };
    return ((0, jsx_runtime_1.jsxs)("div", {
        className: AutoAlloc_module_css_1.default.validateWrap, style: { borderTop: '2px solid #e2e8f0', marginTop: 4 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: AutoAlloc_module_css_1.default.validateHeader, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.validateTitle, children: title ?? '🔍 Kiểm tra điều kiện phân bổ' }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }, children: subtitle ?? 'Xác minh các quy tắc nghiệp vụ' })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [result && ((0, jsx_runtime_1.jsxs)("div", { className: AutoAlloc_module_css_1.default.validateSummary, children: [(0, jsx_runtime_1.jsx)("span", { className: `${AutoAlloc_module_css_1.default.validateSummaryBadge} ${summaryClass[result.overallStatus]}`, children: summaryLabel[result.overallStatus] }), (0, jsx_runtime_1.jsxs)("span", { style: { color: 'var(--gray-500)', fontSize: '0.75rem' }, children: [result.totalEmps, " NV \u00B7 ", result.totalViolations, " vi ph\u1EA1m"] })] })), (0, jsx_runtime_1.jsx)("button", { className: AutoAlloc_module_css_1.default.btnValidate, onClick: run, disabled: loading, id: btnId, children: loading ? 'Đang kiểm tra...' : '🔍 Kiểm tra' })] })] }), error && (0, jsx_runtime_1.jsxs)("div", { style: { background: '#fef2f2', padding: 10, color: '#b91c1c' }, children: ["\u26A0\uFE0F L\u1ED7i: ", error] }), result && ((0, jsx_runtime_1.jsx)("div", {
            className: AutoAlloc_module_css_1.default.validateGrid, children: result.results.map(check => ((0, jsx_runtime_1.jsxs)("div", {
                className: `${AutoAlloc_module_css_1.default.checkCard} ${statusClass[check.status]}`, children: [(0, jsx_runtime_1.jsxs)("div", {
                    className: AutoAlloc_module_css_1.default.checkCardHeader, onClick: () => setOpenIds(prev => {
                        const n = new Set(prev); if (n.has(check.id))
                            n.delete(check.id);
                        else
                            n.add(check.id); return n;
                    }), children: [(0, jsx_runtime_1.jsx)("span", { className: `${AutoAlloc_module_css_1.default.checkStatusDot} ${dotClass[check.status]}` }), (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.checkLabel, children: check.label }), (0, jsx_runtime_1.jsx)("span", { className: `${AutoAlloc_module_css_1.default.checkCount} ${countClass[check.status]}`, children: check.violationCount === 0 ? `✓ ${check.checkedCount} đạt` : `${check.violationCount} vi phạm` }), check.id === 'consecutive_days' && check.violationCount > 0 && ((0, jsx_runtime_1.jsx)("button", { className: AutoAlloc_module_css_1.default.btnFixInline, onClick: e => { e.stopPropagation(); fixConsec(); }, disabled: fixingConsec || loading, type: "button", children: fixingConsec ? '...' : '🔧 Sửa liên tiếp' })), check.id === 'pn_start_day' && check.violationCount > 0 && ((0, jsx_runtime_1.jsx)("button", { className: AutoAlloc_module_css_1.default.btnFixInline, onClick: e => { e.stopPropagation(); fixPn(); }, disabled: fixing || loading, type: "button", children: fixing ? '...' : '🔧 Sửa vị trí PN' })), check.id === 'lp_balance' && check.violationCount > 0 && ((0, jsx_runtime_1.jsx)("button", { className: AutoAlloc_module_css_1.default.btnFixInline, onClick: e => { e.stopPropagation(); fixLp(); }, disabled: fixingLp || loading, type: "button", children: fixingLp ? '...' : '⚖️ Cân bằng LP' }))]
                }), openIds.has(check.id) && check.violationCount > 0 && ((0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.violationList, children: check.violations.slice(0, 8).map((v, i) => ((0, jsx_runtime_1.jsxs)("div", { className: AutoAlloc_module_css_1.default.violationRow, children: [(0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.violationCode, children: v.code }), (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.violationName, children: v.name }), (0, jsx_runtime_1.jsx)("span", { className: AutoAlloc_module_css_1.default.violationDetail, children: v.detail })] }, i))) }))]
            }, check.id)))
        }))]
    }));
}
/* === AllocConfigPanel — Cấu hình áp dụng cho Bước 2 === */
const STEP2_PARAM_KEYS = ['max_consecutive_days', 'workdays_algorithm_threshold', 'pn_start_from_day', 'pn_preferred_position', 'skip_equal_rest_dept_codes'];
const STEP2_LABELS = {
    max_consecutive_days: 'Giới hạn ngày làm liên tục tối đa',
    workdays_algorithm_threshold: 'Ngưỡng chọn giải thuật',
    pn_start_from_day: 'PN từ ngày thứ',
    pn_preferred_position: 'Vị trí PN ưu tiên',
    skip_equal_rest_dept_codes: 'Không cân bằng LP cho phòng',
};
function AllocConfigPanel({ monthId }) {
    const [rules, setRules] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch(`/api/alloc-rules?month=${monthId}`).then(r => r.json()).then((d) => {
            const list = Array.isArray(d) ? d : (d.value ?? []);
            setRules(list.filter(r => STEP2_PARAM_KEYS.includes(r.paramKey)));
        }).catch(() => { });
    }, [monthId]);
    if (!rules.length)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", {
        style: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }, children: STEP2_PARAM_KEYS.map(key => {
            const r = rules.find(x => x.paramKey === key);
            if (!r)
                return null;
            return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 6, background: r.active ? '#f0fdf4' : '#f1f5f9', border: `1px solid ${r.active ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 6, padding: '4px 10px', fontSize: 12 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { color: r.active ? '#15803d' : '#94a3b8', fontWeight: 600 }, children: STEP2_LABELS[key] ?? key }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#64748b' }, children: ":" }), (0, jsx_runtime_1.jsx)("span", { style: { color: r.active ? '#0f172a' : '#94a3b8', fontWeight: 500 }, children: r.defaultParam || '—' }), !r.active && (0, jsx_runtime_1.jsx)("span", { style: { color: '#94a3b8', fontSize: 11 }, children: "(t\u1EAFt)" })] }, key));
        })
    }));
}
/* === StepView === */
function StepView({ step, data, onLoad, onRefresh, done, monthId, monthLabel, showCa, locked }) {
    (0, react_1.useEffect)(() => {
        if (!data)
            onLoad();
    }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!data)
        return (0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.emptyState, children: "\u0110ang t\u1EA3i..." });
    if (!Array.isArray(data))
        return (0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.emptyState, children: "L\u1ED7i d\u1EEF li\u1EC7u \u2014 vui l\u00F2ng restart server." });
    const rows = data;
    if (step === 1)
        return (0, jsx_runtime_1.jsx)(ImportGrid, { rows: rows, monthLabel: monthLabel });
    if (step === 2)
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(AllocConfigPanel, { monthId: monthId }), (0, jsx_runtime_1.jsx)(DayTypeGrid, { rows: rows, monthId: monthId, monthLabel: monthLabel, onSaved: onRefresh ?? onLoad, locked: locked }), (0, jsx_runtime_1.jsx)(ValidatePanel, { monthId: monthId, onlyIds: ['consecutive_days', 'pn_start_day', 'pn_end_of_rest', 'lp_balance'], title: "Ki\u1EC3m tra quy t\u1EAFc ng\u00E0y c\u00F4ng", subtitle: "Ki\u1EC3m tra 4 quy t\u1EAFc: ng\u00E0y l\u00E0m li\u00EAn ti\u1EBFp, v\u1ECB tr\u00ED PN, c\u00E2n b\u1EB1ng LP gi\u1EEFa NV c\u00F9ng ph\u00F2ng", btnId: "btn-validate-step2", onFixed: onRefresh ?? onLoad })] }));
    if (step === 3)
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(ShiftGrid, { rows: rows, monthLabel: monthLabel }), (0, jsx_runtime_1.jsx)(ValidatePanel, { monthId: monthId, onlyIds: ['shift_assigned'], title: "Ki\u1EC3m tra chia ca", subtitle: "Ki\u1EC3m tra t\u1EA5t c\u1EA3 ng\u00E0y l\u00E0m \u0111\u00E3 \u0111\u01B0\u1EE3c g\u00E1n ca", btnId: "btn-validate-step3" })] }));
    if (step === 4)
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(OtLateGrid, { rows: rows, monthLabel: monthLabel }), (0, jsx_runtime_1.jsx)(ValidatePanel, { monthId: monthId, onlyIds: ['ot_max_per_day', 'ot_start_day', 'late_max_per_day', 'late_start_day'], title: "Ki\u1EC3m tra OT & \u0110i tr\u1EC5", subtitle: "Ki\u1EC3m tra gi\u1EDBi h\u1EA1n OT/ng\u00E0y, ng\u00E0y b\u1EAFt \u0111\u1EA7u OT, gi\u1EDBi h\u1EA1n tr\u1EC5/ng\u00E0y, ng\u00E0y b\u1EAFt \u0111\u1EA7u tr\u1EC5", btnId: "btn-validate-step4" })] }));
    if (step === 5)
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(TimeGrid, { rows: rows, monthLabel: monthLabel, showCa: showCa ?? false }), (0, jsx_runtime_1.jsx)(ValidatePanel, { monthId: monthId, onlyIds: ['check_time'], title: "Ki\u1EC3m tra gi\u1EDD v\u00E0o/ra", subtitle: "Ki\u1EC3m tra ng\u00E0y l\u00E0m c\u00F3 gi\u1EDD v\u00E0o/ra h\u1EE3p l\u1EC7", btnId: "btn-validate-step5" })] }));
    if (step === 6)
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(FinalGrid, { rows: rows, monthLabel: monthLabel }), (0, jsx_runtime_1.jsx)(ValidatePanel, { monthId: monthId, autoRun: true, title: "\uD83D\uDD0D T\u1ED5ng h\u1EE3p ki\u1EC3m tra t\u1EA5t c\u1EA3 quy t\u1EAFc", subtitle: "Ki\u1EC3m tra to\u00E0n b\u1ED9: ng\u00E0y c\u00F4ng, chia ca, OT/tr\u1EC5, gi\u1EDD v\u00E0o/ra, c\u00E2n b\u1EB1ng LP", btnId: "btn-validate-step6", onFixed: onRefresh ?? onLoad })] }));
    return (0, jsx_runtime_1.jsx)("div", { className: AutoAlloc_module_css_1.default.emptyState, children: "L\u1ED7i b\u01B0\u1EDBc." });
}
