import { useState, useEffect, useCallback } from 'react';
import type { Contact, ContactPatch } from './crmTypes';

const BASE = '/api/crm/contacts';

async function jsonOrThrow(res: Response) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* corps vide */
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Erreur ${res.status}`);
  }
  return data;
}

// Charge la liste et expose les mutations. Chaque mutation rafraîchit le state local
// à partir de la ligne renvoyée par l'API (source de vérité = D1).
export function useCrm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jsonOrThrow(await fetch(BASE, { credentials: 'same-origin' }));
      setContacts((data.contacts as Contact[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (patch: ContactPatch): Promise<Contact> => {
    const data = await jsonOrThrow(
      await fetch(BASE, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    );
    const created = data.contact as Contact;
    setContacts((prev) => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(async (id: number, patch: ContactPatch): Promise<Contact> => {
    const data = await jsonOrThrow(
      await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    );
    const updated = data.contact as Contact;
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await jsonOrThrow(
      await fetch(`${BASE}/${id}`, { method: 'DELETE', credentials: 'same-origin' })
    );
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { contacts, loading, error, reload: load, create, update, remove };
}
