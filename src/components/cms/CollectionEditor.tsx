import { useState, useEffect, useCallback } from 'react';
import { useContent } from './hooks/useContent';
import { useDirty } from './hooks/useDirty';
import { useToastContext, navigate } from './CmsApp';
import { FieldRenderer } from './fields/FieldRenderer';
import { SkeletonForm } from './ui/Skeleton';
import type { CmsConfig, CmsField } from '../../../cms.types';

interface CollectionEditorProps {
  config: CmsConfig;
  collectionKey: string;
  slug: string;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getDefaultValue(field: CmsField): unknown {
  switch (field.type) {
    case 'text':
    case 'richtext':
    case 'image':
    case 'date':
      return '';
    case 'number':
      return field.defaultValue ?? 0;
    case 'select':
      return field.defaultValue ?? field.options[0]?.value ?? '';
    case 'object': {
      const obj: Record<string, unknown> = {};
      Object.entries(field.fields).forEach(([key, f]) => {
        obj[key] = getDefaultValue(f);
      });
      return obj;
    }
    case 'array':
      return [];
    default:
      return '';
  }
}

export function CollectionEditor({ config, collectionKey, slug }: CollectionEditorProps) {
  const collection = config.collections[collectionKey];
  const isNew = slug === '_new';
  const { loading, fetchFile, saveFile } = useContent();
  const { addToast } = useToastContext();

  const [data, setData] = useState<Record<string, unknown>>({});
  const [sha, setSha] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!collection || saving) return;

    // Validation des champs requis
    const missingFields = Object.entries(collection.fields)
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
      let fileName: string;
      if (isNew) {
        const slugValue = data[collection.slugField];
        if (typeof slugValue === 'string' && slugValue.trim()) {
          fileName = `${toSlug(slugValue)}.json`;
        } else {
          const labelKey = collection.labelField || collection.slugField;
          const label = data[labelKey];
          if (typeof label === 'string' && label.trim()) {
            const generatedSlug = toSlug(label);
            setData((prev) => ({ ...prev, [collection.slugField]: generatedSlug }));
            fileName = `${generatedSlug}.json`;
          } else {
            addToast('Veuillez remplir le titre ou identifiant', 'error');
            setSaving(false);
            return;
          }
        }
      } else {
        fileName = originalFileName;
      }

      const path = `${collection.path}/${fileName}`;
      const labelKey = collection.labelField || collection.slugField;
      const labelVal = data[labelKey];
      const label = typeof labelVal === 'string' ? labelVal : fileName;

      const result = await saveFile(
        path,
        data,
        sha || undefined,
        `[CMS] ${isNew ? 'Création' : 'Mise à jour'} ${label}`
      );

      setSha(result.sha);
      setOriginalFileName(fileName);
      setClean();
      addToast(isNew ? `« ${label} » cree !` : 'Enregistre ! Votre site se met a jour.', 'success');

      if (isNew) {
        const newSlug = fileName.replace('.json', '');
        window.location.hash = `#/collection/${collectionKey}/${newSlug}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [collection, data, sha, saving, isNew, originalFileName, collectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { dirty, markDirty, setClean, confirmNavigation } = useDirty(handleSave);

  function loadContent() {
    if (!collection || isNew) {
      const defaults: Record<string, unknown> = {};
      Object.entries(collection?.fields ?? {}).forEach(([key, field]) => {
        defaults[key] = getDefaultValue(field);
      });

      // Prefill depuis sessionStorage (ex: "J'ecris moi-meme" depuis BlogTab)
      if (isNew && typeof window !== 'undefined') {
        try {
          const prefillKey = `${collectionKey}_new_prefill`;
          const raw = sessionStorage.getItem(prefillKey);
          if (raw) {
            const prefill = JSON.parse(raw) as Record<string, unknown>;
            Object.entries(prefill).forEach(([k, v]) => {
              if (k in (collection?.fields ?? {})) defaults[k] = v;
            });
            // Defaut : date du jour pour un nouvel article blog
            if (collectionKey === 'blog' && 'date' in (collection?.fields ?? {}) && !prefill.date) {
              defaults.date = new Date().toISOString().slice(0, 10);
            }
            sessionStorage.removeItem(prefillKey);
          }
        } catch {
          // silent
        }
      }

      setData(defaults);
      setInitialLoading(false);
      if (isNew) markDirty();
      return;
    }

    setInitialLoading(true);
    setLoadError(null);
    const fileName = slug.endsWith('.json') ? slug : `${slug}.json`;
    setOriginalFileName(fileName);

    fetchFile(`${collection.path}/${fileName}`)
      .then(({ content, sha }) => {
        setData(content);
        setSha(sha);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Impossible de charger cet élément');
      })
      .finally(() => setInitialLoading(false));
  }

  useEffect(() => {
    loadContent();
  }, [collection?.path, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!collection) {
    return (
      <div style={styles.errorBox}>
        Collection introuvable.
        <button onClick={() => navigate('#/')} style={styles.backLink}>← Retour</button>
      </div>
    );
  }

  function handleFieldChange(fieldKey: string, value: unknown) {
    setData((prev) => ({ ...prev, [fieldKey]: value }));
    markDirty();
  }

  const backPath = `#/collection/${collectionKey}`;

  return (
    <div>
      <div style={styles.header}>
        <button onClick={() => { if (confirmNavigation()) navigate(backPath); }} style={styles.backBtn}>
          ← {collection.label}
        </button>
        <h1 style={styles.title}>
          {isNew ? `Nouveau ${collection.label.replace(/s$/, '')}` : 'Modifier'}
        </h1>
      </div>

      {/* Loading */}
      {initialLoading && <div style={styles.form}><SkeletonForm /></div>}

      {/* Error */}
      {loadError && !initialLoading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{loadError}</p>
          <button onClick={loadContent} style={styles.retryBtn}>Réessayer</button>
        </div>
      )}

      {/* Form */}
      {!initialLoading && !loadError && (
        <div style={styles.form}>
          {Object.entries(collection.fields).map(([key, field]) => (
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
            {saving ? 'Enregistrement...' : isNew ? 'Créer' : 'Enregistrer'}
          </button>
          <span style={styles.deployNote}>
            {dirty ? 'Modifications non enregistrées' : 'Le site sera mis à jour dans ~2 min'}
          </span>
          <span style={styles.shortcut}>⌘S</span>
        </div>
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
  },
  header: {
    marginBottom: '1.5rem',
  },
  backBtn: {
    fontSize: '0.875rem',
    color: '#2563eb',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
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
