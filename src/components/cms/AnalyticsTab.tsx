import type { CmsConfig } from '../../../cms.types';

interface AnalyticsTabProps {
  config: CmsConfig;
}

/**
 * Onglet Statistiques.
 *
 * Note technique : Umami Cloud renvoie `X-Frame-Options: SAMEORIGIN` sur
 * /share/* — l'embed iframe est donc bloque par tous les navigateurs.
 * On ouvre le dashboard dans un nouvel onglet via un gros CTA.
 */
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
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <span style={styles.icon}>&#128202;</span>
        </div>

        <h2 style={styles.title}>Vos statistiques de visites</h2>

        <p style={styles.lead}>
          Visites, pages les plus vues, sources de trafic, appareils utilises.
          Mises a jour en temps reel, sans cookie ni tracking publicitaire.
        </p>

        <a
          href={site.umamiShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.primaryBtn}
        >
          Ouvrir mon dashboard &#8599;
        </a>

        <div style={styles.helpRow}>
          <div style={styles.helpItem}>
            <div style={styles.helpLabel}>Service</div>
            <div style={styles.helpValue}>Umami Cloud</div>
          </div>
          <div style={styles.helpItem}>
            <div style={styles.helpLabel}>Cout pour vous</div>
            <div style={styles.helpValue}>0&nbsp;&euro;</div>
          </div>
          <div style={styles.helpItem}>
            <div style={styles.helpLabel}>Conformite</div>
            <div style={styles.helpValue}>RGPD, sans cookie</div>
          </div>
        </div>

        <p style={styles.note}>
          Le dashboard s&rsquo;ouvre dans un nouvel onglet et reste accessible
          en permanence. Vous pouvez le mettre en favori pour y revenir
          rapidement.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },

  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '2rem 1.5rem',
    textAlign: 'center' as const,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },

  iconCircle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    marginBottom: '1rem',
  },
  icon: { fontSize: '1.75rem' },

  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 0.5rem',
  },
  lead: {
    fontSize: '0.9375rem',
    color: '#475569',
    lineHeight: 1.6,
    maxWidth: '440px',
    margin: '0 auto 1.5rem',
  },

  primaryBtn: {
    display: 'inline-block',
    padding: '0.875rem 1.75rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '10px',
    textDecoration: 'none',
    cursor: 'pointer',
  },

  helpRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: '1.5rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #f1f5f9',
  },
  helpItem: { textAlign: 'center' as const, minWidth: '90px' },
  helpLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '0.25rem',
  },
  helpValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0f172a',
  },

  note: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    margin: '1.5rem auto 0',
    maxWidth: '440px',
    lineHeight: 1.5,
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
