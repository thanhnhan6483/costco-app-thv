"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
/**
 * POST /api/alloc-rules/migrate-groups
 * Thêm các cột group_code, group_name, specific_value vào alloc_rules
 * và update data cũ để gán vào nhóm mặc định.
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
async function POST() {
    const conn = await (0, db_1.getConn)();
    const msgs = [];
    try {
        const cols = await conn.all(`SELECT column_name FROM information_schema.columns WHERE table_name='alloc_rules'`);
        const names = cols.map(c => c.column_name);
        if (!names.includes('group_code')) {
            await conn.run(`ALTER TABLE alloc_rules ADD COLUMN group_code VARCHAR DEFAULT 'WORK_RULE'`);
            msgs.push('Added group_code');
        }
        if (!names.includes('group_name')) {
            await conn.run(`ALTER TABLE alloc_rules ADD COLUMN group_name VARCHAR DEFAULT 'Quy tắc làm việc'`);
            msgs.push('Added group_name');
        }
        if (!names.includes('specific_value')) {
            await conn.run(`ALTER TABLE alloc_rules ADD COLUMN specific_value VARCHAR DEFAULT ''`);
            msgs.push('Added specific_value');
        }
        // Backfill existing rows with GENERAL group
        await conn.run(`UPDATE alloc_rules SET group_code='WORK_RULE', group_name='Quy tắc làm việc' WHERE group_code IS NULL OR group_code=''`);
        msgs.push('Backfilled existing rows');
        await conn.close();
        return server_1.NextResponse.json({ ok: true, messages: msgs });
    }
    catch (e) {
        await conn.close();
        return server_1.NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
