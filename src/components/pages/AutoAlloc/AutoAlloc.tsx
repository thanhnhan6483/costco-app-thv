'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import s from '@/styles/table.module.css';
import styles from './AutoAlloc.module.css';

/* ── Shared grid search bar ── */
function GridSearchBar({
  code, name, dept,
  onCode, onName, onDept,
  total, shown,
}: {
  code: string; name: string; dept: string;
  onCode: (v: string) => void;
  onName: (v: string) => void;
  onDept: (v: string) => void;
  total: number; shown: number;
}) {
  const hasAny = code || name || dept;
  const SearchInput = ({ value, onChange, placeholder, width = 120 }: { value: string; onChange: (v: string) => void; placeholder: string; width?: number }) => (
    <div className={styles.gridSearchWrap}>
      <input
        className={styles.gridSearchInput}
        style={{ width }}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className={styles.gridSearchClear} onClick={() => onChange('')} type="button">✕</button>
      )}
    </div>
  );
  return (
    <div className={styles.gridSearchBar}>
      <span className={styles.gridSearchLabel}>🔍</span>
      <SearchInput value={code} onChange={onCode} placeholder="Mã NV…" width={90} />
      <SearchInput value={name} onChange={onName} placeholder="Tên…" width={140} />
      <SearchInput value={dept} onChange={onDept} placeholder="Phòng ban…" width={120} />
      {hasAny && (
        <button className={styles.gridSearchClearAll}
          onClick={() => { onCode(''); onName(''); onDept(''); }}
          type="button"
        >✕ Xóa lọc</button>
      )}
      {hasAny && (
        <span className={styles.gridSearchCount}>{shown}/{total} NV</span>
      )}
    </div>
  );
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
  0: 'X', 1: 'LP', 2: 'PN', 3: 'Ô', 4: 'TS', 5: 'DS', 6: 'O', 7: 'NL', 8: 'OF', 9: 'P',
};

type StepStatus = Record<string, boolean>;
interface StepPage { data: unknown[]; page: number; limit: number; total: number; totalPages: number; }
type StepData = Record<number, StepPage>;
type StepCache = Record<number, Record<string, StepPage>>;

export default function AutoAlloc() {
  const { activeMonthId, activeMonthLabel } = useApp();
  const [activeStep, setActiveStep] = useState(1);
  const [status, setStatus] = useState<StepStatus>({});
  const [stepData, setStepData] = useState<StepData>({});
  const [stepCache, setStepCache] = useState<StepCache>({});
  const [pageNum, setPageNum] = useState<Record<number, number>>({});
  const [running, setRunning] = useState<number | 'all' | null>(null);
  const [clearing, setClearing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pageSizes, setPageSizes] = useState<Record<number, number>>({}); // size riêng cho từng bước
  const [completionInfo, setCompletionInfo] = useState<{
    stepNum: number | 'all'; stepLabel: string; stepIcon: string; elapsedSec: number;
    onConfirm: () => void;
  } | null>(null);

  const refreshStatus = useCallback(async () => {
    const r = await fetch(`/api/distribution/status?month=${activeMonthId}`);
    if (r.ok) setStatus(await r.json());
  }, [activeMonthId]);

  useEffect(() => {
    refreshStatus();
    setStepData({}); setStepCache({}); setPageNum({});
  }, [activeMonthId, refreshStatus]);

  const clearAll = useCallback(async () => {
    if (!confirm('Xóa toàn bộ dữ liệu phân bổ của tháng này? Không thể khôi phục!')) return;
    setClearing(true);
    try {
      await fetch('/api/distribution/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthId: activeMonthId }) });
      setStepData({}); setStepCache({}); setPageNum({});
      await refreshStatus();
    } finally { setClearing(false); }
  }, [activeMonthId, refreshStatus]);

  const loadStepData = useCallback(async (displayStep: number, page = 1, size?: number) => {
    const limit = size ?? pageSizes[displayStep] ?? 100;
    const cacheKey = `${page}_${limit}`;
    if (stepCache[displayStep]?.[cacheKey]) {
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
          setStepCache(prev => { const n = { ...prev }; delete n[displayStep]; return n; });
          setStepData(prev => { const n = { ...prev }; delete n[displayStep]; return n; });
          await loadStepData(displayStep, 1);
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
          <button
            className={`${styles.btnRunStep} ${running === activeStep ? styles.btnRunning : ''}`}
            onClick={() => runStep(activeStep)} disabled={isRunning || curStep?.viewOnly}
            id={`btn-run-step-${activeStep}`}
          >
            {running === activeStep ? <><span className={styles.spinnerSm} /> {elapsed}s</>
              : curStep?.viewOnly ? null
                : curStep?.apiNum === 2 ? <><IconCheck /> Xác nhận</>
                  : <><IconPlay /> {'Chạy bước'} {activeStep}</>}
          </button>
          <div className={styles.dividerV} />
          <button className={styles.btnRunAll} onClick={runAll} disabled={isRunning || clearing} id="btn-run-all">
            {running === 'all' ? <><span className={styles.spinner} /> {elapsed}s</> : <><IconPlay /> {'Chạy Toàn Bộ'}</>}
          </button>
          <div className={styles.dividerV} />
          <button className={styles.btnClear} onClick={clearAll} disabled={isRunning || clearing} id="btn-clear-all">
            {clearing ? <><span className={styles.spinnerSm} /> Đang xóa...</> : <>🗑️ Xóa dữ liệu</>}
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>{curStep?.icon} Bước {activeStep}: {curStep?.label}</span>
          {status.step6Done && (
            <a href={`/api/distribution/export?month=${activeMonthId}`} className={styles.btnExport} id="btn-export" style={{ padding: '4px 10px', fontSize: '0.74rem', gap: 5 }}>
              <IconDl /> Tải Excel kết quả
            </a>
          )}
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
              setStepData(prev => { const n = { ...prev }; delete n[activeStep]; return n; });
              loadStepData(activeStep, 1);
            }}
            done={Boolean(curStep && status[curStep.key])}
            monthId={activeMonthId}
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
const DT_TEXT: Record<number, string> = { 0: '#15803d', 1: '#475569', 2: '#6d28d9', 3: '#b91c1c', 4: '#be185d', 5: '#0f766e', 6: '#c2410c', 7: '#1d4ed8', 8: '#4b5563', 9: '#0e7490' };
const DT_CELL_BG: Record<number, string> = { 0: '#f0fdf4', 1: '#f1f5f9', 2: '#f5f3ff', 3: '#fef2f2', 4: '#fdf2f8', 5: '#f0fdfa', 6: '#fff7ed', 7: '#eff6ff', 8: '#f8fafc', 9: '#ecfeff' };

/* === ImportGrid (Step 1) === */
function ImportGrid({ rows }: { rows: Record<string, unknown>[] }) {
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const filtered = useMemo(() => rows.filter((r: any) => {
    if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase())) return false;
    if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept && !String(r.deptName ?? '').toLowerCase().includes(fDept.toLowerCase())) return false;
    return true;
  }), [rows, fCode, fName, fDept]);
  return (
    <div className={styles.tableOuter}>
      <GridSearchBar code={fCode} name={fName} dept={fDept}
        onCode={setFCode} onName={setFName} onDept={setFDept}
        total={rows.length} shown={filtered.length} />
      <div className={styles.tableWrap}>
        <table className={styles.gridTable} style={{ fontSize: '0.72rem' }}>
          <thead><tr>
            <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
            <th style={{ minWidth: 72 }}>Mã NV</th>
            <th style={{ textAlign: 'left', minWidth: 140 }}>Tên</th>
            <th style={{ textAlign: 'left', minWidth: 80 }}>Phòng ban</th>
            <th style={{ minWidth: 52 }}>Nghỉ CTT</th>
            {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
            <th style={{ minWidth: 40, color: '#15803d' }}>Công</th>
            <th style={{ minWidth: 44, color: '#1d4ed8' }}>OT(h)</th>
            <th style={{ minWidth: 50, color: '#c2410c' }}>Trễ(ph)</th>
            <th style={{ minWidth: 36, color: '#6d28d9' }}>PN</th>
          </tr></thead>
          <tbody>
            {filtered.map((r: any, ri: number) => {
              const days: { day: number; symbol: string }[] = r.days ?? [];
              return (
                <tr key={r.code}>
                  <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                  <td className={styles.mono}>{r.code}</td>
                  <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td style={{ textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                  <td className={styles.mono} style={{ fontSize: '0.68rem', color: 'var(--gray-500)' }}>
                    {r.ngayNghiCuoiThangTruoc || '—'}
                  </td>
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
function DayTypePicker({ currentDT, x, y, onPick, onClose }: {
  currentDT: number; x: number; y: number;
  onPick: (dt: number) => void; onClose: () => void;
}) {
  // Điều chỉnh vị trí nếu gần mép phải/dưới
  const left = Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : x);
  const top  = Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 160 : y);
  return (
    <>
      <div className={styles.dayPickerOverlay} onClick={onClose} />
      <div className={styles.dayPicker} style={{ left, top }}>
        {Object.entries(DT_SYMBOL).map(([k, sym]) => {
          if (!sym) return null;
          const code = Number(k);
          return (
            <button key={k}
              className={`${styles.dayPickerBtn} ${code === currentDT ? styles.dayPickerBtnActive : ''}`}
              style={{ color: DT_TEXT[code] ?? '#666', background: DT_CELL_BG[code] ?? '#fff' }}
              onClick={() => onPick(code)}
              type="button"
            >
              <span>{sym}</span>
              <span className={styles.dayPickerLabel}>{DAY_TYPE_LABEL[code]?.replace(/\s*\(.*\)/, '') ?? ''}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* === DayTypeGrid (Step 2) – Editable === */
type EditKey = `${string}_${number}`; // "empCode_day"
function DayTypeGrid({ rows, monthId, onSaved }: {
  rows: Record<string, unknown>[];
  monthId: string;
  onSaved?: () => void;
}) {
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const [edits, setEdits] = useState<Map<EditKey, number>>(new Map());
  const [picker, setPicker] = useState<{ code: string; day: number; currentDT: number; x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Danh sách PB unique (cho dropdown)
  const deptList = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows as any[]) { if (r.deptName) set.add(r.deptName); }
    return [...set].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r: any) => {
    if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase())) return false;
    if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept && String(r.deptName ?? '') !== fDept) return false;
    return true;
  }), [rows, fCode, fName, fDept]);

  const handleCellClick = (code: string, day: number, currentDT: number, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPicker({ code, day, currentDT, x: rect.left, y: rect.bottom + 4 });
  };

  const handlePick = (dt: number) => {
    if (!picker) return;
    const key: EditKey = `${picker.code}_${picker.day}`;
    // Tìm dayType gốc từ rows
    const origRow = rows.find((r: any) => r.code === picker.code) as any;
    const origDT = origRow?.days?.find((d: any) => d.day === picker.day)?.dayType ?? -1;
    setEdits(prev => {
      const next = new Map(prev);
      if (dt === origDT) next.delete(key); // hoàn tác về gốc → xóa edit
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

  // Lấy dayType hiệu dụng (edit overrides original)
  const getEffectiveDT = (code: string, day: number, originalDT: number): number => {
    const key: EditKey = `${code}_${day}`;
    return edits.has(key) ? edits.get(key)! : originalDT;
  };

  const hasFilter = fCode || fName || fDept;

  return (
    <div className={styles.tableOuter}>
      {hasFilter && (
        <div className={styles.gridSearchBar}>
          <span className={styles.gridSearchCount}>{filtered.length}/{rows.length} NV</span>
          <button className={styles.gridSearchClearAll}
            onClick={() => { setFCode(''); setFName(''); setFDept(''); }}
            type="button"
          >✕ Xóa lọc</button>
        </div>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead>
            <tr>
              <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
              <th style={{ minWidth: 72 }}>Mã NV</th>
              <th style={{ textAlign: 'left', minWidth: 140 }}>Tên</th>
              <th style={{ textAlign: 'left', minWidth: 100 }}>Phòng ban</th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
              <th style={{ minWidth: 36, color: '#15803d' }}>Làm</th>
              <th style={{ minWidth: 36, color: '#475569' }}>Nghỉ</th>
              <th style={{ minWidth: 36, color: '#6d28d9' }}>PN</th>
            </tr>
            <tr className={styles.filterRow}>
              <th />
              <th>
                <div className={styles.colFilter}>
                  <span className={styles.colFilterIcon}>🔍</span>
                  <input className={styles.colFilterInput} value={fCode} placeholder="Mã…" onChange={e => setFCode(e.target.value)} />
                  {fCode && <button className={styles.colFilterClear} onClick={() => setFCode('')} type="button">✕</button>}
                </div>
              </th>
              <th>
                <div className={styles.colFilter}>
                  <span className={styles.colFilterIcon}>🔍</span>
                  <input className={styles.colFilterInput} value={fName} placeholder="Tên…" onChange={e => setFName(e.target.value)} />
                  {fName && <button className={styles.colFilterClear} onClick={() => setFName('')} type="button">✕</button>}
                </div>
              </th>
              <th>
                <select className={styles.deptFilterSelect} value={fDept} onChange={e => setFDept(e.target.value)}>
                  <option value="">Tất cả</option>
                  {deptList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </th>
              {Array.from({ length: 31 }, (_, i) => <th key={i} />)}
              <th /><th /><th />
            </tr>
          </thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono}>{r.code}</td>
                <td className={styles.empName}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const origDT = d?.dayType ?? -1;
                  const dt = getEffectiveDT(r.code, i + 1, origDT);
                  const sym = DT_SYMBOL[dt] ?? '';
                  const bg = dt >= 0 ? (DT_CELL_BG[dt] ?? '#fff') : '#fff';
                  const clr = DT_TEXT[dt] ?? '#9ca3af';
                  const isChanged = edits.has(`${r.code}_${i + 1}` as EditKey);
                  return (
                    <td key={i}
                      className={`${styles.editableCell} ${isChanged ? styles.editableCellChanged : ''}`}
                      style={{
                        background: bg, color: clr, fontWeight: dt === 0 ? 700 : 600,
                        fontSize: '0.72rem', textAlign: 'center', padding: '4px 2px', minWidth: 28,
                        borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
                      }}
                      onClick={(e) => handleCellClick(r.code, i + 1, dt, e)}
                    >
                      {sym || <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>}
                    </td>
                  );
                })}
                <td className={styles.statCell}>
                  {Array.from({ length: 31 }, (_, i) => getEffectiveDT(r.code, i + 1, days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 0).length}
                </td>
                <td className={styles.statCell}>
                  {Array.from({ length: 31 }, (_, i) => getEffectiveDT(r.code, i + 1, days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 1).length}
                </td>
                <td className={styles.statCell} style={{ color: '#6d28d9' }}>
                  {Array.from({ length: 31 }, (_, i) => getEffectiveDT(r.code, i + 1, days.find(x => x.day === i + 1)?.dayType ?? -1)).filter(d => d === 2).length}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className={styles.legend}>
        {Object.entries(DT_SYMBOL).map(([k, v]) => v ? (
          <span key={k} className={styles.legendItem}>
            <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: DT_CELL_BG[Number(k)], color: DT_TEXT[Number(k)], fontWeight: 700, fontSize: '0.72rem', marginRight: 3, border: `1px solid ${DT_TEXT[Number(k)]}30` }}>{v}</span>
            {DAY_TYPE_LABEL[Number(k)]}
          </span>
        ) : null)}
      </div>
      {/* Picker dropdown */}
      {picker && (
        <DayTypePicker
          currentDT={picker.currentDT}
          x={picker.x} y={picker.y}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      )}
      {/* Floating action bar */}
      {edits.size > 0 && (
        <div className={styles.editBar}>
          <span className={styles.editBarInfo}>
            ✏️ <span className={styles.editBarCount}>{edits.size}</span> thay đổi
          </span>
          <button className={`${styles.editBarBtn} ${styles.editBarBtnUndo}`} onClick={handleUndo} type="button">
            ↩ Hoàn tác
          </button>
          <button className={`${styles.editBarBtn} ${styles.editBarBtnSave}`} onClick={handleSave} disabled={saving} type="button">
            {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
          </button>
        </div>
      )}
    </div>
  );
}

/* === ShiftGrid (Step 3) === */
function ShiftGrid({ rows }: { rows: Record<string, unknown>[] }) {
  const CA1_BG = '#eff6ff', CA1_CLR = '#1d4ed8';
  const CA2_BG = '#fff7ed', CA2_CLR = '#c2410c';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const filtered = useMemo(() => rows.filter((r: any) => {
    if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase())) return false;
    if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept && !String(r.deptName ?? '').toLowerCase().includes(fDept.toLowerCase())) return false;
    return true;
  }), [rows, fCode, fName, fDept]);
  return (
    <div className={styles.tableOuter}>
      <GridSearchBar code={fCode} name={fName} dept={fDept}
        onCode={setFCode} onName={setFName} onDept={setFDept}
        total={rows.length} shown={filtered.length} />
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead><tr>
            <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
            <th style={{ minWidth: 72 }}>Mã NV</th>
            <th style={{ textAlign: 'left', minWidth: 140 }}>Tên</th>
            <th style={{ textAlign: 'left', minWidth: 100 }}>Phòng ban</th>
            {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
            <th style={{ minWidth: 40, color: CA1_CLR }}>Ca 1</th>
            <th style={{ minWidth: 40, color: CA2_CLR }}>Ca 2</th>
          </tr></thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number; shiftCode: string }[] = r.days ?? [];
            const ca1Count = days.filter(d => d.shiftCode === 'Ca 1').length;
            const ca2Count = days.filter(d => d.shiftCode === 'Ca 2').length;
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono}>{r.code}</td>
                <td className={styles.empName}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const sc = d?.shiftCode ?? '';
                  let bg = '#fff', clr = '#9ca3af', label: string = DT_SYMBOL[dt] ?? '';
                  if (dt === 0 && sc === 'Ca 1') { bg = CA1_BG; clr = CA1_CLR; label = 'Ca 1'; }
                  else if (dt === 0 && sc === 'Ca 2') { bg = CA2_BG; clr = CA2_CLR; label = 'Ca 2'; }
                  else if (dt >= 0) { bg = DT_CELL_BG[dt] ?? '#fff'; clr = DT_TEXT[dt] ?? '#9ca3af'; }
                  return (
                    <td key={i} style={{ background: bg, color: clr, fontWeight: dt === 0 ? 700 : 600, fontSize: '0.72rem', textAlign: 'center', padding: '4px 2px', minWidth: 28, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                      {label || <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>}
                    </td>
                  );
                })}
                <td className={styles.statCell} style={{ color: CA1_CLR }}>{ca1Count || '—'}</td>
                <td className={styles.statCell} style={{ color: CA2_CLR }}>{ca2Count || '—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA1_BG, color: CA1_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>Ca 1</span> Ca 1</span>
        <span className={styles.legendItem}><span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: CA2_BG, color: CA2_CLR, fontWeight: 700, fontSize: '0.72rem', marginRight: 3 }}>Ca 2</span> Ca 2</span>
      </div>
    </div>
  );
}

/* === OtLateGrid (Step 4) === */
function OtLateGrid({ rows }: { rows: Record<string, unknown>[] }) {
  const OT_BG = '#eff6ff', OT_CLR = '#1d4ed8';
  const LATE_BG = '#fff7ed', LATE_CLR = '#c2410c';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const filtered = useMemo(() => rows.filter((r: any) => {
    if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase())) return false;
    if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept && !String(r.deptName ?? '').toLowerCase().includes(fDept.toLowerCase())) return false;
    return true;
  }), [rows, fCode, fName, fDept]);
  return (
    <div className={styles.tableOuter}>
      <GridSearchBar code={fCode} name={fName} dept={fDept}
        onCode={setFCode} onName={setFName} onDept={setFDept}
        total={rows.length} shown={filtered.length} />
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead><tr>
            <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
            <th style={{ minWidth: 72 }}>Mã NV</th>
            <th style={{ textAlign: 'left', minWidth: 140 }}>Tên</th>
            <th style={{ textAlign: 'left', minWidth: 100 }}>Phòng ban</th>
            {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
            <th style={{ minWidth: 44, color: OT_CLR }}>OT(h)</th>
            <th style={{ minWidth: 50, color: LATE_CLR }}>Trễ(ph)</th>
          </tr></thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number; otH: number; lateM: number }[] = r.days ?? [];
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono}>{r.code}</td>
                <td className={styles.empName}>{r.name}</td>
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
function TimeGrid({ rows }: { rows: Record<string, unknown>[] }) {
  const IN_BG = '#f0fdf4', IN_CLR = '#15803d';
  const OUT_BG = '#eff6ff', OUT_CLR = '#1d4ed8';
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const filtered = useMemo(() => rows.filter((r: any) => {
    if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase())) return false;
    if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept && !String(r.deptName ?? '').toLowerCase().includes(fDept.toLowerCase())) return false;
    return true;
  }), [rows, fCode, fName, fDept]);
  return (
    <div className={styles.tableOuter}>
      <GridSearchBar code={fCode} name={fName} dept={fDept}
        onCode={setFCode} onName={setFName} onDept={setFDept}
        total={rows.length} shown={filtered.length} />
      <div className={styles.tableWrap}>
        <table className={styles.gridTable}>
          <thead><tr>
            <th style={{ minWidth: 32, color: 'var(--gray-400)', textAlign: 'center' }}>#</th>
            <th style={{ minWidth: 72 }}>Mã NV</th>
            <th style={{ textAlign: 'left', minWidth: 140 }}>Tên</th>
            <th style={{ textAlign: 'left', minWidth: 100 }}>Phòng ban</th>
            {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum}>{i + 1}</th>)}
            <th style={{ minWidth: 50, color: '#15803d' }}>Làm</th>
          </tr></thead>
          <tbody>{filtered.map((r: any, ri) => {
            const days: { day: number; dayType: number; checkIn: string; checkOut: string; shiftCode: string }[] = r.days ?? [];
            const workCount = days.filter(d => d.dayType === 0 && d.checkIn && d.checkIn !== '00:00').length;
            return (
              <tr key={r.code}>
                <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.7rem', minWidth: 32 }}>{ri + 1}</td>
                <td className={styles.mono}>{r.code}</td>
                <td className={styles.empName}>{r.name}</td>
                <td style={{ textAlign: 'left', fontSize: '0.72rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = days.find(x => x.day === i + 1);
                  const dt = d?.dayType ?? -1;
                  const ci = d?.checkIn ?? '';
                  const co = d?.checkOut ?? '';
                  let bg = '#fff', clr = '#9ca3af', label: React.ReactNode = <span style={{ color: '#d1d5db', fontWeight: 400 }}>·</span>;
                  if (dt === 0 && ci && ci !== '00:00') {
                    bg = IN_BG;
                    label = <><span style={{ color: IN_CLR, display: 'block', lineHeight: 1.2 }}>{ci}</span><span style={{ color: OUT_CLR, display: 'block', lineHeight: 1.2 }}>{co}</span></>;
                  } else if (dt >= 0) { bg = DT_CELL_BG[dt] ?? '#fff'; clr = DT_TEXT[dt] ?? '#9ca3af'; label = <span>{DT_SYMBOL[dt] ?? ''}</span>; }
                  return (
                    <td key={i} title={d?.shiftCode || ''} style={{ background: bg, color: clr, fontWeight: 600, fontSize: '0.65rem', textAlign: 'center', padding: '2px 1px', minWidth: 38, borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', lineHeight: 1.3 }}>{label}</td>
                  );
                })}
                <td className={styles.statCell} style={{ color: '#15803d' }}>{workCount || '—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/* === FinalGrid (Step 6) === */
function FinalGrid({ rows }: { rows: Record<string, unknown>[] }) {
  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDept, setFDept] = useState('');
  const filtered = useMemo(() => rows.filter((r: any) => {
    if (fCode && !String(r.code ?? '').toLowerCase().includes(fCode.toLowerCase())) return false;
    if (fName && !String(r.name ?? '').toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept && !String(r.deptName ?? '').toLowerCase().includes(fDept.toLowerCase())) return false;
    return true;
  }), [rows, fCode, fName, fDept]);
  return (
    <div className={styles.tableOuter}>
      <GridSearchBar code={fCode} name={fName} dept={fDept}
        onCode={setFCode} onName={setFName} onDept={setFDept}
        total={rows.length} shown={filtered.length} />
      <div className={styles.tableWrap}>
        <table className={styles.gridTable} style={{ fontSize: '0.68rem' }}>
          <thead><tr>
            <th style={{ minWidth: 72 }}>Mã NV</th>
            <th style={{ textAlign: 'left', minWidth: 130 }}>Tên</th>
            <th style={{ textAlign: 'left', minWidth: 90 }}>Phòng ban</th>
            {Array.from({ length: 31 }, (_, i) => <th key={i} className={styles.dayNum} style={{ minWidth: 64 }}>{i + 1}</th>)}
            <th>Làm</th><th>Nghỉ</th>
            <th style={{ color: '#1d4ed8' }}>OT(h)</th>
            <th style={{ color: '#c2410c' }}>Trễ(ph)</th>
          </tr></thead>
          <tbody>{filtered.map((r: any, ri) => (
            <tr key={r.code} style={{ background: ri % 2 === 0 ? '#fff' : 'var(--gray-50)' }}>
              <td className={styles.mono}>{r.code}</td>
              <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{r.name}</td>
              <td style={{ textAlign: 'left', fontSize: '0.65rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{r.deptName || '—'}</td>
              {Array.from({ length: 31 }, (_, i) => {
                const d = (r.days ?? []).find((x: any) => x.day === i + 1);
                if (!d) return <td key={i} style={{ color: 'var(--gray-200)' }}>—</td>;
                const dt = Number(d.dayType);
                const isWork = dt === 0;
                return <td key={i} style={{ background: DT_BG[dt] ?? '#fff', color: DT_CLR[dt] ?? '#374151', fontWeight: isWork ? 600 : 400, padding: '3px 2px', whiteSpace: 'nowrap', lineHeight: 1.3, textAlign: 'center' }} title={`${DAY_TYPE_LABEL[dt] ?? ''} | ${d.shiftCode ?? ''}`}>
                  {isWork ? <>{d.checkIn}<br />{d.checkOut}</> : <span style={{ opacity: 0.8 }}>{DT_SYMBOL[dt] ?? '?'}</span>}
                </td>;
              })}
              <td style={{ fontWeight: 700, color: '#15803d', textAlign: 'center' }}>{r.workCount}</td>
              <td style={{ fontWeight: 700, color: '#92400e', textAlign: 'center' }}>{r.restCount}</td>
              <td style={{ textAlign: 'center' }}>{Number(r.totalOT) > 0 ? <span className={styles.otTag}>{Number(r.totalOT).toFixed(1)}</span> : '—'}</td>
              <td style={{ textAlign: 'center' }}>{Number(r.totalLate) > 0 ? <span className={styles.lateTag}>{r.totalLate}</span> : '—'}</td>
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

function ValidatePanel({ monthId, onlyIds, title, subtitle, btnId }: { monthId: string; onlyIds?: string[]; title?: string; subtitle?: string; btnId?: string; }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

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
function StepView({ step, data, onLoad, onRefresh, done, monthId }: {
  step: number; data: unknown[] | undefined; onLoad: () => void; onRefresh?: () => void; done: boolean; monthId: string;
}) {
  useEffect(() => { if (!data) onLoad(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <div className={styles.emptyState}>Đang tải...</div>;
  const rows = data as Record<string, unknown>[];

  if (step === 1) return <ImportGrid rows={rows} />;
  if (step === 2) return (
    <>
      <DayTypeGrid rows={rows} monthId={monthId} onSaved={onRefresh ?? onLoad} />
      <ValidatePanel monthId={monthId} onlyIds={['consecutive_days', 'pn_start_day', 'pn_end_of_rest', 'lp_balance']} title="Kiểm tra quy tắc ngày công" subtitle="Kiểm tra 4 quy tắc: ngày làm liên tiếp, vị trí PN, cân bằng LP giữa NV cùng phòng" btnId="btn-validate-step2" />
    </>
  );
  if (step === 3) return <ShiftGrid rows={rows} />;
  if (step === 4) return <OtLateGrid rows={rows} />;
  if (step === 5) return <TimeGrid rows={rows} />;
  if (step === 6) return (
    <>
      <FinalGrid rows={rows} />
      <ValidatePanel monthId={monthId} />
    </>
  );

  return <div className={styles.emptyState}>Lỗi bước.</div>;
}

