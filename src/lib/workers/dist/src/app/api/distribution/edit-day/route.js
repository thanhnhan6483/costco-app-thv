"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/**
 * PATCH /api/distribution/edit-day
 * Body: { monthId, changes: [{ empCode, day, dayType }] }
 * Cập nhật day_type trong distribution_results cho từng NV/ngày.
 */
async function PATCH(req) {
    const { monthId, changes } = await req.json();
    if (!monthId || !changes?.length) {
        return server_1.NextResponse.json({ error: 'Thiếu monthId hoặc changes' }, { status: 400 });
    }
    const conn = await (0, db_1.getConn)();
    try {
        // Tra cứu empCode → empId
        const codes = [...new Set(changes.map(c => c.empCode))];
        const placeholders = codes.map(() => '?').join(',');
        const empRows = await conn.all(`SELECT id, code FROM employees WHERE month_id = ? AND code IN (${placeholders})`, monthId, ...codes);
        const codeToId = new Map(empRows.map(e => [e.code, e.id]));
        let updated = 0;
        for (const c of changes) {
            const empId = codeToId.get(c.empCode);
            if (!empId)
                continue;
            const existing = await conn.all(`SELECT id FROM distribution_results WHERE month_id = ? AND employee_id = ? AND day = ?`, monthId, empId, c.day);
            if (existing.length > 0) {
                await conn.run(`UPDATE distribution_results SET day_type = ? WHERE month_id = ? AND employee_id = ? AND day = ?`, c.dayType, monthId, empId, c.day);
            }
            else {
                const { randomUUID } = await Promise.resolve().then(() => __importStar(require('crypto')));
                await conn.run(`INSERT INTO distribution_results (id, month_id, employee_id, day, day_type, check_in, check_out, shift_code, ot_hours, late_mins, created_at)
           VALUES (?, ?, ?, ?, ?, '', '', '', 0, 0, ?)`, randomUUID(), monthId, empId, c.day, c.dayType, new Date().toISOString());
            }
            updated++;
        }
        await conn.close();
        return server_1.NextResponse.json({ ok: true, updated });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
