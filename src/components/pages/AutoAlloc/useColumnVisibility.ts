'use client';
import { useState, useCallback } from 'react';

export function useColumnVisibility(storageKey: string, defaults: Record<string, boolean>): [Record<string, boolean>, (key: string, visible: boolean) => void] {
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`colVis_${storageKey}`);
      if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return defaults;
  });

  const set = useCallback((key: string, val: boolean) => {
    setVisible(prev => {
      const next = { ...prev, [key]: val };
      try { localStorage.setItem(`colVis_${storageKey}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  return [visible, set];
}
