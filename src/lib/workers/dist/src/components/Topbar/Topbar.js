"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Topbar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Topbar_module_css_1 = __importDefault(require("./Topbar.module.css"));
const AppContext_1 = require("@/context/AppContext");
const PAGE_LABELS = {
    dashboard: 'Trang Chủ',
    'config-month': 'Tháng chấm công',
    departments: 'Phòng Ban',
    shifts: 'Ca Làm Việc',
    'leave-types': 'Loại Nghỉ Phép',
    'special-groups': 'Nhóm Đặc Thù',
    'import-employees': 'Nhân Viên',
    'alloc-rules': 'Quy Tắc Phân Bổ',
    'export-config': 'Xuất Cấu Hình',
    'auto-alloc': 'Bảng Chấm Công',
    'attendance-grid': 'Bảng Chấm Công',
    'export-attendance': 'Xuất Báo Cáo',
};
function Topbar() {
    const { currentPage, currentMonth, setCurrentMonth, monthListVersion, setActiveMonth } = (0, AppContext_1.useApp)();
    /* Chỉ render dynamic content sau khi mount (tránh hydration mismatch) */
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => setMounted(true), []);
    /* ── Fetch danh sách tháng từ DB ── */
    const [months, setMonths] = (0, react_1.useState)([]);
    const [loadingMonths, setLoadingMonths] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        setLoadingMonths(true);
        fetch('/api/months')
            .then(r => r.json())
            .then((data) => {
                const list = data
                    .map(d => ({ id: d.id, month: d.month, label: d.label ?? '' }))
                    .sort((a, b) => {
                        const [ma, ya] = a.month.split('/').map(Number);
                        const [mb, yb] = b.month.split('/').map(Number);
                        return (yb * 12 + mb) - (ya * 12 + ma);
                    });
                setMonths(list);
                // Nếu tháng hiện tại không có trong list → chọn tháng đầu tiên
                const monthCodes = list.map(m => m.month);
                if (list.length > 0 && !monthCodes.includes(currentMonth)) {
                    const first = list[0];
                    setCurrentMonth(first.month);
                    setActiveMonth(first.id, first.month);
                }
                else if (list.length > 0) {
                    // Sync activeMonthId với tháng hiện tại khi load lần đầu
                    const current = list.find(m => m.month === currentMonth);
                    if (current)
                        setActiveMonth(current.id, current.month);
                }
            })
            .catch(() => setMonths([]))
            .finally(() => setLoadingMonths(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthListVersion]);
    const isDashboard = currentPage === 'dashboard';
    const currentLabel = PAGE_LABELS[currentPage] ?? currentPage;
    /* Tên hiển thị trong select: "Label – MM/YYYY" hoặc chỉ "MM/YYYY" */
    const optionText = (m) => m.label ? `${m.label} (${m.month})` : m.month;
    const monthCodes = months.map(m => m.month);
    const selectedValue = monthCodes.includes(currentMonth) ? currentMonth : (months[0]?.month ?? '');
    /* ── Khi user chọn tháng khác trong dropdown ── */
    const handleMonthChange = (monthCode) => {
        setCurrentMonth(monthCode);
        const found = months.find(m => m.month === monthCode);
        if (found)
            setActiveMonth(found.id, found.month);
    };
    return ((0, jsx_runtime_1.jsxs)("header", { className: Topbar_module_css_1.default.topbar, children: [(0, jsx_runtime_1.jsx)("div", { className: Topbar_module_css_1.default.left, children: (0, jsx_runtime_1.jsx)("div", { className: Topbar_module_css_1.default.breadcrumb, children: isDashboard ? ((0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.breadcrumbCurrent, children: "Trang Ch\u1EE7" })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.breadcrumbRoot, children: "Trang ch\u1EE7" }), (0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.breadcrumbSep, children: "/" }), (0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.breadcrumbCurrent, children: currentLabel })] })) }) }), (0, jsx_runtime_1.jsxs)("div", { className: Topbar_module_css_1.default.right, children: [(0, jsx_runtime_1.jsxs)("div", { className: Topbar_module_css_1.default.monthPicker, children: [(0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.monthLabel, children: "\uD83D\uDCC5 Th\u00E1ng:" }), !mounted || loadingMonths ? ((0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.monthLoading, children: "\u2026" })) : months.length === 0 ? ((0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.monthEmpty, children: "Ch\u01B0a c\u00F3 th\u00E1ng" })) : ((0, jsx_runtime_1.jsx)("select", { className: Topbar_module_css_1.default.monthSelect, value: selectedValue, onChange: e => handleMonthChange(e.target.value), suppressHydrationWarning: true, children: months.map(m => ((0, jsx_runtime_1.jsx)("option", { value: m.month, suppressHydrationWarning: true, children: optionText(m) }, m.month))) }))] }), (0, jsx_runtime_1.jsxs)("button", { className: Topbar_module_css_1.default.iconBtn, title: "Th\u00F4ng b\u00E1o", children: ["\uD83D\uDD14", (0, jsx_runtime_1.jsx)("span", { className: Topbar_module_css_1.default.notifDot })] }), (0, jsx_runtime_1.jsx)("button", { className: Topbar_module_css_1.default.iconBtn, title: "T\u00E0i kho\u1EA3n", children: "\uD83D\uDC64" })] })] }));
}
