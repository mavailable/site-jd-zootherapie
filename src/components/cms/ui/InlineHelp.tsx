import { useDismissedTip } from '../hooks/useOnboarding';

interface InlineHelpProps {
  tipId: string;
  children: React.ReactNode;
}

export function InlineHelp({ tipId, children }: InlineHelpProps) {
  const { dismissed, dismissTip } = useDismissedTip(tipId);

  if (dismissed) return null;

  return (
    <div style={styles.container}>
      <div style={styles.icon}>&#128161;</div>
      <div style={styles.content}>{children}</div>
      <button onClick={dismissTip} style={styles.dismiss} aria-label="Fermer">
        OK, compris
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    background: '#fefce8',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    marginBottom: '1rem',
    fontSize: '0.8125rem',
    color: '#854d0e',
    lineHeight: 1.5,
  },
  icon: {
    fontSize: '1rem',
    flexShrink: 0,
    marginTop: '1px',
  },
  content: {
    flex: 1,
  },
  dismiss: {
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#a16207',
    background: 'rgba(161, 98, 7, 0.1)',
    border: 'none',
    borderRadius: '6px',
    padding: '0.375rem 0.625rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
};
