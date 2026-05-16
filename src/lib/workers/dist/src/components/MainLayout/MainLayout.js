"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MainLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const MainLayout_module_css_1 = __importDefault(require("./MainLayout.module.css"));
const Sidebar_1 = __importDefault(require("@/components/Sidebar/Sidebar"));
const Topbar_1 = __importDefault(require("@/components/Topbar/Topbar"));
const AppContext_1 = require("@/context/AppContext");
const Dashboard_1 = __importDefault(require("@/components/pages/Dashboard/Dashboard"));
const Departments_1 = __importDefault(require("@/components/pages/Departments/Departments"));
const Shifts_1 = __importDefault(require("@/components/pages/Shifts/Shifts"));
const LeaveTypes_1 = __importDefault(require("@/components/pages/LeaveTypes/LeaveTypes"));
const SpecialGroups_1 = __importDefault(require("@/components/pages/SpecialGroups/SpecialGroups"));
const AllocRules_1 = __importDefault(require("@/components/pages/AllocRules/AllocRules"));
const AttendanceGrid_1 = __importDefault(require("@/components/pages/AttendanceGrid/AttendanceGrid"));
const PlaceholderPage_1 = __importDefault(require("@/components/pages/PlaceholderPage/PlaceholderPage"));
const ConfigMonth_1 = __importDefault(require("@/components/pages/ConfigMonth/ConfigMonth"));
const ImportEmployees_1 = __importDefault(require("@/components/pages/ImportEmployees/ImportEmployees"));
const AutoAlloc_1 = __importDefault(require("@/components/pages/AutoAlloc/AutoAlloc"));
class ErrorBoundary extends react_1.Component {
    constructor() {
        super(...arguments);
        this.state = { error: null };
    }
    static getDerivedStateFromError(e) { return { error: e.message }; }
    render() {
        if (this.state.error)
            return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 32, color: '#b91c1c', background: '#fef2f2', borderRadius: 8, margin: 16 }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "L\u1ED7i:" }), " ", this.state.error, (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)("button", { style: { marginTop: 12, padding: '4px 12px' }, onClick: () => this.setState({ error: null }), children: "Th\u1EED l\u1EA1i" })] }));
        return this.props.children;
    }
}
function renderPage(page) {
    switch (page) {
        case 'dashboard': return (0, jsx_runtime_1.jsx)(Dashboard_1.default, {});
        case 'config-month': return (0, jsx_runtime_1.jsx)(ConfigMonth_1.default, {});
        case 'departments': return (0, jsx_runtime_1.jsx)(Departments_1.default, {});
        case 'shifts': return (0, jsx_runtime_1.jsx)(Shifts_1.default, {});
        case 'leave-types': return (0, jsx_runtime_1.jsx)(LeaveTypes_1.default, {});
        case 'special-groups': return (0, jsx_runtime_1.jsx)(SpecialGroups_1.default, {});
        case 'alloc-rules': return (0, jsx_runtime_1.jsx)(AllocRules_1.default, {});
        case 'attendance-grid': return (0, jsx_runtime_1.jsx)(AttendanceGrid_1.default, {});
        case 'import-employees': return (0, jsx_runtime_1.jsx)(ImportEmployees_1.default, {});
        case 'export-config':
            return (0, jsx_runtime_1.jsx)(PlaceholderPage_1.default, { title: "Xu\u1EA5t C\u1EA5u H\u00ECnh", icon: "\uD83D\uDCE4", description: "Xu\u1EA5t to\u00E0n b\u1ED9 c\u1EA5u h\u00ECnh th\u00E1ng ra file \u0111\u1EC3 l\u01B0u tr\u1EEF ho\u1EB7c chia s\u1EBB." });
        case 'auto-alloc': return (0, jsx_runtime_1.jsx)(ErrorBoundary, { children: (0, jsx_runtime_1.jsx)(AutoAlloc_1.default, {}) });
        case 'export-attendance':
            return (0, jsx_runtime_1.jsx)(PlaceholderPage_1.default, { title: "Xu\u1EA5t B\u00E1o C\u00E1o", icon: "\uD83D\uDCD1", description: "Xu\u1EA5t b\u1EA3ng ch\u1EA5m c\u00F4ng d\u1EA1ng Excel theo ph\u00F2ng ban ho\u1EB7c to\u00E0n c\u00F4ng ty." });
        default:
            return (0, jsx_runtime_1.jsx)(Dashboard_1.default, {});
    }
}
function MainLayout() {
    const { currentPage, sidebarCollapsed } = (0, AppContext_1.useApp)();
    return ((0, jsx_runtime_1.jsxs)("div", { className: MainLayout_module_css_1.default.layout, children: [(0, jsx_runtime_1.jsx)(Sidebar_1.default, {}), (0, jsx_runtime_1.jsxs)("div", { className: `${MainLayout_module_css_1.default.content} ${sidebarCollapsed ? MainLayout_module_css_1.default.contentExpanded : ''}`, children: [(0, jsx_runtime_1.jsx)(Topbar_1.default, {}), (0, jsx_runtime_1.jsx)("main", { className: MainLayout_module_css_1.default.main, children: renderPage(currentPage) }, currentPage)] })] }));
}
