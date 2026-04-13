import { useState, useEffect } from 'react';
import { useContent } from './hooks/useContent';
import { navigate } from './CmsApp';
import { HealthCard } from './HealthCard';
import { OnboardingChecklist } from './OnboardingChecklist';
import { InlineHelp } from './ui/InlineHelp';
import { SkeletonDashboard } from './ui/Skeleton';
import type { CmsConfig } from '../../../cms.types';

interface HomeScreenProps {
  config: CmsConfig;
}

export function HomeScreen({ config }: HomeScreenProps) {
  const { fetchList } = useContent();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

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
  }, [config.collections, fetchList]);

  if (loading) return <SkeletonDashboard />;

  const singletonEntries = Object.entries(config.singletons);
  const collectionEntries = Object.entries(config.collections);
  const hasBlog = !!config.collections.blog;

  const primaryCards: Array<{
    key: string;
    icon: string;
    label: string;
    description: string;
    count?: number;
    hash: string;
    actionLabel: string;
  }> = [];

  primaryCards.push({
    key: 'textes',
    icon: '\u{270F}\u{FE0F}',
    label: 'Mes textes',
    description: `${singletonEntries.length} sections editables`,
    hash: '#/singleton/' + (singletonEntries[0]?.[0] || 'site-info'),
    actionLabel: 'Modifier',
  });

  primaryCards.push({
    key: 'images',
    icon: '\u{1F5BC}',
    label: 'Mes images',
    description: 'Photos et visuels du site',
    hash: '#/media',
    actionLabel: 'Gerer',
  });

  for (const [key, col] of collectionEntries) {
    if (key === 'blog') continue;
    primaryCards.push({
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
    primaryCards.push({
      key: 'blog',
      icon: '\u{1F4DD}',
      label: 'Mon blog',
      description: config.collections.blog.description || 'Articles et actualites',
      count: counts.blog,
      hash: '#/collection/blog',
      actionLabel: 'Ecrire',
    });
  }

  return (
    <div style={styles.fadeIn}>
      <HealthCard config={config} />
      <OnboardingChecklist config={config} />

      <InlineHelp tipId="home-tip">
        Cliquez sur une carte pour modifier son contenu. Vos changements seront visibles apres avoir
        clique "Enregistrer", puis "Mettre en ligne" dans Mon Compte.
      </InlineHelp>

      <section style={styles.section}>
        <div style={styles.grid}>
          {primaryCards.map((card) => (
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

      <section style={styles.section}>
        <button onClick={() => setShowMore(!showMore)} style={styles.moreToggle}>
          <span>Plus d'outils</span>
          <span style={{
            transform: showMore ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>&#9660;</span>
        </button>
        {showMore && (
          <div style={{ ...styles.grid, marginTop: '0.75rem', animation: 'slideIn 0.2s ease-out' }}>
            <button onClick={() => navigate('#/seo')} style={styles.cardSmall}>
              <span style={styles.toolIcon}>&#128269;</span>
              <div>
                <div style={styles.cardTitleSmall}>Referencement</div>
                <div style={styles.cardDescSmall}>Titres, descriptions, images de partage</div>
              </div>
            </button>
            <button onClick={() => navigate('#/theme')} style={styles.cardSmall}>
              <span style={styles.toolIcon}>&#127912;</span>
              <div>
                <div style={styles.cardTitleSmall}>Apparence</div>
                <div style={styles.cardDescSmall}>Couleurs, typographie et arrondis</div>
              </div>
            </button>
            <button onClick={() => navigate('#/sections')} style={styles.cardSmall}>
              <span style={styles.toolIcon}>&#9776;</span>
              <div>
                <div style={styles.cardTitleSmall}>Sections</div>
                <div style={styles.cardDescSmall}>Reorganiser ou masquer des sections</div>
              </div>
            </button>
            {singletonEntries.map(([key, s]) => (
              <button key={key} onClick={() => navigate(`#/singleton/${key}`)} style={styles.cardSmall}>
                <span style={styles.toolIcon}>{singletonIcon(key)}</span>
                <div>
                  <div style={styles.cardTitleSmall}>{s.label}</div>
                  {s.description && <div style={styles.cardDescSmall}>{s.description}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
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
  return icons[key] || '\u{1F4CB}';
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },
  section: { marginBottom: '1.5rem' },
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
};
