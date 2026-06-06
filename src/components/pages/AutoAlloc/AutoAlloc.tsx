'use client';
import React, { useState, useCallback, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useDeferredValue } from 'react';
import { useApp } from '@/context/AppContext';
import s from '@/styles/table.module.css';
import styles from './AutoAlloc.module.css';
import { IconSearch, IconClearX } from '@/lib/icons';

/* ── Reusable inline filter row for grids ── */
function InlineFilterRow({ fCode, fName, fDept, setFCode, setFName, setFDept, deptList, extraBefore = 0, extraAfter = 0, daysCols = 31, codeThStyle, nameThStyle, monthLabel, fGroup, setFGroup, groupList, extraMiddle = 0, children, middleChildren }: {
  fCode: string; fName: string; fDept: string;
  setFCode: (v: string) => void; setFName: (v: string) => void; setFDept: (v: string) => void;
  deptList: string[]; extraBefore?: number; extraAfter?: number; daysCols?: number;
  codeThStyle?: React.CSSProperties; nameThStyle?: React.CSSProperties; monthLabel?: string;
  fGroup?: string; setFGroup?: (v: string) => void; groupList?: string[]; extraMiddle?: number;
  children?: React.ReactNode; middleChildren?: React.ReactNode;
}) {
  const trRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const prev = tr.previousElementSibling as HTMLElement | null;
    if (prev) {
      const h = prev.getBoundingClientRect().height;
      tr.style.setProperty('--filter-top', `${h}px`);
      // apply to all th inside
      tr.querySelectorAll('th').forEach(th => (th as HTMLElement).style.top = `${h}px`);
    }
  }, []);
  return (
    <tr ref={trRef} className={styles.filterRow}>
      {Array.from({ length: extraBefore }, (_, i) => <th key={`b${i}`} className={i === 0 ? styles.sc0 : undefined} />)}
      <th className={styles.sc1} style={codeThStyle}><div className={s.colFilter}><span className={s.colFilterIcon}><IconSearch /></span><input className={s.colFilterInput} value={fCode} placeholder="Mã…" onChange={e => setFCode(e.target.value)} />{fCode && <button className={s.colFilterClear} onClick={() => setFCode('')} type="button"><IconClearX /></button>}</div></th>
      <th className={styles.sc2} style={nameThStyle}><div className={s.colFilter}><span className={s.colFilterIcon}><IconSearch /></span><input className={s.colFilterInput} value={fName} placeholder="Tên…" onChange={e => setFName(e.target.value)} />{fName && <button className={s.colFilterClear} onClick={() => setFName('')} type="button"><IconClearX /></button>}</div></th>
      <th style={{ maxWidth: 50, width: 50, minWidth: 50, overflow: 'hidden' }}><select className={s.statusFilterSelect} value={fDept} onChange={e => setFDept(e.target.value)}><option value="">Tất cả</option>{deptList.map(d => <option key={d} value={d}>{d}</option>)}</select></th>
      {groupList && setFGroup !== undefined && <th><select className={s.statusFilterSelect} value={fGroup ?? ''} onChange={e => setFGroup(e.target.value)}><option value="">Tất cả</option>{groupList.map(g => <option key={g} value={g}>{g}</option>)}</select></th>}
      {Array.from({ length: extraMiddle }, (_, i) => <th key={'m' + i} />)}
      {middleChildren}
      {monthLabel ? (() => { const [mm, yyyy] = monthLabel.split('/'); return Array.from({ length: daysCols }, (_, di) => { const dow = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, di + 1).getDay(); const isSun = dow === 0, isSat = dow === 6; return <th key={'d' + di} style={{ fontSize: '0.6rem', fontWeight: 600, textAlign: 'center', color: isSun ? '#dc2626' : isSat ? '#2563eb' : '#64748b' }}>{DOW_SHORT[dow]}</th>; }); })() : Array.from({ length: daysCols }, (_, i) => <th key={'d' + i} />)}
      {Array.from({ length: extraAfter }, (_, i) => <th key={`a${i}`} />)}
      {children}
    </tr>
  );
}
function useDeptList(rows: Record<string, unknown>[]) {
  return useMemo(() => {
    const set = new Set<string>();
    for (const r of rows as any[]) { if (r.deptName) set.add(r.deptName); }
    return [...set].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rows]);
}
function useGridFilter(rows: Record<string, unknown>[], fCode: string, fName: string, fDept: string, fGroup = '') {
  const dFCode = useDeferredValue(fCode);
  const dFName = useDeferredValue(fName);
  const dFDept = useDeferredValue(fDept);
  const dFGroup = useDeferredValue(fGroup);
  return useMemo(() => rows.filter((r: any) => {
    if (dFCode && !String(r.code ?? '').toLowerCase().includes(dFCode.toLowerCase())) return false;
    if (dFName && !String(r.name ?? '').toLowerCase().includes(dFName.toLowerCase())) return false;
    if (dFDept && String(r.deptName ?? '') !== dFDept) return false;
    if (dFGroup && String(r.specialGroup ?? '') !== dFGroup) return false;
    return true;
  }), [rows, dFCode, dFName, dFDept, dFGroup]);
}

function useStatList(rows: Record<string, unknown>[], key: string, decimals?: number) {
  return useMemo(() => [...new Set((rows as any[]).map(r => {
    const raw = r[key] ?? '';
    if (decimals !== undefined && raw !== '' && raw !== '0' && Number(raw) > 0) return Number(raw).toFixed(decimals);
    return String(raw);
  }).filter(v => v && v !== '0'))].sort((a, b) => Number(a) - Number(b)), [rows, key, decimals]);
}
function StatFilterTh({ list, value, onChange }: { list: string[]; value: string; onChange: (v: string) => void }) {
  return <th><select className={s.statusFilterSelect} value={value} onChange={e => onChange(e.target.value)}><option value="">Tất cả</option>{list.map(v => <option key={v} value={v}>{v}</option>)}</select></th>;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;
function SortTh({ label, sortKey, sort, onSort, style, className }: { label: React.ReactNode; sortKey: string; sort: SortState; onSort: (k: string) => void; style?: React.CSSProperties; className?: string }) {
  const active = sort?.key === sortKey;
  return (
    <th onClick={() => onSort(sortKey)} className={className} style={{ cursor: 'pointer', whiteSpace: 'nowrap', ...style }}>
      {label}
      <span style={{ marginLeft: 3, fontSize: 9, opacity: active ? 1 : 0.3, color: active ? '#2563eb' : 'inherit', verticalAlign: 'middle' }}>
        {active ? (sort!.dir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  );
}
function DiffCell({ value, source, unit, decimals, cls, cls2, clr }: { value: unknown; source: unknown; unit: string; decimals: number; cls: string; cls2: string; clr: string }) {
  const num = Number(value) || 0;
  const src = Number(source) || 0;
  const match = Math.abs(num - src) < 0.01;
  const bg = num > 0 && !match ? '#fef2f2' : 'transparent';
  return <td className={cls} style={{ color: clr, background: bg }}>{num > 0 ? <span className={cls2}>{num.toFixed(decimals)}{unit}</span> : ''}</td>;
}
function useSortRows(rows: any[], sort: SortState) {
  return useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const va = String(a[sort.key] ?? ''); const vb = String(b[sort.key] ?? '');
      const cmp = va.localeCompare(vb, 'vi', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort]);
}
function ScrollTable({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrap = wrapRef.current, top = topRef.current, inner = innerRef.current;
    if (!wrap || !top || !inner) return;
    const syncWidth = () => { inner.style.width = wrap.scrollWidth + 'px'; };
    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(wrap);
    const onTop = () => { wrap.scrollLeft = top.scrollLeft; };
    const onWrap = () => { top.scrollLeft = wrap.scrollLeft; };
    top.addEventListener('scroll', onTop);
    wrap.addEventListener('scroll', onWrap);
    return () => { ro.disconnect(); top.removeEventListener('scroll', onTop); wrap.removeEventListener('scroll', onWrap); };
  }, []);
  return (
    <>
      <div ref={topRef} style={{ overflowX: 'auto', overflowY: 'hidden', height: 12 }}>
        <div ref={innerRef} style={{ height: 1 }} />
      </div>
      <div ref={wrapRef} className={className} style={style}>{children}</div>
    </>
  );
}
function useTopScrollbar() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrap = wrapRef.current, top = topRef.current, inner = innerRef.current;
    if (!wrap || !top || !inner) return;
    const syncWidth = () => { inner.style.width = wrap.scrollWidth + 'px'; };
    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(wrap);
    const onTopScroll = () => { wrap.scrollLeft = top.scrollLeft; };
    const onWrapScroll = () => { top.scrollLeft = wrap.scrollLeft; };
    top.addEventListener('scroll', onTopScroll);
    wrap.addEventListener('scroll', onWrapScroll);
    return () => { ro.disconnect(); top.removeEventListener('scroll', onTopScroll); wrap.removeEventListener('scroll', onWrapScroll); };
  }, []);
  return { wrapRef, topRef, innerRef };
}
function useSort(): [SortState, (key: string) => void] {
  const [sort, setSort] = useState<SortState>(null);
  const onSort = useCallback((key: string) => {
    setSort(prev => prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' });
  }, []);
  return [sort, onSort];
}

const IconPlay = () => <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z" /></svg>;
const IconCheck = () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>;
const IconDl = () => <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>;

function fmtDate(v: string): string {
  if (!v) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) { const [y, m, d] = v.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
  return v;
}

const STEPS = [
  { num: 1, apiNum: 1, key: 'step1Done', label: 'Xem dữ liệu', icon: '📋', editable: false, viewOnly: false },
  { num: 2, apiNum: 2, key: 'step2Done', label: 'Phân bổ ngày công', icon: '📊', editable: false, viewOnly: false },
  { num: 3, apiNum: 3, key: 'step3Done', label: 'Chia ca', icon: '🗓️', editable: false, viewOnly: false },
  { num: 4, apiNum: 4, key: 'step4Done', label: 'Tăng ca/Đi trễ', icon: '⏱️', editable: false, viewOnly: false },
  { num: 5, apiNum: 5, key: 'step5Done', label: 'Giờ vào/ra', icon: '🕐', editable: false, viewOnly: false },
  { num: 6, apiNum: 6, key: 'step6Done', label: 'Kết quả', icon: '📈', editable: false, viewOnly: true },
];

const DAY_TYPE_COLOR: Record<number, string> = {
  0: '#16a34a', 1: '#64748b', 2: '#7c3aed', 3: '#dc2626',
  4: '#db2777', 5: '#0d9488', 6: '#ea580c', 7: '#2563eb', 8: '#6b7280', 9: '#0891b2',
};
// Code có nghĩa = mã từ SYMBOL_TO_CODE (engine): 0=X,1=LP,2=PN,3=Ô,4=TS,5=DS,6=O,7=NL,8=OF,9=P
const DAY_TYPE_LABEL: Record<number, string> = {
  0: 'Làm (X)', 1: 'Nghỉ lịch (LP)', 2: 'Phép năm (PN)', 3: 'Ốm (Ô)', 4: 'Thai sản (TS)',
  5: 'Dưỡng sức (DS)', 6: 'Không phép (O)', 7: 'Nghỉ lễ (NL)', 8: 'Thôi việc (OF)', 9: 'Có phép (P)',
};
const DT_BG: Record<number, string> = { 0: '#f0fdf4', 1: '#fefce8', 2: '#eff6ff', 3: '#fef2f2', 4: '#fdf2f8', 5: '#f0fdfa', 6: '#fff7ed', 7: '#f7fee7', 8: '#f8fafc', 9: '#faf5ff' };
const DT_CLR: Record<number, string> = { 0: '#15803d', 1: '#92400e', 2: '#1d4ed8', 3: '#b91c1c', 4: '#be185d', 5: '#0f766e', 6: '#c2410c', 7: '#4d7c0f', 8: '#4b5563', 9: '#6d28d9' };
// Ký hiệu ngắn hiển thị trong ô bảng (algorithm output: 0→X, 1→LP, 2→PN...)
const DT_SYMBOL: Record<number, string> = {
  0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P', 10: 'X/2', 11: 'LL', 12: 'LN', 13: 'H', 14: 'B',
};

type StepStatus = Record<string, boolean>;
interface StepPage { data: unknown[]; page: number; limit: number; total: number; totalPages: number; }
type StepData = Record<number, StepPage>;
type StepCache = Record<number, Record<string, StepPage>>;

export default function AutoAlloc() {
  const { activeMonthId, activeMonthLabel } = useApp();
  const getStepFromHash = () => {
    const parts = window.location.hash.slice(1).split('/');
    const n = parseInt(parts[1] ?? '', 10);
    return n >= 1 && n <= 6 ? n : 1;
  };
  const [activeStep, setActiveStepState] = useState(getStepFromHash);
  const setActiveStep = (n: number) => {
    window.location.hash = `auto-alloc/${n}`;
    setActiveStepState(n);
  };
  useEffect(() => {
    const onPop = () => setActiveStepState(getStepFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const [status, setStatus] = useState<StepStatus>({});
  const [locked, setLocked] = useState(false);
  const [locking, setLocking] = useState(false);
  const [stepData, setStepData] = useState<StepData>({});
  const [stepCache, setStepCache] = useState<StepCache>({});
  const [pageNum, setPageNum] = useState<Record<number, number>>({});
  const [running, setRunning] = useState<number | 'all' | null>(null);
  const [clearing, setClearing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, number>>({}); // size riêng cho từng bước
  const [showCa, setShowCa] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const vsMapKey = `validateStatusMap_${activeMonthId}`;
  const [validateStatusMap, setValidateStatusMap] = useState<Record<number, { loading: boolean; result: ValidateResult | null }>>(() => {
    try { return JSON.parse(sessionStorage.getItem(vsMapKey) ?? '{}'); } catch { return {}; }
  });
  useEffect(() => {
    // loading=true là trạng thái tạm, không lưu
    const toSave: typeof validateStatusMap = {};
    for (const [k, v] of Object.entries(validateStatusMap)) {
      if (!v.loading) toSave[Number(k)] = v;
    }
    sessionStorage.setItem(vsMapKey, JSON.stringify(toSave));
  }, [validateStatusMap]); // eslint-disable-line react-hooks/exhaustive-deps
  const validate2Status = validateStatusMap[activeStep] ?? { loading: false, result: null };
  const setValidate2Status = (s: { loading: boolean; result: ValidateResult | null }) =>
    setValidateStatusMap(prev => ({ ...prev, [activeStep]: s }));
  const [step1Filter, setStep1Filter] = useState<'pn_before_15' | 'pn_mismatch' | null>(null);
  const validateRef = useRef<{ run: () => void }>(null);
  const [recheckKey, setRecheckKey] = useState(0);

  const [completionInfo, setCompletionInfo] = useState<{
    stepNum: number | 'all'; stepLabel: string; stepIcon: string; elapsedSec: number;
    onConfirm: () => void;
  } | null>(null);

  const refreshStatus = useCallback(async () => {
    const r = await fetch(`/api/distribution/status?month=${activeMonthId}`);
    if (r.ok) setStatus(await r.json());
  }, [activeMonthId]);

  const refreshLocked = useCallback(async () => {
    const r = await fetch('/api/months');
    if (r.ok) {
      const months: { id: string; locked: boolean }[] = await r.json();
      const m = months.find(x => x.id === activeMonthId);
      setLocked(Boolean(m?.locked));
    }
  }, [activeMonthId]);

  const toggleLock = useCallback(async () => {
    if (!activeMonthId) return;
    setLocking(true);
    try {
      const r = await fetch(`/api/months/${activeMonthId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: !locked }),
      });
      if (r.ok) {
        const data = await r.json();
        setLocked(data.locked);
      }
    } finally { setLocking(false); }
  }, [activeMonthId, locked]);

  useEffect(() => {
    refreshStatus();
    refreshLocked();
    setStepData({}); setStepCache({}); setPageNum({}); setValidateStatusMap({}); sessionStorage.removeItem(vsMapKey);
    setTimeout(() => loadStepData(activeStep, 1, undefined, true), 0);
  }, [activeMonthId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setValidateOpen(false);
    setStep1Filter(null);
  }, [activeStep, activeMonthId]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = useCallback(async () => {
    if (!confirm('Xóa toàn bộ dữ liệu phân bổ của tháng này? Không thể khôi phục!')) return;
    setClearing(true);
    try {
      await fetch('/api/distribution/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      setStepData({}); setStepCache({}); setPageNum({}); setValidateStatusMap({}); sessionStorage.removeItem(vsMapKey);
      await refreshStatus();
    } finally { setClearing(false); }
  }, [activeMonthId, refreshStatus]);

  const loadStepData = useCallback(async (displayStep: number, page = 1, size?: number, force = false) => {
    const limit = size ?? pageSizes[displayStep] ?? 100;
    const cacheKey = `${page}_${limit}`;
    if (!force && stepCache[displayStep]?.[cacheKey]) {
      setStepData(prev => ({ ...prev, [displayStep]: stepCache[displayStep][cacheKey] }));
      setPageNum(prev => ({ ...prev, [displayStep]: page }));
      return;
    }
    const step = STEPS.find(s => s.num === displayStep);
    if (!step) return;
    // Bước 2 chưa chạy phân bổ → dùng dữ liệu gốc từ step/1 (employees)
    // force=true sau khi chạy xong → luôn dùng step.apiNum (step/2)
    const apiNum = (displayStep === 2 && !status['step2Done'] && !force) ? 1 : step.apiNum;
    const r = await fetch(`/api/distribution/step/${apiNum}?month=${activeMonthId}&page=${page}&limit=${limit}`);
    if (r.ok) {
      const json: StepPage = await r.json();
      setStepCache(prev => ({ ...prev, [displayStep]: { ...(prev[displayStep] ?? {}), [cacheKey]: json } }));
      setStepData(prev => ({ ...prev, [displayStep]: json }));
      setPageNum(prev => ({ ...prev, [displayStep]: page }));
    }
  }, [activeMonthId, stepCache, pageSizes, status]);

  const handleStepClick = useCallback(async (num: number) => {
    setActiveStep(num);
    if (!stepCache[num]?.[pageNum[num] ?? 1]) await loadStepData(num, pageNum[num] ?? 1);
    else setStepData(prev => ({ ...prev, [num]: stepCache[num][pageNum[num] ?? 1] }));
  }, [loadStepData, stepCache, pageNum]);

  const runStep = useCallback(async (displayStep: number) => {
    const step = STEPS.find(s => s.num === displayStep);
    if (!step || step.viewOnly) return;
    const { apiNum } = step;
    if (apiNum === 1) {
      await fetch(`/api/distribution/step/${apiNum}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      setValidateOpen(false);
      setValidate2Status({ loading: false, result: null });
      await refreshStatus();
      setStepCache(prev => { const n = { ...prev }; delete n[1]; return n; });
      setStepData(prev => { const n = { ...prev }; delete n[1]; return n; });
      await loadStepData(1, 1, undefined, true);
      return;
    }
    setRunning(displayStep);
    setValidateOpen(false);
    setValidate2Status({ loading: false, result: null });
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    try {
      await fetch(`/api/distribution/step/${apiNum}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      const elapsedSec = Math.round((Date.now() - t0) / 1000);
      clearInterval(timer); setRunning(null); setElapsed(0);
      await fetch('/api/distribution/invalidate-after', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId, afterDisplayStep: displayStep }) });
      const laterSteps = STEPS.filter(s => s.num > displayStep).map(s => s.num);
      setStepCache(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); return n; });
      setStepData(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); return n; });
      setCompletionInfo({
        stepNum: displayStep, stepLabel: step.label, stepIcon: step.icon, elapsedSec,
        onConfirm: async () => {
          setCompletionInfo(null);
          await refreshStatus();
          await loadStepData(displayStep, 1, undefined, true);
          // Nếu bước này tự động đánh dấu xong bước 6 (bước 5), load sẵn dữ liệu bước 6
          if (displayStep === 5) {
            await loadStepData(6, 1, undefined, true);
          }
        },
      });
    } catch (e) { clearInterval(timer); setRunning(null); setElapsed(0); throw e; }
  }, [activeMonthId, refreshStatus, loadStepData]);

  const runAll = useCallback(async () => {
    setRunning('all');
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    try {
      await fetch('/api/distribution/run-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      const elapsedSec = Math.round((Date.now() - t0) / 1000);
      clearInterval(timer); setRunning(null); setElapsed(0);
      setCompletionInfo({
        stepNum: 'all', stepLabel: 'Toàn bộ quy trình', stepIcon: '🏆', elapsedSec,
        onConfirm: async () => {
          setCompletionInfo(null);
          setStepData({}); setStepCache({}); setPageNum({}); setValidateStatusMap({}); sessionStorage.removeItem(vsMapKey);
          await refreshStatus();
          await loadStepData(activeStep, 1);
        },
      });
    } catch (e) { clearInterval(timer); setRunning(null); setElapsed(0); throw e; }
  }, [activeMonthId, refreshStatus, loadStepData, activeStep]);

  const [algoRunning, setAlgoRunning] = useState<boolean>(false);

  const runStep2WithAlgo = useCallback(async () => {
    setAlgoRunning(true);
    setValidateOpen(false);
    setValidate2Status({ loading: false, result: null });
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    try {
      await fetch('/api/distribution/step/2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      const elapsedSec = Math.round((Date.now() - t0) / 1000);
      clearInterval(timer); setAlgoRunning(false); setElapsed(0);
      await fetch('/api/distribution/invalidate-after', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId, afterDisplayStep: 2 }) });
      const laterSteps = STEPS.filter(s => s.num > 2 && !s.viewOnly).map(s => s.num);
      setStepCache(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); delete n[2]; return n; });
      setStepData(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); delete n[2]; return n; });
      setCompletionInfo({
        stepNum: 2, stepLabel: 'Phân bổ ngày công', stepIcon: '📊', elapsedSec,
        onConfirm: async () => {
          setCompletionInfo(null);
          await refreshStatus();
          await loadStepData(2, 1, undefined, true);
        },
      });
    } catch (e) { clearInterval(timer); setAlgoRunning(false); setElapsed(0); throw e; }
  }, [activeMonthId, refreshStatus, loadStepData]);
  const isRunning = running !== null || algoRunning;
  const curStep = STEPS.find(s => s.num === activeStep);

  return (
    <div className={styles.page}>
      <div className={styles.stepper}>
        {STEPS.map(step => {
          const done = Boolean(status[step.key]);
          const active = activeStep === step.num;
          const busy = running === step.num;
          return (
            <button key={step.num}
              className={`${styles.stepBtn} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}
              onClick={() => handleStepClick(step.num)} id={`step-btn-${step.num}`}
            >
              <div className={styles.stepCircle}>
                {done ? <IconCheck /> : busy ? <span className={styles.spinnerSm} /> : step.num}
              </div>
              <span className={styles.stepLabel}>{step.icon} {step.label}</span>
              {step.editable && <span className={styles.editTag}>Manual</span>}
            </button>
          );
        })}
        <div className={styles.stepperSpacer} />
        <div className={styles.stepperRunWrap}>
          {!curStep?.viewOnly && (
            <button
              className={`${styles.btnRunStep} ${(running === activeStep || algoRunning) ? styles.btnRunning : ''}`}
              onClick={() => activeStep === 2 ? runStep2WithAlgo() : runStep(activeStep)}
              disabled={isRunning || locked || (activeStep > 1 && !status[STEPS.find(s => s.num === activeStep - 1)?.key ?? ''])}
              id={`btn-run-step-${activeStep}`}
            >
              {(running === activeStep || (activeStep === 2 && algoRunning))
                ? <><span className={styles.spinnerSm} /> {elapsed}s</>
                : curStep?.apiNum === 1 ? <><IconCheck /> Xác nhận</>
                  : <><IconPlay /> {'Chạy bước'} {activeStep}</>}
            </button>
          )}
          <div className={styles.dividerV} />
          {!locked && (
            <button
              className={styles.btnClear}
              onClick={toggleLock}
              disabled={isRunning || locking}
              id="btn-finish-month"
              style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#86efac' }}
            >
              {locking ? '⏳...' : '🔒 Khóa'}
            </button>
          )}
          {locked && (
            <button
              className={styles.btnClear}
              onClick={toggleLock}
              disabled={locking}
              id="btn-unlock-month"
              style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fca5a5' }}
            >
              {locking ? '⏳...' : '🔓 Mở khóa'}
            </button>
          )}
          <div className={styles.dividerV} />
          <button className={styles.btnClear} onClick={clearAll} disabled={isRunning || clearing || locked} id="btn-clear-all">
            {clearing ? <><span className={styles.spinnerSm} /> Đang xóa...</> : <>🗑️ Xóa dữ liệu</>}
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>{curStep?.icon} Bước {activeStep}: {curStep?.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            {[2, 3, 4, 5].includes(activeStep) && curStep && status[curStep.key] && (() => {
              const { loading, result } = validate2Status;
              const doRun = () => { setRecheckKey(k => k + 1); setValidateOpen(true); validateRef.current?.run(); };
              if (loading) return <button className={styles.btnExport} disabled style={{ minWidth: 130, justifyContent: 'center' }}>⏳ Đang kiểm tra...</button>;
              if (result) return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button className={styles.btnExport} onClick={() => setValidateOpen(v => !v)}
                    style={{ minWidth: 130, justifyContent: 'center', background: result.overallStatus === 'ok' ? '#f0fdf4' : '#fef2f2', color: result.overallStatus === 'ok' ? '#15803d' : '#b91c1c', borderColor: result.overallStatus === 'ok' ? '#86efac' : '#fca5a5' }}>
                    {validateOpen ? '▴ ' : '▾ '}{result.overallStatus === 'ok' ? '✅ Đạt' : `❌ Xem vi phạm`}
                  </button>
                  <button className={styles.btnExport} title="Kiểm tra lại" onClick={doRun}
                    style={{ minWidth: 32, padding: '0 8px', justifyContent: 'center', color: '#64748b' }}>🔄 Kiểm tra lại</button>
                </div>
              );
              return <button className={styles.btnExport} style={{ minWidth: 130, justifyContent: 'center' }} onClick={doRun}>🔍 Kiểm tra</button>;
            })()}
            {activeStep === 1 && (
              <>
                {/* . ntnhan 
                <button className={styles.btnExport} onClick={() => setStep1Filter(v => v === 'pn_before_15' ? null : 'pn_before_15')}
                  style={{ minWidth: 130, justifyContent: 'center', background: step1Filter === 'pn_before_15' ? '#f5f3ff' : undefined, color: step1Filter === 'pn_before_15' ? '#6d28d9' : undefined, borderColor: step1Filter === 'pn_before_15' ? '#a78bfa' : undefined }}>
                  {step1Filter === 'pn_before_15' ? '✕ ' : ''}PN trước ngày 15
                </button>
                <button className={styles.btnExport} onClick={() => setStep1Filter(v => v === 'pn_mismatch' ? null : 'pn_mismatch')}
                  style={{ minWidth: 140, justifyContent: 'center', background: step1Filter === 'pn_mismatch' ? '#f5f3ff' : undefined, color: step1Filter === 'pn_mismatch' ? '#6d28d9' : undefined, borderColor: step1Filter === 'pn_mismatch' ? '#a78bfa' : undefined }}>
                  {step1Filter === 'pn_mismatch' ? '✕ ' : ''}PN khác SL ngày cột
                </button>
.              */}
              </>
            )}
            {(activeStep === 1 || (curStep && status[curStep.key])) && (
              <a href={activeMonthId ? `/api/distribution/export?month=${activeMonthId}&step=${activeStep}` : '#'} className={styles.btnExport} download id={`btn-export-step-${activeStep}`} style={{ minWidth: 110, justifyContent: 'center' }}>
                <IconDl /> Tải Excel
              </a>
            )}
            {activeStep === 5 && curStep && status[curStep.key] && (
              <>
                <button onClick={() => setShowCa(v => !v)} className={styles.btnExport} style={{ minWidth: 110, justifyContent: 'center', background: showCa ? '#1d4ed8' : '#eff6ff', color: showCa ? '#fff' : '#1d4ed8', borderColor: '#93c5fd' }}>
                  {showCa ? 'Ẩn Ca' : 'Hiện Ca'}
                </button>
                <a href={activeMonthId ? `/api/distribution/export?month=${activeMonthId}&step=5&withShift=1` : '#'} className={styles.btnExport} download id="btn-export-step-5-ca" style={{ minWidth: 110, justifyContent: 'center' }}>
                  <IconDl /> Tải Excel có Ca
                </a>
              </>
            )}
          </div>
          {stepData[activeStep] && (
            <Pagination
              page={stepData[activeStep].page}
              totalPages={stepData[activeStep].totalPages}
              total={stepData[activeStep].total}
              limit={stepData[activeStep].limit}
              pageSize={pageSizes[activeStep] ?? 100}
              onPage={(p) => loadStepData(activeStep, p)}
              onSizeChange={(sz) => {
                setPageSizes(prev => ({ ...prev, [activeStep]: sz }));
                setStepCache(prev => { const n = { ...prev }; delete n[activeStep]; return n; });
                setStepData(prev => { const n = { ...prev }; delete n[activeStep]; return n; });
                loadStepData(activeStep, 1, sz);
              }}
            />
          )}
        </div>
        <div className={styles.panelBody}>
          <StepView step={activeStep} data={stepData[activeStep]?.data}
            onLoad={() => loadStepData(activeStep, 1)}
            onRefresh={() => {
              setStepCache(prev => { const n = { ...prev }; delete n[activeStep]; return n; });
              loadStepData(activeStep, pageNum[activeStep] ?? 1, undefined, true);

            }}
            done={Boolean(curStep && status[curStep.key])}
            monthId={activeMonthId}
            monthLabel={activeMonthLabel}
            showCa={showCa}
            locked={locked}
            validateOpen={validateOpen}
            onValidateOpen={() => setValidateOpen(true)}
            onValidateStatusChange={setValidate2Status}
            validateRef={validateRef}
            step1Filter={step1Filter}
            validateResult={validate2Status.result}
            recheckKey={recheckKey}
          />
        </div>
      </div>

      {completionInfo && (
        <CompletionModal
          stepNum={completionInfo.stepNum}
          stepLabel={completionInfo.stepLabel}
          stepIcon={completionInfo.stepIcon}
          elapsedSec={completionInfo.elapsedSec}
          onConfirm={completionInfo.onConfirm}
        />
      )}
    </div>
  );
}

/* === Completion Modal === */
function CompletionModal({ stepNum, stepLabel, stepIcon, elapsedSec, onConfirm }: {
  stepNum: number | 'all'; stepLabel: string; stepIcon: string; elapsedSec: number; onConfirm: () => void;
}) {
  const isAll = stepNum === 'all';
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalIcon}>
          <svg className={styles.modalIconSvg} viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
        <h2 className={styles.modalTitle}>{isAll ? 'Hoàn thành toàn bộ!' : 'Bước hoàn thành!'}</h2>
        <div style={{ marginBottom: 12 }}>
          <span className={styles.modalStep}>{stepIcon}&nbsp;{isAll ? 'Chạy Toàn Bộ' : `Bước ${stepNum}: ${stepLabel}`}</span>
        </div>
        <p className={styles.modalDesc}>{isAll ? 'Tất cả các bước đã được thực hiện thành công.' : 'Dữ liệu đã được phân bổ và sẵn sàng để xem.'}</p>
        <p className={styles.modalTime}>⏱ Thời gian thực thi: <strong>{elapsedSec}s</strong></p>
        <button className={styles.modalBtnOk} onClick={onConfirm} autoFocus id="btn-completion-ok">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
          OK
        </button>
      </div>
    </div>
  );
}

/* === Pagination === */
const PAGE_SIZES = [100, 500, 1000, 999999] as const;
const SIZE_LABELS: Record<number, string> = { 100: '100', 500: '500', 1000: '1000', 999999: 'Tất cả' };
function Pagination({ total, limit, pageSize, onPage, onSizeChange }: {
  page: number; totalPages: number; total: number; limit: number; pageSize: number;
  onPage: (p: number) => void; onSizeChange: (sz: number) => void;
}) {
  return (
    <span className={styles.pageInfo}>
      Tổng: <strong>{total}</strong> NV
      <select value={pageSize} onChange={e => { onSizeChange(Number(e.target.value)); onPage(1); }}
        style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, color: 'var(--gray-600)', background: '#fff', cursor: 'pointer' }}>
        {PAGE_SIZES.map(s => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
      </select>
    </span>
  );
}

/* ── color maps ── */
const SYM_BG: Record<string, string> = { '': '#fff', 'X': '#f0fdf4', 'L': '#f1f5f9', 'LP': '#f1f5f9', 'PN': '#f5f3ff', 'Ô': '#fef2f2', 'TS': '#fdf2f8', 'DS': '#f0fdfa', 'O': '#fff7ed', 'NL': '#eff6ff', 'OF': '#f8fafc', 'P': '#ecfeff' };
const SYM_CLR: Record<string, string> = { '': '#d1d5db', 'X': '#15803d', 'L': '#475569', 'LP': '#475569', 'PN': '#6d28d9', 'Ô': '#b91c1c', 'TS': '#be185d', 'DS': '#0f766e', 'O': '#c2410c', 'NL': '#1d4ed8', 'OF': '#4b5563', 'P': '#0e7490' };
const DT_TEXT: Record<number, string> = { 0: '#15803d', 1: '#475569', 2: '#6d28d9', 3: '#b91c1c', 4: '#be185d', 5: '#0f766e', 6: '#c2410c', 7: '#1d4ed8', 8: '#4b5563', 9: '#0e7490', 10: '#065f46', 11: '#92400e', 12: '#78350f', 13: '#1e40af', 14: '#374151' };
const DT_CELL_BG: Record<number, string> = { 0: '#f0fdf4', 1: '#f1f5f9', 2: '#f5f3ff', 3: '#fef2f2', 4: '#fdf2f8', 5: '#f0fdfa', 6: '#fff7ed', 7: '#eff6ff', 8: '#f8fafc', 9: '#ecfeff', 10: '#d1fae5', 11: '#fef3c7', 12: '#fef9c3', 13: '#dbeafe', 14: '#f3f4f6' };
const SYM_TO_DT: Record<string, number> = { X: 0, L: 1, LP: 1, PN: 2, Ô: 3, TS: 4, DS: 5, O: 6, NL: 7, OF: 8, P: 9, 'X/2': 10, LL: 11, LN: 12, H: 13, B: 14 };

/* === ImportGrid (Step 1) === */
function ImportGrid({ rows, monthLabel, monthId, filterCodes, step1Filter, onSaved, locked }: { rows: Record<string, unknown>[]; monthLabel: string; monthId: string; filterCodes?: Set<string> | null; step1Filter?: 'pn_before_15' | 'pn_mismatch' | null; onSaved?: () => void; locked?: boolean; }) {
  const [mm_, yyyy_] = monthLabel.split('/');
  const daysInMonth = new Date(parseInt(yyyy_, 10), parseInt(mm_, 10), 0).getDate();
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const [fGroup, setFGroup] = useState('');
  const groupList = useMemo(() => { const gs = new Set<string>(); for (const r of rows as any[]) { if (r.specialGroup) gs.add(r.specialGroup); } return [...gs].sort((a, b) => a.localeCompare(b, 'vi')); }, [rows]);
  const [fWorkdays, setFWorkdays] = useState('');
  const [fOT, setFOT] = useState('');
  const [fLate, setFLate] = useState('');
  const [fPN, setFPN] = useState('');
  const [fSymCounts, setFSymCounts] = useState<Record<number, string>>({});
  const workdaysList = useMemo(() => [...new Set((rows as any[]).map(r => String(r.workdays ?? '')).filter(Boolean))].sort((a, b) => Number(a) - Number(b)), [rows]);
  const otList = useMemo(() => [...new Set((rows as any[]).map(r => { const v = Math.round(parseFloat(String(r.overtimeHours || '0').replace(',', '.'))); return v > 0 ? String(v) : ''; }).filter(Boolean))].sort((a, b) => Number(a) - Number(b)), [rows]);
  const lateList = useMemo(() => [...new Set((rows as any[]).map(r => { const v = Math.round(parseFloat(String(r.lateMinutes || '0').replace(',', '.'))); return v > 0 ? String(v) : ''; }).filter(Boolean))].sort((a, b) => Number(a) - Number(b)), [rows]);

  // Edit state
  const [edits, setEdits] = useState<Map<string, string>>(new Map()); // key: "code_day", value: symbol
  const [saving, setSaving] = useState(false);
  const [dragSrc, setDragSrc] = useState<{ code: string; day: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ code: string; day: number } | null>(null);
  const [picker, setPicker] = useState<{ code: string; day: number; currentDT: number; x: number; y: number } | null>(null);

  const getEffectiveSym = (code: string, day: number, origSym: string) => {
    const k = `${code}_${day}`;
    return edits.has(k) ? edits.get(k)! : origSym;
  };

  const handleCellRightClick = (code: string, day: number, sym: string, e: React.MouseEvent) => {
    if (locked) return;
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPicker({ code, day, currentDT: SYM_TO_DT[sym] ?? -1, x: rect.left, y: rect.bottom + 4 });
  };

  const handlePick = (dt: number) => {
    if (!picker) return;
    const newSym = DT_SYMBOL[dt] ?? '';
    const origRow = rows.find((r: any) => r.code === picker.code) as any;
    const origSym = origRow?.days?.find((d: any) => d.day === picker.day)?.symbol ?? '';
    const k = `${picker.code}_${picker.day}`;
    setEdits(prev => { const n = new Map(prev); newSym === origSym ? n.delete(k) : n.set(k, newSym); return n; });
    setPicker(null);
  };

  const handleDrop = (toCode: string, toDay: number) => {
    if (!dragSrc || dragSrc.code !== toCode || dragSrc.day === toDay) { setDragSrc(null); setDragOver(null); return; }
    const origFrom = (rows.find((r: any) => r.code === dragSrc.code) as any)?.days?.find((d: any) => d.day === dragSrc.day)?.symbol ?? '';
    const origTo = (rows.find((r: any) => r.code === toCode) as any)?.days?.find((d: any) => d.day === toDay)?.symbol ?? '';
    const fromSym = getEffectiveSym(dragSrc.code, dragSrc.day, origFrom);
    const toSym = getEffectiveSym(toCode, toDay, origTo);
    setEdits(prev => {
      const n = new Map(prev);
      const kFrom = `${dragSrc.code}_${dragSrc.day}`;
      const kTo = `${toCode}_${toDay}`;
      toSym === origFrom ? n.delete(kFrom) : n.set(kFrom, toSym);
      fromSym === origTo ? n.delete(kTo) : n.set(kTo, fromSym);
      return n;
    });
    setDragSrc(null); setDragOver(null);
  };

  const handleSave = async () => {
    if (edits.size === 0) return;
    setSaving(true);
    try {
      const changes = Array.from(edits.entries()).map(([k, symbol]) => {
        const idx = k.lastIndexOf('_');
        return { empCode: k.slice(0, idx), day: Number(k.slice(idx + 1)), symbol };
      });
      const r = await fetch('/api/distribution/edit-day-import', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId, changes }),
      });
      if (r.ok) { setEdits(new Map()); onSaved?.(); }
    } finally { setSaving(false); }
  };
  const baseFiltered = useGridFilter(rows, fCode, fName, fDept, fGroup);
  const filtered = useMemo(() => {
    let result = baseFiltered as any[];
    if (fWorkdays) result = result.filter(r => String(r.workdays ?? '') === fWorkdays);
    if (fOT) result = result.filter(r => String(Math.round(parseFloat(String(r.overtimeHours || '0').replace(',', '.')))) === fOT);
    if (fLate) result = result.filter(r => String(Math.round(parseFloat(String(r.lateMinutes || '0').replace(',', '.')))) === fLate);
    if (fPN) result = result.filter(r => String(r.phepNam ?? '') === fPN);
    for (const [dtStr, val] of Object.entries(fSymCounts)) {
      if (!val) continue;
      const dt = Number(dtStr);
      const sym = DT_SYMBOL[dt] ?? '';
      result = result.filter((r: any) => {
        const days: { day: number; symbol: string }[] = r.days ?? [];
        return String(days.filter(d => getEffectiveSym(r.code, d.day, d.symbol ?? '') === sym).length) === val;
      });
    }
    if (!step1Filter) return result;
    return result.filter(r => {
      const days: { day: number; symbol: string }[] = r.days ?? [];
      const pnDays = days.filter(d => d.symbol === 'PN').map(d => d.day);
      if (step1Filter === 'pn_before_15') return pnDays.some(d => d < 15);
      if (step1Filter === 'pn_mismatch') { const pnCount = pnDays.length; const colPN = Number(r.phepNam) || 0; return pnCount !== colPN; }
      return true;
    });
  }, [baseFiltered, fWorkdays, fOT, fLate, fPN, fSymCounts, step1Filter]);
  const [leaveTypes, setLeaveTypes] = useState<{ code: string; name: string; dayType: number }[]>([]);
  useEffect(() => {
    fetch(`/api/leave-types?month=${monthId}`).then(r => r.json()).then((data: { code: string; name: string; dayType: number }[]) => {
      setLeaveTypes(Array.isArray(data) ? data : []);
    }).catch(() => { });
  }, [monthId]);
  const [sort, onSort] = useSort();
  const sortedRows = useSortRows(filtered, sort);

  // Dynamic columns from legend (used day types) — compute from current page
  const usedSymbols = useMemo(() => {
    const src = rows as any[];
    const dtSet = new Set<number>();
    for (const r of src) {
      for (const d of (r.days ?? []) as { day: number; symbol: string }[]) {
        const dt = SYM_TO_DT[d.symbol ?? ''] ?? -1;
        if (dt >= 0) dtSet.add(dt);
      }
    }
    const seen = new Set<number>();
    const result: { dt: number; sym: string; name: string }[] = [];
    for (const lt of (Array.isArray(leaveTypes) ? leaveTypes : [])) {
      const dt = lt.dayType >= 0 ? lt.dayType : (SYM_TO_DT[lt.code] ?? -1);
      if (dt < 0 || !dtSet.has(dt) || seen.has(dt)) continue;
      seen.add(dt);
      result.push({ dt, sym: DT_SYMBOL[dt] ?? lt.code, name: lt.name });
    }
    return result;
  }, [rows, leaveTypes]);

  const symCountsList = useMemo(() => {
    const src = rows as any[];
    const result: Record<number, string[]> = {};
    for (const { dt } of usedSymbols) {
      const counts = new Set<string>();
      for (const r of src) {
        const days: { day: number; symbol: string }[] = r.days ?? [];
        const cnt = days.filter(d => getEffectiveSym(r.code, d.day, d.symbol ?? '') === (DT_SYMBOL[dt] ?? '')).length;
        if (cnt > 0) counts.add(String(cnt));
      }
      result[dt] = [...counts].sort((a, b) => Number(a) - Number(b));
    }
    return result;
  }, [rows, usedSymbols]);

  const countBySym = (r: any, sym: string) => {
    const days: { day: number; symbol: string }[] = r.days ?? [];
    return days.filter(d => getEffectiveSym(r.code, d.day, d.symbol ?? '') === sym).length;
  };

  return (
    <div className={styles.tableOuter}>
      {step1Filter && (
        <div style={{ padding: '4px 12px', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', fontSize: 12, color: '#6d28d9' }}>
          🔍 Đang lọc: <strong>{step1Filter === 'pn_before_15' ? 'PN trước ngày 15' : 'PN khác SL ngày cột'}</strong> — {filtered.length} dòng
        </div>
      )}
      <ScrollTable className={styles.tableWrap}>
        <table className={styles.gridTable} style={{ fontSize: '0.72rem' }}>
          <thead>
            <tr>
              <th className={styles.sc0} style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <SortTh label="MÃ NV" sortKey="code" sort={sort} onSort={onSort} className={styles.sc1} style={{ minWidth: 120, maxWidth: 120, overflow: 'hidden' }} />
              <SortTh label="TÊN NHÂN VIÊN" sortKey="name" sort={sort} onSort={onSort} className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }} />
              <SortTh label="PHÒNG BAN" sortKey="deptName" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 50 }} />
              <SortTh label="NHÓM ĐẶC THÙ" sortKey="specialGroup" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 70, color: '#0369a1' }} />
              <SortTh label="NC ĐV" sortKey="workdays" sort={sort} onSort={onSort} style={{ minWidth: 32, color: '#15803d' }} />
              {Array.from({ length: daysInMonth }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              {usedSymbols.map(({ dt, sym }) => (
                <th key={dt} style={{ minWidth: 28, color: DT_TEXT[dt] ?? '#64748b', fontWeight: 700, fontSize: '0.68rem' }}>{sym}</th>
              ))}
              <th style={{ minWidth: 44, color: '#1d4ed8' }}>TĂNG CA (H)</th>
              <th style={{ minWidth: 50, color: '#c2410c' }}>GIỜ TRỄ (P)</th>
            </tr>
             <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraMiddle={0} extraAfter={0} daysCols={daysInMonth} fGroup={fGroup} setFGroup={setFGroup} groupList={groupList} codeThStyle={{ maxWidth: 120, width: 120 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel}
              middleChildren={<th><select className={s.statusFilterSelect} value={fWorkdays} onChange={e => setFWorkdays(e.target.value)}><option value="">Tất cả</option>{workdaysList.map(v => <option key={v} value={v}>{v}</option>)}</select></th>}>
              {usedSymbols.map(({ dt, sym }) => (
                <th key={dt}><select className={s.statusFilterSelect} value={fSymCounts[dt] ?? ''} onChange={e => setFSymCounts(p => ({ ...p, [dt]: e.target.value }))} style={{ fontSize: 10, padding: '1px 3px', minWidth: 32 }}><option value="">—</option>{(symCountsList[dt] ?? []).map(v => <option key={v} value={v}>{v}</option>)}</select></th>
              ))}
              <th><select className={s.statusFilterSelect} value={fOT} onChange={e => setFOT(e.target.value)}><option value="">Tất cả</option>{otList.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
              <th><select className={s.statusFilterSelect} value={fLate} onChange={e => setFLate(e.target.value)}><option value="">Tất cả</option>{lateList.map(v => <option key={v} value={v}>{v}</option>)}</select></th>
            </InlineFilterRow>
          </thead>
          <tbody>
            {sortedRows.map((r: any, ri: number) => {
              const days: { day: number; symbol: string }[] = r.days ?? [];
              return (
                <tr key={r.code}>
                  <td className={styles.sc0} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                  <td className={`${styles.mono} ${styles.sc1}`} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                  <td className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td style={{ textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                  <td style={{ textAlign: 'left', fontSize: '0.65rem', color: '#0369a1', whiteSpace: 'nowrap' }}>{r.specialGroup || '—'}</td>
                  <td className={styles.statCell} style={{ color: '#15803d' }}><strong>{r.workdays || '—'}</strong></td>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = days.find((x: any) => x.day === i + 1);
                    const origSym = d?.symbol ?? '';
                    const sym = getEffectiveSym(r.code, i + 1, origSym);
                    const isChanged = edits.has(`${r.code}_${i + 1}`);
                    const isOver = dragOver?.code === r.code && dragOver?.day === i + 1;
                    const dt = SYM_TO_DT[sym] ?? -1;
                    const bg = dt >= 0 ? (DT_CELL_BG[dt] ?? SYM_BG[sym] ?? '#fff') : (SYM_BG[sym] ?? '#fff');
                    const clr = dt >= 0 ? (DT_TEXT[dt] ?? SYM_CLR[sym] ?? '#9ca3af') : (SYM_CLR[sym] ?? '#9ca3af');
                    return (
                      <td key={i}
                        className={`${styles.editableCell} ${isChanged ? styles.editableCellChanged : ''} ${isOver ? styles.editableCellDragOver : ''}`}
                        style={{
                          background: bg, color: clr,
                          fontWeight: (!sym || sym === 'X') ? 700 : 600,
                          textAlign: 'center', padding: '4px 2px', minWidth: 26,
                          borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                          opacity: dragSrc?.code === r.code && dragSrc?.day === i + 1 ? 0.4 : 1,
                          cursor: locked ? 'default' : 'grab',
                        }}
                        onContextMenu={e => handleCellRightClick(r.code, i + 1, sym, e)}
                        draggable={!locked}
                        onDragStart={() => { if (!locked) setDragSrc({ code: r.code, day: i + 1 }); }}
                        onDragOver={e => { e.preventDefault(); setDragOver({ code: r.code, day: i + 1 }); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDrop(r.code, i + 1)}
                        onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                      >
                        {sym || <span style={{ color: '#d1d5db', fontWeight: 300 }}>·</span>}
                      </td>
                    );
                  })}
                  {usedSymbols.map(({ dt, sym }) => (
                    <td key={dt} className={styles.statCell} style={{ color: DT_TEXT[dt] ?? '#64748b', background: DT_CELL_BG[dt] ?? 'transparent', textAlign: 'center', fontWeight: 700, fontSize: '0.68rem' }}>
                      {countBySym(r, sym)}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>{Number(String(r.overtimeHours).replace(',', '.')) > 0 ? <span className={styles.otTag}>{Math.round(parseFloat(String(r.overtimeHours).replace(',', '.')))}</span> : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{Number(String(r.lateMinutes).replace(',', '.')) > 0 ? <span className={styles.lateTag}>{Math.round(parseFloat(String(r.lateMinutes).replace(',', '.')))}</span> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollTable>
      <div className={styles.legend}>
        {(() => {
          const usedDTs = new Set<number>();
          for (const r of rows as any[]) {
            for (const d of (r.days ?? []) as { day: number; symbol: string }[]) {
              const dt = SYM_TO_DT[d.symbol ?? ''] ?? -1;
              if (dt >= 0) usedDTs.add(dt);
            }
          }
          const seenDT = new Set<number>();
          return (Array.isArray(leaveTypes) ? leaveTypes : []).map(lt => {
            const dt = lt.dayType >= 0 ? lt.dayType : (SYM_TO_DT[lt.code] ?? -1);
            if (dt < 0 || !usedDTs.has(dt) || seenDT.has(dt)) return null;
            seenDT.add(dt);
            const sym = DT_SYMBOL[dt] ?? lt.code;
            return (
              <span key={lt.code} className={styles.legendItem}>
                <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: DT_CELL_BG[dt], color: DT_TEXT[dt], fontWeight: 700, fontSize: '0.72rem', marginRight: 3, border: `1px solid ${DT_TEXT[dt]}30` }}>{sym}</span>
                {lt.name}
              </span>
            );
          });
        })()}
      </div>
      {picker && (
        <DayTypePicker currentDT={picker.currentDT} x={picker.x} y={picker.y} onPick={handlePick} onClose={() => setPicker(null)} leaveTypes={leaveTypes} />
      )}
      {edits.size > 0 && (
        <div className={styles.editBar}>
          <span className={styles.editBarInfo}>✏️ <span className={styles.editBarCount}>{edits.size}</span> thay đổi</span>
          <button className={`${styles.editBarBtn} ${styles.editBarBtnUndo}`} onClick={() => setEdits(new Map())} disabled={locked} type="button">↩ Hoàn tác</button>
          <button className={`${styles.editBarBtn} ${styles.editBarBtnSave}`} onClick={handleSave} disabled={saving || locked} type="button">{saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}</button>
        </div>
      )}
    </div>
  );
}

/* === DayTypePicker (dropdown chọn loại ngày) === */

function DayTypePicker({ currentDT, x, y, onPick, onClose, leaveTypes }: {
  currentDT: number; x: number; y: number;
  onPick: (dt: number) => void; onClose: () => void;
  leaveTypes: { code: string; name: string; dayType: number }[];
}) {
  const left = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : x);
  const top = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 160 : y);
  return (
    <>
      <div className={styles.dayPickerOverlay} onClick={onClose} />
      <div className={styles.dayPicker} style={{ left, top }}>
        {(Array.isArray(leaveTypes) ? leaveTypes : []).map(lt => {
          const dt = lt.dayType >= 0 ? lt.dayType : (SYM_TO_DT[lt.code] ?? -1);
          if (dt < 0) return null;
          const sym = DT_SYMBOL[dt] ?? lt.code;
          const isActive = dt === currentDT;
          return (
            <button key={lt.code}
              className={`${styles.dayPickerBtn} ${isActive ? styles.dayPickerBtnActive : ''}`}
              style={{ color: DT_TEXT[dt] ?? '#374151', background: DT_CELL_BG[dt] ?? '#f9fafb' }}
              onClick={() => onPick(dt)}
              type="button"
            >
              <span>{sym}</span>
              <span className={styles.dayPickerLabel}>{lt.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* === DayTypeGrid (Step 2) – Editable === */
type EditKey = `${string}_${number}`; // "empCode_day"
const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function DayTypeGrid({ rows, monthId, monthLabel, onSaved, locked, filterCodes, filterMode }: {
  rows: Record<string, unknown>[];
  monthId: string;
  monthLabel: string;
  onSaved?: () => void;
  locked?: boolean;
  filterCodes?: Set<string> | null;
  filterMode?: FilterMode | null;
}) {
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const [edits, setEdits] = useState<Map<EditKey, number>>(new Map());
  const [saving, setSaving] = useState(false);
  const [dragSrc, setDragSrc] = useState<{ code: string; day: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ code: string; day: number } | null>(null);
  const [picker, setPicker] = useState<{ code: string; day: number; currentDT: number; x: number; y: number } | null>(null);

  const [leaveTypes, setLeaveTypes] = useState<{ code: string; name: string; dayType: number }[]>([]);
  useEffect(() => {
    fetch(`/api/leave-types?month=${monthId}`).then(r => r.json()).then((data: { code: string; name: string; dayType: number }[]) => {
      setLeaveTypes(Array.isArray(data) ? data : []);
    }).catch(() => { });
  }, [monthId]);

  const [mm_, yyyy_] = monthLabel.split('/');
  const daysInMonth = new Date(parseInt(yyyy_, 10), parseInt(mm_, 10), 0).getDate();
  const deptList = useDeptList(rows);
  const [sort, onSort] = useSort();
  const [fWorkdays, setFWorkdays] = useState('');
  const [fPN, setFPN] = useState('');
  const [fNghiTruoc, setFNghiTruoc] = useState('');
  const [fNghiCuoi, setFNghiCuoi] = useState('');
  const workdaysList = useStatList(rows, 'workdays');
  const pnList = useStatList(rows, 'phepNam');
  const nghiTruocList = useMemo(() => {
    const vals = [...new Set((rows as any[]).map(r => fmtDate(r.ngayNghiCuoiThangTruoc)))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
    if ((rows as any[]).some(r => !fmtDate(r.ngayNghiCuoiThangTruoc))) vals.unshift('(Trống)');
    return vals;
  }, [rows]);
  const nghiCuoiList = useMemo(() => {
    const [mm, yyyy] = monthLabel.split('/');
    return [...new Set((rows as any[]).map(r => { const days: { day: number; dayType: number }[] = r.days ?? []; const d = Array.from({ length: daysInMonth }, (_, i) => i + 1).reverse().find(i => { const dt = Number((days.find(x => x.day === i) as any)?.dayType ?? -1); return dt >= 0 && dt !== 0; }); return d ? `${String(d).padStart(2, '0')}/${mm}/${yyyy}` : ''; }).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rows, monthLabel]);
  const countX = (r: any) => { const days: { day: number; dayType: number }[] = r.days ?? []; return Array.from({ length: daysInMonth }, (_, i) => Number(days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 0).length; };
  const countLP = (r: any) => { const days: { day: number; dayType: number }[] = r.days ?? []; return Array.from({ length: daysInMonth }, (_, i) => Number(days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 1).length; };
  const countPnDay = (r: any) => { const days: { day: number; dayType: number }[] = r.days ?? []; return Array.from({ length: daysInMonth }, (_, i) => Number(days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 2).length; };
  const enrichedRows = useMemo(() => {
    const [mm, yyyy] = monthLabel.split('/');
    return (rows as any[]).map(r => { const days: { day: number; dayType: number }[] = r.days ?? []; const d = Array.from({ length: daysInMonth }, (_, i) => i + 1).reverse().find(i => { const dt = Number((days.find(x => x.day === i) as any)?.dayType ?? -1); return dt >= 0 && dt !== 0; }); return { ...r, _nghiCuoi: d ? `${String(d).padStart(2, '0')}/${mm}/${yyyy}` : '', _xCnt: countX(r), _lpCnt: countLP(r), _pnDayCnt: countPnDay(r) }; });
  }, [rows, monthLabel]);
  const baseFiltered = useGridFilter(enrichedRows, fCode, fName, fDept);
  const filtered = useMemo(() => {
    let r = filterCodes ? baseFiltered.filter((r: any) => filterCodes.has(r.code)) : baseFiltered;
    if (fNghiTruoc) {
      if (fNghiTruoc === '(Trống)') {
        r = r.filter((x: any) => !fmtDate(x.ngayNghiCuoiThangTruoc));
      } else {
        r = r.filter((x: any) => (fmtDate(x.ngayNghiCuoiThangTruoc) ?? '') === fNghiTruoc);
      }
    }
    if (fNghiCuoi) r = r.filter((x: any) => x._nghiCuoi === fNghiCuoi);
    if (fWorkdays) r = r.filter((x: any) => String(x.workdays ?? '') === fWorkdays);
    if (fPN) r = r.filter((x: any) => String(x.phepNam ?? '') === fPN);
    return r;
  }, [baseFiltered, filterCodes, fNghiTruoc, fNghiCuoi, fWorkdays, fPN]);
  const hasViolations = (filterCodes?.size ?? 0) > 0;

  const handleCellClick = (code: string, day: number, currentDT: number, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPicker({ code, day, currentDT, x: rect.left, y: rect.bottom + 4 });
  };

  const handleDrop = (toCode: string, toDay: number) => {
    if (!dragSrc || dragSrc.code !== toCode || dragSrc.day === toDay) { setDragSrc(null); setDragOver(null); return; }
    const fromDT = getEffectiveDT(dragSrc.code, dragSrc.day, (() => { const d = (rows.find((r: any) => r.code === dragSrc.code) as any)?.days?.find((x: any) => x.day === dragSrc.day); return d?.dayType !== undefined ? Number(d.dayType) : (SYM_TO_DT[d?.symbol ?? ''] ?? -1); })());
    const toDT = getEffectiveDT(toCode, toDay, (() => { const d = (rows.find((r: any) => r.code === toCode) as any)?.days?.find((x: any) => x.day === toDay); return d?.dayType !== undefined ? Number(d.dayType) : (SYM_TO_DT[d?.symbol ?? ''] ?? -1); })());
    const origFrom = (() => { const d = (rows.find((r: any) => r.code === dragSrc.code) as any)?.days?.find((x: any) => x.day === dragSrc.day); return d?.dayType !== undefined ? Number(d.dayType) : (SYM_TO_DT[d?.symbol ?? ''] ?? -1); })();
    const origTo = (() => { const d = (rows.find((r: any) => r.code === toCode) as any)?.days?.find((x: any) => x.day === toDay); return d?.dayType !== undefined ? Number(d.dayType) : (SYM_TO_DT[d?.symbol ?? ''] ?? -1); })();
    setEdits(prev => {
      const next = new Map(prev);
      const kFrom: EditKey = `${dragSrc.code}_${dragSrc.day}`;
      const kTo: EditKey = `${toCode}_${toDay}`;
      toDT === origFrom ? next.delete(kFrom) : next.set(kFrom, toDT);
      fromDT === origTo ? next.delete(kTo) : next.set(kTo, fromDT);
      return next;
    });
    setDragSrc(null); setDragOver(null);
  };

  const handlePick = (dt: number) => {
    if (!picker) return;
    const key: EditKey = `${picker.code}_${picker.day}`;
    const origRow = rows.find((r: any) => r.code === picker.code) as any;
    const origDayData = origRow?.days?.find((d: any) => d.day === picker.day);
    const origDT = origDayData?.dayType !== undefined ? Number(origDayData.dayType) : (SYM_TO_DT[origDayData?.symbol ?? ''] ?? -1);
    setEdits(prev => {
      const next = new Map(prev);
      if (dt === origDT) next.delete(key);
      else next.set(key, dt);
      return next;
    });
    setPicker(null);
  };

  const handleUndo = () => { setEdits(new Map()); };

  const handleSave = async () => {
    if (edits.size === 0) return;
    setSaving(true);
    try {
      const changes = Array.from(edits.entries()).map(([key, dayType]) => {
        const lastUnderscore = key.lastIndexOf('_');
        const empCode = key.slice(0, lastUnderscore);
        const dayStr = key.slice(lastUnderscore + 1);
        return { empCode, day: Number(dayStr), dayType };
      });
      const r = await fetch('/api/distribution/edit-day', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId, changes }),
      });
      if (r.ok) {
        setEdits(new Map());
        onSaved?.();
      }
    } finally { setSaving(false); }
  };

  const getEffectiveDT = (code: string, day: number, originalDT: number): number => {
    const key: EditKey = `${code}_${day}`;
    return edits.has(key) ? edits.get(key)! : originalDT;
  };

  return (
    <div className={styles.tableOuter}>
      {filterCodes && filterCodes.size > 0 && (
        <div style={{ padding: '4px 12px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: 12, color: '#1d4ed8' }}>
          🔍 Đang lọc {filterCodes.size} nhân viên {filterMode === 'pass' ? 'đạt' : 'vi phạm'} — click lại vào nút lọc bên trên để bỏ lọc
        </div>
      )}
      <ScrollTable className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th className={styles.sc0} style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <SortTh label="MÃ NV" sortKey="code" sort={sort} onSort={onSort} className={styles.sc1} style={{ minWidth: 120, maxWidth: 120, overflow: 'hidden' }} />
              <SortTh label="TÊN NHÂN VIÊN" sortKey="name" sort={sort} onSort={onSort} className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }} />
              <SortTh label="PHÒNG BAN" sortKey="deptName" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 50 }} />
              <SortTh label="NGHỈ THÁNG TRƯỚC" sortKey="ngayNghiCuoiThangTruoc" sort={sort} onSort={onSort} style={{ minWidth: 60, color: '#0369a1' }} />
              {Array.from({ length: daysInMonth }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <SortTh label="NGÀY CÔNG" sortKey="workdays" sort={sort} onSort={onSort} style={{ minWidth: 60, color: '#15803d' }} />
              <SortTh label="PHÉP NĂM" sortKey="phepNam" sort={sort} onSort={onSort} style={{ minWidth: 36, color: '#7c3aed' }} />
              <th style={{ minWidth: 36, color: '#475569' }}>LP</th>
              <th style={{ minWidth: 36, color: '#15803d' }}>X</th>
              <th style={{ minWidth: 36, color: '#6d28d9' }}>PN</th>
              <SortTh label="NGHỈ CUỐI THÁNG NÀY" sortKey="_nghiCuoi" sort={sort} onSort={onSort} style={{ minWidth: 60, color: '#0369a1' }} />
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={0} daysCols={daysInMonth} codeThStyle={{ maxWidth: 120, width: 120 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel}
              middleChildren={<th><select className={s.statusFilterSelect} value={fNghiTruoc} onChange={e => setFNghiTruoc(e.target.value)}><option value="">Tất cả</option>{nghiTruocList.map(d => <option key={d} value={d}>{d}</option>)}</select></th>}
            >
              <StatFilterTh list={workdaysList} value={fWorkdays} onChange={setFWorkdays} />
              <StatFilterTh list={pnList} value={fPN} onChange={setFPN} />
              <th /><th /><th />
              <th><select className={s.statusFilterSelect} value={fNghiCuoi} onChange={e => setFNghiCuoi(e.target.value)}><option value="">Tất cả</option>{nghiCuoiList.map(d => <option key={d} value={d}>{d}</option>)}</select></th>
            </InlineFilterRow>
          </thead>
          <tbody>{useSortRows(filtered, sort).map((r: any, ri) => {
            const days: { day: number; dayType: number }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td className={styles.sc0} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={`${styles.mono} ${styles.sc1}`} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={`${styles.empName} ${styles.sc2}`} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                <td className={styles.statCell} style={{ color: '#0369a1', fontWeight: 400 }}>{fmtDate(r.ngayNghiCuoiThangTruoc) || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const origDT = d?.dayType !== undefined ? Number(d.dayType) : (SYM_TO_DT[(d as any)?.symbol ?? ''] ?? -1);
                  const dt = getEffectiveDT(r.code, i + 1, origDT);
                  const sym = DT_SYMBOL[dt] ?? '';
                  const bg = dt >= 0 ? (DT_CELL_BG[dt] ?? '#fff') : '#fff';
                  const clr = DT_TEXT[dt] ?? '#9ca3af';
                  const isChanged = edits.has((`${r.code}_${i + 1}`) as EditKey);
                  const isOver = dragOver?.code === r.code && dragOver?.day === i + 1;
                  return (
                    <td key={i}
                      className={`${styles.editableCell} ${isChanged ? styles.editableCellChanged : ''} ${isOver ? styles.editableCellDragOver : ''}`}
                      style={{
                        background: bg, color: clr, fontWeight: dt === 0 ? 700 : 600,
                        fontSize: '0.72rem', textAlign: 'center', padding: '4px 2px', minWidth: 28,
                        borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                        opacity: dragSrc?.code === r.code && dragSrc?.day === i + 1 ? 0.4 : 1,
                      }}
                      onContextMenu={(e) => { if (locked) return; e.preventDefault(); handleCellClick(r.code, i + 1, dt, e); }}
                      draggable={!locked}
                      onDragStart={() => { if (!locked) setDragSrc({ code: r.code, day: i + 1 }); }}
                      onDragOver={(e) => { e.preventDefault(); setDragOver({ code: r.code, day: i + 1 }); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleDrop(r.code, i + 1)}
                      onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
                    >
                      {sym || <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>}
                    </td>
                  );
                })}
                <td className={styles.statCell} style={{ color: '#15803d' }}>{r.workdays || '—'}</td>
                <td className={styles.statCell} style={{ color: '#7c3aed' }}>{r.phepNam || '—'}</td>
                <td className={styles.statCell}>{r._lpCnt ?? 0}</td>
                <td className={styles.statCell} style={{ color: '#15803d' }}>{r._xCnt ?? 0}</td>
                <td className={styles.statCell} style={{ color: '#6d28d9' }}>{r._pnDayCnt ?? 0}</td>
                {(() => {
                  const lastRestDay = Array.from({ length: daysInMonth }, (_, i) => i + 1).reverse().find(i => { const dt = getEffectiveDT(r.code, i, days.find(x => x.day === i)?.dayType ?? -1); return dt >= 0 && dt !== 0; });
                  const [mm, yyyy] = monthLabel.split('/');
                  const val = lastRestDay ? `${String(lastRestDay).padStart(2, '0')}/${mm}/${yyyy}` : '';
                  return <td className={styles.statCell} style={{ color: '#0369a1', fontWeight: 400, whiteSpace: 'nowrap' }}>{val || <span style={{ color: '#d1d5db' }}>—</span>}</td>;
                })()}
              </tr>
            );
          })}</tbody>
        </table>
      </ScrollTable>
      <div className={styles.legend}>
        {(() => {
          const usedDTs = new Set<number>();
          for (const r of rows as any[]) {
            for (const d of (r.days ?? []) as { day: number; dayType: number }[]) {
              const dt = getEffectiveDT(r.code, d.day, Number(d.dayType));
              if (dt >= 0) usedDTs.add(dt);
            }
          }
          const seenDT = new Set<number>();
          return (Array.isArray(leaveTypes) ? leaveTypes : []).map(lt => {
            const dt = lt.dayType >= 0 ? lt.dayType : (SYM_TO_DT[lt.code] ?? -1);
            if (dt < 0 || !usedDTs.has(dt) || seenDT.has(dt)) return null;
            seenDT.add(dt);
            const sym = DT_SYMBOL[dt] ?? lt.code;
            return (
              <span key={lt.code} className={styles.legendItem}>
                <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: DT_CELL_BG[dt], color: DT_TEXT[dt], fontWeight: 700, fontSize: '0.72rem', marginRight: 3, border: `1px solid ${DT_TEXT[dt]}30` }}>{sym}</span>
                {lt.name}
              </span>
            );
          });
        })()}
      </div>
      {/* Picker dropdown */}
      {picker && (
        <DayTypePicker
          currentDT={picker.currentDT}
          x={picker.x} y={picker.y}
          onPick={handlePick}
          onClose={() => setPicker(null)}
          leaveTypes={leaveTypes}
        />
      )}
      {/* Floating action bar */}
      {edits.size > 0 && (
        <div className={styles.editBar}>
          <span className={styles.editBarInfo}>
            ✏️ <span className={styles.editBarCount}>{edits.size}</span> thay đổi
          </span>
          <button className={`${styles.editBarBtn} ${styles.editBarBtnUndo}`} onClick={handleUndo} disabled={locked} type="button">
            ↩ Hoàn tác
          </button>
          <button className={`${styles.editBarBtn} ${styles.editBarBtnSave}`} onClick={handleSave} disabled={saving || locked} type="button">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>
      )}
    </div>
  );
}

/* === ShiftGrid (Step 3) === */
function ShiftGrid({ rows, monthLabel, filterCodes }: { rows: Record<string, unknown>[]; monthLabel: string; filterCodes?: Set<string> | null }) {
  const [mm_, yyyy_] = monthLabel.split('/');
  const daysInMonth = new Date(parseInt(yyyy_, 10), parseInt(mm_, 10), 0).getDate();
  const CA1_BG = '#eff6ff', CA1_CLR = '#1d4ed8';
  const CA2_BG = '#fff7ed', CA2_CLR = '#c2410c';
  const CAC_BG = '#f0fdf4', CAC_CLR = '#15803d';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const [sort, onSort] = useSort();
  const baseFiltered = useGridFilter(rows, fCode, fName, fDept);
  const filtered = useMemo(() => filterCodes ? baseFiltered.filter((r: any) => filterCodes.has(r.code)) : baseFiltered, [baseFiltered, filterCodes]);
  return (
    <div className={styles.tableOuter}>
      <ScrollTable className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th className={styles.sc0} style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <SortTh label="MÃ NV" sortKey="code" sort={sort} onSort={onSort} className={styles.sc1} style={{ minWidth: 120, maxWidth: 120, overflow: 'hidden' }} />
              <SortTh label="TÊN NHÂN VIÊN" sortKey="name" sort={sort} onSort={onSort} className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }} />
              <SortTh label="PHÒNG BAN" sortKey="deptName" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 50 }} />
              {Array.from({ length: daysInMonth }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <th style={{ minWidth: 40, color: CA1_CLR }}>C1</th>
              <th style={{ minWidth: 40, color: CA2_CLR }}>C2</th>
              <th style={{ minWidth: 40, color: CAC_CLR }}>C</th>
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={3} daysCols={daysInMonth} codeThStyle={{ maxWidth: 120, width: 120 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel} />
          </thead>
          <tbody>{useSortRows(filtered, sort).map((r: any, ri) => {
            const days: { day: number; dayType: number; shiftCode: string }[] = r.days ?? [];
            const ca1Count = days.filter(d => d.shiftCode === 'C1').length;
            const ca2Count = days.filter(d => d.shiftCode === 'C2').length;
            const caCCount = days.filter(d => d.shiftCode === 'C').length;
            return (
              <tr key={r.code}>
                <td className={styles.sc0} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={`${styles.mono} ${styles.sc1}`} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={`${styles.empName} ${styles.sc2}`} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const sc = d?.shiftCode ?? '';
                  let bg = '#fff', clr = '#9ca3af', label: string = DT_SYMBOL[dt] ?? '';
                  if (dt === 0 && sc === 'C1') { bg = CA1_BG; clr = CA1_CLR; label = 'C1'; }
                  else if (dt === 0 && sc === 'C2') { bg = CA2_BG; clr = CA2_CLR; label = 'C2'; }
                  else if (dt === 0 && sc === 'C') { bg = CAC_BG; clr = CAC_CLR; label = 'C'; }
                  else if (dt >= 0) { bg = DT_CELL_BG[dt] ?? '#fff'; clr = DT_TEXT[dt] ?? '#9ca3af'; }
                  return (
                    <td key={i} style={{ background: bg, color: clr, fontWeight: dt === 0 ? 700 : 600, fontSize: '0.72rem', textAlign: 'center', padding: '4px 2px', minWidth: 28, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                      {label || <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>}
                    </td>
                  );
                })}
                <td className={styles.statCell} style={{ color: CA1_CLR }}>{ca1Count || '—'}</td>
                <td className={styles.statCell} style={{ color: CA2_CLR }}>{ca2Count || '—'}</td>
                <td className={styles.statCell} style={{ color: CAC_CLR }}>{caCCount || '—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </ScrollTable>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA1_BG, color: CA1_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>C1</span> C1</span>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA2_BG, color: CA2_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>C2</span> C2</span>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CAC_BG, color: CAC_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>C</span> Ca chung</span>
      </div>
    </div>
  );
}

/* === OtLateGrid (Step 4) === */
function OtLateGrid({ rows, monthLabel, filterCodes }: { rows: Record<string, unknown>[]; monthLabel: string; filterCodes?: Set<string> | null }) {
  const [mm_, yyyy_] = monthLabel.split('/');
  const daysInMonth = new Date(parseInt(yyyy_, 10), parseInt(mm_, 10), 0).getDate();
  const OT_BG = '#eff6ff', OT_CLR = '#1d4ed8';
  const LATE_BG = '#fff7ed', LATE_CLR = '#c2410c';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const [sort, onSort] = useSort();
  const [fOT, setFOT] = useState('');
  const [fLate, setFLate] = useState('');
  const [fSourceOT, setFSourceOT] = useState('');
  const [fSourceLate, setFSourceLate] = useState('');
  const otList = useStatList(rows, 'totalOT', 0);
  const lateList = useStatList(rows, 'totalLate', 0);
  const sourceOtList = useStatList(rows, 'overtimeHours', 0);
  const sourceLateList = useStatList(rows, 'lateMinutes', 0);
  const baseFiltered = useGridFilter(rows, fCode, fName, fDept);
  const filtered = useMemo(() => {
    let r = baseFiltered as any[];
    if (fOT) r = r.filter((x: any) => Number(x.totalOT) > 0 && String(Math.round(Number(x.totalOT))) === fOT);
    if (fLate) r = r.filter((x: any) => Number(x.totalLate) > 0 && String(Math.round(Number(x.totalLate))) === fLate);
    if (fSourceOT) r = r.filter((x: any) => String(x.overtimeHours ?? '') === fSourceOT);
    if (fSourceLate) r = r.filter((x: any) => String(x.lateMinutes ?? '') === fSourceLate);
    if (filterCodes) r = r.filter((x: any) => filterCodes.has(x.code));
    return r;
  }, [baseFiltered, fOT, fLate, fSourceOT, fSourceLate, filterCodes]);
  return (
    <div className={styles.tableOuter}>
      <ScrollTable className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th className={styles.sc0} style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <SortTh label="MÃ NV" sortKey="code" sort={sort} onSort={onSort} className={styles.sc1} style={{ minWidth: 120, maxWidth: 120, overflow: 'hidden' }} />
              <SortTh label="TÊN NHÂN VIÊN" sortKey="name" sort={sort} onSort={onSort} className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }} />
              <SortTh label="PHÒNG BAN" sortKey="deptName" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 50 }} />
              {Array.from({ length: daysInMonth }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <SortTh label="TG GỐC (H)" sortKey="overtimeHours" sort={sort} onSort={onSort} style={{ minWidth: 44, color: '#6b7280' }} />
              <SortTh label="TRỄ GỐC (PH)" sortKey="lateMinutes" sort={sort} onSort={onSort} style={{ minWidth: 50, color: '#6b7280' }} />
              <SortTh label="TĂNG CA (H)" sortKey="totalOT" sort={sort} onSort={onSort} style={{ minWidth: 44, color: OT_CLR }} />
              <SortTh label="TRỄ(PH)" sortKey="totalLate" sort={sort} onSort={onSort} style={{ minWidth: 50, color: LATE_CLR }} />
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={0} daysCols={daysInMonth} codeThStyle={{ maxWidth: 120, width: 120 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel}>
              <StatFilterTh list={sourceOtList} value={fSourceOT} onChange={setFSourceOT} />
              <StatFilterTh list={sourceLateList} value={fSourceLate} onChange={setFSourceLate} />
              <StatFilterTh list={otList} value={fOT} onChange={setFOT} />
              <StatFilterTh list={lateList} value={fLate} onChange={setFLate} />
            </InlineFilterRow>
          </thead>
          <tbody>{useSortRows(filtered, sort).map((r: any, ri) => {
            const days: { day: number; dayType: number; otH: number; lateM: number }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td className={styles.sc0} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={`${styles.mono} ${styles.sc1}`} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={`${styles.empName} ${styles.sc2}`} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const ot = Number(d?.otH) || 0;
                  const late = Number(d?.lateM) || 0;
                  let bg = '#fff', clr = '#9ca3af', label: React.ReactNode = <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>;
                  if (dt === 0 && ot > 0 && late > 0) {
                    bg = '#f5f3ff'; clr = '#6d28d9';
                    label = <><span style={{ color: OT_CLR }}>{Math.round(ot)}h</span><span style={{ color: '#9ca3af', margin: '0 1px' }}>/</span><span style={{ color: LATE_CLR }}>{Math.round(late)}</span></>;
                  } else if (dt === 0 && ot > 0) { bg = OT_BG; clr = OT_CLR; label = <>{Math.round(ot)}h</>; }
                  else if (dt === 0 && late > 0) { bg = LATE_BG; clr = LATE_CLR; label = <>{Math.round(late)}</>; }
                  else if (dt === 0) { bg = DT_CELL_BG[0]; clr = DT_TEXT[0]; label = <span style={{ opacity: 0.4 }}>X</span>; }
                  else if (dt >= 0) { bg = DT_CELL_BG[dt] ?? '#fff'; clr = DT_TEXT[dt] ?? '#9ca3af'; label = <span>{DT_SYMBOL[dt] ?? ''}</span>; }
                  return (
                    <td key={i} style={{ background: bg, color: clr, fontWeight: 700, fontSize: '0.7rem', textAlign: 'center', padding: '3px 2px', minWidth: 28, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>{label}</td>
                  );
                })}
                <td className={styles.statCell} style={{ color: '#6b7280' }}>{r.overtimeHours ? <span className={styles.otTag} style={{ background: '#f3f4f6', color: '#6b7280' }}>{Number(r.overtimeHours).toFixed(2)}h</span> : ''}</td>
                <td className={styles.statCell} style={{ color: '#6b7280' }}>{r.lateMinutes ? <span className={styles.lateTag} style={{ background: '#f3f4f6', color: '#6b7280' }}>{Number(r.lateMinutes).toFixed(0)}</span> : ''}</td>
                <DiffCell value={r.totalOT} source={r.overtimeHours} unit="h" decimals={2} cls={styles.statCell} cls2={styles.otTag} clr={OT_CLR} />
                <DiffCell value={r.totalLate} source={r.lateMinutes} unit="" decimals={0} cls={styles.statCell} cls2={styles.lateTag} clr={LATE_CLR} />
              </tr>
            );
          })}</tbody>
        </table>
      </ScrollTable>
    </div>
  );
}

/* === TimeGrid (Step 5) === */
function TimeGrid({ rows, monthLabel, showCa, filterCodes }: { rows: Record<string, unknown>[]; monthLabel: string; showCa: boolean; filterCodes?: Set<string> | null }) {
  const [mm_, yyyy_] = monthLabel.split('/');
  const daysInMonth = new Date(parseInt(yyyy_, 10), parseInt(mm_, 10), 0).getDate();
  const IN_BG = '#f0fdf4', IN_CLR = '#15803d';
  const OUT_BG = '#eff6ff', OUT_CLR = '#1d4ed8';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const [fGroup, setFGroup] = useState('');
  const deptList = useDeptList(rows);
  const groupList = useMemo(() => [...new Set((rows as any[]).map(r => r.specialGroup).filter(Boolean))].sort((a,b) => a.localeCompare(b,'vi')), [rows]);
  const [fEndDate, setFEndDate] = useState('');
  const endDateList = useMemo(() => [...new Set((rows as any[]).map(r => r.groupCodeEndDate).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [rows]);
  const [sort, onSort] = useSort();
  const baseFiltered = useGridFilter(rows, fCode, fName, fDept, fGroup);
  const filtered = useMemo(() => {
    let r = filterCodes ? baseFiltered.filter((x: any) => filterCodes.has(x.code)) : baseFiltered;
    if (fEndDate) r = r.filter((x: any) => (x.groupCodeEndDate ?? '') === fEndDate);
    return r;
  }, [baseFiltered, filterCodes, fEndDate]);
  return (
    <div className={styles.tableOuter}>
      <ScrollTable className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th className={styles.sc0} style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <SortTh label="MÃ NV" sortKey="code" sort={sort} onSort={onSort} className={styles.sc1} style={{ minWidth: 120, maxWidth: 120, overflow: 'hidden' }} />
              <SortTh label="TÊN NHÂN VIÊN" sortKey="name" sort={sort} onSort={onSort} className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }} />
              <SortTh label="PHÒNG BAN" sortKey="deptName" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 50 }} />
              <SortTh label="NHÓM ĐẶC THÙ" sortKey="specialGroup" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 80, color: '#0369a1' }} />
              <SortTh label="NGÀY KẾT THÚC" sortKey="groupCodeEndDate" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 80, color: '#7c3aed' }} />
              {Array.from({ length: daysInMonth }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={0} fGroup={fGroup} setFGroup={setFGroup} groupList={groupList} codeThStyle={{ maxWidth: 120, width: 120 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel}
              middleChildren={<th><select className={s.statusFilterSelect} value={fEndDate} onChange={e => setFEndDate(e.target.value)}><option value="">Tất cả</option>{endDateList.map(d => <option key={d} value={d}>{d}</option>)}</select></th>}
            />
          </thead>
          <tbody>{useSortRows(filtered, sort).map((r: any, ri) => {
            const days: { day: number; dayType: number; checkIn: string; checkOut: string; shiftCode: string }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td className={styles.sc0} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={`${styles.mono} ${styles.sc1}`} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={`${styles.empName} ${styles.sc2}`} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: '#0369a1', whiteSpace: 'nowrap' }}>{r.specialGroup || '—'}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: '#7c3aed', whiteSpace: 'nowrap' }}>{r.groupCodeEndDate || '—'}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const ci = d?.checkIn ?? '';
                  const co = d?.checkOut ?? '';
                  let bg = '#fff', clr = '#9ca3af', label: React.ReactNode = <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>;
                  if (ci && (dt === 0 || dt === 1)) {
                    bg = dt === 0 ? IN_BG : (DT_CELL_BG[1] ?? '#fff');
                    label = <><span style={{ color: dt === 0 ? IN_CLR : DT_TEXT[1], display: 'block', lineHeight: 1.2 }}>{ci}</span><span style={{ color: dt === 0 ? OUT_CLR : DT_TEXT[1], display: 'block', lineHeight: 1.2 }}>{co}</span>{dt === 0 && showCa && d?.shiftCode && <span style={{ color: '#ea580c', display: 'block', lineHeight: 1.2, fontSize: '0.6rem' }}>{d.shiftCode}</span>}</>;
                  } else if (dt >= 0) { bg = DT_CELL_BG[dt] ?? '#fff'; clr = DT_TEXT[dt] ?? '#9ca3af'; label = <span>{DT_SYMBOL[dt] ?? ''}</span>; }
                  return (
                    <td key={i} title={d?.shiftCode || ''} style={{ background: bg, color: clr, fontWeight: 600, fontSize: '0.65rem', textAlign: 'center', padding: '2px 1px', minWidth: 38, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', lineHeight: 1.3 }}>{label}</td>
                  );
                })}
              </tr>
            );
          })}</tbody>
        </table>
      </ScrollTable>
    </div>
  );
}

/* === FinalGrid (Step 6) === */
function FinalGrid({ rows, monthLabel }: { rows: Record<string, unknown>[]; monthLabel: string }) {
  const [mm_, yyyy_] = monthLabel.split('/');
  const daysInMonth = new Date(parseInt(yyyy_, 10), parseInt(mm_, 10), 0).getDate();
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const [fGroup, setFGroup] = useState('');
  const groupList = useMemo(() => { const gs = new Set<string>(); for (const r of rows as any[]) { if (r.specialGroup) gs.add(r.specialGroup); } return [...gs].sort((a, b) => a.localeCompare(b, 'vi')); }, [rows]);
  const [fWorkdays, setFWorkdays] = useState('');
  const [fLP, setFLP] = useState('');
  const [fPN2, setFPN2] = useState('');
  const [fOT2, setFOT2] = useState('');
  const [fLate2, setFLate2] = useState('');
  const [fNghiCuoi, setFNghiCuoi] = useState('');
  const [fNghiTruoc, setFNghiTruoc] = useState('');
  const nghiCuoiList = useMemo(() => {
    const [mm, yyyy] = monthLabel.split('/');
    return [...new Set((rows as any[]).map(r => {
      const days: { day: number; dayType: number }[] = r.days ?? [];
      const d = Array.from({ length: daysInMonth }, (_, i) => i + 1).reverse().find(i => { const dt = Number((days.find(x => x.day === i) as any)?.dayType ?? -1); return dt >= 0 && dt !== 0; });
      return d ? `${String(d).padStart(2, '0')}/${mm}/${yyyy}` : '';
    }).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rows, monthLabel]);
  const nghiCuoiList2 = useMemo(() => {
    const [mm, yyyy] = monthLabel.split('/');
    return (rows as any[]).map(r => {
      const days: { day: number; dayType: number }[] = r.days ?? [];
      const d = Array.from({ length: daysInMonth }, (_, i) => i + 1).reverse().find(i => { const dt = Number((days.find(x => x.day === i) as any)?.dayType ?? -1); return dt >= 0 && dt !== 0; });
      return { ...r, _nghiCuoi: d ? `${String(d).padStart(2, '0')}/${mm}/${yyyy}` : '' };
    });
  }, [rows, monthLabel]);
  const nghiTruocList = useMemo(() => {
    const vals = [...new Set((rows as any[]).map(r => fmtDate(r.ngayNghiCuoiThangTruoc)))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
    if ((rows as any[]).some(r => !fmtDate(r.ngayNghiCuoiThangTruoc))) vals.unshift('(Trống)');
    return vals;
  }, [rows]);
  const workdaysList2 = useStatList(rows, 'workdays');
  const lpList2 = useStatList(rows, 'lpCount');
  const pnList2 = useStatList(rows, 'pnCount');
  const otList2 = useStatList(rows, 'totalOT', 0);
  const lateList2 = useStatList(rows, 'totalLate', 0);
  const baseFiltered2 = useGridFilter(nghiCuoiList2, fCode, fName, fDept, fGroup);
  const [sort, onSort] = useSort();
  const filtered = useMemo(() => {
    let r = baseFiltered2 as any[];
    if (fNghiTruoc) {
      if (fNghiTruoc === '(Trống)') {
        r = r.filter((x: any) => !fmtDate(x.ngayNghiCuoiThangTruoc));
      } else {
        r = r.filter((x: any) => (fmtDate(x.ngayNghiCuoiThangTruoc) ?? '') === fNghiTruoc);
      }
    }
    if (fNghiCuoi) r = r.filter((x: any) => x._nghiCuoi === fNghiCuoi);
    if (fWorkdays) r = r.filter((x: any) => String(x.workdays ?? '') === fWorkdays);
    if (fLP) r = r.filter((x: any) => String(x.lpCount ?? '') === fLP);
    if (fPN2) r = r.filter((x: any) => String(x.pnCount ?? '') === fPN2);
    if (fOT2) r = r.filter((x: any) => Number(x.totalOT) > 0 && String(Math.round(Number(x.totalOT))) === fOT2);
    if (fLate2) r = r.filter((x: any) => Number(x.totalLate) > 0 && String(Math.round(Number(x.totalLate))) === fLate2);
    return r;
  }, [baseFiltered2, fNghiTruoc, fNghiCuoi, fWorkdays, fLP, fPN2, fOT2, fLate2]);
  return (
    <div className={styles.tableOuter}>
      <ScrollTable className={styles.tableWrap}>
        <table className={styles.gridTable} style={{ fontSize: '0.68rem' }}>
          <thead>
            <tr>
              <th className={styles.sc0} style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <SortTh label="MÃ NV" sortKey="code" sort={sort} onSort={onSort} className={styles.sc1} style={{ minWidth: 120, maxWidth: 120, overflow: 'hidden' }} />
              <SortTh label="TÊN NHÂN VIÊN" sortKey="name" sort={sort} onSort={onSort} className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }} />
              <SortTh label="PHÒNG BAN" sortKey="deptName" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 50 }} />
              <SortTh label="NHÓM ĐẶC THÙ" sortKey="specialGroup" sort={sort} onSort={onSort} style={{ textAlign: 'left', minWidth: 70, color: '#0369a1' }} />
              <SortTh label="NGHỈ THÁNG TRƯỚC" sortKey="ngayNghiCuoiThangTruoc" sort={sort} onSort={onSort} style={{ minWidth: 60, color: '#92400e' }} />
              {Array.from({ length: daysInMonth }, (_, i) => <th key={i} className={styles.dayNum} style={{ minWidth: 64 }}>{i + 1}</th>)}
              <SortTh label="NGÀY CÔNG" sortKey="workdays" sort={sort} onSort={onSort} style={{ minWidth: 44, color: '#15803d' }} />
              <SortTh label="LP" sortKey="lpCount" sort={sort} onSort={onSort} style={{ minWidth: 36, color: '#1d4ed8' }} />
              <SortTh label="PN" sortKey="pnCount" sort={sort} onSort={onSort} style={{ minWidth: 36, color: '#7c3aed' }} />
              <SortTh label="TĂNG CA (H)" sortKey="totalOT" sort={sort} onSort={onSort} style={{ minWidth: 50, color: '#1d4ed8' }} />
              <SortTh label="TRỄ(PH)" sortKey="totalLate" sort={sort} onSort={onSort} style={{ minWidth: 44, color: '#c2410c' }} />
              <SortTh label="NGHỈ CUỐI THÁNG NÀY" sortKey="_nghiCuoi" sort={sort} onSort={onSort} style={{ minWidth: 60, color: '#0369a1' }} />
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={0} daysCols={daysInMonth} fGroup={fGroup} setFGroup={setFGroup} groupList={groupList} codeThStyle={{ maxWidth: 120, width: 120 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel}
              middleChildren={<th><select className={s.statusFilterSelect} value={fNghiTruoc} onChange={e => setFNghiTruoc(e.target.value)}><option value="">Tất cả</option>{nghiTruocList.map(d => <option key={d} value={d}>{d}</option>)}</select></th>}
            >
              <StatFilterTh list={workdaysList2} value={fWorkdays} onChange={setFWorkdays} />
              <StatFilterTh list={lpList2} value={fLP} onChange={setFLP} />
              <StatFilterTh list={pnList2} value={fPN2} onChange={setFPN2} />
              <StatFilterTh list={otList2} value={fOT2} onChange={setFOT2} />
              <StatFilterTh list={lateList2} value={fLate2} onChange={setFLate2} />
              <th><select className={s.statusFilterSelect} value={fNghiCuoi} onChange={e => setFNghiCuoi(e.target.value)}><option value="">Tất cả</option>{nghiCuoiList.map(d => <option key={d} value={d}>{d}</option>)}</select></th>
            </InlineFilterRow>
          </thead>
          <tbody>{useSortRows(filtered, sort).map((r: any, ri) => (
            <tr key={r.code} style={{ background: ri % 2 === 0 ? '#fff' : 'var(--gray-50)' }}>
              <td className={styles.sc0} style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
              <td className={`${styles.mono} ${styles.sc1}`} style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
              <td className={styles.sc2} style={{ textAlign: 'left', minWidth: 200, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
              <td style={{ textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
              <td style={{ textAlign: 'left', fontSize: '0.65rem', color: '#0369a1', whiteSpace: 'nowrap' }}>{r.specialGroup || '—'}</td>
              <td style={{ textAlign: 'left', fontSize: '0.7rem', color: '#92400e', whiteSpace: 'nowrap', fontWeight: 400 }}>{fmtDate(r.ngayNghiCuoiThangTruoc) || '—'}</td>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = (r.days ?? []).find((x: any) => x.day === i + 1);
                if (!d) return <td key={i} style={{ background: '#fff', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}><span style={{ color: '#d1d5db' }}>·</span></td>;
                const dt = Number(d.dayType);
                const isWork = dt === 0;
                return <td key={i} style={{ background: DT_CELL_BG[dt] ?? '#fff', color: DT_TEXT[dt] ?? '#9ca3af', fontWeight: 600, fontSize: '0.65rem', textAlign: 'center', padding: '2px 1px', minWidth: 48, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', lineHeight: 1.3 }} title={(DAY_TYPE_LABEL[dt] ?? '') + ' | ' + (d.shiftCode ?? '')}>
                  {isWork ? <><span style={{ color: '#15803d', display: 'block', lineHeight: 1.2 }}>{d.checkIn}</span><span style={{ color: '#1d4ed8', display: 'block', lineHeight: 1.2 }}>{d.checkOut}</span></> : <span style={{ opacity: 0.85 }}>{DT_SYMBOL[dt] ?? '?'}</span>}
                </td>;
              })}
              <td style={{ fontWeight: 700, color: '#15803d', textAlign: 'center' }}>{r.workdays || '—'}</td>
              <td style={{ fontWeight: 700, color: '#1d4ed8', textAlign: 'center' }}>{r.lpCount ?? 0}</td>
              <td style={{ fontWeight: 700, color: '#7c3aed', textAlign: 'center' }}>{r.pnCount ?? 0}</td>
              <td style={{ textAlign: 'center' }}>{Number(r.totalOT) > 0 ? <span className={styles.otTag}>{Math.round(Number(r.totalOT))}</span> : 0}</td>
              <td style={{ textAlign: 'center' }}>{Number(r.totalLate) > 0 ? <span className={styles.lateTag}>{Math.round(Number(r.totalLate))}</span> : 0}</td>
              {(() => {
                const days: { day: number; dayType: number }[] = r.days ?? [];
                const lastRestDay = Array.from({ length: daysInMonth }, (_, i) => i + 1).reverse().find(i => { const dt = Number((days.find(x => x.day === i) as any)?.dayType ?? -1); return dt >= 0 && dt !== 0; });
                const [mm, yyyy] = monthLabel.split('/');
                const val = lastRestDay ? `${String(lastRestDay).padStart(2, '0')}/${mm}/${yyyy}` : '';
                return <td style={{ textAlign: 'center', color: '#0369a1', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{val || '—'}</td>;
              })()}
            </tr>
          ))}</tbody>
        </table>
      </ScrollTable>
    </div>
  );
}

/* === ValidatePanel === */
type FilterMode = 'violation' | 'pass';
type FilterState = { mode: FilterMode; codes: Set<string> } | null;
type CheckStatus = 'ok' | 'warning' | 'error';
interface ViolationItem { code: string; name: string; deptName: string; day: number; detail: string; dailyBreakdown?: number[]; avgRest?: number; specialDays?: number[]; }
interface CheckResult { id: string; label: string; description: string; status: CheckStatus; violations: ViolationItem[]; violationCount: number; checkedCount: number; }
interface ValidateResult { monthId: string; totalEmps: number; totalViolations: number; overallStatus: CheckStatus; checkedAt: string; results: CheckResult[]; }

const ValidatePanel = forwardRef<{ run: () => void }, { monthId: string; onlyIds?: string[]; title?: string; subtitle?: string; btnId?: string; onFixed?: () => void; autoRun?: boolean; onFilterChange?: (filter: FilterState) => void; onValidated?: () => void; onStatusChange?: (s: { loading: boolean; result: ValidateResult | null }) => void; initialResult?: ValidateResult | null; version?: number; }>(
  function ValidatePanelInner({ monthId, onlyIds, title, subtitle, btnId, onFixed, autoRun, onFilterChange, onValidated, onStatusChange, initialResult, version }, ref) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ValidateResult | null>(initialResult ?? null);
    const [fixingLp, setFixingLp] = useState(false);
    const [fixingLpAfterPn, setFixingLpAfterPn] = useState(false);
    const [fixingShift, setFixingShift] = useState(false);
    const [fixingShiftAssigned, setFixingShiftAssigned] = useState(false);
    const [fixingOtLate, setFixingOtLate] = useState(false);
  const [fixingTime, setFixingTime] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fixResult, setFixResult] = useState<{ label: string; fixed: number; total?: number; onConfirm: () => void } | null>(null);
    const [activeFilter, setActiveFilter] = useState<{ id: string; mode: FilterMode } | null>(null);
    const activeFilterRef = useRef(activeFilter);
    activeFilterRef.current = activeFilter;
    const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
    const lastFetchVersion = useRef<number | undefined>(undefined);

    const run = useCallback(async () => {
      if (version !== undefined && lastFetchVersion.current === version && result) {
        onStatusChange?.({ loading: false, result });
        return;
      }
      lastFetchVersion.current = version;
      setLoading(true); setError(null); onStatusChange?.({ loading: true, result: null });
      try {
        const ids = onlyIds?.length ? `&ids=${onlyIds.join(',')}` : '';
        const r = await fetch(`/api/distribution/validate?month=${monthId}${ids}`);
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setResult(data);
        onStatusChange?.({ loading: false, result: data });
        onValidated?.();
      } catch (e) { setError(String(e)); onStatusChange?.({ loading: false, result: null }); } finally { setLoading(false); }
    }, [version, result, monthId, onlyIds?.join(','), onStatusChange, onValidated]);

    useEffect(() => { if (autoRun) run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
      if (!result) return;
      const filter = activeFilterRef.current;
      if (!filter) return;
      const check = result.results.find(c => c.id === filter.id);
      if (!check || check.violationCount === 0) { setActiveFilter(null); onFilterChange?.(null); return; }
      const violatorCodes = new Set(check.violations.filter(v => v.code !== '—').map(v => v.code));
      onFilterChange?.({ mode: filter.mode, codes: violatorCodes });
    }, [result]); // eslint-disable-line react-hooks/exhaustive-deps
    useImperativeHandle(ref, () => ({ run }), [run]);

    const doFix = async (
      label: string, url: string, body: object,
      setLoading: (v: boolean) => void,
      getFixed: (d: any) => { fixed: number; total?: number },
    ) => {
      setLoading(true); setError(null);
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(await r.text());
        const d = await r.json();
        const { fixed, total } = getFixed(d);
        setFixResult({ label, fixed, total, onConfirm: async () => { setFixResult(null); onFixed?.(); await run(); } });
      } catch (e) { setError(String(e)); } finally { setLoading(false); }
    };

    const fixLp = () => doFix('Cân bằng LP', '/api/distribution/fix-rest-balance', { monthId }, setFixingLp, d => ({ fixed: d.fixed }));
    const fixShift = () => doFix('Cân bằng ca', '/api/distribution/fix-shift-balance', { monthId }, setFixingShift, d => ({ fixed: d.fixed }));
    const fixShiftAssigned = () => doFix('Chia ca lại', '/api/distribution/step/4', { monthId }, setFixingShiftAssigned, d => ({ fixed: d.fixed ?? 0 }));
    const fixOtLate = () => doFix('Phân bổ lại OT/Trễ', '/api/distribution/step/5', { monthId }, setFixingOtLate, d => ({ fixed: d.fixed ?? 0 }));
    const fixTime = () => doFix('Sửa giờ vào/ra', '/api/distribution/step/5', { monthId }, setFixingTime, d => ({ fixed: d.fixed ?? 0 }));
    const fixLpAfterPn = () => doFix('Cập nhật LP sau PN', '/api/distribution/fix-lp-after-pn', { monthId }, setFixingLpAfterPn, d => ({ fixed: d.fixed }));

    const statusClass: Record<CheckStatus, string> = { ok: styles.checkCardOk, warning: styles.checkCardWarn, error: styles.checkCardError };
    const dotClass: Record<CheckStatus, string> = { ok: styles.dotOk, warning: styles.dotWarn, error: styles.dotError };
    const countClass: Record<CheckStatus, string> = { ok: styles.countOk, warning: styles.countWarn, error: styles.countError };
    const summaryClass: Record<CheckStatus, string> = { ok: styles.summaryOk, warning: styles.summaryWarn, error: styles.summaryError };
    const summaryLabel: Record<CheckStatus, string> = { ok: '✅ Tất cả điều kiện đạt', warning: '⚠️ Có cảnh báo cần xem xét', error: '❌ Có điều kiện chưa thỏa mãn' };

    return (
      <div className={styles.validateWrap} style={{ borderTop: '2px solid #e2e8f0', marginTop: 4 }}>
        {error && <div style={{ background: '#fef2f2', padding: 10, color: '#b91c1c' }}>⚠️ Lỗi: {error}</div>}
        {fixResult && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalCard} style={{ maxWidth: 360 }}>
              <div className={styles.modalIcon} style={{ background: fixResult.fixed > 0 ? '#f0fdf4' : '#fef9c3' }}>
                <span style={{ fontSize: 28 }}>{fixResult.fixed > 0 ? '✅' : '⚠️'}</span>
              </div>
              <h2 className={styles.modalTitle}>{fixResult.label}</h2>
              <p className={styles.modalDesc}>
                {fixResult.fixed === 0
                  ? <span style={{ color: '#b91c1c' }}>Không sửa được trường hợp nào. Cần sửa thủ công.</span>
                  : fixResult.total !== undefined && fixResult.fixed < fixResult.total
                    ? <>Đã sửa <strong style={{ color: '#15803d' }}>{fixResult.fixed}</strong> / <strong>{fixResult.total}</strong> trường hợp.<br /><span style={{ color: '#b91c1c' }}>Còn {fixResult.total - fixResult.fixed} chưa sửa được. Cần sửa thủ công.</span></>
                    : <>Đã sửa <strong style={{ color: '#15803d' }}>{fixResult.fixed}</strong> trường hợp thành công.</>
                }
              </p>
              <button className={styles.modalBtnOk} onClick={fixResult.onConfirm} autoFocus>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                OK
              </button>
            </div>
          </div>
        )}
        {result && (
          
          <div className={styles.validateGrid}>
            {result.results.map(check => (
              <div key={check.id} className={`${styles.checkCard} ${statusClass[check.status]}${activeFilter?.id === check.id ? ` ${styles.checkCardActive}` : ''}`}>
                <div className={styles.checkCardHeader}>
                  <span className={`${styles.checkStatusDot} ${dotClass[check.status]}`} />
                  <span className={styles.checkLabel}>{check.label}</span>
                  <span className={`${styles.checkCount} ${countClass[check.status]}`} onClick={e => { if (check.violationCount === 0) return; e.stopPropagation(); setExpandedChecks(prev => { if (prev.has(check.id)) return new Set(); return new Set([check.id]); }); }} style={{ cursor: check.violationCount > 0 ? 'pointer' : 'default' }}>{(() => { if (check.violationCount === 0) return ''; if (check.id === 'lp_balance') { const dayCount = check.violations.filter(v => v.code === '—' && v.day > 0).length; return expandedChecks.has(check.id) ? `▴ ${dayCount} ngày vi phạm` : `▾ ${dayCount} ngày vi phạm`; } const nvCount = new Set(check.violations.filter(v => v.code !== '—').map(v => v.code)).size; const label = nvCount > 0 ? `${check.violationCount} vi phạm/${nvCount} NV` : `${check.violationCount} vi phạm`; return expandedChecks.has(check.id) ? `▴ ${label}` : `▾ ${label}`; })()}</span>
                  {onFilterChange && (
                    <span style={{ display: 'flex', gap: 2, marginLeft: 4, alignItems: 'center' }}>
                      {activeFilter?.id === check.id && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 10, background: '#1d4ed8', color: '#fff', whiteSpace: 'nowrap' }}>🔍 Đang lọc</span>}
                      {check.violationCount > 0 && (
                        <span
                          onClick={e => { e.stopPropagation(); const violatorCodes = new Set(check.violations.filter(v => v.code !== '—').map(v => v.code)); if (activeFilter?.id === check.id && activeFilter?.mode === 'violation') { setActiveFilter(null); onFilterChange(null); } else { setActiveFilter({ id: check.id, mode: 'violation' }); onFilterChange({ mode: 'violation', codes: violatorCodes }); } }}
                          style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, cursor: 'pointer', background: activeFilter?.id === check.id && activeFilter?.mode === 'violation' ? '#fee2e2' : '#f1f5f9', color: activeFilter?.id === check.id && activeFilter?.mode === 'violation' ? '#b91c1c' : '#64748b', border: activeFilter?.id === check.id && activeFilter?.mode === 'violation' ? '1px solid #fca5a5' : '1px solid transparent', userSelect: 'none', whiteSpace: 'nowrap' }}
                        >❌ Vi phạm</span>
                      )}
                      <span
                        onClick={e => { e.stopPropagation(); const allViolatorCodes = new Set(check.violations.filter(v => v.code !== '—').map(v => v.code)); if (activeFilter?.id === check.id && activeFilter?.mode === 'pass') { setActiveFilter(null); onFilterChange(null); } else { setActiveFilter({ id: check.id, mode: 'pass' }); onFilterChange({ mode: 'pass', codes: allViolatorCodes }); } }}
                        style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, cursor: 'pointer', background: activeFilter?.id === check.id && activeFilter?.mode === 'pass' ? '#dcfce7' : '#f1f5f9', color: activeFilter?.id === check.id && activeFilter?.mode === 'pass' ? '#15803d' : '#64748b', border: activeFilter?.id === check.id && activeFilter?.mode === 'pass' ? '1px solid #86efac' : '1px solid transparent', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >✅ Đạt</span>
                    </span>
                  )}
                  {check.id === 'pn_end_of_rest' && check.violationCount > 0 && (
                    <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixLpAfterPn(); }} disabled={fixingLpAfterPn || loading} type="button">{fixingLpAfterPn ? '...' : '🔄 Cập nhật'}</button>
                  )}
                  {check.id === 'lp_balance' && check.violationCount > 0 && (
                    <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixLp(); }} disabled={fixingLp || loading} type="button">{fixingLp ? '...' : '⚖️ Cân bằng LP'}</button>
                  )}
                  {check.id === 'shift_assigned' && check.violationCount > 0 && (
                    <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixShiftAssigned(); }} disabled={fixingShiftAssigned || loading} type="button">{fixingShiftAssigned ? '...' : '🔧 Chia ca lại'}</button>
                  )}
                  {check.id === 'shift_balance' && check.violationCount > 0 && (
                    <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixShift(); }} disabled={fixingShift || loading} type="button">{fixingShift ? '...' : '⚖️ Cân bằng ca'}</button>
                  )}
                  {(['ot_max_per_day', 'ot_start_day', 'late_max_per_day', 'late_start_day', 'ot_min_per_day', 'ot_between_rest'] as string[]).includes(check.id) && check.violationCount > 0 && (
                    <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixOtLate(); }} disabled={fixingOtLate || loading} type="button">{fixingOtLate ? '...' : '🔧 Phân bổ lại'}</button>
                  )}
                  {check.id === 'ot_balance' && check.violationCount > 0 && (
                    <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixOtLate(); }} disabled={fixingOtLate || loading} type="button">{fixingOtLate ? '...' : '⚖️ Cân bằng OT'}</button>
                  )}
                  {check.id === 'check_time' && check.violationCount > 0 && (
                    <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixTime(); }} disabled={fixingTime || loading} type="button">{fixingTime ? '...' : '🔧 Sửa giờ ra/vào'}</button>
                  )}
                </div>
                {(['consecutive_days', 'cross_month_consecutive', 'pn_start_day', 'pn_count', 'shift_assigned', 'check_time'] as string[]).includes(check.id) && check.violations.length > 0 && expandedChecks.has(check.id) && (
                  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 2, height: 150, overflowY: 'auto' }}>
                    {check.violations.map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 8px 2px 20px', borderLeft: '2px solid #e2e8f0' }}>
                        <span style={{ fontSize: 11, color: '#64748b', minWidth: 60, fontFamily: 'monospace' }}>{v.code}</span>
                        <span style={{ fontSize: 12, color: '#0f172a', minWidth: 140 }}>{v.name}</span>
                        <span style={{ fontSize: 11, color: '#475569' }}>{v.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
                {check.id === 'lp_balance' && check.violations.length > 0 && expandedChecks.has(check.id) && (
                  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #e2e8f0', height: 150, overflowY: 'auto' }}>
                    {check.violations.filter(v => v.name.startsWith('📊') && v.dailyBreakdown).map((summary, i) => {
                      const daysInMonth = Math.min(31, summary.dailyBreakdown!.length - 1);
                      const dayNums = Array.from({ length: daysInMonth }, (_, j) => j + 1);
                      return (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 3 }}>
                            {summary.name}
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 6 }}>{summary.detail}</span>
                          </div>
                          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
                            <thead>
                              <tr>
                                {dayNums.map(d => (
                                  <th key={d} style={{ padding: '1px 2px', textAlign: 'center', color: '#94a3b8', fontWeight: 400, borderBottom: '1px solid #e2e8f0' }}>Ngày {d}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {dayNums.map(d => {
                                  const isSpecial = summary.specialDays?.includes(d);
                                  if (isSpecial) {
                                    return (
                                      <td key={d} style={{ padding: '1px 2px', textAlign: 'center', color: '#94a3b8', fontSize: 8 }}>NL</td>
                                    );
                                  }
                                  const rest = summary.dailyBreakdown![d];
                                  const deviation = rest - summary.avgRest!;
                                  const isViolating = deviation > 1 || deviation < -1;
                                  return (
                                    <td key={d} style={{
                                      padding: '1px 2px', textAlign: 'center',
                                      fontWeight: isViolating ? 700 : 400,
                                      color: isViolating ? '#dc2626' : '#0f172a',
                                      background: isViolating ? '#fef2f2' : 'transparent',
                                      borderRadius: 2,
                                    }}>{rest}</td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Violations cho OT checks */}
                {(['ot_min_per_day', 'ot_between_rest'] as string[]).includes(check.id) && check.violations.length > 0 && expandedChecks.has(check.id) && (
                  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 2, height: 150, overflowY: 'auto' }}>
                    {check.violations.map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 8px 2px 20px', borderLeft: '2px solid #e2e8f0' }}>
                        <span style={{ fontSize: 11, color: '#64748b', minWidth: 60, fontFamily: 'monospace' }}>{v.code}</span>
                        <span style={{ fontSize: 12, color: '#0f172a', minWidth: 140 }}>{v.name}</span>
                        <span style={{ fontSize: 11, color: '#475569' }}>{v.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
                {check.id === 'ot_balance' && check.violations.length > 0 && expandedChecks.has(check.id) && (
                  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 2, height: 150, overflowY: 'auto' }}>
                    {check.violations.map((v, i) => {
                      const isSummary = v.code === '—' && v.name.startsWith('📊');
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'baseline', gap: 8,
                          padding: isSummary ? '4px 8px' : '2px 8px 2px 20px',
                          background: isSummary ? '#fef9c3' : 'transparent',
                          borderRadius: isSummary ? 6 : 0,
                          borderLeft: isSummary ? '3px solid #eab308' : '2px solid #e2e8f0',
                          marginTop: isSummary ? 4 : 0,
                        }}>
                          {isSummary
                            ? <><span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>{v.name}</span><span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{v.detail}</span></>
                            : <span style={{ fontSize: 11, color: '#475569' }}>{v.detail}</span>
                          }
                        </div>
                      );
                    })}
                  </div>
                )}
                {check.id === 'shift_balance' && check.violations.length > 0 && expandedChecks.has(check.id) && (
                  <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 2, height: 150, overflowY: 'auto' }}>
                    {check.violations.map((v, i) => {
                      const isSummary = v.name.startsWith('📊');
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'baseline', gap: 8,
                          padding: isSummary ? '4px 8px' : '2px 8px 2px 20px',
                          background: isSummary ? '#fef9c3' : 'transparent',
                          borderRadius: isSummary ? 6 : 0,
                          borderLeft: isSummary ? '3px solid #eab308' : '2px solid #e2e8f0',
                          marginTop: isSummary ? 4 : 0,
                        }}>
                          {isSummary
                            ? <><span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>{v.name}</span><span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{v.detail}</span></>
                            : <span style={{ fontSize: 11, color: '#475569' }}>{v.detail}</span>
                          }
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  });


/* === AllocConfigPanel — Cấu hình áp dụng cho Bước 2 === */
const STEP2_PARAM_KEYS: string[] = [];
const STEP2_LABELS: Record<string, string> = {};
function AllocConfigPanel({ monthId }: { monthId: string }) {
  const [rules, setRules] = useState<{ paramKey: string; defaultParam: string; active: boolean }[]>([]);
  useEffect(() => {
    fetch(`/api/alloc-rules?month=${monthId}`).then(r => r.json()).then((d: { value?: unknown[] }) => {
      const list = Array.isArray(d) ? d : (d.value ?? []);
      setRules((list as { paramKey: string; defaultParam: string; active: boolean }[]).filter(r => STEP2_PARAM_KEYS.includes(r.paramKey)));
    }).catch(() => { });
  }, [monthId]);
  if (!rules.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      {STEP2_PARAM_KEYS.map(key => {
        const r = rules.find(x => x.paramKey === key);
        if (!r) return null;
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, background: r.active ? '#f0fdf4' : '#f1f5f9', border: `1px solid ${r.active ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>
            <span style={{ color: r.active ? '#15803d' : '#94a3b8', fontWeight: 600 }}>{STEP2_LABELS[key] ?? key}</span>
            <span style={{ color: '#64748b' }}>:</span>
            <span style={{ color: r.active ? '#0f172a' : '#94a3b8', fontWeight: 500 }}>{r.defaultParam || '—'}</span>
            {!r.active && <span style={{ color: '#94a3b8', fontSize: 11 }}>(tắt)</span>}
          </div>
        );
      })}
    </div>
  );
}

/* === DeptSummaryGrid === */
type DeptDayStat = { day: number; work: number; off: number };
type DeptSummary = { deptId: string; deptName: string; totalWork: number; totalOff: number; days: DeptDayStat[] };

function DeptSummaryGrid({ monthId, monthLabel }: { monthId: string; monthLabel: string }) {
  const [data, setData] = useState<{ daysInMonth: number; depts: DeptSummary[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/distribution/dept-summary?month=${monthId}`)
      .then(r => r.json()).then(setData).catch(() => { }).finally(() => setLoading(false));
  }, [monthId]);

  if (loading) return <div className={styles.emptyState}>Đang tải...</div>;
  if (!data || !data.depts.length) return <div className={styles.emptyState}>Chưa có dữ liệu phân bổ.</div>;

  const { daysInMonth, depts } = data;
  const [mm, yyyy] = monthLabel.split('/');

  return (
    <div className={styles.tableOuter}>
      <ScrollTable className={styles.tableWrap}>
        <table className={styles.gridTable} style={{ fontSize: '0.7rem' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 140, textAlign: 'left' }}>PHÒNG BAN</th>
              <th style={{ minWidth: 36, color: '#64748b' }}>LOẠI</th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dow = new Date(parseInt(yyyy), parseInt(mm) - 1, i + 1).getDay();
                const isSun = dow === 0, isSat = dow === 6;
                return (
                  <th key={i} className={styles.dayNum} style={{ color: isSun ? '#dc2626' : isSat ? '#2563eb' : undefined }}>
                    {i + 1}
                  </th>
                );
              })}
              <th style={{ minWidth: 50, color: '#15803d' }}>TỔNG LÀM</th>
              <th style={{ minWidth: 50, color: '#64748b' }}>TỔNG NGHỈ</th>
            </tr>
          </thead>
          <tbody>
            {depts.map((dept, di) => {
              const maxWork = Math.max(...depts.map(d => Math.max(...d.days.map(x => x.work))));
              return (
                <React.Fragment key={dept.deptId}>
                  {/* Dòng đi làm */}
                  <tr style={{ background: di % 2 === 0 ? '#f0fdf4' : '#f8fafc' }}>
                    <td rowSpan={2} style={{ fontWeight: 600, color: '#0f172a', verticalAlign: 'middle', borderRight: '2px solid #e2e8f0' }}>
                      {dept.deptName}
                    </td>
                    <td style={{ color: '#15803d', fontWeight: 600, whiteSpace: 'nowrap' }}>🟢 Làm</td>
                    {dept.days.map(d => {
                      const pct = maxWork > 0 ? d.work / maxWork : 0;
                      return (
                        <td key={d.day} style={{
                          textAlign: 'center', fontWeight: 700,
                          color: d.work === 0 ? '#d1d5db' : '#15803d',
                          background: d.work === 0 ? '#fff' : `rgba(134,239,172,${0.2 + pct * 0.6})`,
                          borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                        }}>
                          {d.work || '·'}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#15803d' }}>{dept.totalWork}</td>
                    <td rowSpan={2} style={{ verticalAlign: 'middle' }} />
                  </tr>
                  {/* Dòng nghỉ */}
                  <tr style={{ background: di % 2 === 0 ? '#fefce8' : '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <td style={{ color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}>🔴 Nghỉ</td>
                    {dept.days.map(d => (
                      <td key={d.day} style={{
                        textAlign: 'center', fontWeight: 600,
                        color: d.off === 0 ? '#d1d5db' : '#92400e',
                        background: d.off === 0 ? '#fff' : `rgba(253,224,71,${0.2 + (d.off / (dept.days.reduce((s, x) => Math.max(s, x.off), 0) || 1)) * 0.5})`,
                        borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                      }}>
                        {d.off || '·'}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#92400e' }}>{dept.totalOff}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </ScrollTable>
    </div>
  );
}

/* === StepView === */
function StepView({ step, data, onLoad, onRefresh, done, monthId, monthLabel, showCa, locked, validateOpen, onValidateOpen, onValidateStatusChange, validateRef, step1Filter, validateResult, recheckKey }: {
  step: number; data: unknown[] | undefined; onLoad: () => void; onRefresh?: () => void; done: boolean; monthId: string; monthLabel: string; showCa?: boolean; locked?: boolean;
  validateOpen?: boolean; onValidateOpen?: () => void; onValidateStatusChange?: (s: { loading: boolean; result: ValidateResult | null }) => void;
  validateRef?: React.Ref<{ run: () => void }>; step1Filter?: 'pn_before_15' | 'pn_mismatch' | null; validateResult?: ValidateResult | null; recheckKey?: number;
}) {
  const [filterCodes, setFilterCodes] = useState<Set<string> | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode | null>(null);
  const [allRows, setAllRows] = useState<Record<string, unknown>[] | null>(null);
  const [showDeptSummary, setShowDeptSummary] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => { if (!validateOpen) { setFilterCodes(null); setFilterMode(null); setAllRows(null); } }, [validateOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!data) onLoad(); setShowDeptSummary(false); setFilterCodes(null); setFilterMode(null); setAllRows(null); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!allRows) return;
    fetch(`/api/distribution/step/${step}?month=${monthId}&page=1&limit=9999`).then(r => { if (r.ok) r.json().then(j => { setAllRows(j.data ?? []); setDataVersion(v => v + 1); }); }).catch(() => {});
  }, [recheckKey]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleFilterChange = useCallback(async (filter: FilterState) => {
    if (!filter) {
      setFilterCodes(null);
      setFilterMode(null);
      try {
        const r = await fetch(`/api/distribution/step/${step}?month=${monthId}&page=1&limit=9999`);
        if (r.ok) { const json = await r.json(); setAllRows(json.data ?? []); setDataVersion(v => v + 1); }
      } catch { /* ignore */ }
      return;
    }
    if (filter.mode === 'violation') {
      setFilterMode('violation');
      setFilterCodes(filter.codes);
      if (!allRows) {
        try {
          const r = await fetch(`/api/distribution/step/${step}?month=${monthId}&page=1&limit=9999`);
          if (r.ok) { const json = await r.json(); setAllRows(json.data ?? []); setDataVersion(v => v + 1); }
        } catch { /* ignore */ }
      }
    } else {
      // pass mode: compute complement = tất cả NV - NV vi phạm
      setFilterMode('pass');
      let rows = allRows;
      if (!rows) {
        try {
          const r = await fetch(`/api/distribution/step/${step}?month=${monthId}&page=1&limit=9999`);
          if (r.ok) { const json = await r.json(); rows = json.data ?? []; setAllRows(rows); setDataVersion(v => v + 1); }
        } catch { /* ignore */ }
      }
      if (rows) {
        const allCodes = new Set((rows as any[]).map(r => r.code));
        const passCodes = new Set([...allCodes].filter(c => !filter.codes.has(c)));
        setFilterCodes(passCodes);
      }
    }
  }, [allRows, monthId, step]);

  const refreshAllRows = useCallback(async () => {
    if (!allRows) return;
    try {
      const r = await fetch(`/api/distribution/step/${step}?month=${monthId}&page=1&limit=9999`);
      if (r.ok) { const json = await r.json(); setAllRows(json.data ?? []); setDataVersion(v => v + 1); }
    } catch { /* ignore */ }
  }, [allRows, monthId, step]);

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];

  const dataEl = !data
    ? <div className={styles.emptyState}>Đang tải...</div>
    : !Array.isArray(data)
      ? <div className={styles.emptyState}>Lỗi dữ liệu — vui lòng restart server.</div>
      : null;

  if (step === 1) return (
    <>
      <div style={validateOpen ? undefined : { display: 'none' }}>
        <ValidatePanel key={step} ref={validateRef} monthId={monthId} onlyIds={['pn_start_day_import']} title="Kiểm tra dữ liệu import" subtitle="Kiểm tra PN trong file import không được trước ngày quy định" btnId="btn-validate-step1" onStatusChange={onValidateStatusChange} onValidated={onValidateOpen} initialResult={validateResult} version={dataVersion} />
      </div>
      {dataEl ?? <ImportGrid rows={rows} monthLabel={monthLabel} monthId={monthId} step1Filter={step1Filter} onSaved={onRefresh ?? onLoad} locked={locked} />}
    </>
  );
  const stepWrapper = (content: React.ReactNode) => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {content}
    </div>
  );
  const gridWrapper = (grid: React.ReactNode) => (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{grid}</div>
  );
  const validateWrapper = (panel: React.ReactNode) => (
    <div style={{ display: validateOpen ? undefined : 'none' }}>{panel}</div>
  );

  if (step === 2) return stepWrapper(
    <><AllocConfigPanel monthId={monthId} />
      {validateWrapper(<ValidatePanel key={step} ref={validateRef} monthId={monthId} onlyIds={['consecutive_days', 'cross_month_consecutive', 'pn_start_day', 'pn_count', 'lp_balance', 'lp_before_pn']} title="Kiểm tra quy tắc ngày công" subtitle="Kiểm tra 6 quy tắc: Giới hạn ngày làm liên tục, liên tháng, vị trí PN, số ngày PN, LP trước PN, cân bằng ngày nghỉ trong phòng (±1)" btnId="btn-validate-step2" onFixed={onRefresh ?? onLoad} onFilterChange={handleFilterChange} onValidated={onValidateOpen} onStatusChange={onValidateStatusChange} initialResult={validateResult} version={dataVersion} />)}
      {gridWrapper(dataEl ?? <DayTypeGrid rows={allRows ?? rows} monthId={monthId} monthLabel={monthLabel} onSaved={async () => { await refreshAllRows(); (onRefresh ?? onLoad)(); }} locked={locked} filterCodes={filterCodes} filterMode={filterMode} />)}</>
  );
  if (step === 3) return stepWrapper(
    <>{validateWrapper(<ValidatePanel key={step} ref={validateRef} monthId={monthId} onlyIds={['shift_assigned', 'shift_balance']} title="Kiểm tra chia ca" subtitle="Kiểm tra ngày làm đã gán ca và cân bằng ca trong phòng" btnId="btn-validate-step3" onFixed={onRefresh ?? onLoad} onFilterChange={handleFilterChange} onStatusChange={onValidateStatusChange} onValidated={onValidateOpen} initialResult={validateResult} version={dataVersion} />)}
      {gridWrapper(dataEl ?? <ShiftGrid rows={allRows ?? rows} monthLabel={monthLabel} filterCodes={filterCodes} />)}</>
  );
  if (step === 4) return stepWrapper(
    <>{validateWrapper(<ValidatePanel key={step} ref={validateRef} monthId={monthId} title="Kiểm tra Tăng ca/Đi trễ" subtitle="Kiểm tra 3 quy tắc quan trọng: OT tối thiểu/ngày, OT cân bằng trong phòng, OT giữa 2 ngày nghỉ" btnId="btn-validate-step4" onFixed={onRefresh ?? onLoad} onFilterChange={handleFilterChange} onStatusChange={onValidateStatusChange} onValidated={onValidateOpen} initialResult={validateResult} version={dataVersion} />)}
      {gridWrapper(dataEl ?? <OtLateGrid rows={allRows ?? rows} monthLabel={monthLabel} filterCodes={filterCodes} />)}</>
  );
  if (step === 5) return stepWrapper(
    <>{validateWrapper(<ValidatePanel key={step} ref={validateRef} monthId={monthId} onlyIds={['check_time']} title="Kiểm tra giờ vào/ra" subtitle="Kiểm tra ngày làm có giờ vào/ra hợp lệ" btnId="btn-validate-step5" onFilterChange={handleFilterChange} onStatusChange={onValidateStatusChange} onValidated={onValidateOpen} initialResult={validateResult} version={dataVersion} />)}
      {gridWrapper(dataEl ?? <TimeGrid rows={allRows ?? rows} monthLabel={monthLabel} showCa={showCa ?? false} filterCodes={filterCodes} />)}</>
  );
  if (step === 6) return dataEl ?? <FinalGrid rows={allRows ?? rows} monthLabel={monthLabel} />;

  return <div className={styles.emptyState}>Lỗi bước.</div>;
}




