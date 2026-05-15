'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import s from '@/styles/table.module.css';
import styles from './AutoAlloc.module.css';
import { IconSearch, IconClearX } from '@/lib/icons';

/* ── Reusable inline filter row for grids ── */
function InlineFilterRow({ fCode, fName, fDept, setFCode, setFName, setFDept, deptList, extraBefore = 0, extraAfter = 0, daysCols = 31, codeThStyle, nameThStyle, monthLabel, fGroup, setFGroup, groupList, extraMiddle = 0 }: {
  fCode: string; fName: string; fDept: string;
  setFCode: (v: string) => void; setFName: (v: string) => void; setFDept: (v: string) => void;
  deptList: string[]; extraBefore?: number; extraAfter?: number; daysCols?: number;
  codeThStyle?: React.CSSProperties; nameThStyle?: React.CSSProperties; monthLabel?: string;
  fGroup?: string; setFGroup?: (v: string) => void; groupList?: string[]; extraMiddle?: number;
}) {
  return (
    <tr className={styles.filterRow}>
      {Array.from({ length: extraBefore }, (_, i) => <th key={`b${i}`} />)}
      <th style={codeThStyle}><div className={s.colFilter}><span className={s.colFilterIcon}><IconSearch /></span><input className={s.colFilterInput} value={fCode} placeholder="Mã…" onChange={e => setFCode(e.target.value)} />{fCode && <button className={s.colFilterClear} onClick={() => setFCode('')} type="button"><IconClearX /></button>}</div></th>
      <th style={nameThStyle}><div className={s.colFilter}><span className={s.colFilterIcon}><IconSearch /></span><input className={s.colFilterInput} value={fName} placeholder="Tên…" onChange={e => setFName(e.target.value)} />{fName && <button className={s.colFilterClear} onClick={() => setFName('')} type="button"><IconClearX /></button>}</div></th>
      <th><select className={s.statusFilterSelect} value={fDept} onChange={e => setFDept(e.target.value)}><option value="">Tất cả</option>{deptList.map(d => <option key={d} value={d}>{d}</option>)}</select></th>
      {groupList && setFGroup !== undefined && <th><select className={s.statusFilterSelect} value={fGroup ?? ''} onChange={e => setFGroup(e.target.value)}><option value="">Tất cả</option>{groupList.map(g => <option key={g} value={g}>{g}</option>)}</select></th>}
      {Array.from({ length: extraMiddle }, (_, i) => <th key={'m' + i} />)}
      {monthLabel ? (() => { const [mm,yyyy] = monthLabel.split('/'); return Array.from({ length: daysCols }, (_, di) => { const dow = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, di+1).getDay(); const isSun=dow===0,isSat=dow===6; return <th key={'d'+di} style={{ fontSize:'0.6rem', fontWeight:600, textAlign:'center', color: isSun?'#dc2626':isSat?'#2563eb':'#64748b' }}>{DOW_SHORT[dow]}</th>; }); })() : Array.from({ length: daysCols }, (_, i) => <th key={'d'+i} />)}
      {Array.from({ length: extraAfter }, (_, i) => <th key={`a${i}`} />)}
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
  return useMemo(() => rows.filter((r: any) => {
    if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase())) return false;
    if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept && String(r.deptName ?? '') !== fDept) return false;
    if (fGroup && String(r.specialGroup ?? '') !== fGroup) return false;
    return true;
  }), [rows, fCode, fName, fDept, fGroup]);
}

const IconPlay = () => <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z" /></svg>;
const IconCheck = () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>;
const IconDl = () => <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>;

const STEPS = [
  { num: 1, apiNum: 2, key: 'step2Done', label: 'Xem dữ liệu', icon: '📋', editable: false, viewOnly: false },
  { num: 2, apiNum: 1, key: 'step1Done', label: 'Phân bổ ngày công', icon: '📊', editable: false, viewOnly: false },
  { num: 3, apiNum: 4, key: 'step4Done', label: 'Chia ca', icon: '🗓️', editable: false, viewOnly: false },
  { num: 4, apiNum: 5, key: 'step5Done', label: 'OT & Đi trễ', icon: '⏱️', editable: false, viewOnly: false },
  { num: 5, apiNum: 6, key: 'step6Done', label: 'Giờ vào/ra', icon: '🕐', editable: false, viewOnly: false },
  { num: 6, apiNum: 7, key: 'step6Done', label: 'Kết quả', icon: '📈', editable: false, viewOnly: true },
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
  const [activeStep, setActiveStep] = useState(1);
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
    setStepData({}); setStepCache({}); setPageNum({});
  }, [activeMonthId, refreshStatus, refreshLocked]);

  const clearAll = useCallback(async () => {
    if (!confirm('Xóa toàn bộ dữ liệu phân bổ của tháng này? Không thể khôi phục!')) return;
    setClearing(true);
    try {
      await fetch('/api/distribution/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      setStepData({}); setStepCache({}); setPageNum({});
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
    const r = await fetch(`/api/distribution/step/${step.apiNum}?month=${activeMonthId}&page=${page}&limit=${limit}`);
    if (r.ok) {
      const json: StepPage = await r.json();
      setStepCache(prev => ({ ...prev, [displayStep]: { ...(prev[displayStep] ?? {}), [cacheKey]: json } }));
      setStepData(prev => ({ ...prev, [displayStep]: json }));
      setPageNum(prev => ({ ...prev, [displayStep]: page }));
    }
  }, [activeMonthId, stepCache, pageSizes]);

  const handleStepClick = useCallback(async (num: number) => {
    setActiveStep(num);
    if (!stepCache[num]?.[pageNum[num] ?? 1]) await loadStepData(num, pageNum[num] ?? 1);
    else setStepData(prev => ({ ...prev, [num]: stepCache[num][pageNum[num] ?? 1] }));
  }, [loadStepData, stepCache, pageNum]);

  const runStep = useCallback(async (displayStep: number) => {
    const step = STEPS.find(s => s.num === displayStep);
    if (!step || step.viewOnly) return;
    const { apiNum } = step;
    if (apiNum === 2) {
      await fetch(`/api/distribution/step/${apiNum}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      await refreshStatus(); return;
    }
    setRunning(displayStep);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    try {
      await fetch(`/api/distribution/step/${apiNum}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      const elapsedSec = Math.round((Date.now() - t0) / 1000);
      clearInterval(timer); setRunning(null); setElapsed(0);
      await fetch('/api/distribution/invalidate-after', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId, afterDisplayStep: displayStep }) });
      const laterSteps = STEPS.filter(s => s.num > displayStep && !s.viewOnly).map(s => s.num);
      setStepCache(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); return n; });
      setStepData(prev => { const n = { ...prev }; laterSteps.forEach(num => delete n[num]); return n; });
      setCompletionInfo({
        stepNum: displayStep, stepLabel: step.label, stepIcon: step.icon, elapsedSec,
        onConfirm: async () => {
          setCompletionInfo(null);
          await loadStepData(displayStep, 1, undefined, true);
          await refreshStatus();
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
          setStepData({}); setStepCache({}); setPageNum({});
          await refreshStatus();
          await loadStepData(activeStep, 1);
        },
      });
    } catch (e) { clearInterval(timer); setRunning(null); setElapsed(0); throw e; }
  }, [activeMonthId, refreshStatus, loadStepData, activeStep]);

  const isRunning = running !== null;
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
            className={`${styles.btnRunStep} ${running === activeStep ? styles.btnRunning : ''}`}
            onClick={() => runStep(activeStep)} disabled={isRunning || locked}
            id={`btn-run-step-${activeStep}`}
          >
            {running === activeStep ? <><span className={styles.spinnerSm} /> {elapsed}s</>
              : curStep?.apiNum === 2 ? <><IconCheck /> Xác nhận</>
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
            {activeStep === 5 && (
              <button onClick={() => setShowCa(v => !v)} className={styles.btnExport} style={{ minWidth: 110, justifyContent: 'center', background: showCa ? '#1d4ed8' : '#eff6ff', color: showCa ? '#fff' : '#1d4ed8', borderColor: '#93c5fd' }}>
                {showCa ? 'Ẩn Ca' : 'Hiện Ca'}
              </button>
            )}
            <a href={activeMonthId ? `/api/distribution/export?month=${activeMonthId}&step=${activeStep}` : '#'} className={styles.btnExport} download id={`btn-export-step-${activeStep}`} style={{ minWidth: 110, justifyContent: 'center' }}>
              <IconDl /> Tải Excel
            </a>
            {activeStep === 5 && (
              <a href={activeMonthId ? `/api/distribution/export?month=${activeMonthId}&step=5&withShift=1` : '#'} className={styles.btnExport} download id="btn-export-step-5-ca" style={{ minWidth: 110, justifyContent: 'center' }}>
                <IconDl /> Tải Excel có Ca
              </a>
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

/* === ImportGrid (Step 1) === */
function ImportGrid({ rows, monthLabel }: { rows: Record<string, unknown>[]; monthLabel: string }) {
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const [fGroup, setFGroup] = useState('');
  const groupList = useMemo(() => { const gs = new Set<string>(); for (const r of rows as any[]) { if (r.specialGroup) gs.add(r.specialGroup); } return [...gs].sort((a,b) => a.localeCompare(b,'vi')); }, [rows]);
  const filtered = useGridFilter(rows, fCode, fName, fDept, fGroup);
  return (
    <div className={styles.tableOuter}>
      <div className={styles.tableWrap}>
        <table className={styles.gridTable} style={{ fontSize: '0.72rem' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: 90, maxWidth: 90, overflow: 'hidden' }}>MÃ NV</th>
              <th style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }}>TÊN NHÂN VIÊN</th>
              <th style={{ textAlign: 'left', minWidth: 70 }}>PHÒNG BAN</th>
              <th style={{ textAlign: 'left', minWidth: 70, color: '#0369a1' }}>NHÓM ĐẶC THÙ</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <th style={{ minWidth: 40, color: '#15803d' }}>NGÀY CÔNG</th>
              <th style={{ minWidth: 44, color: '#1d4ed8' }}>TĂNG CA (H)</th>
              <th style={{ minWidth: 50, color: '#c2410c' }}>TRỄ (PH)</th>
              <th style={{ minWidth: 36, color: '#6d28d9' }}>PHÉP NĂM</th>
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={4} fGroup={fGroup} setFGroup={setFGroup} groupList={groupList} codeThStyle={{ maxWidth: 90, width: 90 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel} />
          </thead>
          <tbody>
            {filtered.map((r: any, ri: number) => {
              const days: { day: number; symbol: string }[] = r.days ?? [];
              return (
                <tr key={r.code}>
                  <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                  <td className={styles.mono} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                  <td style={{ textAlign: 'left', minWidth: 200, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td style={{ textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                  <td style={{ textAlign: 'left', fontSize: '0.65rem', color: '#0369a1', whiteSpace: 'nowrap' }}>{r.specialGroup || '—'}</td>
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = days.find((x: any) => x.day === i + 1);
                    const sym = d?.symbol ?? '';
                    return (
                      <td key={i} style={{
                        background: SYM_BG[sym] ?? '#fff',
                        color: SYM_CLR[sym] ?? '#9ca3af',
                        fontWeight: (!sym || sym === 'X') ? 700 : 600,
                        textAlign: 'center', padding: '4px 2px', minWidth: 26,
                        borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                      }}>
                        {sym || <span style={{ color: '#d1d5db', fontWeight: 300 }}>·</span>}
                      </td>
                    );
                  })}
                  <td className={styles.statCell} style={{ color: '#15803d' }}><strong>{r.workdays || '—'}</strong></td>
                  <td style={{ textAlign: 'center' }}>{Number(r.overtimeHours) > 0 ? <span className={styles.otTag}>{r.overtimeHours}h</span> : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{Number(r.lateMinutes) > 0 ? <span className={styles.lateTag}>{r.lateMinutes}ph</span> : '—'}</td>
                  <td className={styles.statCell} style={{ color: '#6d28d9' }}>{r.phepNam || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.legend}>
        {Object.entries(SYM_CLR).filter(([k]) => k !== '').map(([sym, clr]) => (
          <span key={sym} className={styles.legendItem}>
            <span style={{
              display: 'inline-block', padding: '1px 6px', borderRadius: 4,
              background: SYM_BG[sym], color: clr, fontWeight: 700,
              fontSize: '0.7rem', marginRight: 3, border: `1px solid ${clr}30`,
            }}>{sym}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* === DayTypePicker (dropdown chọn loại ngày) === */
const SYM_TO_DT: Record<string, number> = { X:0, L:1, LP:1, PN:2, Ô:3, TS:4, DS:5, O:6, NL:7, OF:8, P:9, 'X/2':10, LL:11, LN:12, H:13, B:14 };

function DayTypePicker({ currentDT, x, y, onPick, onClose, leaveTypes }: {
  currentDT: number; x: number; y: number;
  onPick: (dt: number) => void; onClose: () => void;
  leaveTypes: { code: string; name: string; dayType: number }[];
}) {
  const left = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : x);
  const top  = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 160 : y);
  return (
    <>
      <div className={styles.dayPickerOverlay} onClick={onClose} />
      <div className={styles.dayPicker} style={{ left, top }}>
        {(Array.isArray(leaveTypes) ? leaveTypes : []).map(lt => {
          const dt = lt.dayType >= 0 ? lt.dayType : undefined;
          const sym = (dt != null ? (DT_SYMBOL[dt] ?? lt.code) : lt.code);
          const isActive = dt != null && dt === currentDT;
          return (
            <button key={lt.code}
              className={`${styles.dayPickerBtn} ${isActive ? styles.dayPickerBtnActive : ''}`}
              style={{ color: dt != null ? (DT_TEXT[dt] ?? '#666') : '#374151', background: dt != null ? (DT_CELL_BG[dt] ?? '#fff') : '#f9fafb' }}
              onClick={() => { if (dt != null) onPick(dt); }}
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
function DayTypeGrid({ rows, monthId, monthLabel, onSaved, locked }: {
  rows: Record<string, unknown>[];
  monthId: string;
  monthLabel: string;
  onSaved?: () => void;
  locked?: boolean;
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
    fetch(`/api/leave-types?month=${monthId}`).then(r => r.json()).then((data: {code:string; name:string; dayType:number}[]) => {
      setLeaveTypes(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [monthId]);

  const deptList = useDeptList(rows);
  const filtered = useGridFilter(rows, fCode, fName, fDept);

  const handleCellClick = (code: string, day: number, currentDT: number, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPicker({ code, day, currentDT, x: rect.left, y: rect.bottom + 4 });
  };

  const handleDrop = (toCode: string, toDay: number) => {
    if (!dragSrc || dragSrc.code !== toCode || dragSrc.day === toDay) { setDragSrc(null); setDragOver(null); return; }
    const fromDT = getEffectiveDT(dragSrc.code, dragSrc.day, (rows.find((r: any) => r.code === dragSrc.code) as any)?.days?.find((d: any) => d.day === dragSrc.day)?.dayType ?? -1);
    const toDT   = getEffectiveDT(toCode, toDay, (rows.find((r: any) => r.code === toCode) as any)?.days?.find((d: any) => d.day === toDay)?.dayType ?? -1);
    const origFrom = (rows.find((r: any) => r.code === dragSrc.code) as any)?.days?.find((d: any) => d.day === dragSrc.day)?.dayType ?? -1;
    const origTo   = (rows.find((r: any) => r.code === toCode) as any)?.days?.find((d: any) => d.day === toDay)?.dayType ?? -1;
    setEdits(prev => {
      const next = new Map(prev);
      const kFrom: EditKey = `${dragSrc.code}_${dragSrc.day}`;
      const kTo: EditKey   = `${toCode}_${toDay}`;
      toDT === origFrom ? next.delete(kFrom) : next.set(kFrom, toDT);
      fromDT === origTo  ? next.delete(kTo)   : next.set(kTo, fromDT);
      return next;
    });
    setDragSrc(null); setDragOver(null);
  };

  const handlePick = (dt: number) => {
    if (!picker) return;
    const key: EditKey = `${picker.code}_${picker.day}`;
    const origRow = rows.find((r: any) => r.code === picker.code) as any;
    const origDT = origRow?.days?.find((d: any) => d.day === picker.day)?.dayType ?? -1;
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
        const [empCode, dayStr] = key.split('_');
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
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: 90, maxWidth: 90, overflow: 'hidden' }}>MÃ NV</th>
              <th style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }}>TÊN NHÂN VIÊN</th>
              <th style={{ textAlign: 'left', minWidth: 70 }}>PHÒNG BAN</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <th style={{ minWidth: 60, color: '#15803d' }}>NGÀY CÔNG</th>
              <th style={{ minWidth: 36, color: '#475569' }}>LP</th>
              <th style={{ minWidth: 36, color: '#6d28d9' }}>PN</th>
              <th style={{ minWidth: 80, color: '#0369a1' }}>NGHỈ THÁNG TRƯỚC</th>
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={4} codeThStyle={{ maxWidth: 90, width: 90 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel} />
          </thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={styles.empName} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const origDT = d?.dayType ?? -1;
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
                <td className={styles.statCell}>
                  {Array.from({ length: 31 }, (_, i) => getEffectiveDT(r.code, i + 1, days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 1).length}
                </td>
                <td className={styles.statCell} style={{ color: '#6d28d9' }}>
                  {Array.from({ length: 31 }, (_, i) => getEffectiveDT(r.code, i + 1, days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 2).length}
                </td>
                <td className={styles.statCell} style={{ color: '#0369a1' }}>{r.ngayNghiCuoiThangTruoc || <span style={{ color: '#d1d5db' }}>—</span>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className={styles.legend}>
        {(Array.isArray(leaveTypes) ? leaveTypes : []).filter(lt => lt.dayType >= 0).map(lt => {
          const sym = DT_SYMBOL[lt.dayType] ?? lt.code;
          return (
            <span key={lt.code} className={styles.legendItem}>
              <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: DT_CELL_BG[lt.dayType], color: DT_TEXT[lt.dayType], fontWeight: 700, fontSize: '0.72rem', marginRight: 3, border: `1px solid ${DT_TEXT[lt.dayType]}30` }}>{sym}</span>
              {lt.name}
            </span>
          );
        })}
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
function ShiftGrid({ rows, monthLabel }: { rows: Record<string, unknown>[]; monthLabel: string }) {
  const CA1_BG = '#eff6ff', CA1_CLR = '#1d4ed8';
  const CA2_BG = '#fff7ed', CA2_CLR = '#c2410c';
  const CAC_BG = '#f0fdf4', CAC_CLR = '#15803d';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const filtered = useGridFilter(rows, fCode, fName, fDept);
  return (
    <div className={styles.tableOuter}>
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: 90, maxWidth: 90, overflow: 'hidden' }}>MÃ NV</th>
              <th style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }}>TÊN NHÂN VIÊN</th>
              <th style={{ textAlign: 'left', minWidth: 70 }}>PHÒNG BAN</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <th style={{ minWidth: 40, color: CA1_CLR }}>Ca 1</th>
              <th style={{ minWidth: 40, color: CA2_CLR }}>Ca 2</th>
              <th style={{ minWidth: 40, color: CAC_CLR }}>C</th>
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={3} codeThStyle={{ maxWidth: 90, width: 90 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel} />
          </thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number; shiftCode: string }[] = r.days ?? [];
            const ca1Count = days.filter(d => d.shiftCode === 'Ca 1').length;
            const ca2Count = days.filter(d => d.shiftCode === 'Ca 2').length;
            const caCCount = days.filter(d => d.shiftCode === 'C').length;
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={styles.empName} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const sc = d?.shiftCode ?? '';
                  let bg = '#fff', clr = '#9ca3af', label: string = DT_SYMBOL[dt] ?? '';
                  if (dt === 0 && sc === 'Ca 1') { bg = CA1_BG; clr = CA1_CLR; label = 'Ca 1'; }
                  else if (dt === 0 && sc === 'Ca 2') { bg = CA2_BG; clr = CA2_CLR; label = 'Ca 2'; }
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
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA1_BG, color: CA1_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>Ca 1</span> Ca 1</span>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA2_BG, color: CA2_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>Ca 2</span> Ca 2</span>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CAC_BG, color: CAC_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>C</span> Ca chung</span>
      </div>
    </div>
  );
}

/* === OtLateGrid (Step 4) === */
function OtLateGrid({ rows, monthLabel }: { rows: Record<string, unknown>[]; monthLabel: string }) {
  const OT_BG = '#eff6ff', OT_CLR = '#1d4ed8';
  const LATE_BG = '#fff7ed', LATE_CLR = '#c2410c';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const filtered = useGridFilter(rows, fCode, fName, fDept);
  return (
    <div className={styles.tableOuter}>
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: 90, maxWidth: 90, overflow: 'hidden' }}>MÃ NV</th>
              <th style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }}>TÊN NHÂN VIÊN</th>
              <th style={{ textAlign: 'left', minWidth: 70 }}>PHÒNG BAN</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <th style={{ minWidth: 44, color: OT_CLR }}>TĂNG CA (H)</th>
              <th style={{ minWidth: 50, color: LATE_CLR }}>TRỄ(PH)</th>
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={2} codeThStyle={{ maxWidth: 90, width: 90 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel} />
          </thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number; otH: number; lateM: number }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={styles.empName} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const ot = Number(d?.otH) || 0;
                  const late = Number(d?.lateM) || 0;
                  let bg = '#fff', clr = '#9ca3af', label: React.ReactNode = <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>;
                  if (dt === 0 && ot > 0 && late > 0) {
                    bg = '#f5f3ff'; clr = '#6d28d9';
                    label = <><span style={{ color: OT_CLR }}>{ot}h</span><span style={{ color: '#9ca3af', margin: '0 1px' }}>/</span><span style={{ color: LATE_CLR }}>{late}</span></>;
                  } else if (dt === 0 && ot > 0) { bg = OT_BG; clr = OT_CLR; label = <>{ot}h</>; }
                  else if (dt === 0 && late > 0) { bg = LATE_BG; clr = LATE_CLR; label = <>{late}</>; }
                  else if (dt === 0) { bg = DT_CELL_BG[0]; clr = DT_TEXT[0]; label = <span style={{ opacity: 0.4 }}>X</span>; }
                  else if (dt >= 0) { bg = DT_CELL_BG[dt] ?? '#fff'; clr = DT_TEXT[dt] ?? '#9ca3af'; label = <span>{DT_SYMBOL[dt] ?? ''}</span>; }
                  return (
                    <td key={i} style={{ background: bg, color: clr, fontWeight: 700, fontSize: '0.7rem', textAlign: 'center', padding: '3px 2px', minWidth: 28, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>{label}</td>
                  );
                })}
                <td className={styles.statCell} style={{ color: OT_CLR }}>{Number(r.totalOT) > 0 ? <span className={styles.otTag}>{Number(r.totalOT).toFixed(1)}h</span> : '—'}</td>
                <td className={styles.statCell} style={{ color: LATE_CLR }}>{Number(r.totalLate) > 0 ? <span className={styles.lateTag}>{r.totalLate}ph</span> : '—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/* === TimeGrid (Step 5) === */
function TimeGrid({ rows, monthLabel, showCa }: { rows: Record<string, unknown>[]; monthLabel: string; showCa: boolean }) {
  const IN_BG = '#f0fdf4', IN_CLR = '#15803d';
  const OUT_BG = '#eff6ff', OUT_CLR = '#1d4ed8';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const filtered = useGridFilter(rows, fCode, fName, fDept);
  return (
    <div className={styles.tableOuter}>
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: 90, maxWidth: 90, overflow: 'hidden' }}>MÃ NV</th>
              <th style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }}>TÊN NHÂN VIÊN</th>
              <th style={{ textAlign: 'left', minWidth: 70 }}>PHÒNG BAN</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={0} codeThStyle={{ maxWidth: 90, width: 90 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel} />
          </thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number; checkIn: string; checkOut: string; shiftCode: string }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
                <td className={styles.empName} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const ci = d?.checkIn ?? '';
                  const co = d?.checkOut ?? '';
                  let bg = '#fff', clr = '#9ca3af', label: React.ReactNode = <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>;
                  if (dt === 0 && ci && ci !== '00:00') {
                    bg = IN_BG;
                    label = <><span style={{ color: IN_CLR, display: 'block', lineHeight: 1.2 }}>{ci}</span><span style={{ color: OUT_CLR, display: 'block', lineHeight: 1.2 }}>{co}</span>{showCa && d?.shiftCode && <span style={{ color: '#ea580c', display: 'block', lineHeight: 1.2, fontSize: '0.6rem' }}>{d.shiftCode}</span>}</>;
                  } else if (dt >= 0) { bg = DT_CELL_BG[dt] ?? '#fff'; clr = DT_TEXT[dt] ?? '#9ca3af'; label = <span>{DT_SYMBOL[dt] ?? ''}</span>; }
                  return (
                    <td key={i} title={d?.shiftCode || ''} style={{ background: bg, color: clr, fontWeight: 600, fontSize: '0.65rem', textAlign: 'center', padding: '2px 1px', minWidth: 38, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', lineHeight: 1.3 }}>{label}</td>
                  );
                })}
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/* === FinalGrid (Step 6) === */
function FinalGrid({ rows, monthLabel }: { rows: Record<string, unknown>[]; monthLabel: string }) {
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const deptList = useDeptList(rows);
  const [fGroup, setFGroup] = useState('');
  const groupList = useMemo(() => { const gs = new Set<string>(); for (const r of rows as any[]) { if (r.specialGroup) gs.add(r.specialGroup); } return [...gs].sort((a,b) => a.localeCompare(b,'vi')); }, [rows]);
  const filtered = useGridFilter(rows, fCode, fName, fDept, fGroup);
  return (
    <div className={styles.tableOuter}>
      <div className={styles.tableWrap}>
        <table className={styles.gridTable} style={{ fontSize: '0.68rem' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: 90, maxWidth: 90, overflow: 'hidden' }}>MÃ NV</th>
              <th style={{ textAlign: 'left', minWidth: 200, maxWidth: 200 }}>TÊN NHÂN VIÊN</th>
              <th style={{ textAlign: 'left', minWidth: 70 }}>PHÒNG BAN</th>
               <th style={{ textAlign: 'left', minWidth: 70, color: '#0369a1' }}>NHÓM ĐẶC THÙ</th>
               <th style={{ minWidth: 70, color: '#92400e' }}>NGHỈ THÁNG TRƯỚC</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum} style={{ minWidth: 64 }}>{i + 1}</th>)}
              <th style={{ minWidth: 44, color: '#15803d' }}>NGÀY CÔNG</th>
              <th style={{ minWidth: 36, color: '#1d4ed8' }}>LP</th>
              <th style={{ minWidth: 36, color: '#7c3aed' }}>PN</th>
              <th style={{ minWidth: 50, color: '#1d4ed8' }}>TĂNG CA (H)</th>
              <th style={{ minWidth: 44, color: '#c2410c' }}>TRỄ(PH)</th>
            </tr>
            <InlineFilterRow fCode={fCode} fName={fName} fDept={fDept} setFCode={setFCode} setFName={setFName} setFDept={setFDept} deptList={deptList} extraBefore={1} extraAfter={5} extraMiddle={1} fGroup={fGroup} setFGroup={setFGroup} groupList={groupList} codeThStyle={{ maxWidth: 90, width: 90 }} nameThStyle={{ maxWidth: 200, width: 200 }} monthLabel={monthLabel} />
          </thead>
          <tbody>{filtered.map((r: any, ri) => (
            <tr key={r.code} style={{ background: ri % 2 === 0 ? '#fff' : 'var(--gray-50)' }}>
              <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
              <td className={styles.mono} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</td>
              <td style={{ textAlign: 'left', minWidth: 200, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
              <td style={{ textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
               <td style={{ textAlign: 'left', fontSize: '0.65rem', color: '#0369a1', whiteSpace: 'nowrap' }}>{r.specialGroup || '—'}</td>
               <td style={{ textAlign: 'left', fontSize: '0.7rem', color: '#92400e', whiteSpace: 'nowrap' }}>{r.ngayNghiCuoiThangTruoc || '—'}</td>
               {Array.from({ length: 31 }, (_, i) => {
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
              <td style={{ textAlign: 'center' }}>{Number(r.totalOT) > 0 ? <span className={styles.otTag}>{Number(r.totalOT).toFixed(1)}</span> : 0}</td>
              <td style={{ textAlign: 'center' }}>{Number(r.totalLate) > 0 ? <span className={styles.lateTag}>{r.totalLate}</span> : 0}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* === ValidatePanel === */
type CheckStatus = 'ok' | 'warning' | 'error';
interface ViolationItem { code: string; name: string; deptName: string; day: number; detail: string; }
interface CheckResult { id: string; label: string; description: string; status: CheckStatus; violations: ViolationItem[]; violationCount: number; checkedCount: number; }
interface ValidateResult { monthId: string; totalEmps: number; totalViolations: number; overallStatus: CheckStatus; checkedAt: string; results: CheckResult[]; }

function ValidatePanel({ monthId, onlyIds, title, subtitle, btnId, onFixed, autoRun }: { monthId: string; onlyIds?: string[]; title?: string; subtitle?: string; btnId?: string; onFixed?: () => void; autoRun?: boolean; }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixingLp, setFixingLp] = useState(false);
  const [fixingConsec, setFixingConsec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => { if (autoRun) run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fixPn = async () => {
    setFixing(true); setError(null);
    try {
      const r = await fetch('/api/distribution/fix-pn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId }) });
      if (!r.ok) throw new Error(await r.text());
      setResult(null);
      onFixed?.();
    } catch (e) { setError(String(e)); } finally { setFixing(false); }
  };

  const fixConsec = async () => {
    setFixingConsec(true); setError(null);
    try {
      const r = await fetch('/api/distribution/fix-consecutive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId }) });
      if (!r.ok) throw new Error(await r.text());
      setResult(null);
      onFixed?.();
    } catch (e) { setError(String(e)); } finally { setFixingConsec(false); }
  };

  const fixLp = async () => {
    setFixingLp(true); setError(null);
    try {
      const r = await fetch('/api/distribution/fix-lp-balance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId }) });
      if (!r.ok) throw new Error(await r.text());
      setResult(null);
      onFixed?.();
    } catch (e) { setError(String(e)); } finally { setFixingLp(false); }
  };

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/distribution/validate?month=${monthId}`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      if (onlyIds?.length) {
        data.results = (data.results as CheckResult[]).filter(c => onlyIds.includes(c.id));
        data.totalViolations = data.results.reduce((s: number, c: CheckResult) => s + c.violationCount, 0);
        data.overallStatus = data.results.some((c: CheckResult) => c.status === 'error') ? 'error' : data.results.some((c: CheckResult) => c.status === 'warning') ? 'warning' : 'ok';
      }
      setResult(data);
      setOpenIds(new Set((data.results as CheckResult[]).filter(c => c.violationCount > 0).map(c => c.id)));
    } catch (e) { setError(String(e)); } finally { setLoading(false); }
  };

  const statusClass: Record<CheckStatus, string> = { ok: styles.checkCardOk, warning: styles.checkCardWarn, error: styles.checkCardError };
  const dotClass: Record<CheckStatus, string> = { ok: styles.dotOk, warning: styles.dotWarn, error: styles.dotError };
  const countClass: Record<CheckStatus, string> = { ok: styles.countOk, warning: styles.countWarn, error: styles.countError };
  const summaryClass: Record<CheckStatus, string> = { ok: styles.summaryOk, warning: styles.summaryWarn, error: styles.summaryError };
  const summaryLabel: Record<CheckStatus, string> = { ok: '✅ Tất cả điều kiện đạt', warning: '⚠️ Có cảnh báo cần xem xét', error: '❌ Có điều kiện chưa thỏa mãn' };

  return (
    <div className={styles.validateWrap} style={{ borderTop: '2px solid #e2e8f0', marginTop: 4 }}>
      <div className={styles.validateHeader}>
        <div>
          <div className={styles.validateTitle}>{title ?? '🔍 Kiểm tra điều kiện phân bổ'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{subtitle ?? 'Xác minh các quy tắc nghiệp vụ'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {result && (
            <div className={styles.validateSummary}>
              <span className={`${styles.validateSummaryBadge} ${summaryClass[result.overallStatus]}`}>{summaryLabel[result.overallStatus]}</span>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>{result.totalEmps} NV · {result.totalViolations} vi phạm</span>
            </div>
          )}
          <button className={styles.btnValidate} onClick={run} disabled={loading} id={btnId}>{loading ? 'Đang kiểm tra...' : '🔍 Kiểm tra'}</button>
        </div>
      </div>
      {error && <div style={{ background: '#fef2f2', padding: 10, color: '#b91c1c' }}>⚠️ Lỗi: {error}</div>}
      {result && (
        <div className={styles.validateGrid}>
          {result.results.map(check => (
            <div key={check.id} className={`${styles.checkCard} ${statusClass[check.status]}`}>
              <div className={styles.checkCardHeader} onClick={() => setOpenIds(prev => { const n = new Set(prev); if (n.has(check.id)) n.delete(check.id); else n.add(check.id); return n; })}>
                <span className={`${styles.checkStatusDot} ${dotClass[check.status]}`} />
                <span className={styles.checkLabel}>{check.label}</span>
                <span className={`${styles.checkCount} ${countClass[check.status]}`}>{check.violationCount === 0 ? `✓ ${check.checkedCount} đạt` : `${check.violationCount} vi phạm`}</span>
                {check.id === 'consecutive_days' && check.violationCount > 0 && (
                  <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixConsec(); }} disabled={fixingConsec || loading} type="button">{fixingConsec ? '...' : '🔧 Sửa liên tiếp'}</button>
                )}
                {check.id === 'pn_start_day' && check.violationCount > 0 && (
                  <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixPn(); }} disabled={fixing || loading} type="button">{fixing ? '...' : '🔧 Sửa PN'}</button>
                )}
                {check.id === 'lp_balance' && check.violationCount > 0 && (
                  <button className={styles.btnFixInline} onClick={e => { e.stopPropagation(); fixLp(); }} disabled={fixingLp || loading} type="button">{fixingLp ? '...' : '⚖️ Cân bằng LP'}</button>
                )}
              </div>
              {openIds.has(check.id) && check.violationCount > 0 && (
                <div className={styles.violationList}>
                  {check.violations.slice(0, 8).map((v, i) => (
                    <div key={i} className={styles.violationRow}>
                      <span className={styles.violationCode}>{v.code}</span>
                      <span className={styles.violationName}>{v.name}</span>
                      <span className={styles.violationDetail}>{v.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* === StepView === */
function StepView({ step, data, onLoad, onRefresh, done, monthId, monthLabel, showCa, locked }: {
  step: number; data: unknown[] | undefined; onLoad: () => void; onRefresh?: () => void; done: boolean; monthId: string; monthLabel: string; showCa?: boolean; locked?: boolean;
}) {
  useEffect(() => { if (!data) onLoad(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <div className={styles.emptyState}>Đang tải...</div>;
  if (!Array.isArray(data)) return <div className={styles.emptyState}>Lỗi dữ liệu — vui lòng restart server.</div>;
  const rows = data as Record<string, unknown>[];

  if (step === 1) return <ImportGrid rows={rows} monthLabel={monthLabel} />;
  if (step === 2) return (
    <>
      <DayTypeGrid rows={rows} monthId={monthId} monthLabel={monthLabel} onSaved={onRefresh ?? onLoad} locked={locked} />
      <ValidatePanel monthId={monthId} onlyIds={['consecutive_days', 'pn_start_day', 'pn_end_of_rest', 'lp_balance']} title="Kiểm tra quy tắc ngày công" subtitle="Kiểm tra 4 quy tắc: ngày làm liên tiếp, vị trí PN, cân bằng LP giữa NV cùng phòng" btnId="btn-validate-step2" onFixed={onRefresh ?? onLoad} />
    </>
  );
  if (step === 3) return (
    <>
    <ShiftGrid rows={rows} monthLabel={monthLabel} />
      <ValidatePanel monthId={monthId} onlyIds={['shift_assigned']} title="Kiểm tra chia ca" subtitle="Kiểm tra tất cả ngày làm đã được gán ca" btnId="btn-validate-step3" />
    </>
  );
  if (step === 4) return (
    <>
    <OtLateGrid rows={rows} monthLabel={monthLabel} />
      <ValidatePanel monthId={monthId} onlyIds={['ot_max_per_day', 'ot_start_day', 'late_max_per_day', 'late_start_day']} title="Kiểm tra OT & Đi trễ" subtitle="Kiểm tra giới hạn OT/ngày, ngày bắt đầu OT, giới hạn trễ/ngày, ngày bắt đầu trễ" btnId="btn-validate-step4" />
    </>
  );
  if (step === 5) return (
    <>
    <TimeGrid rows={rows} monthLabel={monthLabel} showCa={showCa ?? false} />
      <ValidatePanel monthId={monthId} onlyIds={['check_time']} title="Kiểm tra giờ vào/ra" subtitle="Kiểm tra ngày làm có giờ vào/ra hợp lệ" btnId="btn-validate-step5" />
    </>
  );
  if (step === 6) return (
    <>
    <FinalGrid rows={rows} monthLabel={monthLabel} />
      <ValidatePanel monthId={monthId} autoRun title="🔍 Tổng hợp kiểm tra tất cả quy tắc" subtitle="Kiểm tra toàn bộ: ngày công, chia ca, OT/trễ, giờ vào/ra, cân bằng LP" btnId="btn-validate-step6" onFixed={onRefresh ?? onLoad} />
    </>
  );

  return <div className={styles.emptyState}>Lỗi bước.</div>;
}


