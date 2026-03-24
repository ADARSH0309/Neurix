import { useEffect, useCallback } from 'react';

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export function useKeyboardShortcut(
  combo: KeyCombo,
  callback: () => void,
  enabled: boolean = true
): void {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const matchesKey = e.key.toLowerCase() === combo.key.toLowerCase();
      const matchesCtrl = combo.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const matchesShift = combo.shift ? e.shiftKey : true;
      const matchesAlt = combo.alt ? e.altKey : true;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
        e.preventDefault();
        callback();
      }
    },
    [combo, callback, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
