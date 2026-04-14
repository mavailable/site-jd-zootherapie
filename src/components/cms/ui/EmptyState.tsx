interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  whatsappText?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, whatsappText }: EmptyStateProps) {
  const whatsappHref = whatsappText
    ? `https://wa.me/33688766648?text=${encodeURIComponent(whatsappText)}`
    : undefined;

  return (
    <div style={styles.container}>
      {icon && <div style={styles.icon}>{icon}</div>}
      <div style={styles.title}>{title}</div>
      <div style={styles.description}>{description}</div>
      <div style={styles.actions}>
        {actionLabel && onAction && (
          <button onClick={onAction} style={styles.button}>{actionLabel}</button>
        )}
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={styles.whatsapp}>
            Envoyer un message a Marc
          </a>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    textAlign: 'center' as const,
    padding: '2.5rem 1.5rem',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
  },
  icon: {
    fontSize: '2rem',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '0.375rem',
  },
  description: {
    fontSize: '0.875rem',
    color: '#64748b',
    lineHeight: 1.5,
    maxWidth: '360px',
    margin: '0 auto 1rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  button: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    cursor: 'pointer',
  },
  whatsapp: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#16a34a',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
};
