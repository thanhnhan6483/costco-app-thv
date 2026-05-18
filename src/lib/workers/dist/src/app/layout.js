"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
require("./globals.css");
exports.metadata = {
    title: "THV – Quản Lý Chấm Công",
    description: "Hệ thống quản lý chấm công THV – cấu hình tháng, phân bổ ca làm việc, xuất báo cáo Excel",
};
function RootLayout({ children, }) {
    return ((0, jsx_runtime_1.jsxs)("html", { lang: "vi", suppressHydrationWarning: true, children: [(0, jsx_runtime_1.jsxs)("head", { children: [(0, jsx_runtime_1.jsx)("link", { rel: "preconnect", href: "https://fonts.googleapis.com" }), (0, jsx_runtime_1.jsx)("link", { href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@600;700;800&display=swap", rel: "stylesheet" })] }), (0, jsx_runtime_1.jsx)("body", { suppressHydrationWarning: true, children: children })] }));
}
