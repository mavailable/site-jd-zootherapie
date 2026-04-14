import { useEffect, useState, useCallback } from 'react';
import { useContent } from './hooks/useContent';
import { useToastContext } from './CmsApp';
import { navigate } from './CmsApp';
import { SkeletonDashboard } from './ui/Skeleton';
import type { CmsConfig } from '../../../cms.types';

interface DashboardProps {
  config: CmsConfig;
}

function ChangePasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cms/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Une erreur est survenue.');
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    }
    setSubmitting(false);
  }, [currentPassword, newPassword, confirmPassword, onSuccess]);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>Changer mon mot de passe</h3>
          <button onClick={onClose} style={modalStyles.closeBtn} aria-label="Fermer">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div style={modalStyles.error}>{error}</div>}
          <label style={modalStyles.label}>
            Mot de passe actuel
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={modalStyles.input}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          <label style={modalStyles.label}>
            Nouveau mot de passe
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={modalStyles.input}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <span style={modalStyles.hint}>6 caracteres minimum</span>
          </label>
          <label style={modalStyles.label}>
            Confirmer le nouveau mot de passe
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={modalStyles.input}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <div style={modalStyles.actions}>
            <button type="button" onClick={onClose} style={modalStyles.cancelBtn}>Annuler</button>
            <button type="submit" disabled={submitting} style={modalStyles.submitBtn}>
              {submitting ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Dashboard({ config }: DashboardProps) {
  const { fetchList } = useContent();
  const { addToast } = useToastContext();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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

  const singletonEntries = Object.entries(config.singletons);
  const collectionEntries = Object.entries(config.collections);

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}><SkeletonDashboard /></div>
        <div style={{ marginTop: '1rem' }}><SkeletonDashboard /></div>
      </div>
    );
  }

  return (
    <div style={styles.fadeIn}>
      {/* Welcome + Quick actions */}
      <section style={styles.welcome}>
        <h1 style={styles.welcomeTitle}>Bienvenue sur votre espace</h1>
        <p style={styles.welcomeText}>Modifiez le contenu de votre site en quelques clics.</p>
        <div style={styles.quickActions}>
          {collectionEntries.slice(0, 2).map(([key, col]) => (
            <button key={key} onClick={() => navigate(`#/collection/${key}/new`)} style={styles.quickBtn}>
              + {col.label}
            </button>
          ))}
        </div>
      </section>

      {/* Collections */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Collections</h2>
        <div style={styles.grid}>
          {collectionEntries.map(([key, collection]) => (
            <button key={key} onClick={() => navigate(`#/collection/${key}`)} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardIcon}>{collectionIcon(key)}</div>
                <div style={styles.cardTitle}>
                  {collection.label}
                  {counts[key] !== undefined && <span style={styles.badge}>{counts[key]}</span>}
                </div>
              </div>
              {collection.description && <div style={styles.cardDesc}>{collection.description}</div>}
              <div style={styles.cardAction}>Gerer →</div>
            </button>
          ))}
        </div>
      </section>

      {/* Contenus (singletons) */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Pages et sections</h2>
        <div style={styles.grid}>
          {singletonEntries.map(([key, singleton]) => (
            <button key={key} onClick={() => navigate(`#/singleton/${key}`)} style={styles.card}>
              <div style={styles.cardTitle}>{singleton.label}</div>
              {singleton.description && <div style={styles.cardDesc}>{singleton.description}</div>}
              <div style={styles.cardAction}>Modifier →</div>
            </button>
          ))}
        </div>
      </section>

      {/* Outils */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Outils</h2>
        <div style={styles.grid}>
          <button onClick={() => navigate('#/sections')} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.toolIcon}>&#9776;</span>
              <div style={styles.cardTitle}>Sections</div>
            </div>
            <div style={styles.cardDesc}>Reorganiser et masquer les sections</div>
            <div style={styles.cardAction}>Gerer →</div>
          </button>
          <button onClick={() => navigate('#/theme')} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.toolIcon}>&#127912;</span>
              <div style={styles.cardTitle}>Apparence</div>
            </div>
            <div style={styles.cardDesc}>Couleurs, typographie et arrondis</div>
            <div style={styles.cardAction}>Personnaliser →</div>
          </button>
          <button onClick={() => navigate('#/media')} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.toolIcon}>&#128444;</span>
              <div style={styles.cardTitle}>Images</div>
            </div>
            <div style={styles.cardDesc}>Gerer les images du site</div>
            <div style={styles.cardAction}>Ouvrir →</div>
          </button>
          <button onClick={() => navigate('#/seo')} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.toolIcon}>&#128269;</span>
              <div style={styles.cardTitle}>SEO</div>
            </div>
            <div style={styles.cardDesc}>Titres, descriptions et images de partage</div>
            <div style={styles.cardAction}>Optimiser →</div>
          </button>
          <button onClick={() => setShowPasswordModal(true)} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.toolIcon}>&#128274;</span>
              <div style={styles.cardTitle}>Mot de passe</div>
            </div>
            <div style={styles.cardDesc}>Changer votre mot de passe d'acces</div>
            <div style={styles.cardAction}>Modifier →</div>
          </button>
        </div>
      </section>

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            addToast('Mot de passe modifie avec succes.', 'success');
          }}
        />
      )}
    </div>
  );
}

function collectionIcon(key: string): string {
  const icons: Record<string, string> = {
    projects: '\u{1F4BC}',      // briefcase
    blog: '\u{270F}',           // pencil
    testimonials: '\u{1F4AC}',  // speech bubble
    services: '\u{2699}',       // gear
    faq: '\u{2753}',            // question mark
  };
  return icons[key] || '\u{1F4C4}';
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: {
    animation: 'fadeIn 0.25s ease-out',
  },
  welcome: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    borderRadius: '14px',
    padding: '1.75rem 2rem',
    marginBottom: '2rem',
    color: '#fff',
  },
  welcomeTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    margin: '0 0 0.25rem',
  },
  welcomeText: {
    fontSize: '0.9375rem',
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 1.25rem',
  },
  quickActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  quickBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1d4ed8',
    background: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.15s',
  },
  section: { marginBottom: '2rem' },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '0.75rem',
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
    marginBottom: '0.25rem',
  },
  cardIcon: {
    fontSize: '1.125rem',
  },
  toolIcon: {
    fontSize: '1rem',
    opacity: 0.7,
  },
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
    marginBottom: '0.25rem',
    lineHeight: 1.4,
  },
  cardAction: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#2563eb',
    marginTop: '0.5rem',
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '1rem',
  },
  modal: {
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0 0.25rem',
    lineHeight: 1,
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '1rem',
  },
  input: {
    display: 'block',
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.625rem 0.875rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
  },
  hint: {
    display: 'block',
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 400 as const,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  cancelBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
