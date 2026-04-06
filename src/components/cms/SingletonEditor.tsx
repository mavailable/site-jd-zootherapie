import { useState, useEffect, useCallback } from 'react';
import { useContent } from './hooks/useContent';
import { useDirty } from './hooks/useDirty';
import { useToastContext, navigate } from './CmsApp';
import { FieldRenderer } from './fields/FieldRenderer';
import { SkeletonForm } from './ui/Skeleton';
import { HistoryPanel } from './HistoryPanel';
import type { CmsConfig } from '../../../cms.types';

interface SingletonEditorProps {
  config: CmsConfig;
  singletonKey: string;
}

export function SingletonEditor({ config, singletonKey }: SingletonEditorProps) {
  const singleton = config.singletons[singletonKey];
  const { loading, error, fetchFile, saveFile } = useContent();
  const { addToast } = useToastContext();

  const [data, setData] = useState<Record<string, unknown>>({});
  const [sha, setSha] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = useCallback(async () => {
    if (!singleton || saving) return;

    // Validation des champs requis
    const missingFields = Object.entries(singleton.fields)
      .filter(([_, f]) => (f as any).required)
      .filter(([key]) => {
        const v = data[key];
        return v === undefined || v === null || v === '';
      })
      .map(([_, f]) => f.label);

    if (missingFields.length > 0) {
      addToast(`Champs requis : ${missingFields.join(', ')}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await saveFile(
        singleton.path,
        data,
        sha,
        `[CMS] Mise à jour ${singleton.label}`
      );
      setSha(result.sha);
      setClean();
      addToast('Modifications enregistrées !', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [singleton, data, sha, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  const { dirty, markDirty, setClean, confirmNavigation } = useDirty(handleSave);

  function loadContent() {
    if (!singleton) return;
    setInitialLoading(true);
    setLoadError(null);
    fetchFile(singleton.path)
      .then(({ content, sha }) => {
        setData(content);
        setSha(sha);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Impossible de charger le contenu');
      })
      .finally(() => setInitialLoading(false));
  }

  useEffect(() => {
    loadContent();
  }, [singleton?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Confirmation avant navigation
  useEffect(() => {
    function handleHashChange(e: HashChangeEvent) {
      if (!confirmNavigation()) {
        e.preventDefault();
        history.pushState(null, '', e.oldURL.split('#')[1] ? `#${e.oldURL.split('#')[1]}` : '#/');
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [confirmNavigation]);

  if (!singleton) {
    return (
      <div style={styles.errorBox}>
        Section introuvable.
        <button onClick={() => navigate('#/')} style={styles.backLink}>← Retour</button>
      </div>
    );
  }

  function handleFieldChange(fieldKey: string, value: unknown) {
    setData((prev) => ({ ...prev, [fieldKey]: value }));
    markDirty();
  }

  return (
    <div>
      <div style={styles.header}>
        <button onClick={() => { if (confirmNavigation()) navigate('#/'); }} style={styles.backBtn}>
          ← Retour
        </button>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{singleton.label}</h1>
          <button onClick={() => setShowHistory(true)} style={styles.historyBtn}>
            Historique
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {initialLoading && (
        <div style={styles.form}><SkeletonForm /></div>
      )}

      {/* Error state */}
      {loadError && !initialLoading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{loadError}</p>
          <button onClick={loadContent} style={styles.retryBtn}>Réessayer</button>
        </div>
      )}

      {/* Form */}
      {!initialLoading && !loadError && (
        <div style={styles.form}>
          {Object.entries(singleton.fields).map(([key, field]) => (
            <FieldRenderer
              key={key}
              field={field}
              value={data[key]}
              onChange={(val) => handleFieldChange(key, val)}
            />
          ))}
        </div>
      )}

      {/* Save bar */}
      {!initialLoading && !loadError && (
        <div style={styles.saveBar}>
          {dirty && <span style={styles.dirtyDot} />}
          <button
            onClick={handleSave}
            disabled={saving || loading || !dirty}
            style={{
              ...styles.saveBtn,
              ...(!dirty ? styles.saveBtnDisabled : {}),
            }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <span style={styles.deployNote}>
            {dirty ? 'Modifications non enregistrées' : 'Le site sera mis à jour dans ~2 min'}
          </span>
          <span style={styles.shortcut}>⌘S</span>
        </div>
      )}

      {showHistory && (
        <HistoryPanel
          path={singleton.path}
          currentData={data}
          onRestore={(restored) => {
            setData(restored);
            markDirty();
            setShowHistory(false);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  errorBox: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: '1rem',
    fontSize: '0.9375rem',
  },
  retryBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  backLink: {
    display: 'block',
    marginTop: '1rem',
    color: '#2563eb',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  backBtn: {
    fontSize: '0.875rem',
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '0.5rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  historyBtn: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#64748b',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  form: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    marginBottom: '5rem',
  },
  saveBar: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1.5rem',
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
    zIndex: 50,
    flexWrap: 'wrap' as const,
  },
  dirtyDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#f59e0b',
    flexShrink: 0,
  },
  saveBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
    background: '#059669',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  saveBtnDisabled: {
    background: '#94a3b8',
    cursor: 'default',
  },
  deployNote: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    flex: 1,
  },
  shortcut: {
    fontSize: '0.75rem',
    color: '#cbd5e1',
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
};
