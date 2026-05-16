"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttendanceGrid;
const jsx_runtime_1 = require("react/jsx-runtime");
const AttendanceGrid_module_css_1 = __importDefault(require("./AttendanceGrid.module.css"));
const AppContext_1 = require("@/context/AppContext");
const SYMBOL_COLORS = {
    X: '#10b981', 'X/2': '#34d399', LP: '#94a3b8', L: '#94a3b8',
    NL: '#64748b', P: '#60a5fa', PN: '#3b82f6', Ô: '#f59e0b',
    TS: '#a78bfa', DS: '#c084fc', O: '#ef4444', LL: '#f97316',
    LN: '#fb923c', H: '#22d3ee', B: '#f43f5e', OF: '#6b7280',
};
const DAYS_IN_MAY = 31;
function AttendanceGrid() {
    const { employees, departments } = (0, AppContext_1.useApp)();
    const days = Array.from({ length: DAYS_IN_MAY }, (_, i) => i + 1);
    const grouped = departments
        .filter(d => d.active)
        .map(dept => ({
        dept,
        emps: employees.filter(e => e.department === dept.code),
    }))
        .filter(g => g.emps.length > 0);
    return ((0, jsx_runtime_1.jsxs)("div", { className: AttendanceGrid_module_css_1.default.page, children: [(0, jsx_runtime_1.jsxs)("div", { className: AttendanceGrid_module_css_1.default.pageHeader, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: AttendanceGrid_module_css_1.default.title, children: "B\u1EA3ng Ch\u1EA5m C\u00F4ng" }), (0, jsx_runtime_1.jsx)("p", { className: AttendanceGrid_module_css_1.default.subtitle, children: "Xem v\u00E0 ki\u1EC3m tra ch\u1EA5m c\u00F4ng theo t\u1EEBng nh\u00E2n vi\u00EAn" })] }), (0, jsx_runtime_1.jsx)("button", { className: AttendanceGrid_module_css_1.default.btnExport, children: "\uD83D\uDCE5 Xu\u1EA5t Excel" })] }), (0, jsx_runtime_1.jsx)("div", { className: AttendanceGrid_module_css_1.default.legend, children: Object.entries(SYMBOL_COLORS).slice(0, 8).map(([sym, color]) => ((0, jsx_runtime_1.jsxs)("div", { className: AttendanceGrid_module_css_1.default.legendItem, children: [(0, jsx_runtime_1.jsx)("span", { className: AttendanceGrid_module_css_1.default.legendDot, style: { background: color } }), (0, jsx_runtime_1.jsx)("span", { children: sym })] }, sym))) }), grouped.map(({ dept, emps }) => ((0, jsx_runtime_1.jsxs)("div", { className: AttendanceGrid_module_css_1.default.deptSection, children: [(0, jsx_runtime_1.jsxs)("div", { className: AttendanceGrid_module_css_1.default.deptHeader, children: [(0, jsx_runtime_1.jsx)("span", { className: AttendanceGrid_module_css_1.default.deptCode, children: dept.code }), (0, jsx_runtime_1.jsx)("span", { className: AttendanceGrid_module_css_1.default.deptName, children: dept.name }), (0, jsx_runtime_1.jsxs)("span", { className: AttendanceGrid_module_css_1.default.empCount, children: [emps.length, " nh\u00E2n vi\u00EAn"] })] }), (0, jsx_runtime_1.jsx)("div", { className: AttendanceGrid_module_css_1.default.gridWrap, children: (0, jsx_runtime_1.jsxs)("table", { className: AttendanceGrid_module_css_1.default.grid, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { className: AttendanceGrid_module_css_1.default.stickyCol, children: "Nh\u00E2n Vi\u00EAn" }), days.map(d => ((0, jsx_runtime_1.jsx)("th", { className: [1, 8, 15, 22, 29].includes(d) ? AttendanceGrid_module_css_1.default.sundayHead : '', children: d }, d))), (0, jsx_runtime_1.jsx)("th", { children: "C\u00F4ng" }), (0, jsx_runtime_1.jsx)("th", { children: "OT (h)" }), (0, jsx_runtime_1.jsx)("th", { children: "Tr\u1EC5" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: emps.map(emp => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { className: AttendanceGrid_module_css_1.default.stickyCol, children: (0, jsx_runtime_1.jsxs)("div", { className: AttendanceGrid_module_css_1.default.empCell, children: [(0, jsx_runtime_1.jsx)("span", { className: AttendanceGrid_module_css_1.default.empCode, children: emp.code }), (0, jsx_runtime_1.jsx)("span", { className: AttendanceGrid_module_css_1.default.empName, children: emp.name }), emp.groupCode && (0, jsx_runtime_1.jsx)("span", { className: AttendanceGrid_module_css_1.default.groupTag, children: emp.groupCode })] }) }), days.map(d => {
                                                const sym = emp.attendance[String(d)] || '';
                                                const color = SYMBOL_COLORS[sym] || '#e2e8f0';
                                                return ((0, jsx_runtime_1.jsx)("td", { className: AttendanceGrid_module_css_1.default.dayCell, children: sym && ((0, jsx_runtime_1.jsx)("span", { className: AttendanceGrid_module_css_1.default.symBadge, style: { background: color + '25', color, borderColor: color + '60' }, children: sym })) }, d));
                                            }), (0, jsx_runtime_1.jsx)("td", { className: AttendanceGrid_module_css_1.default.sumCell, children: (0, jsx_runtime_1.jsx)("strong", { children: emp.workdays }) }), (0, jsx_runtime_1.jsx)("td", { className: AttendanceGrid_module_css_1.default.sumCell, children: emp.overtimeHours }), (0, jsx_runtime_1.jsx)("td", { className: AttendanceGrid_module_css_1.default.sumCell, children: (0, jsx_runtime_1.jsx)("span", { className: emp.lateMinutes > 30 ? AttendanceGrid_module_css_1.default.lateDanger : '', children: emp.lateMinutes }) })] }, emp.id))) })] }) })] }, dept.id)))] }));
}
