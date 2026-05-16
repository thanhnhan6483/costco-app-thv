"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.toDb = toDb;
exports.fromDb = fromDb;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
exports.runtime = 'nodejs';
/** Encode JS string → latin1 codepoints trước khi lưu vào DuckDB qua parameterized query */
function toDb(s) {
    return Buffer.from(s ?? '', 'utf8').toString('latin1');
}
/** Decode latin1 codepoints → JS string khi đọc từ DuckDB */
function fromDb(v) {
    if (v == null)
        return '';
    try {
        return Buffer.from(String(v), 'latin1').toString('utf8');
    }
    catch {
        return String(v);
    }
}
function fixRow(r) {
    return {
        id: String(r.id ?? ''),
        monthId: String(r.monthId ?? ''),
        groupCode: fromDb(r.groupCode),
        groupName: fromDb(r.groupName),
        name: fromDb(r.name),
        paramKey: String(r.paramKey ?? ''),
        paramValue: r.paramValue != null ? Number(r.paramValue) : null,
        defaultParam: fromDb(r.defaultParam),
        specificValue: fromDb(r.specificValue),
        description: fromDb(r.description),
        active: Boolean(r.active),
        createdAt: String(r.createdAt ?? ''),
    };
}
async function GET(req) {
    try {
        const monthId = req.nextUrl.searchParams.get('month') ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        const rows = await conn.all(`SELECT id, month_id AS monthId, group_code AS groupCode, group_name AS groupName,
              name, param_key AS paramKey, param_value AS paramValue,
              default_param AS defaultParam, specific_value AS specificValue,
              description, active, created_at AS createdAt
       FROM alloc_rules WHERE month_id = ?
       ORDER BY group_code, created_at, id`, monthId);
        await conn.close();
        return server_1.NextResponse.json(rows.map(fixRow));
    }
    catch (e) {
        console.error('[GET /api/alloc-rules]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
async function POST(req) {
    try {
        const { id, name, defaultParam, specificValue, description, createdAt, monthId, groupCode, groupName, paramKey, paramValue } = await req.json();
        const mid = monthId ?? db_1.DEFAULT_MONTH_ID;
        const conn = await (0, db_1.getConn)();
        await conn.run(`INSERT INTO alloc_rules (id,month_id,group_code,group_name,name,param_key,param_value,default_param,specific_value,description,active,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,TRUE,?)`, id, mid, toDb(groupCode ?? 'WORK_RULE'), toDb(groupName ?? 'Quy tắc làm việc'), toDb(name), paramKey ?? '', paramValue ?? null, toDb(defaultParam ?? ''), toDb(specificValue ?? ''), toDb(description ?? ''), createdAt);
        await conn.close();
        return server_1.NextResponse.json({ ok: true }, { status: 201 });
    }
    catch (e) {
        console.error('[POST /api/alloc-rules]', e);
        return server_1.NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}
