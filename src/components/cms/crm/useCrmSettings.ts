import { useState, useEffect, useCallback } from 'react';
import cmsConfig from '../../../cms.config';
import { mergeSettings } from './crmSettings';
import type { CrmSettings } from './crmTypes';

const CONFIG_COLUMNS = (cmsConfig.crm?.columns as any[]) || [];

export function useCrmSettings() {
  const [settings, setSettings] = useState<CrmSettings>(() => mergeSettings(CONFIG_COLUMNS, null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/crm/settings', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setSettings(mergeSettings(CONFIG_COLUMNS, data.settings || null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: CrmSettings) => {
    const res = await fetch('/api/crm/settings', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    setSettings(next);
  }, []);

  return { settings, loading, error, reload: load, save };
}
