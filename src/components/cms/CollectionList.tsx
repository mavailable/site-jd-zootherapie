import { useState, useEffect } from 'react';
import { useContent } from './hooks/useContent';
import { useToastContext, navigate } from './CmsApp';
import { SkeletonList } from './ui/Skeleton';
import type { CmsConfig } from '../../../cms.types';

interface CollectionListProps {
  config: CmsConfig;
  collectionKey: string;
}

interface LoadedItem {
  fileName: string;
  sha: string;
  data: Record<string, unknown>;
}

export function CollectionList({ config, collectionKey }: CollectionListProps) {
  const collection = config.collections[collectionKey];
  const { fetchList, fetchFile, deleteFile } = useContent();
  const { addToast } = useToastContext();

  const [items, setItems] = useState<LoadedItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function loadItems() {
    if (!collection) return;
    setInitialLoading(true);
    setLoadError(null);

    fetchList(collection.path)
      .then(async (files) => {
        const loaded = await Promise.allSettled(
          files.map(async (f) => {
            const { content, sha } = await fetchFile(`${collection.path}/${f.name}`);
            return { fileName: f.name, sha, data: content } as LoadedItem;
          })
        );
        const results = loaded
          .filter((r): r is PromiseFulfilledResult<LoadedItem> => r.status === 'fulfilled')
          .map((r) => r.value);

        if (collection.fields.order) {
          results.sort((a, b) => ((a.data.order as number) || 0) - ((b.data.order as number) || 0));
        }
        setItems(results);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Impossible de charger la liste');
      })
      .finally(() => setInitialLoading(false));
  }

  useEffect(() => {
    loadItems();
  }, [collection?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!collection) {
    return (
      <div style={styles.errorBox}>
        Collection introuvable.
        <button onClick={() => navigate('#/')} style={styles.backLink}>← Retour</button>
      </div>
    );
  }

  function getLabel(item: LoadedItem): string {
    const labelKey = collection.labelField || collection.slugField;
    const val = item.data[labelKey];
    if (typeof val === 'string' && val.trim()) return val;
    return item.fileName.replace('.json', '');
  }

  async function handleDelete(item: LoadedItem) {
    const label = getLabel(item);
    if (!window.confirm(`Supprimer « ${label} » ? Cette action est irréversible.`)) return;

    setDeleting(item.fileName);
    try {
      await deleteFile(`${collection.path}/${item.fileName}`, item.sha);
      setItems((prev) => prev.filter((i) => i.fileName !== item.fileName));
      addToast(`« ${label} » supprimé`, 'success');
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <button onClick={() => navigate('#/')} style={styles.backBtn}>← Retour</button>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>
            {collection.label}
            {!initialLoading && <span style={styles.count}>{items.length}</span>}
          </h1>
          <button
            onClick={() => navigate(`#/collection/${collectionKey}/_new`)}
            style={styles.addBtn}
          >
            + Ajouter
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {initialLoading && <SkeletonList />}

      {/* Error state */}
      {loadError && !initialLoading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{loadError}</p>
          <button onClick={loadItems} style={styles.retryBtn}>Réessayer</button>
        </div>
      )}

      {/* Empty state */}
      {!initialLoading && !loadError && items.length === 0 && (
        <div style={styles.empty}>Aucun élément pour le moment.</div>
      )}

      {/* List */}
      {!initialLoading && !loadError && items.length > 0 && (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.fileName} style={styles.item}>
              <button
                onClick={() => {
                  const slug = item.fileName.replace('.json', '');
                  navigate(`#/collection/${collectionKey}/${slug}`);
                }}
                style={styles.itemContent}
              >
                <span style={styles.itemLabel}>{getLabel(item)}</span>
                <span style={styles.itemArrow}>→</span>
              </button>
              <button
                onClick={() => handleDelete(item)}
                disabled={deleting === item.fileName}
                style={styles.deleteBtn}
                title="Supprimer"
                aria-label={`Supprimer ${getLabel(item)}`}
              >
                {deleting === item.fileName ? '...' : '×'}
              </button>
            </div>
          ))}
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
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '0.5rem',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  count: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    padding: '0 6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: '999px',
  },
  addBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    color: '#94a3b8',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  list: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: '0.9375rem',
    color: '#1e293b',
    minHeight: '48px',
  },
  itemLabel: {
    fontWeight: 500,
  },
  itemArrow: {
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
  deleteBtn: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '1.25rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginRight: '0.25rem',
    borderRadius: '6px',
    flexShrink: 0,
  },
};
