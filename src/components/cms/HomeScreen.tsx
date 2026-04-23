import { useState, useEffect, useCallback } from 'react';
import { useContent } from './hooks/useContent';
import { navigate, useToastContext } from './CmsApp';
import { HealthCard } from './HealthCard';
import { OnboardingChecklist } from './OnboardingChecklist';
import { InlineHelp } from './ui/InlineHelp';
import { SkeletonDashboard } from './ui/Skeleton';
import {
  groupSingletons,
  GROUP_ORDER,
  GROUP_LABELS,
  COLLAPSED_BY_DEFAULT,
  GROUP_DEFAULT_ICON,
} from './utils/groupSingletons';
import type { CmsConfig, CmsSingletonGroup } from '../../../cms.types';

interface HomeScreenProps {
  config: CmsConfig;
}

const WEB3FORMS_DEFAULT_KEY = '9667fcf8-c7da-4b7a-8432-0ec25215c75e';

export function HomeScreen({ config }: HomeScreenProps) {
  const { fetchList, fetchFile } = useContent();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  // État des accordéons par groupe (true = déplié, false = plié)
  const [expanded, setExpanded] = useState<Record<CmsSingletonGroup, boolean>>(() => {
    const init = {} as Record<CmsSingletonGroup, boolean>;
    for (const g of GROUP_ORDER) {
      init[g] = !COLLAPSED_BY_DEFAULT.has(g);
    }
    return init;
  });
  const [needsW3fKey, setNeedsW3fKey] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'pending'>('loading');
  const [publishing, setPublishing] = useState(false);
  const { addToast } = useToastContext();

  useEffect(() => {
    fetch('/api/cms/sync-status')
      .then(res => res.json())
      .then(data => setSyncStatus(data.synced ? 'synced' : 'pending'))
      .catch(() => setSyncStatus('synced'));
  }, []);

  const handleManualPublish = useCallback(async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/publish', { method: 'POST' });
      if (res.ok) {
        setSyncStatus('synced');
        addToast('Site mis a jour !', 'success');
      } else {
        addToast('Erreur de publication. Contactez Marc.', 'error');
      }
    } catch {
      addToast('Impossible de contacter le serveur.', 'error');
    }
    setPublishing(false);
  }, [addToast]);

  useEffect(() => {
    setLoading(true);
    const entries = Object.entries(config.collections);
    Promise.allSettled(
      entries.map(async ([key, col]) => {
        const files = await fetchList(col.path);
        return [key, files.length] as const;
      })
    ).then((results) => {
      const newCounts: Record<string, number> = {};
      results.forEach((r, i) => {
        newCounts[entries[i][0]] = r.status === 'fulfilled' ? r.value[1] : 0;
      });
      setCounts(newCounts);
      setLoading(false);
    });

    // Check if Web3Forms key needs to be configured
    if (config.singletons.contact) {
      fetchFile(config.singletons.contact.path).then((data) => {
        const key = data?.content?.web3formsKey;
        setNeedsW3fKey(!key || key === WEB3FORMS_DEFAULT_KEY);
      }).catch(() => {});
    }
  }, [config.collections, config.singletons, fetchList, fetchFile]);

  if (loading) return <SkeletonDashboard />;

  const collectionEntries = Object.entries(config.collections);
  const hasBlog = !!config.collections.blog;

  // ─── Collections cards (inchangé du point de vue UX) ────────────
  const collectionCards: Array<{
    key: string;
    icon: string;
    label: string;
    description: string;
    count?: number;
    hash: string;
    actionLabel: string;
  }> = [];

  for (const [key, col] of collectionEntries) {
    if (key === 'blog') continue; // Blog a son propre onglet top-level
    collectionCards.push({
      key,
      icon: collectionIcon(key),
      label: col.label,
      description: col.description || '',
      count: counts[key],
      hash: `#/collection/${key}`,
      actionLabel: 'Gerer',
    });
  }

  if (hasBlog) {
    collectionCards.push({
      key: 'blog',
      icon: '\u{1F4DD}',
      label: 'Mon blog',
      description: config.collections.blog.description || 'Articles et actualites',
      count: counts.blog,
      hash: '#/collection/blog',
      actionLabel: 'Ecrire',
    });
  }

  // ─── Singletons groupés ─────────────────────────────────────────
  const groupedSingletons = groupSingletons(config.singletons);

  const toggleGroup = (g: CmsSingletonGroup) => {
    setExpanded(prev => ({ ...prev, [g]: !prev[g] }));
  };

  // Helpers de rendu
  const renderSingletonCard = (key: string, s: typeof config.singletons[string], group: CmsSingletonGroup) => {
    const icon = s.dashboardIcon || singletonIcon(key) || GROUP_DEFAULT_ICON[group];
    return (
      <button
        key={key}
        onClick={() => navigate(`#/singleton/${key}`)}
        style={styles.card}
      >
        <div style={styles.cardHeader}>
          <span style={styles.cardIcon}>{icon}</span>
          <span style={styles.cardTitle}>{s.label}</span>
        </div>
        {s.description && <div style={styles.cardDesc}>{s.description}</div>}
        <div style={styles.cardAction}>Modifier &rarr;</div>
      </button>
    );
  };

  // ─── Outils globaux qui vivaient dans "Plus d'outils" (SEO / Théme / Sections / Images) ───
  // On les range dans le groupe 'reglages' pour qu'ils apparaissent dans
  // l'accordéon "Réglages avancés" — sauf MediaLibrary qui reste en tête
  // ("Mes images") dans la section Contenu pour garder un accès direct.
  const toolsCards = [
    {
      key: '_media',
      icon: '\u{1F5BC}',
      label: 'Mes images',
      description: 'Galerie globale du site',
      hash: '#/media',
    },
  ];

  const reglagesTools = [
    {
      key: '_seo',
      icon: '\u{1F50D}',
      label: 'Referencement',
      description: 'Titres, descriptions, images de partage',
      hash: '#/seo',
    },
    {
      key: '_theme',
      icon: '\u{1F3A8}',
      label: 'Apparence',
      description: 'Couleurs, typographie et arrondis',
      hash: '#/theme',
    },
    {
      key: '_sections',
      icon: '\u{2630}',
      label: 'Sections',
      description: 'Reorganiser ou masquer des sections',
      hash: '#/sections',
    },
  ];

  return (
    <div style={styles.fadeIn}>
      <HealthCard config={config} />
      <OnboardingChecklist config={config} />

      {/* Sync status */}
      {syncStatus === 'pending' && (
        <div style={styles.syncPending}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>&#9888;</span>
            <span style={{ fontSize: '0.875rem', color: '#9a3412' }}>
              Des modifications n'ont pas ete publiees.
            </span>
          </div>
          <button onClick={handleManualPublish} disabled={publishing} style={styles.syncBtn}>
            {publishing ? 'Publication...' : 'Mettre en ligne'}
          </button>
        </div>
      )}
      {syncStatus === 'synced' && (
        <div style={styles.syncOk}>
          <span style={{ fontSize: '1rem', color: '#166534' }}>&#10003;</span>
          <span style={{ fontSize: '0.8125rem', color: '#166534' }}>Site a jour</span>
        </div>
      )}

      {needsW3fKey && (
        <div style={styles.w3fAlert}>
          <div style={styles.w3fAlertContent}>
            <strong>Recevez vos demandes de contact directement</strong>
            <p style={styles.w3fAlertText}>
              Votre formulaire de contact envoie les messages a votre webmaster.
              Configurez votre propre cle pour les recevoir directement.{' '}
              <a href="https://marcm.fr/aide/web3forms/" target="_blank" rel="noopener noreferrer" style={styles.w3fLink}>Voir le guide</a>
            </p>
          </div>
          <button onClick={() => navigate('#/singleton/contact')} style={styles.w3fBtn}>
            Configurer
          </button>
        </div>
      )}

      <InlineHelp tipId="home-tip">
        Cliquez sur une carte pour modifier son contenu. Vos changements seront en ligne
        environ une minute apres avoir clique "Enregistrer".
      </InlineHelp>

      {/* ─── Section Contenu (collections + images) ──────────────── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Contenu</h2>
        <div style={styles.grid}>
          {toolsCards.map((card) => (
            <button key={card.key} onClick={() => navigate(card.hash)} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>{card.icon}</span>
                <span style={styles.cardTitle}>{card.label}</span>
              </div>
              <div style={styles.cardDesc}>{card.description}</div>
              <div style={styles.cardAction}>Gerer &rarr;</div>
            </button>
          ))}
          {collectionCards.map((card) => (
            <button key={card.key} onClick={() => navigate(card.hash)} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>{card.icon}</span>
                <span style={styles.cardTitle}>
                  {card.label}
                  {card.count !== undefined && <span style={styles.badge}>{card.count}</span>}
                </span>
              </div>
              <div style={styles.cardDesc}>{card.description}</div>
              <div style={styles.cardAction}>{card.actionLabel} &rarr;</div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── Groupes de singletons (toujours dépliés pour les 4 premiers) ─── */}
      {GROUP_ORDER.filter(g => !COLLAPSED_BY_DEFAULT.has(g)).map((group) => {
        const items = groupedSingletons[group];
        if (items.length === 0) return null;
        return (
          <section key={group} style={styles.section}>
            <h2 style={styles.sectionTitle}>{GROUP_LABELS[group]}</h2>
            <div style={styles.grid}>
              {items.map(({ key, singleton }) => renderSingletonCard(key, singleton, group))}
            </div>
          </section>
        );
      })}

      {/* ─── Accordéon Réglages avancés (groupe 'reglages') ──────── */}
      {(groupedSingletons.reglages.length > 0 || reglagesTools.length > 0) && (
        <section style={styles.section}>
          <button onClick={() => toggleGroup('reglages')} style={styles.moreToggle}>
            <span>{GROUP_LABELS.reglages}</span>
            <span style={{
              transform: expanded.reglages ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>&#9660;</span>
          </button>
          {expanded.reglages && (
            <div style={{ ...styles.grid, marginTop: '0.75rem', animation: 'slideIn 0.2s ease-out' }}>
              {reglagesTools.map((card) => (
                <button key={card.key} onClick={() => navigate(card.hash)} style={styles.cardSmall}>
                  <span style={styles.toolIcon}>{card.icon}</span>
                  <div>
                    <div style={styles.cardTitleSmall}>{card.label}</div>
                    <div style={styles.cardDescSmall}>{card.description}</div>
                  </div>
                </button>
              ))}
              {groupedSingletons.reglages.map(({ key, singleton }) => {
                const icon = singleton.dashboardIcon || singletonIcon(key) || GROUP_DEFAULT_ICON.reglages;
                return (
                  <button key={key} onClick={() => navigate(`#/singleton/${key}`)} style={styles.cardSmall}>
                    <span style={styles.toolIcon}>{icon}</span>
                    <div>
                      <div style={styles.cardTitleSmall}>{singleton.label}</div>
                      {singleton.description && <div style={styles.cardDescSmall}>{singleton.description}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── Accordéon Pages du site (groupe 'pages') ─────────────── */}
      {groupedSingletons.pages.length > 0 && (
        <section style={styles.section}>
          <button onClick={() => toggleGroup('pages')} style={styles.moreToggle}>
            <span>{GROUP_LABELS.pages}</span>
            <span style={{
              transform: expanded.pages ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>&#9660;</span>
          </button>
          {expanded.pages && (
            <div style={{ ...styles.grid, marginTop: '0.75rem', animation: 'slideIn 0.2s ease-out' }}>
              {groupedSingletons.pages.map(({ key, singleton }) => {
                const icon = singleton.dashboardIcon || singletonIcon(key) || GROUP_DEFAULT_ICON.pages;
                return (
                  <button key={key} onClick={() => navigate(`#/singleton/${key}`)} style={styles.cardSmall}>
                    <span style={styles.toolIcon}>{icon}</span>
                    <div>
                      <div style={styles.cardTitleSmall}>{singleton.label}</div>
                      {singleton.description && <div style={styles.cardDescSmall}>{singleton.description}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── Accordéon Légal (groupe 'legal') ─────────────────────── */}
      {groupedSingletons.legal.length > 0 && (
        <section style={styles.section}>
          <button onClick={() => toggleGroup('legal')} style={styles.moreToggle}>
            <span>{GROUP_LABELS.legal}</span>
            <span style={{
              transform: expanded.legal ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
              display: 'inline-block',
            }}>&#9660;</span>
          </button>
          {expanded.legal && (
            <div style={{ ...styles.grid, marginTop: '0.75rem', animation: 'slideIn 0.2s ease-out' }}>
              {groupedSingletons.legal.map(({ key, singleton }) => {
                const icon = singleton.dashboardIcon || singletonIcon(key) || GROUP_DEFAULT_ICON.legal;
                return (
                  <button key={key} onClick={() => navigate(`#/singleton/${key}`)} style={styles.cardSmall}>
                    <span style={styles.toolIcon}>{icon}</span>
                    <div>
                      <div style={styles.cardTitleSmall}>{singleton.label}</div>
                      {singleton.description && <div style={styles.cardDescSmall}>{singleton.description}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function collectionIcon(key: string): string {
  const icons: Record<string, string> = {
    services: '\u{2699}\u{FE0F}',
    testimonials: '\u{1F4AC}',
    faq: '\u{2753}',
    blog: '\u{1F4DD}',
    projects: '\u{1F4BC}',
    etapes: '\u{1F6B6}',
    pages: '\u{1F4C4}',
    pays: '\u{1F30D}',
    galerie: '\u{1F3A8}',
  };
  return icons[key] || '\u{1F4C4}';
}

function singletonIcon(key: string): string {
  const icons: Record<string, string> = {
    'site-info': '\u{2139}\u{FE0F}',
    hero: '\u{1F3AF}',
    about: '\u{1F464}',
    contact: '\u{1F4E7}',
  };
  return icons[key] || '';
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },
  section: { marginBottom: '1.5rem' },
  sectionTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
    marginTop: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '0.75rem',
  },
  card: {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.375rem',
  },
  cardIcon: { fontSize: '1.125rem' },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '22px',
    height: '22px',
    padding: '0 6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: '999px',
  },
  cardDesc: {
    fontSize: '0.8125rem',
    color: '#64748b',
    lineHeight: 1.4,
    marginBottom: '0.25rem',
  },
  cardAction: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#2563eb',
    marginTop: '0.5rem',
  },
  moreToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.5rem 0',
  },
  cardSmall: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    width: '100%',
    textAlign: 'left' as const,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  toolIcon: { fontSize: '1rem', opacity: 0.7, marginTop: '2px' },
  cardTitleSmall: { fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' },
  cardDescSmall: { fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, marginTop: '2px' },
  // Web3Forms alert
  w3fAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
  },
  w3fAlertContent: { flex: 1 },
  w3fAlertText: {
    fontSize: '0.8125rem',
    color: '#78350f',
    margin: '0.375rem 0 0',
    lineHeight: 1.5,
  },
  w3fLink: { color: '#d97706', fontWeight: 600 },
  syncPending: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
  },
  syncBtn: {
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  syncOk: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '0.75rem 1.25rem',
    marginBottom: '1.5rem',
  },
  w3fBtn: {
    flexShrink: 0,
    padding: '0.625rem 1.25rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#92400e',
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
};
