import type { SaleLine } from './crmTypes';

export function parseAmount(s: string | number | null | undefined): number {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  if (!s) return 0;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function lineTotal(l: SaleLine): number {
  return Math.round((l.qty || 0) * (l.unit_price || 0) * 100) / 100;
}

export function saleTotal(lines: SaleLine[]): number {
  return Math.round(lines.reduce((s, l) => s + lineTotal(l), 0) * 100) / 100;
}

export function parseLines(json: string | null | undefined): SaleLine[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.label !== 'undefined') : [];
  } catch { return []; }
}

export function serializeLines(lines: SaleLine[]): string | null {
  const clean = lines.filter((l) => l.label && l.label.trim());
  return clean.length ? JSON.stringify(clean) : null;
}
