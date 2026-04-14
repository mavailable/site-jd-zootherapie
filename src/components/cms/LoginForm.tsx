import { useState, type FormEvent } from 'react';

interface LoginFormProps {
  onLogin: (password: string) => Promise<string | null>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    const err = await onLogin(password);
    if (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>Administration</h1>
        <p style={styles.subtitle}>Connectez-vous pour modifier votre site</p>

        {error && <div style={styles.error}>{error}</div>}

        <input
          type="text"
          name="username"
          autoComplete="username"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}
          tabIndex={-1}
          aria-hidden="true"
        />

        <label style={styles.label}>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={submitting || !password.trim()} style={styles.button}>
          {submitting ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1rem',
  },
  form: {
    width: '100%',
    maxWidth: '400px',
    background: '#fff',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.06)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '1.5rem',
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
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
};
