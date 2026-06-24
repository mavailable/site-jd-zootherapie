import { t } from './locales';
import type { CmsConfig } from '../../../cms.types';

interface AnalyticsTabProps {
  config: CmsConfig;
}

/**
 * Onglet Statistiques.
 *
 * Le dashboard Umami est embarque directement en iframe. La page /share/*
 * renvoie `Content-Security-Policy: frame-ancestors *` qui, dans les
 * navigateurs modernes, prime sur le legacy `X-Frame-Options: SAMEORIGIN`
 * (verifie en live le 2026-06-21 : embed OK sur origine https, aucune
 * erreur de framing). Ce site ne sert aucune CSP (pas de _headers/meta
 * restrictifs), donc aucune directive `frame-src` ne bloque l'iframe.
 * Sur mobile l'iframe est trop etroite (la page Umami passe en nav compacte),
 * on bascule donc sur un CTA plein ecran qui ouvre le dashboard.
 */
export function AnalyticsTab({ config }: AnalyticsTabProps) {
  const site = config.site;

  if (!site?.umamiShareUrl) {
    return (
      <div style={styles.fadeIn}>
        <div style={styles.placeholder}>
          <p style={styles.placeholderText}>
            {t('statsNotConfigured')}
          </p>
          <p style={styles.placeholderHint}>
            {t('statsContactMarc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fadeIn}>
      <style>{responsiveCss}</style>

      {/* Desktop : dashboard embarque */}
      <div className="cms-stats-embed" style={styles.embedWrap}>
        <div style={styles.embedBar}>
          <span style={styles.embedBarTitle}>
            <span style={styles.embedBarIcon}>&#128202;</span>
            {t('yourVisitStats')}
          </span>
          <a
            href={site.umamiShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.embedBarLink}
          >
            {t('openDashboard')} &#8599;
          </a>
        </div>
        <iframe
          src={site.umamiShareUrl}
          style={styles.iframe}
          title={t('yourVisitStats')}
          loading="lazy"
        />
        <p style={styles.embedNote}>{t('statsNote')}</p>
      </div>

      {/* Mobile : CTA plein ecran (iframe trop etroite sur petit ecran) */}
      <div className="cms-stats-cta" style={styles.card}>
        <div style={styles.iconCircle}>
          <span style={styles.icon}>&#128202;</span>
        </div>

        <h2 style={styles.title}>{t('yourVisitStats')}</h2>

        <p style={styles.lead}>
          {t('statsLead')}
        </p>

        <a
          href={site.umamiShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.primaryBtn}
        >
          {t('openDashboard')}
        </a>

        <div style={styles.helpRow}>
          <div style={styles.helpItem}>
            <div style={styles.helpLabel}>{t('serviceLabel')}</div>
            <div style={styles.helpValue}>Umami Cloud</div>
          </div>
          <div style={styles.helpItem}>
            <div style={styles.helpLabel}>{t('costLabel')}</div>
            <div style={styles.helpValue}>0&nbsp;&euro;</div>
          </div>
          <div style={styles.helpItem}>
            <div style={styles.helpLabel}>{t('complianceLabel')}</div>
            <div style={styles.helpValue}>{t('complianceValue')}</div>
          </div>
        </div>

        <p style={styles.note}>
          {t('statsNote')}
        </p>
      </div>
    </div>
  );
}

// Iframe sur desktop, CTA sur mobile (<=640px) : l'iframe Umami est trop
// etroite sur petit ecran. Media query impossible en style inline → <style>.
const responsiveCss = `
.cms-stats-cta { display: none; }
@media (max-width: 640px) {
  .cms-stats-embed { display: none !important; }
  .cms-stats-cta { display: block; }
}`;

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },

  embedWrap: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  embedBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.875rem 1.25rem',
    borderBottom: '1px solid #f1f5f9',
    background: '#f8fafc',
  },
  embedBarTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  embedBarIcon: { fontSize: '1.125rem' },
  embedBarLink: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  },
  iframe: {
    width: '100%',
    height: '820px',
    border: 'none',
    display: 'block',
    background: '#fff',
  },
  embedNote: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    margin: 0,
    padding: '0.875rem 1.25rem',
    borderTop: '1px solid #f1f5f9',
    lineHeight: 1.5,
  },

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
