import { describe, it, expect } from 'vitest';
import { daysBetween, todayParisISO, relance, isDue, urgencyRank } from './crmHelpers';

describe('daysBetween', () => {
  it('compte les jours entiers entre deux dates ISO', () => {
    expect(daysBetween('2026-06-08', '2026-06-08')).toBe(0);
    expect(daysBetween('2026-06-08', '2026-06-10')).toBe(2);
    expect(daysBetween('2026-06-10', '2026-06-08')).toBe(-2);
  });
  it('traverse correctement un changement de mois', () => {
    expect(daysBetween('2026-06-30', '2026-07-01')).toBe(1);
  });
});

describe('todayParisISO', () => {
  it('rend la date du jour à Paris (CEST +2 en été)', () => {
    expect(todayParisISO(new Date('2026-06-08T01:00:00Z'))).toBe('2026-06-08');
  });
  it('bascule au lendemain quand Paris a déjà changé de jour', () => {
    expect(todayParisISO(new Date('2026-06-07T23:30:00Z'))).toBe('2026-06-08');
  });
});

describe('relance', () => {
  const today = '2026-06-08';
  it('none si pas de date', () => {
    expect(relance(null, today)).toEqual({ kind: 'none', days: null });
    expect(relance('', today)).toEqual({ kind: 'none', days: null });
  });
  it('overdue avec nb de jours de retard positif', () => {
    expect(relance('2026-06-06', today)).toEqual({ kind: 'overdue', days: 2 });
  });
  it('today', () => {
    expect(relance('2026-06-08', today)).toEqual({ kind: 'today', days: 0 });
  });
  it('soon pour J+1 et J+2', () => {
    expect(relance('2026-06-09', today)).toEqual({ kind: 'soon', days: 1 });
    expect(relance('2026-06-10', today)).toEqual({ kind: 'soon', days: 2 });
  });
  it('later au-delà de J+2', () => {
    expect(relance('2026-06-12', today)).toEqual({ kind: 'later', days: 4 });
  });
});

describe('isDue (entre dans le bandeau)', () => {
  it('vrai pour overdue/today/soon, faux sinon', () => {
    expect(isDue({ kind: 'overdue', days: 1 })).toBe(true);
    expect(isDue({ kind: 'today', days: 0 })).toBe(true);
    expect(isDue({ kind: 'soon', days: 2 })).toBe(true);
    expect(isDue({ kind: 'later', days: 5 })).toBe(false);
    expect(isDue({ kind: 'none', days: null })).toBe(false);
  });
});

describe('urgencyRank (tri du bandeau et des colonnes)', () => {
  it('overdue < today < soon < later < none, et plus urgent en premier', () => {
    const r = (k: 'overdue' | 'today' | 'soon' | 'later' | 'none', d: number | null) =>
      urgencyRank({ kind: k, days: d });
    expect(r('overdue', 3)).toBeLessThan(r('overdue', 1));
    expect(r('overdue', 1)).toBeLessThan(r('today', 0));
    expect(r('today', 0)).toBeLessThan(r('soon', 1));
    expect(r('soon', 1)).toBeLessThan(r('soon', 2));
    expect(r('soon', 2)).toBeLessThan(r('later', 4));
    expect(r('later', 4)).toBeLessThan(r('none', null));
  });
});
