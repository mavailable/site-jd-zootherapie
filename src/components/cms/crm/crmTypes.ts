// Types du mini-CRM "Prospects". Partagés composant + helpers.

export interface Contact {
  id: number;
  name: string;
  org?: string | null;
  phone?: string | null;
  email?: string | null;
  value?: number | null;
  status: string;
  next_action?: string | null;
  next_date?: string | null; // 'YYYY-MM-DD'
  notes?: string | null;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

// Champs éditables envoyés à l'API (PATCH/POST). Pas d'id/created_at/updated_at.
export type ContactPatch = Partial<
  Pick<Contact, 'name' | 'org' | 'phone' | 'email' | 'value' | 'status' | 'next_action' | 'next_date' | 'notes' | 'sort'>
>;

export interface CrmColumn {
  status: string;
  label: string;
  hint: string;
  dot: string; // couleur du point d'en-tête
}

export type RelanceKind = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export interface Relance {
  kind: RelanceKind;
  days: number | null; // overdue: nb de jours de retard (positif) ; today: 0 ; soon/later: J+days
}
