"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlaceholderPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const PlaceholderPage_module_css_1 = __importDefault(require("./PlaceholderPage.module.css"));
function PlaceholderPage({ title, icon, description }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: PlaceholderPage_module_css_1.default.page, children: (0, jsx_runtime_1.jsxs)("div", { className: PlaceholderPage_module_css_1.default.card, children: [(0, jsx_runtime_1.jsx)("div", { className: PlaceholderPage_module_css_1.default.icon, children: icon }), (0, jsx_runtime_1.jsx)("h1", { className: PlaceholderPage_module_css_1.default.title, children: title }), (0, jsx_runtime_1.jsx)("p", { className: PlaceholderPage_module_css_1.default.desc, children: description }), (0, jsx_runtime_1.jsx)("div", { className: PlaceholderPage_module_css_1.default.wip, children: "\uD83D\uDEA7 T\u00EDnh n\u0103ng \u0111ang ph\u00E1t tri\u1EC3n" })] }) }));
}
