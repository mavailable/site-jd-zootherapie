import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook pour tracker les modifications non enregistrées.
 * - dirty: true si le formulaire a été modifié
 * - setClean: marquer comme propre (après save)
 * - markDirty: marquer comme modifié
 * - confirmNavigation: retourne true si ok pour naviguer (prompt si dirty)
 * - Gère Cmd+S / Ctrl+S pour sauvegarder
 * - Gère beforeunload pour empêcher la fermeture d'onglet
 */
export function useDirty(onSave?: () => void) {
  const [dirty, setDirty] = useState(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const markDirty = useCallback(() => setDirty(true), []);
  const setClean = useCallback(() => setDirty(false), []);

  const confirmNavigation = useCallback((): boolean => {
    if (!dirty) return true;
    return window.confirm('Vous avez des modifications non enregistrées. Quitter sans sauvegarder ?');
  }, [dirty]);

  // Cmd+S / Ctrl+S
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && onSaveRef.current) {
          onSaveRef.current();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dirty]);

  // beforeunload
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  return { dirty, markDirty, setClean, confirmNavigation };
}
