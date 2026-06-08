import type { Relance, RelanceKind, Contact } from './crmTypes';

// Nombre de jours entiers de `fromISO` à `toISO` (dates 'YYYY-MM-DD', UTC midnight).
export function daysBetween(fromISO: string, toISO: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((p(toISO) - p(fromISO)) / 86400000);
}

// Date du jour 'YYYY-MM-DD' dans le fuseau Europe/Paris.
export function todayParisISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// État de relance d'une carte par rapport à aujourd'hui.
export function relance(nextDate: string | null | undefined, todayISO: string): Relance {
  if (!nextDate) return { kind: 'none', days: null };
  const diff = daysBetween(todayISO, nextDate);
  if (diff < 0) return { kind: 'overdue', days: -diff };
  if (diff === 0) return { kind: 'today', days: 0 };
  if (diff <= 2) return { kind: 'soon', days: diff };
  return { kind: 'later', days: diff };
}

// La carte apparaît-elle dans le bandeau "À relancer" ?
export function isDue(r: Relance): boolean {
  return r.kind === 'overdue' || r.kind === 'today' || r.kind === 'soon';
}

// Clé de tri : plus c'est urgent, plus c'est petit (remonte en haut).
const KIND_BASE: Record<RelanceKind, number> = {
  overdue: 0,
  today: 1000,
  soon: 2000,
  later: 3000,
  none: 9000,
};
export function urgencyRank(r: Relance): number {
  if (r.kind === 'overdue') return KIND_BASE.overdue - (r.days ?? 0);
  if (r.kind === 'soon' || r.kind === 'later') return KIND_BASE[r.kind] + (r.days ?? 0);
  return KIND_BASE[r.kind];
}

// Tri d'une colonne : cartes dues en haut (par urgence), puis par `sort` puis id.
export function sortColumn(cards: Contact[], todayISO: string): Contact[] {
  return [...cards].sort((a, b) => {
    const ra = urgencyRank(relance(a.next_date, todayISO));
    const rb = urgencyRank(relance(b.next_date, todayISO));
    if (ra !== rb) return ra - rb;
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.id - b.id;
  });
}

// Format monétaire FR compact : 490 → "490 €", null → "".
export function formatEuro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return `${new Intl.NumberFormat('fr-FR').format(value)} €`;
}
