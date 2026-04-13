import { useOnboarding } from './hooks/useOnboarding';
import type { CmsConfig } from '../../../cms.types';

interface OnboardingChecklistProps {
  config: CmsConfig;
}

function getDefaultItems(config: CmsConfig) {
  const items: Array<{ id: string; label: string }> = [
    { id: 'check-info', label: 'Verifier vos informations (adresse, telephone)' },
    { id: 'add-photo', label: 'Ajouter une photo de vous ou de votre activite' },
  ];

  if (config.site?.clientType === 'entreprise-locale' && config.site?.reviewUrl) {
    items.push({ id: 'first-review', label: 'Demander un premier avis Google' });
  }

  if (config.collections.blog) {
    items.push({ id: 'first-article', label: "Proposer une idee d'article de blog" });
  }

  return items;
}

export function OnboardingChecklist({ config }: OnboardingChecklistProps) {
  const defaultItems = getDefaultItems(config);
  const { items, toggleItem, dismiss, progress, showChecklist } = useOnboarding(defaultItems);

  if (!showChecklist) return null;

  const completedCount = items.filter((i) => i.checked).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Bienvenue sur votre espace !</h2>
          <p style={styles.subtitle}>
            {completedCount}/{items.length} termine{completedCount > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={dismiss} style={styles.dismissBtn} aria-label="Fermer">
          &times;
        </button>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>

      <ul style={styles.list}>
        {items.map((item) => (
          <li key={item.id} style={styles.item}>
            <button
              onClick={() => toggleItem(item.id)}
              style={{
                ...styles.checkbox,
                ...(item.checked ? styles.checkboxChecked : {}),
              }}
              aria-label={item.checked ? 'Marquer comme non fait' : 'Marquer comme fait'}
            >
              {item.checked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <span style={{
              ...styles.label,
              ...(item.checked ? styles.labelChecked : {}),
            }}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    borderRadius: '14px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: '0.8125rem',
    color: 'rgba(255,255,255,0.7)',
    margin: '0.25rem 0 0',
  },
  dismissBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    fontSize: '1.125rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: '4px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    marginBottom: '1rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#fff',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.625rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  checkbox: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    border: '2px solid rgba(255,255,255,0.4)',
    background: 'transparent',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  checkboxChecked: {
    background: 'rgba(255,255,255,0.3)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  label: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.9)',
  },
  labelChecked: {
    textDecoration: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
};
