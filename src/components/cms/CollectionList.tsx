import { useState, useEffect } from 'react';
import { useContent } from './hooks/useContent';
import { useToastContext, navigate } from './CmsApp';
import { SkeletonList } from './ui/Skeleton';
import { t, intlLocale } from './locales';
import type { CmsConfig } from '../../../cms.types';
import {
  articleState,
  countWords,
  countPhotos,
  readingTime,
  sortTimestamp,
  slugFromFilename,
  type ArticleState,
} from './blogHelpers';

const UMAMI_PROXY_URL = 'https://umami-proxy.marc-f10.workers.dev';

interface CollectionListProps {
  config: CmsConfig;
  collectionKey: string;
}

interface LoadedItem {
  fileName: string;
  sha: string;
  data: Record<string, unknown>;
}

const BADGE_STYLES: Record<ArticleState, { bg: string; color: string; key: string }> = {
  draft: { bg: '#f1f5f9', color: '#475569', key: 'badgeDraft' },
  scheduled: { bg: '#fef3c7', color: '#a16207', key: 'badgeScheduled' },
  published: { bg: '#dcfce7', color: '#15803d', key: 'badgePublished' },
};

function formatListDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CollectionList({ config, collectionKey }: CollectionListProps) {
  const collection = config.collections[collectionKey];
  const { fetchList, fetchFile, deleteFile } = useContent();
  const { addToast } = useToastContext();

  const listMeta = collection?.listMeta;
  // 'loading' = en cours de fetch ; null = pas de données → "—" ; number = vues réelles.
  const [views, setViews] = useState<Record<string, number> | 'loading' | null>(
    listMeta?.views ? 'loading' : null
  );

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

        if (listMeta) {
          // Tri chronologique descendant (publish_at futur ou date), plus récent / programmé en tête.
          results.sort(
            (a, b) =>
              sortTimestamp(b.data as Record<string, string>) -
              sortTimestamp(a.data as Record<string, string>)
          );
        } else if (collection.fields.order) {
          results.sort((a, b) => ((a.data.order as number) || 0) - ((b.data.order as number) || 0));
        }
        setItems(results);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : t('unableToLoadList'));
      })
      .finally(() => setInitialLoading(false));
  }

  useEffect(() => {
    loadItems();
  }, [collection?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vues Umami : fetch async non bloquant (latence upstream ~1.2-1.8s). N'empêche jamais
  // le rendu de la liste. Sur échec (CORS/timeout/non-OK) → "—" partout (views reste null).
  useEffect(() => {
    if (!listMeta?.views) return;
    const siteId = config.site?.umamiSiteId;
    if (!siteId) {
      setViews(null);
      return;
    }
    let cancelled = false;
    setViews('loading');
    fetch(`${UMAMI_PROXY_URL}/metrics?siteId=${encodeURIComponent(siteId)}&period=year`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('metrics_unavailable'))))
      .then((payload: { data?: Array<{ x: string; y: number }> }) => {
        if (cancelled) return;
        const base = listMeta.blogBasePath || '/blog/';
        const map: Record<string, number> = {};
        for (const row of payload.data || []) {
          if (typeof row.x === 'string' && row.x.startsWith(base)) map[row.x] = row.y;
        }
        setViews(map);
      })
      .catch(() => {
        if (!cancelled) setViews(null);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionKey, listMeta?.views, config.site?.umamiSiteId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!collection) {
    return (
      <div style={styles.errorBox}>
        {t('collectionNotFound')}
        <button onClick={() => navigate('#/')} style={styles.backLink}>{t('back')}</button>
      </div>
    );
  }

  function getLabel(item: LoadedItem): string {
    const labelKey = collection.labelField || collection.slugField;
    const val = item.data[labelKey];
    if (typeof val === 'string' && val.trim()) return val;
    return item.fileName.replace('.json', '');
  }

  // Résout le nb de vues d'un article : "…" pendant le chargement, "—" si absent/échec, nombre sinon.
  function viewsLabel(item: LoadedItem): string {
    if (views === 'loading') return '…';
    if (!views) return '—';
    const base = listMeta?.blogBasePath || '/blog/';
    const slug = slugFromFilename(item.fileName);
    const n = views[`${base}${slug}/`];
    return typeof n === 'number' ? String(n) : '—';
  }

  // Construit la ligne de métadonnées (opt-in via listMeta). Renvoie null si rien à afficher.
  function renderMeta(item: LoadedItem) {
    if (!listMeta) return null;
    const data = item.data as Record<string, unknown>;
    const bodyField = listMeta.bodyField || 'body';
    const categoryField = listMeta.categoryField || 'category';
    const body = data[bodyField];

    const state = articleState({
      draft: data.draft as boolean | undefined,
      publish_at: data.publish_at as string | undefined,
    });

    const parts: React.ReactNode[] = [];

    if (listMeta.state) {
      const s = BADGE_STYLES[state];
      parts.push(
        <span key="state" style={{ ...styles.metaBadge, background: s.bg, color: s.color }}>
          {t(s.key)}
        </span>
      );
    }
    if (listMeta.category && typeof data[categoryField] === 'string' && (data[categoryField] as string).trim()) {
      parts.push(<span key="cat" style={styles.metaChip}>{data[categoryField] as string}</span>);
    }

    const textParts: string[] = [];
    if (listMeta.date) {
      const iso = (state === 'scheduled' && typeof data.publish_at === 'string' ? data.publish_at : (data.date as string)) || undefined;
      const d = formatListDate(iso);
      if (d) textParts.push(d);
    }
    let words = 0;
    if (listMeta.words || listMeta.readingTime) words = countWords(body);
    if (listMeta.words) textParts.push(t('metaWords', { n: words }));
    if (listMeta.photos) {
      const photos = countPhotos(data as { image?: unknown }, body);
      textParts.push(t('metaPhotos', { n: photos }));
    }
    if (listMeta.readingTime) textParts.push(t('metaReadingTime', { n: readingTime(words) }));
    if (listMeta.views) textParts.push(`👁 ${viewsLabel(item)}`);

    if (textParts.length) {
      parts.push(<span key="text" style={styles.metaText}>{textParts.join(' · ')}</span>);
    }

    if (parts.length === 0) return null;
    return <div style={styles.metaRow}>{parts}</div>;
  }

  async function handleDelete(item: LoadedItem) {
    const label = getLabel(item);
    if (!window.confirm(t('confirmDelete', { label }))) return;

    setDeleting(item.fileName);
    try {
      await deleteFile(`${collection.path}/${item.fileName}`, item.sha);
      setItems((prev) => prev.filter((i) => i.fileName !== item.fileName));
      addToast(t('deleted', { label }), 'success');
    } catch {
      addToast(t('deleteError'), 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <button onClick={() => navigate('#/')} style={styles.backBtn}>{t('back')}</button>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>
            {collection.label}
            {!initialLoading && <span style={styles.count}>{items.length}</span>}
          </h1>
          <button
            onClick={() => navigate(`#/collection/${collectionKey}/_new`)}
            style={styles.addBtn}
          >
            {t('add')}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {initialLoading && <SkeletonList />}

      {/* Error state */}
      {loadError && !initialLoading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{loadError}</p>
          <button onClick={loadItems} style={styles.retryBtn}>{t('retry')}</button>
        </div>
      )}

      {/* Empty state */}
      {!initialLoading && !loadError && items.length === 0 && (
        <div style={styles.empty}>{t('emptyList')}</div>
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
                style={listMeta ? styles.itemContentMeta : styles.itemContent}
              >
                {listMeta ? (
                  <span style={styles.itemMain}>
                    <span style={styles.itemLabel}>{getLabel(item)}</span>
                    {renderMeta(item)}
                  </span>
                ) : (
                  <span style={styles.itemLabel}>{getLabel(item)}</span>
                )}
                <span style={styles.itemArrow}>→</span>
              </button>
              <button
                onClick={() => handleDelete(item)}
                disabled={deleting === item.fileName}
                style={styles.deleteBtn}
                title={t('deleteTooltip')}
                aria-label={t('deleteAriaLabel', { label: getLabel(item) })}
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
  itemContentMeta: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: '0.9375rem',
    color: '#1e293b',
    minHeight: '48px',
  },
  itemMain: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    minWidth: 0,
    flex: 1,
  },
  itemLabel: {
    fontWeight: 500,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '0.375rem 0.5rem',
  },
  metaBadge: {
    padding: '1px 7px',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
  metaChip: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '1px 7px',
    borderRadius: '4px',
    fontWeight: 500,
    fontSize: '0.6875rem',
  },
  metaText: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  itemArrow: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    flexShrink: 0,
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
