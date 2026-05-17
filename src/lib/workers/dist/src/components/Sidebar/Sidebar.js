"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Sidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const Sidebar_module_css_1 = __importDefault(require("./Sidebar.module.css"));
const AppContext_1 = require("@/context/AppContext");
/* ── Quản lý chung ─────────────────────────────── */
const MODULE0 = [
    { key: 'config-month', icon: '📅', label: 'Tháng Chấm công' },
];
/* ── Cấu hình Phân bổ ───────────────────────── */
const MODULE1 = [
    { key: 'departments', icon: '🏢', label: 'Phòng Ban' },
    { key: 'shifts', icon: '🕐', label: 'Ca Làm Việc' },
    { key: 'leave-types', icon: '📋', label: 'Loại Nghỉ Phép' },
    { key: 'special-groups', icon: '👥', label: 'Nhóm Đặc Thù' },
    { key: 'alloc-rules', icon: '⚙️', label: 'Quy Tắc Phân Bổ' },
    { key: 'import-employees', icon: '👥', label: 'Danh sách Nhân viên' },
    { key: 'export-config', icon: '📤', label: 'Xuất Cấu Hình' },
];
/* ── PHÂN BỔ CHẤM CÔNG ────────────── */
const MODULE2 = [
    { key: 'auto-alloc', icon: '🤖', label: 'Phân Bổ Tự Động' },
    { key: 'attendance-grid', icon: '📊', label: 'Bảng Chấm Công', badge: 'Mới' },
    { key: 'export-attendance', icon: '📑', label: 'Xuất Báo Cáo' },
];
function NavList({ items, currentPage, navigate, collapsed }) {
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: items.map(item => ((0, jsx_runtime_1.jsxs)("button", { className: `${Sidebar_module_css_1.default.navItem} ${currentPage === item.key ? Sidebar_module_css_1.default.active : ''}`, onClick: () => navigate(item.key), title: collapsed ? item.label : undefined, children: [(0, jsx_runtime_1.jsx)("span", { className: Sidebar_module_css_1.default.navIcon, children: item.icon }), !collapsed && (0, jsx_runtime_1.jsx)("span", { className: Sidebar_module_css_1.default.navLabel, children: item.label }), !collapsed && item.badge && ((0, jsx_runtime_1.jsx)("span", { className: Sidebar_module_css_1.default.badge, children: item.badge }))] }, item.key))) }));
}
function Sidebar() {
    const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = (0, AppContext_1.useApp)();
    const navigate = (key) => setCurrentPage(key);
    return ((0, jsx_runtime_1.jsxs)("aside", { className: `${Sidebar_module_css_1.default.sidebar} ${sidebarCollapsed ? Sidebar_module_css_1.default.collapsed : ''}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.header, children: [(0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.logo, children: [(0, jsx_runtime_1.jsx)("div", { className: Sidebar_module_css_1.default.logoIcon, children: "C" }), !sidebarCollapsed && ((0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.logoText, children: [(0, jsx_runtime_1.jsx)("span", { className: Sidebar_module_css_1.default.logoTitle, children: "COSTCO" }), (0, jsx_runtime_1.jsx)("span", { className: Sidebar_module_css_1.default.logoSub, children: "Qu\u1EA3n L\u00FD Ch\u1EA5m C\u00F4ng" })] }))] }), (0, jsx_runtime_1.jsx)("button", { className: Sidebar_module_css_1.default.toggleBtn, onClick: toggleSidebar, title: "Thu/M\u1EDF menu", children: sidebarCollapsed ? '▶' : '◀' })] }), (0, jsx_runtime_1.jsxs)("nav", { className: Sidebar_module_css_1.default.nav, children: [(0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.section, children: [!sidebarCollapsed && ((0, jsx_runtime_1.jsx)("div", { className: Sidebar_module_css_1.default.sectionTitle, children: "QU\u1EA2N L\u00DD CHUNG" })), (0, jsx_runtime_1.jsx)(NavList, { items: MODULE0, currentPage: currentPage, navigate: navigate, collapsed: sidebarCollapsed })] }), (0, jsx_runtime_1.jsx)("div", { className: Sidebar_module_css_1.default.divider }), (0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.section, children: [!sidebarCollapsed && ((0, jsx_runtime_1.jsx)("div", { className: Sidebar_module_css_1.default.sectionTitle, children: "MODULE I \u2013 C\u1EA4U H\u00CCNH" })), (0, jsx_runtime_1.jsx)(NavList, { items: MODULE1, currentPage: currentPage, navigate: navigate, collapsed: sidebarCollapsed })] }), (0, jsx_runtime_1.jsx)("div", { className: Sidebar_module_css_1.default.divider }), (0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.section, children: [!sidebarCollapsed && ((0, jsx_runtime_1.jsx)("div", { className: Sidebar_module_css_1.default.sectionTitle, children: "MODULE II \u2013 PH\u00C2N B\u1ED4 CH\u1EA4M C\u00D4NG" })), (0, jsx_runtime_1.jsx)(NavList, { items: MODULE2, currentPage: currentPage, navigate: navigate, collapsed: sidebarCollapsed })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.footer, children: [(0, jsx_runtime_1.jsx)("div", { className: Sidebar_module_css_1.default.userAvatar, children: "HR" }), !sidebarCollapsed && ((0, jsx_runtime_1.jsxs)("div", { className: Sidebar_module_css_1.default.userInfo, children: [(0, jsx_runtime_1.jsx)("span", { className: Sidebar_module_css_1.default.userName, children: "Admin HR" }), (0, jsx_runtime_1.jsx)("span", { className: Sidebar_module_css_1.default.userRole, children: "Qu\u1EA3n tr\u1ECB vi\u00EAn" })] }))] })] }));
}
