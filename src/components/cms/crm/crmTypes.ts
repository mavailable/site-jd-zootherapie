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
  billing_address?: string | null;
  billing_postal?: string | null;
  billing_city?: string | null;
  billing_contact?: string | null;
  client_siret?: string | null;
  order_ref?: string | null;
  sale_lines?: string | null; // JSON string [{label,qty,unit_price}]
  sale_date?: string | null;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

// Champs éditables envoyés à l'API (PATCH/POST). Pas d'id/created_at/updated_at.
export type ContactPatch = Partial<
  Pick<Contact, 'name' | 'org' | 'phone' | 'email' | 'value' | 'status' | 'next_action' | 'next_date' | 'notes' | 'sort'
    | 'billing_address' | 'billing_postal' | 'billing_city' | 'billing_contact'
    | 'client_siret' | 'order_ref' | 'sale_lines' | 'sale_date'>
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

export interface SaleLine {
  label: string;
  qty: number;
  unit_price: number; // net
}

// Clés des champs toggables dans les réglages (Nom/Étape jamais toggables).
export type CrmFieldKey =
  | 'org' | 'phone' | 'email' | 'value' | 'nextAction' | 'nextDate' | 'notes'
  | 'siret' | 'orderRef' | 'billing';

// Colonne telle que stockée dans les réglages (≠ CrmColumn du board : id/color, pas status/dot).
export interface CrmSettingsColumn {
  id: string;
  label: string;
  hint: string;
  color: string;
}

export interface CrmSettings {
  columns: CrmSettingsColumn[];
  fields: Record<CrmFieldKey, boolean>;
}
