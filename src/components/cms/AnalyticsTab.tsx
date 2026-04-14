import type { CmsConfig } from '../../../cms.types';

interface AnalyticsTabProps {
  config: CmsConfig;
}

export function AnalyticsTab({ config }: AnalyticsTabProps) {
  const site = config.site;

  if (!site?.umamiShareUrl) {
    return (
      <div style={styles.fadeIn}>
        <div style={styles.placeholder}>
          <p style={styles.placeholderText}>
            Les statistiques ne sont pas encore configurees pour votre site.
          </p>
          <p style={styles.placeholderHint}>
            Contactez Marc pour activer le suivi de vos visites.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fadeIn}>
      {/* Desktop: iframe */}
      <div className="cms-umami-desktop" style={styles.iframeContainer}>
        <iframe
          src={site.umamiShareUrl}
          style={styles.iframe}
          title="Statistiques du site"
          loading="lazy"
        />
      </div>

      {/* Mobile: button linking to Umami */}
      <div className="cms-umami-mobile" style={styles.mobileStats}>
        <a
          href={site.umamiShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.statsBtn}
        >
          Voir mes statistiques &#8599;
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },
  iframeContainer: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  iframe: { width: '100%', height: '800px', border: 'none' },
  mobileStats: { display: 'none' },
  statsBtn: {
    display: 'block',
    textAlign: 'center' as const,
    padding: '1rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    textDecoration: 'none',
  },
  placeholder: {
    textAlign: 'center' as const,
    padding: '2rem',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
  },
  placeholderText: { fontSize: '0.9375rem', color: '#64748b', margin: '0 0 0.5rem' },
  placeholderHint: { fontSize: '0.8125rem', color: '#94a3b8', margin: 0 },
};
