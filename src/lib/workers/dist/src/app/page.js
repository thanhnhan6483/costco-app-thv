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
exports.default = Home;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const dynamic_1 = __importDefault(require("next/dynamic"));
const App = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@/context/AppContext'))).then(({ AppProvider }) => Promise.resolve().then(() => __importStar(require('@/components/MainLayout/MainLayout'))).then(({ default: MainLayout }) => {
    function App() {
        return ((0, jsx_runtime_1.jsx)(AppProvider, { children: (0, jsx_runtime_1.jsx)(MainLayout, {}) }));
    }
    return App;
})), { ssr: false });
class RootErrorBoundary extends react_1.Component {
    constructor() {
        super(...arguments);
        this.state = { error: null };
    }
    static getDerivedStateFromError(e) { return { error: e.message }; }
    render() {
        if (this.state.error)
            return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 32, color: '#b91c1c', background: '#fef2f2', borderRadius: 8, margin: 16, fontFamily: 'sans-serif' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "L\u1ED7i \u1EE9ng d\u1EE5ng:" }), " ", this.state.error, (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)("button", { style: { marginTop: 12, padding: '6px 16px', cursor: 'pointer' }, onClick: () => this.setState({ error: null }), children: "\uD83D\uDD04 Th\u1EED l\u1EA1i" })] }));
        return this.props.children;
    }
}
function Home() {
    return (0, jsx_runtime_1.jsx)(RootErrorBoundary, { children: (0, jsx_runtime_1.jsx)(App, {}) });
}
