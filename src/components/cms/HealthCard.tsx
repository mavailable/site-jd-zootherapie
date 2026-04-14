import { useState, useEffect } from 'react';
import type { CmsConfig } from '../../../cms.types';

interface HealthCardProps {
  config: CmsConfig;
}

const UMAMI_PROXY_URL = 'https://umami-proxy.marc-f10.workers.dev';

interface HealthData {
  lastCommitDate: string | null;
  visitors: number | null;
  pageviews: number | null;
  loading: boolean;
}

export function HealthCard({ config }: HealthCardProps) {
  const [health, setHealth] = useState<HealthData>({ lastCommitDate: null, visitors: null, pageviews: null, loading: true });

  useEffect(() => {
    async function fetchHealth() {
      try {
        const firstSingleton = Object.values(config.singletons)[0];
        if (firstSingleton) {
          const res = await fetch(`/api/cms/history?path=${encodeURIComponent(firstSingleton.path)}&limit=1`);
          if (res.ok) {
            const data = await res.json();
            if (data.commits?.[0]) {
              setHealth((h) => ({ ...h, lastCommitDate: data.commits[0].date }));
            }
          }
        }

        setHealth((h) => ({ ...h, loading: false }));

        // Fetch visitor + pageview stats from Umami proxy
        if (config.site?.umamiSiteId) {
          try {
            const umamiRes = await fetch(
              `${UMAMI_PROXY_URL}/stats?siteId=${encodeURIComponent(config.site.umamiSiteId)}&period=month`
            );
            if (umamiRes.ok) {
              const umamiData = await umamiRes.json();
              setHealth((h) => ({
                ...h,
                visitors: umamiData.visitors ?? null,
                pageviews: umamiData.pageviews ?? null,
              }));
            }
          } catch {
            // Silent — stats stay null
          }
        }
      } catch {
        setHealth((h) => ({ ...h, loading: false }));
      }
    }
    fetchHealth();
  }, [config]);

  const site = config.site;
  const lastModif = health.lastCommitDate ? formatRelativeDate(health.lastCommitDate) : null;

  const hasStats = health.visitors !== null || health.pageviews !== null;

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <div style={styles.statusRow}>
          <span style={styles.dot} />
          <span style={styles.statusText}>Votre espace</span>
        </div>
        {site?.siteUrl && (
          <a href={site.siteUrl} target="_blank" rel="noopener noreferrer" style={styles.siteLink}>
            {site.siteUrl.replace(/^https?:\/\//, '')} &#8599;
          </a>
        )}
      </div>
      {hasStats && (
        <div style={styles.statsBar}>
          {health.visitors !== null && (
            <div style={styles.statBox}>
              <span style={styles.statNumber}>{health.visitors}</span>
              <span style={styles.statLabel}>visiteur{health.visitors > 1 ? 's' : ''} ce mois</span>
            </div>
          )}
          {health.pageviews !== null && (
            <div style={styles.statBox}>
              <span style={styles.statNumber}>{health.pageviews}</span>
              <span style={styles.statLabel}>pages vues ce mois</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`;
  return date.toLocaleDateString('fr-FR');
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.5rem',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#166534',
  },
  siteLink: {
    fontSize: '0.8125rem',
    color: '#16a34a',
    textDecoration: 'none',
    fontWeight: 500,
  },
  statsBar: {
    display: 'flex',
    gap: '0.75rem',
  },
  statBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
  },
  statNumber: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.125rem',
  },
};
