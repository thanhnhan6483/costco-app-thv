"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppProvider = AppProvider;
exports.useApp = useApp;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const defaults_1 = require("@/data/defaults");
const constants_1 = require("@/lib/constants");
const AppContext = (0, react_1.createContext)(null);
function AppProvider({ children }) {
    const [currentMonth, setCurrentMonth] = (0, react_1.useState)('05/2026');
    const [currentPage, setCurrentPage] = (0, react_1.useState)('dashboard');
    const [departments, setDepartments] = (0, react_1.useState)(defaults_1.DEFAULT_DEPARTMENTS);
    const [shifts, setShifts] = (0, react_1.useState)(defaults_1.DEFAULT_SHIFTS);
    const [leaveTypes] = (0, react_1.useState)(defaults_1.DEFAULT_LEAVE_TYPES);
    const [specialGroups] = (0, react_1.useState)(defaults_1.DEFAULT_SPECIAL_GROUPS);
    const [employees, setEmployees] = (0, react_1.useState)(defaults_1.SAMPLE_EMPLOYEES);
    const [allocRules, setAllocRules] = (0, react_1.useState)(defaults_1.DEFAULT_ALLOC_RULES);
    const [sidebarCollapsed, setSidebarCollapsed] = (0, react_1.useState)(false);
    const [monthListVersion, setMonthListVersion] = (0, react_1.useState)(0);
    // activeMonth: tháng được chọn trong màn hình "Tháng chấm công" để Module I lọc dữ liệu
    const [activeMonthId, setActiveMonthId] = (0, react_1.useState)(constants_1.DEFAULT_MONTH_ID);
    const [activeMonthLabel, setActiveMonthLabel] = (0, react_1.useState)('01/2026');
    const toggleSidebar = () => setSidebarCollapsed(p => !p);
    const refreshMonthList = () => setMonthListVersion(v => v + 1);
    const setActiveMonth = (id, label) => {
        setActiveMonthId(id);
        setActiveMonthLabel(label);
    };
    return ((0, jsx_runtime_1.jsx)(AppContext.Provider, {
        value: {
            currentMonth, currentPage, departments, shifts, leaveTypes,
            specialGroups, employees, allocRules, sidebarCollapsed, monthListVersion,
            activeMonthId, activeMonthLabel,
            setCurrentMonth, setCurrentPage, setDepartments, setShifts,
            setEmployees, setAllocRules, toggleSidebar, refreshMonthList, setActiveMonth,
        }, children: children
    }));
}
function useApp() {
    const ctx = (0, react_1.useContext)(AppContext);
    if (!ctx)
        throw new Error('useApp must be used within AppProvider');
    return ctx;
}
