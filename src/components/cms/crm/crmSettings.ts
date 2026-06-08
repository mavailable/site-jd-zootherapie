import type { CrmSettings, CrmFieldKey } from './crmTypes';

// CrmColumn de la config (status/label/hint/dot) → colonne settings (id/label/hint/color).
interface ConfigColumn { status: string; label: string; hint: string; dot: string; }

export const DEFAULT_FIELDS: Record<CrmFieldKey, boolean> = {
  org: true, phone: true, email: true, value: true, nextAction: true,
  nextDate: true, notes: true, siret: false, orderRef: false, billing: true,
};

export function defaultSettings(configColumns: ConfigColumn[]): CrmSettings {
  return {
    columns: configColumns.map((c) => ({ id: c.status, label: c.label, hint: c.hint, color: c.dot })),
    fields: { ...DEFAULT_FIELDS },
  };
}

// Fusionne les réglages stockés sur les défauts. Stored partiel/invalide → défauts.
export function mergeSettings(configColumns: ConfigColumn[], stored: CrmSettings | null): CrmSettings {
  const def = defaultSettings(configColumns);
  if (!stored) return def;
  const columns = Array.isArray(stored.columns) && stored.columns.length > 0 ? stored.columns : def.columns;
  return { columns, fields: { ...def.fields, ...(stored.fields || {}) } };
}

export function genColumnId(label: string, existing: string[]): string {
  const base = label.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'col';
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function isFieldOn(settings: CrmSettings, key: CrmFieldKey): boolean {
  return settings.fields?.[key] !== false;
}
