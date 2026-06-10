'use client';
import { useState, useRef, useEffect } from 'react';

interface ColumnDef { key: string; label: string; }

interface ColumnToggleProps {
  visible: Record<string, boolean>;
  setVisible: (key: string, val: boolean) => void;
  columns: ColumnDef[];
}

export function ColumnToggle({ visible, setVisible, columns }: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db',
          background: '#fff', cursor: 'pointer', color: '#374151', fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
      >
        ⚙ Cột
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: '6px 0', minWidth: 160,
          }}
        >
          {columns.map(col => {
            const checked = visible[col.key] !== false;
            return (
              <label
                key={col.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
                  fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setVisible(col.key, !checked)}
                  style={{ accentColor: '#3b82f6', margin: 0 }}
                />
                {col.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
