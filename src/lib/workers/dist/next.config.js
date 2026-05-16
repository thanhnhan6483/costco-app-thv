"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nextConfig = {
    // Dùng webpack (không phải Turbopack) để tương thích với duckdb native bindings
    // DuckDB sử dụng .node native addon, Turbopack chưa hỗ trợ
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Không bundle duckdb – dùng require() tại runtime
            config.externals = [
                ...(Array.isArray(config.externals) ? config.externals : []),
                'duckdb',
                'duckdb-async',
            ];
        }
        return config;
    },
    // Khai báo turbopack rỗng để tắt cảnh báo,
    // nhưng thực tế webpack sẽ được dùng khi chạy --webpack flag
    turbopack: {},
};
exports.default = nextConfig;
