import { useState, useEffect, useCallback } from 'react';

interface AuthState {
  checking: boolean;
  authenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ checking: true, authenticated: false });

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/session');
      const data = await res.json();
      if (data.valid === true) {
        document.cookie = 'cms_logged_in=1; Secure; SameSite=Strict; Path=/; Max-Age=86400';
      }
      setState({ checking: false, authenticated: data.valid === true });
    } catch {
      setState({ checking: false, authenticated: false });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (password: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/cms/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        document.cookie = 'cms_logged_in=1; Secure; SameSite=Strict; Path=/; Max-Age=86400';
        setState({ checking: false, authenticated: true });
        return null;
      }

      const data = await res.json();
      return data.error || 'Erreur de connexion';
    } catch {
      return 'Impossible de contacter le serveur';
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/cms/logout', { method: 'POST' });
    } catch {
      // fallback: clear cookie client-side
      document.cookie = 'cms_logged_in=; Path=/; Max-Age=0';
    }
    setState({ checking: false, authenticated: false });
  }, []);

  return { ...state, login, logout };
}
