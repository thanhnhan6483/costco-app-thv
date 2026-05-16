"use strict";
/**
 * MonthBanner – hiển thị tháng đang cấu hình ở đầu mỗi module I.
 * Khi user click "Đổi tháng", điều hướng sang trang Tháng Phân Bổ.
 */
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MonthBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const AppContext_1 = require("@/context/AppContext");
const MonthBanner_module_css_1 = __importDefault(require("./MonthBanner.module.css"));
function MonthBanner({ moduleName }) {
    const { activeMonthLabel, setCurrentPage } = (0, AppContext_1.useApp)();
    if (!activeMonthLabel)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: MonthBanner_module_css_1.default.banner, children: [(0, jsx_runtime_1.jsx)("span", { className: MonthBanner_module_css_1.default.icon, children: "\uD83D\uDCC5" }), (0, jsx_runtime_1.jsxs)("span", { className: MonthBanner_module_css_1.default.text, children: ["\u0110ang c\u1EA5u h\u00ECnh ", (0, jsx_runtime_1.jsx)("strong", { children: moduleName }), " cho th\u00E1ng", ' ', (0, jsx_runtime_1.jsx)("span", { className: MonthBanner_module_css_1.default.month, children: activeMonthLabel })] }), (0, jsx_runtime_1.jsx)("button", { className: MonthBanner_module_css_1.default.changeBtn, onClick: () => setCurrentPage('config-month'), title: "Chuy\u1EC3n sang trang Th\u00E1ng Ph\u00E2n B\u1ED5 \u0111\u1EC3 \u0111\u1ED5i th\u00E1ng", children: "\u0110\u1ED5i th\u00E1ng" })] }));
}
