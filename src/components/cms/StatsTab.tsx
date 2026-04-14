import { useState, useEffect } from 'react';
import type { CmsConfig } from '../../../cms.types';
import { useContent } from './hooks/useContent';

interface StatsTabProps {
  config: CmsConfig;
}

// French public holidays 2026
const HOLIDAYS_2026: Array<{ date: string; label: string }> = [
  { date: '2026-01-01', label: 'Jour de l\'An' },
  { date: '2026-04-06', label: 'Lundi de Paques' },
  { date: '2026-05-01', label: 'Fete du Travail' },
  { date: '2026-05-08', label: 'Victoire 1945' },
  { date: '2026-05-14', label: 'Ascension' },
  { date: '2026-05-25', label: 'Lundi de Pentecote' },
  { date: '2026-07-14', label: 'Fete nationale' },
  { date: '2026-08-15', label: 'Assomption' },
  { date: '2026-11-01', label: 'Toussaint' },
  { date: '2026-11-11', label: 'Armistice' },
  { date: '2026-12-25', label: 'Noel' },
];

function getUpcomingHoliday(): { label: string; date: string } | null {
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  for (const h of HOLIDAYS_2026) {
    const d = new Date(h.date);
    if (d >= now && d <= in14) return h;
  }
  return null;
}

function formatDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(isoDate)
    );
  } catch {
    return isoDate;
  }
}

function daysSince(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '1rem', letterSpacing: '1px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i}>{i <= rating ? '\u2605' : '\u2606'}</span>
      ))}
    </span>
  );
}

export function StatsTab({ config }: StatsTabProps) {
  const site = config.site;
  const isLocal = site?.clientType === 'entreprise-locale';
  const isSolo = site?.clientType === 'freelance-consultant';
  const reviewUrl = site?.reviewUrl;
  const calUrl = site?.calUrl;
  const hasReviews = !!config.collections?.reviews;
  const hasBlog = !!config.collections?.blog;
  const siteName = config.siteName;
  const ownerName = (site as Record<string, unknown> & typeof site)?.ownerName as string | undefined ?? siteName;
  const gbpUrl = site?.gbpUrl;

  const { fetchList, fetchFile } = useContent();

  // Reviews state
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [lastReview, setLastReview] = useState<Record<string, unknown> | null>(null);

  // Blog freshness state
  const [blogStale, setBlogStale] = useState(false);
  const [lastBlogDate, setLastBlogDate] = useState<string | null>(null);

  // Copy states
  const [copiedSms1, setCopiedSms1] = useState(false);
  const [copiedSms2, setCopiedSms2] = useState(false);
  const [copiedCal, setCopiedCal] = useState(false);

  // Upcoming holiday
  const upcomingHoliday = getUpcomingHoliday();

  // Fetch reviews
  useEffect(() => {
    if (!hasReviews) return;
    const path = config.collections.reviews.path || 'src/content/reviews';
    fetchList(path)
      .then(async (files) => {
        setReviewCount(files.length);
        if (files.length > 0) {
          const sorted = [...files].sort((a, b) => b.name.localeCompare(a.name));
          const recent = sorted.slice(0, 3);
          const first = recent[0];
          const filePath = `${path}/${first.name}`;
          try {
            const data = await fetchFile(filePath);
            setLastReview(data.content);
          } catch {
            // silent
          }
        }
      })
      .catch(() => {
        // silent
      });
  }, [hasReviews]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch blog freshness
  useEffect(() => {
    if (!hasBlog) return;
    const path = config.collections.blog.path || 'src/content/blog';
    fetchList(path)
      .then(async (files) => {
        if (files.length === 0) return;
        const sorted = [...files].sort((a, b) => b.name.localeCompare(a.name));
        const filePath = `${path}/${sorted[0].name}`;
        try {
          const data = await fetchFile(filePath);
          const dateField = data.content?.date as string | undefined;
          if (dateField) {
            setLastBlogDate(dateField);
            if (daysSince(dateField) > 60) setBlogStale(true);
          }
        } catch {
          // silent
        }
      })
      .catch(() => {
        // silent
      });
  }, [hasBlog]); // eslint-disable-line react-hooks/exhaustive-deps

  const sms1 =
    `Bonjour, merci d'avoir fait appel a ${siteName} ! Si vous etes satisfait de notre intervention, un avis Google nous aiderait beaucoup : ${reviewUrl || ''} \u2014 Merci, ${ownerName}`;
  const sms2 =
    `Salut ! Merci pour votre confiance. Si vous avez 2 minutes, un petit avis ici nous ferait tres plaisir : ${reviewUrl || ''}`;

  const whatsappText = encodeURIComponent(sms2);
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  function copyText(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  }

  return (
    <div style={styles.fadeIn}>

      {/* ── SECTION 1 : Rappels (freshness alerts) ── */}
      {(blogStale || upcomingHoliday) && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Rappels</h2>

          {blogStale && lastBlogDate && (
            <div style={styles.alertAmber}>
              <span style={styles.alertIcon}>&#9888;</span>
              <div>
                <strong>Votre dernier article date du {formatDate(lastBlogDate)}.</strong>
                <br />
                Envoyez une anecdote par WhatsApp, Marc s&rsquo;occupe du reste.{' '}
                <a
                  href={`https://wa.me/${site?.contactMarc?.whatsapp || '33688766648'}?text=Bonjour Marc, j'ai une idee d'article pour mon blog.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.alertLink}
                >
                  Envoyer par WhatsApp &#8599;
                </a>
              </div>
            </div>
          )}

          {upcomingHoliday && gbpUrl && (
            <div style={{ ...styles.alertBlue, marginTop: blogStale ? '0.75rem' : 0 }}>
              <span style={styles.alertIcon}>&#128197;</span>
              <div>
                <strong>Le {upcomingHoliday.label} approche ({formatDate(upcomingHoliday.date)}).</strong>
                <br />
                Pensez a mettre a jour vos horaires sur Google.{' '}
                <a
                  href={gbpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.alertLink}
                >
                  Ouvrir ma fiche Google &#8599;
                </a>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 2 : Avis et Google Business ── */}
      {isLocal && (reviewUrl || gbpUrl) && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Avis et Google Business</h2>

          {/* Review count + last review */}
          {hasReviews && reviewUrl && (
            <div style={styles.card}>
              <div style={styles.reviewHeader}>
                <span style={styles.reviewCountBadge}>
                  {reviewCount !== null ? `${reviewCount} avis` : '…'}
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  collectes via le site
                </span>
              </div>

              {lastReview && (
                <div style={styles.lastReviewBox}>
                  <div style={styles.lastReviewTop}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                      {(lastReview.author as string) || 'Client'}
                    </span>
                    {typeof lastReview.rating === 'number' && (
                      <StarRating rating={lastReview.rating} />
                    )}
                  </div>
                  {lastReview.text && (
                    <p style={styles.reviewSnippet}>
                      &ldquo;{String(lastReview.text).slice(0, 120)}{String(lastReview.text).length > 120 ? '…' : ''}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GBP management card */}
          {gbpUrl && (
            <a href={gbpUrl} target="_blank" rel="noopener noreferrer" style={{ ...styles.gbpCard, marginTop: hasReviews && reviewUrl ? '0.75rem' : 0 }}>
              <div style={styles.gbpIcon}>&#127759;</div>
              <div>
                <div style={styles.gbpLabel}>Gerer ma fiche Google</div>
                <div style={styles.gbpHint}>Horaires, photos, reponses aux avis</div>
              </div>
              <span style={styles.gbpArrow}>&#8599;</span>
            </a>
          )}

          {/* Demander un avis */}
          {reviewUrl && (
            <div style={{ ...styles.card, marginTop: '0.75rem' }}>
              <div style={styles.cardLabel}>Demander un avis</div>
              <p style={styles.cardHint}>
                3 messages prets a envoyer a vos clients apres chaque intervention.
              </p>

              {/* SMS formal */}
              <div style={styles.messageBlock}>
                <div style={styles.messageMeta}>SMS formel</div>
                <div style={styles.messageText}>{sms1}</div>
                <button style={styles.copyBtn} onClick={() => copyText(sms1, setCopiedSms1)}>
                  {copiedSms1 ? 'Copie !' : 'Copier'}
                </button>
              </div>

              {/* SMS convivial */}
              <div style={{ ...styles.messageBlock, marginTop: '0.75rem' }}>
                <div style={styles.messageMeta}>SMS convivial</div>
                <div style={styles.messageText}>{sms2}</div>
                <button style={styles.copyBtn} onClick={() => copyText(sms2, setCopiedSms2)}>
                  {copiedSms2 ? 'Copie !' : 'Copier'}
                </button>
              </div>

              {/* WhatsApp button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.waBtn}
              >
                Envoyer par WhatsApp &#8599;
              </a>

              {/* Lien avis direct */}
              <div style={styles.qrBlock}>
                <div style={styles.messageMeta}>Lien direct a partager</div>
                <div style={styles.reviewLinkBox}>{reviewUrl}</div>
                <p style={styles.qrHint}>
                  Copiez ce lien et envoyez-le a vos clients par SMS, email ou WhatsApp.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 3 : Prise de RDV Cal.com (freelance uniquement) ── */}
      {isSolo && calUrl && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Prise de RDV Cal.com</h2>

          <div style={styles.card}>
            <div style={styles.cardLabel}>Votre lien de reservation</div>
            <p style={styles.cardHint}>
              Partagez ce lien a vos prospects pour qu&rsquo;ils reservent un creneau directement dans votre agenda.
            </p>

            <div style={styles.reviewLinkBox}>{calUrl}</div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
              <button
                style={styles.copyBtn}
                onClick={() => copyText(calUrl, setCopiedCal)}
              >
                {copiedCal ? 'Copie !' : 'Copier le lien'}
              </button>
              <a
                href={calUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...styles.copyBtn, textDecoration: 'none', display: 'inline-block' }}
              >
                Ouvrir &#8599;
              </a>
              <a
                href="https://app.cal.com/event-types"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...styles.copyBtn, textDecoration: 'none', display: 'inline-block' }}
              >
                Gerer mes disponibilites &#8599;
              </a>
            </div>
          </div>
        </section>
      )}

      <div style={styles.contactFooter}>
        Une question ?{' '}
        <a
          href={`https://wa.me/${site?.contactMarc?.whatsapp || '33688766648'}?text=Bonjour Marc, j'ai une question sur mon espace admin.`}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.contactLink}
        >
          Contacter Marc par WhatsApp
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },
  section: { marginBottom: '2rem' },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '0.75rem',
  },

  // Cards
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  cardLabel: { fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' },
  cardHint: { fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem' },

  // Reviews
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  reviewCountBadge: {
    display: 'inline-block',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    fontWeight: 700,
    fontSize: '0.9375rem',
    borderRadius: '8px',
    padding: '0.25rem 0.75rem',
  },
  lastReviewBox: {
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '0.875rem 1rem',
    marginTop: '0.25rem',
  },
  lastReviewTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.375rem',
  },
  reviewSnippet: {
    fontSize: '0.875rem',
    color: '#475569',
    margin: 0,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },

  // Messages to copy
  messageBlock: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.875rem 1rem',
  },
  messageMeta: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '0.375rem',
  },
  messageText: {
    fontSize: '0.875rem',
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: '0.75rem',
  },

  // Buttons
  copyBtn: {
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  waBtn: {
    display: 'inline-block',
    marginTop: '1rem',
    padding: '0.625rem 1.125rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: '#25d366',
    borderRadius: '8px',
    textDecoration: 'none',
  },

  // Link block (replaces QR code)
  qrBlock: {
    marginTop: '1.25rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #f1f5f9',
  },
  reviewLinkBox: {
    marginTop: '0.625rem',
    fontSize: '0.75rem',
    color: '#475569',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
    lineHeight: 1.5,
  },
  qrHint: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    margin: '0.5rem 0 0',
    fontStyle: 'italic',
  },

  // Alerts
  alertAmber: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    background: '#fefce8',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '1rem 1.125rem',
    fontSize: '0.875rem',
    color: '#78350f',
    lineHeight: 1.55,
  },
  alertBlue: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '1rem 1.125rem',
    fontSize: '0.875rem',
    color: '#1e3a5f',
    lineHeight: 1.55,
  },
  alertIcon: { fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' },
  alertLink: { color: '#2563eb', fontWeight: 600, textDecoration: 'none' },

  // GBP
  gbpCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
    textDecoration: 'none',
    color: 'inherit',
  },
  gbpIcon: { fontSize: '1.25rem', marginTop: '2px' },
  gbpLabel: { fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' },
  gbpHint: { fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' },
  gbpArrow: { fontSize: '0.875rem', color: '#2563eb', marginLeft: 'auto', fontWeight: 600 },

  // Footer
  contactFooter: { textAlign: 'center' as const, fontSize: '0.8125rem', color: '#94a3b8', padding: '1rem 0' },
  contactLink: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
};
